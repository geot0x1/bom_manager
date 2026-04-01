"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getBoms(search?: string, page = 1, pageSize = 20) {
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const [boms, total] = await Promise.all([
    prisma.bom.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        parent: { select: { id: true, name: true, version: true } },
        entries: {
          include: {
            part: true,
            designators: true,
          },
        },
        _count: { select: { entries: true, children: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bom.count({ where }),
  ]);

  return { boms, total, pages: Math.ceil(total / pageSize) };
}

export async function getBomById(id: string) {
  return prisma.bom.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      parent: { select: { id: true, name: true, version: true } },
      children: { select: { id: true, name: true, version: true } },
      entries: {
        include: {
          part: true,
          designators: { orderBy: { label: "asc" } },
        },
        orderBy: { part: { mpn: "asc" } },
      },
    },
  });
}

export async function createBom(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bom = await prisma.bom.create({
    data: {
      name,
      userId: session.user.id,
    },
  });

  revalidatePath("/boms");
  return bom;
}

export async function updateBom(
  id: string,
  data: { name?: string; isLocked?: boolean }
) {
  const bom = await prisma.bom.update({
    where: { id },
    data,
  });
  revalidatePath("/boms");
  revalidatePath(`/boms/${id}`);
  return bom;
}

export async function deleteBom(id: string) {
  await prisma.bom.delete({ where: { id } });
  revalidatePath("/boms");
  return { success: true };
}

export async function forkBom(sourceId: string, newName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const source = await prisma.bom.findUnique({
    where: { id: sourceId },
    include: {
      entries: {
        include: { designators: true },
      },
    },
  });

  if (!source) throw new Error("Source BOM not found");

  // Create the forked BOM
  const forked = await prisma.bom.create({
    data: {
      name: newName,
      version: source.version + 1,
      parentId: sourceId,
      userId: session.user.id,
      isLocked: false,
    },
  });

  // Deep-copy all entries and designators
  for (const entry of source.entries) {
    const newEntry = await prisma.bomEntry.create({
      data: {
        bomId: forked.id,
        partId: entry.partId,
        unitCost: entry.unitCost,
      },
    });

    if (entry.designators.length > 0) {
      await prisma.designator.createMany({
        data: entry.designators.map((d: { label: string }) => ({
          label: d.label,
          bomEntryId: newEntry.id,
        })),
      });
    }
  }

  revalidatePath("/boms");
  return forked;
}

export async function getBomLineage(id: string): Promise<
  { id: string; name: string; version: number }[]
> {
  const lineage: { id: string; name: string; version: number }[] = [];
  let currentId: string | null = id;

  while (currentId) {
    const found: { id: string; name: string; version: number; parentId: string | null } | null = await prisma.bom.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, version: true, parentId: true },
    });
    if (!found) break;
    lineage.unshift({ id: found.id, name: found.name, version: found.version });
    currentId = found.parentId;
  }

  return lineage;
}
