import { FileText, Image as ImageIcon, LifeBuoy, Mail, MessageCircle, Mic, Newspaper, Phone, Receipt, Send, StickyNote, TriangleAlert, UserMinus, Users, type LucideIcon } from "lucide-react";
import type { Channel } from "@/lib/timeline";

// One icon and tint per channel; tints come from the status palette so the timeline reads with the rest of the app.
const MARKS: Record<Channel, { icon: LucideIcon; label: string; tint: string }> = {
  Email: { icon: Mail, label: "Email", tint: "text-st-red-ink" },
  "Phone call": { icon: Phone, label: "Phone call", tint: "text-st-red-ink" },
  WhatsApp: { icon: MessageCircle, label: "WhatsApp", tint: "text-st-verified" },
  Telegram: { icon: Send, label: "Telegram", tint: "text-[#2563EB]" },
  Meeting: { icon: Users, label: "Meeting", tint: "text-primary" },
  "Support case": { icon: LifeBuoy, label: "Support case", tint: "text-st-warning" },
  Incident: { icon: TriangleAlert, label: "SLA incident", tint: "text-st-red-ink" },
  Invoice: { icon: Receipt, label: "Invoice", tint: "text-primary" },
  "Contact change": { icon: UserMinus, label: "Contact change", tint: "text-st-warning" },
  News: { icon: Newspaper, label: "Public source", tint: "text-primary" },
  Notes: { icon: StickyNote, label: "Notes", tint: "text-primary" },
  Transcript: { icon: Mic, label: "Call transcript", tint: "text-st-red-ink" },
  Screenshot: { icon: ImageIcon, label: "Screenshot", tint: "text-primary" },
  Document: { icon: FileText, label: "Document", tint: "text-primary" },
};

export const channelLabel = (c: Channel) => MARKS[c].label;

export function ChannelMark({ channel }: { channel: Channel }) {
  const { icon: Icon, label, tint } = MARKS[channel];
  return (
    <span title={label} className={`relative z-[1] grid size-[34px] place-items-center rounded-full border border-st-line bg-white ${tint}`}>
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
