import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesCopilot } from "@/components/sales-copilot/SalesCopilot";

export const metadata: Metadata = { title: "Sales Copilot | SingTech" };

// Suspense: the account comes from ?account= (useSearchParams).
export default function SalesCopilotPage() {
  return (
    <Suspense>
      <SalesCopilot />
    </Suspense>
  );
}
