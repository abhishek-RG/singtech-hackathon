import readXlsxFile from "read-excel-file/node";
import { extractText, getDocumentProxy } from "unpdf";
import { buildAuditRecord } from "@/lib/pii-redactor";
import { gateway, isGatewayConfigured } from "@/lib/rag";
import { chatExportToText, cleanUploadName, emailToText, MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES, MAX_UPLOAD_TEXT, sniffUpload, type UploadKind } from "@/lib/upload";

const fail = (status: number, error: string) => Response.json({ error }, { status });

async function readText(kind: UploadKind, bytes: Uint8Array): Promise<string> {
  if (kind === "pdf") {
    const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
    return text;
  }
  if (kind === "image") {
    // Pixels cannot be redacted, so images go only to the self-hosted GPU box; the transcription is redacted below like any text.
    return (await gateway<{ text: string }>("/v1/vision", { image_b64: Buffer.from(bytes).toString("base64") }, 90_000)).text;
  }
  if (kind === "sheet") {
    // Each sheet becomes CSV-like rows under its name; 500 rows per sheet is plenty for a question about it.
    const sheets = await readXlsxFile(Buffer.from(bytes));
    return sheets.map((s) => [`Sheet: ${s.sheet}`, ...s.data.slice(0, 500).map((row) => row.map((cell) => String(cell ?? "")).join(", "))].join("\n")).join("\n\n");
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  if (kind === "email") return emailToText(text);
  if (kind === "chat") return chatExportToText(text);
  return text;
}

// Returns redacted text the chat sends along with the next question. Nothing is stored on the server.
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 65_536) return fail(413, "Files up to 8 MB.");
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail(400, "Attach one file.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Files up to 8 MB.");
  const name = cleanUploadName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffUpload(bytes, name);
  if (!kind) return fail(415, "Upload a PDF, Excel, CSV, email (.eml), chat export (.txt or .json), or a PNG, JPEG or WebP image.");
  if (kind === "image" && bytes.length > MAX_IMAGE_BYTES) return fail(413, "Images up to 6 MB.");
  if (kind === "image" && !isGatewayConfigured()) return fail(503, "Reading images needs the GPU service, which is not configured here. Upload a PDF or CSV instead.");

  let raw: string;
  try {
    raw = await readText(kind, bytes);
  } catch {
    return fail(422, kind === "image" ? "The image could not be read right now. Try again or upload a PDF." : "The file could not be read.");
  }
  const text = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return fail(422, "No readable text found in the file.");
  const { record: audit, sanitizedText } = buildAuditRecord(text.slice(0, MAX_UPLOAD_TEXT), "file-upload");
  return Response.json({ name, kind, chars: sanitizedText.length, isTruncated: text.length > MAX_UPLOAD_TEXT, text: sanitizedText, audit });
}
