import type { Metadata } from "next";
import { DealRoom } from "@/components/dealroom/DealRoom";

export const metadata: Metadata = { title: "Deal room | Singtel Enterprise" };

export default function DealRoomPage() {
  return <DealRoom />;
}
