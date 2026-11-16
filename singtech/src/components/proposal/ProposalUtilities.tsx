"use client";

import { Printer } from "lucide-react";

// Customer proposals go into meetings: the browser's print dialog also saves a PDF. The button itself never prints.
export function ProposalUtilities() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Print or save this proposal as a PDF"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-[13px] font-medium text-white hover:bg-white/20 print:hidden"
    >
      <Printer aria-hidden className="size-4" />
      Print / save PDF
    </button>
  );
}
