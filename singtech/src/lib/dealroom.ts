import { answerBlocks, blocksToText } from "@/lib/answer-format";
import { appendRecord, readRecords } from "@/lib/local-store";
import { sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { runRag, type RagAnswer, type RagEvent } from "@/lib/rag";
import { botUserId, commentOn, isSalesforceConfigured, postToGroup, readGroupFeed, richHtml, type ChatterElement } from "@/lib/salesforce";

// The live deal room is the Salesforce Chatter group; the local file is only used when Salesforce is unreachable.
// Older replies carried this prefix; the bot is now recognised by its Salesforce user (SingTech AI).
// The public app address, taken from the deal room URL, so Chatter answers can link cited records back to SingTech AI.
const appOrigin = () => {
  try {
    return new URL(process.env.NEXT_PUBLIC_DEAL_ROOM_URL ?? "").origin;
  } catch {
    return undefined;
  }
};

export const BOT_PREFIX = "SingTech AI:";
// Questions typed on /deal-room are posted by the integration user, so they carry the guest's name in this prefix.
export const GUEST_PREFIX = "Question from ";
const GUEST_RE = /^Question from ([^:\n]{1,40}): ([\s\S]*)$/;
const BILL_RE = /SGT-INV-\d{4}-\d{4}/i;

export interface RoomMessage {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  isBot: boolean;
  replies: RoomMessage[];
}

// A post gets an AI answer when it mentions @SingTech, asks a question, or names a bill ID. Deal summaries and bot posts never do.
export const needsAnswer = (text: string) =>
  !text.startsWith(BOT_PREFIX) && !text.startsWith("Deal room:") && (/@singtech/i.test(text) || /\?/.test(text) || BILL_RE.test(text));

// Every message typed on /deal-room is for the assistant, question mark or not. In Chatter itself, the bot's own posts are
// summaries or answers; other people's posts need a mention, a question or a bill ID.
export function isQuestionPost(e: Pick<ChatterElement, "actor" | "body">, bot?: string): boolean {
  const text = unescape(e.body?.text);
  if (GUEST_RE.test(text)) return true;
  if (bot && e.actor?.id === bot) return false;
  return needsAnswer(text);
}

export const isAnswered = (e: Pick<ChatterElement, "capabilities">, bot?: string) =>
  (e.capabilities?.comments?.page?.items ?? []).some((c) => (bot && c.user?.id === bot) || c.body.text.startsWith(BOT_PREFIX));

export const questionText = (text: string) =>
  (GUEST_RE.exec(text)?.[2] ?? text)
    .replace(/@singtech( ai)?/gi, "")
    .trim();

// Chatter returns body text HTML-escaped.
const unescape = (s = "") => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export function toMessage(e: ChatterElement, bot?: string): RoomMessage {
  const text = unescape(e.body?.text);
  const guest = GUEST_RE.exec(text);
  const byBot = Boolean(bot && e.actor?.id === bot);
  return {
    id: e.id,
    author: guest ? guest[1] : byBot ? "SingTech AI" : (e.actor?.displayName ?? "Salesforce"),
    text: guest ? guest[2] : text,
    createdAt: e.createdDate,
    isBot: byBot && !guest,
    replies: (e.capabilities?.comments?.page?.items ?? []).map((c) => {
      const isBot = Boolean(bot && c.user?.id === bot) || c.body.text.startsWith(BOT_PREFIX);
      return { id: c.id, author: isBot ? "SingTech AI" : (c.user?.displayName ?? "Reply"), text: unescape(c.body.text).replace(BOT_PREFIX, "").trim(), createdAt: c.createdDate, isBot, replies: [] };
    }),
  };
}

// pending: questions in this same read that still need an answer, so one Chatter call serves both the page and the bot.
// shortcut: one shared 10 s copy of the group feed for every viewer (about 360 REST calls an hour while the room is open);
// a push topic would remove the polling if the room ever stays open all day.
const FEED_TTL_MS = 10_000;
let feedCache: { at: number; feed: ChatterElement[] } | null = null;
async function groupFeed(): Promise<ChatterElement[]> {
  if (feedCache && Date.now() - feedCache.at < FEED_TTL_MS) return feedCache.feed;
  const feed = await readGroupFeed();
  feedCache = { at: Date.now(), feed };
  return feed;
}

// A clean room for a demo: posts before DEAL_ROOM_SINCE (an ISO time) are hidden here, not deleted from Chatter, so it is reversible.
export const isAfterCutoff = (createdAt: string, since = process.env.DEAL_ROOM_SINCE) => !since || !(Date.parse(since) > Date.parse(createdAt));

export async function getRoomFeed(): Promise<{ messages: RoomMessage[]; live: boolean; pending: ChatterElement[] }> {
  if (isSalesforceConfigured()) {
    try {
      const [all, bot] = await Promise.all([groupFeed(), botUserId()]);
      const feed = all.filter((e) => isAfterCutoff(e.createdDate));
      return { messages: feed.map((e) => toMessage(e, bot)), live: true, pending: unanswered(feed, bot) };
    } catch {
      // fall through to the local copy
    }
  }
  return { messages: (await readRecords<RoomMessage>("dealroom.json")).filter((m) => isAfterCutoff(m.createdAt)), live: false, pending: [] };
}

export async function postRoomMessage(name: string, text: string): Promise<{ id: string; live: boolean; text: string }> {
  const clean = sanitizeEnterprisePayload(`${GUEST_PREFIX}${name}: ${text}`).sanitizedText;
  if (isSalesforceConfigured()) {
    try {
      const id = await postToGroup(clean);
      feedCache = null;
      return { id, live: true, text: clean };
    } catch (e) {
      console.error(`Deal room post not synced to Salesforce: ${e instanceof Error ? e.message.slice(0, 160) : "error"}`);
    }
  }
  const id = `local-${Date.now().toString(36)}`;
  await appendRecord<RoomMessage>("dealroom.json", { id, author: name, text: questionText(clean), createdAt: new Date().toISOString(), isBot: false, replies: [] });
  return { id, live: false, text: clean };
}

const inflight = new Set<string>();
// Answered posts are remembered so a poll that read the feed before the reply landed cannot answer twice.
const answered = new Set<string>();

// Answers one post: streams tokens to onEvent (the deal-room page) and replies in Chatter with Root Cause, Next Actions, Sources.
// prepared: an answer already started while the post was being created, so the two Salesforce round trips do not add up.
export async function answerPost(id: string, rawText: string, live: boolean, onEvent?: (e: RagEvent) => void, prepared?: Promise<RagAnswer>): Promise<void> {
  if (inflight.has(id) || answered.has(id)) return;
  inflight.add(id);
  try {
    const question = questionText(rawText);
    const r = await (prepared ?? runRag({ question, sessionId: `chatter-${id}`.replace(/[^\w-]/g, "") }, onEvent));
    const blocks = answerBlocks(question, r.answer, r.citations, appOrigin());
    if (live) {
      await commentOn(id, blocksToText(blocks), richHtml(blocks));
      feedCache = null;
    } else {
      await appendRecord<RoomMessage>("dealroom.json", { id: `${id}-ai`, author: "SingTech AI", text: blocksToText(blocks), createdAt: new Date().toISOString(), isBot: true, replies: [] });
    }
    answered.add(id);
  } finally {
    inflight.delete(id);
  }
}

const unanswered = (feed: ChatterElement[], bot?: string) => feed.filter((e) => isQuestionPost(e, bot) && !isAnswered(e, bot) && !inflight.has(e.id) && !answered.has(e.id));

export const answerAll = (pending: ChatterElement[]) => Promise.all(pending.map((e) => answerPost(e.id, unescape(e.body?.text), true)));

// Catches questions typed straight into Chatter. Safe to call repeatedly.
export async function answerPending(): Promise<number> {
  if (!isSalesforceConfigured()) return 0;
  const [feed, bot] = await Promise.all([readGroupFeed(), botUserId()]);
  const pending = unanswered(feed, bot);
  await answerAll(pending);
  return pending.length;
}
