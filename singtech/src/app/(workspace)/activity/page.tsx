import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Outbox } from "@/components/outbox/Outbox";
import { webhookUrl } from "@/lib/webhooks";

export const metadata: Metadata = { title: "Activity | SingTech" };

// Reads env at request time (never at build), and only reports whether a URL is set, never the URL itself.
async function ConfiguredOutbox() {
  await connection();
  return <Outbox slackConfigured={Boolean(webhookUrl("SLACK_WEBHOOK_URL"))} salesforceConfigured={Boolean(webhookUrl("SALESFORCE_WEBHOOK_URL"))} />;
}

export default function OutboxPage() {
  return (
    <Suspense>
      <ConfiguredOutbox />
    </Suspense>
  );
}
