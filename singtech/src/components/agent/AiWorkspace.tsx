"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, SquarePen, Trash2 } from "lucide-react";
import { AgentChat } from "./AgentChat";
import { useAgent } from "./AgentProvider";

const when = (ms: number) => new Date(ms).toLocaleDateString("en-SG", { day: "numeric", month: "short" });

// One clean chat window: saved chats on the left, the conversation and composer on the right.
export function AiWorkspace() {
  const { askAgent, threads, threadId, newChat, openThread, deleteThread } = useAgent();
  const ask = useSearchParams().get("ask");

  useEffect(() => {
    if (ask && ask.length >= 2 && ask.length <= 300) askAgent(ask, { inPlace: true });
  }, [ask, askAgent]);

  return (
    <div className="flex h-[calc(100dvh-104px)] min-h-[520px] gap-4 px-4 py-4 lg:px-6">
      <aside aria-label="Saved chats" className="st-card hidden w-[248px] shrink-0 flex-col overflow-hidden md:flex">
        <div className="border-b border-[#eef0f4] p-2">
          <button type="button" onClick={newChat} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-primary hover:bg-st-hover">
            <SquarePen aria-hidden className="size-4" /> New chat
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {threads.length === 0 && <li className="px-2.5 py-2 text-[12px] text-secondary">Your chats appear here.</li>}
          {threads.map((t) => (
            <li key={t.id} className={`group flex items-center gap-1 rounded-lg ${t.id === threadId ? "bg-st-red-fill" : "hover:bg-st-hover"}`}>
              <button type="button" onClick={() => openThread(t.id)} aria-current={t.id === threadId ? "true" : undefined} className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2 text-left">
                <MessageSquare aria-hidden className={`mt-0.5 size-3.5 shrink-0 ${t.id === threadId ? "text-st-red-ink" : "text-secondary"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-primary">{t.title}</span>
                  <span className="block text-[11px] text-secondary">{when(t.updatedAt)}</span>
                </span>
              </button>
              <button type="button" aria-label={`Delete chat: ${t.title}`} onClick={() => deleteThread(t.id)} className="mr-1 rounded-md p-1.5 text-secondary opacity-0 group-hover:opacity-100 hover:bg-white focus-visible:opacity-100">
                <Trash2 aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section aria-label="SingTech AI chat" className="st-card min-w-0 flex-1 overflow-hidden">
        <AgentChat variant="page" />
      </section>
    </div>
  );
}
