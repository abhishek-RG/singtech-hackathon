"use client";

import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { ArrowUpRight, CloudUpload } from "lucide-react";
import { useAppStore, type PushResult } from "@/state/app-store";
import type { Company } from "@/types/singtech";
import { StatusWord } from "../ui/Panel";

export function PushResultLine({ result }: { result?: PushResult }) {
  if (!result) return null;
  if (result.status === "synced") {
    return (
      <span role="status" className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <StatusWord tone="verified">Synced to Salesforce</StatusWord>
        {result.opportunityUrl && (
          <a href={result.opportunityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary underline">
            Open opportunity <ArrowUpRight aria-hidden className="size-3" />
          </a>
        )}
      </span>
    );
  }
  return (
    <span role="status" className="inline-flex flex-wrap items-center gap-x-2 text-[12px]">
      <StatusWord tone="warning">Not synced to Salesforce</StatusWord>
      <span className="text-secondary">Saved to the local CRM store.{result.error ? ` ${result.error}` : ""}</span>
    </span>
  );
}

// The rep approves first; only then does the route create the Account, the Opportunity and the deal room post.
export function PushAction({
  company,
  option = "full",
  accountId,
  label = "Push to Salesforce & Deal Room",
  width,
  variant = "primary",
}: {
  company?: Company;
  option?: "full" | "entry";
  accountId: string;
  label?: string;
  width?: string;
  variant?: "primary" | "secondary";
}) {
  const toast = useToast();
  const { pushResults, addPushResult } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const result = pushResults[accountId];

  const push = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/salesforce/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: accountId, option, lead: accountId.startsWith("lead-live-") ? company : undefined }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<PushResult>;
      const r: PushResult = res.ok && data.status ? { ...data, status: data.status, at: new Date().toISOString() } : { status: "local", error: (data as { error?: string }).error ?? "The push could not be completed.", at: new Date().toISOString() };
      addPushResult(accountId, r);
      toast({ body: r.status === "synced" ? "Synced to Salesforce and posted to the deal room." : "Not synced to Salesforce. The record was saved locally." });
    } catch {
      addPushResult(accountId, { status: "local", error: "Request timed out.", at: new Date().toISOString() });
      toast({ body: "Not synced to Salesforce. The request did not complete; try again.", type: "error" });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const name = company?.companyName ?? "this account";
  return (
    <>
      <Button variant={variant} label={label} icon={<CloudUpload aria-hidden className="size-4" />} isLoading={busy} onClick={() => setConfirming(true)} width={width} />
      <AlertDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title="Approve and push to Salesforce"
        description={`Creates or updates the Account and the Opportunity, with its next step, for ${name}, then posts a summary to the deal room. Personal data is redacted first. Nothing is emailed to the customer.`}
        actionLabel="Approve and push"
        actionVariant="primary"
        isActionLoading={busy}
        onAction={push}
      />
      {result && (
        <div className="basis-full">
          <PushResultLine result={result} />
        </div>
      )}
    </>
  );
}
