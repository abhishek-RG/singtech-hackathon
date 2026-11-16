// Salesforce Developer Edition via OAuth 2.0 client credentials (CLAUDE.md section 0). Server-only.
const API = "v66.0";
const TIMEOUT_MS = 15_000;
// A warm demo commonly pushes the same account more than once (for example after an approval retry). Salesforce has no
// external IDs configured for this prototype, so a short process-local natural-key cache removes the two redundant SOQL
// lookups without changing the records or widening write permissions.
const RECORD_CACHE_TTL_MS = 20 * 60_000;

let cached: { token: string; at: number } | null = null;
let botId: string | undefined;
const TOKEN_TTL_MS = 15 * 60_000;
const recordIds = new Map<string, { id: string; at: number }>();

const env = () => ({
  url: process.env.SALESFORCE_INSTANCE_URL,
  key: process.env.SALESFORCE_CONSUMER_KEY,
  secret: process.env.SALESFORCE_CONSUMER_SECRET,
  group: process.env.SALESFORCE_DEAL_ROOM_GROUP_ID,
});

export const isSalesforceConfigured = () => {
  const e = env();
  return Boolean(e.url?.startsWith("https://") && e.key && e.secret);
};

export const dealRoomGroupId = () => env().group;
export const recordUrl = (id: string) => `${env().url}/${id}`;

// A connection that never opened (DNS, TLS, reset) is safe to retry once; a request Salesforce may have received is not.
async function fetchOnce(input: string, init: RequestInit, isIdempotent: boolean): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    const cause = e instanceof Error && e.cause instanceof Error ? ` ${(e.cause as NodeJS.ErrnoException).code ?? e.cause.message}` : "";
    console.error(`Salesforce request failed (${e instanceof Error ? e.message : "error"}${cause}); ${isIdempotent ? "retrying once" : "not retried"}`);
    if (!isIdempotent) throw e;
    return fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  }
}

