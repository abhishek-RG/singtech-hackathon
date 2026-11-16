"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { useToast } from "@astryxdesign/core/Toast";
import { ExternalLink, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { getCallTranscript, getCompany } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import { useAppStore } from "@/state/app-store";
import type { CrmReceipt, FarmingAccount } from "@/types/singtech";
import { receiptText } from "../outbox/receipt";
import { SectionTitle } from "../ui/Panel";

const TURNS = getCallTranscript();
const ACCOUNT = getCompany("acct-aeropulse-sg") as FarmingAccount;
const STEP_MS = 2800;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlighted({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keywords.map(escape).join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded-sm bg-[#FFFBEB] px-0.5 font-semibold text-primary">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function CallAssist() {
  const toast = useToast();
  const { addReceipt } = useAppStore();
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [receipt, setReceipt] = useState<CrmReceipt>();
  const [pushing, setPushing] = useState(false);

  const done = shown >= TURNS.length;
  const isPlaying = playing && !done;

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : STEP_MS);
    return () => clearTimeout(t);
  }, [isPlaying, shown]);

  const revealed = TURNS.slice(0, shown);
  const cards = revealed.filter((t) => t.detectedSignal).reverse();
  const reset = () => {
    setPlaying(false);
    setShown(0);
    setReceipt(undefined);
  };

  const pushProposal = async () => {
    setPushing(true);
    try {
      const b = ACCOUNT.recommendedBundle;
      const res = await fetch("/api/webhook/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: ACCOUNT.companyName,
          corridor: ACCOUNT.corridorLabel,
          bundleName: b.bundleName,
          estimatedArrSgd: b.estimatedArrSgd,
          nextAction: "Send the co-engineering proposal and architecture today, as requested in the QBR.",
          complianceFlags: ACCOUNT.complianceFlags,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as CrmReceipt;
      setReceipt(r);
      addReceipt(ACCOUNT.id, r);
      toast({ body: `Proposal ${r.ticketId}: ${receiptText(r)}.` });
    } catch {
      toast({ body: "Dispatch did not go through. Nothing was sent; try again.", type: "error" });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-st-line bg-surface p-4">
        <div>
          <h2 className="text-[16px] font-semibold text-primary">QBR replay: {ACCOUNT.companyName}</h2>
          <p className="mt-1 text-[13px] text-secondary">
            A recorded sample QBR (Sample account at {ACCOUNT.hubLabel}). Battlecards appear as expansion cues come up in the conversation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            label={isPlaying ? "Pause" : done ? "Replay" : "Play"}
            icon={isPlaying ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            onClick={() => {
              if (done) setShown(0);
              setPlaying(done || !isPlaying);
            }}
          />
          <Button
            size="sm"
            label="Next Turn"
            icon={<SkipForward aria-hidden className="size-4" />}
            isDisabled={done}
            onClick={() => setShown((n) => Math.min(n + 1, TURNS.length))}
          />
          <Button size="sm" variant="ghost" label="Reset" icon={<RotateCcw aria-hidden className="size-4" />} onClick={reset} />
        </div>
        <div className="w-full">
          <ProgressBar label="Call progress" isLabelHidden value={shown} max={TURNS.length} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-st-line bg-surface p-4" aria-live="polite">
          <SectionTitle>Transcript</SectionTitle>
          {revealed.length === 0 && <p className="text-[13px] text-secondary">Press Play or Next Turn to start the QBR.</p>}
          <ol className="divide-y divide-border">
            {revealed.map((t) => (
              <li key={t.id} className={`py-3 first:pt-0 ${t.speaker.startsWith("Singtel") ? "border-l-2 border-l-st-line pl-3" : ""}`}>
                <div className="mb-1 flex justify-between gap-2 text-[12px] text-secondary">
                  <span className="font-semibold">{t.speaker}</span>
                  <span className="tabular">{t.timestamp}</span>
                </div>
                <p className="text-[14px] text-primary">
                  <Highlighted text={t.text} keywords={t.triggerKeywords} />
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3" aria-live="polite">
          <SectionTitle>Instant co-sell battlecards</SectionTitle>
          {cards.length === 0 && (
            <p className="rounded-lg border border-st-line bg-surface p-4 text-[13px] text-secondary">
              Battlecards appear here as buying signals are detected in the conversation.
            </p>
          )}
          {cards.map((t) => {
            const s = t.detectedSignal!;
            const isFinal = t.id === TURNS.at(-1)!.id;
            return (
              <article key={t.id} className="rounded-lg border border-st-line bg-surface p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-primary">{s.badge}</span>
                  <span className="tabular text-[14px] text-primary">+{formatSgd(s.estimatedUpliftSgd)} ARR</span>
                </div>
                <p className="mb-2 text-[13px] font-semibold text-primary">{s.trigger}</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {s.recommendedProducts.map((p) => (
                    <span key={p} className="text-[12px] font-medium text-primary after:content-[',_'] last:after:content-none">
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mb-1 text-[12px] text-st-warning">{s.complianceAlert}</p>
                <p className="text-[13px] text-secondary">
                  <span className="font-semibold text-primary">Talk track: </span>
                  {s.suggestedTalkTrack}
                </p>
                {isFinal && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="primary" label="Draft proposal and save to Outbox" isLoading={pushing} onClick={pushProposal} />
                    {receipt && (
                      <Button
                        label="Open Customer Proposal"
                        icon={<ExternalLink aria-hidden className="size-4" />}
                        href={`/proposal/${ACCOUNT.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    )}
                    {receipt && (
                      <span role="status" className="text-[12px] text-secondary">
                        {receiptText(receipt)}, <span className="font-id">{receipt.ticketId}</span>
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
