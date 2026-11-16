import type { ProductId } from "@/types/singtech";
import { TENDER_TRIGGER } from "./classify";
import { cleanText, isWrappedLink, parseFeed, toIsoDate, type FeedItem } from "./rss";
import type { RawSignal, SignalKind } from "./types";

// Free, keyless sources only. Each was checked to respond on 15 Nov 2026 (Bing, ST, The Edge and ET Telecom on 16 Nov 2026).
export interface SourceDef {
  name: string;
  url: string;
  format: "rss" | "gdelt";
  publisher: string;
  kind: SignalKind | "auto";
  defaultProducts?: ProductId[];
}

const TIMEOUT_MS = 8_000;
const MAX_CHARS = 3_000_000;
const UA = "Mozilla/5.0 (compatible; SingTech/0.1; enterprise news reader)";

// Bing News RSS carries each article's own address (Google News links hide it). Demo use; swap for a licensed feed in production.
const bingNews = (q: string) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=en-SG`;
const AGGREGATORS = new Set(["Bing News", "Google News"]);

const GDELT_QUERY = '(Singtel OR Nxera OR Bengaluru OR Bangalore OR "data centre") Singapore sourcelang:english';

export const SOURCES: readonly SourceDef[] = [
  {
    name: "GDELT",
    format: "gdelt",
    publisher: "GDELT",
    kind: "auto",
    url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(GDELT_QUERY)}&mode=artlist&format=json&maxrecords=50&timespan=7d&sort=datedesc`,
  },
  // Bing's RSS ignores OR, so each topic is its own short query.
  { name: "Bing News: Singtel", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("Singtel enterprise") },
  { name: "Bing News: Nxera", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("Nxera") },
  { name: "Bing News: NCS", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("NCS Singapore") },
  { name: "Bing News: Bengaluru logistics", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("Bengaluru logistics Singapore") },
  { name: "Bing News: India manufacturing", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("India manufacturing Singapore") },
  { name: "Bing News: Singapore data centres", format: "rss", publisher: "Bing News", kind: "auto", url: bingNews("Singapore data centre") },
  { name: "The Straits Times: Business", format: "rss", publisher: "The Straits Times", kind: "auto", url: "https://www.straitstimes.com/news/business/rss.xml" },
  { name: "The Edge Singapore", format: "rss", publisher: "The Edge Singapore", kind: "auto", url: "https://www.theedgesingapore.com/rss.xml" },
  { name: "ET Telecom", format: "rss", publisher: "ET Telecom", kind: "auto", url: "https://telecom.economictimes.indiatimes.com/rss/topstories" },
  { name: "The Business Times: Technology", format: "rss", publisher: "The Business Times", kind: "auto", url: "https://www.businesstimes.com.sg/rss/technology" },
  { name: "The Business Times: Top stories", format: "rss", publisher: "The Business Times", kind: "auto", url: "https://www.businesstimes.com.sg/rss/top-stories" },
  { name: "CNA: Business", format: "rss", publisher: "CNA", kind: "auto", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936" },
  { name: "e27", format: "rss", publisher: "e27", kind: "auto", url: "https://e27.co/feed/" },
  {
    name: "GeBIZ: Telecommunication devices",
    format: "rss",
    publisher: "GeBIZ Singapore",
    kind: "tender",
    defaultProducts: ["SGT-MOB"],
    url: "https://www.gebiz.gov.sg/rss/Telecommunication_Devices-CREATE_BO_FEED.xml",
  },
  {
    name: "GeBIZ: IT services and software",
    format: "rss",
    publisher: "GeBIZ Singapore",
    kind: "tender",
    defaultProducts: ["SGT-NCS"],
    url: "https://www.gebiz.gov.sg/rss/IT_Services_&_Software_Development-CREATE_BO_FEED.xml",
  },
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_CHARS) throw new Error("Response too large");
  return text;
}

// GDELT allows one request per 5 seconds and answers 429 in plain text when exceeded: serialise, and cool down after any failure.
const GDELT_GAP_MS = 5_500;
const GDELT_COOLDOWN_MS = 60_000;
let gdeltQueue: Promise<unknown> = Promise.resolve();
let gdeltLastAt = 0;
let gdeltBlockedUntil = 0;

function serialGdelt<T>(task: () => Promise<T>): Promise<T> {
  const run = gdeltQueue.then(async () => {
    if (Date.now() < gdeltBlockedUntil) throw new Error("GDELT cooling down");
    const wait = gdeltLastAt + GDELT_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await task();
    } catch (error) {
      gdeltBlockedUntil = Date.now() + GDELT_COOLDOWN_MS;
      throw error;
    } finally {
      gdeltLastAt = Date.now();
    }
  });
  gdeltQueue = run.catch(() => undefined);
  return run;
}

interface GdeltArticle {
  url?: unknown;
  title?: unknown;
  seendate?: unknown;
  domain?: unknown;
}

async function fetchGdelt(def: SourceDef): Promise<RawSignal[]> {
  const body = await serialGdelt(() => fetchText(def.url));
  const parsed = JSON.parse(body) as { articles?: GdeltArticle[] };
  return (parsed.articles ?? []).flatMap((a) =>
    typeof a.url === "string" && typeof a.title === "string"
      ? [
          {
            title: cleanText(a.title),
            url: a.url,
            publishedAt: toIsoDate(typeof a.seendate === "string" ? a.seendate : undefined),
            source: typeof a.domain === "string" && a.domain ? a.domain : def.publisher,
            snippet: "",
            kind: def.kind,
          },
        ]
      : [],
  );
}

// GeBIZ items carry no pubDate; the description holds "Published Date: dd/mm/yyyy | ... | Calling Entity: X |".
function tenderFields(description: string) {
  const d = description.match(/Published Date:\s*(\d{2})\/(\d{2})\/(\d{4})/);
  const entity = description.match(/Calling Entity:\s*([^|]+?)\s*\|/)?.[1];
  return { publishedAt: d ? `${d[3]}-${d[2]}-${d[1]}T00:00:00+08:00` : undefined, entity };
}

function fromFeedItem(item: FeedItem, def: SourceDef): RawSignal {
  const isAggregator = AGGREGATORS.has(def.publisher);
  const publisher = item.source || def.publisher;
  // Aggregator titles can end with " - Publisher"; Google News descriptions only repeat the title.
  const title = isAggregator && item.title.endsWith(` - ${publisher}`) ? item.title.slice(0, -(publisher.length + 3)) : item.title;
  const base: RawSignal = {
    title,
    url: item.link,
    publishedAt: item.publishedAt,
    source: publisher,
    snippet: def.publisher === "Google News" ? "" : item.description.slice(0, 280),
    kind: def.kind,
  };
  if (def.kind !== "tender") return base;
  const tender = tenderFields(item.description);
  return {
    ...base,
    publishedAt: item.publishedAt ?? toIsoDate(tender.publishedAt),
    extraTriggers: [TENDER_TRIGGER],
    extraProducts: def.defaultProducts,
    ...(tender.entity ? { matchedCompany: tender.entity } : {}),
  };
}

// Google News also indexes social posts; keep publishers only.
const SOCIAL = /^(linkedin|facebook|instagram|youtube|tiktok|x|twitter|reddit)$/i;

export async function fetchSource(def: SourceDef): Promise<RawSignal[]> {
  if (def.format === "gdelt") return fetchGdelt(def);
  return parseFeed(await fetchText(def.url))
    // A source must be the article itself: social posts and links that still hide their address are dropped.
    .filter((item) => !SOCIAL.test(item.source ?? "") && !isWrappedLink(item.link))
    .map((item) => fromFeedItem(item, def));
}
