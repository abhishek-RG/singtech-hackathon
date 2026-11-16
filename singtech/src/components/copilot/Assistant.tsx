"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Search } from "lucide-react";
import { getAllHistories } from "@/lib/history";
import { useAccountRecords } from "../account/records";
import { Panel, StatusWord } from "../ui/Panel";
import { RagProgress, RagResultView } from "./RagAnswer";
import { useRag, type RagResult } from "./useRag";

const QUICK_PROMPTS = [
  "Status of SGT-INV-2026-8841",
  "Which accounts are in the 12-18 month renewal window?",
  "Biggest competitor threat on LionRock",
  "MEDDPICC gaps for Straits Vanguard",
];

const OPEN_ITEMS = getAllHistories()
  .flatMap((h) => h.invoices.filter((i) => i.status !== "paid").map((i) => ({ invoice: i, account: h.accountName })))
  .sort((a, b) => b.invoice.issuedOn.localeCompare(a.invoice.issuedOn));

export function Assistant({ defaultAccountId }: { defaultAccountId?: string }) {
  const records = useAccountRecords();
  const { state, ask, cancel } = useRag();
  const [question, setQuestion] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(defaultAccountId);
  const [earlier, setEarlier] = useState<RagResult[]>([]);

  const submit = async (q = question) => {
    setQuestion(q);
    if (state.status === "done") setEarlier((prev) => [state.result, ...prev].slice(0, 5));
    await ask(q, accountId);
  };

  const options = records.map((r) => ({ value: r.id, label: r.name, description: r.isSample ? "Sample account" : r.isCustomer ? "Customer" : "Prospect" }));
  const busy = state.status === "loading";

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 space-y-4 xl:col-span-8">
        <Panel title="Bill ID and account assistant">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
              <TextArea
                label="Question"
                value={question}
                onChange={setQuestion}
                rows={2}
                placeholder="Ask about a bill ID, renewal, MEDDPICC gap, competitor, or product fit"
                maxLength={1000}
              />
              <Selector label="Account" options={options} value={accountId ?? null} onChange={(v) => setAccountId(v ?? undefined)} hasClear hasSearch placeholder="All accounts" width="100%" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" label="Ask" icon={<Search aria-hidden className="size-4" />} onClick={() => submit()} isDisabled={question.trim().length < 2 || busy} />
              {QUICK_PROMPTS.map((p) => (
                <Button key={p} size="sm" label={p} onClick={() => submit(p)} isDisabled={busy} />
              ))}
            </div>
          </div>
        </Panel>

        <Panel title={state.status === "done" ? state.result.question : state.status === "loading" || state.status === "error" ? state.question : "Answer"} bodyClassName="p-4" className="min-h-[160px]">
          {state.status === "idle" && <p className="text-[13px] text-secondary">Answers cite the account record, invoice, meeting minute, or playbook they come from.</p>}
          {state.status === "loading" && <RagProgress state={state} onCancel={cancel} />}
          {state.status === "error" && (
            <p role="alert" className="text-[13px] text-st-red-ink">
              {state.message}
            </p>
          )}
          {state.status === "done" && <RagResultView result={state.result} prefix="ans" />}
        </Panel>

        {earlier.length > 0 && (
          <Panel title="Earlier answers this session">
            <ul className="divide-y divide-st-line">
              {earlier.map((r, i) => (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <details>
                    <summary className="cursor-pointer text-[13px] font-medium text-primary">{r.question}</summary>
                    <div className="mt-2">
                      <RagResultView result={r} prefix={`earlier-${i}`} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <Panel title="Open billing items" className="col-span-12 xl:col-span-4" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">Sample data</span>}>
        <ul className="divide-y divide-st-line">
          {OPEN_ITEMS.map(({ invoice: i, account }) => (
            <li key={i.id}>
              <button type="button" onClick={() => submit(`Status of ${i.id}`)} disabled={busy} className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-st-hover disabled:opacity-60">
                <span className="min-w-0">
                  <span className="font-id block text-primary">{i.id}</span>
                  <span className="block truncate text-[12px] text-secondary">{account}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="tabular text-[13px] text-primary">SGD {i.amountSgd.toLocaleString("en-SG")}</span>
                  <StatusWord tone={i.status === "disputed" ? "critical" : "warning"}>{i.status === "disputed" ? "Disputed" : "Overdue"}</StatusWord>
                </span>
              </button>
            </li>
          ))}
          {OPEN_ITEMS.length === 0 && <li className="p-4 text-[13px] text-secondary">No open billing items.</li>}
        </ul>
      </Panel>
    </div>
  );
}
