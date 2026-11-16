"use client";

import { Drawer } from "@astryxdesign/core/Drawer";
import { useAppStore } from "@/state/app-store";
import { LeadPanel } from "../lead/LeadPanel";

// One quick-view drawer for the whole app; "Open full record" leads to the account's own page.
export function PlaybookDrawer() {
  const { companies, playbookId, openPlaybook } = useAppStore();
  const company = companies.find((c) => c.id === playbookId);
  return (
    <Drawer
      isOpen={Boolean(company)}
      onOpenChange={(open) => !open && openPlaybook(undefined)}
      label={company ? `${company.companyName} quick view` : "Account quick view"}
      width={560}
      padding={0}
      experimental={{ isFullWidthOnMobile: true }}
    >
      {company && <LeadPanel key={company.id} company={company} onClose={() => openPlaybook(undefined)} />}
    </Drawer>
  );
}
