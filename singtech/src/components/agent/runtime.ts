"use client";

import type { Target } from "@/lib/agent/plan";

// DOM helpers for the SingTech AI cursor. Only ever acts on this app's own elements; never reads secrets or other origins.

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

export function findTarget(t: Target): HTMLElement | undefined {
  const all = [...document.querySelectorAll<HTMLElement>(t.css)].filter(isVisible);
  if (!t.text) return all[0];
  const needle = t.text.toLowerCase();
  // Innermost match wins, so a row beats the table that contains it.
  const hits = all.filter((el) => el.textContent?.toLowerCase().includes(needle));
  return hits.find((el) => !hits.some((other) => other !== el && el.contains(other))) ?? hits[0];
}

export async function waitFor(t: Target, timeoutMs: number, isStopped: () => boolean): Promise<HTMLElement | undefined> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until && !isStopped()) {
    const el = findTarget(t);
    if (el) return el;
    await sleep(100);
  }
  return undefined;
}

export async function waitForPath(href: string, timeoutMs: number) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until && window.location.pathname !== href) await sleep(80);
  return window.location.pathname === href;
}

// Waits for a busy region (role=status inside it) to appear and then clear: an answer streaming in, a draft being written.
// It returns false on a rendered error or a timeout so a workflow cannot move on to a Salesforce approval after a failed read.
export async function waitIdle(t: Target, isStopped: () => boolean, maxMs = 30_000) {
  const busy = () => {
    const root = findTarget(t);
    // Astryx keeps empty role="status" live regions mounted; only a status with text, or aria-busy, means work in progress.
    return [...(root?.querySelectorAll('[role="status"], [aria-busy="true"]') ?? [])].some((e) => e.getAttribute("aria-busy") === "true" || Boolean(e.textContent?.trim()));
  };
  const failed = () => Boolean(findTarget(t)?.querySelector('[role="alert"]'));
  const appearBy = Date.now() + 1500;
  while (!busy() && !failed() && Date.now() < appearBy && !isStopped()) await sleep(80);
  if (isStopped() || failed()) return false;
  // A fast cached answer can render before the first poll. It is safe to continue; the following verify step checks it.
  if (!busy()) return true;
  const until = Date.now() + maxMs;
  while (busy() && !failed() && Date.now() < until && !isStopped()) await sleep(120);
  return !isStopped() && !failed() && !busy();
}

export async function bringIntoView(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const offscreen = r.top < 72 || r.bottom > window.innerHeight - 24;
  if (!offscreen) return;
  el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  await sleep(prefersReducedMotion() ? 50 : 450);
}

export const centerOf = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + Math.min(r.width / 2, 120)), y: Math.round(r.top + Math.min(r.height / 2, 28)) };
};

// React tracks input values through the native setter; setting .value directly would be ignored on the next render.
export async function typeInto(el: HTMLElement, text: string, isStopped: () => boolean) {
  const input = (el.matches("input, textarea") ? el : el.querySelector("input, textarea")) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) return;
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
  const delay = prefersReducedMotion() ? 0 : 14;
  for (let i = 1; i <= text.length && !isStopped(); i += 1) {
    setter?.call(input, text.slice(0, i));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (delay) await sleep(delay);
  }
}

let audio: AudioContext | undefined;

// A short sine blip per action; quiet (gain 0.04) and off unless the rep unmutes.
export function chime(kind: "click" | "step" | "wait" | "done") {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const [from, to] = { click: [880, 1175], step: [660, 880], wait: [523, 523], done: [784, 1568] }[kind];
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.04, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "done" ? 0.32 : 0.12));
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  } catch {
    // Audio is decoration; a browser without Web Audio simply stays silent.
  }
}
