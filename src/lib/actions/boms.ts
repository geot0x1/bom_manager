"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getBoms(search?: string, page = 1, pageSize = 20) {
  const where = {
    isDraft: false,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

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
  { id: string; name: string; version: number; comment: string | null; createdAt: Date; userName: string | null }[]
> {
  const lineage: { id: string; name: string; version: number; comment: string | null; createdAt: Date; userName: string | null }[] = [];
  let currentId: string | null = id;

  while (currentId) {
    const found: any = await prisma.bom.findUnique({
      where: { id: currentId },
      select: { 
        id: true, 
        name: true, 
        version: true, 
        parentId: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true } }
      },
    });
    if (!found) break;
    lineage.unshift({ 
      id: found.id, 
      name: found.name, 
      version: found.version,
      comment: found.comment,
      createdAt: found.createdAt,
      userName: found.user?.name || "Unknown"
    });
    currentId = found.parentId;
  }

  return lineage;
}
export async function updateBomEntryMpn(entryId: string, newMpn: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const entry = await prisma.bomEntry.findUnique({
    where: { id: entryId },
    include: { bom: true, designators: true },
  });

  if (!entry) throw new Error("BOM entry not found");
  if (entry.bom.isLocked) throw new Error("BOM is locked");

  // 1. Find or create the new part
  let newPart = await prisma.part.findUnique({ where: { mpn: newMpn } });
  if (!newPart) {
    newPart = await prisma.part.create({
      data: {
        mpn: newMpn,
        manufacturer: "Unknown",
        description: "Auto-created from MPN change",
        footprint: "Unknown",
        defaultUnitCost: entry.unitCost,
      },
    });
  }

  // 2. Check if an entry for this part already exists in the same BOM
  const existingEntry = await prisma.bomEntry.findUnique({
    where: {
      bomId_partId: {
        bomId: entry.bomId,
        partId: newPart.id,
      },
    },
  });

  if (existingEntry && existingEntry.id !== entry.id) {
    // 3. MERGE logic: move all designators to the existing entry
    await prisma.$transaction([
      prisma.designator.updateMany({
        where: { bomEntryId: entry.id },
        data: { bomEntryId: existingEntry.id },
      }),
      prisma.bomEntry.delete({
        where: { id: entry.id },
      }),
    ]);
  } else {
    // 4. UPDATE logic: just point the current entry to the new part
    await prisma.bomEntry.update({
      where: { id: entry.id },
      data: { partId: newPart.id },
    });
  }

  revalidatePath(`/boms/${entry.bomId}`);
  return { success: true };
}

export async function createDraftBom(sourceId: string) {
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

  // Create the draft BOM
  const draft = await prisma.bom.create({
    data: {
      name: `${source.name} (Draft)`,
      version: source.version,
      parentId: sourceId,
      userId: session.user.id,
      isDraft: true,
      isLocked: false,
    },
  });

  // Deep-copy all entries and designators
  for (const entry of source.entries) {
    const newEntry = await prisma.bomEntry.create({
      data: {
        bomId: draft.id,
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

  revalidatePath(`/boms/${draft.id}`);
  return draft;
}

export async function commitDraftBom(
  draftId: string,
  strategy: "overwrite" | "fork",
  comment: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const draft = await prisma.bom.findUnique({
    where: { id: draftId },
    include: {
      entries: {
        include: { designators: true },
      },
    },
  });

  if (!draft || !draft.isDraft) throw new Error("Draft not found");

  if (strategy === "fork") {
    // Strategy: Fork (New Version)
    const committed = await prisma.bom.update({
      where: { id: draftId },
      data: {
        isDraft: false,
        name: draft.name.replace(" (Draft)", ""),
        version: draft.version + 1,
        comment: comment,
      },
    });
    revalidatePath("/boms");
    revalidatePath(`/boms/${committed.id}`);
    return committed;
  } else {
    // Strategy: Overwrite
    if (!draft.parentId) throw new Error("Cannot overwrite: No parent BOM found");

    const parentId = draft.parentId;

    await prisma.$transaction(async (tx: any) => {
      // 1. Clear parent's entries
      await tx.bomEntry.deleteMany({ where: { bomId: parentId } });

      // 2. Clone draft entries to parent
      for (const entry of draft.entries) {
        const newEntry = await tx.bomEntry.create({
          data: {
            bomId: parentId,
            partId: entry.partId,
            unitCost: entry.unitCost,
          },
        });

        if (entry.designators.length > 0) {
          await tx.designator.createMany({
            data: entry.designators.map((d: { label: string }) => ({
              label: d.label,
              bomEntryId: newEntry.id,
            })),
          });
        }
      }

      // 3. Update parent metadata
      await tx.bom.update({
        where: { id: parentId },
        data: { 
          updatedAt: new Date(),
          comment: comment 
        },
      });

      // 4. Delete the draft
      await tx.bom.delete({ where: { id: draftId } });
    });

    revalidatePath("/boms");
    revalidatePath(`/boms/${parentId}`);
    return { id: parentId };
  }
}

export async function discardDraftBom(draftId: string) {
  const draft = await prisma.bom.findUnique({ where: { id: draftId } });
  if (!draft || !draft.isDraft) throw new Error("Draft not found");

  const parentId = draft.parentId;
  await prisma.bom.delete({ where: { id: draftId } });

  if (parentId) {
    revalidatePath(`/boms/${parentId}`);
  }
  revalidatePath("/boms");
  return { parentId };
}
