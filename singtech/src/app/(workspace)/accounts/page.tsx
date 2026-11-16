import type { Metadata } from "next";
import { AccountsTable } from "@/components/accounts/AccountsTable";

export const metadata: Metadata = { title: "Accounts | SingTech" };

export default function AccountsPage() {
  return <AccountsTable scope="all" />;
}
