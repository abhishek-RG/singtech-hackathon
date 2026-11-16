"use client";

import { useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import { getProduct } from "@/lib/data-service";
import { isWrappedLink } from "@/lib/signals/rss";
import type { Signal } from "@/lib/signals/types";
import { useAppStore } from "@/state/app-store";
import { useAgent } from "../agent/AgentProvider";
import { CompanyLogo } from "../ui/CompanyLogo";
import { StatusWord } from "../ui/Panel";

const MAX_PILLS = 16;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "Date not given");

function NewsBrief({ signal, onClose }: { signal: Signal | null; onClose: () => void }) {
  const { askAgent } = useAgent();
  return (
    <Dialog isOpen={Boolean(signal)} onOpenChange={(open) => !open && onClose()} width={560}>
      {signal && (
        <>
          <DialogHeader title={signal.title} subtitle={`${signal.source}, ${day(signal.publishedAt)}`} onOpenChange={(open) => !open && onClose()} />
          <div className="space-y-3 px-4 pb-4 text-[13px] text-primary">
            {signal.snippet && <p className="leading-relaxed">{signal.snippet}</p>}
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              {signal.matchedCompany && (
                <>
                  <dt className="text-secondary">Company</dt>
                  <dd className="flex items-center gap-2">
                    <CompanyLogo name={signal.matchedCompany} size={20} />
                    {signal.matchedCompany}
                  </dd>
                </>
              )}
              <dt className="text-secondary">Triggers</dt>
              <dd>{signal.triggers.join(", ") || "None"}</dd>
              <dt className="text-secondary">Fits</dt>
              <dd>{signal.products.map((p) => getProduct(p)?.shortName ?? p).join(", ") || "No catalogue match"}</dd>
              <dt className="text-secondary">Priority</dt>
              <dd>
                <StatusWord tone={signal.score >= 70 ? "critical" : "neutral"}>{`Score ${signal.score} of 100`}</StatusWord>
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" label="Open the article" icon={<ArrowUpRight aria-hidden className="size-4" />} href={signal.url} target="_blank" rel="noopener noreferrer" />
              <Button
                label="Ask SingTech AI"
                icon={<MessageSquareText aria-hidden className="size-4" />}
                onClick={() => {
                  onClose();
                  askAgent(`What does this mean for our accounts, and what should I do next: "${signal.title.slice(0, 200)}"?`);
                }}
              />
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

// Live triggers under the search bar: real articles only (each pill opens its cited brief), highest score first.
export function NewsTicker() {
  const { feed } = useAppStore();
  const [brief, setBrief] = useState<Signal | null>(null);
  const items = useMemo(() => feed.signals.filter((s) => !isWrappedLink(s.url)).sort((a, b) => b.score - a.score).slice(0, MAX_PILLS), [feed.signals]);
  if (items.length === 0) {
    // Keeps the bar's row while the first fetch runs, so the page does not jump when headlines arrive.
    return (
      <div data-agent="news-ticker" className="sticky top-0 z-20 flex h-10 items-center gap-3 border-b border-st-line bg-white px-4 text-[12px] lg:px-6">
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <span aria-hidden className="st-pulse size-1.5 rounded-full bg-st-red" />
          Live triggers
        </span>
        <span className="text-secondary">{feed.status === "loading" ? "Loading headlines" : "No signal found"}</span>
      </div>
    );
  }
  const loop = [...items, ...items];
  return (
    <div data-agent="news-ticker" data-paused={Boolean(brief)} className="st-ticker sticky top-0 z-20 flex h-10 items-center gap-3 border-b border-st-line bg-white/95 px-4 backdrop-blur lg:px-6">
      <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-primary">
        <span aria-hidden className="st-pulse size-1.5 rounded-full bg-st-red" />
        {feed.live ? "Live triggers" : "Latest triggers"}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_20px,#000_calc(100%-20px),transparent)]">
        <ul className="st-ticker-track gap-2 py-1" style={{ ["--st-ticker-duration" as string]: `${items.length * 7}s` }}>
          {loop.map((s, i) => (
            <li key={`${s.id}-${i}`} aria-hidden={i >= items.length} className="shrink-0">
              <button
                type="button"
                tabIndex={i >= items.length ? -1 : 0}
                onClick={() => setBrief(s)}
                className="flex h-7 max-w-[460px] items-center gap-2 rounded-full border border-st-line bg-white px-3 text-[12px] text-primary hover:border-[#8a8f9c]"
              >
                <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${s.score >= 70 ? "bg-st-red" : "bg-[#525866]"}`} />
                <span className="truncate font-medium">{s.title}</span>
                <span className="shrink-0 text-secondary">{s.source}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <NewsBrief signal={brief} onClose={() => setBrief(null)} />
    </div>
  );
}
