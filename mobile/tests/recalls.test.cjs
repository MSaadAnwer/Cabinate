const { test } = require("node:test");
const assert = require("node:assert/strict");
const { potentialPantryMatches } = require("../src/utils/recalls.ts");
const item = (name, quantity = 1) => ({ name, quantity });

test("matches names across case, punctuation, accents and simple plurals", () => {
  const pantry = [item("Frozen Berries"), item("Café milk")];
  assert.deepEqual(potentialPantryMatches({ title: "FROZEN berry recall", description: "Cafe-milk also affected" }, pantry), pantry);
});

test("requires every name word and avoids substring matches and empty inventory", () => {
  const pantry = [item("Rice"), item("Almond milk"), item("Milk", 0), item(""), item("Milk")];
  assert.deepEqual(potentialPantryMatches({ title: "Milk recall", description: "Price update" }, pantry), [pantry[4]]);
});

test("includes expired items still in the pantry and handles no matches", () => {
  const pantry = [{ ...item("Eggs"), expirationDate: "2000-01-01" }];
  assert.deepEqual(potentialPantryMatches({ title: "Egg recall", description: "" }, pantry), pantry);
  assert.deepEqual(potentialPantryMatches({ title: "Peanut recall", description: "" }, pantry), []);
});
