import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Car,
  Clock,
  Footprints,
  GripVertical,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  TrainFront,
} from 'lucide-react';
import {
  CurrencyCode,
  ItineraryDay,
  Place,
  TravelMode,
} from '../types/trip';
import {
  CATEGORY_META,
  convertCurrency,
  estimateTravelMinutes,
  formatDistance,
  formatMinutesToTime,
  formatMoney,
  formatShortDate,
  haversineKm,
  parseTimeToMinutes,
} from '../utils/travel';

interface DayPlannerProps {
  days: ItineraryDay[];
  places: Place[];
  selectedDayId: string | null;
  selectedPlaceId: string | null;
  displayCurrency: CurrencyCode;
  onSelectDay: (dayId: string | null) => void;
  onSelectPlace: (placeId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onUpdateDay: (dayId: string, patch: Partial<Pick<ItineraryDay, 'title' | 'date' | 'startTime'>>) => void;
  onAddPlaceToDay: (placeId: string, dayId: string, insertIndex?: number) => void;
  onMoveStop: (fromDayId: string, stopId: string, toDayId: string, toIndex: number) => void;
  onUpdateStop: (
    dayId: string,
    stopId: string,
    patch: Partial<{ durationMinutes: number; travelModeToNext: TravelMode; note: string }>
  ) => void;
  onRemoveStop: (dayId: string, stopId: string) => void;
  onLoadSampleTrip: () => void;
}

interface DragPayload {
  type: 'place' | 'stop';
  placeId?: string;
  fromDayId?: string;
  stopId?: string;
}

const TRAVEL_MODES: { id: TravelMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'walk', label: 'Walk', Icon: Footprints },
  { id: 'transit', label: 'Transit', Icon: TrainFront },
  { id: 'taxi', label: 'Taxi', Icon: Car },
];

