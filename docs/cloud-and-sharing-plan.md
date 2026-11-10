# Cloud storage and sharing plan for the first 100 users

Planning date: November 3, 2026. Status: proposed architecture and implementation backlog; no infrastructure provisioned or sharing functionality implemented by this document.

## Scope and capacity assumptions

Preserve existing pantry, cookbook, grocery, receipt, timer, capture, and calendar workflows while removing the laptop from the production path. Plan for 100 registered accounts, approximately 10 concurrently active clients, and a test burst of 20. This is a planning assumption, not measured capacity or a promise of 100 simultaneous users. Household sharing and social features follow the private beta.

Retain one Spring Boot application, one MongoDB database, and the existing OIDC integration. Do not add microservices, Redis, a message broker, a warehouse, or a feed service for this milestone. Analytics scaffolding can remain in the repository without being part of the production request path.

## Hosting and cost boundaries

- Deploy the API as one managed container with HTTPS, a health check, automatic restart, and secrets supplied by the host. Use an authenticated profile; never deploy the permissive `dev` profile or Mongo Express.
- Use MongoDB Atlas in a nearby region, with TLS, a least-privilege database user, and network access limited to the hosting path. Verify the host's outbound addresses/private connectivity before selecting it.
- Evaluate a small paid Render service first. Its 512 MB entry plan is a candidate, not an approved memory size for this Java application. Measure idle memory, startup, ordinary load, and concurrent receipt extraction; move up if necessary.
- Atlas Free is a beta candidate only if storage/throughput fit and an independent backup job is operational. It has no built-in Atlas backups. Select a paid backup-capable tier if the manual backup process becomes unreliable or cumbersome.
- Keep receipt photos local. Add private object storage only when an actual cloud-media feature needs it. Backups may need a small private storage bucket earlier.
- Use a planning envelope of USD 15-40/month for early hosting and backup headroom, excluding AI usage, distribution fees, domains, taxes, and paid identity features. This is a budget target, not a quote or measured operating bill.
- Configure billing alerts and enforce application-side AI quotas. Alerts alone do not stop spending. Persist usage reservations per account/day so process restarts cannot reset limits; enforce request/concurrency limits too. Failed/retried operations must not create duplicate imports or unbounded provider calls.

