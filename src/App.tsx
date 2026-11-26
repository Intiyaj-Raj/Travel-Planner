import { useCallback, useEffect, useState } from 'react';
import {
  AppView,
  BudgetCategoryId,
  CurrencyCode,
  ExpenseItem,
  ItineraryDay,
  PackingGroup,
  Place,
  TravelMode,
  TripData,
} from './types/trip';
import { SAMPLE_TRIP, createBlankTrip } from './data/mockTrip';
import { addDaysToIsoDate } from './utils/travel';
import {
  decodeSharePayload,
  encodeSharePayload,
  exportTripToIcs,
  exportTripToJson,
  importIcsIntoTrip,
  validateAndParseTripJson,
} from './utils/exportImport';
import { TopBar } from './components/TopBar';
import { SavedPlacesPanel } from './components/SavedPlacesPanel';
import { DayPlanner } from './components/DayPlanner';
import { MapCanvas } from './components/MapCanvas';
import { BudgetTracker } from './components/BudgetTracker';
import { PackingManager } from './components/PackingManager';
import { ShareView } from './components/ShareView';
import { PrintItinerary } from './components/PrintItinerary';
import { AddPlaceModal, TripSettingsModal } from './components/Modals';

const RELEASE_DAY = Math.min(3, Math.max(1, Number(import.meta.env.VITE_RELEASE_DAY || 3)));
const ENABLED_VIEWS: AppView[] = RELEASE_DAY === 1
  ? ['itinerary']
  : RELEASE_DAY === 2
    ? ['itinerary', 'budget']
    : ['itinerary', 'budget', 'packing', 'share'];

const STORAGE_TRIP_KEY = 'wayfinder_trip_v1';
const STORAGE_THEME_KEY = 'wayfinder_theme_v2';

function resolveInitialRoute(): {
  view: AppView;
  sharedTrip: TripData | null;
} {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const encodedTrip = params.get('trip');

  if (path === '/share') {
    const decoded = encodedTrip ? decodeSharePayload(encodedTrip) : null;
    return { view: 'share', sharedTrip: decoded };
  }
  if (path === '/budget') return { view: 'budget', sharedTrip: null };
  if (path === '/packing') return { view: 'packing', sharedTrip: null };
  return { view: 'itinerary', sharedTrip: null };
}

function loadSavedTrip(): TripData {
  try {
    const raw = localStorage.getItem(STORAGE_TRIP_KEY);
    if (!raw) return SAMPLE_TRIP;
    return validateAndParseTripJson(raw);
  } catch {
    return SAMPLE_TRIP;
  }
}

