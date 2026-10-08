const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

function captureHarness(platform, result, granted = true) {
  const events = [];
  const picker = async (options) => { events.push(["pick", options]); return result; };
  const modules = {
    "react-native": { Platform: { OS: platform } },
    "expo-image-picker": {
      requestCameraPermissionsAsync: async () => { events.push(["permission"]); return { granted }; },
      launchCameraAsync: picker,
      launchImageLibraryAsync: picker,
    },
    "expo-file-system": {
      Paths: { document: "file:///documents" },
      Directory: class {
        constructor() { assert.notEqual(platform, "web"); }
        create(options) { events.push(["directory", options]); }
      },
      File: class {
        constructor(parent, name) {
          this.uri = name ? `file:///documents/cabinate-photos/${name}` : parent;
          this.extension = ".png";
        }
        copy(destination) { events.push(["copy", this.uri, destination.uri]); }
      },
    },
    "../utils/kitchen": { newId: () => "photo-id" },
  };
  const exports = loadTypeScript(require.resolve("../src/services/photos.ts"), modules, {
    URL: { revokeObjectURL: (uri) => events.push(["revoke", uri]) },
  });
  return { capturePhoto: exports.capturePhoto, events };
}

test("web photos survive reload without using unsupported native file storage", async () => {
  const h = captureHarness("web", {
    canceled: false,
    assets: [{ uri: "blob:temporary-photo", mimeType: "image/png", base64: "cGhvdG8=" }],
  });
  assert.equal(await h.capturePhoto(), "data:image/png;base64,cGhvdG8=");
  assert.equal(h.events[0][0], "pick");
  assert.equal(h.events[0][1].base64, true);
  assert.deepEqual(h.events[1], ["revoke", "blob:temporary-photo"]);
});

test("native photos request camera access and copy into permanent document storage", async () => {
  const h = captureHarness("ios", { canceled: false, assets: [{ uri: "file:///cache/image.png" }] });
  assert.equal(await h.capturePhoto(), "file:///documents/cabinate-photos/photo-id.png");
  assert.equal(h.events[0][0], "permission");
  assert.equal(h.events[1][1].base64, false);
  assert.deepEqual(h.events[3], ["copy", "file:///cache/image.png", "file:///documents/cabinate-photos/photo-id.png"]);
});

test("cancelled picking and denied camera access never create a saved photo", async () => {
  const cancelled = captureHarness("web", { canceled: true, assets: null });
  assert.equal(await cancelled.capturePhoto(true), null);
  assert.equal(cancelled.events.length, 1);
  const denied = captureHarness("android", null, false);
  await assert.rejects(denied.capturePhoto(), /Allow camera access/);
  assert.deepEqual(denied.events, [["permission"]]);
});

test("web picking rejects missing image data instead of saving an expired blob URL", async () => {
  const h = captureHarness("web", { canceled: false, assets: [{ uri: "blob:temporary-photo" }] });
  await assert.rejects(h.capturePhoto(true), /Could not read this photo/);
});
