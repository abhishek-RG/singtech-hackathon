"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { getProduct } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import { CORRIDORS } from "@/lib/labels";
import { useAppStore } from "@/state/app-store";
import type { AnalyzeCompanyResponse, CorridorId, HuntingLead } from "@/types/singtech";
import { SignalsList } from "../account/AccountRecord";
import { recordHref, useAccountRecords } from "../account/records";
import { RagProgress, RagResultView } from "../copilot/RagAnswer";
import { useRag } from "../copilot/useRag";
import { PageHero, Panel, SectionTitle, StatusWord } from "../ui/Panel";
import { findDuplicate } from "./duplicates";

const CORRIDOR_OPTIONS = (Object.keys(CORRIDORS) as CorridorId[]).map((value) => ({ value, label: CORRIDORS[value].replace("<->", "to") }));

type Analysis = { status: "idle" } | { status: "loading" } | { status: "done"; lead: HuntingLead } | { status: "error"; message: string };

function LeadReview({ lead }: { lead: HuntingLead }) {
  const b = lead.recommendedBundle;
  return (
    <Panel title={`Playbook: ${lead.companyName}`} action={<span className="tabular text-[13px] text-primary">{formatSgd(b.estimatedArrSgd)} indicative ARR</span>}>
      <div className="space-y-4">
        <div>
          <SectionTitle>Why now</SectionTitle>
          <p className="text-[13px] text-primary">{lead.whyNow}</p>
        </div>
        <div>
          <SectionTitle>Evidence</SectionTitle>
          <SignalsList company={lead} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionTitle>Recommended bundle</SectionTitle>
            <p className="text-[13px] font-medium text-primary">{b.bundleName}</p>
            <p className="text-[13px] text-secondary">{b.products.map((id) => getProduct(id)!.shortName).join(", ")}</p>
            <p className="mt-1 text-[12px] text-secondary">Indicative, derived from catalogue ARR.</p>
          </div>
          <div>
            <SectionTitle>Who to engage</SectionTitle>
            <p className="text-[13px] font-medium text-primary">{lead.decisionMaker.targetTitle}</p>
            <p className="text-[13px] text-secondary">{lead.nextAction}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ProspectAnalyzer() {
  const router = useRouter();
  const toast = useToast();
  const { addAnalyzedLead } = useAppStore();
  const records = useAccountRecords();
  const rag = useRag();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("https://");
  const [corridor, setCorridor] = useState<CorridorId>("blr-sg");
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>({ status: "idle" });

  const duplicate = findDuplicate(companyName, records);
  const urlOk = /^https:\/\/[^\s/]+\.[^\s]+$/.test(websiteUrl.trim());
  const canResearch = companyName.trim().length > 0 && companyName.trim().length <= 120 && urlOk && !duplicate;

  const research = async () => {
    setStep(1);
    setAnalysis({ status: "loading" });
    void rag.ask(`What do we know about ${companyName.trim()}? Existing accounts, signals, partners, and products that fit.`);
    try {
      const res = await fetch("/api/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim(), websiteUrl: websiteUrl.trim(), corridor, notes: notes.trim() || undefined }),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.status === 400) throw new Error("Enter a company name and a full https:// website address.");
      if (!res.ok) throw new Error("The playbook could not be built. Try again.");
      const data = (await res.json()) as AnalyzeCompanyResponse;
      setAnalysis({ status: "done", lead: data.lead });
    } catch (e) {
      setAnalysis({ status: "error", message: e instanceof Error && e.message.startsWith("Enter") ? e.message : "The playbook could not be built. Try again." });
    }
  };

  const save = () => {
    if (analysis.status !== "done") return;
    addAnalyzedLead(analysis.lead);
    toast({ body: `${analysis.lead.companyName} added to your prospects.` });
    router.push(recordHref(analysis.lead.id));
  };

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero title="New prospect" subtitle="Identify the company, let SingTech research it from public sources and your records, then review before it joins your book.">
        <div className="st-glass px-4 py-3">
          <Stepper activeStep={step} label="Add prospect" density="compact">
            <Step step={0} label="Identify" />
            <Step step={1} label="Research" />
            <Step step={2} label="Review" />
          </Stepper>
        </div>
      </PageHero>

      {step === 0 && (
        <Panel title="Identify the company" className="max-w-[760px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Company name" value={companyName} onChange={setCompanyName} placeholder="Ocean Network Express" />
            <TextInput
              label="Website"
              type="url"
              value={websiteUrl}
              onChange={setWebsiteUrl}
              placeholder="https://www.example.com"
              status={websiteUrl.length > 8 && !urlOk ? { type: "error", message: "Use a full https:// address." } : undefined}
            />
            <Selector label="Corridor" options={CORRIDOR_OPTIONS} value={corridor} onChange={(v) => setCorridor(v as CorridorId)} width="100%" />
            <TextArea label="Rep notes" value={notes} onChange={setNotes} rows={2} placeholder="Expansion plans, contacts, timing" isOptional maxLength={2000} />
          </div>
          {duplicate && (
            <div className="mt-3">
              <Banner
                status="warning"
                title={`${duplicate.name} is already in your book`}
                description="Open the existing record instead of adding a duplicate."
                endContent={<Button size="sm" label="Open record" href={recordHref(duplicate.id)} as={Link} />}
              />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" label="Research" onClick={research} isDisabled={!canResearch} />
            <Button variant="ghost" label="Cancel" href="/accounts/prospects" as={Link} />
          </div>
        </Panel>
      )}

      {step >= 1 && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 space-y-4 xl:col-span-7">
            {step === 1 && (
              <Panel title="Research">
                <ul className="space-y-3 text-[13px]">
                  <li className="flex flex-wrap items-center gap-3">
                    {analysis.status === "loading" && <Spinner size="sm" aria-label="Building playbook" />}
                    <span className="text-primary">Playbook from the company, its website, and your notes</span>
                    {analysis.status === "done" && <StatusWord tone="verified">Ready</StatusWord>}
                    {analysis.status === "error" && <StatusWord tone="critical">{analysis.message}</StatusWord>}
                  </li>
                  <li className="flex flex-wrap items-center gap-3">
                    <span className="text-primary">Lookup of existing records</span>
                    {rag.state.status === "done" && <StatusWord tone="verified">Ready</StatusWord>}
                    {rag.state.status === "error" && <StatusWord tone="warning">No answer</StatusWord>}
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" label="Review" onClick={() => setStep(2)} isDisabled={analysis.status !== "done"} />
                  {analysis.status === "error" && <Button label="Try again" onClick={research} />}
                  <Button variant="ghost" label="Back" onClick={() => setStep(0)} />
                </div>
              </Panel>
            )}
            {step === 2 && analysis.status === "done" && (
              <>
                <LeadReview lead={analysis.lead} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" label="Save prospect" onClick={save} />
                  <Button variant="ghost" label="Back" onClick={() => setStep(0)} />
                </div>
              </>
            )}
          </div>
          <Panel title="What do we know?" className="col-span-12 xl:col-span-5">
            {rag.state.status === "loading" && <RagProgress state={rag.state} onCancel={rag.cancel} />}
            {rag.state.status === "done" && <RagResultView result={rag.state.result} prefix="known" />}
            {rag.state.status === "error" && <p className="text-[13px] text-secondary">{rag.state.message}</p>}
            {rag.state.status === "idle" && <p className="text-[13px] text-secondary">Lookup cancelled. The playbook does not depend on it.</p>}
          </Panel>
        </div>
      )}
    </div>
  );
}
