const { test } = require("node:test");
const assert = require("node:assert/strict");
const { requestJson } = require("../http.ts");

test("bodyless reads avoid unnecessary JSON content headers", async t => {
  t.mock.method(globalThis, "fetch", async (_url, { headers }) => {
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(headers.has("Content-Type"), false);
    return new Response("{}");
  });
  await requestJson("https://api.example/auth/config");
});

test("JSON writes receive a content type while caller types and FormData are preserved", async t => {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (_url, { headers }) => {
    seen.push(headers.get("Content-Type"));
    return new Response("{}");
  });
  await requestJson("https://api.example", { method: "POST", body: "{}" });
  await requestJson("https://api.example", { method: "POST", body: "raw", headers: { "Content-Type": "text/plain" } });
  await requestJson("https://api.example", { method: "POST", body: new FormData() });
  assert.deepEqual(seen, ["application/json", "text/plain", null]);
});

test("a pre-cancelled request never reaches fetch", async t => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Cancelled request dispatched"));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestJson("https://api.example", { signal: controller.signal }), error =>
    error.status === 0 && error.error === "Cancelled");
});

test("caller cancellation is distinct from a network failure and does not replay writes", async t => {
  const controller = new AbortController();
  let requests = 0;
  t.mock.method(globalThis, "fetch", (_url, { signal }) => {
    requests++;
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
      controller.abort();
    });
  });
  await assert.rejects(requestJson("https://api.example", { method: "POST", signal: controller.signal }), error =>
    error.error === "Cancelled" && /Check the saved content/.test(error.message));
  assert.equal(requests, 1);
});

test("array-shaped field errors are excluded from an API validation error", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ message: "Invalid item", fieldErrors: ["Wrong"] }), { status: 400 }));
  await assert.rejects(requestJson("https://api.example"), error => {
    assert.equal(error.status, 400);
    assert.equal(error.message, "Invalid item");
    assert.equal(error.fieldErrors, undefined);
    return true;
  });
});
