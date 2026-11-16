"use client";

import { Drawer } from "@astryxdesign/core/Drawer";
import { MousePointer2 } from "lucide-react";
import { AgentChat } from "./AgentChat";
import { useAgent } from "./AgentProvider";

// Floating SingTech AI button on every workspace screen; on phones it sits above the sticky record action bar.
export function AgentLauncher() {
  const { isLauncherOpen, setLauncherOpen, runState } = useAgent();
  const isBusy = runState?.state === "running" || runState?.state === "waiting";
  return (
    <>
      <button
        type="button"
        onClick={() => setLauncherOpen(true)}
        aria-label="Open SingTech AI"
        className="fixed right-4 bottom-20 z-40 flex h-12 items-center gap-2 rounded-full border border-white/15 bg-[#10151d] pr-4 pl-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(11,15,21,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 lg:right-6 lg:bottom-6"
      >
        <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-st-red">
          <MousePointer2 className="size-4" />
        </span>
        <span className="max-sm:sr-only">SingTech AI</span>
        {isBusy && <span aria-hidden className="st-pulse size-1.5 rounded-full bg-[#34d399]" />}
      </button>
      <Drawer isOpen={isLauncherOpen} onOpenChange={setLauncherOpen} label="SingTech AI" width={460} padding={0} experimental={{ isFullWidthOnMobile: true }}>
        <AgentChat variant="drawer" />
      </Drawer>
    </>
  );
}
