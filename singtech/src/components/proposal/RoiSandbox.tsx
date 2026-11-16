"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import { CheckCircle2 } from "lucide-react";
import { getProduct, getRegulation } from "@/lib/data-service";
import { formatSgd, newId } from "@/lib/format";
import { COMPLIANCE_SHORT } from "@/lib/labels";
import { computeRoi, getScenario } from "@/lib/roi";
import type { Company, PilotTicket } from "@/types/singtech";

const SLIDER = {
  "bandwidth-gbps": { unit: " Gbps", sliderLabel: "Bandwidth commitment" },
  "gpu-h100": { unit: " GPUs", sliderLabel: "Dedicated GPU capacity" },
  "tokens-m": { unit: "M tokens / month", sliderLabel: "AI token volume (RE:AI TaaS)" },
} as const;

function Topology({ company, mode }: { company: Company; mode: "before" | "after" }) {
  const ends = company.corridorLabel.split("<->").map((s) => s.trim());
  const [origin, destination] = [ends[0], ends.at(-1) ?? "Singapore"];
  const after = mode === "after";
  const products = company.recommendedBundle.products.map((id) => getProduct(id)!.shortName);
  const current =
    company.mode === "farming" && company.telemetryAlerts[0]
      ? `Current link: ${company.telemetryAlerts[0].currentValue}`
      : "Current path: public internet and best-effort links";
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <div className="rounded-lg border border-border bg-surface p-3 text-center text-[13px] font-semibold text-primary sm:w-40">{origin}</div>
      <div className="flex-1 text-center">
        <div className={`mx-auto h-0 border-t-4 ${after ? "border-solid border-st-verified" : "border-dashed border-st-red"} transition-colors duration-180`} />
        <div className={`mt-2 text-[12px] font-semibold ${after ? "text-st-verified" : "text-primary"}`}>
          {after ? products.join(" + ") : current}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-3 text-center text-[13px] font-semibold text-primary sm:w-40">{destination}</div>
    </div>
  );
}

export function RoiSandbox({ company }: { company: Company }) {
  const { scenario, isIllustrative } = getScenario(company);
  const [capacity, setCapacity] = useState(scenario.slider.default);
  const [view, setView] = useState<"before" | "after">("after");
  const [ticket, setTicket] = useState<PilotTicket>();
  const roi = computeRoi(scenario, capacity);
  const { unit, sliderLabel } = SLIDER[scenario.slider.kind];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-primary">Current Infrastructure vs. Singtel Upgraded Architecture</h2>
          <SegmentedControl label="Architecture view" size="sm" value={view} onChange={(v) => setView(v as "before" | "after")}>
            <SegmentedControlItem value="before" label="Current Infrastructure" />
            <SegmentedControlItem value="after" label="Singtel Upgraded Architecture" />
          </SegmentedControl>
        </div>
        <Topology company={company} mode={view} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={`border-t-2 pt-3 ${view === "before" ? "border-st-red" : "border-border"}`}>
            <div className="text-[12px] text-secondary">Current bottleneck</div>
            <div className="tabular text-2xl font-semibold text-primary">
              {scenario.bottleneck.value} {scenario.bottleneck.unit}
            </div>
            <div className="text-[12px] text-secondary">{scenario.bottleneck.label}</div>
          </div>
          <div className={`border-t-2 pt-3 ${view === "after" ? "border-st-verified" : "border-border"}`}>
            <div className="text-[12px] text-secondary">Projected at your commitment</div>
            <div className="tabular text-2xl font-semibold text-st-verified">
              {roi.projectedValue} {scenario.bottleneck.unit}
            </div>
            <div className="text-[12px] text-secondary">{scenario.target.label}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-3 text-[16px] font-semibold text-primary">Capacity and AI token commitment</h2>
        <Slider
          label={sliderLabel}
          value={capacity}
          onChange={(v: number) => setCapacity(v)}
          min={scenario.slider.min}
          max={scenario.slider.max}
          step={scenario.slider.step}
          formatValue={(v) => `${v}${unit}`}
          valueDisplay="text"
          width="100%"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="border-t border-border pt-3">
            <div className="text-[12px] text-secondary">Projected reduction</div>
            <div className="tabular text-2xl font-semibold text-primary">-{roi.reductionPct}%</div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="text-[12px] text-secondary">Annual cost avoided</div>
            <div className="tabular text-2xl font-semibold text-primary">{formatSgd(roi.annualSavingsSgd)}</div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="text-[12px] text-secondary">Compliance clearance</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {roi.frameworksCleared.map((code) => (
                <a
                  key={code}
                  href={getRegulation(code)!.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={getRegulation(code)!.name}
                  className="inline-flex items-center gap-1 rounded border border-st-verified/25 bg-st-verified-fill px-1.5 py-0.5 text-[11px] font-semibold text-st-verified"
                >
                  <CheckCircle2 aria-hidden className="size-3" /> {COMPLIANCE_SHORT[code]}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-secondary">
          {isIllustrative
            ? "Illustrative model using generic corridor assumptions. Singtel will validate every figure with your team in discovery."
            : "Modelled from your CUBΣ and Paragon usage. Figures are estimates for discussion, not a quote."}
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div>
          <h2 className="text-[16px] font-semibold text-primary">Try it on your own traffic</h2>
          <p className="text-[13px] text-secondary">A 14-day sandbox on Singtel Paragon and RE:AI with your engineers and ours.</p>
        </div>
        {ticket ? (
          <div role="status" className="rounded-lg border border-st-verified/25 bg-surface p-3 text-[13px] text-primary">
            <div className="font-semibold">Pilot request received</div>
            <div className="tabular text-secondary">
              <span className="font-id">{ticket.ticketId}</span>, {new Date(ticket.createdAt).toLocaleString("en-SG")}
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            label="Request a 14-day sandbox pilot"
            onClick={() => setTicket({ ticketId: newId("SGT-PILOT").toUpperCase(), companyId: company.id, createdAt: new Date().toISOString() })}
          />
        )}
      </section>
    </div>
  );
}
