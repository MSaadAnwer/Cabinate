import type { PantryItem } from '../types/pantry';

const DAY_MS = 86_400_000;

/** Compare calendar days, so daylight saving changes cannot add an extra day. */
export function daysUntilExpiration(date: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const expiration = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(expiration) || new Date(expiration).toISOString().slice(0, 10) !== date) return null;
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (expiration - currentDay) / DAY_MS;
}

export function getExpiringItems(items: PantryItem[], today = new Date()): PantryItem[] {
  return items.filter((item) => {
    const days = item.expirationDate ? daysUntilExpiration(item.expirationDate, today) : null;
    return days !== null && days <= 7;
  }).sort((a, b) => a.expirationDate!.localeCompare(b.expirationDate!));
}
