import { Suspense } from "react";
import type { Metadata } from "next";
import { AiWorkspace } from "@/components/agent/AiWorkspace";

export const metadata: Metadata = { title: "AI Workspace | SingTech" };

// Reads ?ask= (sidebar bill shortcuts), which needs a Suspense boundary under cacheComponents.
export default function AiRoute() {
  return (
    <Suspense>
      <AiWorkspace />
    </Suspense>
  );
}
