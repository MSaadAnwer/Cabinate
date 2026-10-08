# Backend review and configuration

The API uses Java 21 and Spring Boot 4.1.1, with feature packages for recipes, pantry,
ingestion, and recall notices. Controllers handle HTTP binding and validation;
services handle workflows; repositories handle MongoDB queries. Shared infrastructure
lives under `common`. Avoid adding a generic CRUD superclass: these workflows have
different validation, querying, and persistence needs.

## Changes from this review

The follow-up review added [OpenID Connect sign-in, per-account access, and versioned
writes](account-access.md). It also confined demo seeding/resetting to the development
account, added JSON security-filter errors, and consolidated client HTTP handling into
`shared`.

- Replaced repeated wildcard CORS annotations with one configurable policy.
- Routed framework errors through Spring's exception handler while preserving the
  existing `ErrorResponse` JSON contract and status-specific headers such as `Allow`.
  Invalid JSON no longer exposes parser internals. Database access failures return 503.
- Reused one HTTP client for Bedrock and FDA. Complete exchanges have deadlines;
  response limits are enforced during download, including chunked responses.
  Bedrock responses are limited to 1,000,000 bytes and FDA responses to 2,000,000 bytes.
  Redirects are disabled. The client cancels timed-out requests and shuts down with the app.
- Added shared pagination binding and response envelopes, and consolidated collection
  filtering so legacy and paginated endpoints use the same repository queries.
- Restricted ingestion statuses to PENDING, PROCESSED, and FAILED, ignoring case and
  surrounding whitespace. Normalization uses a fixed locale.
- Disabled automatic demo seeding and the destructive reset endpoint by default.
- Fixed the Windows Maven wrapper's null target lookup on ordinary directories.

## Configuration

`CABINATE_CORS_ALLOWED_ORIGINS` is a comma-separated list of exact browser origins.
Defaults are `http://localhost:5173,http://localhost:8082`. Set this for your deployed
web origin or the LAN origin used by Expo web. Native clients do not use browser CORS.
CORS is not authentication or authorization.

`CABINATE_SEED_ENABLED` controls startup demo seeding. `CABINATE_SEED_API_ENABLED`
controls registration of `/api/v1/seed` within the `dev` profile, including its destructive `force=true` option.
Both default to false. The `dev` profile defaults both to true and still respects
explicit environment overrides. Do not enable that profile on a public server.

For local demo data from `api`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

## Paginated collection APIs

Legacy array endpoints continue to work. New clients can request:

| Endpoint | Filters | Order |
| --- | --- | --- |
| `/api/v1/recipes/page` | `search` | newest creation first, then ID |
| `/api/v1/pantry/page` | `category`, `search` | name, then ID |
| `/api/v1/ingest/page` | `status`, `source` | newest creation first, then ID |

All accept zero-based `page` (default 0) and `size` (default 25, range 1–100).
Invalid bounds or formats return 400 before querying MongoDB. Sorting is server-owned;
the ID tie breaker gives deterministic order when primary values match.
Example: `/api/v1/pantry/page?category=Produce&page=0&size=25`.

```json
{"items": [], "page": 0, "size": 25, "totalItems": 0, "totalPages": 0}
```

These are offset pages, not snapshots: concurrent inserts/deletes can shift page
boundaries. Legacy endpoints remain unbounded until clients migrate. Case-insensitive
substring searches may require collection scans; use explain plans with representative
data before deciding on a dedicated search index.

## Remaining architecture work

Authentication, account isolation, and optimistic locking are now implemented. Configure
your OIDC provider and explicitly migrate existing records as described in
[account access](account-access.md). Receipt
parsing, social extraction, server-owned grocery lists, and a durable ingestion worker
are still future workflows. Ingestion status validation does not implement that worker.

Bedrock generation has an instance-local concurrency cap. A per-account or distributed
rate limit is still open. Recall caching is also instance-local. Inventory expiration
uses the server's current date; account timezone handling remains open.

The October 7, 2026 review lets concurrent recall readers use the cached feed while one
request refreshes FDA data. It also reuses pantry token patterns per generation request
and rejects malformed individual ideas without discarding otherwise usable results.
See [the full code review](code-review-2026-10-07.md) for client fixes and follow-up work.

## Validation

Run `mvn test` (or `.\mvnw.cmd test`) in `api`. Regression tests cover API status codes,
safe error messages, CORS preflight, seed endpoint registration, ingestion status
validation, pagination limits/filtering/ordering, chunked response limits, request-body
deadlines, and redirect handling. HTTP tests use a local server, not FDA or Bedrock.
Live MongoDB query plans and real provider credentials are not exercised by those tests.
