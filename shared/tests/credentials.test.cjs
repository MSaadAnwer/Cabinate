const { test } = require("node:test");
const assert = require("node:assert/strict");
const { accessToken, configureCredentials, credentialsRejected } = require("../credentials.ts");
const { authenticatedJson } = require("../authenticated-http.ts");

test("cleanup from an older provider preserves the current account", async t => {
  const oldCleanup = configureCredentials(async () => "old", () => assert.fail("Old provider rejected"));
  const rejected = [];
  const cleanup = configureCredentials(async () => "current", token => rejected.push(token));
  t.after(cleanup);
  oldCleanup();
  assert.equal(await accessToken(), "current");
  credentialsRejected("current");
  assert.deepEqual(rejected, ["current"]);
  cleanup();
  assert.equal(await accessToken(), undefined);
});

test("an account change during token refresh prevents an old-account mutation", async t => {
  let finishRefresh;
  const oldCleanup = configureCredentials(() => new Promise(resolve => { finishRefresh = resolve; }), () => {});
  t.after(oldCleanup);
  t.mock.method(globalThis, "fetch", () => assert.fail("A stale token must never reach the API"));
  const request = authenticatedJson("https://api.example/pantry", { method: "POST", body: "{}" });
  const cleanup = configureCredentials(async () => "new", () => {});
  t.after(cleanup);
  finishRefresh("old");
  await assert.rejects(request, /session changed/i);
  assert.equal(await accessToken(), "new");
});

test("unmounting the current provider invalidates an in-flight token read", async t => {
  let resolve;
  const cleanup = configureCredentials(() => new Promise(done => { resolve = done; }), () => {});
  t.after(cleanup);
  const pending = accessToken();
  cleanup();
  resolve("expired");
  await assert.rejects(pending, /session changed/i);
});