export function DayPlanner({
  days,
  places,
  selectedDayId,
  selectedPlaceId,
  displayCurrency,
  onSelectDay,
  onSelectPlace,
  onAddDay,
  onRemoveDay,
  onUpdateDay,
  onAddPlaceToDay,
  onMoveStop,
  onUpdateStop,
  onRemoveStop,
  onLoadSampleTrip,
}: DayPlannerProps) {
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [quickAddSelections, setQuickAddSelections] = useState<Record<string, string>>({});

  const placeMap = useMemo(
    () => new Map(places.map((p) => [p.id, p])),
    [places]
  );

  const savedOrAllPlaces = useMemo(() => {
    const saved = places.filter((p) => p.saved);
    return saved.length > 0 ? saved : places;
  }, [places]);

  const parseDragPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const handleStopDragStart = (
    e: React.DragEvent,
    fromDayId: string,
    stopId: string
  ) => {
    e.stopPropagation();
    const payload: DragPayload = { type: 'stop', fromDayId, stopId };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDay = (
    e: React.DragEvent,
    toDayId: string,
    toIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    const payload = parseDragPayload(e);
    if (!payload) return;

    if (payload.type === 'place' && payload.placeId) {
      onAddPlaceToDay(payload.placeId, toDayId, toIndex);
    } else if (payload.type === 'stop' && payload.fromDayId && payload.stopId) {
      onMoveStop(payload.fromDayId, payload.stopId, toDayId, toIndex);
    }
  };

  if (days.length === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <MapPin className="h-9 w-9 text-teal-700 dark:text-teal-400 mb-3" />
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Your itinerary has no days yet
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Add Day 1 to start dragging places onto your schedule, or restore the sample Kyoto trip.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onAddDay}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Day 1
          </button>
          <button
            type="button"
            onClick={onLoadSampleTrip}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load Sample Kyoto Trip
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Day-by-day planner"
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
    >
      {/* Planner Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Day-by-Day Schedule
          </h2>
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedDayId === null
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            Show All Routes
          </button>
        </div>

        <button
          type="button"
          onClick={onAddDay}
          className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Day
        </button>
      </div>

      {/* Days Scroll List */}
      <div className="thin-scrollbar flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {days.map((day, dayIdx) => {
          const isDaySelected = selectedDayId === day.id;
          let cursorMinutes = parseTimeToMinutes(day.startTime);

          // Compute summary metrics for the day
          let totalTransitMinutes = 0;
          let totalDistanceKm = 0;
          let totalStopCostUsd = 0;

          day.stops.forEach((s, idx) => {
            const p = placeMap.get(s.placeId);
            if (!p) return;
            totalStopCostUsd += p.estimatedCostUsd;
            const nextStop = day.stops[idx + 1];
            if (nextStop) {
              const nextPlace = placeMap.get(nextStop.placeId);
              if (nextPlace) {
                const km = haversineKm(p.lat, p.lng, nextPlace.lat, nextPlace.lng);
                totalDistanceKm += km;
                totalTransitMinutes += estimateTravelMinutes(km, s.travelModeToNext);
              }
            }
          });

          const isDayDropActive = dragOverTarget === `day-${day.id}`;
          const quickChoice = quickAddSelections[day.id] || savedOrAllPlaces[0]?.id || '';

          return (
            <div
              key={day.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget(`day-${day.id}`);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverTarget(null);
                }
              }}
              onDrop={(e) => handleDropOnDay(e, day.id, day.stops.length)}
              className={`rounded-xl border transition-colors ${
                isDayDropActive
                  ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20'
                  : isDaySelected
                  ? 'border-teal-600/60 bg-white dark:border-teal-500/50 dark:bg-slate-800/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40'
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => onSelectDay(isDaySelected ? null : day.id)}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2.5 cursor-pointer dark:border-slate-800"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400 shrink-0">
                    Day {dayIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={day.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateDay(day.id, { title: e.target.value })}
                    aria-label={`Day ${dayIdx + 1} title`}
                    className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 font-display text-sm font-semibold text-slate-900 hover:bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatShortDate(day.date)}
                  </span>
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => onUpdateDay(day.id, { startTime: e.target.value })}
                    aria-label={`Day ${dayIdx + 1} start time`}
                    className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveDay(day.id)}
                    aria-label={`Delete Day ${dayIdx + 1}`}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Day Metrics Strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200/60 px-3.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                <span className="tabular-nums">
                  {day.stops.length} {day.stops.length === 1 ? 'stop' : 'stops'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {totalTransitMinutes}m transit ({formatDistance(totalDistanceKm)})
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Est. {formatMoney(convertCurrency(totalStopCostUsd, 'USD', displayCurrency), displayCurrency)}
                </span>
                {isDaySelected && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-teal-700 dark:text-teal-400">
                      Route highlighted on map
                    </span>
                  </>
                )}
              </div>

              {/* Stops List */}
              <div className="p-3 space-y-1.5">
                {day.stops.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Drag a saved place here to schedule it
                    </p>
                    {savedOrAllPlaces.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <select
                          aria-label={`Choose place for Day ${dayIdx + 1}`}
                          value={quickChoice}
                          onChange={(e) =>
                            setQuickAddSelections((prev) => ({
                              ...prev,
                              [day.id]: e.target.value,
                            }))
                          }
                          className="h-8 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {savedOrAllPlaces.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (quickChoice) onAddPlaceToDay(quickChoice, day.id, 0);
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-teal-700 px-3 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Stop
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  day.stops.map((stop, stopIdx) => {
                    const place = placeMap.get(stop.placeId);
                    if (!place) return null;

                    const arrivalTime = formatMinutesToTime(cursorMinutes);
                    const departureMinutes = cursorMinutes + stop.durationMinutes;
                    const departureTime = formatMinutesToTime(departureMinutes);

                    const nextStop = day.stops[stopIdx + 1];
                    const nextPlace = nextStop ? placeMap.get(nextStop.placeId) : undefined;
                    let legDistanceKm = 0;
                    let legMinutes = 0;
                    if (nextPlace) {
                      legDistanceKm = haversineKm(
                        place.lat,
                        place.lng,
                        nextPlace.lat,
                        nextPlace.lng
                      );
                      legMinutes = estimateTravelMinutes(
                        legDistanceKm,
                        stop.travelModeToNext
                      );
                    }
                    cursorMinutes = departureMinutes + legMinutes;

                    const catMeta = CATEGORY_META[place.category];
                    const isStopDropActive = dragOverTarget === `stop-${stop.id}`;
                    const isPlaceSelected = selectedPlaceId === place.id;

                    return (
                      <React.Fragment key={stop.id}>
                        <div
                          draggable
                          onDragStart={(e) => handleStopDragStart(e, day.id, stop.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverTarget(`stop-${stop.id}`);
                          }}
                          onDrop={(e) => handleDropOnDay(e, day.id, stopIdx)}
                          onClick={() => {
                            onSelectDay(day.id);
                            onSelectPlace(place.id);
                          }}
                          className={`group rounded-lg border p-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                            isStopDropActive
                              ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/40 dark:bg-teal-950/30'
                              : isPlaceSelected
                              ? 'border-teal-600/70 bg-white dark:border-teal-500/60 dark:bg-slate-900'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex items-center gap-1 shrink-0">
                              <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 dark:text-slate-600" />
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white"
                                style={{ backgroundColor: catMeta.colorHex }}
                              >
                                {stopIdx + 1}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {place.name}
                                  </h3>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                      {arrivalTime}–{departureTime}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className={catMeta.textClass}>{catMeta.label}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      <input
                                        type="number"
                                        min={10}
                                        max={480}
                                        step={5}
                                        value={stop.durationMinutes}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const val = Math.max(10, Number(e.target.value) || 30);
                                          onUpdateStop(day.id, stop.id, {
                                            durationMinutes: val,
                                          });
                                        }}
                                        aria-label={`Duration in minutes for ${place.name}`}
                                        className="w-11 rounded border border-transparent bg-transparent px-1 font-mono text-[11px] tabular-nums hover:border-slate-200 focus:border-teal-600 focus:bg-white focus:outline-none dark:hover:border-slate-700 dark:focus:bg-slate-800"
                                      />
                                      min
                                    </span>
                                  </div>
                                </div>

                                {/* Reorder & Delete Actions */}
                                <div
                                  className="flex items-center gap-0.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={stopIdx === 0}
                                    onClick={() =>
                                      onMoveStop(day.id, stop.id, day.id, stopIdx - 1)
                                    }
                                    aria-label="Move stop up"
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={stopIdx === day.stops.length - 1}
                                    onClick={() =>
                                      onMoveStop(day.id, stop.id, day.id, stopIdx + 1)
                                    }
                                    aria-label="Move stop down"
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemoveStop(day.id, stop.id)}
                                    aria-label={`Remove ${place.name} from day`}
                                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Editable inline note */}
                              <input
                                type="text"
                                value={stop.note}
                                placeholder="Add timing or booking note..."
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  onUpdateStop(day.id, stop.id, { note: e.target.value })
                                }
                                className="mt-1.5 w-full rounded border border-transparent bg-slate-50/70 px-2 py-1 text-[11px] text-slate-600 placeholder:text-slate-400 hover:border-slate-200 focus:border-teal-600 focus:bg-white focus:outline-none dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-700 dark:focus:bg-slate-800"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Estimated Travel Time Connector Between Consecutive Stops */}
                        {nextPlace && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-4 w-px bg-slate-300 dark:bg-slate-700"
                                aria-hidden="true"
                              />
                              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                ~{legMinutes} min
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatDistance(legDistanceKm)}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
                              {TRAVEL_MODES.map(({ id, label, Icon }) => {
                                const active = stop.travelModeToNext === id;
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() =>
                                      onUpdateStop(day.id, stop.id, {
                                        travelModeToNext: id,
                                      })
                                    }
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                      active
                                        ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