export default function App() {
  const initialRoute = resolveInitialRoute();

  const [trip, setTrip] = useState<TripData>(loadSavedTrip);
  const [sharedTrip, setSharedTrip] = useState<TripData | null>(
    initialRoute.sharedTrip
  );
  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    () => trip.days[0]?.id || null
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'places' | 'schedule' | 'map'>('schedule');

  const [tripSettingsOpen, setTripSettingsOpen] = useState(false);
  const [addPlaceCoords, setAddPlaceCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [addPlaceModalOpen, setAddPlaceModalOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(
    null
  );

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage failure
    }
  }, [darkMode]);

  // Persist active trip
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRIP_KEY, JSON.stringify(trip));
    } catch {
      // ignore storage failure
    }
  }, [trip]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const next = resolveInitialRoute();
      setActiveView(next.view);
      setSharedTrip(next.sharedTrip);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback(
    (view: AppView) => {
      setActiveView(view);
      const targetPath =
        view === 'itinerary'
          ? '/'
          : view === 'budget'
          ? '/budget'
          : view === 'packing'
          ? '/packing'
          : '/share';

      if (view === 'share') {
        const encoded = encodeSharePayload(trip);
        const url = `${targetPath}?trip=${encoded}`;
        if (url.length < 16000) {
          window.history.pushState({}, '', url);
        } else {
          window.history.pushState({}, '', targetPath);
        }
        setSharedTrip(null);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    },
    [trip]
  );

  const handleCopyShareLink = useCallback(async () => {
    const encoded = encodeSharePayload(trip);
    const shareUrl = `${window.location.origin}/share?trip=${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Shareable read-only link copied to clipboard.');
    } catch {
      navigateTo('share');
      showToast('Opened read-only share route (/share).');
    }
  }, [trip, showToast, navigateTo]);

  // Place & Itinerary Mutations
  const handleToggleSavePlace = useCallback((placeId: string) => {
    setTrip((prev) => ({
      ...prev,
      places: prev.places.map((p) =>
        p.id === placeId ? { ...p, saved: !p.saved } : p
      ),
    }));
  }, []);

  const handleAddCustomPlace = useCallback(
    (placeInput: Omit<Place, 'id'>) => {
      const newPlace: Place = {
        ...placeInput,
        id: `place-custom-${Date.now()}`,
      };
      setTrip((prev) => ({
        ...prev,
        places: [newPlace, ...prev.places],
      }));
      setSelectedPlaceId(newPlace.id);
      showToast(`Added "${newPlace.name}" to saved places.`);
    },
    [showToast]
  );

  const handleAddPlaceToDay = useCallback(
    (placeId: string, dayId: string, insertIndex?: number) => {
      setTrip((prev) => {
        const place = prev.places.find((p) => p.id === placeId);
        if (!place) return prev;

        const newStop = {
          id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          placeId: place.id,
          durationMinutes: place.durationMinutes,
          travelModeToNext: 'walk' as TravelMode,
          note: '',
        };

        return {
          ...prev,
          places: prev.places.map((p) =>
            p.id === placeId ? { ...p, saved: true } : p
          ),
          days: prev.days.map((d) => {
            if (d.id !== dayId) return d;
            const nextStops = [...d.stops];
            const idx =
              typeof insertIndex === 'number'
                ? Math.max(0, Math.min(insertIndex, nextStops.length))
                : nextStops.length;
            nextStops.splice(idx, 0, newStop);
            return { ...d, stops: nextStops };
          }),
        };
      });
      setSelectedDayId(dayId);
    },
    []
  );

  const handleMoveStop = useCallback(
    (fromDayId: string, stopId: string, toDayId: string, toIndex: number) => {
      setTrip((prev) => {
        const sourceDay = prev.days.find((d) => d.id === fromDayId);
        if (!sourceDay) return prev;
        const movingStop = sourceDay.stops.find((s) => s.id === stopId);
        if (!movingStop) return prev;

        if (fromDayId === toDayId) {
          const currentIndex = sourceDay.stops.findIndex((s) => s.id === stopId);
          if (currentIndex === -1 || currentIndex === toIndex) return prev;
          const updated = [...sourceDay.stops];
          updated.splice(currentIndex, 1);
          const boundedIndex = Math.max(0, Math.min(toIndex, updated.length));
          updated.splice(boundedIndex, 0, movingStop);
          return {
            ...prev,
            days: prev.days.map((d) =>
              d.id === fromDayId ? { ...d, stops: updated } : d
            ),
          };
        }

        return {
          ...prev,
          days: prev.days.map((d) => {
            if (d.id === fromDayId) {
              return { ...d, stops: d.stops.filter((s) => s.id !== stopId) };
            }
            if (d.id === toDayId) {
              const nextStops = [...d.stops];
              const boundedIndex = Math.max(0, Math.min(toIndex, nextStops.length));
              nextStops.splice(boundedIndex, 0, movingStop);
              return { ...d, stops: nextStops };
            }
            return d;
          }),
        };
      });
      setSelectedDayId(toDayId);
    },
    []
  );

  const handleUpdateStop = useCallback(
    (
      dayId: string,
      stopId: string,
      patch: Partial<{ durationMinutes: number; travelModeToNext: TravelMode; note: string }>
    ) => {
      setTrip((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? {
                ...d,
                stops: d.stops.map((s) =>
                  s.id === stopId ? { ...s, ...patch } : s
                ),
              }
            : d
        ),
      }));
    },
    []
  );

  const handleRemoveStop = useCallback((dayId: string, stopId: string) => {
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.filter((s) => s.id !== stopId) }
          : d
      ),
    }));
  }, []);

  const handleAddDay = useCallback(() => {
    setTrip((prev) => {
      const nextNum = prev.days.length + 1;
      const nextDate = addDaysToIsoDate(prev.startDate, prev.days.length);
      const newDay: ItineraryDay = {
        id: `day-${Date.now()}`,
        title: `Explore Day ${nextNum}`,
        date: nextDate,
        startTime: '09:00',
        stops: [],
      };
      setSelectedDayId(newDay.id);
      return { ...prev, days: [...prev.days, newDay] };
    });
  }, []);

  const handleRemoveDay = useCallback((dayId: string) => {
    setTrip((prev) => ({
      ...prev,
      days: prev.days.filter((d) => d.id !== dayId),
    }));
    setSelectedDayId((curr) => (curr === dayId ? null : curr));
  }, []);

  const handleUpdateDay = useCallback(
    (
      dayId: string,
      patch: Partial<Pick<ItineraryDay, 'title' | 'date' | 'startTime'>>
    ) => {
      setTrip((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
      }));
    },
    []
  );

  // Budget mutations
  const handleChangeCurrency = useCallback((displayCurrency: CurrencyCode) => {
    setTrip((prev) => ({ ...prev, displayCurrency }));
  }, []);

  const handleUpdateCategoryLimit = useCallback(
    (category: BudgetCategoryId, limitUsd: number) => {
      setTrip((prev) => ({
        ...prev,
        categoryBudgets: prev.categoryBudgets.map((cb) =>
          cb.category === category ? { ...cb, limitUsd } : cb
        ),
      }));
    },
    []
  );

  const handleAddExpense = useCallback((expense: Omit<ExpenseItem, 'id'>) => {
    setTrip((prev) => ({
      ...prev,
      expenses: [
        { ...expense, id: `exp-${Date.now()}` },
        ...prev.expenses,
      ],
    }));
  }, []);

  const handleToggleExpensePaid = useCallback((expenseId: string) => {
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId ? { ...e, paid: !e.paid } : e
      ),
    }));
  }, []);

  const handleDeleteExpense = useCallback((expenseId: string) => {
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  }, []);

  // Packing mutations
  const handleUpdatePackingGroups = useCallback((packingGroups: PackingGroup[]) => {
    setTrip((prev) => ({ ...prev, packingGroups }));
  }, []);

  // Import / Export / Presets
  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = validateAndParseTripJson(text);
      setTrip(parsed);
      setSelectedDayId(parsed.days[0]?.id || null);
      setSelectedPlaceId(null);
      showToast(`Imported trip "${parsed.title}" from JSON.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to import JSON file.',
        true
      );
    }
  };

  const handleImportIcs = async (file: File) => {
    try {
      const text = await file.text();
      const updated = importIcsIntoTrip(text, trip);
      setTrip(updated);
      setSelectedDayId(updated.days[0]?.id || null);
      showToast(
        `Imported ${updated.days.length} day(s) from calendar (.ics).`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to parse .ics file.',
        true
      );
    }
  };

  const handleLoadSampleTrip = () => {
    setTrip(SAMPLE_TRIP);
    setSelectedDayId(SAMPLE_TRIP.days[0]?.id || null);
    setSelectedPlaceId(null);
    showToast('Restored Kyoto Autumn Circuit sample trip.');
  };

  const handleNewBlankTrip = () => {
    const blank = createBlankTrip();
    setTrip(blank);
    setSelectedDayId(null);
    setSelectedPlaceId(null);
    showToast('Created a new blank trip.');
  };

  const activeShareTrip = sharedTrip || trip;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopBar
        activeView={activeView}
        onNavigate={navigateTo}
        trip={activeView === 'share' ? activeShareTrip : trip}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onPrint={() => window.print()}
        onOpenTripSettings={() => setTripSettingsOpen(true)}
        onExportJson={() => {
          exportTripToJson(trip);
          showToast('Exported trip JSON backup.');
        }}
        onExportIcs={() => {
          exportTripToIcs(trip);
          showToast('Exported itinerary calendar (.ics).');
        }}
        onImportJson={handleImportJson}
        onImportIcs={handleImportIcs}
        onLoadSampleTrip={handleLoadSampleTrip}
        onNewBlankTrip={handleNewBlankTrip}
        onCopyShareLink={handleCopyShareLink}
        enabledViews={ENABLED_VIEWS}
      />

      {/* Main Screen Views (hidden during print) */}
      <main className="no-print">
        {activeView === 'itinerary' && (
          <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-4">
            {/* Mobile / Tablet Pane Switcher */}
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1 lg:hidden dark:border-slate-800 dark:bg-slate-900">
              {(
                [
                  { id: 'places', label: 'Places' },
                  { id: 'schedule', label: 'Schedule' },
                  { id: 'map', label: 'Map' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobilePane(tab.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    mobilePane === tab.id
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Desktop 3-Pane Workspace / Mobile Active Pane */}
            <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-132px)] lg:grid-cols-12">
              <div
                className={`lg:col-span-3 lg:block lg:h-full lg:min-h-0 ${
                  mobilePane === 'places' ? 'block h-[72vh]' : 'hidden'
                }`}
              >
                <SavedPlacesPanel
                  places={trip.places}
                  days={trip.days}
                  selectedDayId={selectedDayId}
                  selectedPlaceId={selectedPlaceId}
                  displayCurrency={trip.displayCurrency}
                  onSelectPlace={(pid) => {
                    setSelectedPlaceId(pid);
                  }}
                  onToggleSavePlace={handleToggleSavePlace}
                  onAddPlaceToDay={handleAddPlaceToDay}
                  onOpenAddCustomPlace={() => {
                    setAddPlaceCoords(null);
                    setAddPlaceModalOpen(true);
                  }}
                />
              </div>

              <div
                className={`lg:col-span-4 lg:block lg:h-full lg:min-h-0 ${
                  mobilePane === 'schedule' ? 'block h-[72vh]' : 'hidden'
                }`}
              >
                <DayPlanner
                  days={trip.days}
                  places={trip.places}
                  selectedDayId={selectedDayId}
                  selectedPlaceId={selectedPlaceId}
                  displayCurrency={trip.displayCurrency}
                  onSelectDay={setSelectedDayId}
                  onSelectPlace={(pid) => setSelectedPlaceId(pid)}
                  onAddDay={handleAddDay}
                  onRemoveDay={handleRemoveDay}
                  onUpdateDay={handleUpdateDay}
                  onAddPlaceToDay={handleAddPlaceToDay}
                  onMoveStop={handleMoveStop}
                  onUpdateStop={handleUpdateStop}
                  onRemoveStop={handleRemoveStop}
                  onLoadSampleTrip={handleLoadSampleTrip}
                />
              </div>

              <div
                className={`lg:col-span-5 lg:block lg:h-full lg:min-h-0 ${
                  mobilePane === 'map' ? 'block h-[72vh]' : 'hidden'
                }`}
              >
                <MapCanvas
                  places={trip.places}
                  days={trip.days}
                  selectedDayId={selectedDayId}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={setSelectedPlaceId}
                  onToggleSavePlace={handleToggleSavePlace}
                  onAddPlaceToDay={handleAddPlaceToDay}
                  onMapPickLocation={(lat, lng) => {
                    setAddPlaceCoords({ lat, lng });
                    setAddPlaceModalOpen(true);
                  }}
                  darkMode={darkMode}
                  displayCurrency={trip.displayCurrency}
                  heightClass="h-full"
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'budget' && (
          <BudgetTracker
            displayCurrency={trip.displayCurrency}
            categoryBudgets={trip.categoryBudgets}
            expenses={trip.expenses}
            days={trip.days}
            places={trip.places}
            onChangeDisplayCurrency={handleChangeCurrency}
            onUpdateCategoryLimit={handleUpdateCategoryLimit}
            onAddExpense={handleAddExpense}
            onToggleExpensePaid={handleToggleExpensePaid}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeView === 'packing' && (
          <PackingManager
            groups={trip.packingGroups}
            onUpdateGroups={handleUpdatePackingGroups}
          />
        )}

        {activeView === 'share' && (
          <ShareView
            trip={activeShareTrip}
            isExternalSharedPayload={Boolean(sharedTrip)}
            darkMode={darkMode}
            onCopyShareLink={handleCopyShareLink}
            onPrint={() => window.print()}
            onReturnToEditor={() => navigateTo('itinerary')}
            onForkSharedTrip={() => {
              if (sharedTrip) {
                setTrip(sharedTrip);
                setSharedTrip(null);
                setSelectedDayId(sharedTrip.days[0]?.id || null);
                navigateTo('itinerary');
                showToast('Saved an editable copy of the shared trip.');
              }
            }}
          />
        )}
      </main>

      {/* Dedicated Print-Friendly Itinerary */}
      <PrintItinerary trip={activeView === 'share' ? activeShareTrip : trip} />

      {/* Modals */}
      {tripSettingsOpen && (
        <TripSettingsModal
          trip={trip}
          onSave={(patch) => {
            setTrip((prev) => ({
              ...prev,
              ...patch,
              days: prev.days.map((d, idx) => ({
                ...d,
                date: addDaysToIsoDate(patch.startDate, idx),
              })),
            }));
            showToast('Updated trip details.');
          }}
          onClose={() => setTripSettingsOpen(false)}
        />
      )}

      {addPlaceModalOpen && (
        <AddPlaceModal
          initialCoords={addPlaceCoords}
          onAddPlace={handleAddCustomPlace}
          onClose={() => setAddPlaceModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-5 right-5 z-[600] rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg ${
            toast.isError
              ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'
              : 'border-slate-200 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
