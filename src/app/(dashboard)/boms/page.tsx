import { getBoms } from "@/lib/actions/boms";
import { BomsClientPage } from "./boms-client";

export default async function BomsPage() {
  const { boms } = await getBoms();
  return <BomsClientPage initialBoms={boms} />;
}
