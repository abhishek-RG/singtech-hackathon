import type { Metadata } from "next";
import { ProspectAnalyzer } from "@/components/prospect/ProspectAnalyzer";

export const metadata: Metadata = { title: "New prospect | SingTech" };

export default function NewProspectPage() {
  return <ProspectAnalyzer />;
}
