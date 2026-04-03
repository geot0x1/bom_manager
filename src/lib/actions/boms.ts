"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getBoms(search?: string, page = 1, pageSize = 20) {
  const where = {
    isDraft: false,
    children: { none: {} }, // Only show latest versions
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
        _count: { select: { entries: true, children: true, builds: true } },
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
      builds: {
        orderBy: { createdAt: "desc" },
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

  // Create the TRUE FORK: A brand new project starting at v1
  const forked = await prisma.bom.create({
    data: {
      name: newName,
      version: 1, // Fresh project starts at v1
      parentId: null, // No historical tie
      userId: session.user.id,
      isLocked: false,
      comment: `Forked from ${source.name} (v${source.version})`,
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
  // 1. Find the root of this project lineage
  let rootId: string = id;
  let current: any = await prisma.bom.findUnique({ where: { id }, select: { parentId: true } });
  
  while (current?.parentId) {
    rootId = current.parentId;
    current = await prisma.bom.findUnique({ where: { id: rootId }, select: { parentId: true } });
  }

  // 2. Build the full forward-moving chain from the root
  const lineage: any[] = [];
  let nextId: string | null = rootId;

  while (nextId) {
    const found: any = await prisma.bom.findUnique({
      where: { id: nextId },
      include: {
        user: { select: { name: true } },
        children: { select: { id: true } }
      }
    });
    if (!found) break;

    lineage.push({
      id: found.id,
      name: found.name,
      version: found.version,
      comment: found.comment,
      createdAt: found.createdAt,
      userName: found.user?.name || "Unknown"
    });

    nextId = found.children?.sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0]?.id || null;
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

async function hasBomContentChanged(draftId: string): Promise<boolean> {
  const draft = await prisma.bom.findUnique({
    where: { id: draftId },
    include: {
      entries: {
        include: { designators: true },
      },
    },
  });

  if (!draft || !draft.parentId) return true; // Treat as changed if no parent or draft not found

  const parent = await prisma.bom.findUnique({
    where: { id: draft.parentId },
    include: {
      entries: {
        include: { designators: { orderBy: { label: "asc" } } },
        orderBy: { part: { mpn: "asc" } },
      },
    },
  });

  if (!parent) return true;

  // Normalize content for comparison
  const normalize = (entries: any[]) => 
    entries.map(e => ({
      mpn: e.partId,
      cost: Number(e.unitCost),
      designators: e.designators.map((d: any) => d.label).sort().join(","),
    })).sort((a, b) => a.mpn.localeCompare(b.mpn));

  const parentContent = JSON.stringify(normalize(parent.entries));
  const draftContent = JSON.stringify(normalize(draft.entries));

  return parentContent !== draftContent;
}

export async function checkBomChanges(draftId: string) {
  return hasBomContentChanged(draftId);
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
  strategy: "overwrite" | "new_version",
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

  // --- CONTENT COMPARISON CHECK ---
  if (!(await hasBomContentChanged(draftId))) {
    throw new Error("No changes detected. Please make an edit before saving or discard the draft.");
  }
  // --- END CHECK ---

  if (strategy === "new_version") {
    // Strategy: New Version (History)
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

export async function createBuild(bomId: string, quantity: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const build = await prisma.build.create({
    data: {
      bomId,
      quantity,
    },
  });

  revalidatePath(`/boms/${bomId}`);
  return build;
}

export async function getBomEntryHistory(entryId: string) {
  const entry = await prisma.bomEntry.findUnique({
    where: { id: entryId },
    include: {
      bom: true,
      designators: { select: { label: true } },
    }
  });

  if (!entry) throw new Error("Entry not found");

  const labels = entry.designators.map(d => d.label);
  
  // 1. Get the lineage (all BOM IDs in the project chain)
  const lineage = await getBomLineage(entry.bomId);
  const bomIds = lineage.map(b => b.id);

  // 2. Find all entries across these BOMs that share any of our designators
  // We want to see what parts were used for these "slots" over time
  const entries = await prisma.bomEntry.findMany({
    where: {
      bomId: { in: bomIds },
      designators: {
        some: {
          label: { in: labels }
        }
      }
    },
    include: {
      part: true,
      bom: {
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
          comment: true
        }
      },
      designators: { select: { label: true } }
    }
  });

  // Group by Part to see the history of changes
  // Actually, let's just return them sorted by BOM Version desc
  return entries.sort((a, b) => b.bom.version - a.bom.version);
}

export async function getRowHistoryExistence(bomId: string) {
  const bom = await prisma.bom.findUnique({
    where: { id: bomId },
    include: {
      entries: {
        include: { designators: { select: { label: true } } }
      }
    }
  });
  if (!bom) return {};

  const lineage = await getBomLineage(bomId);
  const currentVersion = bom.version;
  const pastBomIds = lineage.filter(b => b.version < currentVersion).map(b => b.id);

  if (pastBomIds.length === 0) {
    const result: Record<string, boolean> = {};
    bom.entries.forEach(e => result[e.id] = false);
    return result;
  }

  // Find any entry in the past that matches any designator in the current BOM
  const currentLabels = bom.entries.flatMap(e => e.designators.map(d => d.label));
  
  const pastEntries = await prisma.bomEntry.findMany({
    where: {
      bomId: { in: pastBomIds },
      designators: {
        some: {
          label: { in: currentLabels }
        }
      }
    },
    include: {
      designators: { select: { label: true } }
    }
  });

  // Map of label -> hasPastEntry
  const labelHasHistory = new Set<string>();
  pastEntries.forEach(pe => {
    pe.designators.forEach(d => {
      labelHasHistory.add(d.label);
    });
  });

  // Map of entryId -> hasHistory
  const entryHistoryMap: Record<string, boolean> = {};
  bom.entries.forEach(e => {
    entryHistoryMap[e.id] = e.designators.some(d => labelHasHistory.has(d.label));
  });

  return entryHistoryMap;
}
