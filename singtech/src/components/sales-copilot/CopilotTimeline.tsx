"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowUpRight, FileText, ImageUp, Mail, NotebookPen, Upload } from "lucide-react";
import type { CopilotDocument, RepInteraction, TimelineEvent } from "@/lib/timeline";
import { formatDate } from "../ui/dates";
import { AddSource, type SourceMode } from "./AddSource";
import { ChannelMark, channelLabel } from "./channels";

const ORIGIN: Record<TimelineEvent["origin"], string> = { record: "Sample data", sample: "Sample data", rep: "Added by you", news: "Public source" };
const matches = (needle: string, ...parts: (string | undefined)[]) => !needle || parts.join(" ").toLowerCase().includes(needle);

function EventRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="grid grid-cols-[64px_42px_minmax(0,1fr)] sm:grid-cols-[88px_42px_minmax(0,1fr)]">
      <time dateTime={event.date} className="tabular pt-2 pr-1 text-right text-[12px] whitespace-nowrap text-secondary">
        {event.date ? formatDate(event.date) : "Undated"}
      </time>
      <div className="relative flex justify-center">
        <ChannelMark channel={event.channel} />
        {!isLast && <span aria-hidden className="absolute top-10 bottom-0 w-0.5 bg-st-line" />}
      </div>
      <div className="mb-4 ml-2 min-w-0 rounded-[10px] border border-st-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-secondary">
          <span>{channelLabel(event.channel)}</span>
          <span aria-hidden className="h-3 w-px bg-st-line" />
          <span>{event.sourceType}</span>
        </div>
        <h3 className="mt-1.5 text-[14px] font-semibold text-primary">{event.title}</h3>
        <p className="mt-1 text-[13px] text-secondary">{event.summary}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[11px] text-[#344054]">
                {t}
              </span>
            ))}
          </div>
          {event.url ? (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary underline">
              {event.sourceType} <ArrowUpRight aria-hidden className="size-3" />
            </a>
          ) : (
            <span className="text-[11px] text-secondary">{ORIGIN[event.origin]}</span>
          )}
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-3 text-[12px] font-semibold text-st-red-ink hover:underline">
          {open ? "Hide source" : "Open source"}
        </button>
        {open && (
          <dl className="mt-3 grid gap-2 rounded-lg border border-st-line bg-[#f8fafc] p-3 text-[12.5px]">
            <div>
              <dt className="font-semibold text-primary">Participants</dt>
              <dd className="text-secondary">{event.participants ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-primary">Original source</dt>
              <dd>
                <pre className="mt-1 max-h-72 overflow-auto font-sans text-[12.5px] whitespace-pre-wrap text-primary">{event.content}</pre>
              </dd>
            </div>
          </dl>
        )}
      </div>
    </article>
  );
}

function DocumentRow({ doc }: { doc: CopilotDocument }) {
  return (
    <article className="flex gap-3 border-b border-st-line py-3 last:border-b-0">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-st-red-fill text-st-red-ink">
        <FileText className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11.5px] text-secondary">
          {doc.type}
          {doc.date ? `, ${formatDate(doc.date)}` : ""}
        </p>
        <h3 className="text-[14px] font-semibold text-primary">{doc.title}</h3>
        <p className="mt-0.5 line-clamp-3 text-[13px] whitespace-pre-line text-secondary">{doc.content}</p>
        {doc.url ? (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-medium text-primary underline">
            Source: {doc.source} <ArrowUpRight aria-hidden className="size-3" />
          </a>
        ) : (
          <p className="mt-1 text-[12px] text-secondary">Source: {doc.source}</p>
        )}
      </div>
    </article>
  );
}

const ADD: { mode: SourceMode; label: string; icon: typeof Mail }[] = [
  { mode: "email", label: "Add email", icon: Mail },
  { mode: "screenshot", label: "Upload screenshot", icon: ImageUp },
  { mode: "notes", label: "Paste notes", icon: NotebookPen },
  { mode: "file", label: "Import file", icon: Upload },
];

export function CopilotTimeline({ accountId, events, documents, today, onAdded }: { accountId: string; events: TimelineEvent[]; documents: CopilotDocument[]; today: string; onAdded: (r: RepInteraction) => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("interactions");
  const [adding, setAdding] = useState<SourceMode | null>(null);
  const needle = query.trim().toLowerCase();
  const shownEvents = events.filter((e) => matches(needle, e.title, e.summary, e.content, e.channel, e.sourceType, ...e.tags));
  const shownDocs = documents.filter((d) => matches(needle, d.title, d.type, d.source, d.content));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-st-red-ink">Account history</p>
          <h2 className="text-[20px] font-bold text-primary">Timeline and documents</h2>
          <p className="text-[13px] text-secondary">Every interaction, bill, case and source document in one customer record.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="w-full sm:w-56">
            <TextInput label="Search this customer" isLabelHidden type="search" size="sm" value={query} onChange={setQuery} placeholder="Search this customer" hasClear />
          </div>
          {ADD.map((a) => (
            <Button key={a.mode} size="sm" variant={adding === a.mode ? "primary" : "secondary"} label={adding === a.mode ? "Cancel" : a.label} icon={<a.icon aria-hidden className="size-4" />} onClick={() => setAdding((m) => (m === a.mode ? null : a.mode))} />
          ))}
        </div>
      </div>

      {adding && (
        <AddSource
          key={adding}
          mode={adding}
          accountId={accountId}
          today={today}
          onClose={() => setAdding(null)}
          onSaved={(r) => {
            onAdded(r);
            setAdding(null);
            setTab("interactions");
          }}
        />
      )}

      <div className="border-b border-st-line">
        <TabList value={tab} onChange={setTab} role="tablist">
          <Tab value="interactions" label={`Interactions (${shownEvents.length})`} panelId="copilot-interactions" />
          <Tab value="documents" label={`Documents (${shownDocs.length})`} panelId="copilot-documents" />
        </TabList>
      </div>

      {tab === "interactions" ? (
        <div id="copilot-interactions" role="tabpanel" className="pt-1">
          {shownEvents.map((e, i) => (
            <EventRow key={e.id} event={e} isLast={i === shownEvents.length - 1} />
          ))}
          {shownEvents.length === 0 && <p className="py-6 text-[13px] text-secondary">No interactions match this search.</p>}
        </div>
      ) : (
        <div id="copilot-documents" role="tabpanel" className="st-card px-4">
          {shownDocs.map((d) => (
            <DocumentRow key={d.id} doc={d} />
          ))}
          {shownDocs.length === 0 && <p className="py-6 text-[13px] text-secondary">No documents match this search.</p>}
        </div>
      )}
    </div>
  );
}
