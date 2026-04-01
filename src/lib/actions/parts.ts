"use server";

import { prisma } from "@/lib/prisma";
import { partSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getParts(search?: string, page = 1, pageSize = 50) {
  const where = search
    ? {
        OR: [
          { mpn: { contains: search, mode: "insensitive" as const } },
          { manufacturer: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { mpn: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.part.count({ where }),
  ]);

  return { parts, total, pages: Math.ceil(total / pageSize) };
}

export async function getAllParts() {
  return prisma.part.findMany({ orderBy: { mpn: "asc" } });
}

export async function getPartByMpn(mpn: string) {
  return prisma.part.findUnique({ where: { mpn } });
}

export async function getPartById(id: string) {
  return prisma.part.findUnique({ where: { id } });
}

export async function createPart(data: {
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  defaultUnitCost: number;
}) {
  const parsed = partSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const existing = await prisma.part.findUnique({
    where: { mpn: parsed.data.mpn },
  });
  if (existing) {
    return { error: `Part with MPN "${parsed.data.mpn}" already exists.` };
  }

  const part = await prisma.part.create({ data: parsed.data });
  revalidatePath("/parts");
  return { part };
}

export async function updatePart(
  id: string,
  data: {
    mpn?: string;
    manufacturer?: string;
    description?: string;
    footprint?: string;
    defaultUnitCost?: number;
  }
) {
  const part = await prisma.part.update({
    where: { id },
    data,
  });
  revalidatePath("/parts");
  return { part };
}

export async function deletePart(id: string) {
  const entryCount = await prisma.bomEntry.count({
    where: { partId: id },
  });

  if (entryCount > 0) {
    return {
      error: `Cannot delete: part is used in ${entryCount} BOM entries.`,
    };
  }

  await prisma.part.delete({ where: { id } });
  revalidatePath("/parts");
  return { success: true };
}

export async function bulkUpsertParts(
  parts: {
    mpn: string;
    manufacturer: string;
    description: string;
    footprint: string;
    defaultUnitCost: number;
  }[]
) {
  const results = [];
  for (const part of parts) {
    const result = await prisma.part.upsert({
      where: { mpn: part.mpn },
      update: {
        manufacturer: part.manufacturer,
        description: part.description,
        footprint: part.footprint,
        defaultUnitCost: part.defaultUnitCost,
      },
      create: part,
    });
    results.push(result);
  }
  revalidatePath("/parts");
  return results;
}
