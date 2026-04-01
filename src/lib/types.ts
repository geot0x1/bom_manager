// Domain types - independent of @prisma/client auto-gen
// These mirror the Prisma schema but as plain TS types

export type Part = {
  id: string;
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  defaultUnitCost: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Designator = {
  id: string;
  label: string;
  bomEntryId: string;
};

export type BomEntry = {
  id: string;
  bomId: string;
  partId: string;
  unitCost: number;
};

export type Bom = {
  id: string;
  name: string;
  version: number;
  parentId: string | null;
  isLocked: boolean;
  isDraft: boolean;
  comment: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BomWithRelations = Bom & {
  user: { name: string | null; email: string };
  parent: { id: string; name: string; version: number } | null;
  children?: { id: string; name: string; version: number }[];
  entries: BomEntryWithRelations[];
  _count?: { entries: number; children: number };
};

export type BomEntryWithRelations = BomEntry & {
  part: Part;
  designators: Designator[];
};

export type BomListItem = BomWithRelations;
