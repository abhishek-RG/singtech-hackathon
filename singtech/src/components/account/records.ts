"use client";

import { useMemo } from "react";
import { getAccountHistory, getAllHistories, type AccountHistory } from "@/lib/history";
import { useAppStore } from "@/state/app-store";
import type { Company } from "@/types/singtech";

// One row per account the rep can open: every ranked company, plus sample accounts that only exist in history data.
export interface AccountRecord {
  id: string;
  name: string;
  company?: Company;
  history?: AccountHistory;
  isCustomer: boolean;
  isSample: boolean;
  currentArrSgd?: number;
}

export const recordHref = (id: string) => `/accounts/${id}`;

function toRecord(company: Company): AccountRecord {
  return {
    id: company.id,
    name: company.companyName,
    company,
    history: getAccountHistory(company.id),
    isCustomer: company.mode === "farming",
    isSample: company.isDemoAccount,
    currentArrSgd: company.mode === "farming" ? company.currentArrSgd : undefined,
  };
}

export function useAccountRecords(): AccountRecord[] {
  const { companies } = useAppStore();
  return useMemo(() => {
    const known = new Set(companies.map((c) => c.id));
    const historyOnly = getAllHistories()
      .filter((h) => !known.has(h.accountId))
      .map((h) => ({ id: h.accountId, name: h.accountName, history: h, isCustomer: true, isSample: true, currentArrSgd: h.profile?.currentArrSgd }));
    return [...companies.map(toRecord), ...historyOnly];
  }, [companies]);
}

export function useAccountRecord(id: string): AccountRecord | undefined {
  return useAccountRecords().find((r) => r.id === id);
}
