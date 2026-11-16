// What a rep may drop into the AI chat: PDFs (contracts, invoices), CSV or text exports, and images (invoice screenshots).
// Also email (.eml), Excel (.xlsx), and chat exports: WhatsApp exports are .txt, Telegram exports are result.json.
export type UploadKind = "pdf" | "csv" | "text" | "image" | "sheet" | "email" | "chat";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_UPLOAD_TEXT = 24_000;
export const UPLOAD_ACCEPT = ".pdf,.csv,.tsv,.txt,.md,.xlsx,.eml,.json,image/png,image/jpeg,image/webp";

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

// Trusts the file's bytes, never its name or browser-reported type, except to tell CSV from plain text.
export function sniffUpload(bytes: Uint8Array, name: string): UploadKind | undefined {
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "image";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image";
  // .xlsx is a zip archive ("PK\x03\x04"); the name tells it apart from other zip files.
  if (ascii(bytes, 0, 4) === "PK\x03\x04" && /\.xlsx$/i.test(name)) return "sheet";
  if (bytes.slice(0, 8192).includes(0)) return undefined;
  if (/\.(csv|tsv)$/i.test(name)) return "csv";
  if (/\.eml$/i.test(name)) return "email";
  if (/\.json$/i.test(name)) return "chat";
  if (/\.(txt|md)$/i.test(name)) return "text";
  return undefined;
}

// An .eml file: keep who, when and subject, then the readable body (plain-text MIME parts, quoted-printable undone).
export function emailToText(raw: string): string {
  const [head, ...rest] = raw.replace(/\r\n/g, "\n").split(/\n\n/);
  const headers = head.replace(/\n[ \t]+/g, " ").split("\n");
  const keep = headers.filter((h) => /^(From|To|Cc|Date|Subject):/i.test(h));
  const body = rest
    .join("\n\n")
    .split("\n")
    .filter((line) => !/^--[\w'()+,./:=?-]{6,}/.test(line) && !/^Content-(Type|Transfer-Encoding|Disposition|ID):/i.test(line))
    .join("\n")
    .replace(/=\n/g, "")
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return [...keep, "", body].join("\n").trim();
}

// A Telegram chat export (result.json): one "date sender: text" line per message. Anything else stays as raw JSON text.
export function chatExportToText(raw: string): string {
  try {
    const data = JSON.parse(raw) as { name?: string; messages?: { date?: string; from?: string; text?: string | (string | { text?: string })[] }[] };
    if (!Array.isArray(data.messages)) return raw;
    const text = (t: unknown) => (typeof t === "string" ? t : Array.isArray(t) ? t.map((p) => (typeof p === "string" ? p : (p?.text ?? ""))).join("") : "");
    const lines = data.messages.map((m) => `${(m.date ?? "").slice(0, 16).replace("T", " ")} ${m.from ?? "Unknown"}: ${text(m.text)}`.trim()).filter((l) => !/:\s*$/.test(l));
    return [data.name ? `Telegram chat: ${data.name}` : "Telegram chat", ...lines].join("\n");
  } catch {
    return raw;
  }
}

export const cleanUploadName = (name: string) => name.replace(/[^\w.\- ]/g, "").slice(0, 120) || "upload";
