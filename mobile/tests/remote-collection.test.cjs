const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRemoteCollection } = require("../src/utils/remote-collection.ts");

function harness() {
  const pending = [];
  let state;
  const store = createRemoteCollection(
    () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    (value) => (state = value),
  );
  return {
    store,
    pending,
    get state() {
      return state;
    },
  };
}

test("a slow read cannot erase a confirmed create, update, or deletion", async () => {
  const h = harness();
  const request = h.store.reload();
  h.store.upsert({ id: "new", name: "Milk" });
  h.store.upsert({ id: "existing", name: "Updated" });
  h.store.remove("deleted");
  h.pending[0].resolve([
    { id: "existing", name: "Old" },
    { id: "deleted" },
    { id: "untouched" },
  ]);
  await request;
  assert.deepEqual(h.state.items, [
    { id: "new", name: "Milk" },
    { id: "existing", name: "Updated" },
    { id: "untouched" },
  ]);
  assert.equal(h.state.loaded, true);
});

test("the latest refresh wins even when earlier success or failure arrives last", async () => {
  for (const fails of [false, true]) {
    const h = harness();
    const first = h.store.reload();
    const second = h.store.reload();
    h.pending[1].resolve([{ id: "current" }]);
    await second;
    if (fails) h.pending[0].reject(new Error("offline"));
    else h.pending[0].resolve([{ id: "stale" }]);
    await first;
    assert.deepEqual(h.state.items, [{ id: "current" }]);
    assert.equal(h.state.error, "");
    assert.equal(h.state.loading, false);
  }
});

test("an old completion does not stop the current loading state", async () => {
  const h = harness();
  const first = h.store.reload(),
    second = h.store.reload();
  h.pending[0].resolve([{ id: "stale" }]);
  await first;
  assert.equal(h.state.loading, true);
  assert.equal(h.state.loaded, false);
  h.pending[1].resolve([]);
  await second;
  assert.equal(h.state.loaded, true);
});

test("failed refresh retains rows and does not block a different collection", async () => {
  const pantry = harness(),
    recipes = harness();
  const initial = pantry.store.reload();
  pantry.pending[0].resolve([{ id: "milk" }]);
  await initial;
  const refresh = pantry.store.reload(),
    loadRecipes = recipes.store.reload();
  pantry.pending[1].reject(new Error("unavailable"));
  recipes.pending[0].resolve([{ id: "pasta" }]);
  await Promise.all([refresh, loadRecipes]);
  assert.deepEqual(pantry.state.items, [{ id: "milk" }]);
  assert.equal(pantry.state.loaded, true);
  assert.ok(pantry.state.error);
  assert.equal(recipes.state.error, "");
  assert.deepEqual(recipes.state.items, [{ id: "pasta" }]);
});

test("reads begun after confirmed mutations can reflect subsequent server edits", async () => {
  const h = harness();
  h.store.upsert({ id: "recipe", title: "Original" });
  h.store.remove("restored");
  const request = h.store.reload();
  h.pending[0].resolve([
    { id: "recipe", title: "Edited elsewhere" },
    { id: "restored" },
  ]);
  await request;
  assert.deepEqual(h.state.items, [
    { id: "recipe", title: "Edited elsewhere" },
    { id: "restored" },
  ]);
});
