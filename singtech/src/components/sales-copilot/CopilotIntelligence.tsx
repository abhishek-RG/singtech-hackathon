"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Mic, Square } from "lucide-react";
import { BAND_LABEL, healthFor } from "@/lib/health";
import type { AccountHistory } from "@/lib/history";
import type { RepInteraction } from "@/lib/timeline";
import { recordHref } from "../account/records";
import { BAND_TONE } from "../account/HealthPanel";
import { RagProgress, RagResultView } from "../copilot/RagAnswer";
import { useRag } from "../copilot/useRag";
import { StatusWord } from "../ui/Panel";

// The browser's speech recognition is not in TypeScript's DOM types; this is the part used here.
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;
const recognitionCtor = () => (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

const SUGGESTIONS = ["What has the customer raised in the last 90 days?", "Summarise every email and call about billing.", "What should I bring to the next meeting?", "Which competitor is in play, and how do we answer them?"];

function HealthSummary({ accountId, history }: { accountId: string; history: AccountHistory }) {
  const x = healthFor(history);
  return (
    <section aria-label="Account health" className="st-card flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[12px] text-secondary">Account health</p>
          <p className="tabular text-[26px] leading-none font-bold text-primary">{x.score}</p>
        </div>
        <div className="min-w-0">
          <StatusWord tone={BAND_TONE[x.band]}>{BAND_LABEL[x.band]}</StatusWord>
          <p className="mt-1 text-[14px] font-semibold text-primary">{x.action.label}</p>
          <p className="text-[12px] text-secondary">{x.action.talkingPoints[0]}</p>
        </div>
      </div>
      <Link href={recordHref(accountId)} className="text-[13px] font-medium text-primary underline">
        Open the account record
      </Link>
    </section>
  );
}

export function CopilotIntelligence({ accountId, name, history, eventCount, docCount, today, onAdded }: { accountId: string; name: string; history?: AccountHistory; eventCount: number; docCount: number; today: string; onAdded: (r: RepInteraction) => void }) {
  const { state, ask, cancel } = useRag(`copilot-${accountId}`.slice(0, 64));
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState("");
  const [saving, setSaving] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      recognition.current?.stop();
    },
    [],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim().length >= 2) void ask(question.trim(), accountId);
  };

  // Live assist: after a pause in speech, the last few sentences become a question about this account.
  function startMic() {
    const Ctor = recognitionCtor();
    if (!Ctor) return setMicError("Live transcription is not available in this browser. Try Chrome or Edge on a desktop.");
    setMicError("");
    finalText.current = "";
    setTranscript("");
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-SG";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const text = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) finalText.current = `${finalText.current} ${text}`.trim();
        else live += `${text} `;
      }
      setTranscript(finalText.current);
      setInterim(live.trim());
      if (finalText.current.length > 15) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void ask(`On a call with ${name}, the customer said: "${finalText.current.slice(-500)}". What should I say next, using the account records?`, accountId), 1400);
      }
    };
    r.onerror = (e) => e.error !== "no-speech" && setMicError(`Transcription stopped: ${e.error}.`);
    r.onend = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  }

  function stopMic() {
    window.clearTimeout(timer.current);
    recognition.current?.stop();
    recognition.current = null;
    setListening(false);
    setInterim("");
  }

  async function saveTranscript() {
    setSaving(true);
    setMicError("");
    try {
      const res = await fetch("/api/copilot/interactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId, channel: "Transcript", title: `Call transcript, ${today}`, date: today, content: finalText.current.slice(0, 50_000) }) });
      const data = (await res.json().catch(() => ({}))) as { interaction?: RepInteraction; error?: string };
      if (!res.ok || !data.interaction) throw new Error(data.error ?? "The transcript could not be saved.");
      onAdded(data.interaction);
      finalText.current = "";
      setTranscript("");
    } catch (err) {
      setMicError(err instanceof Error ? err.message : "The transcript could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold text-st-red-ink">Account intelligence</p>
        <h2 className="text-[20px] font-bold text-primary">Ask this account</h2>
        <p className="text-[13px] text-secondary">Search the customer history and Singtel material for a cited answer.</p>
      </div>

      {history && <HealthSummary accountId={accountId} history={history} />}

      <section aria-label="Live microphone assist" className="st-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-primary">Live microphone assist</p>
            <p className="text-[12px] text-secondary">Speak through your computer microphone to get suggestions from the transcript.</p>
          </div>
          <Button size="sm" variant={listening ? "primary" : "secondary"} label={listening ? "Stop listening" : "Start microphone"} icon={listening ? <Square aria-hidden className="size-4" /> : <Mic aria-hidden className="size-4" />} onClick={listening ? stopMic : startMic} />
        </div>
        <p className="text-[12px] text-secondary">Uses the browser&apos;s speech recognition, which may send audio to the browser provider. Demo with non-sensitive audio.</p>
        {(transcript || interim) && (
          <p aria-live="polite" className="rounded-lg border border-st-line bg-[#f8fafc] p-3 text-[13px] text-primary">
            {transcript} <span className="text-secondary">{interim}</span>
          </p>
        )}
        {transcript && !listening && <Button size="sm" variant="ghost" label={saving ? "Saving transcript" : "Save transcript to timeline"} isLoading={saving} onClick={() => void saveTranscript()} />}
        {micError && (
          <p role="alert" className="text-[13px] text-st-red-ink">
            {micError}
          </p>
        )}
      </section>

      <form onSubmit={submit} className="st-card space-y-3 p-4" data-agent="copilot-ask">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextInput label="Question or sales situation" value={question} onChange={(v) => setQuestion(v.slice(0, 1000))} placeholder="For example: what requirements has the customer raised?" />
          </div>
          <Button type="submit" variant="primary" label="Ask" isLoading={state.status === "loading"} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => (setQuestion(s), void ask(s, accountId))} className="rounded-full border border-st-line px-2.5 py-1 text-[12px] text-primary hover:border-st-red hover:text-st-red-ink">
              {s}
            </button>
          ))}
        </div>
      </form>

      {state.status !== "idle" && (
        <section aria-label="Answer" className="st-card p-4">
          {state.status === "loading" && <RagProgress state={state} onCancel={cancel} prefix={`copilot-${accountId}`} />}
          {state.status === "done" && <RagResultView result={state.result} prefix={`copilot-${accountId}`} />}
          {state.status === "error" && (
            <p role="alert" className="text-[13px] text-st-red-ink">
              {state.message}
            </p>
          )}
        </section>
      )}

      <section className="rounded-[10px] border border-dashed border-st-line p-4 text-[13px]">
        <p className="font-semibold text-primary">Searching {name}</p>
        <p className="text-secondary">
          {eventCount} timeline entries and {docCount} documents, plus the Singtel catalogue and sales playbooks. Answers are written on Singtel&apos;s own GPU, cite their sources, and personal data is redacted before any search.
        </p>
      </section>
    </div>
  );
}
