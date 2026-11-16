"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { X } from "lucide-react";
import type { RepInteraction, RepInteractionInput } from "@/lib/timeline";
import { UPLOAD_ACCEPT } from "@/lib/upload";

export type SourceMode = "email" | "screenshot" | "notes" | "file";

const HEADINGS: Record<SourceMode, { title: string; hint: string; footer: string }> = {
  email: { title: "Add an email to this account", hint: "Paste the conversation so it stays with the customer history.", footer: "Saved on the SingTech server and searchable by the AI for this account." },
  screenshot: { title: "Add a screenshot to this account", hint: "The text in the image is read on Singtel's own GPU and saved with the entry.", footer: "Personal data is redacted from the extracted text before it is saved." },
  notes: { title: "Paste a customer source", hint: "Add meeting notes, call notes, messages or an account note by hand.", footer: "Added to the timeline and to AI search for this account." },
  file: { title: "Import a file", hint: "Email (.eml), WhatsApp export (.txt), Telegram export (.json), PDF, Excel or CSV.", footer: "Personal data is redacted from the extracted text before it is saved." },
};

const NOTE_TYPES = [
  { value: "Meeting", label: "Meeting notes" },
  { value: "Phone call", label: "Call notes" },
  { value: "WhatsApp", label: "Message thread" },
  { value: "Notes", label: "Account note" },
  { value: "Document", label: "Other document" },
] as const;

interface Extracted {
  name: string;
  kind: string;
  text: string;
}

async function extract(file: File): Promise<Extracted> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/ai/extract", { method: "POST", body, signal: AbortSignal.timeout(100_000) });
  const data = (await res.json().catch(() => ({}))) as Partial<Extracted> & { error?: string };
  if (!res.ok || !data.text) throw new Error(data.error ?? "The file could not be read.");
  return data as Extracted;
}

const channelForFile = (x: Extracted): RepInteractionInput["channel"] => (x.kind === "email" ? "Email" : x.kind === "chat" ? (x.name.toLowerCase().endsWith(".json") ? "Telegram" : "WhatsApp") : "Document");

// One form for the four ways a rep adds a source; screenshots and files are read by /api/ai/extract first.
export function AddSource({ mode, accountId, today, onSaved, onClose }: { mode: SourceMode; accountId: string; today: string; onSaved: (r: RepInteraction) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]["value"]>("Meeting");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsFile = mode === "screenshot" || mode === "file";
  const head = HEADINGS[mode];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let entry: RepInteractionInput;
      if (needsFile) {
        if (!file) throw new Error("Choose a file first.");
        const x = await extract(file);
        entry = { accountId, channel: mode === "screenshot" ? "Screenshot" : channelForFile(x), title: title.trim() || x.name, date, participants: from.trim() || undefined, content: x.text.slice(0, 50_000) };
      } else {
        entry = { accountId, channel: mode === "email" ? "Email" : noteType, title: title.trim(), date, participants: from.trim() || undefined, summary: summary.trim() || undefined, content: content.trim() };
      }
      const res = await fetch("/api/copilot/interactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry) });
      const data = (await res.json().catch(() => ({}))) as { interaction?: RepInteraction; error?: string };
      if (!res.ok || !data.interaction) throw new Error(data.error ?? "The entry could not be saved.");
      onSaved(data.interaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The entry could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="st-card space-y-3 p-4" aria-label={head.title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-primary">{head.title}</p>
          <p className="text-[12px] text-secondary">{head.hint}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-secondary hover:bg-st-hover">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput label={mode === "email" ? "Subject" : "Title"} value={title} onChange={(v) => setTitle(v.slice(0, 180))} {...(needsFile ? { isOptional: true } : { isRequired: true })} />
        {mode === "notes" ? (
          <Selector label="Source type" options={[...NOTE_TYPES]} value={noteType} onChange={(v) => setNoteType(v as typeof noteType)} />
        ) : (
          <TextInput label={mode === "email" ? "From" : mode === "screenshot" ? "Supplied by" : "Participants"} value={from} onChange={(v) => setFrom(v.slice(0, 180))} isOptional />
        )}
        <DateInput label="Date" value={date as never} onChange={(v) => setDate((v as string | undefined) ?? today)} isRequired />
      </div>
      {mode === "notes" && <TextInput label="Participants" value={from} onChange={(v) => setFrom(v.slice(0, 180))} isOptional />}
      {mode === "email" && <TextInput label="Summary or note" value={summary} onChange={(v) => setSummary(v.slice(0, 1000))} isOptional />}
      {needsFile ? (
        <FileInput label={mode === "screenshot" ? "Screenshot" : "File"} value={file} onChange={(f) => setFile(Array.isArray(f) ? (f[0] ?? null) : f)} accept={mode === "screenshot" ? "image/png,image/jpeg,image/webp" : UPLOAD_ACCEPT} maxSize={8 * 1024 * 1024} isRequired />
      ) : (
        <TextArea label={mode === "email" ? "Email conversation" : "Source text"} value={content} onChange={setContent} rows={7} maxLength={50_000} isRequired />
      )}
      {error && (
        <p role="alert" className="text-[13px] text-st-red-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-st-line pt-3">
        <span className="text-[12px] text-secondary">{head.footer}</span>
        <Button type="submit" variant="primary" size="sm" isLoading={busy} label={needsFile ? (busy ? "Reading the file" : "Read and save") : "Save to timeline"} />
      </div>
    </form>
  );
}
