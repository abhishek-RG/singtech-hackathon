import { Suspense } from "react";
import type { Metadata } from "next";
import { ProposalBuilder } from "@/components/proposal/ProposalBuilder";

export const metadata: Metadata = { title: "Proposal builder | SingTech" };

// Builder state lives in the browser store, so the record resolves on the client.
export default function ProposalBuilderPage({ params }: PageProps<"/proposals/[id]">) {
  return <Suspense>{params.then(({ id }) => <ProposalBuilder id={decodeURIComponent(id)} />)}</Suspense>;
}
