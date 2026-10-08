const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");
const { createInputText } = loadTypeScript("src/utils/input-text.ts", {});

function harness(platform = "ios") {
  const refs = [], writes = [];
  let cursor = 0, effects = [];
  const node = { setNativeProps: (props) => writes.push(props.text), focus() {} };
  const { AppTextInput } = loadTypeScript("src/components/text-input.tsx", {
    react: {
      forwardRef: (render) => render,
      useRef: (initial) => refs[cursor++] ??= { current: initial },
      useCallback: (callback) => callback,
      useLayoutEffect: (effect) => effects.push(effect),
    },
    "react-native": { Platform: { OS: platform }, TextInput: "TextInput" },
    "../utils/input-text": { createInputText },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
  });
  const ref = { current: null };
  return {
    writes, ref, node,
    render(props) {
      cursor = 0;
      effects = [];
      const element = AppTextInput(props, ref);
      element.props.ref(node);
      effects.forEach((effect) => effect());
      return element.props;
    },
  };
}

test("iOS typing and delayed React echoes do not write text or selection back", () => {
  const h = harness();
  const changes = [];
  const props = h.render({ value: "", onChangeText: (text) => changes.push(text), multiline: true });
  assert.equal(props.value, undefined);
  assert.equal(props.defaultValue, "");
  props.onChangeText("p");
  props.onChangeText("pa");
  props.onChangeText("pasta");
  h.render({ value: "p" });
  h.render({ value: "pa" });
  h.render({ value: "pasta" });
  assert.deepEqual(changes, ["p", "pa", "pasta"]);
  assert.deepEqual(h.writes, []);
  assert.equal(h.ref.current, h.node);
  assert.equal(props.multiline, true);
});

test("middle edits, deletion and multiline typing stay native-owned", () => {
  const h = harness();
  let props = h.render({ value: "good pasta" });
  for (const text of ["very good pasta", "very good past", "very good pasta\nDinner"]) {
    props.onChangeText(text);
    props = h.render({ value: text });
  }
  assert.deepEqual(h.writes, []);
});

test("external presets and repeated clears update native text without remounting", () => {
  const h = harness();
  let props = h.render({ value: "pcs" });
  props = h.render({ value: "g" });
  props.onChangeText("grams");
  h.render({ value: "grams" });
  props = h.render({ value: "" });
  props.onChangeText("Milk");
  h.render({ value: "Milk" });
  h.render({ value: "" });
  assert.deepEqual(h.writes, ["g", "", ""]);
  assert.equal(h.ref.current, h.node);
});

test("uncontrolled initial text and platform controlled behavior remain supported", () => {
  const native = harness();
  const props = native.render({ defaultValue: "hello" });
  props.onChangeText("hello there");
  native.render({ defaultValue: "hello" });
  assert.deepEqual(native.writes, []);
  for (const platform of ["web", "android"]) {
    const h = harness(platform);
    assert.equal(h.render({ value: "hello" }).value, "hello");
    assert.equal(h.render({ value: "" }).value, "");
    assert.deepEqual(h.writes, []);
  }
});