Pricing and limits must be rechecked at deployment: [Render pricing](https://render.com/pricing), [Atlas Free limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [Auth0 pricing](https://auth0.com/pricing). No paid Auth0 Organizations feature is required for household membership: application records enforce that authorization.

## Identity and ownership model

Keep the existing server-derived account ID from verified issuer/subject. Add an application profile keyed by this account ID; email and display name are attributes, never ownership keys. Keep private account settings separate from any public profile response.

Introduce a kitchen workspace as the authorization boundary for shared operational data:

| Record | Proposed fields / responsibility |
| --- | --- |
| Profile | accountId, displayName, optional handle; public fields explicitly allowlisted |
| Workspace | id, kind PERSONAL or HOUSEHOLD, name, createdByAccountId, version, timestamps |
| Membership | workspaceId, accountId, role OWNER or MEMBER, timestamps; unique pair |
| Invitation | workspaceId, token hash, inviter, optional intended recipient, expiresAt, acceptedAt; expiring, single-use |
| Pantry item | workspaceId, createdByAccountId, version, existing inventory fields |
| Grocery list | workspaceId, createdByAccountId, version, name, timestamps |
| Grocery item | listId, workspaceId, version, name, category, checked; independently updated |

Create one personal workspace per existing account when implementing this boundary. Later, a user may belong to a personal workspace and multiple households; the client always shows which kitchen is active. Adding someone to a household must not automatically expose or move the inviter's personal records.

Server rules:

- A requested workspace ID selects context, not permission. Verify membership on every operation and scope all reads/writes to that workspace.
- OWNER manages invites/membership; MEMBER edits shared pantry/lists. Prevent removal of the last owner; ownership transfer is explicit.
- Recheck membership for mutations and invitation acceptance. Invite acceptance requires authenticated identity, expiry/single-use checks, and any intended-recipient restriction.
- Private receipts/captures, cooking progress, and meal-photo records remain account-owned by default. Sharing a pantry does not share original receipts or purchase details.
- Keep recipes private initially. Future explicit household recipe sharing and public publishing are separate permissions.
- Record creator separately from authorization scope. Do not reinterpret `ownerId` as household membership or simply remove existing account filters.

Migration when implemented: back up and pause writes; create personal workspaces/memberships idempotently; backfill pantry scope; validate counts and ownership; deploy scoped authorization and clients together; preserve creator identity and versions. Reuse the existing verified account IDs. Device-only list upload needs stable IDs and an idempotent migration marker; never silently claim another account's development data. Changing API URLs currently changes local storage namespaces, so provide an explicit local-data migration path when moving from LAN to production.

## Session continuity and synchronization

Cloud records are authoritative; local data becomes a cache plus a durable queue of unsent changes. Do not upload the entire current AsyncStorage snapshot as a shared document.

- Fetch on sign-in, foreground return, workspace changes, and pull-to-refresh. Use bounded pages (existing page endpoints where available); cancel/ignore old-account and old-workspace responses.
- Preserve version checks. A stale edit gets a conflict UI with the latest data and the user's draft; do not blindly overwrite or retry.
- Use stable mutation IDs for create/import retries. A lost response must be recoverable without duplicate records.
- Send grocery checks as desired state (`checked=true`), not a toggle, with item-level versioning. Independent rows should not conflict over a whole-list snapshot.
- Represent pantry consumption as an idempotent operation with server-side validation; concurrent use must not silently overwrite quantities or go negative.
- Queue changes with account, workspace, entity version, and mutation ID. Recheck authorization on replay. Membership revocation stops replay and hides/purges that workspace's local cache when detected; offline copies cannot be instantly recalled from a disconnected device.
- Initially refresh after successful local writes and use foreground/manual refresh for other devices. Live sockets and background polling are deferred. Show pending/offline/conflict state rather than promising instant sync.
- Retain deletion tombstones for a defined synchronization window. A device older than that window performs a full reconciliation without resurrecting deleted data.
- The current auth initialization requires the server before opening account data. Implement an explicit offline-cache unlock policy before claiming offline relaunch support; an expired/unverified session must not gain new server permissions.

## Receipt and media retention

Proposed default: retain Cabinate's private receipt photo copy for 30 days after confirmed import. Store `importedAt`, `photoExpiresAt`, and optional `photoDeletedAt` locally. Preserve structured receipt/import records, including duplicate-prevention identifiers, after image deletion. Do not TTL-delete the import ledger just to remove photos.

Cleanup runs on launch/foreground, retries failures, and never deletes an original photo-library asset. Unreviewed/failed receipts are not automatically deleted under the post-import policy; expose their size/count and a cleanup choice. Allow immediate photo deletion after import and explain that originals are local-only and unavailable after deletion/device loss. Never remove a file still needed for extraction or an unresolved confirmation.

Persist local photo metadata per account; account switching must not expose another account's files. Existing photos share an app directory, so cleanup must resolve tracked references and ownership rather than deleting files by directory age alone.

Meal photos stay local initially. Cross-device calendar photos and social image posts require private object storage later; until then do not imply that they are backed up. Future uploads need ownership checks, size/type limits, EXIF/location stripping, and short-lived authorized access. Never put base64 media in MongoDB or public buckets for convenience. Confirm provider data-handling settings for transient AI image processing before beta.

## Future social boundary

Public social content must be a deliberate publication, separate from private recipe/meal records. A future post should reference its author and a published snapshot, with explicit visibility/status. Editing a private draft must not accidentally publish it or expose purchase history, household membership, email, or location metadata.

Implement following, reactions, and comments as separate records with bounded queries and unique constraints where appropriate. Start with a chronological paginated feed assembled on read. Before enabling public interaction, implement block/report controls, moderation/removal, account deletion, and upload limits. At 100 users these operational responsibilities matter more than elaborate feed infrastructure.

## Capacity validation and release gates

Use synthetic accounts only. Seed 100 accounts with, per account, 200 pantry items, 100 recipes, 20 lists of 30 items, and 100 structured receipts. This is 20,000 pantry items, 10,000 recipes, 60,000 grocery items, and 10,000 receipts; measure actual BSON/index size and leave at least 30% capacity headroom. Media is excluded. Retention must bound growing raw payloads while preserving useful records and import idempotency.

Add compound indexes from actual query patterns: workspace + updatedAt + id, account + createdAt + id, membership's unique workspace/account pair, and grocery list/workspace lookups. Verify with explain plans; existing single-field owner indexes are not a substitute for measurement. Use one bounded Mongo connection pool per API instance, not one connection per user.

Proposed acceptance targets, not current results:

- 10 concurrent ordinary clients for 30 minutes, with a 20-client burst; p95 ordinary read/write latency under 1 second and fewer than 1% unexpected errors.
- AI/extraction measured separately; concurrent slow provider calls must not exhaust API memory or prevent inventory/list requests. Load-test with a provider stub first to avoid artificial AI bills.
- Cross-account and cross-household denial tests; invite reuse/expiry, role changes, last-owner protection, stale writes, simultaneous checks/consumption, and account/workspace switching.
- Reopen after app/server restart, replay an interrupted create, retry a receipt confirmation, reconnect after offline edits, and reconcile a revoked membership.
- Daily encrypted database backups outside the API filesystem, failure notification, and a successful restore to an isolated database. Initial recovery targets: at most 24 hours of lost cloud changes and restore within one working day; improve before broader release if unacceptable.
- Health/error/memory/storage/AI-cost monitoring; logs exclude tokens, receipt images, and raw private payloads. No production secrets or database credentials in mobile configuration or git.

## Implementation sequence

1. Deployment foundation: container, production configuration, health check, managed database, backups/restore drill, quotas, and load measurements. Existing private workflows must still pass; no household/social release yet.
2. Ownership foundation: personal workspaces, memberships, scoped services, migration and isolation tests. No invitation UI required in this step.
3. Durable lists and cache/sync: account/workspace-scoped APIs, idempotent local migration, item-level updates, conflict handling, foreground refresh, explicit offline behavior.
4. Receipt lifecycle: local post-import cleanup and receipt history/recovery independent of original photos. Preserve current receipt review/import behavior.
5. Household beta: invitation/role management, active-kitchen selection, revocation/cache handling, shared pantry/list acceptance checks.
6. Social beta: public profiles/publications, optional object storage, block/report/moderation, paginated feed. Preserve private defaults.

Steps 1-4 are the preparation backlog. Infrastructure accounts, subscriptions, credentials, and final service sizes are selected during deployment; this plan neither creates them nor demonstrates capacity.
