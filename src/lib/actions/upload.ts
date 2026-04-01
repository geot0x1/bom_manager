"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { uploadRowSchema } from "@/lib/validations";

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

export type ParsedBomRow = {
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  unitCost: number;
  designators: string[];
};

export type UploadResult = {
  rows: ParsedBomRow[];
  conflicts: UploadConflict[];
  errors: string[];
};

function parseDesignatorString(raw: string): string[] {
  // Split by comma, semicolon, or whitespace
  return raw
    .split(/[,;\s]+/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

function normalizeColumnName(col: string): string {
  const c = col.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (c === "mpn" || c === "partnumber" || c === "partno" || c === "pn") return "mpn";
  if (c === "manufacturer" || c === "mfr" || c === "mfg") return "manufacturer";
  if (c === "description" || c === "desc") return "description";
  if (c === "footprint" || c === "package" || c === "pkg") return "footprint";
  if (c === "unitcost" || c === "cost" || c === "price" || c === "unitprice") return "unitCost";
  if (c === "designators" || c === "designator" || c === "refdes" || c === "reference" || c === "references") return "designators";
  if (c === "quantity" || c === "qty") return "quantity";
  return c;
}

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

  // Normalize column names
  const normalizedData = rawData.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeColumnName(key)] = value;
    }
    return normalized;
  });

  const rows: ParsedBomRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < normalizedData.length; i++) {
    const raw = normalizedData[i];
    const parsed = uploadRowSchema.safeParse({
      mpn: String(raw.mpn || ""),
      manufacturer: String(raw.manufacturer || ""),
      description: String(raw.description || ""),
      footprint: String(raw.footprint || ""),
      unitCost: raw.unitCost || raw.cost || raw.price || 0,
      designators: String(raw.designators || raw.refdes || raw.reference || ""),
    });

    if (!parsed.success) {
      errors.push(`Row ${i + 2}: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
      continue;
    }

    const designators = parseDesignatorString(parsed.data.designators);
    if (designators.length === 0) {
      errors.push(`Row ${i + 2}: No valid designators found`);
      continue;
    }

    rows.push({
      mpn: parsed.data.mpn,
      manufacturer: parsed.data.manufacturer,
      description: parsed.data.description,
      footprint: parsed.data.footprint,
      unitCost: parsed.data.unitCost,
      designators,
    });
  }

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
