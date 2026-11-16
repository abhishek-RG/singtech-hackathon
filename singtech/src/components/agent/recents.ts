"use client";

import { useCallback, useEffect, useState } from "react";

export interface Recent {
  id: string;
  name: string;
}

const KEY = "singtech.recentCompanies";
const MAX = 6;

const isRecent = (x: unknown): x is Recent => typeof x === "object" && x !== null && typeof (x as Recent).id === "string" && typeof (x as Recent).name === "string";

// Per-viewer convenience: the companies this browser asked about or opened most recently.
export function useRecents() {
  const [recents, setRecents] = useState<Recent[]>([]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      // Restoring after mount: the server render has no localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecents(Array.isArray(saved) ? saved.filter(isRecent).slice(0, MAX) : []);
    } catch {
      // storage blocked: start empty
    }
  }, []);
  const touchRecent = useCallback((r: Recent) => {
    setRecents((prev) => {
      if (prev[0]?.id === r.id) return prev;
      const next = [{ id: r.id, name: r.name }, ...prev.filter((p) => p.id !== r.id)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // per-viewer convenience only
      }
      return next;
    });
  }, []);
  return { recents, touchRecent };
}
