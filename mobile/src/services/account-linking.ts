import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestJson } from "./http";
import { withDeadline } from "../../../shared/deadline.ts";
import type { SignInMethod } from "../components/sign-in-button";

export type LinkedAccounts = { providers: string[] };
export type LinkPreview = { accountId: string; provider: string; email: string };
export const methodForSubject = (subject: string): SignInMethod => {
  const provider = subject.split("|")[0];
  if (provider === "google-oauth2") return "google";
  if (provider === "apple") return "apple";
  if (provider === "auth0") return "email";
  throw new Error("This login provider does not support account linking yet.");
};

export function hasLocalKitchenData(raw: string | null): boolean {
  if (!raw) return false;
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid saved kitchen");
  // Treat any nonempty field as data; unknown future fields must not disappear through linking.
  return Object.values(data).some(value => value != null && (Array.isArray(value) ? value.length > 0
    : typeof value === "object" ? Object.keys(value).length > 0 : true));
}

type Options = {
  issuer: string; clientId: string; audience?: string; baseUrl: string; subject: string;
  method: SignInMethod; emailConnection: string; redirectUri: string;
  getToken: () => Promise<string | undefined>; assertCurrent: () => void;
  confirm: (preview: LinkPreview) => Promise<boolean>; signal: AbortSignal;
};

/** Ephemeral proof tokens never enter the normal login/session persistence path. */
export async function linkAccount(options: Options): Promise<LinkedAccounts | null> {
  const { issuer, clientId, baseUrl, signal } = options;
  const check = () => {
    options.assertCurrent();
    if (signal.aborted) throw new Error("Account linking cancelled.");
  };
  async function api<T>(path: string, body?: unknown): Promise<T> {
    check();
    const bearer = await options.getToken();
    check();
    if (!bearer) throw new Error("Please sign in again before linking accounts.");
    const result = await requestJson<T>(`${baseUrl}/auth/links${path}`, {
      method: body === undefined ? "GET" : "POST", signal,
      headers: { Authorization: `Bearer ${bearer}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    check();
    return result;
  }
  const challenge = await api<{ challengeId: string; primaryNonce: string; secondaryNonce: string }>("/challenge", {});
  const discovery = await withDeadline(AuthSession.fetchDiscoveryAsync(issuer.replace(/\/+$/, "")));
  check();
  async function prove(method: SignInMethod, nonce: string, management: boolean) {
    const connection = method === "google" ? "google-oauth2" : method === "apple" ? "apple" : options.emailConnection;
    const audience = management ? `${issuer.replace(/\/+$/, "")}/api/v2/` : options.audience;
    const request = new AuthSession.AuthRequest({
      clientId, redirectUri: options.redirectUri, responseType: AuthSession.ResponseType.Code, usePKCE: true,
      scopes: management ? ["openid", "profile", "email", "update:current_user_identities"] : ["openid", "profile", "email"],
      extraParams: { connection, nonce, prompt: "login", max_age: "0", ...(audience ? { audience } : {}) },
    });
    await request.makeAuthUrlAsync(discovery);
    check();
    const result = await request.promptAsync(discovery);
    check();
    if (result.type === "cancel" || result.type === "dismiss") return null;
    if (result.type !== "success" || !result.params.code || !request.codeVerifier)
      throw new Error("Could not verify this login. Please try again. Account linking must be available on your Auth0 plan.");
    let token: AuthSession.TokenResponse;
    try {
      token = await withDeadline(AuthSession.exchangeCodeAsync({
        clientId, redirectUri: options.redirectUri, code: result.params.code,
        extraParams: { code_verifier: request.codeVerifier },
      }, discovery));
    } catch {
      // Provider error payloads and authorization codes do not belong in the UI.
      throw new Error("Could not complete login verification. Please try again.");
    }
    check();
    if (!token.idToken || (management && !token.accessToken)) throw new Error("The login did not return the proof needed to link accounts.");
    return token;
  }
  const primary = await prove(methodForSubject(options.subject), challenge.primaryNonce, true);
  if (!primary) return null;
  const secondary = await prove(options.method, challenge.secondaryNonce, false);
  if (!secondary) return null;
  const proof = { challengeId: challenge.challengeId, primaryIdToken: primary.idToken,
    secondaryIdToken: secondary.idToken, managementAccessToken: primary.accessToken };
  const preview = await api<LinkPreview>("/preview", proof);
  check();
  const key = `cabinate:kitchen:v1:account:${encodeURIComponent(baseUrl)}:${encodeURIComponent(preview.accountId)}`;
  let hasData: boolean;
  try { hasData = hasLocalKitchenData(await AsyncStorage.getItem(key)); }
  catch { throw new Error("Could not check the other login's saved data on this device. Linking was stopped to keep it safe."); }
  check();
  if (hasData) throw new Error("The other login has lists or other saved data on this device. Linking was stopped to keep it safe. Combining existing kitchens needs a separate data merge.");
  if (!await options.confirm(preview)) return null;
  check();
  return api<LinkedAccounts>("", proof);
}
