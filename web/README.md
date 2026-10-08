# Cabinate Web

React and TypeScript client for pantry inventory, saved recipes, pantry-based recipe generation, and imported recipe content.

From this directory:

```sh
npm ci
npm run dev
```

Vite serves the app on port 5173 and proxies `/api` to the backend at `http://localhost:8080`. Start the API separately. Production hosting must route `/api` to the backend.

Authentication uses the API's `/api/v1/auth/config` mode. For OIDC, configure `VITE_AUTH_ISSUER` and `VITE_AUTH_CLIENT_ID` in `.env.local`; optional settings are `VITE_AUTH_AUDIENCE` and `VITE_AUTH_SCOPES`. Register the app's origin with a `/` redirect URI. Access tokens stay in memory, and redirect state uses session storage.

```sh
npm run build
npm run lint
npm test
```

The regression tests use Node 22's built-in TypeScript support and test runner. API requests share the HTTP and credential helpers in `../shared`. Ordinary requests have a 15-second deadline; recipe generation has a 65-second deadline and cancels when its dialog closes. Pantry expiration warnings derive from loaded inventory, including expired records and dates within seven local calendar days.
