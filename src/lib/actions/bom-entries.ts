"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addEntryToBom(
  bomId: string,
  partId: string,
  unitCost: number,
  designatorLabels: string[]
) {
  const bom = await prisma.bom.findUnique({ where: { id: bomId } });
  if (!bom) throw new Error("BOM not found");
  if (bom.isLocked) throw new Error("BOM is locked");

  const entry = await prisma.bomEntry.create({
    data: {
      bomId,
      partId,
      unitCost,
      designators: {
        create: designatorLabels.map((label) => ({ label: label.trim() })),
      },
    },
    include: { designators: true, part: true },
  });

  revalidatePath(`/boms/${bomId}`);
  return entry;
}

export async function removeEntryFromBom(bomEntryId: string) {
  const entry = await prisma.bomEntry.findUnique({
    where: { id: bomEntryId },
    include: { bom: true },
  });
  if (!entry) throw new Error("Entry not found");
  if (entry.bom.isLocked) throw new Error("BOM is locked");

  await prisma.bomEntry.delete({ where: { id: bomEntryId } });
  revalidatePath(`/boms/${entry.bomId}`);
  return { success: true };
}

export async function updateEntryUnitCost(
  bomEntryId: string,
  unitCost: number
) {
  const entry = await prisma.bomEntry.update({
    where: { id: bomEntryId },
    data: { unitCost },
    include: { bom: true },
  });
  revalidatePath(`/boms/${entry.bomId}`);
  return entry;
}

export async function reassignDesignator(
  designatorId: string,
  targetBomEntryId: string
) {
  const designator = await prisma.designator.findUnique({
    where: { id: designatorId },
    include: { bomEntry: { include: { bom: true } } },
  });

  if (!designator) throw new Error("Designator not found");
  if (designator.bomEntry.bom.isLocked) throw new Error("BOM is locked");

  const targetEntry = await prisma.bomEntry.findUnique({
    where: { id: targetBomEntryId },
  });

  if (!targetEntry) throw new Error("Target entry not found");
  if (targetEntry.bomId !== designator.bomEntry.bomId) {
    throw new Error("Cannot move designator to a different BOM");
  }

  const updated = await prisma.designator.update({
    where: { id: designatorId },
    data: { bomEntryId: targetBomEntryId },
  });

  // Clean up source entry if it has no more designators
  const remainingDesignators = await prisma.designator.count({
    where: { bomEntryId: designator.bomEntryId },
  });

  if (remainingDesignators === 0) {
    await prisma.bomEntry.delete({
      where: { id: designator.bomEntryId },
    });
  }

  revalidatePath(`/boms/${designator.bomEntry.bomId}`);
  return updated;
}

export async function createDesignator(bomEntryId: string, label: string) {
  const entry = await prisma.bomEntry.findUnique({
    where: { id: bomEntryId },
    include: { bom: true },
  });
  if (!entry) throw new Error("Entry not found");
  if (entry.bom.isLocked) throw new Error("BOM is locked");

  const designator = await prisma.designator.create({
    data: { label: label.trim(), bomEntryId },
  });

  revalidatePath(`/boms/${entry.bomId}`);
  return designator;
}

export async function deleteDesignator(designatorId: string) {
  const designator = await prisma.designator.findUnique({
    where: { id: designatorId },
    include: { bomEntry: { include: { bom: true } } },
  });

  if (!designator) throw new Error("Designator not found");
  if (designator.bomEntry.bom.isLocked) throw new Error("BOM is locked");

  await prisma.designator.delete({ where: { id: designatorId } });

  // Clean up orphaned entry
  const remaining = await prisma.designator.count({
    where: { bomEntryId: designator.bomEntryId },
  });

  if (remaining === 0) {
    await prisma.bomEntry.delete({
      where: { id: designator.bomEntryId },
    });
  }

  revalidatePath(`/boms/${designator.bomEntry.bomId}`);
  return { success: true };
}
