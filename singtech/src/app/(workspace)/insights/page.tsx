import type { Metadata } from "next";
import { ImpactDashboard } from "@/components/impact/ImpactDashboard";

export const metadata: Metadata = { title: "Impact | SingTech" };

export default function ImpactPage() {
  return <ImpactDashboard />;
}
