const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

function harness({ cancelAt = -1, localData = null, confirm = true, changeAccount = false } = {}) {
  const requests = [], authRequests = [], storageReads = [];
  const controller = new AbortController();
  const modules = {
    "expo-auth-session": {
      ResponseType: { Code: "code" },
      fetchDiscoveryAsync: async issuer => { assert.equal(issuer, "https://tenant.us.auth0.com"); return {}; },
      AuthRequest: class {
        codeVerifier = "proof";
        constructor(options) { this.index = authRequests.length; authRequests.push(options); }
        async makeAuthUrlAsync() { return "https://tenant.us.auth0.com/authorize"; }
        async promptAsync() {
          if (this.index === cancelAt) return { type: "cancel" };
          return { type: "success", params: { code: `code-${this.index}` } };
        }
      },
      exchangeCodeAsync: async options => ({ idToken: `id-${options.code}`, accessToken: `access-${options.code}` }),
    },
    "@react-native-async-storage/async-storage": { getItem: async key => { storageReads.push(key); return localData; } },
    "./http": { requestJson: async (url, options) => {
      requests.push({ url, options });
      assert.equal(options.headers.Authorization, "Bearer original-api-token");
      if (url.endsWith("/challenge")) return { challengeId: "challenge", primaryNonce: "primary-nonce", secondaryNonce: "secondary-nonce" };
      if (url.endsWith("/preview")) return { accountId: "secondary-owner", provider: "apple", email: "user@example.test" };
      return { providers: ["google-oauth2", "apple"] };
    } },
    "../../../shared/deadline.ts": { withDeadline: value => value },
  };
  const service = loadTypeScript(require.resolve("../src/services/account-linking.ts"), modules);
  const options = {
    issuer: "https://tenant.us.auth0.com/", clientId: "client", audience: "cabinate-api",
    baseUrl: "https://api.example.test/api/v1", subject: "google-oauth2|primary", method: "apple",
    emailConnection: "Username-Password-Authentication", redirectUri: "cabinate://auth",
    signal: controller.signal, getToken: async () => "original-api-token",
    assertCurrent: () => { if (changeAccount && authRequests.length) throw new Error("Account changed"); },
    confirm: async preview => { assert.equal(preview.email, "user@example.test"); return confirm; },
  };
  return { service, options, requests, authRequests, storageReads, controller };
}

test("linking reauthenticates both providers with distinct nonces and only uses a self-scoped management token", async () => {
  const h = harness();
  assert.deepEqual(JSON.parse(JSON.stringify(await h.service.linkAccount(h.options))), { providers: ["google-oauth2", "apple"] });
  assert.equal(h.authRequests.length, 2);
  assert.equal(h.authRequests[0].extraParams.connection, "google-oauth2");
  assert.equal(h.authRequests[1].extraParams.connection, "apple");
  assert.equal(h.authRequests[0].extraParams.nonce, "primary-nonce");
  assert.equal(h.authRequests[1].extraParams.nonce, "secondary-nonce");
  assert.equal(h.authRequests[0].extraParams.audience, "https://tenant.us.auth0.com/api/v2/");
  assert.ok(h.authRequests[0].scopes.includes("update:current_user_identities"));
  assert.ok(!h.authRequests[0].scopes.includes("update:users"));
  for (const request of h.authRequests) {
    assert.equal(request.usePKCE, true);
    assert.equal(request.extraParams.prompt, "login");
    assert.equal(request.extraParams.max_age, "0");
    assert.ok(!request.scopes.includes("offline_access"));
  }
  assert.equal(h.requests.length, 3);
  const proof = JSON.parse(h.requests[2].options.body);
  assert.equal(proof.primaryIdToken, "id-code-0");
  assert.equal(proof.secondaryIdToken, "id-code-1");
  assert.equal(proof.managementAccessToken, "access-code-0");
  assert.equal(h.storageReads[0], "cabinate:kitchen:v1:account:https%3A%2F%2Fapi.example.test%2Fapi%2Fv1:secondary-owner");
});

test("cancelling either browser never links or replaces the active session", async () => {
  for (const cancelAt of [0, 1]) {
    const h = harness({ cancelAt });
    assert.equal(await h.service.linkAccount(h.options), null);
    assert.equal(h.requests.length, 1);
  }
});

test("rejecting final confirmation leaves the two accounts separate", async () => {
  const h = harness({ confirm: false });
  assert.equal(await h.service.linkAccount(h.options), null);
  assert.equal(h.requests.length, 2);
});

test("secondary local records and unreadable snapshots block linking", async () => {
  for (const localData of [JSON.stringify({ lists: [{ id: "other-list" }] }), JSON.stringify({ futureField: { saved: true } }), "not-json"]) {
    const h = harness({ localData });
    await assert.rejects(h.service.linkAccount(h.options), /saved data|saved data on this device/);
    assert.equal(h.requests.length, 2);
  }
});

test("account switching or leaving settings aborts before any linking mutation", async () => {
  const switched = harness({ changeAccount: true });
  await assert.rejects(switched.service.linkAccount(switched.options), /Account changed/);
  assert.equal(switched.requests.length, 1);
  const cancelled = harness();
  cancelled.controller.abort();
  await assert.rejects(cancelled.service.linkAccount(cancelled.options), /cancelled/);
  assert.equal(cancelled.requests.length, 0);
});
