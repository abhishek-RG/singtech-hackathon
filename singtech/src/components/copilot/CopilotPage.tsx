"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { CallAssist } from "../call/CallAssist";
import { PageHero } from "../ui/Panel";
import { Assistant } from "./Assistant";
import { CallPrep } from "./CallPrep";

// ?account= (from a record page) preselects the account and opens call prep.
export function CopilotPage() {
  const accountId = useSearchParams().get("account") ?? undefined;
  const [tab, setTab] = useState(accountId ? "prep" : "assistant");
  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero title="Co-Pilot & RAG" subtitle="Ask about bills, renewals, and deals across your accounts, prepare a call, and take tagged notes. Every answer cites the record it came from.">
        <TabList value={tab} onChange={setTab} role="tablist">
          <Tab value="assistant" label="Assistant" panelId="cp-assistant" />
          <Tab value="prep" label="Call prep and notes" panelId="cp-prep" />
          <Tab value="replay" label="QBR replay" panelId="cp-replay" />
        </TabList>
      </PageHero>
      <div id={`cp-${tab}`} role="tabpanel">
        {tab === "assistant" && <Assistant defaultAccountId={accountId} />}
        {tab === "prep" && <CallPrep defaultAccountId={accountId} />}
        {tab === "replay" && <CallAssist />}
      </div>
    </div>
  );
}
