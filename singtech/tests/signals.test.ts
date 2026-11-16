import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import seedJson from "@/data/signals_seed.json";
import { buildSignal, classify, rescore, resolveKind, scoreSignal, signalId, TENDER_TRIGGER } from "@/lib/signals/classify";
import { parseFeed, toIsoDate, toPlainText } from "@/lib/signals/rss";
import { SignalSchema, type Signal } from "@/lib/signals/types";

const NOW = Date.parse("2026-11-15T04:00:00Z");
const seed = z.array(SignalSchema).parse(seedJson);
const sum = (s: Signal) => s.scoreBreakdown.reduce((t, c) => t + c.points, 0);

const RSS = `<?xml version="1.0"?><rss><channel><title>Feed</title>
<item>
  <title><![CDATA[Nxera opens <b>DC Tuas</b> & expands]]></title>
  <link>https://example.com/a?x=1&amp;y=2</link>
  <pubDate>Fri, 13 Nov 2026 10:12:00 +0000</pubDate>
  <description><![CDATA[<p>58MW of AI-ready capacity [&#8230;] in Singapore</p>]]></description>
</item>
<item>
  <title>Port operator&#x2019;s &quot;robot&quot; trial &ndash; Tuas</title>
  <link>https://example.com/b</link>
  <description>&lt;a href="https://x"&gt;Linked&lt;/a&gt;&amp;nbsp;text</description>
</item>
<item><title></title><link>https://example.com/skip</link></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title>
<entry><title type="html">Ransomware hits &lt;i&gt;logistics&lt;/i&gt; firm</title>
<link rel="self" href="https://example.com/self"/><link rel="alternate" href="https://example.com/post"/>
<published>2026-11-14T09:00:00+08:00</published><summary>Cold chain fleet affected.</summary></entry></feed>`;

describe("RSS and Atom parser", () => {
  it("reads RSS items with CDATA, entities, and a missing date", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "Nxera opens DC Tuas & expands",
      link: "https://example.com/a?x=1&y=2",
      publishedAt: "2026-11-13T10:12:00.000Z",
      description: "58MW of AI-ready capacity [\u2026] in Singapore",
    });
    expect(items[1].title).toBe('Port operator’s "robot" trial - Tuas');
    expect(items[1].publishedAt).toBeNull();
    expect(items[1].description).toBe("Linked text");
  });

  it("reads Atom entries and prefers the alternate link", () => {
    const [entry] = parseFeed(ATOM);
    expect(entry).toMatchObject({ title: "Ransomware hits logistics firm", link: "https://example.com/post", publishedAt: "2026-11-14T01:00:00.000Z" });
    expect(entry.description).toBe("Cold chain fleet affected.");
  });

  it("parses GDELT and RFC 822 dates and rejects junk", () => {
    expect(toIsoDate("20261115T101500Z")).toBe("2026-11-15T10:15:00.000Z");
    expect(toIsoDate("Sun, 15 Nov 2026 22:47:31 +0800 ")).toBe("2026-11-15T14:47:31.000Z");
    expect(toIsoDate("not a date")).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
  });

  it("removes dashes and emoji from feed text", () => {
    const [en, em, rocket] = [String.fromCharCode(0x2013), String.fromCharCode(0x2014), String.fromCodePoint(0x1f680)];
    expect(toPlainText(`Up ${em} down ${en} flat ${rocket}`)).toBe("Up - down - flat");
  });
});

