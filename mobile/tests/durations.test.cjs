const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stepDurations,
  remainingSeconds,
  countdown,
} = require("../src/utils/durations.ts");
const seconds = (text) =>
  stepDurations(text).map((duration) => duration.seconds);

test("recipe timers recognize units and take the smaller end of ranges", () => {
  for (const text of [
    "Simmer for 5-8 minutes",
    "5–8 min.",
    "five to eight minutes",
    "5 minutes to 8 minutes",
    "8—5 minutes",
    "between 5 and 8 minutes",
    "between 5 minutes and 8 minutes",
  ]) {
    assert.deepEqual(seconds(text), [300], text);
  }
  assert.deepEqual(seconds("Stir for 30 seconds; rest for 2 hrs."), [30, 7200]);
  assert.deepEqual(seconds("Rest 30 minutes to 1 hour"), [1800]);
});
test("compound and fractional times create a single timer", () => {
  for (const text of [
    "1 hour 30 minutes",
    "1 hour and 30 minutes",
    "1.5 hours",
    "1½ hours",
    "1 1/2 hours",
    "one and a half hours",
  ]) {
    assert.deepEqual(seconds(text), [5400], text);
  }
  assert.deepEqual(seconds("half an hour"), [1800]);
  assert.deepEqual(seconds("a quarter hour"), [900]);
  assert.deepEqual(seconds("a half hour"), [1800]);
  assert.deepEqual(seconds("a 5-minute rest"), [300]);
  assert.deepEqual(seconds("twenty-five minutes"), [1500]);
});
test("separate timed actions stay separate and unrelated numbers do not create timers", () => {
  assert.deepEqual(
    seconds("Stir 30 seconds, then simmer 5 minutes."),
    [30, 300],
  );
  assert.deepEqual(seconds("Bake at 350 F. Add 2 eggs and stir 10 times."), []);
  assert.deepEqual(seconds("Cook until browned."), []);
  assert.deepEqual(seconds("0 minutes or 1/0 hours"), []);
});
test("deadlines retain elapsed time across suspension and never count below zero", () => {
  const deadline = 600000;
  assert.equal(remainingSeconds(deadline, 300000), 300);
  assert.equal(remainingSeconds(deadline, 599100), 1);
  assert.equal(remainingSeconds(deadline, 900000), 0);
  assert.equal(countdown(5405), "1:30:05");
  assert.equal(countdown(0), "0:00");
});
