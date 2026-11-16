import type { Metadata } from "next";
import { ProposalsIndex } from "@/components/proposal/ProposalsIndex";

export const metadata: Metadata = { title: "Proposals | SingTech" };

export default function ProposalsPage() {
  return <ProposalsIndex />;
}
