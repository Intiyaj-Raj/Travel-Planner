import { TripData } from "../types/trip";
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
} from "../utils/travel";

interface PrintItineraryProps {
  trip: TripData;
}

export function PrintItinerary({ trip }: PrintItineraryProps) {
  const placeMap = new Map(trip.places.map((p) => [p.id, p]));
  const endDate =
    trip.days.length > 0
      ? trip.days[trip.days.length - 1].date
      : addDaysToIsoDate(trip.startDate, 0);

  const totalBudget = trip.categoryBudgets.reduce(
    (s, c) => s + convertCurrency(c.limitUsd, "USD", trip.displayCurrency),
    0,
  );
  const totalLogged = trip.expenses.reduce(
    (s, e) => s + convertCurrency(e.amount, e.currency, trip.displayCurrency),
    0,
  );

  return (
    <div className="hidden print-only bg-white text-slate-900">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Wayfinder Travel Itinerary
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">
          {trip.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
          <span>{trip.destination}</span>
          <span>·</span>
          <span>
            {formatShortDate(trip.startDate)}
            {trip.days.length > 1 ? ` – ${formatShortDate(endDate)}` : ""}
          </span>
          <span>·</span>
          <span>
            {trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"}
          </span>
          <span>·</span>
          <span className="font-mono">
            Budget: {formatMoney(totalLogged, trip.displayCurrency)} /{" "}
            {formatMoney(totalBudget, trip.displayCurrency)}
          </span>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-6">
        {trip.days.map((day, dIdx) => {
          let cursor = parseTimeToMinutes(day.startTime);
          return (
            <section
              key={day.id}
              className="print-break-inside-avoid border border-slate-300 rounded-lg p-4"
            >
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 mb-3">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Day {dIdx + 1}: {day.title}
                </h2>
                <span className="font-mono text-xs text-slate-600">
                  {formatShortDate(day.date)} · Start {day.startTime}
                </span>
              </div>

              {day.stops.length === 0 ? (
                <p className="text-xs text-slate-500">No stops scheduled.</p>
              ) : (
                <div className="space-y-2.5">
                  {day.stops.map((stop, sIdx) => {
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
                        nextPlace.lng,
                      );
                      legMin = estimateTravelMinutes(
                        legKm,
                        stop.travelModeToNext,
                      );
                    }
                    cursor = endMin + legMin;

                    return (
                      <div key={stop.id} className="text-xs">
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="font-semibold text-slate-900">
                            {sIdx + 1}. {place.name}{" "}
                            <span className="font-normal text-slate-500">
                              ({CATEGORY_META[place.category].label})
                            </span>
                          </div>
                          <div className="font-mono text-slate-700 shrink-0">
                            {startStr}–{endStr} ({stop.durationMinutes}m)
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {place.address}
                        </div>
                        {stop.note && (
                          <div className="text-[11px] text-slate-800 mt-0.5 italic">
                            Note: {stop.note}
                          </div>
                        )}
                        {nextPlace && (
                          <div className="mt-1.5 pl-4 font-mono text-[10px] text-slate-500">
                            ↳ Travel to next stop: ~{legMin} min{" "}
                            {stop.travelModeToNext} ({formatDistance(legKm)})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Packing Summary */}
      {trip.packingGroups.length > 0 && (
        <section className="print-break-inside-avoid mt-8 border-t border-slate-300 pt-4">
          <h2 className="font-display text-base font-bold text-slate-900 mb-3">
            Packing Checklist Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {trip.packingGroups.map((g) => (
              <div key={g.id}>
                <div className="font-semibold text-slate-900 mb-1">
                  {g.title}
                </div>
                <ul className="space-y-0.5 text-slate-700">
                  {g.items.map((item) => (
                    <li key={item.id}>
                      [{item.checked ? "x" : " "}] {item.label} (x
                      {item.quantity})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
