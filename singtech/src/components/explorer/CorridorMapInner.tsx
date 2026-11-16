"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { HUBS } from "@/lib/labels";
import type { CoverageRow } from "../insights/coverage";

const RED = "#e60012";
const NAVY = "#1d4ed8";
const SG_VIEW: [number, number] = [1.33, 103.82];
const REGIONAL_BOUNDS = L.latLngBounds([0.9, 72], [27, 104.3]);

const hubIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:10px;height:10px;background:#475569;border:2px solid #fff;box-shadow:0 0 0 1px #475569"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

// Customers red, prospects navy: the one distinction a rep needs at a glance.
const pinColor = (r: CoverageRow) => (r.isCustomer ? RED : NAVY);

// Quadratic curve between two points so corridors read as arcs rather than straight lines.
function arc(from: readonly [number, number], to: readonly [number, number]): [number, number][] {
  const [mx, my] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const ctrl: [number, number] = [mx - dy * 0.2, my + dx * 0.2];
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return [
      (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * to[0],
      (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * to[1],
    ];
  });
}

function ViewController({ regional, selected }: { regional: boolean; selected?: CoverageRow }) {
  const map = useMap();
  useEffect(() => {
    if (regional) map.flyToBounds(REGIONAL_BOUNDS, { duration: 0.6 });
    else map.flyTo(SG_VIEW, 11, { duration: 0.6 });
  }, [map, regional]);
  // A row picked in the list brings its pin into view, close enough to tell neighbouring Singapore pins apart.
  useEffect(() => {
    if (selected) map.flyTo(selected.coordinates, Math.max(map.getZoom(), selected.inSingapore ? 12 : 6), { duration: 0.5 });
  }, [map, selected]);
  return null;
}

export default function CorridorMapInner({
  rows,
  selectedId,
  onSelect,
  regional,
}: {
  rows: CoverageRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
  regional: boolean;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  // Existing accounts arc out to their corridor's far end; prospects (including Johor ones) arc back to Singapore.
  const arcs = useMemo(() => rows.flatMap((r) => (r.arcTo ? [{ id: r.id, positions: arc(r.coordinates, r.arcTo), color: pinColor(r) }] : [])), [rows]);
  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div className="relative isolate h-full w-full">
      <MapContainer center={SG_VIEW} zoom={11} minZoom={3} scrollWheelZoom={false} className="h-full w-full" style={{ background: "#f1f5f9" }}>
        <ViewController regional={regional} selected={selected} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles: Esri, HERE, Garmin, OpenStreetMap contributors"
          maxNativeZoom={16}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        {regional &&
          arcs.map((a) => (
            <Polyline
              key={a.id}
              positions={a.positions}
              pathOptions={{ color: a.color, weight: a.id === selectedId ? 2.5 : 1.4, opacity: a.id === selectedId ? 0.9 : 0.45, dashArray: "6 6" }}
            />
          ))}
        {HUBS.filter((h) => regional || !h.regional).map((h) => (
          <Marker key={h.name} position={h.position as [number, number]} icon={hubIcon}>
            <Tooltip direction="top">{h.name}</Tooltip>
          </Marker>
        ))}
        {rows.map((r) => {
          const isSelected = r.id === selectedId;
          return (
            <CircleMarker
              key={r.id}
              center={r.coordinates}
              radius={isSelected ? 11 : 7}
              pathOptions={{ color: isSelected ? "#0a0a0c" : "#ffffff", fillColor: pinColor(r), fillOpacity: 0.95, weight: isSelected ? 3 : 2 }}
              eventHandlers={{ click: () => onSelect(r.id) }}
            >
              {/* react-leaflet reads "permanent" only on mount, so the key remounts the label when selection changes. */}
              <Tooltip key={isSelected ? "selected" : "hover"} direction="top" permanent={isSelected}>
                {r.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex flex-wrap gap-1.5 text-[11px] text-primary">
        <span className="rounded-md border border-border bg-surface/95 px-2 py-1">
          <span className="mr-1 inline-block size-2 rounded-full bg-st-red" /> Customer
        </span>
        <span className="rounded-md border border-border bg-surface/95 px-2 py-1">
          <span className="mr-1 inline-block size-2 rounded-full bg-st-corridor" /> Prospect
        </span>
        <span className="rounded-md border border-border bg-surface/95 px-2 py-1">
          <span className="mr-1 inline-block size-2 bg-[#475569]" /> Singtel infrastructure hub
        </span>
        {tilesFailed && <span className="rounded-md border border-border bg-surface/95 px-2 py-1 text-st-warning">Base map unavailable: pins still live</span>}
      </div>
    </div>
  );
}
