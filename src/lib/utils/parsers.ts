import { uploadRowSchema } from "@/lib/validations";

export type ParsedBomRow = {
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  unitCost: number;
  designators: string[];
};

export function parseDesignatorString(raw: string): string[] {
  // Split by comma, semicolon, or whitespace
  return raw
    .split(/[,;\s]+/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

export function normalizeColumnName(col: string): string {
  const c = col.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (c === "mpn" || c === "partnumber" || c === "partno" || c === "pn" || c === "jlcpcbpart" || c === "lcscpart" || c === "lcsc") return "mpn";
  if (c === "manufacturer" || c === "mfr" || c === "mfg") return "manufacturer";
  if (c === "description" || c === "desc" || c === "comment" || c === "value" || c === "val" || c === "remarks") return "description";
  if (c === "footprint" || c === "package" || c === "pkg") return "footprint";
  if (c === "unitcost" || c === "cost" || c === "price" || c === "unitprice") return "unitCost";
  if (c === "designators" || c === "designator" || c === "refdes" || c === "reference" || c === "references" || c === "ref") return "designators";
  if (c === "quantity" || c === "qty") return "quantity";
  return c;
}

export function parseExcelToRows(rawData: Record<string, unknown>[]): { rows: ParsedBomRow[], errors: string[] } {
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

  return { rows, errors };
}
