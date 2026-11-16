"use client";

import { Button } from "@astryxdesign/core/Button";
import { formatSgd } from "@/lib/format";
import type { AccountHistory } from "@/lib/history";
import { RagProgress, RagResultView } from "../copilot/RagAnswer";
import { useRag } from "../copilot/useRag";
import { formatDate } from "../ui/dates";
import { Panel, SectionTitle, StatusWord } from "../ui/Panel";

function RagSlot({ state, cancel, prefix }: { state: ReturnType<typeof useRag>["state"]; cancel: () => void; prefix: string }) {
  if (state.status === "loading") return <RagProgress state={state} onCancel={cancel} />;
  if (state.status === "error") return <p className="text-[13px] text-st-red-ink">{state.message}</p>;
  if (state.status === "done") return <RagResultView result={state.result} prefix={prefix} />;
  return null;
}

// "Why this bundle?": a cited narrative drafted from the account's records, for the rep to edit into the cover note.
export function NarrativePanel({ accountId, name, bundle }: { accountId: string; name: string; bundle: string }) {
  const { state, ask, cancel } = useRag();
  const question = `Why is the ${bundle} the right proposal for ${name}? Use its usage signals, MEDDPICC evidence, billing history and competitors.`;
  return (
    <Panel agentId="why-bundle" title="Why this bundle?" action={<Button size="sm" label={state.status === "done" ? "Draft again" : "Draft narrative"} onClick={() => void ask(question, accountId)} isDisabled={state.status === "loading"} />}>
      {state.status === "idle" ? (
        <p className="text-[13px] text-secondary">Drafts a cited narrative for the cover note from this account&apos;s records and playbooks. Review it before it goes to the customer.</p>
      ) : (
        <RagSlot state={state} cancel={cancel} prefix={`why-${accountId}`} />
      )}
    </Panel>
  );
}

export function BillingContext({ history }: { history?: AccountHistory }) {
  if (!history) {
    return (
      <Panel title="Billing context">
        <p className="text-[13px] text-secondary">New customer: no billing history. Confirm the billing entity and system in discovery.</p>
      </Panel>
    );
  }
  const open = history.invoices.filter((i) => i.status !== "paid");
  return (
    <Panel title="Billing context" action={<span className="text-[12px] text-secondary">Sample data</span>}>
      <p className="text-[13px] text-primary">
        Billing system: <span className="font-semibold">{history.billing.system === "SAP-to-Oracle" ? "SAP, migrating to Oracle" : history.billing.system}</span>
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-secondary">
        {history.billing.frictionNotes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <SectionTitle>
        <span className="mt-3 block">Open invoices ({open.length})</span>
      </SectionTitle>
      {open.length ? (
        <ul className="divide-y divide-st-line">
          {open.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-id block text-primary">{i.id}</span>
                <span className="block text-[12px] text-secondary">
                  Due {formatDate(i.dueOn)}
                  {i.note ? `. ${i.note}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="tabular text-[13px] text-primary">{formatSgd(i.amountSgd)}</span>
                <StatusWord tone={i.status === "disputed" ? "critical" : "warning"}>{i.status === "disputed" ? "Disputed" : "Overdue"}</StatusWord>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-secondary">All invoices paid. Billing is not a blocker.</p>
      )}
    </Panel>
  );
}

function Competitor({ accountId, account, name, threat }: { accountId: string; account: string; name: string; threat: string }) {
  const { state, ask, cancel } = useRag();
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-primary">{name}</div>
          <p className="text-[12px] text-secondary">{threat}</p>
        </div>
        <span className="shrink-0">
          <Button size="sm" label="Counter" onClick={() => void ask(`How should we counter-position against ${name} at ${account}? Threat: ${threat}`, accountId)} isDisabled={state.status === "loading"} />
        </span>
      </div>
      {state.status !== "idle" && (
        <div className="mt-2 border-l-2 border-st-red pl-3">
          <RagSlot state={state} cancel={cancel} prefix={`counter-${accountId}-${name.replace(/\W+/g, "-")}`} />
        </div>
      )}
    </li>
  );
}

export function CompetitorPanel({ accountId, name, history }: { accountId: string; name: string; history?: AccountHistory }) {
  return (
    <Panel title="Competitor counter-positioning">
      {history?.competitors.length ? (
        <ul className="divide-y divide-st-line">
          {history.competitors.map((c) => (
            <Competitor key={c.name} accountId={accountId} account={name} name={c.name} threat={c.threat} />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-secondary">No competitor recorded yet. Ask in discovery who else is in the evaluation.</p>
      )}
    </Panel>
  );
}
