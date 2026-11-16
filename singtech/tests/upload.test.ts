import { describe, expect, it } from "vitest";
import { cleanUploadName, sniffUpload } from "@/lib/upload";

const bytes = (...parts: (string | number[])[]) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("upload sniffing", () => {
  it("recognises files by their bytes", () => {
    expect(sniffUpload(bytes("%PDF-1.7 ..."), "contract.pdf")).toBe("pdf");
    expect(sniffUpload(bytes([0x89], "PNG\r\n"), "x.png")).toBe("image");
    expect(sniffUpload(bytes([0xff, 0xd8, 0xff, 0xe0]), "x.jpg")).toBe("image");
    expect(sniffUpload(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "), "x.webp")).toBe("image");
    expect(sniffUpload(bytes("invoice,amount\nSGT-INV-2026-8841,9900"), "bills.csv")).toBe("csv");
    expect(sniffUpload(bytes("notes"), "notes.txt")).toBe("text");
  });

  it("rejects renamed binaries and unknown types", () => {
    expect(sniffUpload(bytes("MZ", [0, 0, 0]), "invoice.pdf")).toBeUndefined();
    expect(sniffUpload(bytes("a,b", [0], "c"), "data.csv")).toBeUndefined();
    expect(sniffUpload(bytes("<svg/>"), "logo.svg")).toBeUndefined();
  });

  it("keeps file names plain", () => {
    expect(cleanUploadName("../../etc/passwd<script>.pdf")).toBe("....etcpasswdscript.pdf");
    expect(cleanUploadName("")).toBe("upload");
  });
});

describe("more upload types", () => {
  it("recognises Excel, email and chat exports", () => {
    expect(sniffUpload(bytes("PK", [3, 4], "xl/"), "pipeline.xlsx")).toBe("sheet");
    expect(sniffUpload(bytes("PK", [3, 4]), "archive.zip")).toBeUndefined();
    expect(sniffUpload(bytes("From: a"), "thread.eml")).toBe("email");
    expect(sniffUpload(bytes("{}"), "result.json")).toBe("chat");
    expect(sniffUpload(bytes("12/11/26, 10:01 - Priya: hi"), "WhatsApp Chat.txt")).toBe("text");
  });

  it("keeps an email's people, date, subject and readable body", async () => {
    const { emailToText } = await import("@/lib/upload");
    const raw = "From: Priya <priya@example.com>\r\nTo: Sarah\r\nSubject: Invoice=20query\r\nDate: Mon, 16 Nov 2026\r\nX-Mailer: x\r\nContent-Type: multipart/alternative; boundary=\"b1\"\r\n\r\n--b1abcdef\r\nContent-Type: text/plain\r\n\r\nThe credit for INC-2026-0814 is not=\r\n netted.\r\n--b1abcdef--";
    const out = emailToText(raw);
    expect(out).toContain("From: Priya <priya@example.com>");
    expect(out).toContain("Subject: Invoice=20query");
    expect(out).not.toContain("X-Mailer");
    expect(out).toContain("The credit for INC-2026-0814 is not netted.");
  });

  it("turns a Telegram export into dated lines", async () => {
    const { chatExportToText } = await import("@/lib/upload");
    const json = JSON.stringify({ name: "Meridian AP", messages: [{ date: "2026-11-12T10:01:00", from: "Priya", text: "Site code is ready" }, { date: "2026-11-12T10:03:00", from: "Sarah", text: ["Thanks, ", { text: "reissuing" }] }] });
    expect(chatExportToText(json)).toBe("Telegram chat: Meridian AP\n2026-11-12 10:01 Priya: Site code is ready\n2026-11-12 10:03 Sarah: Thanks, reissuing");
    expect(chatExportToText("not json")).toBe("not json");
  });
});
