import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { requestJson } from '../../../shared/http';

const issuer = import.meta.env.VITE_AUTH_ISSUER;
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
export const manager = issuer && clientId ? new UserManager({
  authority: issuer,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  scope: import.meta.env.VITE_AUTH_SCOPES || 'openid profile offline_access cabinate:read cabinate:write',
  extraQueryParams: import.meta.env.VITE_AUTH_AUDIENCE ? { audience: import.meta.env.VITE_AUTH_AUDIENCE } : {},
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: false,
  requestTimeoutInSeconds: 15,
  loadUserInfo: false,
}) : null;
let renewal: Promise<User | null> | null = null;
let restoration: Promise<User | null> | null = null;
let session = 0;

export function restoreSession() {
  if (!manager) return Promise.resolve(null);
  if (!restoration) restoration = (async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('state') && (params.has('code') || params.has('error'))) {
      try { return await manager.signinRedirectCallback(); }
      finally { window.history.replaceState({}, document.title, '/'); }
    }
    return manager.getUser();
  })();
  return restoration;
}

export async function getAccessToken() {
  if (!manager) return undefined;
  let user = await manager.getUser();
  if (!user) return undefined;
  if (user.expired) {
    if (!user.refresh_token) throw new Error('Your session expired. Please sign in again.');
    const ticket = session;
    renewal ||= manager.signinSilent().finally(() => { renewal = null; });
    user = await renewal;
    if (ticket !== session) throw new Error('Session changed');
  }
  if (!user || user.expired) throw new Error('Your session expired. Please sign in again.');
  return user.access_token;
}

export async function accountFor(token?: string) {
  const identity = await requestJson<{ accountId: string }>('/api/v1/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (typeof identity.accountId !== 'string' || !identity.accountId) throw new Error('Invalid account response');
  return identity.accountId;
}

export async function clearSession() {
  session++;
  renewal = null;
  restoration = null;
  manager?.stopSilentRenew();
  await manager?.removeUser();
}
