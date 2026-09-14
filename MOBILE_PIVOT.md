# Cabinate Mobile Pivot Plan

Cabinate is moving from a web-first product to an iOS-first mobile product. The pivot is realistic from a Windows development machine if the app is built with React Native and Expo, and if iOS builds are produced through EAS cloud infrastructure rather than local Xcode compilation.

## Recommended Path

- Build the new client in `mobile/` with React Native, Expo, and TypeScript.
- Keep the existing Spring Boot API and MongoDB backend as the operational source of truth.
- Keep the existing Vite React web app as a prototype, backend test client, and possible admin dashboard.
- Use Expo Go for early UI iteration where possible.
- Use Expo development builds when native capabilities are needed, such as camera access, share extensions, custom native modules, or production-like testing.
- Use EAS Build for iOS builds from Windows.
- Test iOS behavior on a physical iPhone instead of relying on the iOS Simulator, because the simulator requires macOS.

## Why This Is Practical

The project already uses React and TypeScript, so a React Native client can reuse mental models, type definitions, API contracts, form logic, validation concepts, and some service patterns from the current web app. The Spring Boot backend can remain stable while the frontend experience pivots.

The most important difference is workflow: Windows is suitable for day-to-day coding, API work, TypeScript refactoring, UI composition, and EAS cloud build orchestration. A Mac is still useful for local iOS Simulator testing, deep native debugging, and direct Xcode workflows, but it is not required for the first serious version if EAS and physical device testing are used.

## Mobile-First Features

1. Receipt scanning updates pantry inventory.
2. Instagram Reels, TikTok, and YouTube Shorts links become recipe ingestion sources.
3. Recipe selection generates a grocery list for missing pantry ingredients.
4. Expiring pantry items influence meal and grocery suggestions.
5. Pantry, recipe, and grocery list edits should be fast to confirm or correct on a phone.

## Early Technical Decisions

- **Camera and receipt capture:** Start with Expo camera/image picker capture and store receipt payloads through the backend as raw ingest records.
- **OCR strategy:** Treat receipt OCR as a backend or cloud processing concern so the mobile app stays thin.
- **Social recipe links:** Store submitted links and captions as raw ingest payloads first, then convert them into recipe candidates through a parsing pipeline.
- **Grocery list builder:** Implement backend comparison logic between normalized recipe ingredients and pantry inventory so every client receives consistent results.
- **Human review:** Receipt and social extraction should stage proposed changes before saving final pantry or recipe records.

## First Implementation Slice

1. Done: Create the `mobile/` Expo app.
2. Done: Add typed API client methods for existing pantry, recipe, ingest, and seed endpoints.
3. Done: Build the first mobile tabs: Inventory, Recipes, Grocery List, Capture.
4. Done: Make Capture support manual text/link submission before adding camera/OCR complexity.
5. Next: Add receipt scanning and social recipe import as staged workflows once the mobile shell is stable.
