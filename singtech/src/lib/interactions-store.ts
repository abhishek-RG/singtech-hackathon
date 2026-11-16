import { randomUUID } from "node:crypto";
import { appendRecord, readRecords } from "./local-store";
import { repNotesText, type RepInteraction, type RepInteractionInput } from "./timeline";

// Rep-added timeline entries (pasted emails, notes, transcripts, read screenshots) in .data/interactions.json, newest first.
const FILE = "interactions.json";

export async function readRepInteractions(accountId: string): Promise<RepInteraction[]> {
  return (await readRecords<RepInteraction>(FILE)).filter((r) => r.accountId === accountId);
}

export async function addRepInteraction(input: RepInteractionInput): Promise<RepInteraction> {
  const record: RepInteraction = { ...input, id: `rep-${randomUUID().slice(0, 13)}`, createdAt: new Date().toISOString() };
  await appendRecord(FILE, record, 2000);
  return record;
}

/** The account's rep-added entries as retrieval text; empty when there are none. */
export const repNotes = async (accountId: string) => repNotesText(await readRepInteractions(accountId), accountId);
