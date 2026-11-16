"use client";

import type { ReactNode } from "react";
import { AppShell as AstryxAppShell } from "@astryxdesign/core/AppShell";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { AppStoreProvider } from "@/state/app-store";
import { AgentLauncher } from "../agent/AgentLauncher";
import { AgentProvider } from "../agent/AgentProvider";
import { PresentationMode } from "../agent/PresentationMode";
import { NewsTicker } from "./NewsTicker";
import { PlaybookDrawer } from "./PlaybookDrawer";
import { SignalWatcher } from "./SignalWatcher";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// Astryx AppShell owns layout, scroll containers, and the mobile drawer (it reuses the SideNav below 1024px).
// The live news bar sits directly under the top bar; the SingTech AI launcher and presentation HUD float over every page.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStoreProvider>
      <AgentProvider>
        <AstryxAppShell variant="wash" height="fill" contentPadding={0} sideNav={<Sidebar />} topNav={<Topbar />}>
          <NewsTicker />
          {children}
        </AstryxAppShell>
        <PlaybookDrawer />
        <SignalWatcher />
        <AgentLauncher />
        <PresentationMode />
        <ToastViewport />
      </AgentProvider>
    </AppStoreProvider>
  );
}
