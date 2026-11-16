import type { WebDoc } from "@/lib/rag";
import { isWrappedLink, parseFeed } from "@/lib/signals/rss";

// Online sources for a question the records cannot answer: recent news (Bing News RSS, keyless, demo use; each article keeps its
// own address) and background facts from Wikipedia's search API. Bing's general web RSS returned unrelated spam in testing.
const UA = "Mozilla/5.0 (compatible; SingTech/0.1; enterprise news reader)";
const STOP = new Set(
  "a an and or of to in on at by as do be it its who what which when where why how are is was were the our their your this that these those from with for about into will would could should can does did have has had any all some current currently latest recent news status tell show give list find search online please benefit benefits services service singtech our us we me".split(
    " ",
  ),
);

// Names first (Sarvam AI, Tata Electronics), then the other content words; Bing RSS ignores OR, so a short plain query works best.
export function newsQuery(question: string): string {
  const words = question.replace(/[^\w\s&.-]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()));
  const names = words.filter((w) => /^[A-Z0-9]/.test(w));
  // Singtel brand names are shared with unrelated firms (Nxera Pharma), so they are searched alongside "Singtel".
  const brand = /\b(Nxera|NCS|RE:AI|CUB|Optus|Paragon)\b/i.test(question) && !/singtel/i.test(question) ? ["Singtel"] : [];
  return [...names, ...brand, ...words.filter((w) => !/^[A-Z0-9]/.test(w))].slice(0, 6).join(" ");
}

export async function searchNews(question: string, limit = 4): Promise<WebDoc[]> {
  const q = newsQuery(question);
  if (!q) return [];
  try {
    const res = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=en-SG`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const terms = q.toLowerCase().split(" ");
    return parseFeed((await res.text()).slice(0, 2_000_000))
      .filter((i) => /^https:\/\//.test(i.link) && !isWrappedLink(i.link))
      .map((i) => ({ i, hits: terms.filter((t) => `${i.title} ${i.description}`.toLowerCase().includes(t)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map(({ i }) => ({ title: `${i.title}${i.source ? ` (${i.source})` : ""}`.slice(0, 300), url: i.link, text: `${i.title}. ${i.description}`.slice(0, 1_200) }));
  } catch {
    return [];
  }
}

interface WikiPage {
  title?: string;
  extract?: string;
  fullurl?: string;
}

/** Wikipedia search results that mention at least one of the query's names; each keeps its page address. */
export function parseWikipedia(json: unknown, query: string, limit = 2): WebDoc[] {
  const pages = Object.values((json as { query?: { pages?: Record<string, WikiPage & { index?: number }> } })?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const names = query.split(" ").filter((w) => /^[A-Z0-9]/.test(w)).map((w) => w.toLowerCase());
  return pages
    .filter((p) => p.title && p.fullurl?.startsWith("https://") && (p.extract ?? "").length > 80)
    .filter((p) => !names.length || names.some((n) => `${p.title} ${p.extract}`.toLowerCase().includes(n)))
    .slice(0, limit)
    .map((p) => ({ title: `${p.title} (Wikipedia)`.slice(0, 300), url: p.fullurl!, text: p.extract!.replace(/\s+/g, " ").slice(0, 1_200) }));
}

// Wikipedia needs the subject alone: "Zoho" finds Zoho Corporation, "Zoho Singapore office" finds unrelated lists.
const PLACES = new Set("singapore india indian bengaluru bangalore mumbai chennai hyderabad delhi asia apac asean sea southeast johor malaysia".split(" "));
export function wikiQuery(question: string): string {
  const names = newsQuery(question)
    .split(" ")
    .filter((w) => /^[A-Z0-9]/.test(w) && !PLACES.has(w.toLowerCase()));
  return names.slice(0, 3).join(" ") || newsQuery(question);
}

export async function searchWikipedia(question: string, limit = 2): Promise<WebDoc[]> {
  const q = wikiQuery(question);
  if (!q) return [];
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=extracts%7Cinfo&exintro=1&explaintext=1&exsentences=4&inprop=url&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5_000) });
    return res.ok ? parseWikipedia(await res.json(), q, limit) : [];
  } catch {
    return [];
  }
}

/** News and background together: Wikipedia first for who and what, news for what changed; at most four, no repeats. */
export async function searchOnline(question: string): Promise<WebDoc[]> {
  const [wiki, news] = await Promise.all([searchWikipedia(question), searchNews(question, 3)]);
  const seen = new Set<string>();
  return [...wiki, ...news].filter((d) => !seen.has(d.url) && seen.add(d.url)).slice(0, 4);
}
