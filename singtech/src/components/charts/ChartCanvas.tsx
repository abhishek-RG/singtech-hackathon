"use client";

import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ChartType,
} from "chart.js";

// Tree-shaken registration: bars and lines only. No pie, donut, or gauge charts (CLAUDE.md section 2).
Chart.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip, Legend);

Chart.defaults.font.size = 12;
Chart.defaults.color = "#525866";
Chart.defaults.borderColor = "#E2E4E9";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "#FFFFFF";
Chart.defaults.plugins.tooltip.titleColor = "#0A0A0C";
Chart.defaults.plugins.tooltip.bodyColor = "#2B2F38";
Chart.defaults.plugins.tooltip.borderColor = "#E2E4E9";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.caretSize = 0;
Chart.defaults.plugins.tooltip.boxPadding = 4;

// One neutral series colour; red only for the highlighted or at-risk series.
export const PALETTE = { neutral: "#8A8F9C", ink: "#475467", red: "#E60012", line: "#EEF0F4" };

interface Props<T extends ChartType> {
  type: T;
  data: ChartData<T>;
  options?: ChartOptions<T>;
  label: string;
  className?: string;
}

// Creates the chart once, then pushes data and option changes so updates animate instead of redrawing from zero.
export function ChartCanvas<T extends ChartType>({ type, data, options, label, className = "h-56" }: Props<T>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart<T> | null>(null);

  useEffect(() => {
    // next/font hashes the Plex family name, so read the resolved stack instead of hardcoding it.
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    // Chart.js animates in JS, so the CSS prefers-reduced-motion rule never reaches it.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) Chart.defaults.animation = false;
    const c = new Chart<T>(canvas.current!, { type, data, options: { maintainAspectRatio: false, ...options } as ChartOptions<T> });
    chart.current = c;
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once per type; the effect below applies updates
  }, [type]);

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.data = data;
    c.options = { maintainAspectRatio: false, ...options } as ChartOptions<T>;
    c.update();
  }, [data, options]);

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
