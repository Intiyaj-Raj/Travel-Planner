import React, { useRef, useState } from "react";
import {
  Calendar,
  Download,
  FilePlus2,
  Moon,
  Printer,
  RotateCcw,
  Settings2,
  Share2,
  Sun,
  Upload,
} from "lucide-react";
import { AppView, TripData } from "../types/trip";
import { formatShortDate, addDaysToIsoDate } from "../utils/travel";

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  trip: TripData;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onPrint: () => void;
  onOpenTripSettings: () => void;
  onExportJson: () => void;
  onExportIcs: () => void;
  onImportJson: (file: File) => void;
  onImportIcs: (file: File) => void;
  onLoadSampleTrip: () => void;
  onNewBlankTrip: () => void;
  onCopyShareLink: () => void;
  enabledViews?: AppView[];
}

export function TopBar({
  activeView,
  onNavigate,
  trip,
  darkMode,
  onToggleDarkMode,
  onPrint,
  onOpenTripSettings,
  onExportJson,
  onExportIcs,
  onImportJson,
  onImportIcs,
  onLoadSampleTrip,
  onNewBlankTrip,
  onCopyShareLink,
  enabledViews,
}: TopBarProps) {
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);

  const endDate =
    trip.days.length > 0
      ? trip.days[trip.days.length - 1].date
      : addDaysToIsoDate(trip.startDate, 0);

  const allNavItems: { id: AppView; label: string }[] = [
    { id: "itinerary", label: "Itinerary" },
    { id: "budget", label: "Budget" },
    { id: "packing", label: "Packing" },
    { id: "share", label: "Share View" },
  ];
  const navItems = enabledViews
    ? allNavItems.filter((item) => enabledViews.includes(item.id))
    : allNavItems;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    handler: (file: File) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handler(file);
    }
    e.target.value = "";
    setDataMenuOpen(false);
  };

  return (
    <div className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="mx-auto flex max-w-[1600px] items-center justify-between gap-8 px-4 sm:px-6 h-14">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate("itinerary")}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          Wayfinder
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary sections"
          className="flex items-center gap-4 sm:gap-7 overflow-x-auto"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  isActive
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-600 dark:bg-teal-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Itinerary</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </header>

      {/* Workspace Sub-Toolbar (hidden in Read-Only Share View) */}
      {activeView !== "share" && (
        <div className="border-t border-slate-100 bg-white dark:border-slate-800/80 dark:bg-slate-950/60">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2">
            {/* Left: Active trip summary & quick metadata edit */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onOpenTripSettings}
                className="group flex items-center gap-2.5 text-left rounded-md px-2 py-1 -ml-2 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors min-w-0"
              >
                <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[190px] sm:max-w-[260px]">
                  {trip.title}
                </span>
                <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {trip.destination} · {formatShortDate(trip.startDate)}
                  {trip.days.length > 1
                    ? ` – ${formatShortDate(endDate)}`
                    : ""}{" "}
                  · <span className="tabular-nums">{trip.travelers}</span>{" "}
                  {trip.travelers === 1 ? "traveler" : "travelers"}
                </span>
                <Settings2 className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-400 shrink-0" />
              </button>
            </div>

            {/* Right: Workspace utilities */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                <span>Copy Share Link</span>
              </button>

              {/* Export / Import / Trip Data Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDataMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Import / Export</span>
                </button>

                {dataMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDataMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        Export Trip
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onExportJson();
                          setDataMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        Export JSON Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onExportIcs();
                          setDataMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        Export Calendar (.ics)
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        Import File
                      </div>
                      <button
                        type="button"
                        onClick={() => jsonInputRef.current?.click()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        Import Trip JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => icsInputRef.current?.click()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        Import Calendar (.ics)
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        Trip Presets
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onNewBlankTrip();
                          setDataMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <FilePlus2 className="h-3.5 w-3.5 text-slate-500" />
                        New Blank Trip
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLoadSampleTrip();
                          setDataMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                        Restore Sample Kyoto Trip
                      </button>
                    </div>
                  </>
                )}

                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, onImportJson)}
                />
                <input
                  ref={icsInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, onImportIcs)}
                />
              </div>

              {/* Light / Dark Theme Switch */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
