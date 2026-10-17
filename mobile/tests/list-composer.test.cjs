const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

test("cancelling an item clears its draft and aisle before navigating or reopening", () => {
  const states = [], refs = [];
  let stateIndex, refIndex, dirty;
  const jsx = (type, props) => ({ type, props });
  const { ListDetailScreen } = loadTypeScript("src/screens/lists.tsx", {
    react: {
      useState(initial) {
        const i = stateIndex++;
        if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
        return [states[i], value => { states[i] = value; }];
      },
      useRef: initial => refs[refIndex++] ??= { current: initial },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { Keyboard: { dismiss() {} }, Text: "Text", TextInput: "TextInput", View: "View" },
    "expo-router": { router: {}, useLocalSearchParams: () => ({ id: "test-list" }) },
    "../components/art": { Icon: "Icon" },
    "../components/ui": Object.fromEntries(["Button", "CheckRow", "Empty", "ErrorText", "Field", "FloatingAdd", "FormPage", "IconButton", "LoadingRows", "Page", "Sheet", "Touch", "s"].map(name => [name, name === "s" ? {} : name])),
    "../components/feedback": { useFeedback: () => ({ notify() {} }) },
    "../components/tokens": { colors: {} },
    "../components/form-draft": { useFormDraft: value => { dirty = value; return { guard: null }; } },
    "../state/kitchen-store": { useKitchen: () => ({ ready: true, data: { lists: [{ id: "test-list", name: "Review", items: [] }] } }) },
    "../utils/kitchen": { categories: ["Produce"], categoryFor: () => "Other" },
  });
  function find(tree, type, match) {
    if (!tree || typeof tree !== "object") return;
    if (Array.isArray(tree)) return tree.map(child => find(child, type, match)).find(Boolean);
    if (tree.type === type && match(tree.props)) return tree.props;
    return find(tree.props?.footer, type, match) || find(tree.props?.children, type, match);
  }
  function render() {
    stateIndex = refIndex = 0;
    const tree = ListDetailScreen();
    return (type, match) => find(tree, type, match);
  }
  render()("Button", p => p.title === "Add an item").onPress();
  render()("Field", p => p.label === "Item name").onChangeText("Unwanted draft");
  render()("Touch", p => p.accessibilityLabel === "Choose aisle for new item").onPress();
  render()("Touch", p => p.accessibilityRole === "radio").onPress();
  render();
  assert.equal(dirty, true);
  render()("IconButton", p => p.label === "Cancel new item").onPress();
  render();
  assert.equal(dirty, false);
  render()("Button", p => p.title === "Add an item").onPress();
  assert.equal(render()("Field", p => p.label === "Item name").value, "");
  const aisle = render()("Touch", p => p.accessibilityLabel === "Choose aisle for new item");
  assert.ok(JSON.stringify(aisle.children).includes("Other"));
});
