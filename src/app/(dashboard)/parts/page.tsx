import { getParts } from "@/lib/actions/parts";
import { PartsClientPage } from "./parts-client";

export default async function PartsPage() {
  const { parts } = await getParts();
  return <PartsClientPage initialParts={parts} />;
}
