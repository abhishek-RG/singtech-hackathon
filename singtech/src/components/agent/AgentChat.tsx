"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckCircle2, Circle, FileText, Image as ImageIcon, Loader2, MinusCircle, MousePointer2, Paperclip, Send, X, XCircle } from "lucide-react";
import { buildDirectory } from "@/lib/agent/directory";
import { planCommand, showcasePlan, type AgentPlan } from "@/lib/agent/plan";
import { MAX_UPLOAD_BYTES, UPLOAD_ACCEPT, type UploadKind } from "@/lib/upload";
import { RagProgress, RagResultView } from "../copilot/RagAnswer";
import { useRag } from "../copilot/useRag";
import { useAgent, type RunState } from "./AgentProvider";

interface Attachment {
  name: string;
  kind: UploadKind;
  chars: number;
  text: string;
}

export const EXAMPLES = [
  "Where do I find disputed invoices?",
  "Open LionRock Quantitative Bank, check its MEDDPICC gaps, and draft a proposal",
  "Check SGT-INV-2026-8841 and push an update to Salesforce",
  "Why is SGT-INV-2026-8841 disputed?",
];

function StepIcon({ status, isCurrent }: { status?: "done" | "skipped" | "failed"; isCurrent: boolean }) {
  if (status === "done") return <CheckCircle2 aria-label="Done" className="size-4 shrink-0 text-st-verified" />;
  if (status === "skipped") return <MinusCircle aria-label="Skipped" className="size-4 shrink-0 text-secondary" />;
  if (status === "failed") return <XCircle aria-label="Failed" className="size-4 shrink-0 text-st-red-ink" />;
  if (isCurrent) return <Loader2 aria-label="Running" className="size-4 shrink-0 animate-spin text-st-red" />;
  return <Circle aria-label="Waiting" className="size-4 shrink-0 text-[#b9bec8]" />;
}

