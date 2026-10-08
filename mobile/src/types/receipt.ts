import type { PantryItem } from "./pantry";

export type ReceiptKind = "FOOD" | "NON_FOOD" | "UNKNOWN";
export type ReceiptConfidence = "HIGH" | "LOW";
export interface ReceiptLine {
  id: string;
  sourceText: string;
  name: string;
  quantity: number | null;
  unit: string;
  category: string;
  location: string;
  kind: ReceiptKind;
  confidence: ReceiptConfidence;
}
export interface ReceiptConfirmationItem {
  lineId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location: string;
  expirationDate?: string | null;
  foodConfirmed: true;
}
export interface ReceiptConfirmation {
  version: number;
  items: ReceiptConfirmationItem[];
}
export interface ReceiptDraft {
  id: string;
  version: number;
  store: string | null;
  purchaseDate: string | null;
  items: ReceiptLine[];
  status: "READY" | "IMPORTING" | "IMPORTED";
  confirmationVersion: number | null;
  confirmedItems: ReceiptConfirmationItem[];
  importedItems: PantryItem[];
}
export interface ReceiptReviewRow {
  lineId: string;
  sourceText: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  location: string;
  kind: ReceiptKind;
  confidence: ReceiptConfidence;
  selected: boolean;
  foodConfirmed: boolean;
}
