import { useMemo, useState } from 'react';
import {
  Copy,
  Edit3,
  Printer,
  Share2,
} from 'lucide-react';
import { TripData } from '../types/trip';
import {
  CATEGORY_META,
  addDaysToIsoDate,
  convertCurrency,
  estimateTravelMinutes,
  formatDistance,
  formatMinutesToTime,
  formatMoney,
  formatShortDate,
  haversineKm,
  parseTimeToMinutes,
} from '../utils/travel';
import { MapCanvas } from './MapCanvas';

interface ShareViewProps {
  trip: TripData;
  isExternalSharedPayload: boolean;
  darkMode: boolean;
  onCopyShareLink: () => void;
  onPrint: () => void;
  onReturnToEditor: () => void;
  onForkSharedTrip: () => void;
}

export function ShareView({
  trip,
  isExternalSharedPayload,
  darkMode,
  onCopyShareLink,
  onPrint,
  onReturnToEditor,
  onForkSharedTrip,
}: ShareViewProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    trip.days[0]?.id || null
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const placeMap = useMemo(
    () => new Map(trip.places.map((p) => [p.id, p])),
    [trip.places]
  );

  const endDate =
    trip.days.length > 0
      ? trip.days[trip.days.length - 1].date
      : addDaysToIsoDate(trip.startDate, 0);

  const totalStops = useMemo(
    () => trip.days.reduce((sum, d) => sum + d.stops.length, 0),
    [trip.days]
  );

  const totalBudgetDisplay = useMemo(
    () =>
      trip.categoryBudgets.reduce(
        (sum, c) => sum + convertCurrency(c.limitUsd, 'USD', trip.displayCurrency),
        0
      ),
    [trip.categoryBudgets, trip.displayCurrency]
  );

  const totalLoggedDisplay = useMemo(
    () =>
      trip.expenses.reduce(
        (sum, e) => sum + convertCurrency(e.amount, e.currency, trip.displayCurrency),
        0
      ),
    [trip.expenses, trip.displayCurrency]
  );

  return (
    <div className="no-print mx-auto max-w-[1440px] px-4 sm:px-6 py-6 space-y-6">
      {/* Read-Only Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-600/30 bg-teal-50/70 px-4 py-3 dark:border-teal-500/30 dark:bg-teal-950/30">
        <div className="flex items-center gap-2.5 text-xs text-teal-900 dark:text-teal-200">
          <Share2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
          <span>
            <strong className="font-semibold">Read-Only Share View</strong> — Anyone with this link can inspect the route, schedule, and budget without modifying your plan.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopyShareLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Share Link
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>

          {isExternalSharedPayload ? (
            <button
              type="button"
              onClick={onForkSharedTrip}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Save Editable Copy
            </button>
          ) : (
            <button
              type="button"
              onClick={onReturnToEditor}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Back to Editor
            </button>
          )}
        </div>
      </div>

      {/* Trip Dossier Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-teal-700 dark:text-teal-400">
              {trip.destination} · {formatShortDate(trip.startDate)}
              {trip.days.length > 1 ? ` – ${formatShortDate(endDate)}` : ''}
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {trip.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <div>Duration</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
              </div>
            </div>
            <div>
              <div>Planned Stops</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {totalStops} stops
              </div>
            </div>
            <div>
              <div>Travelers</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {trip.travelers}
              </div>
            </div>
            <div>
              <div>Logged / Budget</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatMoney(totalLoggedDisplay, trip.displayCurrency)} /{' '}
                {formatMoney(totalBudgetDisplay, trip.displayCurrency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Read-Only Split: Schedule + Map */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Read-only Schedule */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Itinerary Schedule
            </h2>
            <button
              type="button"
              onClick={() => setSelectedDayId(null)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                selectedDayId === null
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              All Days
            </button>
          </div>

          {trip.days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No days scheduled in this shared itinerary yet.
            </div>
          ) : (
            trip.days.map((day, dIdx) => {
              let cursor = parseTimeToMinutes(day.startTime);
              const isSelected = selectedDayId === day.id;
              return (
                <div
                  key={day.id}
                  className={`rounded-xl border bg-white p-4 dark:bg-slate-900 transition-colors ${
                    isSelected
                      ? 'border-teal-600/60 dark:border-teal-500/60'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDayId(isSelected ? null : day.id)}
                    className="flex w-full items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-left"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">
                        Day {dIdx + 1}
                      </span>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {day.title}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatShortDate(day.date)} · Start {day.startTime}
                    </span>
                  </button>

                  <div className="mt-3 space-y-2">
                    {day.stops.length === 0 ? (
                      <p className="text-xs text-slate-400">No stops scheduled.</p>
                    ) : (
                      day.stops.map((stop, sIdx) => {
                        const place = placeMap.get(stop.placeId);
                        if (!place) return null;
                        const startStr = formatMinutesToTime(cursor);
                        const endMin = cursor + stop.durationMinutes;
                        const endStr = formatMinutesToTime(endMin);

                        const nextStop = day.stops[sIdx + 1];
                        const nextPlace = nextStop
                          ? placeMap.get(nextStop.placeId)
                          : undefined;
                        let legMin = 0;
                        let legKm = 0;
                        if (nextPlace) {
                          legKm = haversineKm(
                            place.lat,
                            place.lng,
                            nextPlace.lat,
                            nextPlace.lng
                          );
                          legMin = estimateTravelMinutes(legKm, stop.travelModeToNext);
                        }
                        cursor = endMin + legMin;

                        const meta = CATEGORY_META[place.category];

                        return (
                          <div key={stop.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDayId(day.id);
                                setSelectedPlaceId(place.id);
                              }}
                              className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <span
                                className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white shrink-0"
                                style={{ backgroundColor: meta.colorHex }}
                              >
                                {sIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                    {place.name}
                                  </span>
                                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                                    {startStr}–{endStr}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {meta.label} · {place.neighborhood} · {stop.durationMinutes} min
                                </div>
                                {stop.note && (
                                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                    {stop.note}
                                  </p>
                                )}
                              </div>
                            </button>

                            {nextPlace && (
                              <div className="ml-8 my-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                                <span>↓</span>
                                <span>
                                  ~{legMin} min {stop.travelModeToNext} ({formatDistance(legKm)})
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Read-only Map */}
        <div className="lg:col-span-6 lg:sticky lg:top-20 h-[460px] lg:h-[640px]">
          <MapCanvas
            places={trip.places}
            days={trip.days}
            selectedDayId={selectedDayId}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={setSelectedPlaceId}
            onToggleSavePlace={() => {}}
            onAddPlaceToDay={() => {}}
            darkMode={darkMode}
            displayCurrency={trip.displayCurrency}
            readOnly
            heightClass="h-full"
          />
        </div>
      </div>
    </div>
  );
}
