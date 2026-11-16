"use client";

import dynamic from "next/dynamic";

// Leaflet touches window at import time, so it only loads in the browser.
export const CorridorMap = dynamic(() => import("./CorridorMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" aria-label="Loading infrastructure map" />,
});
