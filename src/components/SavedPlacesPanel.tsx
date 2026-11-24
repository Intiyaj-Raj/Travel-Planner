import React, { useMemo, useState } from "react";
import { Bookmark, GripVertical, MapPin, Plus, Search } from "lucide-react";
import {
  CurrencyCode,
  ItineraryDay,
  Place,
  PlaceCategory,
} from "../types/trip";
import { CATEGORY_META, convertCurrency, formatMoney } from "../utils/travel";
import { PlaceThumbnail } from "./PlaceThumbnail";

interface SavedPlacesPanelProps {
  places: Place[];
  days: ItineraryDay[];
  selectedDayId: string | null;
  selectedPlaceId: string | null;
  displayCurrency: CurrencyCode;
  onSelectPlace: (placeId: string) => void;
  onToggleSavePlace: (placeId: string) => void;
  onAddPlaceToDay: (placeId: string, dayId: string) => void;
  onOpenAddCustomPlace: () => void;
}

export function SavedPlacesPanel({
  places,
  days,
  selectedDayId,
  selectedPlaceId,
  displayCurrency,
  onSelectPlace,
  onToggleSavePlace,
  onAddPlaceToDay,
  onOpenAddCustomPlace,
}: SavedPlacesPanelProps) {
  const [scope, setScope] = useState<"saved" | "all">("saved");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">(
    "all",
  );

  const savedCount = useMemo(
    () => places.filter((p) => p.saved).length,
    [places],
  );

  const visiblePlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (scope === "saved" && !p.saved) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter)
        return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.neighborhood.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [places, scope, categoryFilter, search]);

  const targetDayId =
    selectedDayId && days.some((d) => d.id === selectedDayId)
      ? selectedDayId
      : days[0]?.id || "";

  const handleDragStart = (e: React.DragEvent, placeId: string) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "place", placeId }),
    );
    e.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <section
      aria-label="Saved places"
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
    >
      {/* Panel Header */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Places Library
          </h2>
          <button
            type="button"
            onClick={onOpenAddCustomPlace}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Custom Place
          </button>
        </div>

        {/* Segmented Scope Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setScope("saved")}
            className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              scope === "saved"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Saved ({savedCount})
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              scope === "all"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            All Places ({places.length})
          </button>
        </div>

        {/* Search + Category Select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter places..."
              aria-label="Filter places"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-500"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as PlaceCategory | "all")
            }
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">All types</option>
            {(Object.keys(CATEGORY_META) as PlaceCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Places List */}
      <div className="thin-scrollbar flex-1 overflow-y-auto p-3 space-y-2">
        {visiblePlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-800">
            <MapPin className="h-7 w-7 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {scope === "saved" && savedCount === 0
                ? "No saved places yet"
                : "No places match your filter"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px]">
              {scope === "saved" && savedCount === 0
                ? "Switch to All Places to bookmark stops or drop a custom pin on the map."
                : "Try clearing your search or choosing another category."}
            </p>
            {scope === "saved" && savedCount === 0 ? (
              <button
                type="button"
                onClick={() => setScope("all")}
                className="mt-3 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600"
              >
                Browse All Places
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                }}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          visiblePlaces.map((place) => {
            const meta = CATEGORY_META[place.category];
            const isSelected = place.id === selectedPlaceId;
            return (
              <div
                key={place.id}
                draggable
                onDragStart={(e) => handleDragStart(e, place.id)}
                onClick={() => onSelectPlace(place.id)}
                className={`group flex items-start gap-2.5 rounded-lg border p-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                  isSelected
                    ? "border-teal-600/60 bg-teal-50/50 dark:border-teal-500/50 dark:bg-teal-950/30"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="mt-1 text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 shrink-0">
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="h-12 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  <PlaceThumbnail
                    src={place.imageUrl}
                    alt={place.name}
                    category={place.category}
                    className="h-full w-full"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
                      {place.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSavePlace(place.id);
                      }}
                      aria-label={
                        place.saved
                          ? `Unsave ${place.name}`
                          : `Save ${place.name}`
                      }
                      className={`shrink-0 rounded p-1 transition-colors ${
                        place.saved
                          ? "text-teal-700 dark:text-teal-400"
                          : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${place.saved ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Clean unboxed metadata */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className={meta.textClass}>{meta.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-[96px]">
                      {place.neighborhood}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {place.durationMinutes}m
                    </span>
                    {place.estimatedCostUsd > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatMoney(
                            convertCurrency(
                              place.estimatedCostUsd,
                              "USD",
                              displayCurrency,
                            ),
                            displayCurrency,
                          )}
                        </span>
                      </>
                    )}
                  </div>

                  {days.length > 0 && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Drag to a day or quick-add
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (targetDayId)
                            onAddPlaceToDay(place.id, targetDayId);
                        }}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/60 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        Day{" "}
                        {Math.max(
                          1,
                          days.findIndex((d) => d.id === targetDayId) + 1,
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
