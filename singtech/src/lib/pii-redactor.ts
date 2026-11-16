import { newId } from "@/lib/format";
import type { PiiAuditRecord } from "@/types/singtech";

// Order matters: specific identifiers run before the generic phone patterns that could match parts of them.
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL_PDPA]"],
  [/\b[STFGM]\d{7}[A-Z]\b/gi, "[REDACTED_NRIC_PDPA]"],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "[REDACTED_PAN_DPDP]"],
  // Same separator throughout, so date-like IDs such as 20261115-0042 are not taken for Aadhaar numbers.
  [/\b[2-9]\d{3}([ -]?)\d{4}\1\d{4}\b/g, "[REDACTED_AADHAAR_DPDP]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IPV4_CII]"],
  [/\+\d{1,3}[\s-]?\d{2,5}(?:[\s-]?\d{2,5}){1,3}\b/g, "[REDACTED_PHONE_DPDP]"],
  [/\b[6-9]\d{4}[\s-]?\d{5}\b/g, "[REDACTED_PHONE_DPDP]"],
  [/\b[3689]\d{3}[\s-]?\d{4}\b/g, "[REDACTED_PHONE_DPDP]"],
  [/\bSGT-ACC-\d{4,10}\b/g, "[HASHED_CRM_ID]"],
];

const POLICIES = ["SG_PDPA_COMPLIANT", "INDIA_DPDP_2023_SAFE", "ZERO_RAW_PII_EGRESS"];
const SNIPPET_LIMIT = 280;

export function sanitizeEnterprisePayload(rawInput: string): {
  sanitizedText: string;
  redactedCount: number;
  policies: string[];
} {
  let redactedCount = 0;
  let sanitizedText = rawInput;
  for (const [pattern, replacement] of RULES) {
    sanitizedText = sanitizedText.replace(pattern, () => {
      redactedCount += 1;
      return replacement;
    });
  }
  return { sanitizedText, redactedCount, policies: [...POLICIES] };
}

const snippet = (text: string) => (text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text);

// Server routes only. rawSnippet goes back solely to the requesting browser for the audit modal; never log it or send it onward.
export function buildAuditRecord(
  rawInput: string,
  route: PiiAuditRecord["route"],
): { record: PiiAuditRecord; sanitizedText: string } {
  const { sanitizedText, redactedCount, policies } = sanitizeEnterprisePayload(rawInput);
  return {
    sanitizedText,
    record: {
      id: newId("pii"),
      timestamp: new Date().toISOString(),
      route,
      rawSnippet: snippet(rawInput),
      sanitizedSnippet: snippet(sanitizedText),
      redactedEntities: redactedCount,
      enforcedPolicies: policies,
    },
  };
}
