import { getSignals } from "@/lib/signals";
import { SignalsQuerySchema } from "@/lib/signals/types";

// GET /api/signals?kind=singtel-news|prospect-trigger|tender&refresh=1&limit=50
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = SignalsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: "Invalid query", issues: parsed.error.issues.map((i) => i.path.join(".") || i.message) }, { status: 400 });
  }
  const { kind, refresh, limit } = parsed.data;
  const result = await getSignals({ kind, refresh: refresh === "1", limit });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
