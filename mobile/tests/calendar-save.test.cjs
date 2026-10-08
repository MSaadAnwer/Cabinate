const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

function harness() {
  const states = [], refs = [], writes = [], notices = [];
  let stateIndex, refIndex, fail = false;
  const data = { meals: [] };
  const jsx = (type, props) => ({ type, props });
  const { default: Calendar } = loadTypeScript("src/screens/calendar.tsx", {
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useRef: (initial) => refs[refIndex++] ??= { current: initial },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { Image: "Image", Text: "Text", View: "View", Keyboard: { dismiss() {} } },
    "../components/feedback": { Touch: "Touch", useFeedback: () => ({ notify: (text) => notices.push(text) }), useRemovalMotion: () => () => {} },
    "../components/form-draft": { useFormDraft: () => ({ guard: null }) },
    "../components/content-layout": { useContentLayout: () => ({ gutter: 20, fontScale: 1 }) },
    "../components/ui": Object.fromEntries(["Button", "ErrorText", "DataNotice", "Field", "FormPage", "IconButton", "Sheet", "focusControl", "s"].map((name) => [name, name === "s" ? {} : name])),
    "../state/kitchen-store": { useKitchen: () => ({
      pantry: [], data, ready: true, pantryState: { loaded: true },
      update: async (change) => {
        if (fail) throw new Error("storage unavailable");
        Object.assign(data, change(data));
        writes.push(data.meals[0]);
      },
    }) },
    "../services/photos": { capturePhoto: async () => "file:///meal.jpg" },
    "../utils/kitchen": { expiryLabel: () => "", localDate: () => "2026-10-08", newId: () => "draft-photo" },
  });
  function find(tree, type, match) {
    if (!tree || typeof tree !== "object") return;
    if (Array.isArray(tree)) return tree.map((child) => find(child, type, match)).find(Boolean);
    if (tree.type === type && match(tree.props)) return tree.props;
    return find(tree.props?.footer, type, match) || find(tree.props?.children, type, match);
  }
  return {
    writes, data, notices,
    fail: (value) => { fail = value; },
    render() {
      stateIndex = refIndex = 0;
      const tree = Calendar();
      return { tree, field: find(tree, "Field", () => true), button: (title) => find(tree, "Button", (props) => props.title === title) };
    },
  };
}

test("photo selection waits for explicit save and uses the note typed afterward", async () => {
  const h = harness();
  await h.render().button("Add a meal from photos").onPress();
  await new Promise(setImmediate);
  assert.equal(h.writes.length, 0);
  let screen = h.render();
  assert.ok(screen.tree.props.footer);
  assert.ok(screen.button("Save photo and note"));
  screen.field.onChangeText("Dinner after taking the photo");
  screen = h.render();
  screen.button("Save photo and note").onPress();
  await new Promise(setImmediate);
  assert.equal(h.writes.length, 1);
  assert.equal(h.data.meals[0].caption, "Dinner after taking the photo");
  assert.equal(h.render().button("Save photo and note"), undefined);
  assert.equal(h.render().field.value, "");
});

test("failed save keeps photo and note for retry without creating duplicates", async () => {
  const h = harness();
  h.render().button("Add a meal from photos").onPress();
  await new Promise(setImmediate);
  h.render().field.onChangeText("Keep my note");
  h.fail(true);
  h.render().button("Save photo and note").onPress();
  await new Promise(setImmediate);
  assert.equal(h.render().field.value, "Keep my note");
  assert.ok(h.render().button("Save photo and note"));
  assert.equal(h.notices.length, 0);
  h.fail(false);
  h.render().button("Save photo and note").onPress();
  await new Promise(setImmediate);
  assert.equal(h.data.meals.length, 1);
  assert.equal(h.data.meals[0].id, "draft-photo");
  assert.equal(h.data.meals[0].caption, "Keep my note");
});
