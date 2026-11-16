import { afterEach, describe, expect, it, vi } from "vitest";
import { localRetrieve, queryRag, runRag, type RagDoc } from "@/lib/rag";

const docs: RagDoc[] = [
  { id: "SGT-INV-2026-8841", title: "Invoice SGT-INV-2026-8841", text: "Disputed SAP to Oracle migration invoice for CUBΣ", source: "sample", kind: "invoice" },
  { id: "a", title: "Port slicing", text: "Tuas port 5G slice saturation playbook", source: "sample", kind: "playbook" },
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("localRetrieve", () => {
  it("ranks an exact bill ID first and ignores unrelated docs", () => {
    const r = localRetrieve("what is the status of sgt-inv-2026-8841", docs);
    expect(r[0].id).toBe("SGT-INV-2026-8841");
    expect(localRetrieve("zzz qqq", docs)).toEqual([]);
  });

  it("puts the account named in the question first", async () => {
    const { localDocuments } = await import("@/lib/rag");
    expect(localRetrieve("which products are recommended for LionRock Quantitative Bank?", localDocuments())[0].id).toBe("acct-lionrock-sg");
  });
});

describe("queryRag", () => {
  it("falls back to local records when the gateway fails", async () => {
    vi.stubEnv("RAG_GATEWAY_URL", "https://rag.example.com");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "secret");
    vi.stubEnv("RAG_GATEWAY_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 502 })));
    const r = await queryRag("Tuas port slice");
    expect(r.engine).toBe("local");
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("redacts PII before calling the gateway", async () => {
    vi.stubEnv("RAG_GATEWAY_URL", "https://rag.example.com");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "secret");
    vi.stubEnv("RAG_GATEWAY_KEY", "key");
    const fetchMock = vi.fn(async () => sse([["meta", { citations: [] }], ["token", { t: "SUMMARY: ok" }], ["done", { answer: "SUMMARY: ok" }]]));
    vi.stubGlobal("fetch", fetchMock);
    const r = await queryRag("email cfo@corp.example.com about renewal");
    expect(r.engine).toBe("gateway");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("cfo@corp.example.com");
  });

  it("streams tokens in order and resolves with the gateway's final answer", async () => {
    vi.stubEnv("RAG_GATEWAY_URL", "http://127.0.0.1:8088");
    vi.stubEnv("RAG_GATEWAY_KEY", "key");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      // Loopback skips the Cloudflare headers but always sends the gateway key.
      expect(new Headers(init.headers).get("CF-Access-Client-Id")).toBeNull();
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer key");
      return sse([["meta", { citations: [{ id: "a", title: "A", source: "", snippet: "", score: 1 }] }], ["token", { t: "SUMMARY: Cre" }], ["token", { t: "dit [1]." }], ["done", { answer: "SUMMARY: Credit [1]." }]]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const events: string[] = [];
    const r = await runRag({ question: "Why is SGT-INV-2026-8841 disputed?" }, (e) => events.push(e.type === "token" ? e.t : e.type));
    expect(events).toEqual(["meta", "SUMMARY: Cre", "dit [1].", "done"]);
    expect(r).toMatchObject({ answer: "SUMMARY: Credit [1].", engine: "gateway" });
    expect(r.citations[0].id).toBe("a");
  });

  it("keeps a partial gateway answer instead of answering twice when the stream breaks", async () => {
    vi.stubEnv("RAG_GATEWAY_URL", "http://127.0.0.1:8088");
    vi.stubEnv("RAG_GATEWAY_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => sse([["meta", { citations: [] }], ["token", { t: "SUMMARY: Half" }]])));
    const r = await runRag({ question: "LionRock renewal" });
    expect(r).toMatchObject({ answer: "SUMMARY: Half", engine: "gateway" });
  });
});

function sse(events: [string, unknown][]) {
  const body = events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join("");
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

describe("news fallback", () => {
  it("builds a short news query with names first", async () => {
    const { newsQuery } = await import("@/lib/web-search");
    expect(newsQuery("What is the status of current prospect Sarvam AI?")).toBe("Sarvam AI prospect");
    expect(newsQuery("who are our current prospects from India who will benefit from Singtel services")).toBe("India Singtel prospects");
    expect(newsQuery("What is the latest news on Nxera?")).toBe("Nxera Singtel");
  });

  it("answers again from recent news when the records do not cover the question", async () => {
    vi.stubEnv("RAG_GATEWAY_URL", "http://127.0.0.1:8088");
    vi.stubEnv("RAG_GATEWAY_KEY", "key");
    const rss = `<rss><channel><item><title>Sarvam AI raises funds</title><link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fexample.com%2fsarvam</link><description>Sarvam AI news</description><News:Source>Example Times</News:Source></item></channel></rss>`;
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("bing.com")) return new Response(rss);
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        return body.web.length
          ? sse([["meta", { citations: [{ id: "x", title: "Sarvam AI raises funds", source: "https://example.com/sarvam", snippet: "", score: 1 }] }], ["done", { answer: "SUMMARY: Sarvam AI raised funds [1]." }]])
          : sse([["meta", { citations: [] }], ["done", { answer: "SUMMARY: The records do not cover this." }]]);
      }),
    );
    const events: string[] = [];
    const r = await runRag({ question: "What is Sarvam AI doing?" }, (e) => events.push(e.type));
    expect(r.answer).toBe("SUMMARY: Sarvam AI raised funds [1].");
    expect(events).toContain("restart");
    expect((bodies[1] as { web: { url: string }[] }).web[0].url).toBe("https://example.com/sarvam");
  });
});
