import { Suspense } from "react";
import type { Metadata } from "next";
import { CopilotPage } from "@/components/copilot/CopilotPage";

export const metadata: Metadata = { title: "Co-Pilot & RAG | SingTech" };

// Reads ?account= from the URL, which needs a Suspense boundary under cacheComponents.
export default function CopilotRoute() {
  return (
    <Suspense>
      <CopilotPage />
    </Suspense>
  );
}
