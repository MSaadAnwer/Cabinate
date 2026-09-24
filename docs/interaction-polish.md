# Cabinate interaction polish

## Implementation progress

Updated September 24, 2026. The second implementation pass extends the original tab and shopping work across the existing mobile workflows. The reliability review below covers the subsequent fixes. This is implementation progress, not a completed device acceptance gate.

| Area | Implemented | Verification / remaining work |
| --- | --- | --- |
| Navigation | A native stack inside each primary tab; list, inventory, and recipe details stay with their section. Existing detail URLs redirect to their new routes. Primary tab switches have no directional animation. | Browser: a recipe remained open through ten Pantry/Cookbook round trips; Back restored the Cookbook query. Native gestures and long-list scroll retention still need iPhone acceptance. |
| Shared feedback | Central color, spacing, radius, and motion tokens; interruptible press feedback for buttons, cards, chips, and icon controls; animated checks; system-aware reduced motion; selection/success haptics; concise save feedback. Pending buttons keep their label and reserved icon space, and saving handlers guard duplicate submissions. | TypeScript and the iOS Hermes bundle pass. Native timing, haptics-disabled behavior, and frame pacing remain unmeasured. |
| Shopping | Groceries stay above a reachable bottom composer. Aisle choices appear in an accessible sheet. Checking keeps row order stable. The persistence queue has immediate publication, ordered writes, and recovery to the last saved snapshot after the latest write fails. | Four new persistence tests cover twenty rapid checks, earlier failed writes followed by success, rollback/retry, and all queued writes failing. Browser: twenty toggles of an existing row survived reload with the expected state. |
| Add menus | Manual entry first, a blocking outside-tap surface, focus entry/return, Escape/back dismissal, and reduced-motion treatment. Selecting an action waits only for native modal dismissal, not the decorative closing animation. | Browser: outside taps did not open the content underneath; Escape dismissed the menu. Native VoiceOver and Android Back need device checks. |
| Forms | Pantry date picker; collapsed secondary choices; field errors; input focus and iOS Next/Done accessory controls; measured header keyboard offset; persistent save footers; save guards and draft protection for the add/import/capture forms, shopping composer, and calendar note. | Browser at 320 × 640: pantry fields and save remain usable, validation focuses the name, and Close offers Keep editing / Discard. List creation/deletion and draft retention were exercised. Native date/keyboard handling and failed server-save flows need device acceptance. Draft protection covers navigation dismissal, not recovery after process termination. |
| Collections and loading | Shared search with clear controls; recipe artwork tied to recipe ID; initial loading placeholders; retry and retained-content refresh errors extended to recipe details, notifications, calendar, Account, and captures. Network errors use plain language. | Loading placeholders are intentionally static and delayed for fast responses. More precise placeholder geometry for the Pantry grid remains a visual refinement. |
| Removal | Destructive styling, pending guards, confirmed-success feedback, and reduced-motion-aware collapse for server-confirmed pantry deletion. | Native collapse needs visual tuning. Calendar photo removal still uses the native confirmation alert and does not yet share the pantry collapse treatment. |
| Contrast | Darkened muted labels and functional green. Measured contrast: muted/cream 5.09:1, muted/white 5.50:1, green/cream 5.25:1, cream/ink 8.82:1, cream/red 5.58:1, ink/selected 7.90:1. | These measurements cover the shared palette. A complete screen-by-screen large-text and contrast audit is still pending. |

Validation for this pass: 12 mobile tests pass, TypeScript passes, and the production iOS Hermes bundle exports. Browser checks are layout and behavior evidence only. Physical iPhone release profiling with representative collections, VoiceOver, large text, Reduce Motion, native date/keyboard interactions, and disabled haptics remains required before feature work resumes. No virtualization or performance improvement is claimed without that profiling.

### Reliability review — September 24, 2026

- Pantry and Cookbook now track loading and failure independently. Only the latest refresh may publish; confirmed creates, updates, and deletions survive reads that began before them. Saved captures and recall requests also ignore older completions.
- Local hydration checks nested lists, items, photos, receipts, and cooking steps before publishing. Malformed records leave the original saved snapshot untouched and prevent writes rather than crashing a screen or silently resetting data.
- API requests have a 15-second deadline covering headers and body. Malformed error bodies retain the actual HTTP status, including already-deleted pantry items. Mutations are never retried automatically; an uncertain response directs the user to check saved content first.
- Failed meal-photo saves retain the photo, date, and note for retry with the same ID. Date changes cannot detach an unsaved photo from its day. Replacing an unsaved receipt requires an explicit choice, and the iOS picker waits for the confirmation sheet to dismiss.
- Pantry-aware recipe import requires a successfully loaded pantry when matching is enabled. Matching can still be switched off during a pantry outage so a full ingredient list remains available.

