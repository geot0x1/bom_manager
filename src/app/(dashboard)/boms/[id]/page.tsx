import { notFound } from "next/navigation";
import { getBomById, getBomLineage, getRowHistoryExistence } from "@/lib/actions/boms";
import { BomDetailClient } from "./bom-detail-client";

export default async function BomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bom = await getBomById(id);
  if (!bom) notFound();

  const lineage = await getBomLineage(id);
  const historyMap = await getRowHistoryExistence(id);

  return <BomDetailClient bom={bom} lineage={lineage} historyMap={historyMap} />;
}
