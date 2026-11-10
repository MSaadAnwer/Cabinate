# Sign-in, Settings, and account linking

Implemented November 9, 2026. Phone testing planned for November 10.

## Updates

- Replaced the generic sign-in controls with branded Google, Apple, and email sign-up buttons, plus a returning-user email sign-in link.
- Routed each button to its Auth0 connection; email sign-up requests the hosted signup screen. Kept PKCE and existing session persistence.
- Added Account → Settings while preserving the Account summary and saved links/captures.
- Moved sign-out into Settings with confirmation.
- Added connected-login display and user-initiated Google/Apple/email linking using Auth0's self-scoped Management API permission.
- Added fresh authentication for both accounts, separate nonce-bound proofs, a short-lived server challenge, final confirmation, and one-time challenge consumption.
- Kept the current kitchen as primary. Blocked linking when secondary cloud records or this device's secondary local records exist. Populated kitchens and other-device data are not merged.
- Documented Auth0 setup, limitations, uncertain outcomes, and proof-token handling in account-access.md.

## Validation

- All 92 mobile tests passed; TypeScript passed.
- Backend suite: 138 passed, 8 opt-in MongoDB integration tests skipped because no test database was configured. Linking security tests also passed after the final validation change.
- iOS bundle export passed.
- Real account linking has not been performed by the agent. Auth0 plan support and self-service linking permission still require verification in the user's tenant.

## November 10 phone test

1. Reload Cabinate and confirm the Google/Apple/email buttons appear.
2. Sign into Google first to keep the existing Google-owned pantry and lists.
3. Open Account, confirm the summary and saved links remain, then open Settings.
4. Choose Link Apple account. Verify Google, verify Apple, and confirm the displayed Apple account.
5. Confirm both providers appear connected. Sign out, sign into Apple, and verify the same pantry/cookbook and this device's primary local lists appear.
6. Check browser cancellation and sign-out confirmation. If Auth0 rejects linking, inspect the error/tenant permissions before retrying; do not assume matching email addresses merge accounts.

Temporary mobile/app/polish-check.tsx is excluded from this release.
