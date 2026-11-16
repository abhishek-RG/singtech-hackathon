"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Item } from "@astryxdesign/core/Item";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MessageSquareText } from "lucide-react";
import { RagProgress, RagResultView } from "../copilot/RagAnswer";
import { useRag } from "../copilot/useRag";
import { Panel } from "../ui/Panel";

// Retrieval scoped to one account: suggested questions are built from that account's invoices, gaps, rivals, and renewal.
export function AskPanel({ title, accountId, suggestions, prefix, className = "" }: { title: string; accountId: string; suggestions: string[]; prefix: string; className?: string }) {
  const { state, ask, cancel } = useRag();
  const [question, setQuestion] = useState("");
  const busy = state.status === "loading";
  const submit = (q: string) => {
    setQuestion(q);
    void ask(q, accountId);
  };
  return (
    <Panel title={title} className={className} agentId="ask-panel">
      <ul className="-mx-2 divide-y divide-st-line">
        {suggestions.map((q) => (
          <Item key={q} as="li" label={q} labelLines={2} density="compact" isDisabled={busy} onClick={() => submit(q)} startContent={<MessageSquareText aria-hidden className="size-4 text-st-red" />} />
        ))}
      </ul>
      <div className="mt-3 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextInput label="Ask a question" isLabelHidden size="sm" value={question} onChange={setQuestion} onEnter={() => question.trim().length >= 2 && submit(question)} placeholder="Ask about this account" width="100%" />
        </div>
        <Button size="sm" label="Ask" onClick={() => submit(question)} isDisabled={busy || question.trim().length < 2} />
      </div>
      <div className="mt-3">
        {state.status === "loading" && <RagProgress state={state} onCancel={cancel} />}
        {state.status === "error" && (
          <p role="alert" className="text-[13px] text-st-red-ink">
            {state.message}
          </p>
        )}
        {state.status === "done" && <RagResultView result={state.result} prefix={prefix} />}
      </div>
    </Panel>
  );
}
