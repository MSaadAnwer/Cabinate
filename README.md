# Cabinate: Intelligent Pantry & Nutrition Architect

Cabinate is a full-stack, data-driven platform that integrates transactional kitchen and pantry management with an analytical data lakehouse and agentic AI for intelligent, macro-aware meal planning.

---

## 🏛 Architecture Summary

Cabinate bridges transactional OLTP storage with modern OLAP data warehousing:

```
[ React + TypeScript Frontend (Milestone 2) ]
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

### 4. Run the Modern Web Frontend
Navigate to the `web` folder, install dependencies, and start the Vite dev server:
```bash
cd web
npm install
npm run dev
```
The React SPA starts at [http://localhost:5173](http://localhost:5173) with automatic proxying to the Spring Boot backend (`http://localhost:8080/api`).

### 5. Run Test Suite
```bash
# Backend unit & MockMvc integration tests
cd api
.\mvnw.cmd test

# Frontend typecheck & production bundle build
cd web
npm run build
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