Validation: 26 mobile tests and 66 backend tests pass; mobile TypeScript and the production iOS Hermes export pass. Browser smoke checks cover loaded Pantry/Cookbook data, ten tab round trips with a retained recipe and search query, pantry-aware import, and draft protection. Photo permissions, save failures on a real device, native sheet/picker transitions, and the physical-device acceptance gate remain unverified. Calendar removal animation and the visual refinements listed above remain outstanding; this review does not mark the entire specification complete.

Review date: September 20, 2026. App baseline: `068bb47` (pushed to origin/main).

## Direction

Keep Cabinate's cream background, forest green controls, serif titles, tomato identity, and food illustrations. Make the experience calm, immediate, and predictable. The next milestone is polishing existing workflows before expanding features.

Use the user's Beli, Letterboxd, and Robinhood references as a quality bar for effortless repeated actions, readable collections, and precise feedback. This is a proposed interpretation of that brief, not a claim that their current native interactions were benchmarked here. Cabinate should retain its own visual identity.

## Review evidence and limits

Reviewed the Expo mobile app in a 390 × 844 browser viewport: Home, Pantry, add menu, Add item, Cookbook, Lists, and an existing populated grocery list. Reviewed source for navigation, shared controls, state persistence, recipes, forms, calendar, notifications, and recalls.

The API was unavailable in the browser session. Loaded pantry/recipe content and successful server mutations were not exercised. Native gestures, keyboard handling, haptics, and frame pacing still require a physical iPhone. Backend tests passed (66), mobile tests passed (8), and mobile TypeScript checking passed. These checks do not establish native interaction quality.

## Findings and decisions

| Priority | Current evidence | Required polish |
| --- | --- | --- |
| P0 | Entered `pasta` in Cookbook, switched to Pantry, returned: search cleared. `BottomNav` uses `router.replace`; primary screens are separate stack routes. | Use persistent primary tabs with a stack per section. Retain search, filters, scroll position, and detail context. Keep sibling switching immediate and reserve directional transitions for deeper navigation. |
| P0 | The populated grocery list places entry fields, seven aisle chips, and an Add button above the groceries. First item begins well down the screen. Every item also has a separate Change aisle row. | Make shopping the default: title, progress, groceries. Use a compact add composer; show aisle correction on demand through an accessible item menu. Keep the same capabilities with less visual competition. |
| P0 | Pantry displays zero counts and a raw localhost error on connection failure. Cookbook shows a first-use empty message alongside the connection error. | Distinguish loading, empty, search-no-results, refresh failure, and initial failure. Use plain-language retry UI. Preserve existing content on refresh failures. Never imply zero inventory when inventory has not loaded. |
| P1 | Most buttons only change opacity; list/recipe cards and checkbox rows lack shared pressed feedback. Only the floating menu has explicit animation. | Create shared interactive components with consistent press, release, pending, success, error, disabled, and reduced-motion states. |
| P1 | `update()` waits for AsyncStorage before publishing state; every toggle serializes the full local dataset. | Make checks respond immediately while preserving ordered persistence. Design rollback/error recovery for failed writes and rapid successive toggles; do not simply move `setData` before the write without handling concurrency. |
| P1 | Floating add menu has no backdrop or outside-tap dismissal. Add choices vary in ordering; Pantry puts manual entry last. | Use a consistent anchored menu with a dismiss surface, focus management, escape/back handling, and a clear primary action. Put common completed workflows first. |
| P1 | Functional icons share a stroke renderer, but selected tabs rely mainly on opacity/label weight. Recipe illustrations and colors depend on array index. | Define semantic icons, consistent optical sizing, and a distinct selected treatment. Anchor recipe art to stable identity or relevant metadata so filtering does not change a recipe's visual identity. |
| P1 | Add item uses a typed ISO date. Optional choices take substantial vertical space; the save control is below the initial viewport. Forms have a fixed keyboard offset. | Use a native date interaction with a clear optional state, progressive disclosure for secondary choices, field-specific errors, predictable keyboard Next/Done, and a reachable save action. Protect unsaved drafts on dismissal. |
| P2 | Section header, eyebrow, and large heading repeatedly identify the same page. Home is a full welcome screen; Account has equal navigation weight despite being a placeholder. | Tighten repeated headings and reserve expansive illustration for welcome/empty moments. For the first polish pass keep section names stable; defer removal of Home or Account until the navigation prototype is reviewed. |
| P2 | Lists are rendered with maps inside a shared ScrollView. Every consumer shares a broad kitchen context. | Profile realistic collections, then virtualize long inventory/recipe/shopping lists and isolate hot row updates where measurements justify it. Avoid claiming performance wins without device measurements. |

## Interaction specification

These are starting design targets to tune on device, not measured timings of reference apps or mandatory platform constants.

