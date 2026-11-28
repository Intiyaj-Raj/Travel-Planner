import { DayStop, ItineraryDay, Place, TripData } from "../types/trip";
import {
  addDaysToIsoDate,
  estimateTravelMinutes,
  haversineKm,
  parseTimeToMinutes,
} from "./travel";

export function exportTripToJson(trip: TripData): void {
  const payload = JSON.stringify(trip, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const slug = trip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  triggerDownload(blob, `${slug || "wayfinder-trip"}.json`);
}

export function validateAndParseTripJson(raw: string): TripData {
  const parsed = JSON.parse(raw) as Partial<TripData>;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.title !== "string" ||
    !Array.isArray(parsed.places) ||
    !Array.isArray(parsed.days)
  ) {
    throw new Error(
      "Invalid trip JSON format: missing title, places, or days.",
    );
  }
  return {
    id: parsed.id || `trip-${Date.now()}`,
    title: parsed.title,
    destination: parsed.destination || "Custom Destination",
    startDate: parsed.startDate || new Date().toISOString().slice(0, 10),
    travelers: typeof parsed.travelers === "number" ? parsed.travelers : 1,
    displayCurrency: parsed.displayCurrency || "USD",
    places: parsed.places,
    days: parsed.days,
    categoryBudgets: Array.isArray(parsed.categoryBudgets)
      ? parsed.categoryBudgets
      : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    packingGroups: Array.isArray(parsed.packingGroups)
      ? parsed.packingGroups
      : [],
  };
}

function formatIcsDateTime(
  isoDate: string,
  minutesFromMidnight: number,
): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(
    Date.UTC(y || 2026, (m || 1) - 1, d || 1, 0, minutesFromMidnight),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${base.getUTCFullYear()}${pad(base.getUTCMonth() + 1)}${pad(base.getUTCDate())}` +
    `T${pad(base.getUTCHours())}${pad(base.getUTCMinutes())}00`
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function exportTripToIcs(trip: TripData): void {
  const placeMap = new Map(trip.places.map((p) => [p.id, p]));
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayfinder//Travel Planner & Itinerary Builder//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(trip.title)}`,
  ];

  const stamp =
    new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  trip.days.forEach((day) => {
    let cursorMinutes = parseTimeToMinutes(day.startTime);
    day.stops.forEach((stop, idx) => {
      const place = placeMap.get(stop.placeId);
      if (!place) return;
      const startMin = cursorMinutes;
      const endMin = startMin + stop.durationMinutes;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${stop.id}@wayfinder.local`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${formatIcsDateTime(day.date, startMin)}`);
      lines.push(`DTEND:${formatIcsDateTime(day.date, endMin)}`);
      lines.push(`SUMMARY:${escapeIcsText(place.name)}`);
      lines.push(
        `LOCATION:${escapeIcsText(place.address || place.neighborhood)}`,
      );
      lines.push(`GEO:${place.lat.toFixed(5)};${place.lng.toFixed(5)}`);
      const descParts = [
        `${day.title} — ${place.category.toUpperCase()}`,
        place.description,
        stop.note ? `Notes: ${stop.note}` : "",
      ].filter(Boolean);
      lines.push(`DESCRIPTION:${escapeIcsText(descParts.join("\n"))}`);
      lines.push("END:VEVENT");

      cursorMinutes = endMin;
      const nextStop = day.stops[idx + 1];
      if (nextStop) {
        const nextPlace = placeMap.get(nextStop.placeId);
        if (nextPlace) {
          const km = haversineKm(
            place.lat,
            place.lng,
            nextPlace.lat,
            nextPlace.lng,
          );
          cursorMinutes += estimateTravelMinutes(km, stop.travelModeToNext);
        }
      }
    });
  });

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const slug = trip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  triggerDownload(blob, `${slug || "wayfinder-itinerary"}.ics`);
}

function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDateTime(
  val: string,
): { date: string; time: string; minutes: number } | null {
  const clean = val.trim().replace(/^.*:/, "");
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, hh = "09", mm = "00"] = match;
  const hNum = Number(hh);
  const mNum = Number(mm);
  return {
    date: `${y}-${m}-${d}`,
    time: `${hh}:${mm}`,
    minutes: hNum * 60 + mNum,
  };
}

