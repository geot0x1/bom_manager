import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Users ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bom.local" },
    update: {},
    create: {
      email: "admin@bom.local",
      name: "Admin",
      hashedPassword: adminPassword,
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "engineer@bom.local" },
    update: {},
    create: {
      email: "engineer@bom.local",
      name: "Jane Engineer",
      hashedPassword: userPassword,
      role: "USER",
    },
  });

  console.log("✅ Users created");
  console.log(`   Admin: admin@bom.local / admin123`);
  console.log(`   User:  engineer@bom.local / user1234\n`);

  // ── Parts ──────────────────────────────────────────
  const parts = await Promise.all([
    prisma.part.upsert({
      where: { mpn: "RC0402FR-0710KL" },
      update: {},
      create: {
        mpn: "RC0402FR-0710KL",
        manufacturer: "Yageo",
        description: "RES SMD 10K OHM 1% 1/16W 0402",
        footprint: "0402",
        defaultUnitCost: 0.003,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "RC0402FR-074K7L" },
      update: {},
      create: {
        mpn: "RC0402FR-074K7L",
        manufacturer: "Yageo",
        description: "RES SMD 4.7K OHM 1% 1/16W 0402",
        footprint: "0402",
        defaultUnitCost: 0.003,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "RC0402FR-07100RL" },
      update: {},
      create: {
        mpn: "RC0402FR-07100RL",
        manufacturer: "Yageo",
        description: "RES SMD 100 OHM 1% 1/16W 0402",
        footprint: "0402",
        defaultUnitCost: 0.003,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "GRM155R71C104KA88D" },
      update: {},
      create: {
        mpn: "GRM155R71C104KA88D",
        manufacturer: "Murata",
        description: "CAP CER 100NF 16V X7R 0402",
        footprint: "0402",
        defaultUnitCost: 0.008,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "GRM188R61A106ME69D" },
      update: {},
      create: {
        mpn: "GRM188R61A106ME69D",
        manufacturer: "Murata",
        description: "CAP CER 10UF 10V X5R 0603",
        footprint: "0603",
        defaultUnitCost: 0.025,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "STM32C071CBT6" },
      update: {},
      create: {
        mpn: "STM32C071CBT6",
        manufacturer: "STMicroelectronics",
        description: "ARM Cortex-M0+ 48MHz 128KB Flash LQFP-48",
        footprint: "LQFP-48",
        defaultUnitCost: 1.85,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "TPS563201DDCR" },
      update: {},
      create: {
        mpn: "TPS563201DDCR",
        manufacturer: "Texas Instruments",
        description: "IC REG BUCK ADJ 3A SOT-23-6",
        footprint: "SOT-23-6",
        defaultUnitCost: 0.62,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "CRCW060310K0FKEA" },
      update: {},
      create: {
        mpn: "CRCW060310K0FKEA",
        manufacturer: "Vishay",
        description: "RES SMD 10K OHM 1% 1/10W 0603",
        footprint: "0603",
        defaultUnitCost: 0.005,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "SN74LVC1G04DCKR" },
      update: {},
      create: {
        mpn: "SN74LVC1G04DCKR",
        manufacturer: "Texas Instruments",
        description: "IC INVERTER 1CH 1-INP SC70-5",
        footprint: "SC70-5",
        defaultUnitCost: 0.18,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "USB4110-GF-A" },
      update: {},
      create: {
        mpn: "USB4110-GF-A",
        manufacturer: "GCT",
        description: "CONN USB TYPE-C 2.0 SMD",
        footprint: "USB-C-SMD",
        defaultUnitCost: 0.45,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "APTD3216LSECK/J3-PF" },
      update: {},
      create: {
        mpn: "APTD3216LSECK/J3-PF",
        manufacturer: "Kingbright",
        description: "LED RED CLEAR 1206 SMD",
        footprint: "1206",
        defaultUnitCost: 0.05,
      },
    }),
    prisma.part.upsert({
      where: { mpn: "CRCW04021K00FKED" },
      update: {},
      create: {
        mpn: "CRCW04021K00FKED",
        manufacturer: "Vishay",
        description: "RES SMD 1K OHM 1% 1/16W 0402",
        footprint: "0402",
        defaultUnitCost: 0.003,
      },
    }),
  ]);

  console.log(`✅ ${parts.length} parts created\n`);

  // ── BOM 1: Motor Controller Board v1 ──────────────
  const bom1 = await prisma.bom.create({
    data: {
      name: "Motor Controller Board",
      version: 1,
      userId: user.id,
    },
  });

  // Add entries with designators
  const entries1 = [
    { partMpn: "STM32C071CBT6", cost: 1.85, designators: ["U1"] },
    { partMpn: "TPS563201DDCR", cost: 0.62, designators: ["U2"] },
    { partMpn: "SN74LVC1G04DCKR", cost: 0.18, designators: ["U3", "U4"] },
    {
      partMpn: "RC0402FR-0710KL",
      cost: 0.003,
      designators: ["R1", "R2", "R3", "R4", "R5"],
    },
    {
      partMpn: "RC0402FR-074K7L",
      cost: 0.003,
      designators: ["R6", "R7"],
    },
    {
      partMpn: "RC0402FR-07100RL",
      cost: 0.003,
      designators: ["R8"],
    },
    {
      partMpn: "GRM155R71C104KA88D",
      cost: 0.008,
      designators: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    },
    {
      partMpn: "GRM188R61A106ME69D",
      cost: 0.025,
      designators: ["C9", "C10"],
    },
    { partMpn: "USB4110-GF-A", cost: 0.45, designators: ["J1"] },
    {
      partMpn: "APTD3216LSECK/J3-PF",
      cost: 0.05,
      designators: ["D1", "D2", "D3"],
    },
  ];

  for (const entry of entries1) {
    const part = parts.find((p: { mpn: string; id: string }) => p.mpn === entry.partMpn)!;
    await prisma.bomEntry.create({
      data: {
        bomId: bom1.id,
        partId: part.id,
        unitCost: entry.cost,
        designators: {
          create: entry.designators.map((label) => ({ label })),
        },
      },
    });
  }

  console.log(`✅ BOM "${bom1.name}" created with ${entries1.length} entries\n`);

  // ── BOM 2: Fork of Motor Controller (with changes) ──
  const bom2 = await prisma.bom.create({
    data: {
      name: "Motor Controller Board (Rev B)",
      version: 2,
      parentId: bom1.id,
      userId: user.id,
    },
  });

  // Similar entries but with some price changes and designator modifications
  const entries2 = [
    { partMpn: "STM32C071CBT6", cost: 1.95, designators: ["U1"] }, // Price changed
    { partMpn: "TPS563201DDCR", cost: 0.62, designators: ["U2"] },
    { partMpn: "SN74LVC1G04DCKR", cost: 0.18, designators: ["U3", "U4", "U5"] }, // Added U5
    {
      partMpn: "RC0402FR-0710KL",
      cost: 0.003,
      designators: ["R1", "R2", "R3", "R4"], // R5 removed
    },
    {
      partMpn: "RC0402FR-074K7L",
      cost: 0.003,
      designators: ["R6", "R7", "R5"], // R5 moved here
    },
    {
      partMpn: "GRM155R71C104KA88D",
      cost: 0.01, // Price changed
      designators: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C11"], // Added C11
    },
    {
      partMpn: "GRM188R61A106ME69D",
      cost: 0.025,
      designators: ["C9", "C10"],
    },
    { partMpn: "USB4110-GF-A", cost: 0.45, designators: ["J1"] },
    {
      partMpn: "APTD3216LSECK/J3-PF",
      cost: 0.05,
      designators: ["D1", "D2", "D3", "D4"], // Added D4
    },
    {
      partMpn: "CRCW04021K00FKED",
      cost: 0.003,
      designators: ["R9", "R10"], // New part added
    },
  ];

  for (const entry of entries2) {
    const part = parts.find((p: { mpn: string; id: string }) => p.mpn === entry.partMpn)!;
    await prisma.bomEntry.create({
      data: {
        bomId: bom2.id,
        partId: part.id,
        unitCost: entry.cost,
        designators: {
          create: entry.designators.map((label) => ({ label })),
        },
      },
    });
  }

  console.log(`✅ BOM "${bom2.name}" (fork) created with ${entries2.length} entries\n`);

  // Lock the v1
  await prisma.bom.update({
    where: { id: bom1.id },
    data: { isLocked: true },
  });

  console.log("✅ BOM v1 locked\n");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
