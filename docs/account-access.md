# OpenID Connect, account isolation, and versioned writes

Each account has its own pantry, cookbook, and capture inbox. There is no shared-household
model. The API validates JWT access tokens from one configured OpenID Connect issuer.
Account IDs are SHA-256 of the verified issuer, a null separator, and subject; matching
subjects at different issuers therefore do not share data. Ownership is assigned by
the server and cannot be selected through a header, query parameter, or request body.

## Identity-provider configuration

Register public clients for the mobile app and browser app using Authorization Code
with PKCE. No client secret belongs in either client. Configure the provider to issue
signed JWT **access tokens** with:

- `iss`: the exact configured issuer, using HTTPS.
- `aud`: containing the API audience you configure, for example `cabinate-api`.
- `sub`: a stable, nonempty account subject.
- `exp`: an expiration timestamp; normal issuer/time/signature validation also applies.
- `scope`: `cabinate:read` for reads and `cabinate:write` for mutations.

The API does not accept an ID token as a substitute for a properly configured API
access token. Providers with opaque access tokens require an introspection adapter;
providers that omit an API audience need their resource/audience configuration enabled.
Account enrollment, verification, recovery, MFA, and provider session policies remain
with your identity provider.

On the server, set `CABINATE_AUTH_ISSUER` and `CABINATE_AUTH_AUDIENCE`. An unconfigured
server rejects protected requests; it does not silently allow anonymous access.
JWT discovery/key loading is lazy, so startup does not depend on provider availability.
Serve the deployed API over HTTPS and set `CABINATE_CORS_ALLOWED_ORIGINS` for browser
origins. See the official [Spring Security JWT configuration](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

Copy the client `.env.example` files to `.env.local` and fill in your public issuer,
client ID, audience, and scopes. Restart the dev servers after changing these values.
Register the browser redirect as `http://localhost:5173/` for local web development
and the deployed site's origin followed by `/` for production. Native sign-in redirects
to `cabinate://auth`; use an Expo development build or installed app with that scheme.
Expo Go cannot provide this app's custom native callback scheme. Expo web uses its
origin's `/auth` callback; register that URL if testing the mobile UI in a browser.

`GET /api/v1/auth/config` is public and reports mode/configuration readiness.
`GET /api/v1/auth/me` requires a valid token and returns `{subject, accountId}`.
Public FDA recall notices remain readable without signing in. All operational queries,
including recipe-generation stock, are scoped to the current account. Foreign IDs
return 404. Security-filter failures return the normal JSON contract with 401 or 403.

## Client sessions and local data

Mobile uses Expo AuthSession with PKCE and stores native credentials in SecureStore,
accessible only on the unlocked device. Browser tokens stay in memory; only the brief
PKCE redirect interaction state is kept in session storage. Reloading a browser page
may require signing in again. Provider calls have deadlines; mutations are never
automatically replayed after authentication failures.

Native refreshes are serialized, account identity is verified after refresh, and stale
session results cannot reopen an account after sign-out. Sign-out immediately unmounts
account data, clears local credentials, and cancels this app's scheduled timer alerts.
It does not terminate the provider's SSO session or revoke already-issued access tokens;
server acceptance ends at token expiry or an applicable provider policy.

Local lists, photos, receipts, and cooking progress are stored under the API address
and verified account ID. Changing accounts remounts the stores and prevents stale
remote responses from filling the next account's screens. Earlier unassigned local
data stays in the development store; it is not automatically imported into an account.

## Development mode

The explicitly selected `dev` profile allows unauthenticated local use as `local-demo`.
It defaults demo seeding and the reset API on; both can still be disabled by their
environment settings. Seeder counts and resets are scoped to `local-demo`, so they
do not wipe another account's records. The seed controller and startup seeder are
absent outside this profile, even if a seed setting is enabled. Use this mode only
on your private development server.

## Versioned write contract

Recipe, pantry, and ingestion responses include a numeric `version`, initially 0.
PUT recipe/pantry and PATCH ingestion status bodies must send that same version.
Example: `{"status":"PROCESSED","version":0}`. Both a stale client version and
a race during MongoDB persistence return 409. Forms retain their drafts; refresh and
review the latest record before retrying. Configure acknowledged MongoDB writes;
optimistic locking cannot reliably detect conflicts with unacknowledged writes.

DELETE recipes and pantry items require `If-Match: "0"` (replace 0 with the version
last read). Missing headers return 428; weak tags, wildcard tags, malformed tags, and
out-of-range numbers return 400. A stale version returns 409. The repository deletes
the scoped, versioned entity so a race after reading is also checked by MongoDB.
See [Spring Data's optimistic locking behavior](https://docs.spring.io/spring-data/mongodb/reference/mongodb/template-crud-operations.html#mongo-template.optimistic-locking).

## Existing MongoDB data

Legacy documents without an owner are invisible to account queries. Back up your
database, stop API writes, and choose the intended account before migrating. Get the
destination `accountId` from that account's authenticated `/auth/me` response; use
`local-demo` only for local development data. Do not use an email address or raw `sub`.

From `api`, with `CABINATE_MIGRATION_OWNER_ID` set to that account ID:

```powershell
mongosh "$env:SPRING_MONGODB_URI" --file scripts/migrate-account.js
```

This is a dry run. After inspecting its counts, set `CABINATE_MIGRATION_APPLY=true`
and rerun to apply. The script claims only missing/null owners and initializes missing
versions for the chosen owner. It preserves existing ownership and versions, and can
be rerun safely after interruption. It does not infer multiple owners from previously
shared data: split such records explicitly before migration. No migration runs on startup.

## Validation

Run `mvn test` in `api`, `node --test api/scripts/migrate-account.test.cjs` from the root,
and the mobile tests/typecheck plus web build/lint. Security tests sign real RSA JWTs
locally and cover bad signatures, issuer/audience/expiry/subject validation, scopes,
spoofed ownership, and unauthenticated preflights. Write tests cover stale versions,
foreign IDs, delete preconditions, and races. Migration tests check dry runs, preserved
owners/versions, and idempotence.

To run real MongoDB checks, set `CABINATE_TEST_MONGODB_URI` for a development MongoDB
instance before `mvn test`. Those checks create randomly named `cabinate_access_test_*`
databases and remove only their own test databases. The tests never migrate or reset
the application's existing collections. Real provider sign-in and physical iPhone
callbacks require your provider configuration and remain separate verification steps.
