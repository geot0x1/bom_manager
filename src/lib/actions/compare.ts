"use server";

import { prisma } from "@/lib/prisma";

export type DiffEntry = {
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  designatorsA: string[];
  designatorsB: string[];
  unitCostA: number | null;
  unitCostB: number | null;
  quantityA: number;
  quantityB: number;
  status: "added" | "removed" | "changed" | "price_changed" | "unchanged";
};

export type BomComparison = {
  bomA: { id: string; name: string; version: number };
  bomB: { id: string; name: string; version: number };
  entries: DiffEntry[];
  totalCostA: number;
  totalCostB: number;
  costDifference: number;
};

export async function compareBoms(
  bomIdA: string,
  bomIdB: string
): Promise<BomComparison> {
  const [bomA, bomB] = await Promise.all([
    prisma.bom.findUnique({
      where: { id: bomIdA },
      include: {
        entries: {
          include: {
            part: true,
            designators: { orderBy: { label: "asc" } },
          },
        },
      },
    }),
    prisma.bom.findUnique({
      where: { id: bomIdB },
      include: {
        entries: {
          include: {
            part: true,
            designators: { orderBy: { label: "asc" } },
          },
        },
      },
    }),
  ]);

  if (!bomA || !bomB) throw new Error("One or both BOMs not found");

  const mapA = new Map(bomA.entries.map((e) => [e.part.mpn, e]));
  const mapB = new Map(bomB.entries.map((e) => [e.part.mpn, e]));

  const allMpns = new Set([...mapA.keys(), ...mapB.keys()]);
  const entries: DiffEntry[] = [];

  let totalCostA = 0;
  let totalCostB = 0;

  for (const mpn of allMpns) {
    const entryA = mapA.get(mpn);
    const entryB = mapB.get(mpn);

    const designatorsA = entryA?.designators.map((d) => d.label) || [];
    const designatorsB = entryB?.designators.map((d) => d.label) || [];

    const unitCostA = entryA?.unitCost ?? null;
    const unitCostB = entryB?.unitCost ?? null;

    const quantityA = designatorsA.length;
    const quantityB = designatorsB.length;

    if (unitCostA !== null) totalCostA += unitCostA * quantityA;
    if (unitCostB !== null) totalCostB += unitCostB * quantityB;

    let status: DiffEntry["status"];
    if (!entryA) {
      status = "added";
    } else if (!entryB) {
      status = "removed";
    } else if (unitCostA !== unitCostB) {
      status = "price_changed";
    } else if (
      JSON.stringify(designatorsA) !== JSON.stringify(designatorsB)
    ) {
      status = "changed";
    } else {
      status = "unchanged";
    }

    const part = entryA?.part || entryB?.part;

    entries.push({
      mpn,
      manufacturer: part?.manufacturer || "",
      description: part?.description || "",
      footprint: part?.footprint || "",
      designatorsA,
      designatorsB,
      unitCostA,
      unitCostB,
      quantityA,
      quantityB,
      status,
    });
  }

  // Sort: removals first, then additions, then changes, then unchanged
  const statusOrder = { removed: 0, added: 1, price_changed: 2, changed: 3, unchanged: 4 };
  entries.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    bomA: { id: bomA.id, name: bomA.name, version: bomA.version },
    bomB: { id: bomB.id, name: bomB.name, version: bomB.version },
    entries,
    totalCostA,
    totalCostB,
    costDifference: totalCostB - totalCostA,
  };
}
