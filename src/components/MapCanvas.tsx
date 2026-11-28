import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import {
  AlertTriangle,
  Bookmark,
  Clock,
  Crosshair,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import {
  CurrencyCode,
  ItineraryDay,
  Place,
  PlaceCategory,
} from "../types/trip";
import { CATEGORY_META, convertCurrency, formatMoney } from "../utils/travel";
import { PlaceThumbnail } from "./PlaceThumbnail";

interface MapCanvasProps {
  places: Place[];
  days: ItineraryDay[];
  selectedDayId: string | null;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  onToggleSavePlace: (placeId: string) => void;
  onAddPlaceToDay: (placeId: string, dayId: string) => void;
  onMapPickLocation?: (lat: number, lng: number) => void;
  darkMode: boolean;
  displayCurrency: CurrencyCode;
  readOnly?: boolean;
  heightClass?: string;
}

const CATEGORIES: PlaceCategory[] = [
  "landmark",
  "dining",
  "culture",
  "nature",
  "transit",
  "stay",
];

/**
 * Free tile providers — none of these need an API key or token.
 * They are tried in order: if the first one fails to load any tile,
 * the map automatically falls back to the next one.
 */
interface TileProvider {
  name: string;
  lightUrl: string;
  darkUrl?: string; // if omitted, the light tiles are colour-inverted in dark mode
  attribution: string;
  subdomains?: string;
}

// NOTE: CARTO's public basemaps now return an "API KEY REQUIRED" watermark
// on every tile, so they are intentionally NOT used here.
const TILE_PROVIDERS: TileProvider[] = [
  {
    name: "OpenStreetMap",
    lightUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

// How many tile errors (with zero successful tiles) before switching provider
const TILE_ERROR_THRESHOLD = 3;

const DARK_INVERT_FILTER =
  "invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)";

export function MapCanvas({
  places,
  days,
  selectedDayId,
  selectedPlaceId,
  onSelectPlace,
  onToggleSavePlace,
  onAddPlaceToDay,
  onMapPickLocation,
  darkMode,
  displayCurrency,
  readOnly = false,
  heightClass = "h-[420px] lg:h-full",
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Keep the latest callback in a ref so pins are not rebuilt (and clusters
  // collapsed) every time the parent re-renders with a new function identity.
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">(
    "all",
  );
  const [pickMode, setPickMode] = useState(false);
  const [targetDayId, setTargetDayId] = useState<string>(days[0]?.id || "");
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    if (selectedDayId && days.some((d) => d.id === selectedDayId)) {
      setTargetDayId(selectedDayId);
    } else if (days.length > 0 && !days.some((d) => d.id === targetDayId)) {
      setTargetDayId(days[0].id);
    }
  }, [selectedDayId, days, targetDayId]);

  const activeDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) || null,
    [days, selectedDayId],
  );

  const activeStopOrderMap = useMemo(() => {
    const map = new Map<string, number[]>();
    if (!activeDay) return map;
    activeDay.stops.forEach((stop, idx) => {
      const existing = map.get(stop.placeId) || [];
      existing.push(idx + 1);
      map.set(stop.placeId, existing);
    });
    return map;
  }, [activeDay]);

  const filteredPlaces = useMemo(() => {
    if (categoryFilter === "all") return places;
    return places.filter((p) => p.category === categoryFilter);
  }, [places, categoryFilter]);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) || null,
    [places, selectedPlaceId],
  );

  // Initialize Leaflet map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // Guard against stale Leaflet container state under React StrictMode
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
      delete (container as HTMLDivElement & { _leaflet_id?: number })
        ._leaflet_id;
    }

    const map = L.map(container, {
      center: [35.006, 135.755],
      zoom: 12,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 font-mono text-xs font-semibold shadow-md ring-2 ring-white dark:ring-slate-900">${count}</div>`,
          className: "wayfinder-cluster-icon",
          iconSize: L.point(36, 36),
        });
      },
    });

    const routeLayer = L.layerGroup().addTo(map);
    clusterGroup.addTo(map);

    clusterGroupRef.current = clusterGroup;
    routeLayerRef.current = routeLayer;

    // ResizeObserver ensures map tiles render cleanly when switching layouts/tabs
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    // Layout may not be final on the first frame; re-measure once it settles
    const initialResize = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(initialResize);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Handle pick-location click on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (pickMode && onMapPickLocation) {
        onMapPickLocation(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5)),
        );
        setPickMode(false);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [pickMode, onMapPickLocation]);

  // Base map tiles (light / dark) with automatic fallback between free providers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let disposed = false;
    let currentLayer: L.TileLayer | null = null;

    const mountProvider = (index: number) => {
      if (disposed) return;

      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
      }

      const provider = TILE_PROVIDERS[index];
      const useDarkTiles = darkMode && Boolean(provider.darkUrl);
      const url = useDarkTiles
        ? (provider.darkUrl as string)
        : provider.lightUrl;

      let loaded = 0;
      let errors = 0;

      const layer = L.tileLayer(url, {
        attribution: provider.attribution,
        subdomains: provider.subdomains ?? "abc",
        maxZoom: 19,
      });
      currentLayer = layer;

      layer.on("tileload", () => {
        if (disposed || currentLayer !== layer) return;
        loaded += 1;
        if (loaded === 1) setTilesFailed(false);
      });

      layer.on("tileerror", () => {
        if (disposed || currentLayer !== layer) return;
        errors += 1;
        if (loaded === 0 && errors >= TILE_ERROR_THRESHOLD) {
          if (index + 1 < TILE_PROVIDERS.length) {
            mountProvider(index + 1);
          } else {
            setTilesFailed(true);
          }
        }
      });

      layer.addTo(map);

      // Providers without a native dark style: invert the light tiles instead
      const tileContainer = layer.getContainer();
      if (tileContainer) {
        tileContainer.style.filter =
          darkMode && !provider.darkUrl ? DARK_INVERT_FILTER : "";
      }
    };

    setTilesFailed(false);
    mountProvider(0);

    return () => {
      disposed = true;
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
      }
    };
  }, [darkMode]);

  // Render category pins with clustering
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();

    filteredPlaces.forEach((place) => {
      const meta = CATEGORY_META[place.category];
      const stopNums = activeStopOrderMap.get(place.id);
      const isSelected = place.id === selectedPlaceId;
      const badgeHtml =
        stopNums && stopNums.length > 0
          ? `<span style="position:absolute;top:-5px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:9999px;background:#0f172a;color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;border:1.5px solid #ffffff;">${stopNums[0]}</span>`
          : "";

      const size = isSelected ? 36 : 30;
      const iconHtml = `
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:${meta.colorHex};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(15,23,42,0.28);border:${isSelected ? "3px solid #0d9488" : "2px solid #ffffff"};transition:transform 150ms ease;">
          <svg width="${isSelected ? 16 : 14}" height="${isSelected ? 16 : 14}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="${meta.svgPath}" />
          </svg>
          ${badgeHtml}
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "wayfinder-pin-icon",
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
      });

      const marker = L.marker([place.lat, place.lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPlaceRef.current(place.id);
      });
      marker.bindTooltip(place.name, {
        direction: "top",
        offset: [0, -14],
        opacity: 0.94,
      });

      clusterGroup.addLayer(marker);
    });
  }, [filteredPlaces, activeStopOrderMap, selectedPlaceId]);

  // Draw active day route polyline
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    const map = mapRef.current;
    if (!routeLayer || !map) return;

    routeLayer.clearLayers();
    const placeMap = new Map(places.map((p) => [p.id, p]));

    const daysToDraw = activeDay ? [activeDay] : days;
    const palette = ["#0d9488", "#4f46e5", "#d97706", "#e11d48", "#0284c7"];

    daysToDraw.forEach((day, idx) => {
      const coords: [number, number][] = [];
      day.stops.forEach((s) => {
        const pl = placeMap.get(s.placeId);
        if (pl) coords.push([pl.lat, pl.lng]);
      });

      if (coords.length >= 2) {
        const line = L.polyline(coords, {
          color: activeDay ? "#0d9488" : palette[idx % palette.length],
          weight: activeDay ? 3.5 : 2.5,
          opacity: activeDay ? 0.85 : 0.65,
          dashArray: "6 6",
        });
        routeLayer.addLayer(line);
      }
    });
  }, [activeDay, days, places]);

  // Fly to selected place when chosen from list/planner.
  // Depends on id + coordinates only, so toggling "Save" (which creates a new
  // place object) does not re-trigger the camera move.
  const selectedId = selectedPlace?.id ?? null;
  const selectedLat = selectedPlace?.lat;
  const selectedLng = selectedPlace?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId === null) return;
    if (selectedLat === undefined || selectedLng === undefined) return;
    const currentZoom = map.getZoom();
    map.flyTo([selectedLat, selectedLng], Math.max(currentZoom, 14), {
      duration: 0.45,
    });
  }, [selectedId, selectedLat, selectedLng]);

  const handleFitBounds = () => {
    const map = mapRef.current;
    if (!map) return;
    const targetCoords: [number, number][] = activeDay
      ? activeDay.stops
          .map((s) => places.find((p) => p.id === s.placeId))
          .filter((p): p is Place => Boolean(p))
          .map((p) => [p.lat, p.lng])
      : filteredPlaces.map((p) => [p.lat, p.lng]);

    if (targetCoords.length === 0) return;
    if (targetCoords.length === 1) {
      map.flyTo(targetCoords[0], 14, { duration: 0.4 });
      return;
    }
    map.fitBounds(L.latLngBounds(targetCoords), {
      padding: [48, 48],
      maxZoom: 15,
    });
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 ${heightClass}`}
    >
      {/* Map container.
          `isolate` keeps Leaflet's internal z-indexes (panes/controls) from
          leaking above the overlays below (filter bar, place popover). */}
      <div
        ref={containerRef}
        className={`isolate h-full w-full ${pickMode ? "cursor-crosshair" : ""}`}
      />

      {/* Top-Left Category Filter Bar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[400] flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200/90 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-slate-700/90 dark:bg-slate-900/95">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              categoryFilter === "all"
                ? "bg-teal-700 text-white dark:bg-teal-600"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            All ({places.length})
          </button>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.colorHex }}
                  aria-hidden="true"
                />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Map Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFitBounds}
            title={activeDay ? `Fit ${activeDay.title}` : "Fit all pins"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-slate-50 dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>{activeDay ? "Fit Day Route" : "Fit All"}</span>
          </button>

          {!readOnly && onMapPickLocation && (
            <button
              type="button"
              onClick={() => setPickMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors whitespace-nowrap shrink-0 ${
                pickMode
                  ? "border-teal-600 bg-teal-700 text-white dark:bg-teal-600"
                  : "border-slate-200/90 bg-white/95 text-slate-700 hover:bg-slate-50 dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {pickMode ? "Click Map to Pin..." : "Drop Custom Pin"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tiles failed notice (pins and routes still work) */}
      {tilesFailed && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-16 z-[410] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-md dark:border-amber-700/60 dark:bg-amber-950/90 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Map background couldn&apos;t load. Check your internet connection,
              VPN or ad-blocker. Your pins and routes still work.
            </span>
          </div>
        </div>
      )}

      {/* Pick Mode Prompt */}
      {pickMode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[400] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-teal-600/40 bg-slate-900/95 px-4 py-2 text-xs font-medium text-white shadow-lg">
            <span>Click anywhere on the map to create a custom place</span>
            <button
              type="button"
              onClick={() => setPickMode(false)}
              className="rounded px-2 py-0.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Floating Place Detail Popover */}
      {selectedPlace && (
        <div
          role="dialog"
          aria-label={`${selectedPlace.name} details`}
          className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[360px] z-[450] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="relative h-36 w-full bg-slate-100 dark:bg-slate-800">
            <PlaceThumbnail
              src={selectedPlace.imageUrl}
              alt={selectedPlace.name}
              category={selectedPlace.category}
              className="h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
            <button
              type="button"
              onClick={() => onSelectPlace(null)}
              aria-label="Close place details"
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/60 text-white hover:bg-slate-950/85 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2.5 left-3 right-3">
              <div className="text-[11px] font-medium text-slate-200">
                {CATEGORY_META[selectedPlace.category].label} ·{" "}
                {selectedPlace.neighborhood}
              </div>
              <h3 className="font-display text-base font-semibold leading-snug text-white">
                {selectedPlace.name}
              </h3>
            </div>
          </div>

          <div className="p-3.5 space-y-2.5">
            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {selectedPlace.durationMinutes} min
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {selectedPlace.estimatedCostUsd === 0
                  ? "Free"
                  : formatMoney(
                      convertCurrency(
                        selectedPlace.estimatedCostUsd,
                        "USD",
                        displayCurrency,
                      ),
                      displayCurrency,
                    )}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                ★ {selectedPlace.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{selectedPlace.hours}</span>
            </div>

            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {selectedPlace.description}
            </p>

            {selectedPlace.tip && (
              <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Tip:{" "}
                </span>
                {selectedPlace.tip}
              </p>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {selectedPlace.address}
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleSavePlace(selectedPlace.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedPlace.saved
                      ? "border-teal-600/40 bg-teal-50 text-teal-800 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Bookmark
                    className={`h-3.5 w-3.5 ${selectedPlace.saved ? "fill-current" : ""}`}
                  />
                  {selectedPlace.saved ? "Saved" : "Save"}
                </button>

                {days.length > 0 && (
                  <div className="flex flex-1 items-center gap-1.5 min-w-0">
                    <select
                      aria-label="Select day to add place"
                      value={targetDayId}
                      onChange={(e) => setTargetDayId(e.target.value)}
                      className="h-8 flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {days.map((d, idx) => (
                        <option key={d.id} value={d.id}>
                          Day {idx + 1}: {d.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (targetDayId) {
                          onAddPlaceToDay(selectedPlace.id, targetDayId);
                        }
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
