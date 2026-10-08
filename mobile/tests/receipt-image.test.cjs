const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

function harness(width, height, sizes) {
  const calls = [], releases = [];
  const image = () => ({ width, height, release: () => releases.push("image"), saveAsync: async (options) => {
    calls.push(["save", options]);
    return { base64: "A".repeat(sizes.shift()) };
  } });
  const context = { renderAsync: async () => image(), resize: (dimensions) => { calls.push(["resize", dimensions]); width = dimensions.width; height = dimensions.height; }, release: () => releases.push("context") };
  const exports = loadTypeScript(require.resolve("../src/services/receipt-image.ts"), {
    "expo-image-manipulator": { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: "jpeg" } },
  });
  return { ...exports, calls, releases };
}
test("long receipts retain readable width while respecting upload dimensions", () => {
  const h = harness(800, 8000, []);
  assert.deepEqual({ ...h.receiptImageDimensions(800, 8000) }, { width: 800, height: 8000 });
  assert.deepEqual({ ...h.receiptImageDimensions(3200, 6000) }, { width: 1600, height: 3000 });
  assert.deepEqual({ ...h.receiptImageDimensions(1000, 10000) }, { width: 800, height: 8000 });
});
test("vision copies resize, compress to JPEG, and retry quality within the byte limit", async () => {
  const h = harness(3200, 6000, [5_000_000, 100]);
  const prepared = await h.prepareReceiptImage("file:///original.jpg");
  assert.equal(prepared.mediaType, "image/jpeg");
  assert.equal(prepared.imageBase64.length, 100);
  assert.deepEqual({ ...h.calls[0][1] }, { width: 1600, height: 3000 });
  assert.equal(h.calls[1][1].compress, 0.8);
  assert.equal(h.calls[2][1].compress, 0.6);
  assert.ok(h.releases.includes("context"));
});
test("oversized vision copies fail with a useful retake message", async () => {
  const h = harness(1600, 8000, [5_000_000, 5_000_000, 5_000_000]);
  await assert.rejects(h.prepareReceiptImage("file:///receipt.jpg"), /Crop extra background/);
  assert.ok(h.releases.includes("context"));
  assert.equal(h.receiptImageSize("YQ=="), 1);
  assert.equal(h.receiptImageSize("YWI="), 2);
});
