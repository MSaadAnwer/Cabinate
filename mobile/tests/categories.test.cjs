const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  categoryFor,
  groceryKey,
  categories,
} = require("../src/utils/kitchen.ts");
const { parseLocalData } = require("../src/utils/local-data.ts");

test("common produce, quantities, accents and plurals share their aisle", () => {
  for (const name of [
    "Apples",
    "Oranges",
    "2 organic oranges",
    "Bananas",
    "Peas",
    "Peaches",
    "Mangoes",
    "Jalapeños",
    "Strawberries",
    "Sweet potatoes",
    "Asparagus",
    "1 bunch fresh cilantro",
  ]) {
    assert.equal(categoryFor(name), "Produce", name);
  }
});
test("product phrases and shelf-stable forms outrank ingredient words", () => {
  for (const name of [
    "Peanut butter",
    "Orange juice",
    "Coconut milk",
    "Chicken broth",
    "Black pepper",
    "Canned tomatoes",
    "Rice vinegar",
    "Dried basil",
  ]) {
    assert.equal(categoryFor(name), "Cupboard", name);
  }
  assert.equal(categoryFor("Cream cheese"), "Dairy");
  assert.equal(categoryFor("Frozen oranges"), "Frozen");
  assert.equal(categoryFor("Sourdough"), "Bread & grains");
  assert.equal(categoryFor("Paper towels"), "Other");
  assert.equal(categoryFor("Pineapple"), "Produce");
  assert.equal(categoryFor("Butterfly clips"), "Other");
  assert.equal(categoryFor("Unrecognized item"), "Other");
});
test("saved corrections survive reload and explicit categories still win", () => {
  const categoryCorrections = {
    [groceryKey("Oranges")]: "Other",
    [groceryKey("Tempeh")]: "Meat & fish",
  };
  const saved = parseLocalData(
    JSON.stringify({
      lists: [],
      meals: [],
      receipts: [],
      steps: {},
      categoryCorrections,
    }),
    categories,
  );
  assert.equal(
    categoryFor("3 oranges", null, null, saved.categoryCorrections),
    "Other",
  );
  assert.equal(
    categoryFor("Tempeh", null, null, saved.categoryCorrections),
    "Meat & fish",
  );
  assert.equal(
    categoryFor("Oranges", "Produce", null, saved.categoryCorrections),
    "Produce",
  );
  assert.equal(categoryFor("toString", null, null, {}), "Other");
  assert.throws(() =>
    parseLocalData(
      JSON.stringify({ ...saved, categoryCorrections: { oranges: "invalid" } }),
      categories,
    ),
  );
});
test("old snapshots remain valid and timer records must have safe deadlines", () => {
  const old = { lists: [], meals: [], receipts: [], steps: {} };
  assert.deepEqual(parseLocalData(JSON.stringify(old), categories), old);
  const timer = {
    id: "timer",
    recipeId: "recipe",
    recipeTitle: "Soup",
    stepIndex: 0,
    durationIndex: 0,
    seconds: 300,
    endsAt: Date.now() + 300000,
  };
  assert.deepEqual(
    parseLocalData(JSON.stringify({ ...old, timers: [timer] }), categories)
      .timers,
    [timer],
  );
  for (const invalid of [
    { ...timer, seconds: -1 },
    { ...timer, endsAt: null },
    { ...timer, stepIndex: -1 },
  ]) {
    assert.throws(() =>
      parseLocalData(JSON.stringify({ ...old, timers: [invalid] }), categories),
    );
  }
});
