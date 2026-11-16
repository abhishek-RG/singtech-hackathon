// Turns a rep's command into on-screen steps the SingTech AI cursor performs. Rules only (no model), so it is instant,
// predictable on stage and testable. Anything that writes to Salesforce ends in an approval step the rep must click.

export interface Target {
  css: string;
  // Narrows css matches to the element whose text contains this (tabs, buttons, table rows).
  text?: string;
}

export type AgentStep =
  | { kind: "say"; text: string }
  | { kind: "go"; href: string; via?: Target[]; label: string }
  | { kind: "click"; target: Target; label: string; optional?: boolean }
  | { kind: "highlight"; target: Target; label: string; note?: string }
  | { kind: "type"; target: Target; text: string; label: string }
  | { kind: "waitIdle"; target: Target; label: string }
  // A workflow must observe its own result before it can continue toward an approval. This prevents a failed search from
  // looking like a completed agent run merely because the loading spinner disappeared.
  | { kind: "verify"; target: Target; label: string; optional?: boolean }
  | { kind: "ask"; question: string; accountId?: string; label: string }
  | { kind: "approveUpdate"; accountId: string; accountName: string; subject: string; label: string };

export interface AgentPlan {
  // Set when a run starts; matches a chat card to its run, also after a page reload restores both.
  key?: string;
  title: string;
  intent: "workflow" | "locate" | "question";
  steps: AgentStep[];
  // Shown in the chat before the cursor starts, e.g. where disputed invoices live.
  reply?: string;
  // The companies the command named, for the "Recently queried" list.
  accounts: { id: string; name: string }[];
}

export interface Directory {
  accounts: { id: string; name: string; aliases?: string[]; hasHistory: boolean }[];
  invoices: { id: string; accountId: string; status: "paid" | "overdue" | "disputed"; amountSgd: number }[];
  meddpiccGaps: Record<string, string[]>;
}

export const BILL_ID = /SGT-INV-\d{4}-\d{4}/i;
export const agentTarget = (id: string): Target => ({ css: `[data-agent="${id}"]` });
const navLink = (href: string): Target => ({ css: `nav a[href="${href}"]` });
const link = (href: string): Target => ({ css: `main a[href="${href}"]` });
const tab = (label: string): Target => ({ css: '[role="tab"]', text: label });

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").split(/\s+/).filter(Boolean);

// Matches full names, explicit aliases, and a name's distinctive first word ("LionRock", "Meridian", "Tata").
export function findAccounts(command: string, dir: Directory): Directory["accounts"] {
  const text = ` ${words(command).join(" ")} `;
  return dir.accounts.filter((a) => {
    const names = [a.name, ...(a.aliases ?? [])].map((n) => words(n).join(" "));
    const first = words(a.name)[0];
    return names.some((n) => text.includes(` ${n} `)) || (first && first.length >= 4 && text.includes(` ${first} `));
  });
}

const fmtSgd = (n: number) => `SGD ${n.toLocaleString("en-SG")}`;

// Disputed before overdue, largest first: the bill most likely to cost the renewal leads.
export const openInvoices = (dir: Directory) =>
  dir.invoices.filter((i) => i.status !== "paid").sort((a, b) => Number(b.status === "disputed") - Number(a.status === "disputed") || b.amountSgd - a.amountSgd);

function openAccount(a: { id: string; name: string }): AgentStep[] {
  return [
    { kind: "say", text: `Opening ${a.name}` },
    { kind: "go", href: `/accounts/${a.id}`, via: [navLink("/accounts"), link(`/accounts/${a.id}`)], label: `Open ${a.name}` },
  ];
}

function checkMeddpicc(a: { id: string; name: string }, dir: Directory): AgentStep[] {
  const gaps = dir.meddpiccGaps[a.id];
  const note = gaps?.length ? `Gaps: ${gaps.join(", ")}` : "No MEDDPICC record for this account yet.";
  return [{ kind: "highlight", target: agentTarget("meddpicc"), label: "Check MEDDPICC gaps", note }];
}

function draftProposal(a: { id: string; name: string }): AgentStep[] {
  return [
    { kind: "go", href: `/proposals/${a.id}`, via: [navLink("/proposals"), link(`/proposals/${a.id}`)], label: "Open the proposal builder" },
    { kind: "highlight", target: agentTarget("proposal-lines"), label: "Catalogue line items and pricing" },
    { kind: "click", target: { css: "button", text: "Draft narrative" }, label: "Draft the cited narrative", optional: true },
    { kind: "waitIdle", target: agentTarget("why-bundle"), label: "Writing the narrative from account records" },
    { kind: "highlight", target: agentTarget("why-bundle"), label: "Draft ready for your review", note: "Review, then Submit for approval. Nothing is sent to the customer." },
  ];
}

