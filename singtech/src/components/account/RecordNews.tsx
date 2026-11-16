"use client";

import type { Signal } from "@/lib/signals/types";
import { useAppStore } from "@/state/app-store";
import type { ProductId } from "@/types/singtech";
import { SignalsPanel } from "../overview/SignalsPanel";
import { normalizeName } from "../prospect/duplicates";
import type { AccountRecord } from "./records";

// A distinctive first word ("juspay", "capitaland") finds headlines that shorten the legal name.
export function newsMatcher(name: string) {
  const norm = normalizeName(name);
  const first = norm.split(" ")[0] ?? "";
  const key = first.length >= 5 ? first : norm;
  return (s: Signal) => (s.matchedCompany ? normalizeName(s.matchedCompany) === norm : false) || ` ${normalizeName(s.title)} `.includes(` ${key} `);
}

// Company news when there is any; fictional sample accounts get market news for the products they are being offered.
export function RecordNews({ record }: { record: AccountRecord }) {
  const { feed } = useAppStore();
  const own = newsMatcher(record.name);
  const hasOwn = feed.signals.some(own);
  const products = new Set<ProductId>(record.company?.recommendedBundle.products ?? (record.history?.productMix.flatMap((p) => p.products) as ProductId[] | undefined) ?? []);
  const related = (s: Signal) => s.products.some((p) => products.has(p));
  return (
    <SignalsPanel
      title={hasOwn ? `News on ${record.name}` : "Market news for this bundle"}
      filter={hasOwn ? own : related}
      limit={5}
      empty={record.isSample ? "No signal found. This is a sample account, so it has no public news." : "No signal found."}
    />
  );
}
