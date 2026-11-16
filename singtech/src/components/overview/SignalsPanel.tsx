"use client";

import { Skeleton } from "@astryxdesign/core/Skeleton";
import { ArrowUpRight } from "lucide-react";
import { getProduct } from "@/lib/data-service";
import type { Signal } from "@/lib/signals/types";
import { useAppStore } from "@/state/app-store";
import { CompanyLogo } from "../ui/CompanyLogo";
import { formatDate } from "../ui/dates";
import { Panel } from "../ui/Panel";

const KIND_LABEL: Record<Signal["kind"], string> = { "singtel-news": "Singtel news", "prospect-trigger": "Prospect trigger", tender: "Tender" };

export function SignalRow({ s }: { s: Signal }) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      {s.matchedCompany ? <CompanyLogo name={s.matchedCompany} size={24} /> : <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-st-red" />}
      <div className="min-w-0 flex-1">
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[13px] font-medium text-primary hover:underline">
          {s.title}
          <ArrowUpRight aria-hidden className="ml-0.5 inline size-3" />
        </a>
        <p className="mt-0.5 truncate text-[12px] text-secondary">
          {s.source}
          {s.publishedAt ? `, ${formatDate(s.publishedAt)}` : ""}
          {`, ${KIND_LABEL[s.kind]}`}
          {s.products.length > 0 && `, fits ${s.products.map((p) => getProduct(p)?.shortName ?? p).join(", ")}`}
        </p>
      </div>
      <span className="tabular shrink-0 text-[12px] font-semibold text-primary" title="Signal score out of 100">
        {s.score}
      </span>
    </li>
  );
}

// News and tenders from the shared feed, each with the URL it came from. The route falls back to a verified snapshot when feeds fail.
export function SignalsPanel({ limit = 6, className = "", title = "Latest signals", filter, empty = "No signal found." }: { limit?: number; className?: string; title?: string; filter?: (s: Signal) => boolean; empty?: string }) {
  const { feed } = useAppStore();
  const list = (filter ? feed.signals.filter(filter) : feed.signals).slice(0, limit);
  return (
    <Panel
      title={title}
      className={className}
      bodyClassName="p-0"
      action={feed.fetchedAt && <span className="text-[12px] text-secondary">{feed.live ? "Live feeds" : "Verified snapshot"}, updated {formatDate(feed.fetchedAt)}</span>}
    >
      {feed.status === "loading" && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={36} />
          ))}
        </div>
      )}
      {feed.status === "error" && <p className="p-4 text-[13px] text-secondary">No signal found. The news feeds did not respond; the next refresh runs in about a minute.</p>}
      {feed.status === "ready" && (
        <ul className="divide-y divide-st-line">
          {list.map((s) => (
            <SignalRow key={s.id} s={s} />
          ))}
          {list.length === 0 && <li className="p-4 text-[13px] text-secondary">{empty}</li>}
        </ul>
      )}
    </Panel>
  );
}
