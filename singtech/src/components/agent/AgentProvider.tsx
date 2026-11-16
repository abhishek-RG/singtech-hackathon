"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { AgentPlan, AgentStep } from "@/lib/agent/plan";
import type { RagResult } from "../copilot/useRag";
import { AgentApproval, type ApprovalRequest } from "./AgentApproval";
import { AgentCursor, type CursorState, type Spot } from "./AgentCursor";
import { useRecents, type Recent } from "./recents";
import { bringIntoView, centerOf, chime, findTarget, prefersReducedMotion, sleep, typeInto, waitFor, waitForPath, waitIdle } from "./runtime";

export type StepStatus = "done" | "skipped" | "failed";
export interface RunState {
  plan: AgentPlan;
  index: number;
  state: "running" | "waiting" | "done" | "stopped" | "failed";
  log: { label: string; status: StepStatus }[];
  result?: string;
}

// Chat history lives here, not in the chat component: the drawer unmounts when it closes (it closes while a workflow runs).
export type ChatMessage =
  | { id: number; role: "user"; text: string; file?: string }
  | { id: number; role: "answer"; result: RagResult }
  | { id: number; role: "plan"; plan: AgentPlan; final?: RunState };
type NewMessage = ChatMessage extends infer M ? (M extends ChatMessage ? Omit<M, "id"> : never) : never;

// A saved conversation in the AI chat list (this browser only).
export interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface AgentContextValue {
  messages: ChatMessage[];
  pushMessage: (m: NewMessage) => void;
  threads: ChatThread[];
  threadId: string;
  newChat: () => void;
  openThread: (id: string) => void;
  deleteThread: (id: string) => void;
  run: (plan: AgentPlan) => Promise<RunState | undefined>;
  stop: () => void;
  runState: RunState | null;
  isLauncherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  // A question to send as soon as the chat opens (news pills, sidebar shortcuts).
  pending: string | null;
  askAgent: (question: string, opts?: { inPlace?: boolean }) => void;
  takePending: () => string | null;
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  recents: Recent[];
  touchRecent: (r: Recent) => void;
  isPresenting: boolean;
  setPresenting: (on: boolean) => void;
  showSpot: (el: HTMLElement | null, label?: string, note?: string) => void;
  hideCursor: () => void;
  moveCursorTo: (el: HTMLElement) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent needs AgentProvider");
  return ctx;
}

const stepLabel = (s: AgentStep) => (s.kind === "say" ? s.text : s.label);

// A full page load (Next falls back to one when a cached route payload is stale) must not end a workflow: the run and the chat
// are kept in sessionStorage (this tab only) and the run resumes at the step it was on.
const RUN_KEY = "singtech.agent.run";
const CHAT_KEY = "singtech.agent.chat";
const RESUME_WITHIN_MS = 120_000;
const session = {
  get: <T,>(key: string): T | null => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "null") as T | null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown) => {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked: the run simply does not survive a reload
    }
  },
};

// Agent state lives at module level, not in the provider: Next remounts the workspace shell on some navigations (for example to
// "/dashboard"), and a workflow or presentation in progress must carry on through that. Same [value, setter] shape as useState.
interface Slot<T> {
  get: () => T;
  initial: T;
  set: (u: SetStateAction<T>) => void;
  subscribe: (l: () => void) => () => void;
}
export function slot<T>(initial: T): Slot<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    initial,
    set: (u) => {
      value = typeof u === "function" ? (u as (prev: T) => T)(value) : u;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
export const useSlot = <T,>(s: Slot<T>) => [useSyncExternalStore(s.subscribe, s.get, () => s.initial), s.set] as const;

const runSlot = slot<RunState | null>(null);
const cursorSlot = slot<CursorState>({ x: 0, y: 0, isVisible: false, isClicking: false, label: "" });
const spotSlot = slot<Spot | null>(null);
const approvalSlot = slot<ApprovalRequest | null>(null);
const launcherSlot = slot(false);
const pendingSlot = slot<string | null>(null);
const mutedSlot = slot(true);
const presentingSlot = slot(false);
const messagesSlot = slot<ChatMessage[]>([]);
const threadsSlot = slot<ChatThread[]>([]);
const threadIdSlot = slot("");
const THREADS_KEY = "singtech.agent.threads";
const THREAD_KEY = "singtech.agent.thread";
const MAX_THREADS = 20;
const newThreadId = () => `chat-${crypto.randomUUID().slice(0, 18)}`;
const threadTitle = (ms: ChatMessage[]) => {
  const first = ms.find((m) => m.role === "user");
  return first && first.role === "user" ? first.text.slice(0, 60) : "New chat";
};
const saveThreads = (threads: ChatThread[]) => {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    // storage full or blocked: the list lasts for this page only
  }
};
const flags = { stopped: false, busy: false, nextId: 1 };
const [setRunState, setCursor, setSpot, setApproval, setLauncherOpen, setPending, setMutedState, setPresenting, setMessages] = [
  runSlot.set,
  cursorSlot.set,
  spotSlot.set,
  approvalSlot.set,
  launcherSlot.set,
  pendingSlot.set,
  mutedSlot.set,
  presentingSlot.set,
  messagesSlot.set,
];
const MUTE_KEY = "singtech.agent.muted";