| Interaction | Proposed behavior |
| --- | --- |
| Button/card press | Immediate tint plus restrained compression: about 0.98 for cards, 0.96–0.98 for compact buttons. Press settles in roughly 80–100 ms; release uses a short damped spring around 160–220 ms. Entire row is a target. No text reflow. |
| Checkbox | Fill/check transition around 120–160 ms; text settles around 150–180 ms. One optional light selection haptic. Keep the row in place while checking so subsequent targets never move under the finger. |
| Primary tab | Immediate content switch with retained state. No horizontal push animation between peers. Active icon has a clear shape/fill or background treatment, not just reduced opacity for inactive text. |
| Detail navigation | Native stack push/back gesture. Back returns to the same scroll position and filter. Avoid custom delays layered over native navigation. |
| Form | Native modal presentation with explicit dismissal and unsaved-edit protection. Focus starts at the meaningful field; keyboard cannot cover the primary action or validation error. |
| Add menu | Short 180–220 ms expansion/fade, anchored to its trigger. Plus rotates toward close. Outside tap dismisses without activating the content behind it. Rapid toggles reverse cleanly. |
| Save | Immediate pending state, stable button dimensions, duplicate submission guard. On confirmed success return to the relevant content with concise feedback and optional success haptic. Failure keeps entered data. |
| Removal | Consistent destructive treatment and confirmation initially. Smooth collapse only after confirmed success. Add Undo only when restoration is actually supported; the current pantry DELETE path is not a restore mechanism. |
| Loading | Stable placeholders matching content geometry during initial load. Refresh retains rows. Avoid flashing loaders for fast responses and repeating decorative entry animations. |
| Reduced motion | Remove spatial movement, scaling, rotation, and springs; use immediate state changes or a brief fade. No information may depend on animation or haptics. |

All motion must be interruptible. Never queue a sequence of bounces after repeated taps or delay the underlying action to finish an animation. Haptics should signal meaningful selection or completion, not every navigation tap.

## Visual system

- Functional icons: one family and semantic mapping, approximately 22–24 pt in standard controls, with at least 44 × 44 pt touch targets. Prefer platform symbols on iOS where supported by the installed Expo stack, with a coherent fallback. Keep decorative food drawings separate from functional iconography.
- Typography: serif for screen titles and selected editorial moments; readable system text for fields, quantities, statuses, and dense shopping rows. Limit tiny uppercase copy during active tasks.
- Color: forest green for primary actions; tomato/red for meaningful caution or destructive intent. Make selected, disabled, and error states distinguishable beyond color alone. Measure contrast, especially muted labels on cream and inactive navigation text.
- Spacing: centralize a small spacing/radius scale. Use lighter row separators for repetitive content and cards for grouped objects. Ensure large text can wrap without hiding actions.
- Search: clear affordance, appropriate keyboard behavior, retained query, and explicit “No results for …” feedback. Clearing search restores the previous collection.
- Notifications: keep urgency, source, potential-match wording, stale state, and retrieval time understandable. Do not use celebratory motion or all-clear styling for uncertain recall coverage.

## Implementation sequence

1. **Navigation and states:** persistent tabs and section stacks; preserve context; separate data loading/error/empty states. Define shared feedback and motion tokens while restructuring the shell.
2. **Shopping as the reference flow:** compact composer, visible groceries, immediate checks with safe persistence, accessible aisle menu, consistent card/button feedback. Tune this end to end before spreading the pattern.
3. **Shared polish across existing screens:** adopt controls, icon semantics, menus, form/keyboard behavior, stable recipe art, and success/error feedback in Pantry, Cookbook, calendar, and capture flows.
4. **Device acceptance:** adjust motion and layout on an actual iPhone, then resolve measured performance and accessibility issues. Feature development resumes after the following gate passes.

## Acceptance gate before new features

- Cookbook query and scroll position survive ten switches between primary tabs; details return to their original context.
- Twenty rapid shopping checks persist correctly after relaunch; no missed toggles or delayed animation queue. A failed write produces understandable recovery without erasing later successful edits.
- A shopper sees groceries immediately and can add/check an item with one hand. Editing category is available without permanent clutter on every row.
- Every control has consistent pressed/disabled/pending feedback and accessible labels/states. VoiceOver can open and dismiss menus in a sensible focus order.
- Initial offline loading never masquerades as empty data. Failed refresh preserves existing rows and offers Retry. Search-empty and first-use-empty are visibly different.
- At compact phone widths and large text settings, navigation labels, date controls, save actions, and keyboard-focused fields remain usable. Muted text meets measured contrast requirements.
- Forms retain inputs after a failed save and protect drafts during accidental close/back gestures.
- Reduced Motion and haptics-disabled settings leave every workflow fully usable.
- Profile release builds on a named physical iPhone with representative large collections (for example 200 pantry items and 100 recipes). Record frame behavior and touch latency; target visible feedback within 100 ms and smooth 60 Hz interaction on that device, rather than inferring performance from browser or debug builds.

Design references: [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion), [Apple SF Symbols guidance](https://developer.apple.com/design/human-interface-guidelines/sf-symbols). Verify the repository-required [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before implementation.
