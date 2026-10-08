# Cabinate

An iOS-first kitchen app for pantry inventory, recipes, grocery lists, and meal photos. The Spring Boot API stores account-owned pantry items, recipes, and capture payloads. The Expo app is the primary client; the React web app provides the same core API workflows.

## What works

- Pantry categories, quantities, expiration reminders, and search.
- Manual recipes, pantry-based recipe ideas through Amazon Bedrock, and cooking timers.
- Named grocery lists, ingredient matching, reviewed food-only receipt imports, social-link captures, and a meal-photo calendar.
- OpenID Connect sign-in, account isolation, and version checks on writes.
- A cached FDA recall feed.

Grocery lists, photos, and cooking progress are stored on the device under the verified account. Receipt review and import records belong to the account on the API; receipt photos stay local. Cross-device sync and social recipe extraction are still pending. Snowflake contains warehouse scaffolding; the Databricks pipeline and autonomous agent are planned.

See [architecture](ARCHITECTURE.md), [roadmap](ROADMAP.md), [mobile setup](mobile/README.md), and the [latest code review](docs/code-review-2026-10-07.md).

## Local setup

Requirements: Java 21, Node.js 22.20 or later, Docker Compose, and an iPhone for native testing from Windows.

Start the development database and Mongo Express from the repository root:

```powershell
docker compose up -d
```

MongoDB listens on port 27017 with the development credentials in `docker-compose.yml`. Mongo Express is at `http://localhost:8081`.

Start the API in a separate terminal:

```powershell
cd api
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

The API runs at `http://localhost:8080/api/v1`. The `dev` profile uses the local demo account and enables demo seeding. For authenticated use, configure the issuer and public clients using the [account access guide](docs/account-access.md). The default profile requires authentication and leaves seeding disabled.

Start the mobile app:

```powershell
cd mobile
npm ci
$env:EXPO_PUBLIC_API_URL="http://YOUR_WINDOWS_LAN_IP:8080/api/v1"
npm run start -- --port 8082 --host lan
```

Expo runs on port 8082. Native sign-in uses `cabinate://auth` and requires an installed development build. See [mobile setup](mobile/README.md) for physical iPhone and EAS build instructions.

Start the web client in another terminal:

```powershell
cd web
npm ci
npm run dev
```

The web app runs at `http://localhost:5173`, proxying `/api` to the local backend.

## Checks

Run from the repository root:

```powershell
node --experimental-strip-types --test shared/tests/*.test.cjs
node --test api/scripts/migrate-account.test.cjs
```

In `api`, run `.\mvnw.cmd verify`. In `web`, run `npm test`, `npm run lint`, and `npm run build`. In `mobile`, run `npm test` and `npm run typecheck`.

Set `CABINATE_TEST_MONGODB_URI` to enable the real database tests. They create and remove only randomly named test databases. [CI](.github/workflows/ci.yml) runs these checks on pushes and pull requests with an isolated MongoDB service.

## API

All endpoints use `/api/v1`:

| Resource | Available workflows |
| --- | --- |
| `/pantry` | List, create, read, update, delete; `/expiring` and `/page` |
| `/recipes` | List, create, read, update, delete; `/generate` and `/page` |
| `/ingest` | List, create, read; `/{id}/status` and `/page` |
| `/receipts` | Photo/text extraction to review; read draft and confirm selected food purchases |
| `/recalls` | Public cached FDA notices with freshness metadata |
| `/auth/config`, `/auth/me` | Authentication readiness and verified identity |
| `/seed` | Development-only demo seeding |

Updates require the version last read; pantry and recipe deletes require `If-Match`. Errors use one JSON contract with status, message, and optional field validation messages. See [backend configuration](docs/backend-review.md), [account access](docs/account-access.md), [recipe generation](docs/recipe-generation.md), [receipt extraction](docs/receipt-extraction.md), and [recalls](docs/recalls.md) for details.
