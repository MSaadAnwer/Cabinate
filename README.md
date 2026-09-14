# Cabinate: Intelligent Pantry & Nutrition Architect

Cabinate is an iOS-first, full-stack, data-driven platform that integrates transactional kitchen and pantry management with an analytical data lakehouse and agentic AI for intelligent, macro-aware meal planning.

---

## Platform Direction

Cabinate is pivoting from a web-first product to an **iOS-first mobile app**. The existing Vite React web app remains useful as a prototype, API test surface, and possible future admin dashboard, but the primary user experience should move to a mobile app built around in-kitchen workflows: scanning receipts, checking inventory, saving recipes from social content, and building grocery lists while shopping.

Recommended mobile stack:

- **Mobile app:** React Native + Expo + TypeScript
- **iOS builds from Windows:** Expo Application Services (EAS) cloud builds
- **Local development:** Windows + Codex or Antigravity for coding, with an iPhone for device testing
- **Backend:** Existing Spring Boot API and MongoDB remain the system of record
- **Future analytics/AI:** Snowflake, Databricks, and Bedrock remain backend platform layers, not device-local responsibilities

Important platform constraint: robust iOS app development on Windows is realistic with Expo/EAS, but native iOS compilation, simulator usage, signing, and App Store distribution still depend on Apple tooling or cloud build infrastructure. A physical iPhone is the practical testing path from Windows.

---

## Product Workflows

Cabinate is designed around a practical kitchen loop:

- **Inventory from receipts:** Users can scan grocery receipts so Cabinate can extract purchased items, quantities, purchase dates, and store metadata, then propose updates to pantry inventory.
- **Recipes from short-form food content:** Users can submit Instagram Reel, TikTok, or YouTube Shorts links and save recipes from their captions or linked metadata.
- **Pantry-aware grocery lists:** Users can select a saved recipe, compare its ingredients against current pantry inventory, and generate a grocery list containing only the ingredients they do not already have.
- **Expiration-aware meal planning:** Cabinate can prioritize recipes that use items already in the pantry, especially ingredients close to expiration.

---

## 🏛 Architecture Summary

Cabinate bridges transactional OLTP storage with modern OLAP data warehousing:

```
[ React Native + Expo iOS App (Milestone 2 Pivot) ]
           │ (REST / JSON)
           ▼
[ Spring Boot API (Java 21, com.cabinate.api) ]
           │
           ▼ (Operational OLTP / BSON)
[ MongoDB 7.0 + Mongo Express ]
           │
           ▼ (Batch ETL / Standardization)
[ Databricks / PySpark Lakehouse (Milestone 3) ]
           │
           ▼ (Structured OLAP)
[ Snowflake Data Warehouse (Macros & Inventory) ]
           ▲
           │ (Text-to-SQL & Tool Invocation)
[ Amazon Bedrock Autonomous Agent (Milestone 4) ]
```

