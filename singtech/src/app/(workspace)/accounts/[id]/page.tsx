import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountRecordView } from "@/components/account/AccountRecord";

export const metadata: Metadata = { title: "Account | SingTech" };

// Ids include prospects added in this browser session, so the record resolves on the client from the store.
export default function AccountRecordPage({ params }: PageProps<"/accounts/[id]">) {
  return <Suspense>{params.then(({ id }) => <AccountRecordView id={decodeURIComponent(id)} />)}</Suspense>;
}
