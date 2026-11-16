import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountView } from "@/components/accounts/AccountView";

export const metadata: Metadata = { title: "Customers | SingTech" };

// AccountView reads ?account= from the URL, which needs a Suspense boundary under cacheComponents.
export default function CustomersPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  );
}
