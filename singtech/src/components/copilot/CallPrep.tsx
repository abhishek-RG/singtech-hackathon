"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Plus, X } from "lucide-react";
import { newId } from "@/lib/format";
import { FeasibilityBadge, MeddpiccBadge, RenewalFlag } from "../account/badges";
import { UpdateAction } from "../account/UpdateAction";
import { recordHref, useAccountRecords, type AccountRecord } from "../account/records";
import { CompanyLogo } from "../ui/CompanyLogo";
import { Panel, SectionTitle } from "../ui/Panel";
import { buildBrief } from "./brief";
import { RagProgress, RagResultView } from "./RagAnswer";
import { useRag } from "./useRag";

const TAGS = ["Need", "Objection", "Next step", "Risk"] as const;
type Tag = (typeof TAGS)[number];

interface Note {
  id: string;
  tag: Tag;
  text: string;
}

function BriefList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-primary">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-secondary">{empty}</p>
      )}
    </div>
  );
}

function Brief({ record }: { record: AccountRecord }) {
  const brief = useMemo(() => buildBrief(record.company, record.history), [record]);
  return (
    <Panel
      title="Call brief"
      action={
        <Link href={recordHref(record.id)} className="text-[13px] font-medium text-primary underline">
          Open record
        </Link>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <CompanyLogo id={record.id} name={record.name} size={32} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-primary">{record.name}</div>
          <div className="text-[12px] text-secondary">
            {record.isCustomer ? "Customer" : "Prospect"}
            {record.isSample ? ", Sample account" : ""}
          </div>
        </div>
      </div>
      {record.history && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
          <MeddpiccBadge history={record.history} />
          <FeasibilityBadge history={record.history} />
          <RenewalFlag contractEndDate={record.history.contractEndDate} />
        </div>
      )}
      <div className="space-y-4">
        <div>
          <SectionTitle>Why now</SectionTitle>
          <p className="text-[13px] leading-relaxed text-primary">{brief.whyNow}</p>
        </div>
        <BriefList title="Open products" items={brief.openProducts} empty="Every recommended product is already in contract." />
        <BriefList title="MEDDPICC gaps to close on this call" items={brief.meddpiccGaps} empty={record.history ? "No open gaps." : "Not qualified yet: confirm metrics, buyer, and pain on this call."} />
        <BriefList title="Likely objections" items={brief.objections} empty="No objection on record." />
      </div>
    </Panel>
  );
}

// Each objection gets its own lookup, so several can run while the rep keeps typing.
function ObjectionResponse({ note, accountId }: { note: Note; accountId: string }) {
  const { state, ask, cancel } = useRag();
  useEffect(() => {
    void ask(`Suggested response to this customer objection: "${note.text}"`, accountId);
  }, [ask, note.text, accountId]);
  return (
    <div className="mt-2 rounded-md border border-st-line bg-[#F8F9FA] p-3">
      <div className="mb-1 text-[12px] font-semibold text-primary">Suggested response</div>
      {state.status === "loading" && <RagProgress state={state} onCancel={cancel} />}
      {state.status === "error" && <p className="text-[12px] text-st-red-ink">{state.message}</p>}
      {state.status === "idle" && <p className="text-[12px] text-secondary">Lookup cancelled.</p>}
      {state.status === "done" && <RagResultView result={state.result} prefix={`obj-${note.id}`} />}
    </div>
  );
}

function CallNotes({ record }: { record: AccountRecord }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag>("Need");

  const add = () => {
    const t = text.trim().slice(0, 500);
    if (!t) return;
    setNotes((prev) => [...prev, { id: newId("note"), tag, text: t }]);
    setText("");
  };

  return (
    <>
      <Panel title="Live call notes" action={<span className="text-[12px] text-secondary">Tag an objection to get a suggested response</span>}>
        <div className="flex flex-wrap items-end gap-2">
          <SegmentedControl label="Note tag" size="sm" value={tag} onChange={(v) => setTag(v as Tag)}>
            {TAGS.map((t) => (
              <SegmentedControlItem key={t} value={t} label={t} />
            ))}
          </SegmentedControl>
          <div className="min-w-[220px] flex-1">
            <TextInput label="Note" isLabelHidden value={text} onChange={setText} onEnter={add} placeholder="What did the customer say?" width="100%" />
          </div>
          <Button label="Add note" icon={<Plus aria-hidden className="size-4" />} onClick={add} isDisabled={!text.trim()} />
        </div>
        <ul className="mt-3 divide-y divide-st-line">
          {notes.map((n) => (
            <li key={n.id} className="py-2.5">
              <div className="flex items-start gap-3">
                <span className="w-20 shrink-0 text-[12px] font-semibold text-secondary">{n.tag}</span>
                <span className="min-w-0 flex-1 text-[13px] text-primary">{n.text}</span>
                <button type="button" aria-label="Remove note" onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))} className="rounded p-1 text-secondary hover:bg-st-hover">
                  <X aria-hidden className="size-3.5" />
                </button>
              </div>
              {n.tag === "Objection" && <ObjectionResponse note={n} accountId={record.id} />}
            </li>
          ))}
          {notes.length === 0 && <li className="py-2 text-[13px] text-secondary">No notes yet.</li>}
        </ul>
      </Panel>

      <Panel title="Wrap-up">
        {notes.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {TAGS.map((t) => {
              const list = notes.filter((n) => n.tag === t);
              return (
                <div key={t}>
                  <SectionTitle>{`${t} (${list.length})`}</SectionTitle>
                  {list.length ? (
                    <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-primary">
                      {list.map((n) => (
                        <li key={n.id}>{n.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-secondary">None</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-secondary">Add notes during the call; the wrap-up groups them by tag.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-st-line pt-3">
          <UpdateAction
            accountId={record.id}
            accountName={record.name}
            subject={`Call wrap-up: ${record.name}`}
            note={TAGS.map((t) => [t, notes.filter((n) => n.tag === t)] as const)
              .filter(([, list]) => list.length)
              .map(([t, list]) => `${t}: ${list.map((n) => n.text).join("; ")}`)
              .join("\n")}
            label="Approve wrap-up and log in Salesforce"
            isDisabled={notes.length === 0}
          />
          {notes.length === 0 && <span className="text-[12px] text-secondary">Add at least one note first.</span>}
        </div>
      </Panel>
    </>
  );
}

export function CallPrep({ defaultAccountId }: { defaultAccountId?: string }) {
  const records = useAccountRecords();
  const [accountId, setAccountId] = useState(defaultAccountId && records.some((r) => r.id === defaultAccountId) ? defaultAccountId : records[0]?.id);
  const record = records.find((r) => r.id === accountId);
  const options = records.map((r) => ({ value: r.id, label: r.name, description: r.isSample ? "Sample account" : r.isCustomer ? "Customer" : "Prospect" }));

  return (
    <div className="space-y-4">
      <div className="max-w-[360px]">
        <Selector label="Account for this call" options={options} value={accountId} onChange={setAccountId} hasSearch width="100%" />
      </div>
      {record && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-5">
            <Brief record={record} />
          </div>
          <div key={record.id} className="col-span-12 space-y-4 xl:col-span-7">
            <CallNotes record={record} />
          </div>
        </div>
      )}
    </div>
  );
}
