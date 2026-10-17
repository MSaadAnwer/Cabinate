# App review — October 17, 2026

This pass focused on the primary Expo client: navigation, add menus, list drafts, expiration notices, calendar layout, cooking timers, and persistence failures. It also checked the web client's expiration logic. It is a scoped review, not a guarantee that the app has no defects.

## Fixed

- **Hidden grocery draft warning:** closing the item composer retained its text and selected aisle, causing Back to display a discard warning with no visible draft. The control now explicitly cancels the new item and clears its text, aisle, and error. Reopening starts clean. Added a regression test covering cancellation, navigation guard state, and reopening.
- **Reminders for depleted stock:** zero-quantity items appeared in notifications, calendar expiration dots, daily expiration cards, and the web expiration banner. Reminder filters now require positive stock. The inventory itself still retains depleted items for replenishment. Added calendar and web regression coverage.
- **Cooking progress failures:** the recipe screen used React Native's alert API, which does not display in the browser preview. Save/reset failures now have inline accessible error messages, and progress controls wait for local data to load. Grocery checkbox failures also have a local error message instead of an empty catch.

## Validation

- Mobile TypeScript check and 83 tests passed.
- iOS production export, including Hermes bytecode, passed.
- Web: 7 tests, lint, and production build passed.
- Shared HTTP/account checks: 8 tests passed; migration checks: 3 passed.
- Backend Maven verification passed: 138 tests reported, 8 skipped, no failures or errors. Database integration tests require a running MongoDB service.
- Manually clicked through home, pantry, cookbook, recipe ingredients/steps, add menu, list creation, item composer, Back/draft dismissal, list deletion, calendar, and notifications. Verified a 10-second timer starts, opens its recipe steps, finishes, and dismisses. Confirmed the cancellation fix removes the unexpected Back popup, and zero-stock milk disappears from reminders while stocked tomatoes retain their marker. Calendar layout was inspected at 390 × 844 and desktop width.

Docker's database service was unavailable. Browser testing therefore used a separate disposable localhost API fixture with two pantry items and one recipe; it did not validate real server writes, authentication, AI generation, or receipt extraction. The test-created list and timer were removed afterward. Existing local lists and the pre-existing untracked `mobile/app/polish-check.tsx` were preserved and excluded from the commit.

## Remaining device checks

A physical iPhone is still needed to verify camera/photo permissions, UIKit typing and keyboard layout, native modal transitions, and timer notifications with the app backgrounded. Live authentication, database-backed end-to-end flows, and configured AI/receipt providers also need a connected environment.
