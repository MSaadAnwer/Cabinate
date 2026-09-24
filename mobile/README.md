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

- Home: quiet farm silhouettes, notifications/calendar shortcuts, and four uneven tomato sections.
- Pantry: illustrated categories, All/search, manual item creation with expiration dates, receipt camera/library capture, and saved product links.
- List: multiple named lists, automatic aisle grouping with manual category correction, item checks, and recipe import with optional pantry matching and a review step.
- Cookbook: search, manual recipes, video-link capture inbox, ingredients, persistent cooking checklists, and pantry matches from existing recipes.
- Calendar: month navigation, daily meal photos/captions, and pantry expiration markers.
- Notifications: expired items, the next seven days of expirations, and U.S. FDA recall notices with conservative potential pantry matches and visible source freshness.
- Account: placeholder profile and capture inbox.

Pantry and recipe data use the Spring Boot API. Lists, meal photos, receipt photos, and cooking progress persist locally on the device. Photos are copied to the app's document directory, not left in the temporary picker cache. These local records do not sync between devices.

## Deliberately deferred

AI generation, automatic receipt/video extraction, USDA recall feed integration, push notifications, and account authentication remain deferred. Saved links go to the existing raw-ingestion endpoint; they do not silently create recipes or pantry items. The implemented FDA feed does not cover every recall, and a name match is not a confirmed product match.

Pantry-aware list import conservatively matches normalized ingredient names, excludes expired/zero-quantity inventory, and lets the user review the result. It does not convert units, compare amounts, split compound ingredient lines, or infer substitutions. Uncertain matches remain on the shopping list.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform ios --output-dir dist-ios
```

Browser preview (`npm.cmd run web`) is useful for layouts and manual flows; physical iPhone testing remains necessary for camera permissions, photo persistence, native transitions, and keyboard behavior.

The reliability checks cover ordered local writes and rollback, overlapping refreshes, saves/deletions during refresh, independent Pantry/Cookbook failures, malformed saved records, and API errors/timeouts. Network mutations are never retried automatically: a lost response can leave the server outcome uncertain. A failed photo save keeps the draft in memory for retry; unsaved drafts do not survive process termination.