async function token(force = false): Promise<string> {
  // Client-credentials tokens carry no expires_in: kept in memory for 15 minutes (never fetched per poll), refreshed early on a 401.
  if (!force && cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;
  const { url, key, secret } = env();
  const res = await fetchOnce(
    `${url}/services/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: key!, client_secret: secret! }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
    true,
  );
  if (!res.ok) throw new Error(`Salesforce auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string };
  cached = { token: data.access_token, at: Date.now() };
  return data.access_token;
}

export async function sf<T>(path: string, init: { method?: string; body?: unknown } = {}, retried = false): Promise<T> {
  const method = init.method ?? "GET";
  const res = await fetchOnce(
    `${env().url}/services/data/${API}${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${await token(retried)}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
    method === "GET",
  );
  if (res.status === 401 && !retried) return sf<T>(path, init, true);
  if (!res.ok) throw new Error(`Salesforce ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const soqlString = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

async function findId(soql: string): Promise<string | undefined> {
  const r = await sf<{ records: { Id: string }[] }>(`/query?q=${encodeURIComponent(soql)}`);
  return r.records[0]?.Id;
}

const recordKey = (kind: "account" | "opportunity", ...parts: string[]) => `${kind}:${parts.map((part) => part.trim().toLocaleLowerCase("en-US")).join(":")}`;

function cachedRecordId(key: string): string | undefined {
  const hit = recordIds.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at < RECORD_CACHE_TTL_MS) return hit.id;
  recordIds.delete(key);
  return undefined;
}

function rememberRecordId(key: string, id: string) {
  recordIds.set(key, { id, at: Date.now() });
  // Bound the small server-local cache even during a long judge-day demo.
  if (recordIds.size > 500) recordIds.delete(recordIds.keys().next().value!);
}

async function findCachedId(key: string, soql: string): Promise<string | undefined> {
  const cachedId = cachedRecordId(key);
  if (cachedId) return cachedId;
  const id = await findId(soql);
  if (id) rememberRecordId(key, id);
  return id;
}

// Salesforce names fields the integration user may not write (field-level security), e.g. "Unable to create/update fields: Description, Amount."
export function blockedFields(error: unknown): string[] {
  const m = (error instanceof Error ? error.message : "").match(/Unable to create\/update fields: ([\w, ]+?)\./);
  return m ? m[1].split(/,\s*/).filter(Boolean) : [];
}

// Writes the record; if some fields lack edit access, retries once without them so the record still lands (the details
// still reach the deal-room post). Grant the fields in the SingTech AI permission set to keep them.
async function write<T>(path: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<T | undefined> {
  try {
    return await sf<T>(path, { method, body });
  } catch (e) {
    const blocked = blockedFields(e);
    if (!blocked.length) throw e;
    console.error(`Salesforce wrote ${path.split("/")[2]} without fields it cannot edit: ${blocked.join(", ")}`);
    const rest = Object.fromEntries(Object.entries(body).filter(([k]) => !blocked.includes(k)));
    return Object.keys(rest).length ? sf<T>(path, { method, body: rest }) : undefined;
  }
}

// Upsert by natural key (name) so re-pushing the same deal updates instead of duplicating.
export async function upsertAccount(name: string, fields: Record<string, unknown>): Promise<string> {
  const key = recordKey("account", name);
  const id = await findCachedId(key, `SELECT Id FROM Account WHERE Name = ${soqlString(name)} LIMIT 1`);
  if (id) {
    if (Object.keys(fields).length) await write(`/sobjects/Account/${id}`, "PATCH", fields);
    return id;
  }
  const created = (await write<{ id: string }>("/sobjects/Account", "POST", { Name: name, ...fields }))!.id;
  rememberRecordId(key, created);
  return created;
}

export async function upsertOpportunity(accountId: string, name: string, fields: Record<string, unknown>): Promise<string> {
  const key = recordKey("opportunity", accountId, name);
  const id = await findCachedId(key, `SELECT Id FROM Opportunity WHERE AccountId = ${soqlString(accountId)} AND Name = ${soqlString(name)} LIMIT 1`);
  if (id) {
    await write(`/sobjects/Opportunity/${id}`, "PATCH", fields);
    return id;
  }
  const created = (await write<{ id: string }>("/sobjects/Opportunity", "POST", { Name: name, AccountId: accountId, ...fields }))!.id;
  rememberRecordId(key, created);
  return created;
}

// Optional: the Salesforce Integration licence that SingTech AI runs on has no Activities access (Task returns NOT_FOUND).
// The next step still reaches Salesforce on the Opportunity (NextStep) and in the deal-room post.
export async function createTask(fields: Record<string, unknown>): Promise<string | undefined> {
  try {
    return (await write<{ id: string }>("/sobjects/Task", "POST", fields))?.id;
  } catch (e) {
    console.error(`Salesforce Task skipped: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`);
    return undefined;
  }
}

// Called once at server start (src/instrumentation.ts) so the first deal-room post does not pay for the token and TLS set-up.
export async function warmSalesforce(): Promise<void> {
  if (!isSalesforceConfigured()) return;
  try {
    await token();
    await botUserId();
    // The org's first feed call is slow (about 9 s on a Developer Edition); a cheap read pays that before a judge posts.
    await readGroupFeed(1);
  } catch (e) {
    console.error(`Salesforce warm-up failed: ${e instanceof Error ? e.message : "error"}`);
  }
}

// The integration user the client-credentials flow runs as ("SingTech AI"). Its own posts and replies never trigger the bot.
export async function botUserId(): Promise<string | undefined> {
  if (!botId) {
    const res = await fetchOnce(`${env().url}/services/oauth2/userinfo`, { headers: { Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(TIMEOUT_MS) }, true).catch(() => undefined);
    botId = res?.ok ? ((await res.json()) as { user_id?: string }).user_id : undefined;
  }
  return botId;
}

// The deal room uses FeedItem and FeedComment records through the standard REST API (daily limit, 15,000 calls) rather than the
// Chatter API, whose hourly per-user limit a live demo with polling exhausts. Same feed, same rich text in Salesforce.
export interface Block {
  heading: string;
  lines: string[];
  isList?: boolean;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Bold headings, paragraphs and bullet lists in the HTML subset Salesforce feed rich text accepts.
export function richHtml(blocks: Block[]): string {
  return blocks
    .map((b) => `<p><b>${esc(b.heading)}</b></p>${b.isList ? `<ul>${b.lines.map((l) => `<li>${esc(l.slice(0, 1_500))}</li>`).join("")}</ul>` : b.lines.map((l) => `<p>${esc(l.slice(0, 3_000))}</p>`).join("")}`)
    .join("")
    .slice(0, 9_900);
}
export const richSegments = richHtml;

// Feed rich text back to plain lines: paragraphs and list items on their own lines, "- " for bullets.
export function htmlToText(html = ""): string {
  return html
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const plainHtml = (text: string) => text.split(/\n+/).map((l) => `<p>${esc(l)}</p>`).join("").slice(0, 9_900);

// Posts on a record's feed (the deal room group, or an Account). Returns the FeedItem id.
export async function postToFeed(parentId: string, text: string, html?: string): Promise<string> {
  return (await sf<{ id: string }>("/sobjects/FeedItem", { method: "POST", body: { ParentId: parentId, Type: "TextPost", IsRichText: true, Body: html ?? plainHtml(text) } })).id;
}

export async function postToGroup(text: string, html?: string): Promise<string> {
  const group = dealRoomGroupId();
  if (!group) throw new Error("Deal room group not configured");
  return postToFeed(group, text, html);
}

export async function commentOn(feedItemId: string, text: string, html?: string): Promise<string> {
  return (await sf<{ id: string }>("/sobjects/FeedComment", { method: "POST", body: { FeedItemId: feedItemId, IsRichText: true, CommentBody: html ?? plainHtml(text) } })).id;
}

export interface ChatterComment {
  id: string;
  createdDate: string;
  user?: { id?: string; displayName?: string };
  body: { text: string };
}

export interface ChatterElement {
  id: string;
  createdDate: string;
  actor?: { id?: string; displayName?: string };
  body?: { text?: string };
  capabilities?: { comments?: { page?: { items?: ChatterComment[] } } };
}

interface FeedRow {
  Id: string;
  Body?: string;
  CreatedDate: string;
  CreatedById: string;
  CreatedBy?: { Name?: string };
  FeedComments?: { records: { Id: string; CommentBody?: string; CreatedDate: string; CreatedById: string; CreatedBy?: { Name?: string } }[] } | null;
}

// The group feed through SOQL on CollaborationGroupFeed (FeedItem itself only allows queries by Id), newest first.
export async function readGroupFeed(pageSize = 25): Promise<ChatterElement[]> {
  const group = dealRoomGroupId();
  if (!group) throw new Error("Deal room group not configured");
  const soql = `SELECT Id, Body, CreatedDate, CreatedById, CreatedBy.Name, (SELECT Id, CommentBody, CreatedDate, CreatedById, CreatedBy.Name FROM FeedComments ORDER BY CreatedDate) FROM CollaborationGroupFeed WHERE ParentId = ${soqlString(group)} ORDER BY CreatedDate DESC LIMIT ${Math.min(Math.max(pageSize, 1), 50)}`;
  const r = await sf<{ records: FeedRow[] }>(`/query?q=${encodeURIComponent(soql)}`);
  return r.records.map((row) => ({
    id: row.Id,
    createdDate: row.CreatedDate,
    actor: { id: row.CreatedById, displayName: row.CreatedBy?.Name },
    body: { text: htmlToText(row.Body) },
    capabilities: {
      comments: {
        page: {
          items: (row.FeedComments?.records ?? []).map((c) => ({ id: c.Id, createdDate: c.CreatedDate, user: { id: c.CreatedById, displayName: c.CreatedBy?.Name }, body: { text: htmlToText(c.CommentBody) } })),
        },
      },
    },
  }));
}
