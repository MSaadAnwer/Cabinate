const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createOrderedStore } = require("../src/utils/ordered-store.ts");

test("twenty rapid checks publish immediately and relaunch with every check persisted in order", async () => {
  const snapshots = [];
  let visible;
  let stored;
  const initial = Array(20).fill(false);
  const store = createOrderedStore(
    initial,
    async (value) => {
      await new Promise((resolve) => setImmediate(resolve));
      stored = JSON.stringify(value);
      snapshots.push(value);
    },
    (value) => (visible = value),
    () => {},
  );
  const pending = initial.map((_, i) =>
    store.update((value) =>
      value.map((checked, index) => (index === i ? !checked : checked)),
    ),
  );
  assert.deepEqual(visible, Array(20).fill(true));
  assert.equal(stored, undefined);
  await Promise.all(pending);
  assert.deepEqual(
    snapshots.map((value) => value.filter(Boolean).length),
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  let relaunched;
  const next = createOrderedStore(
    initial,
    async () => {},
    (value) => (relaunched = value),
    () => {},
  );
  next.hydrate(JSON.parse(stored));
  assert.deepEqual(relaunched, Array(20).fill(true));
});

test("a failed earlier write never erases a later successful edit", async () => {
  let count = 0,
    visible,
    stored,
    message = "";
  const store = createOrderedStore(
    [],
    async (value) => {
      if (++count === 1) throw new Error("disk full");
      stored = value;
    },
    (value) => (visible = value),
    (value) => (message = value),
  );
  const first = store.update((value) => [...value, "milk"]);
  const second = store.update((value) => [...value, "bread"]);
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].status, "fulfilled");
  assert.deepEqual(visible, ["milk", "bread"]);
  assert.deepEqual(stored, visible);
  assert.equal(message, "");
});

test("failed latest write restores the last saved state and the queue recovers", async () => {
  let count = 0,
    visible,
    message;
  const store = createOrderedStore(
    [],
    async () => {
      if (++count === 2) throw new Error("disk full");
    },
    (value) => (visible = value),
    (value) => (message = value),
  );
  await store.update((value) => [...value, "milk"]);
  await assert.rejects(store.update((value) => [...value, "bread"]));
  assert.deepEqual(visible, ["milk"]);
  assert.match(message, /last saved version is restored/);
  await store.update((value) => [...value, "eggs"]);
  assert.deepEqual(visible, ["milk", "eggs"]);
  assert.equal(message, "");
});

test("all queued failures roll back to the hydrated snapshot", async () => {
  let visible;
  const store = createOrderedStore(
    [],
    async () => {
      throw new Error("unavailable");
    },
    (value) => (visible = value),
    () => {},
  );
  store.hydrate(["saved"]);
  await Promise.allSettled([
    store.update((v) => [...v, "a"]),
    store.update((v) => [...v, "b"]),
  ]);
  assert.deepEqual(visible, ["saved"]);
});
