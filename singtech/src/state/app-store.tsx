"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getFarmingAccounts, getHuntingLeads } from "@/lib/data-service";
import { applyTelemetryEvent, rankCompanies } from "@/lib/scoring";
import { nextLiveAlert } from "@/lib/telemetry-sim";
import type { Signal, SignalsResult } from "@/lib/signals/types";
import type { Company, CrmReceipt, FarmingAccount, HuntingLead, LeadStatus, ProductId, SalesDesk, TelemetryAlert } from "@/types/singtech";

// Proposal builder state per account; persisted in this browser so a reload keeps the rep's draft.
export type ProposalStatus = "draft" | "pending" | "approved" | "sent";
export interface ProposalLine {
  productId: ProductId;
  qty: number;
  termMonths: 12 | 24 | 36;
  discountPct: number;
}
export interface ProposalDraft {
  lines: ProposalLine[];
  status: ProposalStatus;
  updatedAt: string;
}

// Result of POST /api/salesforce/push, kept per account so every view shows the same sync state.
export interface PushResult {
  status: "synced" | "local";
  accountId?: string;
  opportunityId?: string;
  taskId?: string;
  chatterPostId?: string;
  opportunityUrl?: string;
  error?: string;
  at: string;
}

const PROPOSALS_KEY = "singtech.proposals.v1";
// The signals route refuses refresh=1 more than once a minute, so polling stays above that.
const SIGNAL_POLL_MS = 90_000;
// A new signal is worth interrupting the rep for when it names a tracked company or scores 70 or more.
export const isHotSignal = (s: Signal) => Boolean(s.matchedCompany) || s.score >= 70;

export interface SignalFeed {
  status: "loading" | "ready" | "error";
  signals: Signal[];
  fetchedAt?: string;
  live: boolean;
  // New hot signals that arrived after the first load, newest first.
  alerts: Signal[];
}

interface LiveEvent {
  accountId: string;
  alert: TelemetryAlert;
}

interface AppStore {
  desk: SalesDesk;
  setDesk: (desk: SalesDesk) => void;
  companies: Company[];
  accounts: FarmingAccount[];
  statuses: Record<string, LeadStatus>;
  setStatus: (id: string, status: LeadStatus) => void;
  addAnalyzedLead: (lead: HuntingLead) => void;
  receipts: (CrmReceipt & { companyId: string })[];
  addReceipt: (companyId: string, receipt: CrmReceipt) => void;
  liveAlertIds: Set<string>;
  playbookId?: string;
  openPlaybook: (id?: string) => void;
  simulateTelemetry: () => { account: FarmingAccount; alert: TelemetryAlert; scoreBefore: number };
  proposals: Record<string, ProposalDraft>;
  saveProposal: (accountId: string, draft: ProposalDraft) => void;
  pushResults: Record<string, PushResult>;
  addPushResult: (companyId: string, result: PushResult) => void;
  feed: SignalFeed;
}

const StoreContext = createContext<AppStore | null>(null);

const BASE_ACCOUNTS = getFarmingAccounts();
const BASE_LEADS = getHuntingLeads();

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [desk, setDesk] = useState<SalesDesk>("all");
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>({});
  const [analyzed, setAnalyzed] = useState<HuntingLead[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [receipts, setReceipts] = useState<AppStore["receipts"]>([]);
  const [playbookId, openPlaybook] = useState<string>();
  const [proposals, setProposals] = useState<Record<string, ProposalDraft>>({});
  const [pushResults, setPushResults] = useState<Record<string, PushResult>>({});
  const [feed, setFeed] = useState<SignalFeed>({ status: "loading", signals: [], live: false, alerts: [] });

  // One shared news feed for Home, records, and the bell. Polls with refresh=1 and keeps the last good result on failure.
  useEffect(() => {
    let alive = true;
    let seen: Set<string> | null = null;
    const load = async (refresh: boolean) => {
      try {
        const res = await fetch(`/api/signals?limit=60${refresh ? "&refresh=1" : ""}`, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SignalsResult;
        if (!alive) return;
        const fresh = seen ? data.signals.filter((x) => !seen!.has(x.id) && isHotSignal(x)) : [];
        seen = new Set([...(seen ?? []), ...data.signals.map((x) => x.id)]);
        setFeed((prev) => ({ status: "ready", signals: data.signals, fetchedAt: data.fetchedAt, live: data.live, alerts: [...fresh, ...prev.alerts].slice(0, 20) }));
      } catch {
        if (alive) setFeed((prev) => (prev.signals.length ? prev : { ...prev, status: "error" }));
      }
    };
    void load(false);
    const timer = setInterval(() => void load(true), SIGNAL_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Storage can be blocked (private mode, previews); the builder then simply starts fresh.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROPOSALS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage after mount
      if (saved) setProposals(JSON.parse(saved) as Record<string, ProposalDraft>);
    } catch {
      // ignore unreadable storage
    }
  }, []);

  const saveProposal = useCallback((accountId: string, draft: ProposalDraft) => {
    setProposals((prev) => {
      const next = { ...prev, [accountId]: draft };
      try {
        localStorage.setItem(PROPOSALS_KEY, JSON.stringify(next));
      } catch {
        // ignore blocked storage
      }
      return next;
    });
  }, []);

  const accounts = useMemo(
    () =>
      BASE_ACCOUNTS.map((acct) =>
        events.filter((e) => e.accountId === acct.id).reduce((a, e) => applyTelemetryEvent(a, e.alert), acct),
      ),
    [events],
  );

  const companies = useMemo(() => rankCompanies<Company>([...analyzed, ...BASE_LEADS, ...accounts]), [analyzed, accounts]);

  const simulateTelemetry = useCallback(() => {
    const { accountId, alert } = nextLiveAlert(events.length);
    const before = accounts.find((a) => a.id === accountId)!;
    setEvents((prev) => [...prev, { accountId, alert }]);
    return { account: applyTelemetryEvent(before, alert), alert, scoreBefore: before.priorityScore };
  }, [events.length, accounts]);

  const store: AppStore = {
    desk,
    setDesk,
    companies,
    accounts,
    statuses,
    setStatus: (id, status) => setStatuses((prev) => ({ ...prev, [id]: status })),
    addAnalyzedLead: (lead) => setAnalyzed((prev) => [lead, ...prev.filter((l) => l.id !== lead.id)]),
    receipts,
    addReceipt: (companyId, receipt) => setReceipts((prev) => [{ ...receipt, companyId }, ...prev]),
    liveAlertIds: new Set(events.map((e) => e.alert.id)),
    playbookId,
    openPlaybook,
    simulateTelemetry,
    proposals,
    saveProposal,
    pushResults,
    addPushResult: (companyId, result) => setPushResults((prev) => ({ ...prev, [companyId]: result })),
    feed,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppStore must be used inside AppStoreProvider");
  return store;
}