function PlanCard({ plan, final }: { plan: AgentPlan; final?: RunState }) {
  const { runState } = useAgent();
  const live = runState && runState.plan.key === plan.key ? runState : final;
  const word = live?.state === "waiting" ? "Waiting for your approval" : live?.state === "done" ? "Done" : live?.state === "stopped" ? "Stopped" : "Running";
  return (
    <div className="rounded-[10px] border border-st-line border-l-[3px] border-l-st-red bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-primary">{plan.title}</p>
        <span className="text-[12px] whitespace-nowrap text-secondary">{word}</span>
      </div>
      {plan.reply && <p className="mt-1 text-[13px] leading-relaxed text-primary">{plan.reply}</p>}
      {plan.steps.length > 0 && (
        <ol className="mt-2 space-y-1">
          {plan.steps
            .map((s, i) => ({ s, i, label: s.kind === "say" ? s.text : s.label }))
            .filter(({ s }) => s.kind !== "say")
            .map(({ i, label }) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-primary">
                <StepIcon status={live?.log[i]?.status} isCurrent={live?.state !== "done" && live?.state !== "stopped" && live?.index === i} />
                <span>{label}</span>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}

// One chat for the floating agent and the AI Workspace page. Commands run on screen; questions stream cited answers.
export function AgentChat({ variant }: { variant: "drawer" | "page" }) {
  const agent = useAgent();
  const { run, touchRecent, takePending, pending, messages, pushMessage: push } = agent;
  const dir = useMemo(() => buildDirectory(), []);
  const { state, ask, cancel } = useRag(agent.threadId);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const [upload, setUpload] = useState<{ status: "idle" | "reading" | "error"; message?: string }>({ status: "idle" });
  const [isDragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const busy = state.status === "loading" || upload.status === "reading";

  const startPlan = useCallback(
    (input: AgentPlan) => {
      const plan = { ...input, key: `run-${Date.now().toString(36)}` };
      push({ role: "plan", plan });
      void run(plan);
    },
    [push, run],
  );

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < 2 || q.length > 1000 || state.status === "loading") return;
      setInput("");
      push({ role: "user", text: q, file: file?.name });
      const plan = planCommand(q, dir);
      plan.accounts.forEach(touchRecent);
      // With a file attached, the message is always a question about that file.
      if (!file && plan.intent !== "question") return startPlan(plan);
      const accountId = plan.steps[0]?.kind === "ask" ? plan.steps[0].accountId : undefined;
      const result = await ask(q, accountId, file ? { context: file.text, contextTitle: file.name } : {});
      if (result) push({ role: "answer", result });
    },
    [ask, dir, file, push, startPlan, state.status, touchRecent],
  );

  // A news pill or a sidebar shortcut can hand the chat a question to send as it opens.
  useEffect(() => {
    if (!pending) return;
    const q = takePending();
    // Sending a question handed over by a news pill or sidebar shortcut is this effect's whole job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q) void send(q);
  }, [pending, takePending, send]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  const read = async (f: File) => {
    if (f.size > MAX_UPLOAD_BYTES) return setUpload({ status: "error", message: "Files up to 8 MB." });
    setUpload({ status: "reading" });
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/ai/extract", { method: "POST", body, signal: AbortSignal.timeout(100_000) });
      const data = (await res.json()) as Partial<Attachment> & { error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "The file could not be read.");
      setFile({ name: data.name ?? f.name, kind: data.kind ?? "text", chars: data.chars ?? data.text.length, text: data.text });
      setUpload({ status: "idle" });
    } catch (e) {
      setUpload({ status: "error", message: e instanceof Error ? e.message : "The file could not be read." });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void read(f);
  };

  // The composer grows with its text up to about six lines, like a modern chat input.
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const isEmpty = messages.length === 0 && state.status === "idle";
  const isRunning = agent.runState?.state === "running" || agent.runState?.state === "waiting";
  return (
    <div
      className={`relative flex ${variant === "drawer" ? "h-dvh" : "h-full min-h-0"} flex-col bg-white`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#eef0f4] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-st-red text-[11px] font-bold text-white">AI</span>
          <div className="min-w-0">
            <h2 className="text-[15px] leading-tight font-semibold text-primary">SingTech AI</h2>
            <p className="truncate text-[12px] text-secondary">Answers from your accounts, billing and news, with sources</p>
          </div>
        </div>
        <Button size="sm" label="True Agentic Workflow" icon={<MousePointer2 aria-hidden className="size-4" />} onClick={() => startPlan(showcasePlan(dir))} isDisabled={isRunning} />
      </header>

      <div ref={list} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto w-full max-w-[760px] space-y-6 px-4 py-6">
          {isEmpty && (
            <div className="pt-[8vh] text-center">
              <h3 className="text-[22px] font-semibold text-primary">How can I help with your accounts today?</h3>
              <p className="mt-1 text-[13px] text-secondary">Ask a question, drop a contract, invoice, spreadsheet or chat export, or tell it what to do. You approve anything sent to Salesforce.</p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {EXAMPLES.map((q) => (
                  <button key={q} type="button" onClick={() => void send(q)} className="rounded-xl border border-[#e4e7ec] bg-white px-3.5 py-3 text-[13px] text-primary hover:border-[#c7ccd5] hover:bg-[#f9fafb]">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-[#f2f4f7] px-4 py-2.5 text-[14px] whitespace-pre-wrap text-primary">
                  {m.text}
                  {m.file && <span className="mt-1 block text-[11px] text-secondary">With {m.file}</span>}
                </div>
              </div>
            ) : m.role === "plan" ? (
              <PlanCard key={m.id} plan={m.plan} final={m.final} />
            ) : (
              <div key={m.id} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-st-red text-[10px] font-bold text-white">AI</span>
                <div className="min-w-0 flex-1">
                  <RagResultView result={m.result} prefix={`chat-${m.id}`} />
                </div>
              </div>
            ),
          )}
          {state.status === "loading" && (
            <div className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-st-red text-[10px] font-bold text-white">AI</span>
              <div className="min-w-0 flex-1">
                <RagProgress state={state} onCancel={cancel} prefix="chat-live" />
              </div>
            </div>
          )}
          {state.status === "error" && (
            <p role="alert" className="text-[13px] text-st-red-ink">
              {state.message}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-1 pb-4">
        <div className="mx-auto w-full max-w-[760px]">
          {(file || upload.status !== "idle") && (
            <div className="mb-2 flex items-center gap-2 text-[12px]">
              {upload.status === "reading" && (
                <span role="status" className="flex items-center gap-1.5 text-secondary">
                  <Loader2 aria-hidden className="size-3.5 animate-spin" /> Reading the file
                </span>
              )}
              {upload.status === "error" && (
                <span role="alert" className="text-st-red-ink">
                  {upload.message}
                </span>
              )}
              {file && upload.status === "idle" && (
                <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-st-line bg-[#f3f4f6] py-1 pr-1 pl-2.5 text-primary">
                  {file.kind === "image" ? <ImageIcon aria-hidden className="size-3.5 shrink-0" /> : <FileText aria-hidden className="size-3.5 shrink-0" />}
                  <span className="truncate">{file.name}</span>
                  <span className="tabular shrink-0 text-secondary">{file.chars.toLocaleString("en-SG")} characters read</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFile(null)} className="rounded-full p-0.5 hover:bg-[#e5e7eb]">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="flex items-end gap-1.5 rounded-2xl border border-[#d0d5dd] bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] focus-within:border-[#98a2b3]">
            <input
              ref={fileInput}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="sr-only"
              aria-label="Attach a file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void read(f);
                e.target.value = "";
              }}
            />
            <button type="button" aria-label="Attach a file" onClick={() => fileInput.current?.click()} disabled={busy} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-[#f2f4f7] disabled:opacity-50">
              <Paperclip aria-hidden className="size-[18px]" />
            </button>
            {/* Native textarea: Enter sends and Shift+Enter adds a line, which the Astryx TextArea does not offer. */}
            <textarea
              ref={box}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              aria-label="Message SingTech AI"
              placeholder={file ? `Ask about ${file.name}` : "Ask, or say what to do"}
              className="max-h-[168px] min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14px] leading-5 text-primary outline-none placeholder:text-[#98a2b3]"
            />
            <button
              type="button"
              aria-label="Send"
              onClick={() => void send(input)}
              disabled={busy || input.trim().length < 2}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-st-red text-white hover:bg-st-red-hover disabled:bg-[#f2f4f7] disabled:text-[#98a2b3]"
            >
              <Send aria-hidden className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-secondary">PDF, Excel, CSV, email (.eml), WhatsApp or Telegram exports, text or images up to 8 MB. Personal data is redacted before it reaches the assistant.</p>
        </div>
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-st-red bg-white/85 text-[14px] font-semibold text-primary">Drop to read the file</div>
      )}
    </div>
  );
}
