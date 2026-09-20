# Recall notices

Notifications now loads `GET /api/v1/recalls` separately from pantry expiration reminders.

## Source and coverage

The backend reads the public [FDA Food Safety Recalls RSS feed](https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml). Despite its name, the live feed includes some non-food products; the UI explains this and displays the source notices without guessing product categories. It is a recent, limited feed, not a complete recall archive or a statement that an item is safe.

The USDA API and RSS endpoint returned HTTP 403 during integration. The app links to [USDA recalls](https://www.fsis.usda.gov/recalls) and explicitly states that automated USDA coverage is not available yet.

No API key, pantry upload, AI provider, or push permission is needed. Notifications shows potential matches by comparing every normalized pantry-name word with notice titles and summaries, ignoring case, punctuation, accents, and simple plurals. Items with zero quantity are excluded; expired items still in the pantry are included. Each notice lists its potentially affected pantry items. This heuristic can miss matches and produce false positives; it does not confirm brands or lots or establish that an item is safe. Open the official notice for complete affected-product details and instructions; RSS summaries may be truncated by FDA.

The Show all button below the matches opens `/recalls`, with all notices in the current FDA feed, a Refresh recalls button, and the USDA link. The feed is not an exhaustive list of active recalls.

Do not substitute openFDA enforcement data: its documentation prohibits using that API for public alerts.

## Refresh and failure behavior

- Opening Notifications or All current recalls requests the feed. The latter also has a Refresh recalls button.
- The server refreshes on demand at most once per 15 minutes, including failed attempts.
- Last successful fetch time is shown. It measures retrieval time, not the agency's publication or review time.
- A failed, malformed, unexpectedly empty, or unsafe feed retains the last successful in-memory result and returns `stale: true`.
- On first-fetch failure the screen reports unknown recall status. Server restart clears the cache.
- FDA notice links are restricted to the official recall path and upgraded to HTTPS. XML external entities and DTDs are disabled.
- There is no background phone delivery or push notification scheduling yet.

## Validation

`mvn test` in `api`; `npm test` and `npm run typecheck` in `mobile`.
Recall tests cover source parsing, dates, official links, rejected feeds, cache reuse, first-fetch failure, and retention after failure.
