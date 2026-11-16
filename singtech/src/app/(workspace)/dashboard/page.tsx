import { Suspense } from "react";
import type { Metadata } from "next";
import { OverviewRoute } from "@/components/overview/Overview";

export const metadata: Metadata = { title: "Overview | SingTech" };

// The overview reads ?account= from the URL, which needs a Suspense boundary under cacheComponents.
export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewRoute />
    </Suspense>
  );
}
