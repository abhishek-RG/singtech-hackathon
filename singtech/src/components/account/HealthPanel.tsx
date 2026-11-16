"use client";

import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { FileText, Headset } from "lucide-react";
import { formatSgd } from "@/lib/format";
import { BAND_LABEL, SAMPLE_DATA_AS_OF, healthFor, type HealthBand } from "@/lib/health";
import type { AccountHistory } from "@/lib/history";
import { formatDate } from "../ui/dates";
import { StatusWord } from "../ui/Panel";

export const BAND_TONE: Record<HealthBand, "verified" | "warning" | "critical"> = { healthy: "verified", watch: "warning", at_risk: "critical" };

/** Which record tab holds a piece of evidence, from its ID format. */
export function evidenceTab(id: string) {
  if (id.startsWith("SGT-INV-")) return "billing";
  if (id.startsWith("INC-") || id.startsWith("CASE-")) return "service";
  if (id.startsWith("MTG-")) return "meetings";
  if (id.startsWith("CON-")) return "contacts";
  return "overview";
}

// Retention first: the score, why it is what it is (each reason links to its record), and one next best action.
export function HealthPanel({ accountId, name, history, onEvidence }: { accountId: string; name: string; history: AccountHistory; onEvidence: (id: string) => void }) {
  const x = healthFor(history);
  const ask = `${name} health is ${x.score} of 100 (${BAND_LABEL[x.band]}). Walk me through "${x.action.label}" using the account evidence, and draft the first message to the ${x.action.contact ?? "customer"}.`;
  return (
    <section aria-label="Account health and next best action" data-agent="account-health" className="st-card grid gap-0 overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="border-b border-st-line p-4 lg:border-r lg:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-secondary">Account health</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="tabular text-[34px] leading-none font-bold text-primary">{x.score}</span>
              <span className="text-[13px] text-secondary">of 100</span>
            </p>
            <div className="mt-1.5">
              <StatusWord tone={BAND_TONE[x.band]}>{BAND_LABEL[x.band]}</StatusWord>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-secondary">Revenue at stake</p>
            <p className="tabular text-[15px] font-semibold text-primary">{formatSgd(x.revenueAtStakeSgd)}</p>
            <p className="text-[11px] text-secondary">ARR weighted by band</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5" aria-label="Reasons">
          {x.reasons.map((r, i) => (
            <li key={`${r.code}-${i}`} className="flex gap-2 text-[12.5px] leading-snug">
              <span className={`tabular w-8 shrink-0 text-right font-semibold ${r.points < 0 ? "text-st-red-ink" : "text-st-verified"}`}>
                {r.points > 0 ? "+" : ""}
                {r.points}
              </span>
              <span className="min-w-0 text-primary">
                {r.label}
                {r.evidence.length > 0 && (
                  <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                    {r.evidence.map((e) => (
                      <button key={e} type="button" onClick={() => onEvidence(e)} className="font-id rounded border border-st-line bg-white px-1 text-[11px] text-secondary hover:border-st-red hover:text-st-red-ink">
                        {e}
                      </button>
                    ))}
                  </span>
                )}
              </span>
            </li>
          ))}
          {x.reasons.length === 0 && <li className="text-[12.5px] text-secondary">No risk signals in the records.</li>}
        </ul>
        <p className="mt-3 text-[11px] text-secondary">Rules-based score from sample data as of {formatDate(SAMPLE_DATA_AS_OF)}. Same records, same score.</p>
      </div>
      <div className="p-4">
        <p className="text-[12px] font-semibold text-st-red-ink">Next best action</p>
        <h2 className="mt-0.5 text-[17px] leading-snug font-semibold text-primary">{x.action.label}</h2>
        {x.action.contact && <p className="text-[12px] text-secondary">Start with the {x.action.contact}</p>}
        <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-secondary" aria-label="Why this action">
          {x.action.path.map((p) => (
            <li key={p.question}>
              {p.question} <span className="font-medium text-primary">{p.answer}</span>
            </li>
          ))}
        </ol>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-primary">
          {x.action.talkingPoints.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" label="Prepare the conversation" icon={<Headset aria-hidden className="size-4" />} href={`/copilot?account=${accountId}`} as={Link} />
          <Button size="sm" label="Ask the AI to plan it" href={`/ai?ask=${encodeURIComponent(ask.slice(0, 300))}`} as={Link} />
          <Button size="sm" variant="ghost" label="Build proposal" icon={<FileText aria-hidden className="size-4" />} href={`/proposals/${accountId}`} as={Link} />
        </div>
      </div>
    </section>
  );
}
