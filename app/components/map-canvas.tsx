"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import worldMap from "geojson-world-map/lib/world.js";
import type { Country, Region } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { inferIso2FromTitle } from "@/lib/countries";

interface MapCanvasProps {
  countries: Country[];
  regions: Region[];
  activeIso2?: string;
  activeRegionCode?: string;
  showRegions: boolean;
  onCountrySelect: (iso2: string) => void;
  onRegionSelect?: (regionCode?: string) => void;
}

type RegionFeature = GeoJSON.Feature<GeoJSON.Geometry, { code?: string; name?: string }>;
type LegendItem = { label: string; color: string };

const LEGEND_ITEMS: LegendItem[] = [
  { label: "12+ mentions", color: "#f97316" },
  { label: "6-11 mentions", color: "#facc15" },
  { label: "3-5 mentions", color: "#38bdf8" },
  { label: "1-2 mentions", color: "#7dd3fc" },
  { label: "0 mentions", color: "#e2e8f0" }
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function colorForCount(count: number): string {
  if (count >= 12) return "#f97316";
  if (count >= 6) return "#facc15";
  if (count >= 3) return "#38bdf8";
  if (count >= 1) return "#7dd3fc";
  return "#e2e8f0";
}

function mentionsLabel(count: number): string {
  return String(count);
}

export function MapCanvas({ countries, regions, activeIso2, activeRegionCode, showRegions, onCountrySelect, onRegionSelect }: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [regionFeatures, setRegionFeatures] = useState<RegionFeature[]>([]);
  const [isLoadingRegionGeometry, setIsLoadingRegionGeometry] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<{ label: string; x: number; y: number } | null>(null);
  const [hoveredIso2, setHoveredIso2] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pinchStart, setPinchStart] = useState<{
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  const width = 1100;
  const height = 560;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;

  const world = worldMap as {
    features: Array<{ geometry: GeoJSON.Geometry; properties: { name: string } }>;
  };

  const worldProjection = useMemo(() => geoNaturalEarth1().fitSize([width, height], world as never), [world]);
  const worldPath = useMemo(() => geoPath(worldProjection), [worldProjection]);

  const countriesByIso = useMemo(() => new Map(countries.map((country) => [country.iso2, country])), [countries]);

  const isoByNameFallback = useMemo(() => {
    const map = new Map<string, string>();
    for (const country of countries) {
      map.set(normalize(country.name), country.iso2);
      map.set(normalize(country.name.replace(/\b(republic|federation|state|peoples|the)\b/gi, "")), country.iso2);
    }
    return map;
  }, [countries]);

  const regionByCode = useMemo(() => new Map(regions.map((region) => [region.code, region])), [regions]);

  useEffect(() => {
    async function loadRegions() {
      if (!showRegions || !activeIso2) {
        setRegionFeatures([]);
        setIsLoadingRegionGeometry(false);
        return;
      }

      setIsLoadingRegionGeometry(true);
      try {
        const response = await fetch(`/geo/regions/${activeIso2.toLowerCase()}.geojson`);
        if (!response.ok) {
          setRegionFeatures([]);
          return;
        }

        const geo = await response.json();
        setRegionFeatures(geo.features ?? []);
      } catch {
        setRegionFeatures([]);
      } finally {
        setIsLoadingRegionGeometry(false);
      }
    }

    void loadRegions();
  }, [activeIso2, showRegions]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const preventGestureDefault = (event: Event) => event.preventDefault();
    svg.addEventListener("gesturestart", preventGestureDefault, { passive: false });
    svg.addEventListener("gesturechange", preventGestureDefault, { passive: false });
    svg.addEventListener("gestureend", preventGestureDefault, { passive: false });
    return () => {
      svg.removeEventListener("gesturestart", preventGestureDefault);
      svg.removeEventListener("gesturechange", preventGestureDefault);
      svg.removeEventListener("gestureend", preventGestureDefault);
    };
  }, []);

  const regionMode = showRegions && activeIso2 && regionFeatures.length > 0;
  const regionProjection = useMemo(() => {
    if (!regionMode) return undefined;
    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: regionFeatures
    };
    return geoNaturalEarth1().fitSize([width, height], featureCollection as never);
  }, [regionFeatures, regionMode]);
  const regionPath = useMemo(() => (regionProjection ? geoPath(regionProjection) : undefined), [regionProjection]);

  const zoomBy = (factor: number) => {
    setZoom((currentZoom) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * factor));
      if (nextZoom === MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  const touchDistance = (a: React.Touch, b: React.Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const touchMidpoint = (a: React.Touch, b: React.Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  return (
    <Card className="overflow-hidden bg-white/85">
      <CardContent className="p-0">
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className={`map-canvas h-[560px] w-full bg-[radial-gradient(circle_at_20%_0%,#ffffff88_0%,transparent_45%),linear-gradient(180deg,#c6ecff,#e6f6ff)] ${zoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""}`}
            onWheel={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;
              const factor = event.deltaY < 0 ? 1.12 : 0.89;
              const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
              if (nextZoom === zoom) return;
              setPan({
                x: x - ((x - pan.x) * nextZoom) / zoom,
                y: y - ((y - pan.y) * nextZoom) / zoom
              });
              setZoom(nextZoom);
              if (nextZoom === MIN_ZOOM) {
                setPan({ x: 0, y: 0 });
              }
            }}
            onMouseDown={(event) => {
              if (zoom <= 1) return;
              setIsPanning(true);
              setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
            }}
            onMouseMove={(event) => {
              if (!isPanning) return;
              setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
            onTouchStart={(event) => {
              if (event.touches.length === 2) {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const first = event.touches[0];
                const second = event.touches[1];
                if (!first || !second) return;
                const midpoint = touchMidpoint(first, second);
                setPinchStart({
                  distance: touchDistance(first, second),
                  zoom,
                  pan,
                  midpoint: { x: midpoint.x - rect.left, y: midpoint.y - rect.top }
                });
                setIsPanning(false);
                return;
              }

              if (event.touches.length === 1 && zoom > 1) {
                event.preventDefault();
                const touch = event.touches[0];
                if (!touch) return;
                setIsPanning(true);
                setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
              }
            }}
            onTouchMove={(event) => {
              if (event.touches.length === 2 && pinchStart) {
                event.preventDefault();
                const first = event.touches[0];
                const second = event.touches[1];
                if (!first || !second) return;
                const ratio = touchDistance(first, second) / pinchStart.distance;
                const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStart.zoom * ratio));
                setZoom(nextZoom);
                setPan({
                  x: pinchStart.midpoint.x - ((pinchStart.midpoint.x - pinchStart.pan.x) * nextZoom) / pinchStart.zoom,
                  y: pinchStart.midpoint.y - ((pinchStart.midpoint.y - pinchStart.pan.y) * nextZoom) / pinchStart.zoom
                });
                if (nextZoom === MIN_ZOOM) setPan({ x: 0, y: 0 });
                return;
              }

              if (event.touches.length === 1 && isPanning) {
                event.preventDefault();
                const touch = event.touches[0];
                if (!touch) return;
                setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y });
              }
            }}
            onTouchEnd={(event) => {
              if (event.touches.length < 2) setPinchStart(null);
              if (event.touches.length === 0) setIsPanning(false);
            }}
            onTouchCancel={() => {
              setPinchStart(null);
              setIsPanning(false);
            }}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {!regionMode &&
                world.features.map((feature, index) => {
                  const normalizedFeatureName = normalize(feature.properties.name);
                  const inferredIso = inferIso2FromTitle(feature.properties.name);
                  const mappedIso =
                    (inferredIso && countriesByIso.has(inferredIso) ? inferredIso : undefined) ??
                    isoByNameFallback.get(normalizedFeatureName) ??
                    isoByNameFallback.get(normalize(feature.properties.name.replace(/\b(republic|federation|state|peoples|the)\b/gi, "")));
                  const country = mappedIso ? countriesByIso.get(mappedIso) : undefined;
                  const selected = Boolean(mappedIso && activeIso2 && mappedIso === activeIso2);
                  const hovered = Boolean(mappedIso && hoveredIso2 && mappedIso === hoveredIso2);
                  const countryName = country?.name ?? feature.properties.name;
                  const countryMentions = country?.mentionCount ?? 0;
                  const pathD = worldPath(feature as never) ?? "";

                  return (
                    <path
                      key={`${feature.properties.name}-${index}`}
                      d={pathD}
                      fill={colorForCount(country?.mentionCount ?? 0)}
                      stroke={selected ? "#fb7185" : hovered ? "#0f172a" : "#334155"}
                      strokeWidth={selected ? 2.2 : hovered ? 1 : 0.6}
                      className={mappedIso ? "cursor-pointer transition-all duration-150 hover:opacity-90" : "opacity-80"}
                      onClick={() => mappedIso && onCountrySelect(mappedIso)}
                      onMouseEnter={() => {
                        if (!mappedIso) return;
                        setHoveredIso2(mappedIso);
                      }}
                      onMouseMove={(event) => {
                        const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                        if (!rect) return;
                        setHoveredCountry({
                          label: `${countryName}: ${mentionsLabel(countryMentions)}`,
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredCountry(null);
                        setHoveredIso2(null);
                      }}
                    >
                      <title>
                        {countryName}: {mentionsLabel(countryMentions)}
                      </title>
                    </path>
                  );
                })}

              {regionMode &&
                regionFeatures.map((feature, index) => {
                  const code = feature.properties?.code ?? "UNKNOWN";
                  const region = regionByCode.get(code);
                  const regionCount = region?.mentionCount ?? 0;
                  const pathD = regionPath?.(feature as never) ?? "";
                  const selected = Boolean(activeRegionCode && code === activeRegionCode);
                  return (
                    <path
                      key={`${code}-${index}`}
                      d={pathD}
                      fill={colorForCount(regionCount)}
                      stroke={selected ? "#fb7185" : "#0f172a"}
                      strokeWidth={selected ? 2.2 : 1.2}
                      className="cursor-pointer transition-all duration-150 hover:opacity-90"
                      onClick={() => onRegionSelect?.(code)}
                      onMouseMove={(event) => {
                        const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                        if (!rect) return;
                        setHoveredCountry({
                          label: `${feature.properties?.name ?? code}: ${mentionsLabel(regionCount)}`,
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top
                        });
                      }}
                      onMouseLeave={() => setHoveredCountry(null)}
                    >
                      <title>
                        {feature.properties?.name ?? code}: {mentionsLabel(regionCount)}
                      </title>
                    </path>
                  );
                })}
            </g>
          </svg>

          {activeIso2 && (
            <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border-2 border-simpson-ink bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-wide text-simpson-ink shadow-cartoon">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-500" />
              Selected: {activeIso2}
            </div>
          )}

          {showRegions && activeIso2 && isLoadingRegionGeometry && (
            <div className="absolute inset-x-4 top-4 rounded-xl border-2 border-simpson-ink bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700">
              Loading region map geometry for {activeIso2}...
            </div>
          )}

          {showRegions && activeIso2 && !isLoadingRegionGeometry && regionFeatures.length === 0 && (
            <div className="absolute inset-x-4 top-4 rounded-xl border-2 border-simpson-ink bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700">
              Region map geometry isn&apos;t available for {activeIso2} yet. Add `/public/geo/regions/{activeIso2.toLowerCase()}.geojson`.
            </div>
          )}

          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white/90 p-1 shadow">
            <button
              type="button"
              className="h-7 w-7 rounded border border-slate-300 bg-white text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => zoomBy(1.2)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded border border-slate-300 bg-white text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => zoomBy(1 / 1.2)}
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              className="h-7 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </button>
          </div>

          {hoveredCountry && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[120%] rounded-md border border-slate-300 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-800 shadow"
              style={{ left: hoveredCountry.x, top: hoveredCountry.y }}
            >
              {hoveredCountry.label}
            </div>
          )}

          <div className="absolute bottom-4 left-4 rounded-xl border-2 border-simpson-ink bg-white/95 px-3 py-2 shadow-cartoon">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-700">Legend</p>
            <ul className="grid gap-1">
              {LEGEND_ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-sm border border-slate-500/40" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="group absolute bottom-4 right-4 hidden rounded-full border-2 border-simpson-ink bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-cartoon md:inline-flex">
            RandMcNally
            <div className="pointer-events-none absolute -top-10 right-0 w-max rounded-lg border-2 border-simpson-ink bg-yellow-100 px-2 py-1 text-[10px] font-bold normal-case text-slate-800 opacity-0 shadow-cartoon transition-opacity group-hover:opacity-100">
              a country that no longer exists.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
