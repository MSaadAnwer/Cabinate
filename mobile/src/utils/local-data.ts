import type { Category } from "./kitchen";

export interface ListItem {
  id: string;
  name: string;
  category: Category;
  checked: boolean;
}
export interface GroceryList {
  id: string;
  name: string;
  items: ListItem[];
  createdAt: string;
}
export interface PhotoEntry {
  id: string;
  date: string;
  uri: string;
  caption: string;
}
export interface Receipt {
  id: string;
  uri: string;
  date: string;
}
export interface LocalData {
  lists: GroceryList[];
  meals: PhotoEntry[];
  receipts: Receipt[];
  steps: Record<string, number[]>;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const identified = (value: unknown): value is Record<string, unknown> =>
  record(value) && text(value.id) && value.id.length > 0;
const unique = (values: unknown[], valid: (value: unknown) => boolean) =>
  values.every(valid) &&
  new Set(values.map((value) => (value as { id: string }).id)).size ===
    values.length;

/** Reject incomplete/corrupt snapshots before any screen reads nested values. */
export function parseLocalData(
  raw: string,
  categories: readonly string[],
): LocalData {
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    !Array.isArray(value.lists) ||
    !unique(
      value.lists,
      (list) =>
        identified(list) &&
        text(list.name) &&
        text(list.createdAt) &&
        Array.isArray(list.items) &&
        unique(
          list.items,
          (item) =>
            identified(item) &&
            text(item.name) &&
            text(item.category) &&
            categories.includes(item.category) &&
            typeof item.checked === "boolean",
        ),
    ) ||
    !Array.isArray(value.meals) ||
    !unique(
      value.meals,
      (meal) =>
        identified(meal) &&
        text(meal.date) &&
        text(meal.uri) &&
        text(meal.caption),
    ) ||
    !Array.isArray(value.receipts) ||
    !unique(
      value.receipts,
      (receipt) =>
        identified(receipt) && text(receipt.date) && text(receipt.uri),
    ) ||
    !record(value.steps) ||
    !Object.values(value.steps).every(
      (steps) =>
        Array.isArray(steps) &&
        steps.every((step) => Number.isInteger(step) && step >= 0),
    )
  )
    throw new Error("Invalid saved data");
  return value as unknown as LocalData;
}
