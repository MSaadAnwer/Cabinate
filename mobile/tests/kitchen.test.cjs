const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseRecipe,
  inPantry,
  categoryFor,
  validDate,
  localDate,
  daysUntil,
} = require("../src/utils/kitchen.ts");

test("recipe parsing keeps unnumbered ingredients and excludes instructions from shopping", () => {
  const recipe = parseRecipe(
    "Ingredients:\n- Salt and pepper to taste\n- 2 eggs\nInstructions:\n1. Heat the pan.\n2. Cook the eggs.",
  );
  assert.deepEqual(recipe.ingredients, ["Salt and pepper to taste", "2 eggs"]);
  assert.deepEqual(recipe.steps, ["Heat the pan.", "Cook the eggs."]);
});
test("no ingredient limit truncates a long recipe", () => {
  assert.equal(
    parseRecipe(
      "Ingredients:\n" +
        Array.from({ length: 20 }, (_, i) => `- item ${i}`).join("\n"),
    ).ingredients.length,
    20,
  );
});
test("pantry matching is conservative and excludes expired or empty inventory", () => {
  const item = (name, extra = {}) => ({ name, quantity: 1, ...extra });
  assert.equal(inPantry("2 eggs", [item("Eggs")]), true);
  assert.equal(inPantry("1 cup milk", [item("Almond milk")]), false);
  assert.equal(inPantry("1 cup rice vinegar", [item("Rice")]), false);
  assert.equal(inPantry("2 eggs", [item("Eggs", { quantity: 0 })]), false);
  assert.equal(
    inPantry("2 eggs", [item("Eggs", { expirationDate: "2000-01-01" })]),
    false,
  );
  assert.equal(
    inPantry("2 eggs", [item("Eggs", { expirationDate: localDate() })]),
    true,
  );
});
test("explicit and freezer categories override ingredient guessing", () => {
  assert.equal(categoryFor("Milk", "DAIRY"), "Dairy");
  assert.equal(categoryFor("Spinach", "PRODUCE", "FREEZER"), "Frozen");
  assert.equal(categoryFor("Sourdough bread"), "Bread & grains");
  assert.equal(categoryFor("My item", "Cupboard"), "Cupboard");
});
test("calendar dates reject overflow and preserve local day calculations", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(daysUntil(localDate()), 0);
});
