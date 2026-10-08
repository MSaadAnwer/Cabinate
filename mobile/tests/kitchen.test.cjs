const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseRecipe,
  createPantryMatcher,
  categoryFor,
  suggestedPantryCategory,
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
  const match = (line, pantry) => createPantryMatcher(pantry)(line);
  assert.equal(match("2 eggs", [item("Eggs")]), true);
  assert.equal(match("1 cup milk", [item("Almond milk")]), false);
  assert.equal(match("1 cup rice vinegar", [item("Rice")]), false);
  assert.equal(match("2 eggs", [item("Eggs", { quantity: 0 })]), false);
  assert.equal(
    match("2 eggs", [item("Eggs", { expirationDate: "2000-01-01" })]),
    false,
  );
  assert.equal(
    match("2 eggs", [item("Eggs", { expirationDate: localDate() })]),
    true,
  );
});

test("a pantry matcher reuses inventory normalization and honors its local date cutoff", () => {
  let reads = 0;
  const pantry = [{
    get name() { reads++; return "Eggs"; },
    quantity: 2,
    expirationDate: "2026-10-07",
  }, { name: "2 tbsp", quantity: 1 }];
  const matches = createPantryMatcher(pantry, "2026-10-07");
  assert.equal(reads, 1);
  assert.equal(matches("1 egg"), true);
  assert.equal(matches("2 fresh eggs"), true);
  assert.equal(matches("3 tbsp"), false);
  assert.equal(reads, 1);
  assert.equal(createPantryMatcher(pantry, "2026-10-08")("Eggs"), false);
});
test("explicit and freezer categories override ingredient guessing", () => {
  assert.equal(categoryFor("Milk", "DAIRY"), "Dairy");
  assert.equal(categoryFor("Spinach", "PRODUCE", "FREEZER"), "Frozen");
  assert.equal(categoryFor("Sourdough bread"), "Bread & grains");
  assert.equal(categoryFor("My item", "Cupboard"), "Cupboard");
});

test("pantry suggestions catch misplaced foods while respecting freezer storage and specific products", () => {
  assert.equal(suggestedPantryCategory({ name: "Milk", category: "Produce" }), "Dairy");
  assert.equal(suggestedPantryCategory({ name: "Apples", category: "DAIRY" }), "Produce");
  assert.equal(suggestedPantryCategory({ name: "Milk", category: "DAIRY" }), null);
  assert.equal(suggestedPantryCategory({ name: "Mystery food", category: "Produce" }), null);
  assert.equal(suggestedPantryCategory({ name: "Milk", category: "Produce", location: "FREEZER" }), null);
  assert.equal(suggestedPantryCategory({ name: "Coconut milk", category: "Dairy" }), "Cupboard");
});
test("calendar dates reject overflow and preserve local day calculations", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(daysUntil(localDate()), 0);
});
