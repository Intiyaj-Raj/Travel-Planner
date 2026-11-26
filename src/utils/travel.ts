import { CurrencyCode, PlaceCategory, TravelMode } from '../types/trip';

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; name: string; rateFromUsd: number; decimals: number }
> = {
  USD: { symbol: '$', name: 'US Dollar', rateFromUsd: 1, decimals: 0 },
  JPY: { symbol: '¥', name: 'Japanese Yen', rateFromUsd: 152, decimals: 0 },
  EUR: { symbol: '€', name: 'Euro', rateFromUsd: 0.92, decimals: 0 },
  GBP: { symbol: '£', name: 'British Pound', rateFromUsd: 0.79, decimals: 0 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', rateFromUsd: 1.38, decimals: 0 },
};

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  const usd = amount / CURRENCY_META[from].rateFromUsd;
  return usd * CURRENCY_META[to].rateFromUsd;
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  showDecimals = false
): string {
  const meta = CURRENCY_META[currency];
  const decimals = showDecimals && currency !== 'JPY' ? 2 : meta.decimals;
  const formatted = Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `${meta.symbol}${formatted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply by 1.24 city-grid detour factor for realistic street distance
  return R * c * 1.24;
}

export function estimateTravelMinutes(distanceKm: number, mode: TravelMode): number {
  if (distanceKm < 0.05) return 2;
  switch (mode) {
    case 'walk':
      // ~4.6 km/h walking speed
      return Math.max(3, Math.round((distanceKm / 4.6) * 60));
    case 'transit':
      // ~22 km/h urban rail/bus + 6 min transfer/wait
      return Math.max(6, Math.round((distanceKm / 22) * 60 + 6));
    case 'taxi':
      // ~28 km/h city traffic + 3 min pickup
      return Math.max(5, Math.round((distanceKm / 28) * 60 + 3));
  }
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.max(50, Math.round((km * 1000) / 10) * 10)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 9 * 60;
  return h * 60 + m;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDaysToIsoDate(isoDate: string, offsetDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return date.toISOString().slice(0, 10);
}

export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  });
}

export const CATEGORY_META: Record<
  PlaceCategory,
  {
    label: string;
    colorHex: string;
    badgeBg: string;
    textClass: string;
    svgPath: string;
  }
> = {
  landmark: {
    label: 'Landmark',
    colorHex: '#D97706',
    badgeBg: 'bg-amber-600',
    textClass: 'text-amber-700 dark:text-amber-400',
    svgPath: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  },
  dining: {
    label: 'Dining',
    colorHex: '#E11D48',
    badgeBg: 'bg-rose-600',
    textClass: 'text-rose-700 dark:text-rose-400',
    svgPath: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
  },
  culture: {
    label: 'Culture',
    colorHex: '#4F46E5',
    badgeBg: 'bg-indigo-600',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    svgPath: 'M2 20h20M4 20V10l8-6 8 6v10M9 20v-5h6v5',
  },
  nature: {
    label: 'Nature',
    colorHex: '#059669',
    badgeBg: 'bg-emerald-600',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    svgPath: 'M12 22v-7m0 0c-3.5 0-6-2.5-6-6 0-3 2.5-6 6-8 3.5 2 6 5 6 8 0 3.5-2.5 6-6 6z',
  },
  transit: {
    label: 'Transit',
    colorHex: '#0284C7',
    badgeBg: 'bg-sky-600',
    textClass: 'text-sky-700 dark:text-sky-400',
    svgPath: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  },
  stay: {
    label: 'Stay',
    colorHex: '#0D9488',
    badgeBg: 'bg-teal-600',
    textClass: 'text-teal-700 dark:text-teal-400',
    svgPath: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  },
};
