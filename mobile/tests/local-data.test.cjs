const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseLocalData } = require("../src/utils/local-data.ts");
const { categories } = require("../src/utils/kitchen.ts");

const fixture = () => ({
  lists: [
    {
      id: "list",
      name: "Groceries",
      createdAt: "2026-09-24T12:00:00Z",
      items: [{ id: "item", name: "Milk", category: "Dairy", checked: true }],
    },
  ],
  meals: [
    {
      id: "meal",
      uri: "file:///meal.jpg",
      date: "2026-09-24",
      caption: "Lunch",
    },
  ],
  receipts: [{ id: "receipt", uri: "file:///receipt.jpg", date: "2026-09-24" }],
  steps: { recipe: [0, 2] },
});
const parse = (value) => parseLocalData(JSON.stringify(value), categories);

test("valid existing records round trip without losing user data", () => {
  const saved = fixture();
  assert.deepEqual(parse(saved), saved);
  assert.deepEqual(parse({ lists: [], meals: [], receipts: [], steps: {} }), {
    lists: [],
    meals: [],
    receipts: [],
    steps: {},
  });
});

test("malformed roots and step collections are rejected before hydration", () => {
  for (const bad of [
    null,
    [],
    {},
    { ...fixture(), steps: null },
    { ...fixture(), steps: [] },
    { ...fixture(), steps: { recipe: null } },
    { ...fixture(), steps: { recipe: ["0"] } },
    { ...fixture(), steps: { recipe: [-1] } },
  ])
    assert.throws(() => parse(bad));
});

test("incomplete nested records and unknown aisles cannot reach rendering", () => {
  const mutations = [
    (d) => (d.lists[0].items = null),
    (d) => (d.lists[0].items[0].name = 4),
    (d) => (d.lists[0].items[0].category = "Unknown"),
    (d) => (d.lists[0].items[0].checked = "true"),
    (d) => (d.meals[0].caption = null),
    (d) => delete d.receipts[0].uri,
    (d) => d.lists.push(d.lists[0]),
    (d) => d.lists[0].items.push(d.lists[0].items[0]),
  ];
  for (const mutate of mutations) {
    const saved = fixture();
    mutate(saved);
    assert.throws(() => parse(saved));
  }
});