export function AgentProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [runState] = useSlot(runSlot);
  const [cursor] = useSlot(cursorSlot);
  const [spot] = useSlot(spotSlot);
  const [approval] = useSlot(approvalSlot);
  const [isLauncherOpen] = useSlot(launcherSlot);
  const [pending] = useSlot(pendingSlot);
  const [isMuted] = useSlot(mutedSlot);
  const [isPresenting] = useSlot(presentingSlot);
  const [messages] = useSlot(messagesSlot);
  const pushMessage = useCallback((m: NewMessage) => setMessages((prev) => [...prev, { ...m, id: flags.nextId++ } as ChatMessage]), []);
  const { recents, touchRecent } = useRecents();

  useEffect(() => {
    try {
      // Restoring a per-viewer preference after mount; the server render has no localStorage.
      setMutedState(localStorage.getItem(MUTE_KEY) !== "0");
    } catch {
      // storage blocked: stay muted
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setMutedState(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // per-viewer convenience only
    }
  }, []);

  const sound = useCallback((kind: Parameters<typeof chime>[0]) => {
    if (!mutedSlot.get()) chime(kind);
  }, []);

  const isStopped = useCallback(() => flags.stopped, []);

  const moveCursorTo = useCallback(async (el: HTMLElement) => {
    await bringIntoView(el);
    const { x, y } = centerOf(el);
    setCursor((c) => ({ ...c, x, y, isVisible: true }));
    await sleep(prefersReducedMotion() ? 60 : 720);
  }, []);

  const clickEl = useCallback(
    async (el: HTMLElement) => {
      setCursor((c) => ({ ...c, isClicking: true }));
      sound("click");
      el.click();
      await sleep(260);
      setCursor((c) => ({ ...c, isClicking: false }));
    },
    [sound],
  );

  const showSpot = useCallback((el: HTMLElement | null, label = "", note?: string) => setSpot(el ? { el, label, note } : null), []);
  const hideCursor = useCallback(() => setCursor((c) => ({ ...c, isVisible: false })), []);

  const execute = useCallback(
    async (step: AgentStep): Promise<StepStatus> => {
      setCursor((c) => ({ ...c, label: stepLabel(step) }));
      switch (step.kind) {
        case "say":
          await sleep(prefersReducedMotion() ? 200 : 650);
          return "done";
        case "go": {
          if (window.location.pathname === step.href) return "done";
          for (const t of step.via ?? []) {
            const el = await waitFor(t, 1500, isStopped);
            if (!el) break;
            await moveCursorTo(el);
            await clickEl(el);
            await sleep(450);
            if (window.location.pathname === step.href) break;
          }
          // The visible path was not there (collapsed sidebar, phone layout): go straight to the page.
          if (window.location.pathname !== step.href) router.push(step.href);
          const arrived = await waitForPath(step.href, 8000);
          await sleep(600);
          return arrived ? "done" : "failed";
        }
        case "click": {
          const el = await waitFor(step.target, 5000, isStopped);
          if (!el) return step.optional ? "skipped" : "failed";
          await moveCursorTo(el);
          await clickEl(el);
          await sleep(300);
          return "done";
        }
        case "type": {
          const el = await waitFor(step.target, 5000, isStopped);
          if (!el) return "failed";
          await moveCursorTo(el);
          await clickEl(el);
          await typeInto(el, step.text, isStopped);
          return "done";
        }
        case "highlight": {
          const el = await waitFor(step.target, 6000, isStopped);
          if (!el) return "skipped";
          await moveCursorTo(el);
          setSpot({ el, label: step.label, note: step.note });
          sound("step");
          await sleep(prefersReducedMotion() ? 1800 : step.note ? 3200 : 2000);
          setSpot(null);
          return "done";
        }
        case "waitIdle":
          return (await waitIdle(step.target, isStopped)) ? "done" : "failed";
        case "verify": {
          const el = await waitFor(step.target, 2_500, isStopped);
          // A visible, non-empty result is the minimum evidence that the preceding tool step actually completed.
          return el?.innerText.trim() ? "done" : step.optional ? "skipped" : "failed";
        }
        case "approveUpdate": {
          const answer = findTarget({ css: '[data-agent="ask-panel"] [data-agent-answer]' })?.innerText.trim();
          const note = [`Prepared by SingTech AI for ${step.accountName} and approved by the account executive.`, answer ? answer.slice(0, 2000) : "No assistant answer on screen; add your own note in Salesforce."].join("\n\n");
          setRunState((r) => (r ? { ...r, state: "waiting" } : r));
          sound("wait");
          const outcome = await new Promise<"approved" | "cancelled" | "failed">((resolve) => setApproval({ accountId: step.accountId, accountName: step.accountName, subject: step.subject, note, resolve }));
          setApproval(null);
          setRunState((r) => (r ? { ...r, state: "running" } : r));
          return outcome === "approved" ? "done" : outcome === "failed" ? "failed" : "skipped";
        }
        case "ask":
          // Questions are answered in the chat itself; a workflow never needs this step.
          return "skipped";
      }
    },
    [clickEl, isStopped, moveCursorTo, router, sound],
  );

  const run = useCallback(
    async (input: AgentPlan, from = 0, prior: RunState["log"] = []) => {
      if (flags.busy) return undefined;
      flags.busy = true;
      flags.stopped = false;
      const plan: AgentPlan = input.key ? input : { ...input, key: `run-${Date.now().toString(36)}` };
      setLauncherOpen(false);
      plan.accounts.forEach(touchRecent);
      const log: RunState["log"] = [...prior];
      let state: RunState = { plan, index: from, state: "running", log };
      setRunState(state);
      setCursor((c) => ({ ...c, isVisible: true, x: c.x || window.innerWidth - 80, y: c.y || window.innerHeight - 80 }));
      for (let i = from; i < plan.steps.length && !flags.stopped; i += 1) {
        setRunState((r) => (r ? { ...r, index: i } : r));
        session.set(RUN_KEY, { plan, index: i, log, at: Date.now() });
        let status: StepStatus;
        try {
          status = await execute(plan.steps[i]);
        } catch {
          status = "failed";
        }
        log.push({ label: stepLabel(plan.steps[i]), status });
        setRunState((r) => (r ? { ...r, log: [...log] } : r));
        if (status === "failed") break;
      }
      setSpot(null);
      sound("done");
      session.set(RUN_KEY, null);
      const failed = log.some((step) => step.status === "failed");
      state = { plan, index: plan.steps.length, state: flags.stopped ? "stopped" : failed ? "failed" : "done", log: [...log] };
      setRunState(state);
      const final = state;
      setMessages((prev) => prev.map((m) => (m.role === "plan" && m.plan.key === plan.key ? { ...m, final } : m)));
      setCursor((c) => ({ ...c, label: flags.stopped ? "Stopped" : failed ? "Needs attention" : "Done" }));
      flags.busy = false;
      setTimeout(() => setCursor((c) => (flags.busy ? c : { ...c, isVisible: false })), 2600);
      return state;
    },
    [execute, sound, touchRecent],
  );

  const [threads] = useSlot(threadsSlot);
  const [threadId] = useSlot(threadIdSlot);

  // Saved conversations: loaded once per tab; the active one is kept per tab so a reload reopens it.
  useEffect(() => {
    if (!threadsSlot.get().length) {
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(THREADS_KEY) ?? "[]");
        if (Array.isArray(saved)) threadsSlot.set(saved.filter((t): t is ChatThread => typeof t?.id === "string" && Array.isArray(t?.messages)));
      } catch {
        // storage blocked: start with no saved chats
      }
    }
    if (!threadIdSlot.get()) threadIdSlot.set(session.get<string>(THREAD_KEY) ?? newThreadId());
  }, []);
  useEffect(() => {
    if (threadId) session.set(THREAD_KEY, threadId);
  }, [threadId]);
  // Every change to the open chat updates its entry in the list (newest first).
  useEffect(() => {
    if (!threadId || !messages.length) return;
    const entry: ChatThread = { id: threadId, title: threadTitle(messages), updatedAt: Date.now(), messages: messages.slice(-40) };
    const next = [entry, ...threadsSlot.get().filter((t) => t.id !== threadId)].slice(0, MAX_THREADS);
    threadsSlot.set(next);
    saveThreads(next);
  }, [messages, threadId]);

  const newChat = useCallback(() => {
    setMessages([]);
    threadIdSlot.set(newThreadId());
  }, []);
  const openThread = useCallback((id: string) => {
    const t = threadsSlot.get().find((x) => x.id === id);
    if (!t) return;
    flags.nextId = Math.max(0, ...t.messages.map((m) => m.id)) + 1;
    setMessages(t.messages);
    threadIdSlot.set(id);
  }, []);
  const deleteThread = useCallback((id: string) => {
    const next = threadsSlot.get().filter((t) => t.id !== id);
    threadsSlot.set(next);
    saveThreads(next);
    if (threadIdSlot.get() === id) {
      setMessages([]);
      threadIdSlot.set(newThreadId());
    }
  }, []);

  // After a full page load in the middle of a run, pick it up at the step it was on (a navigation step finds itself done).
  useEffect(() => {
    if (!messagesSlot.get().length) {
      const saved = session.get<ChatMessage[]>(CHAT_KEY);
      if (saved?.length) {
        setMessages(saved);
        flags.nextId = Math.max(...saved.map((m) => m.id)) + 1;
      }
    }
    if (flags.busy) return;
    const saved = session.get<{ plan: AgentPlan; index: number; log: RunState["log"]; at: number }>(RUN_KEY);
    if (saved && Date.now() - saved.at < RESUME_WITHIN_MS) void run(saved.plan, saved.index, saved.log);
    else session.set(RUN_KEY, null);
  }, [run]);
  useEffect(() => session.set(CHAT_KEY, messages.slice(-30)), [messages]);

  // Stable identity: callers (presentation steps) depend on it, and an open approval must not re-create it.
  const stop = useCallback(() => {
    flags.stopped = true;
    setSpot(null);
    approvalSlot.get()?.resolve("cancelled");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && flags.busy && !approval && stop();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approval, stop]);

  // inPlace: the AI Workspace page's own chat takes the question, so the drawer stays closed.
  const askAgent = useCallback((question: string, opts: { inPlace?: boolean } = {}) => {
    setPending(question);
    if (!opts.inPlace) setLauncherOpen(true);
  }, []);
  const takePending = useCallback(() => {
    const q = pending;
    setPending(null);
    return q;
  }, [pending]);

  const value = useMemo<AgentContextValue>(
    () => ({ messages, pushMessage, threads, threadId, newChat, openThread, deleteThread, run, stop, runState, isLauncherOpen, setLauncherOpen, pending, askAgent, takePending, isMuted, setMuted, recents, touchRecent, isPresenting, setPresenting, showSpot, hideCursor, moveCursorTo }),
    [messages, pushMessage, threads, threadId, newChat, openThread, deleteThread, run, stop, runState, isLauncherOpen, pending, askAgent, takePending, isMuted, setMuted, recents, touchRecent, isPresenting, showSpot, hideCursor, moveCursorTo],
  );

  return (
    <AgentContext.Provider value={value}>
      {children}
      <AgentApproval request={approval} onCursorTo={moveCursorTo} sound={sound} />
      <AgentCursor cursor={cursor} spot={spot} isRunning={runState?.state === "running" || runState?.state === "waiting"} isMuted={isMuted} onMute={() => setMuted(!isMuted)} onStop={stop} raiseKey={approval ? 1 : 0} />
    </AgentContext.Provider>
  );
}
