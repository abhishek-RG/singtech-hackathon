// Small RSS 2.0 / Atom parser: regex over a trusted shape, no DOM. Feed text is data only; nothing in it is executed.

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: string | null;
  description: string;
  source?: string;
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "...",
  mdash: "-",
  ndash: "-",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, e: string) => {
    if (e[0] !== "#") return NAMED[e] ?? match;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

// Copy rules: no em or en dashes, no emoji, single spaces. Built from char codes so the source holds no dash characters.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, "g");
export const cleanText = (s: string) =>
  s
    .replace(DASHES, "-")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (s: string) => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");

// Feed fields are often entity-encoded HTML, so decode, strip tags, then decode what the tags held.
export const toPlainText = (s: string) => cleanText(decodeEntities(stripTags(decodeEntities(s))));

// GDELT "20261115T101500Z", RFC 822 pubDate, or ISO 8601; anything unparseable is null.
export function toIsoDate(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const gdelt = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const ms = gdelt ? Date.UTC(+gdelt[1], +gdelt[2] - 1, +gdelt[3], +gdelt[4], +gdelt[5], +gdelt[6]) : Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

// Aggregators wrap the article in a redirect whose real address is a query parameter; return that address instead.
// news.google.com/rss/articles/<id> links hide the address entirely and are reported as wrapped (unusable as a source).
export function unwrapLink(link: string): string {
  try {
    const u = new URL(link);
    const host = u.hostname.replace(/^www\./, "");
    const inner = host === "bing.com" ? u.searchParams.get("url") : /^(google\.[a-z.]+|news\.google\.com)$/.test(host) ? (u.searchParams.get("url") ?? u.searchParams.get("q")) : null;
    return inner && /^https?:\/\//i.test(inner) ? inner.replace(/^http:\/\//i, "https://") : link;
  } catch {
    return link;
  }
}

export const isWrappedLink = (link: string) => /^https?:\/\/news\.google\.com\/(rss\/)?articles\//i.test(link) || /^https?:\/\/(www\.)?bing\.com\/news\/apiclick/i.test(link);

const field = (block: string, name: string) =>
  block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1];

function atomLink(block: string): string | undefined {
  const links = block.match(/<link\b[^>]*>/gi) ?? [];
  const pick = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links.find((l) => !/rel=/i.test(l)) ?? links[0];
  return pick?.match(/href=["']([^"']+)["']/i)?.[1];
}

export function parseFeed(xml: string): FeedItem[] {
  // Park CDATA first so markup inside it can never be mistaken for feed fields.
  const cdata: string[] = [];
  const doc = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, body: string) => `\u0000${cdata.push(body) - 1}\u0000`);
  const restore = (s: string | undefined) => (s ?? "").replace(/\u0000(\d+)\u0000/g, (_, i: string) => cdata[+i]);

  const blocks = doc.match(/<item\b[\s\S]*?<\/item>/gi) ?? doc.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.flatMap((block) => {
    const title = toPlainText(restore(field(block, "title")));
    const rawLink = field(block, "link")?.trim() || atomLink(block);
    const link = unwrapLink(cleanText(decodeEntities(restore(rawLink))));
    if (!title || !link) return [];
    const date = field(block, "pubDate") ?? field(block, "dc:date") ?? field(block, "published") ?? field(block, "updated");
    const source = toPlainText(restore(field(block, "source") ?? field(block, "News:Source")));
    return [
      {
        title,
        link,
        publishedAt: toIsoDate(restore(date)),
        description: toPlainText(restore(field(block, "description") ?? field(block, "summary") ?? field(block, "content"))),
        ...(source ? { source } : {}),
      },
    ];
  });
}