export function importIcsIntoTrip(
  icsContent: string,
  currentTrip: TripData,
): TripData {
  // Unfold lines per RFC 5545
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, "");
  const rawLines = unfolded.split(/\r?\n/);

  interface ParsedEvent {
    summary: string;
    location: string;
    description: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    lat?: number;
    lng?: number;
  }

  const events: ParsedEvent[] = [];
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of rawLines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      const startParsed = current.DTSTART
        ? parseIcsDateTime(current.DTSTART)
        : null;
      const endParsed = current.DTEND ? parseIcsDateTime(current.DTEND) : null;
      if (current.SUMMARY && startParsed) {
        let duration = 60;
        if (
          endParsed &&
          endParsed.date === startParsed.date &&
          endParsed.minutes > startParsed.minutes
        ) {
          duration = endParsed.minutes - startParsed.minutes;
        }
        let lat: number | undefined;
        let lng: number | undefined;
        if (current.GEO) {
          const [gLat, gLng] = current.GEO.split(";").map(Number);
          if (!Number.isNaN(gLat) && !Number.isNaN(gLng)) {
            lat = gLat;
            lng = gLng;
          }
        }
        events.push({
          summary: unescapeIcsText(current.SUMMARY),
          location: unescapeIcsText(current.LOCATION || ""),
          description: unescapeIcsText(current.DESCRIPTION || ""),
          date: startParsed.date,
          startTime: startParsed.time,
          durationMinutes: duration,
          lat,
          lng,
        });
      }
      continue;
    }
    if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        const keyPart = line.slice(0, colonIdx).split(";")[0].toUpperCase();
        const valPart = line.slice(colonIdx + 1);
        current[keyPart] = valPart;
      }
    }
  }

  if (events.length === 0) {
    throw new Error(
      "No calendar events (VEVENT) found in the imported .ics file.",
    );
  }

  const updatedPlaces = [...currentTrip.places];
  const eventsByDate = new Map<string, ParsedEvent[]>();

  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );

  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const centerLat = updatedPlaces[0]?.lat ?? 35.0116;
  const centerLng = updatedPlaces[0]?.lng ?? 135.7681;

  const newDays: ItineraryDay[] = [];
  let dayIndex = 0;

  for (const [date, dayEvents] of eventsByDate.entries()) {
    const stops: DayStop[] = dayEvents.map((ev, idx) => {
      let existing = updatedPlaces.find(
        (p) => p.name.toLowerCase() === ev.summary.toLowerCase(),
      );
      if (!existing) {
        existing = {
          id: `place-ics-${Date.now()}-${dayIndex}-${idx}`,
          name: ev.summary,
          category: "landmark",
          neighborhood: ev.location || currentTrip.destination,
          address: ev.location || currentTrip.destination,
          lat: ev.lat ?? centerLat + (Math.random() - 0.5) * 0.03,
          lng: ev.lng ?? centerLng + (Math.random() - 0.5) * 0.03,
          durationMinutes: ev.durationMinutes,
          estimatedCostUsd: 0,
          rating: 4.5,
          hours: "Imported event",
          description: ev.description || "Imported from calendar (.ics)",
          saved: true,
          isCustom: true,
        };
        updatedPlaces.push(existing);
      } else if (!existing.saved) {
        existing.saved = true;
      }

      return {
        id: `stop-ics-${Date.now()}-${dayIndex}-${idx}`,
        placeId: existing.id,
        durationMinutes: ev.durationMinutes,
        travelModeToNext: "transit",
        note: ev.description ? ev.description.split("\n")[0].slice(0, 120) : "",
      };
    });

    newDays.push({
      id: `day-ics-${Date.now()}-${dayIndex}`,
      title: `Imported Day ${dayIndex + 1}`,
      date: date || addDaysToIsoDate(currentTrip.startDate, dayIndex),
      startTime: dayEvents[0]?.startTime || "09:00",
      stops,
    });
    dayIndex += 1;
  }

  return {
    ...currentTrip,
    startDate: newDays[0]?.date || currentTrip.startDate,
    places: updatedPlaces,
    days: newDays,
  };
}

export function encodeSharePayload(trip: TripData): string {
  // Keep payload compact by trimming non-essential imageUrl strings that are static local paths
  const compact = {
    ...trip,
    places: trip.places.map((p) => ({
      ...p,
      imageUrl: p.imageUrl,
    })),
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeSharePayload(encoded: string): TripData | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return validateAndParseTripJson(json);
  } catch {
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
