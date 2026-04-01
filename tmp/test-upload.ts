import { parseExcelToRows } from "../src/lib/utils/parsers";

function test() {
  const rawData = [
    {
      "Comment": "4.7uF X5R ±20% 0603",
      "Designator": "C1",
      "Footprint": "0603",
      "JLCPCB Part": "C20416432"
    }
  ];

  try {
    const { rows, errors } = parseExcelToRows(rawData);
    console.log("Parsed Rows:", JSON.stringify(rows, null, 2));
    
    const success = rows.length === 1 && rows[0].mpn === "C20416432";

    if (success) {
      console.log("✅ Verification successful");
    } else {
      console.error("❌ Verification failed");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

test();