For complete architectural details, see [ARCHITECTURE.md](file:///c:/Users/saada/OneDrive/Desktop/Cabinate/ARCHITECTURE.md).  
For milestone progress and upcoming tasks, see [ROADMAP.md](file:///c:/Users/saada/OneDrive/Desktop/Cabinate/ROADMAP.md).

---

## 🛠 Tech Stack (Backend & Local Infrastructure)

- **Language & Runtime:** Java 21 LTS (Eclipse Temurin)
- **Framework:** Spring Boot 4.x / Spring Data MongoDB / Hibernate Validator
- **Build System:** Apache Maven (via Maven Wrapper `mvnw`)
- **Operational Database:** MongoDB 7.0 (Dockerized)
- **Database GUI:** Mongo Express (`localhost:8081`)
- **Mobile Client Direction:** React Native + Expo + TypeScript
- **iOS Build Strategy:** EAS cloud builds from Windows, with physical iPhone testing

---

## 🚀 Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Java 21 LTS (`java -version`)

### 2. Start Local MongoDB & Mongo Express
From the project root:
```bash
docker compose up -d
```
Verify containers are running:
```bash
docker ps
```
- **MongoDB:** `localhost:27017` (user: `admin`, pass: `password123`)
- **Mongo Express:** [http://localhost:8081](http://localhost:8081)

### 3. Run the Spring Boot API
Navigate to the `api` folder and start the server:
```bash
# On Linux/macOS
./mvnw spring-boot:run

# On Windows PowerShell
.\mvnw.cmd spring-boot:run
```
The API starts on port `8080`. Seeding runs automatically on first boot if collections are empty.

### 4. Run the iOS-First Mobile App
Navigate to the `mobile` folder, set the API URL your phone can reach, and start Expo:
```bash
cd mobile
npm install
npm run start -- --port 8082 --host lan
```
For physical iPhone testing from Windows, set `EXPO_PUBLIC_API_URL` to your Windows LAN address before starting Expo. Example:
```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR_WINDOWS_LAN_IP:8080/api/v1"
npm.cmd start -- --port 8082 --host lan
```

The Expo dev server runs at [http://localhost:8082](http://localhost:8082). Scan the Expo QR code with your iPhone to open the app.

### 5. Run the Existing Web Prototype
Navigate to the `web` folder, install dependencies, and start the Vite dev server:
```bash
cd web
npm install
npm run dev
```
The React SPA starts at [http://localhost:5173](http://localhost:5173) with automatic proxying to the Spring Boot backend (`http://localhost:8080/api`).

### 6. Run Test Suite
```bash
# Backend unit & MockMvc integration tests
cd api
.\mvnw.cmd test

# Frontend typecheck & production bundle build
cd web
npm run build

# Mobile TypeScript check
cd mobile
npm run typecheck
```

---

## 📡 REST API Reference

All endpoints are versioned under `/api/v1` and support Cross-Origin Resource Sharing (CORS).

### Recipes (`/api/v1/recipes`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/recipes` | List recipes (optional `?search={query}` for title search) |
| `GET` | `/api/v1/recipes/{id}` | Get recipe by ID |
| `POST` | `/api/v1/recipes` | Create a new recipe (validated DTO) |
| `PUT` | `/api/v1/recipes/{id}` | Update an existing recipe |
| `DELETE` | `/api/v1/recipes/{id}` | Delete a recipe |

### Pantry Items (`/api/v1/pantry`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/pantry` | List pantry items (filter via `?category={cat}` or `?search={query}`) |
| `GET` | `/api/v1/pantry/expiring` | Items expiring on or before date (`?before=YYYY-MM-DD`, default 7 days) |
| `GET` | `/api/v1/pantry/{id}` | Get pantry item by ID |
| `POST` | `/api/v1/pantry` | Create a new pantry item |
| `PUT` | `/api/v1/pantry/{id}` | Update item quantity, location, or expiration date |
| `DELETE` | `/api/v1/pantry/{id}` | Remove item from pantry |

### Raw Ingestion (`/api/v1/ingest`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/ingest` | List payloads (filter via `?status={status}` or `?source={source}`) |
| `GET` | `/api/v1/ingest/{id}` | Retrieve raw ingestion payload |
| `POST` | `/api/v1/ingest` | Ingest unparsed text, HTML scrape, or raw JSON |
| `PATCH`| `/api/v1/ingest/{id}/status` | Update payload status (`PENDING`, `PROCESSED`, `FAILED`) |

### Database Seeding (`/api/v1/seed`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/seed` | Seeds database if empty (use `?force=true` to wipe and reseed) |

### Planned Workflow APIs
These APIs describe upcoming product capabilities and are not implemented yet.

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/receipts/scan` | Upload or scan a grocery receipt, extract purchased items, and stage pantry inventory updates for user confirmation |
| `POST` | `/api/v1/social-recipes` | Submit an Instagram Reel, TikTok, or YouTube Shorts link and extract recipe content from captions or metadata |
| `POST` | `/api/v1/grocery-lists/from-recipe/{recipeId}` | Build a grocery list by comparing a recipe's required ingredients against available pantry inventory |

---

## 🔒 Error Handling Standard

API errors return uniform JSON responses:
```json
{
  "timestamp": "2026-09-07T15:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed for one or more fields",
  "path": "/api/v1/recipes",
  "fieldErrors": {
    "title": "Title is required",
    "servings": "Servings must be at least 1"
  }
}
```
