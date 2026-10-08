import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import { Button, ErrorText, LoadingRows, s, colors } from "../components/ui";
import { TomatoMark } from "../components/art";
import { apiConfig } from "../services/api";
import { requestJson } from "../services/http";
import { configureCredentials } from "../services/credentials";
import { withDeadline } from "../../../shared/deadline.ts";

WebBrowser.maybeCompleteAuthSession();
const issuer = process.env.EXPO_PUBLIC_AUTH_ISSUER;
const clientId = process.env.EXPO_PUBLIC_AUTH_CLIENT_ID;
const audience = process.env.EXPO_PUBLIC_AUTH_AUDIENCE;
const scopes = (process.env.EXPO_PUBLIC_AUTH_SCOPES || "openid profile offline_access cabinate:read cabinate:write").split(/\s+/);
const redirectUri = AuthSession.makeRedirectUri({ scheme: "cabinate", path: "auth" });
// Bind saved credentials to the provider, client and API configuration.
const credentialKey = "cabinate.oidc.v1";
const configuration = JSON.stringify([issuer, clientId, audience, apiConfig.baseUrl]);
type Identity = { subject: string; accountId: string; development: boolean };
type Auth = { identity: Identity; signOut: () => Promise<void> };
const Context = createContext<Auth | null>(null);
let storageWrites: Promise<void> = Promise.resolve();