describe("rule-based classifier", () => {
  const cases: [string, string, string[]][] = [
    ["Acme opens regional headquarters", "Expansion or new office", ["SGT-CUBE", "SGT-MOB", "SGT-CYBER"]],
    ["New 40MW colocation campus", "Data centre or colocation", ["SGT-CUBE", "SGT-NXERA"]],
    ["Bank deploys GPU cluster for LLM work", "AI compute or sovereign AI", ["SGT-REAI"]],
    ["Ransomware breach under PDPA review", "Cyber incident or regulation", ["SGT-CYBER", "SGT-QSN"]],
    ["AGV robots at the warehouse", "Port, warehouse or factory automation", ["SGT-5G", "SGT-IOT"]],
    ["Cold chain fleet expands lanes", "Fleet, logistics or cold chain", ["SGT-IOT", "SGT-MOB"]],
    ["Bank pilots PQC encryption", "Quantum-safe or encryption", ["SGT-QSN"]],
  ];
  it.each(cases)("%s", (text, trigger, products) => {
    const result = classify(text);
    expect(result.triggers).toContain(trigger);
    for (const p of products) expect(result.products).toContain(p);
  });

  it("finds nothing in unrelated text", () => {
    expect(classify("Local football results")).toEqual({ triggers: [], products: [] });
  });

  it("routes Singtel Group news, prospects, and tenders", () => {
    expect(resolveKind("auto", "Singtel's RE:AI adds GPUs")).toBe("singtel-news");
    expect(resolveKind("auto", "NCS opens AI Mission Centre")).toBe("singtel-news");
    expect(resolveKind("auto", "Acme expands to Singapore")).toBe("prospect-trigger");
    expect(resolveKind("tender", "Singtel")).toBe("tender");
  });
});

describe("score", () => {
  it("equals the sum of its components and stays within 0 to 100", () => {
    const fresh = scoreSignal({ text: "Bengaluru firm in Singapore", publishedAt: "2026-11-14T00:00:00Z", triggers: [TENDER_TRIGGER], products: ["SGT-5G", "SGT-IOT", "SGT-MOB", "SGT-CUBE"] }, NOW);
    expect(fresh.score).toBe(100);
    const stale = scoreSignal({ text: "nothing", publishedAt: null, triggers: [], products: [] }, NOW);
    expect(stale.score).toBe(4);
    for (const s of [fresh, stale]) expect(s.score).toBe(s.scoreBreakdown.reduce((t, c) => t + c.points, 0));
  });

  it("decays with age", () => {
    const at = (iso: string) => scoreSignal({ text: "", publishedAt: iso, triggers: [], products: [] }, NOW).score;
    expect(at("2026-11-14T00:00:00Z")).toBeGreaterThan(at("2026-10-01T00:00:00Z"));
    expect(at("2026-10-01T00:00:00Z")).toBeGreaterThan(at("2025-01-01T00:00:00Z"));
  });

  it("builds a valid signal with a sha1 id", () => {
    const s = buildSignal({ title: "Acme opens Bengaluru warehouse for Singapore lanes", url: "https://example.com/x", publishedAt: null, source: "Example", snippet: "", kind: "auto" }, NOW);
    expect(SignalSchema.parse(s)).toEqual(s);
    expect(s.id).toBe(signalId("https://example.com/x"));
    expect(s.kind).toBe("prospect-trigger");
    expect(s.score).toBe(sum(s));
  });
});

describe("seed snapshot", () => {
  it("validates, and every score equals its components before and after rescoring", () => {
    expect(seed.length).toBeGreaterThanOrEqual(20);
    for (const s of seed) {
      expect(SignalSchema.safeParse(s).success).toBe(true);
      expect(s.id).toBe(signalId(s.url));
      expect(s.score).toBe(sum(s));
      const r = rescore(s, NOW);
      expect(r.score).toBe(sum(r));
    }
  });

  it("covers Singtel Group news and prospect triggers", () => {
    expect(seed.filter((s) => s.kind === "singtel-news").length).toBeGreaterThanOrEqual(10);
    expect(seed.filter((s) => s.kind === "prospect-trigger").length).toBeGreaterThanOrEqual(10);
  });
});

