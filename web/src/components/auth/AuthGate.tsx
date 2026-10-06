import { useEffect, useState, type ReactNode } from 'react';
import { requestJson } from '../../../../shared/http';
import { configureCredentials } from '../../../../shared/credentials';
import { accountFor, clearSession, getAccessToken, manager, restoreSession } from '../../services/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [development, setDevelopment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let owner: string | null = null;
    let approvedToken: string | undefined;
    let verification: Promise<string> | null = null;
    const expire = () => { owner = null; if (active) { setAccount(null); setError('Your session expired. Please sign in again.'); } };
    const resetCredentials = configureCredentials(async () => {
      try {
        const token = await getAccessToken();
        // Never publish one account's data into another account's mounted app.
        if (token && owner && token !== approvedToken) {
          verification ||= accountFor(token).finally(() => { verification = null; });
          if (await verification !== owner) { expire(); throw new Error('Account changed'); }
          approvedToken = token;
        }
        if (!active) throw new Error('Session changed');
        return token;
      } catch { expire(); throw new Error('Please sign in again.'); }
    }, (rejected) => {
      void manager?.getUser().then((user) => {
        if (active && rejected === user?.access_token) { expire(); void clearSession(); }
      });
    });
    const open = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await requestJson<{ mode: string; configured: boolean }>('/api/v1/auth/config');
        if (!active) return;
        const local = config.mode === 'development';
        setDevelopment(local);
        setConfigured(config.configured && !!manager);
        if (!local) {
          await restoreSession();
          const token = await getAccessToken();
          if (!token) return;
          owner = await accountFor(token);
          approvedToken = token;
        } else { owner = await accountFor(); }
        if (active) setAccount(owner);
      } catch { if (active) setError('Could not open your account. Check your connection and try again.'); }
      finally { if (active) setLoading(false); }
    };
    void open();
    return () => { active = false; resetCredentials(); };
  }, [attempt]);

  const signIn = async () => {
    setBusy(true);
    setError('');
    try { await manager?.signinRedirect(); }
    catch { setError('Could not start sign-in. Please try again.'); setBusy(false); }
  };
  const signOut = async () => {
    setAccount(null);
    await clearSession();
    setAttempt((value) => value + 1);
  };

  if (account) return <div key={account}>
    {!development && <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px' }}>
      <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>
    </div>}
    {children}
  </div>;
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <section style={{ maxWidth: 420, display: 'grid', gap: 20 }} aria-label="Sign in">
      <h1>Welcome to Cabinate</h1>
      <p>Sign in to open your pantry and cookbook.</p>
      {loading ? <p role="status">Opening your account…</p> : <>
        {error && <p role="alert">{error}</p>}
        {configured && <button className="btn btn-primary" disabled={busy} onClick={() => void signIn()}>{busy ? 'Opening sign-in…' : 'Sign in'}</button>}
        {!configured && !error && <p>Sign-in is being set up. Please check back soon.</p>}
        <button className="btn btn-secondary" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Try again</button>
      </>}
    </section>
  </main>;
}
