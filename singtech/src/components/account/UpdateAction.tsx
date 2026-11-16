"use client";

import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { ArrowUpRight, CloudUpload } from "lucide-react";
import { StatusWord } from "../ui/Panel";

interface UpdateResult {
  status: "synced" | "local";
  accountUrl?: string;
  error?: string;
}

// Logs a note (a call wrap-up) on the Account's Salesforce feed and in the deal room, after the rep approves.
export function UpdateAction({ accountId, accountName, subject, note, label, isDisabled }: { accountId: string; accountName: string; subject: string; note: string; label: string; isDisabled?: boolean }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/salesforce/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, subject, note }), signal: AbortSignal.timeout(30_000) });
      const data = (await res.json().catch(() => ({}))) as Partial<UpdateResult> & { error?: string };
      const r: UpdateResult = res.ok && data.status ? { status: data.status, accountUrl: data.accountUrl, error: data.error } : { status: "local", error: data.error ?? "The update could not be sent." };
      setResult(r);
      toast({ body: r.status === "synced" ? "Logged on the Salesforce account and posted to the deal room." : "Not synced to Salesforce.", type: r.status === "synced" ? undefined : "error" });
    } catch {
      setResult({ status: "local", error: "The request did not complete; try again." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <Button variant="primary" label={label} icon={<CloudUpload aria-hidden className="size-4" />} isLoading={busy} isDisabled={isDisabled} onClick={() => setConfirming(true)} />
      <AlertDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title="Approve and log in Salesforce"
        description={`Posts "${subject}" with these notes to the ${accountName} account feed in Salesforce and to the deal room. Personal data is redacted first. Nothing is emailed to the customer.`}
        actionLabel="Approve and log"
        actionVariant="primary"
        isActionLoading={busy}
        onAction={send}
      />
      {result && (
        <span role="status" className="inline-flex basis-full flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          {result.status === "synced" ? (
            <>
              <StatusWord tone="verified">Logged in Salesforce</StatusWord>
              {result.accountUrl && (
                <a href={result.accountUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary underline">
                  Open account <ArrowUpRight aria-hidden className="size-3" />
                </a>
              )}
            </>
          ) : (
            <>
              <StatusWord tone="warning">Not synced to Salesforce</StatusWord>
              <span className="text-secondary">{result.error}</span>
            </>
          )}
        </span>
      )}
    </>
  );
}
