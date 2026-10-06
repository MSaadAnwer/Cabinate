const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stockQuantity, remainingStock, restockedQuantity, usageStep, adjustUsage } = require("../src/utils/pantry-quantity.ts");

test("dozens and packs become quantities that can be consumed individually", () => {
  assert.deepEqual(stockQuantity(1, "dozen"), { quantity: 12, unit: "pcs" });
  assert.equal(remainingStock(stockQuantity(1, "dozen").quantity, 3), 9);
  assert.deepEqual(stockQuantity(2, "pack", 6), { quantity: 12, unit: "pcs" });
  assert.deepEqual(stockQuantity(2, "bag", 500, "g"), { quantity: 1000, unit: "g" });
  assert.deepEqual(stockQuantity(1.5, "kg"), { quantity: 1.5, unit: "kg" });
});

test("restocking adds to existing stock and supports fractional purchases", () => {
  assert.equal(restockedQuantity(30, 10), 40);
  assert.equal(restockedQuantity(0.1, 0.2), 0.3);
  assert.equal(restockedQuantity(3, 12), 15);
  assert.equal(adjustUsage(3, 1, 1, Infinity), 4);
  for (const amount of [0, -1, NaN, Infinity]) assert.throws(() => restockedQuantity(30, amount));
});

test("usage controls step in pieces or fractional bulk units and stay within stock", () => {
  assert.equal(usageStep("pcs", 12), 1);
  assert.equal(usageStep("gallon", 1), 0.25);
  assert.equal(adjustUsage(1, -1, 0.25, 1), 0.75);
  assert.equal(adjustUsage(0.25, -1, 0.25, 1), 0.25);
  assert.equal(adjustUsage(0.75, 1, 0.25, 1), 1);
  assert.equal(adjustUsage(11, 1, 1, 12), 12);
  assert.equal(adjustUsage(1, 1, 1, 1.5), 1.5);
  assert.equal(usageStep("gallon", 0.1), 0.1);
});
test("consumption handles fractions, exhaustion and invalid amounts", () => {
  assert.equal(remainingStock(0.3, 0.1), 0.2);
  assert.equal(remainingStock(12, 12), 0);
  for (const amount of [0, -1, 13, NaN, Infinity]) assert.throws(() => remainingStock(12, amount));
  assert.throws(() => stockQuantity(1, "pack", 0));
  assert.throws(() => stockQuantity(Infinity, "pcs"));
});
