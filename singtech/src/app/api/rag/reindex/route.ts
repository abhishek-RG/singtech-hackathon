import { gateway, isGatewayConfigured, localDocuments } from "@/lib/rag";

// Rebuilds the gateway index from every local document (catalogue, accounts, history, playbooks, signals).
export async function POST() {
  if (!isGatewayConfigured()) return Response.json({ error: "RAG gateway not configured" }, { status: 503 });
  const docs = localDocuments();
  try {
    return Response.json(await gateway<{ docs: number; chunks: number }>("/v1/index", { docs }, 600_000));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "index failed", docs: docs.length }, { status: 502 });
  }
}
