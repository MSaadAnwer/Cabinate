const { test } = require("node:test");
const assert = require("node:assert/strict");
const { receiptReview, toggleReceiptRow, confirmReceiptFood, receiptConfirmation, resumeReceiptConfirmation } = require("../src/utils/receipt-review.ts");
const { parseLocalData } = require("../src/utils/local-data.ts");
const { categories } = require("../src/utils/kitchen.ts");

const line = (id, extra = {}) => ({ id, sourceText: "MILK 1 GAL 3.99", name: "Milk", quantity: 1, unit: "gallon", category: "Dairy", location: "FRIDGE", kind: "FOOD", confidence: "HIGH", ...extra });
const draft = (items) => ({ id: "draft", version: 3, items, status: "READY", confirmationVersion: null, confirmedItems: [], importedItems: [] });
test("mixed receipts select only confident food with known positive quantities", () => {
  const rows = receiptReview(draft([
    line("milk"),
    line("banana", { sourceText: "BANANAS 0.78 LB @0.69/LB $0.54", name: "Bananas", quantity: 0.78, unit: "lb" }),
    line("unknown-quantity", { name: "Bread", quantity: null }),
    line("low-confidence", { confidence: "LOW" }),
    line("unknown-kind", { kind: "UNKNOWN" }),
    line("candle", { name: "Cookie-scent candle", kind: "NON_FOOD" }),
    line("pet-food", { name: "Chicken pet dinner", kind: "NON_FOOD" }),
    line("detergent", { name: "Laundry detergent", kind: "NON_FOOD" }),
  ]));
  assert.deepEqual(rows.filter((row) => row.selected).map((row) => row.lineId), ["milk", "banana"]);
  assert.equal(rows[2].quantity, "");
  assert.equal(receiptConfirmation(3, rows).items[1].quantity, 0.78);
});
test("unknown quantities require human entry and toggling never silently selects non-food", () => {
  const [food, unknown] = receiptReview(draft([line("food", { quantity: null }), line("unknown", { kind: "UNKNOWN" })]));
  assert.throws(() => receiptConfirmation(3, [toggleReceiptRow(food)]), /Enter the amount/);
  const entered = { ...toggleReceiptRow(food), quantity: "2" };
  assert.equal(receiptConfirmation(3, [entered]).items[0].quantity, 2);
  assert.equal(toggleReceiptRow(entered).selected, false);
  assert.equal(toggleReceiptRow(unknown).selected, false);
  assert.equal(confirmReceiptFood(unknown).selected, true);
  assert.equal(receiptConfirmation(3, [confirmReceiptFood(unknown)]).items[0].foodConfirmed, true);
});
test("package quantities remain package counts instead of guessed contents or prices", () => {
  const rows = receiptReview(draft([line("peas", { sourceText: "2 @ 3.50 FROZEN PEAS 12 OZ $7.00", name: "Frozen peas", quantity: 2, unit: "bag" })]));
  assert.equal(receiptConfirmation(3, rows).items[0].quantity, 2);
  assert.equal(receiptConfirmation(3, rows).items[0].unit, "bag");
});
test("resumed imports replay the original confirmed intent and version", () => {
  const rows = receiptReview(draft([line("milk")]));
  const intent = receiptConfirmation(3, rows);
  const imported = { ...draft([]), version: 5, status: "IMPORTED", confirmationVersion: 3, confirmedItems: intent.items };
  assert.deepEqual(resumeReceiptConfirmation(imported), intent);
  assert.deepEqual(resumeReceiptConfirmation({ ...imported, status: "IMPORTING", version: 4 }), intent);
  assert.equal(resumeReceiptConfirmation(draft([])), undefined);
  assert.deepEqual(receiptConfirmation(3, rows), intent);
});
test("saved receipt drafts round-trip and incomplete import associations are rejected", () => {
  const rows = receiptReview(draft([line("milk")]));
  const receipt = { id: "receipt", date: "2026-10-07", uri: "file:///receipt.jpg", draftId: "draft", review: rows, pendingConfirmation: receiptConfirmation(3, rows), imported: false };
  const saved = { lists: [], meals: [], steps: {}, receipts: [receipt] };
  assert.deepEqual(parseLocalData(JSON.stringify(saved), categories), saved);
  assert.throws(() => parseLocalData(JSON.stringify({ ...saved, receipts: [{ ...receipt, draftId: undefined }] }), categories));
  assert.throws(() => parseLocalData(JSON.stringify({ ...saved, receipts: [{ ...receipt, review: [{ ...rows[0], selected: "yes" }] }] }), categories));
  assert.throws(() => receiptConfirmation(3, [{ ...rows[0], foodConfirmed: false }]));
});