function checkInvoice(billId: string, a: { id: string; name: string }): AgentStep[] {
  return [
    ...openAccount(a),
    { kind: "click", target: tab("Billing"), label: "Open the Billing tab", optional: true },
    { kind: "highlight", target: { css: "tr, li", text: billId }, label: `Find ${billId}` },
    { kind: "type", target: { css: '[data-agent="ask-panel"] input' }, text: `What is the status of ${billId} and the next step?`, label: "Ask the account assistant" },
    { kind: "click", target: { css: '[data-agent="ask-panel"] button', text: "Ask" }, label: "Run the GPU search" },
    { kind: "waitIdle", target: agentTarget("ask-panel"), label: "Reading invoice, minutes and playbook" },
    { kind: "verify", target: { css: '[data-agent="ask-panel"] [data-agent-answer]' }, label: "Verify the cited answer" },
    { kind: "highlight", target: agentTarget("ask-panel"), label: "Root cause and next actions, with sources" },
  ];
}

// Where things live in SingTech, for "where do I find ..." questions.
const PLACES: { match: RegExp; title: string; reply: string; steps: AgentStep[] }[] = [
  {
    match: /renewal/,
    title: "Renewals",
    reply: "Renewals are on the Overview, with contracts in the 12 to 18 month pre-renewal window flagged. Each account record also shows its contract end date.",
    steps: [{ kind: "go", href: "/dashboard", via: [navLink("/dashboard")], label: "Open the Overview" }, { kind: "highlight", target: agentTarget("renewals"), label: "Renewals panel" }],
  },
  {
    match: /prospect|lead|new compan|hunt/,
    title: "Prospects",
    reply: "Prospects are under Accounts, Prospects, with the live triggers that put them there. Add one with New, Prospect.",
    steps: [{ kind: "go", href: "/accounts/prospects", via: [navLink("/accounts/prospects")], label: "Open Prospects" }],
  },
  {
    match: /proposal|quote|pricing|deal desk/,
    title: "Proposals",
    reply: "Proposals live in the deal desk. Each builder has catalogue lines, term, discount and the approval state.",
    steps: [{ kind: "go", href: "/proposals", via: [navLink("/proposals")], label: "Open the deal desk" }],
  },
  {
    match: /news|signal|trigger|tender/,
    title: "News and triggers",
    reply: "Live triggers run in the bar under the search box and on the Overview. Click any headline for its cited brief.",
    steps: [{ kind: "highlight", target: agentTarget("news-ticker"), label: "Live news bar" }],
  },
  {
    match: /map|coverage|site|on.?net|fib(re|er)|feasib/,
    title: "Coverage and feasibility",
    reply: "Fibre and 5G feasibility per site is on each account record; the coverage map is under Insights.",
    steps: [{ kind: "go", href: "/insights/map", via: [navLink("/insights/map")], label: "Open the coverage map" }],
  },
  {
    match: /activity|audit|push(ed|es)|sync/,
    title: "Activity",
    reply: "Every Salesforce push and dispatch this session is under Activity, with the redacted payload.",
    steps: [{ kind: "go", href: "/activity", via: [navLink("/activity")], label: "Open Activity" }],
  },
  {
    match: /deal room|chatter/,
    title: "Live deal room",
    reply: "The Live Deal Room in the sidebar opens the Salesforce Chatter group. SingTech AI answers questions there under its own Salesforce user.",
    steps: [{ kind: "highlight", target: navLink("/deal-room"), label: "Live Deal Room" }],
  },
];

function locate(command: string, dir: Directory): AgentPlan | undefined {
  const c = command.toLowerCase();
  if (/invoice|bill|dispute|overdue|billing/.test(c)) {
    const open = openInvoices(dir);
    const first = open[0];
    const account = first && dir.accounts.find((a) => a.id === first.accountId);
    const list = open.slice(0, 3).map((i) => `${i.id} (${dir.accounts.find((a) => a.id === i.accountId)?.name ?? i.accountId}, ${fmtSgd(i.amountSgd)}, ${i.status})`);
    return {
      title: "Disputed and overdue invoices",
      intent: "locate",
      reply: `Disputed and overdue invoices are on each account's Billing tab, and the sidebar lists them under Flagged bill IDs.${list.length ? ` Open now: ${list.join("; ")}.` : ""}`,
      steps: account
        ? [...openAccount(account), { kind: "click", target: tab("Billing"), label: "Open the Billing tab", optional: true }, { kind: "highlight", target: { css: "tr, li", text: first.id }, label: `${first.id} is ${first.status}` }]
        : [],
      accounts: account ? [{ id: account.id, name: account.name }] : [],
    };
  }
  if (/meddpicc|qualif/.test(c)) {
    const a = findAccounts(command, dir)[0] ?? dir.accounts.find((x) => x.hasHistory && dir.meddpiccGaps[x.id]?.length);
    if (!a) return undefined;
    return { title: "MEDDPICC", intent: "locate", reply: "MEDDPICC sits on each customer record, scored out of 16 with the gaps named.", steps: [...openAccount(a), ...checkMeddpicc(a, dir)], accounts: [{ id: a.id, name: a.name }] };
  }
  const place = PLACES.find((p) => p.match.test(c));
  return place && { title: place.title, intent: "locate", reply: place.reply, steps: place.steps, accounts: [] };
}

