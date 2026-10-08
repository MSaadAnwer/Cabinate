# Cabinate Mobile

An iOS-first kitchen companion built with Expo SDK 57, React Native, TypeScript, and Expo Router.

## Run on an iPhone from Windows

Start MongoDB with `docker compose up -d` from the repository root, then run `.\mvnw.cmd spring-boot:run` from `api/`.

From `mobile/`:

```powershell
npm.cmd ci
npx.cmd expo login --browser
$env:EXPO_PUBLIC_API_URL="http://YOUR_WINDOWS_LAN_IP:8080/api/v1"
npm.cmd start -- --port 8082 --host lan
```

Sign in to the same Expo account on the PC and in Expo Go. Connect the phone to the PC's network and scan the QR code. Camera testing requires the physical phone. Restart Metro after dependency or entry-point changes.

## Current experience

- Home: farm silhouettes, notifications/calendar shortcuts, and four illustrated navigation cards.
- Pantry: illustrated categories, All/search, manual item creation with expiration dates, receipt scanning, and saved product links. Scan a receipt photo to review editable food names, quantities, and units before adding selected items. Uncertain amounts stay blank; non-food purchases stay unchecked in a skipped-items section. Confirm an uncertain classification with "This is food" before selecting it. Receipt photos and reviews stay in the local archive, and pending imports resume with the same confirmed items after a failed response.
- List: multiple named lists, phrase-aware aisle grouping with plural/quantity normalization, remembered category corrections, item checks, and recipe import with optional pantry matching and a review step. Corrections are saved on this device and apply to future additions and imports; existing saved aisles remain unchanged until edited.
- Cookbook: search, manual recipes, pantry-based AI recipe ideas, video-link capture inbox, ingredients, persistent cooking checklists, and pantry matches from existing recipes. Timed steps offer countdowns for seconds, minutes and hours, including written numbers and compound durations. Ranges use the smaller duration. Multiple timers can run together, persist across navigation/restarts, and remain visible in the timer tray. Native local notifications alert at completion when permitted; otherwise keep the app open for the in-app alert. Countdown updates pause in the background and stop after timers finish.
- Calendar: month navigation, daily meal photos/captions, and pantry expiration markers. Take or choose a photo, add an optional note, then tap the fixed-footer **Save photo and note** button. Photos remain drafts until saved; failed saves keep the photo and note available for retry.
- Notifications: expired items, the next seven days of expirations, and U.S. FDA recall notices with conservative potential pantry matches and visible source freshness.
- Account: signed-in account details, sign-out, and capture inbox.

Pantry and recipe data use the Spring Boot API. Lists, meal photos, receipt photos, and cooking progress persist locally for each account. Native photos are copied to the app's document directory; browser previews save image data instead of temporary blob URLs. Browser storage quotas can limit large photo collections. These local records do not sync between devices.

Production authentication uses OpenID Connect with PKCE. Configure `EXPO_PUBLIC_AUTH_ISSUER`, `EXPO_PUBLIC_AUTH_CLIENT_ID`, and the matching API authentication settings; `EXPO_PUBLIC_AUTH_AUDIENCE` and `EXPO_PUBLIC_AUTH_SCOPES` are optional. Native credentials use SecureStore, while browser credentials stay in memory. Development authentication is controlled by the API.

## Deliberately deferred

Automatic video extraction, USDA recall feed integration, and remote push notifications remain deferred. Saved links go to the existing raw-ingestion endpoint; they do not silently create recipes or pantry items. The implemented FDA feed does not cover every recall, and a name match is not a confirmed product match. AI recipe generation and receipt reading require the API's generation provider to be configured. Receipt extraction uploads a resized JPEG copy; the original stays in your local photo archive, and nothing enters the pantry until you confirm the review.

Pantry-aware list import conservatively matches normalized ingredient names, excludes expired/zero-quantity inventory, and lets the user review the result. It does not convert units, compare amounts, split compound ingredient lines, or infer substitutions. Uncertain matches remain on the shopping list.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform ios --output-dir dist-ios
```

Browser preview (`npm.cmd run web`) is useful for layouts and manual flows; physical iPhone testing remains necessary for camera permissions, photo persistence, native transitions, and keyboard behavior.

All form and search inputs share `AppTextInput`. On iOS, UIKit owns typing and cursor selection; React tracks edits for validation and saving without echoing text back into the keyboard. External changes still update the field, including search/composer clears, quantity-unit presets, and generated recipe details. Regression tests cover delayed typing echoes, middle edits, multiline text, presets, and repeated clears. On an iPhone with predictive text and autocorrect enabled, also check rapid typing, middle insertion/deletion, and multiline entry in calendar notes, list names/items, pantry fields, recipe fields, receipt review, links, and search; verify clears and presets still work.

The reliability checks cover ordered local writes and rollback, overlapping refreshes, saves/deletions during refresh, independent Pantry/Cookbook failures, malformed saved records, and API errors/timeouts. Network mutations are never retried automatically: a lost response can leave the server outcome uncertain. A failed photo save keeps the draft in memory for retry; unsaved drafts do not survive process termination.
