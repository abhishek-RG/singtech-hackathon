const sgd = new Intl.NumberFormat("en-SG", { maximumFractionDigits: 0 });

export const formatSgd = (n: number) => `SGD ${sgd.format(n)}`;

// Rounds in whole units before formatting: 5.395.toFixed(2) is "5.39" in floating point.
export const formatSgdCompact = (n: number) =>
  n >= 999_500 ? `SGD ${(Math.round(n / 10_000) / 100).toFixed(2)}M` : `SGD ${Math.round(n / 1000)}K`;

export const formatMinutesAgo = (m: number) =>
  m === 0 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;

// Not crypto.randomUUID: it is missing on plain-HTTP origins, such as a judge's phone on the LAN.
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Enforces CLAUDE.md copy rules on model-generated text: no em/en dashes, emoji, or exclamation marks.
export const sanitizeCopy = (text: string) =>
  text
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "")
    .replace(/!/g, ".");
