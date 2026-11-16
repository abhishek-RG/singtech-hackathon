import type { Metadata } from "next";
import { AccountsTable } from "@/components/accounts/AccountsTable";

export const metadata: Metadata = { title: "Prospects | SingTech" };

export default function ProspectsPage() {
  return <AccountsTable scope="prospects" />;
}
