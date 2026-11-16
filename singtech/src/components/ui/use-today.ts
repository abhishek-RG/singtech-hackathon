"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const today = () => new Date().toISOString().slice(0, 10);

// Reads the clock only in the browser (CLAUDE.md section 7): the server render gets undefined, never a prerendered date.
export function useToday(): string | undefined {
  return useSyncExternalStore(noop, today, () => undefined);
}
