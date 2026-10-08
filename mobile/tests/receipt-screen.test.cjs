const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");
const review = require("../src/utils/receipt-review.ts");
const flush = () => new Promise((resolve) => setImmediate(resolve));
const fixture = {
  id: "draft", version: 2, status: "READY", store: "Market", purchaseDate: "2026-10-07",
  confirmationVersion: null, confirmedItems: [], importedItems: [],
  items: [
    { id: "milk", sourceText: "MILK", name: "Milk", quantity: 1, unit: "gallon", category: "Dairy", location: "FRIDGE", kind: "FOOD", confidence: "HIGH" },
    { id: "bread", sourceText: "BREAD", name: "Bread", quantity: null, unit: "pcs", category: "Bread & grains", location: "CABINET", kind: "FOOD", confidence: "HIGH" },
    { id: "soap", sourceText: "SOAP", name: "Soap", quantity: 1, unit: "pcs", category: "Other", location: "CABINET", kind: "NON_FOOD", confidence: "HIGH" },
  ],
};
function allNodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(allNodes);
  return [node, ...allNodes(node.props?.children), ...allNodes(node.props?.footer)];
}
function textContent(node) {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(textContent).join("");
  return typeof node === "object" ? textContent(node.props?.children) : String(node);
}
function harness(options = {}) {
  const hooks = [], effects = [], confirmations = [], commits = [], upserts = [];
  let hookIndex = 0, failCommit = false, reloads = 0, extractionSignal;
  let data = { lists: [], meals: [], receipts: options.receipts || [], steps: {} };
  const modules = {
    react: {
      useRef: (current) => hooks[hookIndex++] ??= { current },
      useState: (initial) => {
        const state = hooks[hookIndex++] ??= { value: initial };
        return [state.value, (value) => { state.value = typeof value === "function" ? value(state.value) : value; }];
      },
      useEffect: (effect) => effects.push(effect),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-native": { ActivityIndicator: "ActivityIndicator", Image: "Image", Keyboard: { dismiss: () => {} }, Text: "Text", View: "View" },
    "expo-router": { router: { dismissTo: () => {} } },
    "../components/ui": { Button: "Button", CheckRow: "CheckRow", ErrorText: "ErrorText", Field: "Field", FormPage: "FormPage", Sheet: "Sheet", Touch: "Touch", s: {} },
    "../components/feedback": { useFeedback: () => ({ notify: () => {} }) },
    "../components/form-draft": { useFormDraft: () => ({ guard: null, finish: (action) => action() }) },
    "../state/kitchen-store": { useKitchen: () => ({
      data, ready: true,
      commit: async (change) => { if (failCommit) throw new Error("disk full"); data = change(data); commits.push(data); },
      upsertPantryItem: (item) => upserts.push(item), reload: async () => { reloads++; },
    }) },
    "../services/api": { receiptApi: {
      extract: async (image, signal) => { extractionSignal = signal; return options.extract ? options.extract() : fixture; },
      get: async () => options.get ? options.get() : fixture,
      confirm: async (id, intent) => {
        confirmations.push({ id, intent: JSON.parse(JSON.stringify(intent)) });
        if (options.failConfirmation && confirmations.length === 1) throw new Error("response lost");
        return { receiptId: id, items: [{ id: "pantry-milk", name: "Milk", quantity: 1, unit: "gallon" }] };
      },
    } },
    "../services/photos": { capturePhoto: async () => { if (options.photoError) throw new Error(options.photoError); return "file:///receipt.jpg"; } },
    "../services/receipt-image": { prepareReceiptImage: async () => ({ imageBase64: "photo", mediaType: "image/jpeg" }) },
    "../utils/kitchen": { categories: ["Dairy", "Other"], localDate: () => "2026-10-07", newId: () => "local-receipt" },
    "../utils/receipt-review": review,
  };
  const Screen = loadTypeScript(require.resolve("../src/screens/receipt.tsx"), modules, { AbortController }).default;
  const render = () => { hookIndex = 0; return Screen(); };
  render();
  const cleanup = effects[0]();
  return {
    render, commits, confirmations, upserts, cleanup,
    button(title) { const button = allNodes(render()).find((node) => node.type === "Button" && node.props.title === title); assert.ok(button, title); return button; },
    openArchiveReceipt() {
      const toggle = allNodes(render()).find((node) => node.type === "Touch" && textContent(node).startsWith("Saved receipts"));
      toggle.props.onPress();
      const item = allNodes(render()).find((node) => node.type === "Touch" && node.props.accessibilityLabel?.startsWith("Open receipt from"));
      item.props.onPress();
    },
    rows() { return allNodes(render()).filter((node) => node.type?.name === "ReceiptRow").map((node) => node.props.row); },
    failNextCommit() { failCommit = true; },
    get data() { return data; },
    get reloads() { return reloads; },
    get extractionSignal() { return extractionSignal; },
  };
}

test("the screen archives a draft before confirmation and retries the identical saved intent", async () => {
  const h = harness({ failConfirmation: true });
  h.button("Choose from photos").props.onPress();
  await flush();
  assert.equal(h.data.receipts[0].draftId, "draft");
  assert.deepEqual(h.rows().map((row) => [row.lineId, row.selected, row.quantity]), [["milk", true, "1"], ["bread", false, ""]]);
  h.button("Add 1 food item").props.onPress();
  await flush();
  assert.equal(h.data.receipts[0].pendingConfirmation.items[0].lineId, "milk");
  assert.equal(h.rows().length, 0);
  h.button("Retry adding 1 food item").props.onPress();
  await flush();
  assert.deepEqual(h.confirmations[1], h.confirmations[0]);
  assert.equal(h.data.receipts[0].imported, true);
  assert.equal(h.upserts.length, 0);
  assert.equal(h.reloads, 1);
});
test("a failed local intent commit prevents any pantry request", async () => {
  const h = harness();
  h.button("Choose from photos").props.onPress();
  await flush();
  h.failNextCommit();
  h.button("Add 1 food item").props.onPress();
  await flush();
  assert.equal(h.confirmations.length, 0);
  assert.equal(h.data.receipts[0].pendingConfirmation, undefined);
  assert.equal(h.rows().length, 2);
});
test("cancelled and signed-out receipt reads ignore late extraction responses", async () => {
  for (const unmount of [false, true]) {
    let finish;
    const extraction = new Promise((resolve) => { finish = resolve; });
    const h = harness({ extract: () => extraction });
    h.button("Choose from photos").props.onPress();
    await flush();
    if (unmount) h.cleanup();
    else h.button("Cancel reading").props.onPress();
    finish(fixture);
    await flush();
    assert.equal(h.extractionSignal.aborted, true);
    assert.equal(h.data.receipts[0].draftId, undefined);
    assert.equal(h.confirmations.length, 0);
  }
});
test("initial camera failures are visible even before a receipt exists", async () => {
  const h = harness({ photoError: "Allow camera access" });
  h.button("Take a receipt photo").props.onPress();
  await flush();
  assert.ok(allNodes(h.render()).some((node) => node.type === "ErrorText" && node.props.message === "Allow camera access"));
});
test("a pending archived import can recover a failed status read and replay its locked intent", async () => {
  const rows = review.receiptReview(fixture);
  const intent = review.receiptConfirmation(2, rows);
  let reads = 0;
  const h = harness({
    receipts: [{ id: "saved", date: "2026-10-07", uri: "file:///receipt.jpg", draftId: "draft", review: rows, pendingConfirmation: intent }],
    get: async () => {
      if (++reads === 1) throw new Error("offline");
      return { ...fixture, status: "IMPORTING", version: 3, confirmationVersion: 2, confirmedItems: intent.items };
    },
  });
  h.openArchiveReceipt();
  await flush();
  assert.equal(h.rows().length, 0);
  h.button("Refresh receipt status").props.onPress();
  await flush();
  h.button("Retry adding 1 food item").props.onPress();
  await flush();
  assert.deepEqual(h.confirmations[0].intent, intent);
});
test("reopening an imported receipt never extracts or publishes outdated pantry snapshots", async () => {
  const h = harness({
    receipts: [{ id: "saved", date: "2026-10-07", uri: "file:///receipt.jpg", draftId: "draft", imported: true }],
    get: async () => ({ ...fixture, status: "IMPORTED", importedItems: [{ id: "old", quantity: 99 }] }),
  });
  h.openArchiveReceipt();
  await flush();
  assert.equal(h.extractionSignal, undefined);
  assert.equal(h.upserts.length, 0);
  assert.equal(h.confirmations.length, 0);
  assert.equal(h.reloads, 1);
  h.button("View pantry");
});
