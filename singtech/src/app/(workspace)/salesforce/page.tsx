import type { Metadata } from "next";
import { SalesforceView } from "@/components/salesforce/SalesforceView";

export const metadata: Metadata = { title: "Salesforce | SingTech" };

export default function SalesforcePage() {
  return <SalesforceView />;
}