const GEBIZ = `<rss><channel><item><title>SUPPLY OF IT SERVICES FOR CLOUD MIGRATION</title>
<link>https://www.gebiz.gov.sg/ptn/opportunity/opportunityDetails.xhtml?code=ABC123&amp;origin=rss</link>
<description>ITT: ABC123 | Published Date: 13/11/2026 | Closing Date: 08/12/2026 16:00:00 | Calling Entity: Sample Agency |</description>
</item></channel></rss>`;
const NEWS = `<rss><channel><item><title>Acme Logistics opens Singapore regional headquarters</title><link>https://news.example.com/acme</link>
<pubDate>Sat, 14 Nov 2026 02:00:00 +0000</pubDate><description>Bengaluru fleet operator expands.</description></item>
<item><title>Acme Logistics opens Singapore regional headquarters</title><link>https://other.example.com/acme-copy</link>
<pubDate>Sat, 14 Nov 2026 03:00:00 +0000</pubDate><description>Same story.</description></item>
<item><title>Football results</title><link>https://news.example.com/sport</link></item></channel></rss>`;
const GDELT = JSON.stringify({ articles: [{ url: "https://gdelt.example.com/dc", title: "New data centre in Singapore", seendate: "20261115T010000Z", domain: "gdelt.example.com" }] });

describe("getSignals", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the seed when every fetch throws, without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { getSignals } = await import("@/lib/signals");
    const result = await getSignals({ refresh: true, limit: 200 });
    expect(result.live).toBe(false);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals.every((s) => seed.some((x) => x.id === s.id))).toBe(true);
    expect(result.sources.filter((s) => s.ok).map((s) => s.name)).toEqual(["Cached snapshot"]);
  });

  it("merges live items, dedupes them, keeps tenders, and filters by kind", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.includes("gdeltproject") ? GDELT : url.includes("gebiz") ? GEBIZ : url.includes("businesstimes") ? NEWS : "<rss></rss>";
      return new Response(body, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getSignals, signalDocuments } = await import("@/lib/signals");
    const result = await getSignals({ limit: 200 });
    expect(result.live).toBe(true);
    const acme = result.signals.filter((s) => s.title.startsWith("Acme Logistics"));
    expect(acme).toHaveLength(1);
    expect(result.signals.some((s) => s.url === "https://news.example.com/sport")).toBe(false);
    expect(result.signals.some((s) => s.url === "https://gdelt.example.com/dc")).toBe(true);

    const tenders = (await getSignals({ kind: "tender" })).signals;
    expect(tenders.length).toBe(1);
    expect(tenders[0]).toMatchObject({ matchedCompany: "Sample Agency", publishedAt: "2026-11-12T16:00:00.000Z" });
    expect(tenders[0].triggers).toContain(TENDER_TRIGGER);
    expect(tenders[0].products).toContain("SGT-NCS");

    const calls = fetchMock.mock.calls.length;
    await getSignals();
    expect(fetchMock.mock.calls.length).toBe(calls); // served from the 15-minute cache

    const [doc] = signalDocuments(tenders);
    expect(doc).toMatchObject({ id: tenders[0].id, source: tenders[0].url, kind: "signal" });
  });

  it("rejects bad query parameters at the route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { GET } = await import("@/app/api/signals/route");
    expect((await GET(new Request("http://localhost/api/signals?kind=bogus"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/signals?limit=0"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/signals?extra=1"))).status).toBe(400);
    const ok = await GET(new Request("http://localhost/api/signals?kind=singtel-news&limit=3"));
    const body = (await ok.json()) as { signals: Signal[] };
    expect(body.signals.length).toBeLessThanOrEqual(3);
    expect(body.signals.every((s) => s.kind === "singtel-news")).toBe(true);
  });
});

// Opt-in live check: SIGNALS_LIVE=1 pnpm exec vitest run tests/signals.test.ts
describe.skipIf(!process.env.SIGNALS_LIVE)("live feeds", () => {
  it("fetches today's feeds", { timeout: 60_000 }, async () => {
    vi.resetModules();
    const { getSignals } = await import("@/lib/signals");
    const result = await getSignals({ refresh: true, limit: 200 });
    const kinds = Object.fromEntries(["singtel-news", "prospect-trigger", "tender"].map((k) => [k, result.signals.filter((s) => s.kind === k).length]));
    console.info(JSON.stringify({ live: result.live, sources: result.sources, kinds }, null, 1));
    for (const s of result.signals.slice(0, 15)) console.info(s.score, s.kind, s.source, "|", s.title, "|", s.triggers.join("; "));
    expect(result.sources.length).toBeGreaterThan(5);
  });
});
