"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import logos from "@/data/logos.json";
import { getCompany } from "@/lib/data-service";

type LogoEntry = { domain: string; file: string };
type Glyph = "diamond" | "wave" | "chevron" | "ring" | "hex" | "bars" | "arc";
type SampleEntry = { monogram: string; glyph: Glyph; from: string; to: string };

const COMPANIES: Record<string, LogoEntry> = logos.companies;
const SAMPLES = logos.samples as Record<string, SampleEntry>;
// Real prospects are also matched by name (news items carry a company name, not an id), first word included ("Juspay Technologies").
const BY_NAME = Object.entries(COMPANIES).flatMap(([id, entry]) => {
  const name = getCompany(id)?.companyName;
  return name ? [[name.toLowerCase(), entry] as const] : [];
});
const PARTNERS = Object.entries(logos.partners as Record<string, LogoEntry>);

const startsWithWord = (name: string, key: string) => name === key || name.startsWith(`${key} `);

// Real companies resolve by record id or name; partners by the leading words of their name ("NCS Cloud Practice" is NCS).
// Fictional sample accounts and session-added prospects have no entry, so they render a designed monogram mark.
export function logoFor({ id, name }: { id?: string; name: string }): LogoEntry | undefined {
  if (id && COMPANIES[id]) return COMPANIES[id];
  if (id?.startsWith("acct-")) return undefined;
  const lower = name.toLowerCase();
  return BY_NAME.find(([n]) => startsWithWord(lower, n) || startsWithWord(n, lower))?.[1] ?? PARTNERS.find(([key]) => startsWithWord(name, key))?.[1];
}

const GLYPHS: Record<Glyph, React.ReactNode> = {
  diamond: <polygon points="20,2 38,20 20,38 2,20" fill="none" strokeWidth="2" />,
  wave: <path d="M-2 29 Q6 21 14 29 T30 29 T46 29" fill="none" strokeWidth="2.5" />,
  chevron: <path d="M4 12 L20 26 L36 12" fill="none" strokeWidth="3" />,
  ring: <circle cx="29" cy="11" r="10" fill="none" strokeWidth="2.5" />,
  hex: <polygon points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5" fill="none" strokeWidth="2" />,
  bars: <path d="M27 34 V22 M32 34 V16 M37 34 V10" fill="none" strokeWidth="3" />,
  arc: <path d="M2 38 A 36 36 0 0 1 38 2" fill="none" strokeWidth="3" />,
};

// Unknown names (prospects added in this session) still get a stable, distinct mark from a hash of the name.
const FALLBACK_TONES = [
  ["#0E2A47", "#1F4E79"],
  ["#063B4F", "#0F6E8C"],
  ["#0B4F4A", "#13857C"],
  ["#14532D", "#22863A"],
  ["#7C2D12", "#C2581C"],
  ["#1F2937", "#4B5563"],
] as const;

function sampleFor(id: string | undefined, name: string): SampleEntry {
  if (id && SAMPLES[id]) return SAMPLES[id];
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const words = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  const [from, to] = FALLBACK_TONES[hash % FALLBACK_TONES.length];
  const glyphs = Object.keys(GLYPHS) as Glyph[];
  return { monogram: (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase(), glyph: glyphs[hash % glyphs.length], from, to };
}

export function SampleMark({ id, name, size }: { id?: string; name: string; size: number }) {
  const s = sampleFor(id, name);
  const gid = `mark-${(id ?? name).replace(/[^\w-]/g, "")}`;
  return (
    <svg role="img" aria-label={id?.startsWith("acct-") ? `${name}, sample account` : name} width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={s.from} />
          <stop offset="1" stopColor={s.to} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <rect width="40" height="40" rx="9" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="9" fill={`url(#${gid})`} />
      <g clipPath={`url(#${gid}-clip)`} stroke="#ffffff" strokeOpacity="0.28" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[s.glyph]}
      </g>
      <rect x="0.5" y="0.5" width="39" height="39" rx="8.5" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      <text x="20" y="25.5" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="800" letterSpacing="-0.4" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
        {s.monogram}
      </text>
    </svg>
  );
}

export function CompanyLogo({ id, name, size = 24 }: { id?: string; name: string; size?: 16 | 20 | 24 | 32 | 36 | 40 | 48 }) {
  const logo = logoFor({ id, name });
  if (!logo) return <SampleMark id={id} name={name} size={size} />;
  return <Avatar name={name} src={logo.file} size={size} shape="rounded" tooltip={false} />;
}