export function planCommand(command: string, dir: Directory): AgentPlan {
  const c = command.toLowerCase();
  const accounts = findAccounts(command, dir);
  const billId = command.match(BILL_ID)?.[0].toUpperCase();
  const invoice = billId ? dir.invoices.find((i) => i.id === billId) : undefined;
  const invoiceAccount = invoice && dir.accounts.find((a) => a.id === invoice.accountId);
  const named = accounts.map((a) => ({ id: a.id, name: a.name }));

  if (/^\s*(where|how do i find|how can i find|show me where)\b/.test(c)) {
    const found = locate(command, dir);
    if (found) return found;
  }

  const wantsPush = /\b(push|sync|update|log)\b.*\bsalesforce\b|\bsalesforce\b.*\b(push|update|sync)\b|\bcrm\b/.test(c);
  const steps: AgentStep[] = [];
  let title = "";

  const wantsCheck = /\b(check|open|show|review|look ?up|investigate|pull up)\b/.test(c);
  if (billId && invoiceAccount && (wantsCheck || wantsPush)) {
    steps.push(...checkInvoice(billId, invoiceAccount));
    title = `Check ${billId}`;
    if (wantsPush) {
      steps.push({ kind: "approveUpdate", accountId: invoiceAccount.id, accountName: invoiceAccount.name, subject: `Billing follow-up: ${billId}`, label: "Prepare the Salesforce update for your approval" });
      title += " and update Salesforce";
    }
    return { title, intent: "workflow", steps, accounts: [{ id: invoiceAccount.id, name: invoiceAccount.name }] };
  }

  const account = accounts[0];
  const wantsOpen = /\b(open|go to|show|pull up|take me)\b/.test(c);
  const wantsMeddpicc = /meddpicc|gap|qualif/.test(c);
  const wantsProposal = /proposal|quote|draft/.test(c);
  if (account && (wantsOpen || wantsMeddpicc || wantsProposal || wantsPush)) {
    const hasRecordStep = wantsOpen || wantsMeddpicc || wantsPush;
    if (hasRecordStep) steps.push(...openAccount(account));
    if (wantsMeddpicc) steps.push(...checkMeddpicc(account, dir));
    if (wantsProposal) steps.push(...draftProposal(account));
    if (wantsPush) steps.push({ kind: "approveUpdate", accountId: account.id, accountName: account.name, subject: `Account update: ${account.name}`, label: "Prepare the Salesforce update for your approval" });
    title = [hasRecordStep && `Open ${account.name}`, wantsMeddpicc && "check MEDDPICC gaps", wantsProposal && "draft a proposal", wantsPush && "update Salesforce"].filter(Boolean).join(", ");
    return { title: title.charAt(0).toUpperCase() + title.slice(1), intent: "workflow", steps, accounts: named };
  }

  // Anything else is a question for the records.
  return { title: "Answer from records", intent: "question", steps: [{ kind: "ask", question: command.trim(), accountId: account?.id ?? invoiceAccount?.id, label: "Search records" }], accounts: named };
}

// The scripted showcase behind the "True Agentic Workflow" button: research, qualify, price, then a supervised CRM update.
export function showcasePlan(dir: Directory): AgentPlan {
  const lionrock = dir.accounts.find((a) => a.id === "acct-lionrock-sg") ?? dir.accounts[0];
  const disputed = openInvoices(dir).find((i) => i.status === "disputed");
  const meridian = disputed && dir.accounts.find((a) => a.id === disputed.accountId);
  const steps: AgentStep[] = [...openAccount(lionrock), ...checkMeddpicc(lionrock, dir), ...draftProposal(lionrock)];
  if (disputed && meridian) {
    steps.push(...checkInvoice(disputed.id, meridian), {
      kind: "approveUpdate",
      accountId: meridian.id,
      accountName: meridian.name,
      subject: `Billing follow-up: ${disputed.id}`,
      label: "Prepare the Salesforce update for your approval",
    });
  }
  return {
    title: "True Agentic Workflow",
    intent: "workflow",
    reply: `Qualify ${lionrock.name}, draft its proposal, then resolve ${disputed?.id ?? "the open invoice"} and prepare a Salesforce update. You approve the write.`,
    steps,
    accounts: [lionrock, ...(meridian ? [meridian] : [])].map((a) => ({ id: a.id, name: a.name })),
  };
}
