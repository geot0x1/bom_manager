import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { updateBomEntryMpn } from "../src/lib/actions/boms";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
  console.log("🔍 Starting MPN Merge Logic Verification...");

  // 1. Get a BOM that has at least 2 entries for testing
  const bom = await prisma.bom.findFirst({
    include: {
      entries: {
        include: { part: true, designators: true },
      },
    },
    where: { isLocked: false },
  });

  if (!bom || bom.entries.length < 2) {
    console.error("❌ Test failed: Could not find a suitable BOM with 2+ entries.");
    process.exit(1);
  }

  const entryA = bom.entries[0];
  const entryB = bom.entries[1];
  const originalDesignatorCountB = entryB.designators.length;
  const designatorCountA = entryA.designators.length;

  console.log(`📝 Testing merge: Moving ${entryA.part.mpn} (Entry A) to ${entryB.part.mpn} (Entry B)`);

  try {
    // 2. Perform the update/merge
    // We pass the MPN of Entry B to Entry A
    const result = await updateBomEntryMpn(entryA.id, entryB.part.mpn);

    if (result.success) {
      console.log("✅ Server action returned success.");

      // 3. Verify the state in the database
      const deletedEntryA = await prisma.bomEntry.findUnique({ where: { id: entryA.id } });
      const updatedEntryB = await prisma.bomEntry.findUnique({
        where: { id: entryB.id },
        include: { designators: true },
      });

      if (!deletedEntryA && updatedEntryB) {
        console.log("✅ Entry A was deleted as expected (merged).");
        if (updatedEntryB.designators.length === originalDesignatorCountB + designatorCountA) {
          console.log("✅ All designators were moved to Entry B.");
          console.log("🎉 VERIFICATION PASSED: Merge logic is sound.");
        } else {
          console.error(`❌ Verification failed: Designator count mismatch. Expected ${originalDesignatorCountB + designatorCountA}, got ${updatedEntryB.designators.length}`);
        }
      } else {
        console.error("❌ Verification failed: Entry A still exists or Entry B missing.");
      }
    }
  } catch (err: any) {
    console.error("❌ Test failed with error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
