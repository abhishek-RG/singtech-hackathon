"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { Spinner } from "@astryxdesign/core/Spinner";
import { ArrowUpRight } from "lucide-react";
import { parseAnswer, summaryHeading } from "@/lib/answer-format";
import { sourceHref } from "@/lib/source-links";
import type { RagCitation, RagResult, RagState } from "./useRag";

const isWebSource = (s: string) => /^https:\/\//.test(s);

// "[2]" and "[1, 4]" markers become links to the numbered sources below the answer.
function AnswerText({ text, prefix }: { text: string; prefix: string }) {
  const parts = text.split(/(\[\d+(?:\s*,\s*\d+)*\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const nums = /^\[[\d,\s]+\]$/.test(part) ? part.match(/\d+/g)! : null;
        return nums ? (
          <sup key={i} className="tabular text-[11px] font-semibold">
            {nums.map((n, j) => (
              <a key={n} href={`#${prefix}-${n}`} className="text-st-red-ink underline">
                {j > 0 ? "," : ""}[{n}]
              </a>
            ))}
          </sup>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}

// Sources as compact chips: a web source opens its article; a SingTech record expands to show its passage and a link to the
// page that holds it (the invoice's billing tab, the meeting, the account), so every source is one click away.
function SourceList({ citations, prefix }: { citations: RagCitation[]; prefix: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const chip = "inline-flex max-w-[280px] items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-[12px] text-primary hover:border-[#c7ccd5]";
  const shown = open !== null ? citations[open] : undefined;
  const href = shown ? sourceHref(shown.id) : undefined;
  return (
    <>
      <ol className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => {
          const inner = (
            <>
              <span className="tabular flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-secondary">{i + 1}</span>
              <span className="truncate">{c.title}</span>
              {isWebSource(c.source) && <ArrowUpRight aria-hidden className="size-3 shrink-0" />}
            </>
          );
          return (
            <li key={`${c.id}-${i}`} id={`${prefix}-${i + 1}`}>
              {isWebSource(c.source) ? (
                <a href={c.source} target="_blank" rel="noopener noreferrer" title={c.snippet} className={`${chip} border-[#e4e7ec] bg-[#f9fafb]`}>
                  {inner}
                </a>
              ) : (
                <button type="button" aria-expanded={open === i} onClick={() => setOpen((v) => (v === i ? null : i))} className={`${chip} ${open === i ? "border-st-red bg-st-red-fill" : "border-[#e4e7ec] bg-[#f9fafb]"}`}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {shown && (
        <div className="mt-2 rounded-lg border border-st-line bg-[#f8fafc] p-3 text-[12.5px]">
          <p className="font-semibold text-primary">
            [{(open ?? 0) + 1}] {shown.title}
          </p>
          <p className="mt-1 whitespace-pre-line text-secondary">{shown.snippet || "No passage text."}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {href ? (
              <Link href={href} className="inline-flex items-center gap-0.5 font-medium text-primary underline">
                Open the record <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            ) : null}
            <span className="text-[11px] text-secondary">{shown.id === "upload" ? "From your upload." : shown.id === "notes" ? "From notes added in the Sales Copilot." : "SingTech record, sample data."}</span>
          </p>
        </div>
      )}
    </>
  );
}

const Heading = ({ children }: { children: string }) => <h4 className="mb-1 text-[13px] font-semibold text-primary">{children}</h4>;

// Root Cause (or Answer), Next Actions and Sources: the same three blocks SingTech AI posts to Chatter.
export function AnswerBody({ question, answer, citations, prefix, isStreaming = false }: { question: string; answer: string; citations: RagCitation[]; prefix: string; isStreaming?: boolean }) {
  const { summary, actions } = parseAnswer(answer);
  return (
    <div data-agent-answer="" className="space-y-3 text-[14px] leading-relaxed text-primary">
      <section>
        <Heading>{summaryHeading(question)}</Heading>
        <p>
          <AnswerText text={summary} prefix={prefix} />
          {isStreaming && actions.length === 0 && <span aria-hidden className="st-caret" />}
        </p>
      </section>
      {actions.length > 0 && (
        <section>
          <Heading>Next Actions</Heading>
          <ol className="list-decimal space-y-1 pl-5 marker:text-secondary">
            {actions.map((a, i) => (
              <li key={i}>
                <AnswerText text={a} prefix={prefix} />
                {isStreaming && i === actions.length - 1 && <span aria-hidden className="st-caret" />}
              </li>
            ))}
          </ol>
        </section>
      )}
      {citations.length > 0 ? (
        <section className="border-t border-st-line pt-3">
          <Heading>Sources</Heading>
          <SourceList citations={citations} prefix={prefix} />
        </section>
      ) : (
        !isStreaming && <p className="border-t border-st-line pt-3 text-[12px] text-secondary">No source found for this answer.</p>
      )}
    </div>
  );
}

export function RagResultView({ result, prefix }: { result: RagResult; prefix: string }) {
  return (
    <div className="space-y-3">
      <AnswerBody question={result.question} answer={result.answer} citations={result.citations} prefix={prefix} />
      <p className="tabular text-[12px] text-secondary">
        Answered in {(result.latencyMs / 1000).toFixed(1)} s{result.firstTokenMs !== undefined && result.latencyMs > 300 ? `, first words in ${(result.firstTokenMs / 1000).toFixed(1)} s` : ""}
      </p>
    </div>
  );
}

// While streaming: the answer as it is written, or a short searching line until the first words arrive.
export function RagProgress({ state, onCancel, prefix = "live" }: { state: Extract<RagState, { status: "loading" }>; onCancel: () => void; prefix?: string }) {
  if (state.answer) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <AnswerBody question={state.question} answer={state.answer} citations={state.citations} prefix={prefix} isStreaming />
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 text-[13px] text-secondary">
      <Spinner size="sm" aria-label="Searching records" />
      <span>{state.note ?? (state.citations.length ? `Found ${state.citations.length} sources. Writing the answer.` : "Searching account records, invoices and playbooks.")}</span>
      <Button size="sm" variant="ghost" label="Cancel" onClick={onCancel} />
    </div>
  );
}
