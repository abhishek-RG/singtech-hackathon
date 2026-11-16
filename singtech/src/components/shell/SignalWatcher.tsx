"use client";

import { useEffect, useRef } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { useAppStore } from "@/state/app-store";

// Raises one toast per new hot signal from the shared feed; the bell keeps the list.
export function SignalWatcher() {
  const toast = useToast();
  const { feed } = useAppStore();
  const shown = useRef(new Set<string>());

  useEffect(() => {
    for (const s of [...feed.alerts].reverse()) {
      if (shown.current.has(s.id)) continue;
      shown.current.add(s.id);
      toast({
        uniqueID: s.id,
        autoHideDuration: 9000,
        body: `${s.matchedCompany ? `${s.matchedCompany}: ` : "New signal: "}${s.title.slice(0, 140)}`,
        endContent: <Button size="sm" variant="ghost" label="Source" href={s.url} target="_blank" rel="noopener noreferrer" />,
      });
    }
  }, [feed.alerts, toast]);

  return null;
}
