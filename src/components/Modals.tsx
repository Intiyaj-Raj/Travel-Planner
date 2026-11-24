import React, { useState } from "react";
import { X } from "lucide-react";
import { CurrencyCode, Place, PlaceCategory, TripData } from "../types/trip";
import { CATEGORY_META } from "../utils/travel";

interface TripSettingsModalProps {
  trip: TripData;
  onSave: (
    patch: Pick<
      TripData,
      "title" | "destination" | "startDate" | "travelers" | "displayCurrency"
    >,
  ) => void;
  onClose: () => void;
}

export function TripSettingsModal({
  trip,
  onSave,
  onClose,
}: TripSettingsModalProps) {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [travelers, setTravelers] = useState(trip.travelers);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(
    trip.displayCurrency,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || "Untitled Trip",
      destination: destination.trim() || "Custom Destination",
      startDate,
      travelers: Math.max(1, travelers),
      displayCurrency,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trip settings"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Trip Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Trip Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Travelers
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value) || 1)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={displayCurrency}
                onChange={(e) =>
                  setDisplayCurrency(e.target.value as CurrencyCode)
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {(["USD", "JPY", "EUR", "GBP", "CAD"] as CurrencyCode[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 dark:bg-teal-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddPlaceModalProps {
  initialCoords?: { lat: number; lng: number } | null;
  onAddPlace: (place: Omit<Place, "id">) => void;
  onClose: () => void;
}

export function AddPlaceModal({
  initialCoords,
  onAddPlace,
  onClose,
}: AddPlaceModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("landmark");
  const [neighborhood, setNeighborhood] = useState("Central Kyoto");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(initialCoords?.lat ?? 35.0085));
  const [lng, setLng] = useState(String(initialCoords?.lng ?? 135.7681));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [estimatedCostUsd, setEstimatedCostUsd] = useState(10);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    onAddPlace({
      name: name.trim(),
      category,
      neighborhood: neighborhood.trim() || "Custom Area",
      address: address.trim() || neighborhood.trim() || "Custom Location",
      lat: Number.isNaN(parsedLat) ? 35.0085 : parsedLat,
      lng: Number.isNaN(parsedLng) ? 135.7681 : parsedLng,
      durationMinutes: Math.max(15, durationMinutes),
      estimatedCostUsd: Math.max(0, estimatedCostUsd),
      rating: 4.8,
      hours: "09:00 – 18:00",
      description: description.trim() || "Custom traveler-pinned location.",
      saved: true,
      isCustom: true,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add custom place"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Add Custom Place
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Place Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Gion Corner Tea House"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlaceCategory)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {(Object.keys(CATEGORY_META) as PlaceCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Neighborhood
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Longitude
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Est. Duration (min)
              </label>
              <input
                type="number"
                min={15}
                step={5}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value) || 60)
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Est. Cost (USD)
              </label>
              <input
                type="number"
                min={0}
                value={estimatedCostUsd}
                onChange={(e) =>
                  setEstimatedCostUsd(Number(e.target.value) || 0)
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Address / Notes
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional street address"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why visit this stop?"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 dark:bg-teal-600"
            >
              Save & Pin Place
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
