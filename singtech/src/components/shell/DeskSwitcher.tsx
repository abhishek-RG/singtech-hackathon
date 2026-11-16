"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { DESKS } from "@/lib/labels";
import { useAppStore } from "@/state/app-store";
import type { SalesDesk } from "@/types/singtech";

const OPTIONS = (Object.keys(DESKS) as SalesDesk[]).map((value) => ({ value, label: DESKS[value] }));

export function DeskSwitcher() {
  const { desk, setDesk } = useAppStore();
  return (
    <Selector
      label="Singtel sales division"
      isLabelHidden
      size="sm"
      width="100%"
      options={OPTIONS}
      value={desk}
      onChange={(v) => setDesk(v as SalesDesk)}
    />
  );
}
