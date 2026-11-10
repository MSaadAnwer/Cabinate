import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../state/auth";
import { Button, ErrorText, Page, Sheet, s } from "../components/ui";
import { useFeedback } from "../components/feedback";
import type { SignInMethod } from "../components/sign-in-button";
import { methodForSubject, type LinkPreview } from "../services/account-linking";

const names: Record<string, string> = { "google-oauth2": "Google", apple: "Apple", auth0: "Email" };
const methods = [{ method: "google", provider: "google-oauth2", title: "Link Google account" },
  { method: "apple", provider: "apple", title: "Link Apple account" },
  { method: "email", provider: "auth0", title: "Link email account" }] as const;

export default function SettingsScreen() {
  const { identity, signOut, linkAccount, linkedAccounts } = useAuth();
  const { notify } = useFeedback();
  const [providers, setProviders] = useState<string[]>([identity.subject.split("|")[0]]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!identity.development);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [logout, setLogout] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const confirmation = useRef<((confirmed: boolean) => void) | null>(null);
  const mounted = useRef(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const status = await linkedAccounts();
      if (mounted.current) setProviders(status.providers);
    } catch {
      if (mounted.current) setError("Could not load your linked logins. Please try again.");
    } finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => {
    mounted.current = true;
    if (!identity.development) void load();
    return () => {
      mounted.current = false;
      controller.current?.abort();
      confirmation.current?.(false);
    };
  }, [identity.accountId]);

  function confirm(value: boolean) {
    confirmation.current?.(value);
    confirmation.current = null;
    setPreview(null);
  }
  async function link(method: SignInMethod) {
    if (controller.current) return;
    const operation = new AbortController();
    controller.current = operation;
    setBusy(true);
    setError("");
    try {
      const result = await linkAccount(method, (candidate) => new Promise<boolean>((resolve) => {
        if (!mounted.current || operation.signal.aborted) { resolve(false); return; }
        confirmation.current = resolve;
        setPreview(candidate);
      }), operation.signal);
      if (mounted.current && result) {
        setProviders(result.providers);
        notify("Login linked. Both methods now open this kitchen.");
      }
    } catch (failure) {
      if (mounted.current && !operation.signal.aborted) setError((failure as { message?: string }).message || "Could not link this login. Please try again.");
    } finally {
      controller.current = null;
      if (mounted.current) { setBusy(false); setPreview(null); }
    }
  }
  let primary = "Your current login";
  try { primary = methodForSubject(identity.subject) === "google" ? "Google" : methodForSubject(identity.subject) === "apple" ? "Apple" : "Email"; } catch { /* Unknown provider stays unnamed. */ }
  return <Page>
    <Text style={s.eyebrow}>Make yourself at home</Text>
    <View style={s.card}>
      <Text style={s.heading}>Connected logins</Text>
      <Text style={s.body}>Use Google, Apple, or email to open the same Cabinate kitchen.</Text>
      {identity.development ? <Text style={s.muted}>Account linking is available when you sign in to a personal account.</Text> : <>
        <Text style={s.muted}>{loading ? "Checking your logins…" : `Connected: ${providers.map(provider => names[provider] || "Other login").join(", ")}`}</Text>
        <Text style={s.muted}>This kitchen stays primary. First verify your {primary} login, then the login you want to add. Existing kitchens are not automatically merged.</Text>
        <ErrorText message={error} />
        {!loading && !!error && <Button title="Refresh linked logins" secondary disabled={busy} onPress={() => void load()} />}
        {methods.filter(item => !providers.includes(item.provider)).map(item => <Button key={item.method}
          title={item.title} icon="link" secondary disabled={busy || loading || !!error} onPress={() => void link(item.method)} />)}
        {busy && <Text style={s.muted}>Verify both logins in the browser, then return here to confirm. Your current account stays signed in.</Text>}
      </>}
    </View>
    {!identity.development && <View style={s.card}>
      <Text style={s.heading}>Your session</Text>
      <Text style={s.muted}>Your saved kitchen will be here when you sign back in.</Text>
      <Button title="Sign out" destructive disabled={busy} onPress={() => setLogout(true)} />
    </View>}
    <Sheet title="Link this login?" visible={!!preview} onClose={() => confirm(false)}>
      <Text style={s.body}>Link {preview?.email || "this account"} with {preview ? names[preview.provider] : ""} to your current kitchen?</Text>
      <Text style={s.muted}>Either login will then open this pantry and cookbook. Lists and photos stay on their current device. Data saved under the other login on a different device is not moved.</Text>
      <Button title="Link to this kitchen" onPress={() => confirm(true)} />
      <Button title="Cancel" secondary onPress={() => confirm(false)} />
    </Sheet>
    <Sheet title="Sign out of Cabinate?" visible={logout} onClose={() => setLogout(false)}>
      <Text style={s.body}>Your saved data stays in place. Active timer notifications will be cancelled.</Text>
      <Button title="Sign out" destructive onPress={() => {
        setLogout(false);
        router.dismissTo("/");
        void signOut().catch(() => {});
      }} />
      <Button title="Stay signed in" secondary onPress={() => setLogout(false)} />
    </Sheet>
  </Page>;
}
