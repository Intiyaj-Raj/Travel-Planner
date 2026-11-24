export type PlaceCategory =
  | "landmark"
  | "dining"
  | "culture"
  | "nature"
  | "transit"
  | "stay";

export type TravelMode = "walk" | "transit" | "taxi";

export type CurrencyCode = "USD" | "JPY" | "EUR" | "GBP" | "CAD";

export type BudgetCategoryId =
  | "accommodation"
  | "dining"
  | "activities"
  | "transit"
  | "shopping";

export type AppView = "itinerary" | "budget" | "packing" | "share";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  durationMinutes: number;
  estimatedCostUsd: number;
  rating: number;
  hours: string;
  description: string;
  tip?: string;
  imageUrl?: string;
  saved: boolean;
  isCustom?: boolean;
}

export interface DayStop {
  id: string;
  placeId: string;
  durationMinutes: number;
  travelModeToNext: TravelMode;
  note: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  stops: DayStop[];
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: BudgetCategoryId;
  amount: number;
  currency: CurrencyCode;
  dayId?: string;
  paid: boolean;
  date: string;
}

export interface CategoryBudget {
  category: BudgetCategoryId;
  label: string;
  limitUsd: number;
}

export interface PackingSubItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PackingItem {
  id: string;
  label: string;
  quantity: number;
  checked: boolean;
  subItems: PackingSubItem[];
}

export interface PackingGroup {
  id: string;
  title: string;
  items: PackingItem[];
}

export interface PackingTemplate {
  id: string;
  name: string;
  description: string;
  groups: Omit<PackingGroup, "id">[];
}

export interface TripData {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  travelers: number;
  displayCurrency: CurrencyCode;
  places: Place[];
  days: ItineraryDay[];
  categoryBudgets: CategoryBudget[];
  expenses: ExpenseItem[];
  packingGroups: PackingGroup[];
}
