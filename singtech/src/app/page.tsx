import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "SingTech AI | Account intelligence for Singtel Enterprise",
  description: "SingTech AI explains each enterprise account's health, keeps every customer conversation on one timeline, and recommends the next action, with every insight tied to its source.",
};

// The product site; "Open the dashboard" goes to /dashboard.
export default function HomePage() {
  return <Landing />;
}
