const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const hooks = [], effects = [], actions = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props });
  const { default: Settings } = loadTypeScript(require.resolve("../src/screens/settings.tsx"), {
    react: {
      useState: initial => { const entry = hooks[index++] ??= { value: initial }; return [entry.value, value => { entry.value = value; }]; },
      useRef: current => hooks[index++] ??= { current },
      useEffect: effect => effects.push(effect),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { Text: "Text", View: "View" },
    "expo-router": { router: { dismissTo: route => actions.push(["route", route]) } },
    "../state/auth": { useAuth: () => ({
      identity: { subject: "google-oauth2|primary", accountId: "primary", development: false },
      linkedAccounts: async () => ({ providers: ["google-oauth2"] }),
      signOut: async () => { actions.push(["logout"]); },
      linkAccount: async (method, confirm, signal) => {
        assert.equal(signal.aborted, false);
        actions.push(["verify", method]);
        if (await confirm({ email: "user@example.test", provider: "apple", accountId: "secondary" })) {
          actions.push(["link"]);
          return { providers: ["google-oauth2", "apple"] };
        }
        return null;
      },
    }) },
    "../components/ui": { Page: "Page", Sheet: "Sheet", Text: "Text", Button: "Button", ErrorText: "ErrorText", s: {} },
    "../components/feedback": { useFeedback: () => ({ notify: message => actions.push(["notify", message]) }) },
    "../services/account-linking": { methodForSubject: () => "google" },
  }, { AbortController });
  const nodes = (tree, type, match) => {
    if (!tree || typeof tree !== "object") return [];
    if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, type, match));
    return [...(tree.type === type && match(tree.props) ? [tree.props] : []), ...nodes(tree.props?.children, type, match)];
  };
  const render = () => {
    index = 0;
    const tree = Settings();
    return { find: (type, match) => nodes(tree, type, match), tree };
  };
  render();
  const cleanup = effects.splice(0).map(effect => effect()).filter(Boolean);
  return { render, actions, cleanup: () => cleanup.forEach(fn => fn()) };
}

test("settings lists connected logins and offers the remaining providers", async () => {
  const h = harness();
  await flush();
  const screen = h.render();
  assert.equal(screen.find("Button", p => p.title === "Link Google account").length, 0);
  assert.equal(screen.find("Button", p => p.title === "Link Apple account").length, 1);
  assert.equal(screen.find("Button", p => p.title === "Link email account").length, 1);
  h.cleanup();
});

test("linking waits for confirmation after proving accounts and removes the newly linked option", async () => {
  const h = harness();
  await flush();
  h.render().find("Button", p => p.title === "Link Apple account")[0].onPress();
  await flush();
  const screen = h.render();
  assert.equal(screen.find("Sheet", p => p.title === "Link this login?")[0].visible, true);
  assert.equal(h.actions.filter(action => action[0] === "link").length, 0);
  screen.find("Button", p => p.title === "Link to this kitchen")[0].onPress();
  await flush();
  assert.equal(h.actions.filter(action => action[0] === "link").length, 1);
  assert.equal(h.render().find("Button", p => p.title === "Link Apple account").length, 0);
  h.cleanup();
});

test("sign-out requires confirmation and returns navigation to home", async () => {
  const h = harness();
  await flush();
  h.render().find("Button", p => p.title === "Sign out")[0].onPress();
  assert.equal(h.actions.length, 0);
  const screen = h.render();
  assert.equal(screen.find("Sheet", p => p.title === "Sign out of Cabinate?")[0].visible, true);
  screen.find("Button", p => p.title === "Sign out")[1].onPress();
  await flush();
  assert.deepEqual(h.actions, [["route", "/"], ["logout"]]);
  h.cleanup();
});
