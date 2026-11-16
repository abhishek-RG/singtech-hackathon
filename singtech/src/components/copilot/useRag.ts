"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readSse } from "@/lib/sse";

export interface RagCitation {
  id: string;
  title: string;
  source: string;
  snippet: string;
  score: number;
}

export interface RagResult {
  question: string;
  answer: string;
  citations: RagCitation[];
  latencyMs: number;
  firstTokenMs?: number;
}

export type RagState =
  | { status: "idle" }
  | { status: "loading"; question: string; startedAt: number; answer: string; citations: RagCitation[]; firstTokenMs?: number; note?: string }
  | { status: "done"; result: RagResult }
  | { status: "error"; question: string; message: string };

export interface AskOptions {
  context?: string;
  contextTitle?: string;
}

// Streamed answers start in well under a second and finish in one to three; the timeout only guards a dead connection.
const TIMEOUT_MS = 45_000;

const newChatId = () => `chat-${crypto.randomUUID().slice(0, 18)}`;

// Streams /api/rag/stream: citations arrive first, then the answer word by word. One hook is one chat, so follow-ups share context.
// sessionId: a saved chat's id, so follow-ups in that chat share gateway memory; otherwise one id per hook.
export function useRag(sessionId?: string) {
  const [state, setState] = useState<RagState>({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);
  const chatId = useRef<string | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    setState({ status: "idle" });
  }, []);

  const ask = useCallback(async (question: string, accountId?: string, opts: AskOptions = {}): Promise<RagResult | undefined> => {
    const q = question.trim();
    if (q.length < 2 || q.length > 1000) {
      setState({ status: "error", question: q, message: "Ask a question between 2 and 1000 characters." });
      return undefined;
    }
    ctrl.current?.abort();
    const mine = new AbortController();
    ctrl.current = mine;
    chatId.current ??= newChatId();
    const timer = setTimeout(() => mine.abort(), TIMEOUT_MS);
    const startedAt = Date.now();
    let answer = "";
    let citations: RagCitation[] = [];
    let firstTokenMs: number | undefined;
    let note: string | undefined;
    const isMine = () => ctrl.current === mine;
    setState({ status: "loading", question: q, startedAt, answer, citations });
    try {
      const res = await fetch("/api/rag/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, accountId, sessionId: sessionId || chatId.current, ...opts }),
        signal: mine.signal,
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      for await (const { event, data } of readSse(res.body)) {
        const d = data as { citations?: RagCitation[]; t?: string; answer?: string; latencyMs?: number; message?: string; reason?: string };
        // The records could not answer; the server starts again from recent news.
        if (event === "restart") {
          answer = "";
          citations = [];
          note = d.reason;
        }
        if (event === "meta") citations = d.citations ?? [];
        if (event === "token") {
          firstTokenMs ??= Date.now() - startedAt;
          answer += d.t ?? "";
        }
        if (event === "error") throw new Error(d.message);
        if (event === "done") {
          const result: RagResult = { question: q, answer: d.answer ?? answer, citations: d.citations ?? citations, latencyMs: Date.now() - startedAt, firstTokenMs };
          if (isMine()) setState({ status: "done", result });
          return result;
        }
        if (isMine()) setState({ status: "loading", question: q, startedAt, answer, citations, firstTokenMs, note });
      }
      throw new Error("ended early");
    } catch {
      // A cancel resets to idle itself; only a real failure shows a message.
      if (isMine()) setState({ status: "error", question: q, message: "No answer came back. Check the question and try again." });
      return undefined;
    } finally {
      clearTimeout(timer);
      if (isMine()) ctrl.current = null;
    }
  }, [sessionId]);

  return { state, ask, cancel };
}
