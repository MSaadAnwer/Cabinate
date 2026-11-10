const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");
const { configureCredentials } = require("../../shared/credentials.ts");
const { authenticatedJson } = require("../../shared/authenticated-http.ts");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function findButton(node, title) {
  if (!node) return;
  if (Array.isArray(node)) return node.map((child) => findButton(child, title)).find(Boolean);
  if ((node.type === "Button" || node.type === "SignInButton") && node.props.title === title) return node;
  if (node.type === "Touch" && node.props.accessibilityLabel === title) return node;
  return findButton(node.props?.children, title);
}

async function authHarness(sharedCredentials = false, title = "Sign in with Google") {
  const hooks = [], effects = [], writes = [], requests = [];
  let hookIndex = 0, rejectToken, getToken, resolveAccount, releaseWrite, disconnect;
  let expired = false, deferWrites = false;
  const account = new Promise((resolve) => { resolveAccount = resolve; });
  const next = {
    accessToken: "new-token",
    refreshToken: "initial-refresh",
    shouldRefresh: () => expired,
    getRequestConfig: () => ({ accessToken: "new-token" }),
  };
  const modules = {
    react: {
      createContext: () => "context",
      useCallback: (callback) => callback,
      useRef: (current) => hooks[hookIndex++] ??= { current },
      useState: (initial) => {
        const state = hooks[hookIndex++] ??= { value: initial };
        return [state.value, (value) => { state.value = value; }];
      },
      useEffect: (effect) => effects.push(effect),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" },
    "react-native": { Platform: { OS: "ios" }, Text: "Text", View: "View", ScrollView: "ScrollView" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-auth-session": {
      makeRedirectUri: () => "cabinate://auth",
      fetchDiscoveryAsync: async (issuer) => {
        assert.equal(issuer, "https://issuer.example.test");
        return {};
      },
      ResponseType: { Code: "code" },
      AuthRequest: class {
        constructor(options) { requests.push(options); }
        codeVerifier = "proof";
        async makeAuthUrlAsync() { return "https://issuer.example.test/authorize"; }
        async promptAsync() { return { type: "success", params: { code: "code" } }; }
      },
      exchangeCodeAsync: async () => next,
      refreshAsync: async () => ({
        accessToken: "refreshed-token",
        shouldRefresh: () => false,
        getRequestConfig: () => ({ accessToken: "refreshed-token" }),
      }),
    },
    "expo-web-browser": { maybeCompleteAuthSession: () => {} },
    "expo-notifications": { cancelAllScheduledNotificationsAsync: async () => {} },
    "expo-secure-store": {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
      getItemAsync: async () => null,
      deleteItemAsync: async () => { writes.push({ type: "delete" }); },
      setItemAsync: async (key, raw) => {
        writes.push({ type: "set", value: JSON.parse(raw) });
        if (deferWrites) await new Promise((resolve) => { releaseWrite = resolve; });
      },
    },
    "../components/ui": { Button: "Button", ErrorText: "ErrorText", LoadingRows: "LoadingRows", s: {}, colors: {} },
    "../components/art": { TomatoMark: "TomatoMark" },
    "../components/sign-in-button": { SignInButton: "SignInButton" },
    "../components/feedback": { Touch: "Touch" },
    "../services/account-linking": { linkAccount: async () => { throw new Error("Not used in this session test"); } },
    "../services/api": { apiConfig: { baseUrl: "https://api.example.test" } },
    "../services/http": {
      requestJson: async (url) => url.endsWith("/auth/config")
        ? { mode: "oidc", configured: true }
        : account,
    },
    "../services/credentials": {
      configureCredentials: (read, reject) => {
        getToken = read;
        rejectToken = reject;
        disconnect = sharedCredentials ? configureCredentials(read, reject) : () => {};
        return disconnect;
      },
    },
    "../../../shared/deadline.ts": { withDeadline: (promise) => promise },
  };
  const { AuthProvider } = loadTypeScript(require.resolve("../src/state/auth.tsx"), modules, {
    __DEV__: false,
    process: { env: { EXPO_PUBLIC_AUTH_ISSUER: "https://issuer.example.test/", EXPO_PUBLIC_AUTH_CLIENT_ID: "client" } },
  });
  const render = () => { hookIndex = 0; return AuthProvider({ children: "account-content" }); };
  render();
  effects.splice(0).forEach((effect) => effect());
  await flush();
  findButton(render(), title).props.onPress();
  await flush();
  return {
    writes,
    requests,
    render,
    getToken: () => getToken(),
    rejectToken: (token = "new-token") => rejectToken(token),
    expireToken: () => { expired = true; deferWrites = true; },
    releaseWrite: () => releaseWrite(),
    disconnect: () => disconnect(),
    finishSignIn: async () => { resolveAccount({ subject: "subject", accountId: "account" }); await flush(); },
  };
}

test("provider buttons start the selected Auth0 connection with PKCE", async () => {
  for (const [title, connection, signup] of [
    ["Sign in with Google", "google-oauth2", false],
    ["Sign in with Apple", "apple", false],
    ["Sign up with Email", "Username-Password-Authentication", true],
    ["Already have an account? Sign in with email", "Username-Password-Authentication", false],
  ]) {
    const h = await authHarness(false, title);
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].extraParams.connection, connection);
    assert.equal(h.requests[0].extraParams.screen_hint, signup ? "signup" : undefined);
    assert.equal(h.requests[0].usePKCE, true);
    assert.equal(h.requests[0].redirectUri, "cabinate://auth");
    assert.equal(findButton(h.render(), "Sign in with Google").props.disabled, true);
    assert.equal(findButton(h.render(), "Sign in with Apple").props.disabled, true);
    assert.equal(findButton(h.render(), "Sign up with Email").props.disabled, true);
    await h.finishSignIn();
  }
});

test("revoking a login during account verification cannot save its credentials afterward", async () => {
  const h = await authHarness();
  h.rejectToken();
  await flush();
  await h.finishSignIn();
  assert.deepEqual(h.writes, [{ type: "delete" }]);
  assert.equal(await h.getToken(), undefined);
});

test("a verified current login saves its credentials and opens the account", async () => {
  const h = await authHarness();
  await h.finishSignIn();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].type, "set");
  assert.equal(h.writes[0].value.token.accessToken, "new-token");
  assert.equal(h.render().props.value.identity.accountId, "account");
});

test("sign-out during a native refresh write prevents the waiting mutation from dispatching", async () => {
  const h = await authHarness(true);
  await h.finishSignIn();
  h.expireToken();
  const originalFetch = global.fetch;
  let dispatched = 0;
  global.fetch = async () => { dispatched++; return new Response("{}", { status: 200 }); };
  try {
    const mutation = authenticatedJson("https://api.example.test/pantry", { method: "POST", body: "{}" });
    const rejected = assert.rejects(mutation, /Please sign in again/);
    await flush();
    assert.equal(h.writes.at(-1).value.token.accessToken, "refreshed-token");
    h.rejectToken("refreshed-token");
    h.releaseWrite();
    await rejected;
    await flush();
    assert.equal(dispatched, 0);
    assert.equal(h.writes.at(-1).type, "delete");
    assert.equal(await h.getToken(), undefined);
  } finally {
    global.fetch = originalFetch;
    h.disconnect();
  }
});
