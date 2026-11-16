"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { ArrowUpRight, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { buildDirectory } from "@/lib/agent/directory";
import { PRESENTATION_SECONDS, presentationSteps } from "@/lib/agent/presentation";
import { slot, useAgent, useSlot } from "./AgentProvider";
import { sleep, waitFor, waitForPath } from "./runtime";

// Module-level like the agent: the shell remounts on navigation to "/dashboard", and the walkthrough must keep its step and clock.
const indexSlot = slot(0);
const startedSlot = slot(0);
const run_ = { token: 0, entered: "" };
const setIndex = indexSlot.set;
const setStartedAt = startedSlot.set;
const PRESENT_KEY = "singtech.presentation";

const clock = (s: number) => `${Math.floor(Math.max(s, 0) / 60)}:${String(Math.max(s, 0) % 60).padStart(2, "0")}`;

// Presenter HUD for the 5-minute pitch: steps 1 to 6 (keys 1-6, arrows, Esc), a countdown, and the AI cursor doing the work.
export function PresentationMode() {
  const agent = useAgent();
  const { isPresenting, setPresenting, stop, showSpot, moveCursorTo, run, hideCursor } = agent;
  const router = useRouter();
  const steps = useMemo(() => presentationSteps(buildDirectory()), []);
  const [index] = useSlot(indexSlot);
  const [startedAt] = useSlot(startedSlot);
  const [now, setNow] = useState(0);

  // A full page load mid-walkthrough comes back on the same step with the same clock (this tab only).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PRESENT_KEY) ?? "null") as { index: number; startedAt: number } | null;
      if (saved && !startedSlot.get() && Date.now() - saved.startedAt < 15 * 60_000) {
        setStartedAt(saved.startedAt);
        setIndex(saved.index);
        setPresenting(true);
      }
    } catch {
      // storage blocked: nothing to restore
    }
  }, [setPresenting]);
  useEffect(() => {
    try {
      if (isPresenting && startedAt) sessionStorage.setItem(PRESENT_KEY, JSON.stringify({ index, startedAt }));
      else if (!isPresenting) sessionStorage.removeItem(PRESENT_KEY);
    } catch {
      // per-tab convenience only
    }
  }, [index, isPresenting, startedAt]);

  useEffect(() => {
    if (!isPresenting) return;
    // A new presentation starts the clock at step 1; a remount mid-walkthrough keeps both.
    if (!startedSlot.get()) {
      setStartedAt(Date.now());
      setIndex(0);
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isPresenting]);

  const playStep = useCallback(async () => {
    const step = steps[index];
    if (!step.plan) return;
    showSpot(null);
    await run(step.plan);
  }, [index, run, showSpot, steps]);

  // Entering a step: go to its page, put the spotlight and callout on its subject, then let the agent work.
  useEffect(() => {
    if (!isPresenting || !startedAt) return;
    // Entered once per step: a remount re-runs this effect, and must not restart (or stop) the step already playing.
    const key = `${startedAt}:${index}`;
    if (run_.entered === key) return;
    run_.entered = key;
    const mine = ++run_.token;
    const isStale = () => mine !== run_.token;
    const step = steps[index];
    void (async () => {
      stop();
      showSpot(null);
      if (step.href && window.location.pathname !== step.href) {
        router.push(step.href);
        await waitForPath(step.href, 8000);
        await sleep(500);
      }
      if (isStale()) return;
      const el = step.target ? await waitFor(step.target, 6000, isStale) : undefined;
      if (el && !isStale()) {
        await moveCursorTo(el);
        showSpot(el, step.title, step.callout);
      }
      if (step.plan && !isStale()) {
        await sleep(el ? 3500 : 800);
        if (!isStale()) {
          showSpot(null);
          await run(step.plan);
        }
      }
    })();
  }, [index, isPresenting, moveCursorTo, router, run, showSpot, startedAt, steps, stop]);

  const exit = useCallback(() => {
    run_.token += 1;
    run_.entered = "";
    setStartedAt(0);
    stop();
    showSpot(null);
    hideCursor();
    setPresenting(false);
  }, [hideCursor, setPresenting, showSpot, stop]);

  useEffect(() => {
    if (!isPresenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")) return;
      if (/^[1-6]$/.test(e.key)) setIndex(Number(e.key) - 1);
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      else if (e.key === "Escape" && agent.runState?.state !== "waiting") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agent.runState?.state, exit, isPresenting, steps.length]);

  if (!isPresenting) return null;
  const step = steps[index];
  const left = PRESENTATION_SECONDS - Math.floor(((now || startedAt) - startedAt) / 1000);
  const budget = steps.slice(0, index + 1).reduce((s, x) => s + x.seconds, 0);
  const isBehind = PRESENTATION_SECONDS - left > budget;
  return (
    <section aria-label="Presentation mode" className="st-dark fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[880px] rounded-[14px] border border-white/15 bg-[#10151d]/95 p-3 text-white shadow-[0_18px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="tabular rounded-md bg-st-red px-2 py-0.5 text-[12px] font-semibold">
          {index + 1} of {steps.length}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{step.title}</h2>
        <span className={`tabular text-[13px] font-semibold ${left < 30 || isBehind ? "text-[#ff8a92]" : "text-white"}`} aria-label={`${clock(left)} left`}>
          {clock(left)} left
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Steps">
          {steps.map((s, i) => (
            <button key={s.title} type="button" onClick={() => setIndex(i)} aria-label={`Step ${i + 1}: ${s.title}`} aria-current={i === index ? "step" : undefined} className={`h-1.5 rounded-full transition-all duration-[180ms] ${i === index ? "w-6 bg-st-red" : i < index ? "w-3 bg-white/70" : "w-3 bg-white/25"}`} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-white/85 max-sm:line-clamp-3">{step.callout}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" label="Previous" icon={<ChevronLeft aria-hidden className="size-4" />} onClick={() => setIndex((i) => Math.max(i - 1, 0))} isDisabled={index === 0} />
        <Button size="sm" variant="primary" label={index === steps.length - 1 ? "Finish" : "Next"} icon={<ChevronRight aria-hidden className="size-4" />} onClick={() => (index === steps.length - 1 ? exit() : setIndex(index + 1))} />
        {step.plan && <Button size="sm" label="Run again" icon={<Play aria-hidden className="size-4" />} onClick={() => void playStep()} isDisabled={agent.runState?.state === "running" || agent.runState?.state === "waiting"} />}
        {step.link && <Button size="sm" label={step.link.label} icon={<ArrowUpRight aria-hidden className="size-4" />} href={step.link.href} target="_blank" rel="noopener noreferrer" />}
        <span className="ml-auto hidden text-[12px] text-white/60 md:inline">Keys 1 to 6, arrows, Esc to exit</span>
        <Button size="sm" variant="ghost" label="Exit" icon={<X aria-hidden className="size-4" />} onClick={exit} />
      </div>
    </section>
  );
}
