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

### Mobile provider buttons (Auth0)

The mobile account screen offers Google, Apple, and email sign-up, with a small email sign-in link for returning users. All use the existing system-browser Authorization Code + PKCE flow and verify the resulting Auth0 access token with the API.

- Google sends `connection=google-oauth2`.
- Apple sends `connection=apple`. The button is wired, but Apple will not authenticate until its social connection is configured and enabled for the mobile application in Auth0. This is a browser-based Apple flow, not the native Apple SDK flow.
- Email sends the database connection name (default `Username-Password-Authentication`, override with `EXPO_PUBLIC_AUTH_EMAIL_CONNECTION`). Sign-up additionally sends `screen_hint=signup`; returning email sign-in omits it.

Enable the Google and Apple social connections and the email database connection for the Cabinate application. Database sign-ups must be allowed. Apple requires Apple Developer credentials and the web-flow configuration described in [Auth0's Apple web guide](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/apple-web). Configure private Apple signing credentials only in Auth0; never in the app or repository. Restart Metro after changing public connection-name configuration.

Verify each provider on the phone, including cancellation, successful return, an existing email login, and a new email registration. Different provider identities are separate Cabinate accounts unless securely linked through a future account-linking flow; matching email addresses do not merge kitchen data.

`GET /api/v1/auth/me` requires a valid token and returns `{subject, accountId}`.
Public FDA recall notices remain readable without signing in. All operational queries,
including recipe-generation stock, are scoped to the current account. Foreign IDs
return 404. Security-filter failures return the normal JSON contract with 401 or 403.

## Client sessions and local data

### Settings and user-initiated linking

Account retains the kitchen summary and saved captures. Its Settings button opens a separate screen with connected logins, linking actions, and confirmed sign-out.

Linking keeps the currently signed-in Auth0 subject as primary, preserving Cabinate's existing issuer/subject-derived ownership and device namespace. To retain an existing Google kitchen, sign into Google first, then open Account → Settings → Link Apple account. The flow does not compare emails to decide ownership.

The backend creates one ten-minute challenge per signed-in account, bound to its subject and authorized client (`azp`). The app reauthenticates the primary provider using Authorization Code + PKCE, `prompt=login`, `max_age=0`, and a challenge nonce. It requests the Auth0 Management API audience with only `update:current_user_identities` alongside the standard identity scopes. The secondary provider is authenticated separately with another nonce. These proof tokens are held in memory only and never replace or persist as the normal Cabinate session.

The backend verifies signatures, issuer, token lifetime, client audience, nonce, verified email, recent `auth_time`, primary subject, and the management token's subject/client/audience/scope. A preview returns only the verified secondary account's ID, provider, and email. The client checks that account's local kitchen namespace and asks the user to confirm. The final endpoint revalidates proofs and atomically consumes the challenge before calling Auth0's self-service link endpoint using the primary user's management access token and secondary ID token. No administrator token, client secret, or additional backend linking environment variable is needed.

**Auth0 prerequisites:** the application must be allowed to request the Management API's `update:current_user_identities` scope, both connections must be enabled, and the tenant's plan must support linking. Use RS256 ID tokens. `CABINATE_AUTH_ISSUER` must be the Auth0 issuer used by the mobile client; custom-domain configurations must use the corresponding Auth0 Management API audience or adapt the audience configuration before enabling this flow. [Auth0's self-service linking guide](https://auth0.com/docs/manage-users/user-accounts/user-account-linking/user-initiated-account-linking-client-side-implementation).

**Existing data:** linking is blocked if the secondary account has pantry items, recipes, captures, receipt drafts, a recorded linked-account group, or nonempty/unreadable local kitchen data on this device. This release does not merge populated accounts or move local records from other devices. Data on a different device cannot be inspected; the confirmation explains this. Users should finish/save activity on other devices before linking. Concurrent writes from an already-open secondary session are not globally locked by the external Auth0 operation; no Cabinate records are deleted or reassigned by linking.

Successful provider names are recorded in `account_links` for Settings. This display is not an authoritative live view of changes made directly in the Auth0 dashboard. Unlinking, remote reconciliation, and populated-kitchen migrations are future work. Lost provider responses can leave the outcome uncertain: the challenge is not replayed, and the user is told to sign out and check both logins before retrying. Existing secondary access tokens may remain valid for their original subject until expiry; fresh logins use the Auth0 primary identity.

Verification covers nonce/client/subject/scope mismatches, stale proofs/challenges, secondary data, one-time consumption, provider rejection, browser cancellation, account changes, local-data checks, and final confirmation. Full live verification still requires authenticating both accounts on the phone; automated tests never link real identities.

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
