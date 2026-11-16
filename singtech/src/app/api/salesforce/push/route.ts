import { z } from "zod";
import { getCatalog, getCompany, getProduct } from "@/lib/data-service";
import { healthFor } from "@/lib/health";
import { getAccountHistory, OUTCOME_BUNDLES, type AccountHistory } from "@/lib/history";
import { appendRecord } from "@/lib/local-store";
import { buildAuditRecord, sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { isSalesforceConfigured, postToGroup, recordUrl, upsertAccount, upsertOpportunity } from "@/lib/salesforce";
import { HuntingLeadSchema, type Company, type ProductId } from "@/types/singtech";

const BodySchema = z.object({
  companyId: z.string().min(1).max(120),
  option: z.enum(["full", "entry"]).default("full"),
  // Prospects added in this session only exist client-side; they are re-validated against the schema.
  lead: HuntingLeadSchema.optional(),
});

const isoDate = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const clean = (s: string) => sanitizeEnterprisePayload(s).sanitizedText;

export interface PushResult {
  status: "synced" | "local";
  accountId?: string;
  opportunityId?: string;
  chatterPostId?: string;
  opportunityUrl?: string;
  error?: string;
  elapsedMs?: number;
}

// Everything the Salesforce write needs, built from a company record or, for history-only accounts, from the account history.
interface Plan {
  name: string;
  accountDescription: string;
  oppName: string;
  arr: number;
  existing: boolean;
  closeDate: string;
  nextStep: string;
  description: string;
  summary: string;
}

function fromCompany(company: Company, option: "full" | "entry"): Plan {
  const bundle = company.recommendedBundle;
  const products = option === "entry" ? bundle.starterDownsellBundle : bundle.products;
  const arr = option === "entry" ? bundle.starterArrSgd : bundle.estimatedArrSgd;
  const existing = company.mode === "farming";
  return {
    name: company.companyName,
    accountDescription: `${company.hubLabel}. ${company.industryLabel}. ${company.relationshipLabel}.`,
    oppName: `${company.companyName}: ${bundle.bundleName}${option === "entry" ? " (fast-track)" : ""}`.slice(0, 120),
    arr,
    existing,
    closeDate: isoDate(existing ? company.contractRenewalDays : 90),
    nextStep: company.nextAction,
    description: [
      `Why now: ${company.whyNow}`,
      `Products: ${products.map((id) => getProduct(id)!.name).join(", ")}`,
      // Keep Salesforce's Description useful to the rep. Full links remain in the cited in-app answer and deal room,
      // rather than turning the record into a wall of URLs.
      `Evidence: ${company.signals.slice(0, 3).map((s) => s.source.title).join("; ")}`,
      company.isDemoAccount ? "Sample account (fictional) from SingTech." : "Real company; public sources only.",
    ].join("\n"),
    summary: `Deal room: ${company.companyName} | ${bundle.bundleName}${option === "entry" ? " (fast-track entry)" : ""} | SGD ${arr.toLocaleString("en-SG")} ARR | ${existing ? "Existing customer upgrade" : "New prospect"} | Next step: ${company.nextAction}`,
  };
}

// History-only sample accounts (such as Meridian Arcwell): the first outcome bundle's missing products, sized from catalogue ARR,
// with the rules-based next best action as the next step.
function fromHistory(h: AccountHistory): Plan {
  const owned = h.profile?.ownedProducts ?? [];
  const bundle = h.productMix[0].bundle as keyof typeof OUTCOME_BUNDLES;
  const missing = (OUTCOME_BUNDLES[bundle] as readonly ProductId[]).filter((id) => !owned.includes(id));
  const products = missing.length ? missing : [...OUTCOME_BUNDLES[bundle]];
  const arr = products.reduce((s, id) => s + (getCatalog().find((p) => p.id === id)?.indicativeArrSgd ?? 0), 0);
  const health = healthFor(h);
  const nextStep = `${health.action.label}${health.action.contact ? ` with the ${health.action.contact}` : ""}.`;
  return {
    name: h.accountName,
    accountDescription: h.profile ? `${h.profile.hqLabel}. ${h.profile.industryLabel}. Existing customer.` : "Existing customer.",
    oppName: `${h.accountName}: ${bundle}`.slice(0, 120),
    arr,
    existing: true,
    closeDate: h.contractEndDate,
    nextStep,
    description: [
      `Account health ${health.score} of 100. Main reasons: ${health.reasons.filter((r) => r.points < 0).slice(0, 3).map((r) => r.label).join("; ") || "none"}.`,
      `Products: ${products.map((id) => getProduct(id)!.name).join(", ")}`,
      `Bundle fit: ${h.productMix[0].gap}`,
      "Sample account (fictional) from SingTech.",
    ].join("\n"),
    summary: `Deal room: ${h.accountName} | ${bundle} | SGD ${arr.toLocaleString("en-SG")} ARR | Existing customer upgrade | Next step: ${nextStep}`,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { companyId, option, lead } = parsed.data;
  const company: Company | undefined = getCompany(companyId) ?? (lead?.id === companyId ? lead : undefined);
  const history = company ? undefined : getAccountHistory(companyId);
  if (!company && !history) return Response.json({ error: "Unknown account" }, { status: 404 });
  const plan = company ? fromCompany(company, option) : fromHistory(history!);

  const description = clean(plan.description);
  const { record: audit } = buildAuditRecord(description, "webhook-crm");
  const summary = clean(plan.summary);

  let result: PushResult;
  if (isSalesforceConfigured()) {
    try {
      const accountId = await upsertAccount(plan.name, { Description: clean(plan.accountDescription) });
      const opportunityId = await upsertOpportunity(accountId, plan.oppName, {
        StageName: plan.existing ? "Needs Analysis" : "Prospecting",
        CloseDate: plan.closeDate,
        Amount: plan.arr,
        Type: plan.existing ? "Existing Customer - Upgrade" : "New Customer",
        NextStep: clean(plan.nextStep).slice(0, 255),
        Description: description,
      });
      const chatterPostId = await postToGroup(`${summary}\nOpportunity: ${recordUrl(opportunityId)}`);
      result = { status: "synced", accountId, opportunityId, chatterPostId, opportunityUrl: recordUrl(opportunityId), elapsedMs: Date.now() - startedAt };
    } catch (e) {
      result = { status: "local", error: e instanceof Error ? e.message.slice(0, 160) : "Salesforce error", elapsedMs: Date.now() - startedAt };
    }
  } else {
    result = { status: "local", error: "Not synced to Salesforce", elapsedMs: Date.now() - startedAt };
  }

  await appendRecord("crm.json", { at: new Date().toISOString(), companyId, option, arr: plan.arr, summary, result });
  return Response.json(
    { ...result, audit },
    { headers: { "Server-Timing": `salesforce;dur=${result.elapsedMs ?? Date.now() - startedAt}` } },
  );
}
