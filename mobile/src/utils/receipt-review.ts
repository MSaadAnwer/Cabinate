import type { ReceiptConfirmation, ReceiptDraft, ReceiptReviewRow } from "../types/receipt";

const positive = (value: number) => Number.isFinite(value) && value > 0;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const nonblank = (value: unknown): value is string => typeof value === "string" && !!value.trim();

export function receiptReview(draft: ReceiptDraft): ReceiptReviewRow[] {
  return draft.items.map((item) => ({
    lineId: item.id,
    sourceText: item.sourceText,
    name: item.name,
    quantity: item.quantity === null ? "" : String(item.quantity),
    unit: item.unit,
    category: item.category || "Other",
    location: item.location || "CABINET",
    kind: item.kind,
    confidence: item.confidence,
    foodConfirmed: item.kind === "FOOD",
    selected: item.kind === "FOOD" && item.confidence === "HIGH" && item.quantity !== null && positive(item.quantity) && !!item.unit.trim(),
  }));
}

export function toggleReceiptRow(row: ReceiptReviewRow): ReceiptReviewRow {
  return row.foodConfirmed ? { ...row, selected: !row.selected } : row;
}
export function confirmReceiptFood(row: ReceiptReviewRow): ReceiptReviewRow {
  return { ...row, foodConfirmed: true, selected: true };
}
export function receiptRowError(row: ReceiptReviewRow): string {
  if (!row.foodConfirmed) return "Confirm this is food before adding it.";
  if (!row.name.trim()) return "Enter the food name.";
  if (!row.quantity.trim() || !positive(Number(row.quantity))) return "Enter the amount you bought, greater than zero.";
  if (!row.unit.trim()) return "Enter a unit such as pcs, g, or ml.";
  if (!row.category.trim() || !row.location.trim()) return "Choose a category and storage location.";
  return "";
}
export function receiptConfirmation(version: number, rows: ReceiptReviewRow[]): ReceiptConfirmation {
  const selected = rows.filter((row) => row.selected);
  if (!selected.length) throw new Error("Select at least one food item to add.");
  if (selected.length > 100) throw new Error("Select up to 100 items at a time.");
  for (const row of selected) {
    const error = receiptRowError(row);
    if (error) throw new Error(`${row.name || "Receipt item"}: ${error}`);
  }
  return {
    version,
    items: selected.map((row) => ({
      lineId: row.lineId,
      name: row.name.trim(),
      quantity: Number(row.quantity),
      unit: row.unit.trim(),
      category: row.category.trim(),
      location: row.location.trim(),
      foodConfirmed: true,
    })),
  };
}

/** Locked confirmations use the original request version and exact reviewed rows. */
export function resumeReceiptConfirmation(draft: ReceiptDraft): ReceiptConfirmation | undefined {
  if (draft.status === "READY" || draft.confirmationVersion === null) return;
  return { version: draft.confirmationVersion, items: draft.confirmedItems };
}

export function validReceiptReview(value: unknown): value is ReceiptReviewRow[] {
  return Array.isArray(value) && value.every((row) =>
    record(row) && nonblank(row.lineId) && typeof row.sourceText === "string" && typeof row.name === "string" &&
    typeof row.quantity === "string" && typeof row.unit === "string" && typeof row.category === "string" && typeof row.location === "string" &&
    ["FOOD", "NON_FOOD", "UNKNOWN"].includes(row.kind as string) && ["HIGH", "LOW"].includes(row.confidence as string) &&
    typeof row.selected === "boolean" && typeof row.foodConfirmed === "boolean",
  ) && new Set(value.map((row) => row.lineId)).size === value.length;
}
export function validReceiptConfirmation(value: unknown): value is ReceiptConfirmation {
  return record(value) && Number.isInteger(value.version) && (value.version as number) >= 0 && Array.isArray(value.items) &&
    value.items.length > 0 && value.items.length <= 100 && value.items.every((row) =>
      record(row) && nonblank(row.lineId) && nonblank(row.name) && typeof row.quantity === "number" && positive(row.quantity) &&
      nonblank(row.unit) && nonblank(row.category) && nonblank(row.location) && row.foodConfirmed === true &&
      (row.expirationDate === undefined || row.expirationDate === null || typeof row.expirationDate === "string"),
    ) && new Set(value.items.map((row) => row.lineId)).size === value.items.length;
}
