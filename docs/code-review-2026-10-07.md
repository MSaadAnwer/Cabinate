# Code review — October 7, 2026

Reviewed the Spring Boot API, shared authentication/HTTP utilities, Expo client, React
web client, and project setup. This pass keeps the existing architecture and focuses
on request correctness, repeated work, persistence, and clear product copy.

## Applied improvements

| Area | Finding | Change |
| --- | --- | --- |
| Web pantry writes | A secondary expiration refresh could report a successful save as failed. | Derive expiration notices from the current inventory; save success depends on the mutation response. |
| Web loading | Initial load and refresh logic were duplicated; older reads could overwrite confirmed writes. | Use one cancellable loader and re-read when a confirmed mutation changes its revision. |
| Web interactions | Rapid actions could send the same record version twice; dialogs repeated markup and lacked consistent keyboard behavior. | Guard pending actions, share dialog focus/dismissal handling, and label controls. |
| Shared sessions | An old provider cleanup could disconnect a newer provider; an in-flight token read could return after the account changed. | Tie cleanup and token reads to the configured provider identity. |
| Shared HTTP | Bodyless reads sent unnecessary JSON content headers; cancellation looked like a connection failure. | Set content headers only for string bodies, distinguish cancellation, and reject malformed array-shaped field errors. |
| Mobile rendering | Pantry matching normalized and scanned inventory for every ingredient; categories sorted vocabulary repeatedly. | Build a pantry-name index, sort vocabulary once, memoize category counts/matches, and mount quantity controls only while open. |
| Mobile timers | Completed and background timers continued requesting countdown renders. | Pause ticks in the background and stop when no active countdown remains. |
| Mobile persistence | Revoked sign-in/refresh results could save or release old credentials; browser photo saving called unsupported native file APIs. | Recheck the session around credential persistence and save browser photo data while keeping native file copies. |
| Backend generation | Retry batches rebuilt aliases and staple patterns; null provider entries could abort a useful batch. | Reuse request-level preparation and discard malformed candidates while collecting replacements. |
| Recall cache | One FDA fetch held the cache lock for the whole network request. | Allow one refresher and immediately serve cached stale data to concurrent readers. |
| Pantry quantities | The web decrement control could send zero, but the update API rejected it. | Permit zero on updates while keeping new items positive and rejecting negative quantities. |
| Maintenance | Setup docs included stale feature claims and machine-specific links; checks had no CI workflow. | Condense setup docs, update milestones, scope web lint, and add automated checks with isolated MongoDB tests. |

## Validation

- Backend Maven `verify`: 112 tests passed, including both real MongoDB tests; the API JAR was packaged.
- Shared utilities: 8 tests passed. Account migration safeguards: 3 tests passed.
- Mobile: 61 tests and TypeScript checks passed. iOS Hermes/web exports passed before the final refresh-session guard; that guard also has a targeted regression.
- Web: 6 date-boundary and request-race regressions, lint, and production build passed.
- Browser smoke checks with local API data covered labeled pantry/recipe fields, Tab
  trapping, Escape dismissal, focus restoration, and editing a recipe draft. No records
  were changed, and no browser console errors appeared.
- CI YAML parses locally. The first GitHub runner execution is separate verification.

Live Bedrock generation, real identity-provider sign-in, and physical iPhone behavior
remain separate checks. Reduced repeated work does not establish measured device frame
rates or production latency.

## Suggested next work, in priority order

1. **TestFlight beta.** Configure the EAS project and App Store Connect app, then test
   sign-in callbacks, permissions, photo persistence, offline recovery, notifications,
   VoiceOver, and large text on an iPhone. Existing EAS profiles are a starting point;
   membership alone does not complete signing or submission. Follow the official
   [EAS build](https://docs.expo.dev/build/setup/) and
   [iOS submission](https://docs.expo.dev/submit/ios/) steps.
2. **Sync local records.** Add account-owned grocery lists, cooking progress, and photo
   metadata to the API, with object storage for images. Use versioned writes and a
   persistent outbox so offline edits survive restarts and conflicts stay visible.
3. **Receipt import with review.** Extract line items into a draft showing item name,
   quantity, unit, and confidence. Confirm the draft before inventory writes, and make
   repeated submission of one receipt idempotent.
4. **Quantity-aware shopping.** Store recipe ingredients as structured quantities and
   units. Compare compatible measures, track remaining stock, and let the user review
   uncertain conversions rather than assuming an ingredient is fully covered by name.
5. **Bound collection reads and AI usage.** Migrate clients to the existing paginated
   APIs, bound generation stock selection in MongoDB, and add account-specific usage
   limits. Measure query plans before selecting new indexes.
6. **Reliable extraction jobs.** Move social-link and receipt extraction into a durable
   worker with status, retries, idempotency, and a manual correction path. Raw ingestion
   status changes alone do not perform extraction.
7. **Operational visibility.** Track API latency/errors, generation cost and validation
   failures, queue depth, and recall freshness. Add deployment health checks and alert
   on actionable failures before automating releases.
