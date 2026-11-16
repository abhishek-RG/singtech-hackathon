"use client";

import { useEffect, useRef, useState } from "react";
import { Square, Volume2, VolumeX } from "lucide-react";

export interface CursorState {
  x: number;
  y: number;
  isVisible: boolean;
  isClicking: boolean;
  label: string;
}

export interface Spot {
  el: HTMLElement;
  label: string;
  note?: string;
}

// The SingTech AI cursor, its status pill and the spotlight ring. It lives in a manual popover so it stays above open dialogs
// (the browser top layer); raiseKey changes when a dialog opens, and the layer is re-shown on top of it.
export function AgentCursor({
  cursor,
  spot,
  isRunning,
  isMuted,
  onMute,
  onStop,
  raiseKey,
}: {
  cursor: CursorState;
  spot: Spot | null;
  isRunning: boolean;
  isMuted: boolean;
  onMute: () => void;
  onStop: () => void;
  raiseKey: number;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    if (!spot) {
      // Clearing the ring when the spotlight ends; nothing else drives it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    // The page can scroll or reflow under the spotlight (streaming answers), so the ring follows its element.
    const update = () => {
      setRect(spot.el.getBoundingClientRect());
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [spot]);

  const isShown = cursor.isVisible || Boolean(spot);
  useEffect(() => {
    const el = layer.current;
    if (!el?.showPopover) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (isShown) el.showPopover();
    } catch {
      // popover unsupported: the layer still renders as a fixed overlay
    }
  }, [isShown, raiseKey]);

  const noteBelow = rect ? rect.bottom < viewport.h - 160 : true;
  const pillLeft = cursor.x < viewport.w - 360;

  return (
    <div ref={layer} popover="manual" className="st-agent-layer" aria-hidden={!isShown}>
      {rect && spot && (
        <div className="st-agent-spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}>
          {(spot.label || spot.note) && (
            <div className="st-agent-note" style={noteBelow ? { top: "calc(100% + 10px)" } : { bottom: "calc(100% + 10px)" }}>
              {spot.label && <div className="font-semibold">{spot.label}</div>}
              {spot.note && <div className="mt-0.5 text-[#2b2f38]">{spot.note}</div>}
            </div>
          )}
        </div>
      )}
      <div className="st-agent-cursor" data-clicking={cursor.isClicking} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: cursor.isVisible ? 1 : 0 }}>
        <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden>
          <path d="M2 2 L2 24 L8.5 18.5 L13 28 L17 26 L12.5 16.8 L21.5 16.5 Z" fill="#E60012" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="st-agent-ripple" aria-hidden />
        <div className="st-agent-pill" data-side={pillLeft ? "right" : "left"} role="status" aria-live="polite">
          <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${isRunning ? "bg-[#E60012] st-pulse" : "bg-[#34d399]"}`} />
          <span className="font-semibold">SingTech AI</span>
          <span className="min-w-0 truncate text-white/85">{cursor.label}</span>
          <button type="button" onClick={onMute} aria-label={isMuted ? "Turn on sounds" : "Mute sounds"} className="rounded-full p-1 text-white/80 hover:bg-white/10">
            {isMuted ? <VolumeX aria-hidden className="size-3.5" /> : <Volume2 aria-hidden className="size-3.5" />}
          </button>
          {isRunning && (
            <button type="button" onClick={onStop} aria-label="Stop the workflow" className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-medium hover:bg-white/20">
              <Square aria-hidden className="size-3" /> Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
