const { test } = require("node:test");
const assert = require("node:assert/strict");
const { requestJson } = require("../src/services/http.ts");

test("malformed error bodies retain the actual HTTP status, including DELETE 404", async (t) => {
  for (const body of ["null", "[]", '"oops"', "{}", "<html>error</html>"]) {
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(body, { status: 404 }),
    );
    await assert.rejects(
      requestJson("http://test/pantry/id", { method: "DELETE" }),
      (error) => error.status === 404 && typeof error.message === "string",
    );
    t.mock.restoreAll();
  }
});

test("API validation messages and valid field errors survive normalization", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          status: 200,
          message: "Name is required",
          fieldErrors: { name: "Enter a name" },
        }),
        { status: 400 },
      ),
  );
  await assert.rejects(
    requestJson("http://test/pantry", { method: "POST" }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.message, "Name is required");
      assert.deepEqual(error.fieldErrors, { name: "Enter a name" });
      return true;
    },
  );
});

test("JSON success, empty DELETE success, and caller headers work", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers.get("X-Client"), "cabinate");
    return new Response('{"id":"new"}', { status: 201 });
  });
  assert.deepEqual(
    await requestJson("http://test", {
      headers: new Headers({ "X-Client": "cabinate" }),
    }),
    { id: "new" },
  );
  t.mock.restoreAll();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(
    await requestJson("http://test", { method: "DELETE" }),
    undefined,
  );
});

test("stalled requests abort on deadline without automatically repeating a mutation", async (t) => {
  let attempts = 0;
  t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_, reject) => {
        attempts++;
        signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      }),
  );
  await assert.rejects(
    requestJson("http://test", { method: "POST" }, 10),
    (error) =>
      error.status === 0 &&
      error.error === "Timeout" &&
      /Check the saved content/.test(error.message),
  );
  assert.equal(attempts, 1);
});

test("deadline also covers a response body that stalls after headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      ),
  }));
  await assert.rejects(
    requestJson("http://test", {}, 10),
    (error) => error.error === "Timeout" && /too long/.test(error.message),
  );
});

test("unexpected network rejection values still produce readable errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw null;
  });
  await assert.rejects(
    requestJson("http://test"),
    (error) =>
      error.status === 0 && /Check your connection/.test(error.message),
  );
});
