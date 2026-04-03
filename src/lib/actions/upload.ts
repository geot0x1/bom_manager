"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { parseExcelToRows, type ParsedBomRow } from "@/lib/utils/parsers";
export { type ParsedBomRow };

export type UploadConflict = {
  mpn: string;
  uploaded: {
    manufacturer: string;
    description: string;
    footprint: string;
  };
  existing: {
    id: string;
    manufacturer: string;
    description: string;
    footprint: string;
  };
};

export type UploadResult = {
  rows: ParsedBomRow[];
  conflicts: UploadConflict[];
  errors: string[];
};

export async function parseUploadFile(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File;
  if (!file) return { rows: [], conflicts: [], errors: ["No file uploaded"] };

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  if (rawData.length === 0) {
    return { rows: [], conflicts: [], errors: ["File is empty or has no data rows"] };
  }

  const { rows, errors } = parseExcelToRows(rawData);

  // Check for conflicts with existing parts
  const conflicts: UploadConflict[] = [];
  const uniqueMpns = [...new Set(rows.map((r) => r.mpn))];

  for (const mpn of uniqueMpns) {
    const existing = await prisma.part.findUnique({ where: { mpn } });
    if (!existing) continue;

    const uploadedRow = rows.find((r) => r.mpn === mpn)!;
    const hasConflict =
      (uploadedRow.manufacturer && uploadedRow.manufacturer !== existing.manufacturer) ||
      (uploadedRow.description && uploadedRow.description !== existing.description) ||
      (uploadedRow.footprint && uploadedRow.footprint !== existing.footprint);

    if (hasConflict) {
      conflicts.push({
        mpn,
        uploaded: {
          manufacturer: uploadedRow.manufacturer,
          description: uploadedRow.description,
          footprint: uploadedRow.footprint,
        },
        existing: {
          id: existing.id,
          manufacturer: existing.manufacturer,
          description: existing.description,
          footprint: existing.footprint,
        },
      });
    }
  }

  return { rows, conflicts, errors };
}

export async function importBomData(
  bomId: string,
  rows: ParsedBomRow[],
  updateMasterParts: string[] // MPNs that should update master library
) {
  const bom = await prisma.bom.findUnique({ where: { id: bomId } });
  if (!bom) throw new Error("BOM not found");
  if (bom.isLocked) throw new Error("BOM is locked");

  for (const row of rows) {
    // Upsert part
    let part = await prisma.part.findUnique({ where: { mpn: row.mpn } });

    if (part && updateMasterParts.includes(row.mpn)) {
      part = await prisma.part.update({
        where: { mpn: row.mpn },
        data: {
          manufacturer: row.manufacturer || part.manufacturer,
          description: row.description || part.description,
          footprint: row.footprint || part.footprint,
          defaultUnitCost: row.unitCost || part.defaultUnitCost,
        },
      });
    } else if (!part) {
      part = await prisma.part.create({
        data: {
          mpn: row.mpn,
          manufacturer: row.manufacturer,
          description: row.description,
          footprint: row.footprint,
          defaultUnitCost: row.unitCost,
        },
      });
    }

    // Upsert BOM entry
    let entry = await prisma.bomEntry.findUnique({
      where: { bomId_partId: { bomId, partId: part.id } },
    });

    if (!entry) {
      entry = await prisma.bomEntry.create({
        data: {
          bomId,
          partId: part.id,
          unitCost: row.unitCost || part.defaultUnitCost,
        },
      });
    }

    // Create designators
    const existingDesignators = await prisma.designator.findMany({
      where: { bomEntryId: entry.id },
      select: { label: true },
    });
    const existingLabels = new Set(existingDesignators.map((d: { label: string }) => d.label));

    const newLabels = row.designators.filter((d) => !existingLabels.has(d));
    if (newLabels.length > 0) {
      await prisma.designator.createMany({
        data: newLabels.map((label) => ({
          label,
          bomEntryId: entry!.id,
        })),
      });
    }
  }

  return { success: true };
}
