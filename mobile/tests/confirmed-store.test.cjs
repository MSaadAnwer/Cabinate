const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createOrderedStore } = require("../src/utils/ordered-store.ts");

test("removal publishes and starts its animation only after persistence succeeds", async () => {
  const events = [];
  let release;
  let visible = ["photo"];
  let disk = visible;
  const store = createOrderedStore(
    visible,
    async (value) => {
      await new Promise((resolve) => {
        release = resolve;
      });
      disk = value;
      events.push("saved");
    },
    (value) => {
      visible = value;
      events.push("published");
    },
    () => {},
  );
  const pending = store.commit(
    () => [],
    () => events.push("animate"),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(visible, ["photo"]);
  assert.deepEqual(disk, ["photo"]);
  assert.deepEqual(events, []);
  release();
  await pending;
  assert.deepEqual(visible, []);
  assert.deepEqual(events, ["saved", "animate", "published"]);
});

test("failed removal keeps the photo and can be retried without an early collapse", async () => {
  let visible = ["photo"],
    count = 0,
    animated = 0,
    error = "";
  const store = createOrderedStore(
    visible,
    async () => {
      if (++count === 1) throw new Error("disk full");
    },
    (value) => (visible = value),
    (value) => (error = value),
  );
  await assert.rejects(
    store.commit(
      () => [],
      () => animated++,
    ),
  );
  assert.deepEqual(visible, ["photo"]);
  assert.equal(animated, 0);
  assert.match(error, /saved content is still here/);
  await store.commit(
    () => [],
    () => animated++,
  );
  assert.deepEqual(visible, []);
  assert.equal(animated, 1);
  assert.equal(error, "");
});

test("edits before, during, and after a removal keep their invocation order", async () => {
  let visible = ["photo"],
    disk = visible;
  const writes = [];
  const store = createOrderedStore(
    visible,
    async (value) => {
      await new Promise((resolve) => setImmediate(resolve));
      disk = value;
      writes.push(value);
    },
    (value) => (visible = value),
    () => {},
  );
  const before = store.update((v) => [...v, "milk"]);
  const remove = store.commit((v) => v.filter((item) => item !== "photo"));
  const during = store.update((v) => [...v, "bread"]);
  const secondRemoval = store.commit((v) =>
    v.filter((item) => item !== "milk"),
  );
  const after = store.update((v) => [...v, "eggs"]);
  await Promise.all([before, remove, during, secondRemoval, after]);
  assert.deepEqual(writes, [
    ["photo", "milk"],
    ["milk"],
    ["milk", "bread"],
    ["bread"],
    ["bread", "eggs"],
  ]);
  assert.deepEqual(visible, disk);
  assert.deepEqual(disk, ["bread", "eggs"]);
});

test("a failed edit queued after removal cannot resurrect the removed photo", async () => {
  let visible = ["photo"],
    count = 0;
  const store = createOrderedStore(
    visible,
    async () => {
      if (++count === 2) throw new Error("disk full");
    },
    (value) => (visible = value),
    () => {},
  );
  const remove = store.commit(() => []);
  const edit = store.update((v) => [...v, "milk"]);
  const results = await Promise.allSettled([remove, edit]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.deepEqual(visible, []);
  await store.update((v) => [...v, "bread"]);
  assert.deepEqual(visible, ["bread"]);
});

test("confirmed changes use the restored state when an earlier optimistic write fails", async () => {
  let visible = ["photo", "keep"],
    count = 0;
  const store = createOrderedStore(
    visible,
    async () => {
      if (++count === 1) throw new Error("disk full");
    },
    (value) => (visible = value),
    () => {},
  );
  const edit = store.update((v) => [...v, "unsaved"]);
  const remove = store.commit((v) => v.filter((item) => item !== "photo"));
  await Promise.allSettled([edit, remove]);
  assert.deepEqual(visible, ["keep"]);
});

test("animation setup failure never prevents a confirmed deletion from publishing", async () => {
  let visible = ["photo"],
    error = "";
  const store = createOrderedStore(
    visible,
    async () => {},
    (value) => (visible = value),
    (value) => (error = value),
  );
  await store.commit(
    () => [],
    () => {
      throw new Error("animation unavailable");
    },
  );
  assert.deepEqual(visible, []);
  assert.equal(error, "");
});
