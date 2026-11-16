import type { Metadata } from "next";
import { CoverageMap } from "@/components/insights/CoverageMap";

export const metadata: Metadata = { title: "Coverage map | SingTech" };

export default function CoverageMapPage() {
  return <CoverageMap />;
}
