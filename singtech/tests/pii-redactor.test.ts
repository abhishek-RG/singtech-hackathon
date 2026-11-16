import { describe, expect, it } from "vitest";
import { buildAuditRecord, sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { PiiAuditRecordSchema } from "@/types/singtech";

const redact = (input: string) => sanitizeEnterprisePayload(input).sanitizedText;

describe("sanitizeEnterprisePayload", () => {
  it.each([
    ["email", "Contact vikram.mehta@aeropulse.example.com today", "[REDACTED_EMAIL_PDPA]"],
    ["SG NRIC", "NRIC S1234567D on file", "[REDACTED_NRIC_PDPA]"],
    ["SG FIN", "FIN G7654321K holder", "[REDACTED_NRIC_PDPA]"],
    ["SG FIN (M series)", "FIN M1234567X", "[REDACTED_NRIC_PDPA]"],
    ["Indian PAN", "PAN ABCPE1234F for billing", "[REDACTED_PAN_DPDP]"],
    ["Aadhaar spaced", "Aadhaar 2345 6789 0123", "[REDACTED_AADHAAR_DPDP]"],
    ["Aadhaar dashed", "Aadhaar 2345-6789-0123", "[REDACTED_AADHAAR_DPDP]"],
    ["Aadhaar plain", "Aadhaar 234567890123", "[REDACTED_AADHAAR_DPDP]"],
    ["SG mobile intl", "Call +65 9123 4567", "[REDACTED_PHONE_DPDP]"],
    ["SG landline intl dashed", "Office +65-6838-3388", "[REDACTED_PHONE_DPDP]"],
    ["SG mobile local", "Mobile 9123 4567", "[REDACTED_PHONE_DPDP]"],
    ["India mobile intl", "WhatsApp +91 98765 43210", "[REDACTED_PHONE_DPDP]"],
    ["India mobile local", "Mobile 9876543210", "[REDACTED_PHONE_DPDP]"],
    ["IPv4", "Edge router at 10.24.3.191 dropped packets", "[REDACTED_IPV4_CII]"],
    ["CRM ID", "Account SGT-ACC-0042913 renewal", "[HASHED_CRM_ID]"],
  ])("redacts %s", (_label, input, token) => {
    const out = redact(input);
    expect(out).toContain(token);
    expect(sanitizeEnterprisePayload(input).redactedCount).toBe(1);
  });

  it("removes every raw identifier from a mixed CRM note", () => {
    const raw =
      "Vikram (vikram@aeropulse.example.com, +65 9123 4567, NRIC S1234567D) owns SGT-ACC-77812. " +
      "India contact PAN ABCPE1234F, Aadhaar 2345 6789 0123, +91 98765 43210. Jump host 192.168.10.4.";
    const { sanitizedText, redactedCount } = sanitizeEnterprisePayload(raw);
    for (const leaked of [
      "vikram@aeropulse.example.com",
      "9123 4567",
      "S1234567D",
      "SGT-ACC-77812",
      "ABCPE1234F",
      "2345 6789 0123",
      "98765 43210",
      "192.168.10.4",
    ]) {
      expect(sanitizedText).not.toContain(leaked);
    }
    expect(redactedCount).toBe(8);
  });

  it.each([
    "Bundle ARR SGD 425,000 with 4.2 ms jitter",
    "Renewal in 62 days, 94.2% VSAT saturation, 48 TB/week",
    "Products SGT-CONN-02 and SGT-CYBER-01",
    "Published 2026-01-15, Tower 2 at 37 MW IT load",
    "Ticket SGT-DEAL-20261115-0042",
  ])("leaves business data untouched: %s", (input) => {
    const { sanitizedText, redactedCount } = sanitizeEnterprisePayload(input);
    expect(sanitizedText).toBe(input);
    expect(redactedCount).toBe(0);
  });

  it("is stable when run twice (no state leaks between calls)", () => {
    const input = "Mail ops@example.com";
    expect(sanitizeEnterprisePayload(input)).toEqual(sanitizeEnterprisePayload(input));
  });

  it("reports the enforced policies", () => {
    expect(sanitizeEnterprisePayload("x").policies).toEqual([
      "SG_PDPA_COMPLIANT",
      "INDIA_DPDP_2023_SAFE",
      "ZERO_RAW_PII_EGRESS",
    ]);
  });
});

describe("buildAuditRecord", () => {
  it("produces a valid audit record with truncated snippets", () => {
    const raw = `${"a".repeat(400)} ops@example.com`;
    const { record, sanitizedText } = buildAuditRecord(raw, "webhook-crm");
    expect(PiiAuditRecordSchema.parse(record)).toEqual(record);
    expect(record.redactedEntities).toBe(1);
    expect(record.rawSnippet.length).toBeLessThanOrEqual(281);
    expect(sanitizedText).toContain("[REDACTED_EMAIL_PDPA]");
  });
});