function persist(token: AuthSession.TokenResponse | null): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve(); // Browser credentials stay in memory.
  const raw = token ? JSON.stringify({ configuration, token: token.getRequestConfig() }) : null;
  const write = storageWrites.catch(() => {}).then(() => raw === null
    ? SecureStore.deleteItemAsync(credentialKey)
    : SecureStore.setItemAsync(credentialKey, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }));
  storageWrites = write;
  return write;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useRef<AuthSession.TokenResponse | null>(null);
  const refresh = useRef<Promise<string | undefined> | null>(null);
  const generation = useRef(0);
  const signedInAccount = useRef<string | null>(null);
  const working = useRef(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");

  const signOut = useCallback(async () => {
    generation.current++;
    token.current = null;
    signedInAccount.current = null;
    refresh.current = null;
    setIdentity(null);
    setLoading(false);
    // Mounted account data and drafts disappear before any asynchronous cleanup.
    await Promise.all([persist(null), Notifications.cancelAllScheduledNotificationsAsync().catch(() => {})]);
  }, []);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    const current = token.current;
    if (!current) return undefined;
    if (!current.shouldRefresh()) return current.accessToken;
    if (!refresh.current) {
      const ticket = generation.current;
      refresh.current = (async () => {
        try {
          if (!issuer || !clientId || !current.refreshToken) throw new Error("Session expired");
          const discovery = await withDeadline(AuthSession.fetchDiscoveryAsync(issuer));
          const next = await withDeadline(AuthSession.refreshAsync({ clientId, refreshToken: current.refreshToken }, discovery));
          if (signedInAccount.current) {
            const identity = await requestJson<{ accountId: string }>(`${apiConfig.baseUrl}/auth/me`,
              { headers: { Authorization: `Bearer ${next.accessToken}` } });
            if (identity.accountId !== signedInAccount.current) throw new Error("Account changed");
          }
          if (ticket !== generation.current) throw new Error("Session changed");
          // Some providers omit a new refresh token; others rotate it.
          next.refreshToken ||= current.refreshToken;
          token.current = next;
          await persist(next);
          if (ticket !== generation.current) throw new Error("Session changed");
          return next.accessToken;
        } catch {
          if (ticket === generation.current) {
            await signOut();
            setError("Your session expired. Please sign in again.");
          }
          throw new Error("Please sign in again.");
        } finally { if (ticket === generation.current) refresh.current = null; }
      })();
    }
    return refresh.current;
  }, [signOut]);

  useEffect(() => configureCredentials(getToken, (rejected) => {
    if (rejected && rejected === token.current?.accessToken) {
      void signOut().catch(() => {});
      setError("Your session expired. Please sign in again.");
    }
  }), [getToken, signOut]);

  const verify = useCallback(async (development: boolean) => {
    const ticket = generation.current;
    const bearer = development ? undefined : await getToken();
    const me = await requestJson<{ subject: string; accountId: string }>(`${apiConfig.baseUrl}/auth/me`,
      { headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined });
    if (!me.subject || typeof me.subject !== "string" || !me.accountId || typeof me.accountId !== "string") throw new Error("Invalid account response");
    if (ticket === generation.current) {
      signedInAccount.current = me.accountId;
      setIdentity({ subject: me.subject, accountId: me.accountId, development });
    }
  }, [getToken]);

  const initialize = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const server = await requestJson<{ mode: string; configured: boolean }>(`${apiConfig.baseUrl}/auth/config`);
      if (ticket !== generation.current) return;
      if (server.mode === "development") { await verify(true); return; }
      setConfigured(server.configured && !!issuer && !!clientId);
      if (Platform.OS !== "web") {
        const raw = await SecureStore.getItemAsync(credentialKey);
        if (ticket !== generation.current) return;
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.configuration === configuration && typeof saved.token?.accessToken === "string") {
            token.current = new AuthSession.TokenResponse(saved.token);
            await verify(false);
          } else { await persist(null); }
        }
      }
    } catch (failure) {
      if (ticket === generation.current) {
        if ((failure as { status?: number }).status === 401) {
          token.current = null;
          await persist(null).catch(() => {});
          setError("Your session expired. Please sign in again.");
        } else { setError("Could not open your account. Check your connection and try again."); }
      }
    } finally { if (ticket === generation.current) setLoading(false); }
  }, [verify]);
  useEffect(() => { void initialize(); }, [initialize]);

  const signIn = async () => {
    if (!issuer || !clientId || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const ticket = ++generation.current;
    try {
      const discovery = await withDeadline(AuthSession.fetchDiscoveryAsync(issuer));
      const request = new AuthSession.AuthRequest({ clientId, redirectUri, scopes, usePKCE: true,
        responseType: AuthSession.ResponseType.Code, extraParams: audience ? { audience } : {} });
      const result = await request.promptAsync(discovery);
      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type !== "success" || !result.params.code || !request.codeVerifier) throw new Error("Sign-in failed");
      const next = await withDeadline(AuthSession.exchangeCodeAsync({ clientId, redirectUri, code: result.params.code,
        extraParams: { code_verifier: request.codeVerifier } }, discovery));
      if (ticket !== generation.current) return;
      token.current = next;
      await verify(false);
      if (ticket !== generation.current) return;
      await persist(next);
    } catch {
      if (ticket === generation.current) {
        token.current = null;
        setIdentity(null);
        await persist(null).catch(() => {});
        setError("Could not sign in. Please try again.");
      }
    } finally { working.current = false; setBusy(false); }
  };

  if (identity) return <Context value={{ identity, signOut }}>{children}</Context>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream, justifyContent: "center", padding: 28 }}>
      <View style={{ gap: 20, width: "100%", maxWidth: 420, alignSelf: "center" }}>
        <TomatoMark size={64} />
        <Text style={s.title}>Your kitchen, all in one place.</Text>
        <Text style={s.body}>Sign in to open your pantry and cookbook.</Text>
        {loading ? <LoadingRows label="Opening your account" /> : <>
          <ErrorText message={error} />
          {configured && <Button title="Sign in" pending={busy} onPress={() => void signIn()} />}
          {!configured && !error && <Text style={s.muted}>Sign-in is being set up. Please check back soon.</Text>}
          <Button title="Try again" secondary disabled={busy} onPress={() => void initialize()} />
        </>}
      </View>
    </SafeAreaView>
  );
}

export function useAuth() {
  const auth = use(Context);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
