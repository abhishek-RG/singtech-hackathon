"use client";

import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { RoomMessage } from "@/lib/dealroom";
import { readSse } from "@/lib/sse";
import { AnswerBody } from "../copilot/RagAnswer";
import type { RagCitation } from "../copilot/useRag";
import { BrandLockup } from "@/components/ui/BrandLockup";

const POLL_MS = 3_000;
const HEADINGS = new Set(["Root Cause", "Answer", "Next Actions", "Sources"]);

// SingTech AI replies arrive from Chatter as plain lines; headings and "- " items get their structure back.
function BotText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-[14px] leading-relaxed text-primary">
      {text.split("\n").map((line, i) =>
        HEADINGS.has(line.trim()) ? (
          <p key={i} className="pt-1 font-semibold first:pt-0">
            {line.trim()}
          </p>
        ) : line.startsWith("- ") ? (
          <p key={i} className="pl-3 break-words">
            {line.slice(2)}
          </p>
        ) : line.trim() ? (
          <p key={i} className="break-words">
            {line}
          </p>
        ) : null,
      )}
    </div>
  );
}

function Message({ m }: { m: RoomMessage }) {
  return (
    <li className={`rounded-lg border p-3 ${m.isBot ? "border-st-red-line bg-white shadow-[inset_3px_0_0_#e60012]" : "border-st-line bg-white"}`}>
      <div className="mb-1 flex justify-between gap-3 text-[12px] text-secondary">
        <span className="font-semibold text-primary">{m.author}</span>
        {m.createdAt && <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}</time>}
      </div>
      {m.isBot ? <BotText text={m.text} /> : <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-primary">{m.text}</p>}
    </li>
  );
}

// Public, login-free view of the Salesforce Chatter deal room. Judges post here; the bot answers in Chatter and here.
export function DealRoom() {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [live, setLive] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [streaming, setStreaming] = useState<{ question: string; answer: string; citations: RagCitation[] } | null>(null);

  const load = async () => {
    try {
      const r = (await (await fetch("/api/deal-room/feed", { cache: "no-store" })).json()) as { messages: RoomMessage[]; live: boolean };
      setMessages(r.messages);
      setLive(r.live);
    } catch {
      setLive(false);
    }
  };

  useEffect(() => {
    // Fetching on mount and on an interval is the point of this effect; setState happens after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const send = async () => {
    setSending(true);
    setError(undefined);
    try {
      const question = text;
      const res = await fetch("/api/deal-room/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, text }) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Could not post");
      setText("");
      // A question streams its answer here while the same answer is written back to Chatter.
      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        let answer = "";
        let citations: RagCitation[] = [];
        setStreaming({ question, answer, citations });
        for await (const { event, data } of readSse(res.body)) {
          const d = data as { t?: string; citations?: RagCitation[]; message?: string };
          if (event === "posted") void load();
          if (event === "restart") {
            answer = "";
            citations = [];
          }
          if (event === "meta") citations = d.citations ?? [];
          if (event === "token") answer += d.t ?? "";
          if (event === "error") setError(d.message);
          setStreaming({ question, answer, citations });
        }
      }
      await load();
      setStreaming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post");
    } finally {
      setSending(false);
      setStreaming(null);
    }
  };

  // Newest exchange first, right under the composer; each question keeps its answers directly below it.
  // While an answer streams, the just-posted question is shown with it, so the copy from the feed is skipped.
  const asking = streaming?.question.trim();
  const thread = messages.filter((m, i) => !(asking && i === 0 && m.text.includes(asking))).flatMap((m) => [m, ...m.replies]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <BrandLockup height={28} />
        <div className="min-w-0 flex-1 border-l border-st-line pl-3">
          <h1 className="text-[18px] font-semibold text-primary">Enterprise deal room</h1>
          <p className="text-[12px] text-secondary">
            <span aria-hidden className={`mr-1.5 inline-block size-1.5 rounded-full ${live ? "bg-[#059669]" : "bg-[#D97706]"}`} />
            {live ? "Live in Salesforce Chatter" : "Reconnecting to Salesforce"}
          </p>
        </div>
      </header>
      <p className="mb-4 text-[13px] text-secondary">
        Ask about an account, a prospect, a past deal, or a bill ID such as SGT-INV-2026-8841. SingTech AI answers every message here and in Salesforce Chatter, with sources. Customer records are sample data.
      </p>
      <section aria-label="Ask the deal room" className="mb-4 space-y-2 rounded-[10px] border border-st-line bg-white p-3">
        <TextInput label="Your name" value={name} onChange={setName} placeholder="Judge, team, or company" size="sm" />
        <TextArea label="Message" value={text} onChange={setText} rows={3} placeholder="@SingTech what is the status of SGT-INV-2026-8841?" />
        <div className="flex items-center gap-3">
          <Button variant="primary" label="Post to deal room" isLoading={sending} isDisabled={text.trim().length < 2} onClick={send} />
          {error && (
            <span role="alert" className="text-[12px] text-st-red-ink">
              {error}
            </span>
          )}
        </div>
      </section>
      <ol aria-live="polite" className="flex-1 space-y-2">
        {streaming && (
          <>
            <Message m={{ id: "asking", author: name || "You", text: streaming.question, createdAt: "", isBot: false, replies: [] }} />
            <li className="rounded-lg border border-st-red-line bg-white p-3 shadow-[inset_3px_0_0_#e60012]" aria-busy="true">
              <div className="mb-1 text-[12px] font-semibold text-primary">SingTech AI</div>
              {streaming.answer ? (
                <AnswerBody question={streaming.question} answer={streaming.answer} citations={streaming.citations} prefix="room-live" isStreaming />
              ) : (
                <p className="text-[13px] text-secondary">{streaming.citations.length ? `Found ${streaming.citations.length} sources. Writing the answer.` : "Searching account records."}</p>
              )}
            </li>
          </>
        )}
        {thread.length ? thread.map((m) => <Message key={m.id} m={m} />) : !streaming && <li className="text-[13px] text-secondary">No messages yet. Start the conversation.</li>}
      </ol>
    </div>
  );
}
