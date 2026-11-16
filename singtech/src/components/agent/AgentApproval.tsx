"use client";

import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { findTarget } from "./runtime";

export interface ApprovalRequest {
  accountId: string;
  accountName: string;
  subject: string;
  note: string;
  resolve: (outcome: "approved" | "cancelled" | "failed") => void;
}

// The one place the agent can write to Salesforce, and only after the rep clicks Approve. The cursor points at the button; it never presses it.
export function AgentApproval({ request, onCursorTo, sound }: { request: ApprovalRequest | null; onCursorTo: (el: HTMLElement) => Promise<void>; sound: (k: "wait") => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    if (request) settled.current = false;
  }, [request]);

  const resolveOnce = (outcome: "approved" | "cancelled" | "failed") => {
    if (!request || settled.current) return;
    settled.current = true;
    request.resolve(outcome);
  };

  useEffect(() => {
    if (!request) return;
    const t = setTimeout(() => {
      const button = findTarget({ css: '[role="alertdialog"] button', text: "Approve and push" });
      if (button) void onCursorTo(button).then(() => sound("wait"));
    }, 400);
    return () => clearTimeout(t);
  }, [request, onCursorTo, sound]);

  const approve = async () => {
    if (!request) return;
    setBusy(true);
    let outcome: "approved" | "failed" = "failed";
    try {
      const res = await fetch("/api/salesforce/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: request.accountId, subject: request.subject, note: request.note }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; accountUrl?: string };
      if (res.ok && data.status === "synced") {
        toast({
          body: `Saved to Salesforce and the deal room for ${request.accountName}.`,
          endContent: data.accountUrl ? <Button size="sm" variant="ghost" label="Open account" onClick={() => window.open(data.accountUrl, "_blank", "noopener,noreferrer")} /> : undefined,
        });
        outcome = "approved";
      } else {
        toast({ body: "Salesforce did not confirm this update. Check your connection or access before retrying.", type: "error" });
      }
    } catch {
      toast({ body: "The connection ended before Salesforce confirmed the update. Reconnect, then retry.", type: "error" });
    } finally {
      setBusy(false);
      resolveOnce(outcome);
    }
  };

  return (
    <AlertDialog
      isOpen={Boolean(request)}
      onOpenChange={(open) => !open && !busy && resolveOnce("cancelled")}
      title="Approve Salesforce update"
      description={
        request
          ? `SingTech AI prepared a Salesforce update and a deal room post for ${request.accountName}: "${request.subject}". Review the details before they are saved. Personal data is redacted first. Nothing is emailed to the customer.`
          : ""
      }
      actionLabel="Approve and push"
      actionVariant="primary"
      isActionLoading={busy}
      onAction={approve}
      width={520}
    />
  );
}
