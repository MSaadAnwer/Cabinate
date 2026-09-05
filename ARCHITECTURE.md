# Cabinate: System Architecture Document

**Target Product:** Cabinate.com (Intelligent Pantry & Nutrition Architect)  
**Architecture Style:** Distributed Full-Stack, Event/Batch Data Processing, Agentic AI  
**Deployment Target:** Windows 11 (Local Dev with Docker) -> Cloud Native Enterprise Production

---

## 1. High-Level Architecture Overview

Cabinate combines transactional OLTP capabilities with modern OLAP data warehousing and agentic reasoning:

```
[ React + TypeScript Frontend ]
           │ (REST / JSON)
           ▼
[ Spring Boot API (N-Tier, com.cabinate.api) ]
           │
           ▼ (Raw Ingestion / BSON)
[ MongoDB (Operational OLTP) ]
           │
           ▼ (Batch ETL / Standardization)
[ Databricks / Python Lakehouse Pipeline ]
           │
           ▼ (Structured OLAP)
[ Snowflake Data Warehouse (Inventory, Macros, Price History) ]
           ▲
           │ (Text-to-SQL & Tool Use)
[ Amazon Bedrock Autonomous Agent ]
```

---

## 2. Component Specifications

### 2.1 Frontend Layer
* **Tech:** TypeScript, React (Vite-based modern SPA)
* **Role:** User interface for grocery logging, recipe browsing, pantry management, and conversational meal planning.

### 2.2 Backend API Layer
* **Tech:** Java 21+, Spring Boot 3.x
* **Base Package:** `com.cabinate.api`
* **Pattern:** N-Tier Architecture (`Controller` -> `Service` -> `Repository` / `DAO`) organized by feature slices.
* **Role:** Authentication, CRUD operations, raw data ingestion, orchestrator for client-facing operations.

### 2.3 Operational Database (OLTP)
* **Tech:** MongoDB (Local Docker -> Atlas)
* **Role:** Store unstructured, polymorphic data: raw recipe payloads, web scrape dumps, variable user profile notes.

### 2.4 Analytical Data Warehouse (OLAP)
* **Tech:** Snowflake
* **Role:** Normalized, highly structured analytical store for:
  - `DIM_INGREDIENTS` & `DIM_NUTRITION` (Macros, micronutrients)
  - `FACT_PANTRY_INVENTORY` (Current household stock, expiration dates)
  - `FACT_PRICE_HISTORY` (Store pricing, historical inflation trends)

### 2.5 ETL & Data Processing Pipeline
* **Tech:** Databricks / Apache Spark (PySpark) & Python
* **Role:** Extract unstructured JSON/BSON from MongoDB, clean, normalize, validate nutrition calculations, and load into Snowflake analytical tables.

### 2.6 Agentic AI Layer
* **Tech:** Amazon Bedrock Agents (Claude 3.5 Sonnet / Anthropic models)
* **Role:** Reasoning engine equipped with Action Groups / Tools:
  - Text-to-SQL over Snowflake inventory and macros.
  - Context retriever from MongoDB for qualitative recipe notes.
  - Synthesizing pantry-aware meal recommendations.

---

## 3. Guiding Architectural Principles
1. **Separation of Concerns:** Clear boundaries between OLTP (MongoDB) and OLAP (Snowflake). Operational services never run heavy analytical queries against MongoDB.
2. **N-Tier Decoupling:** Spring Boot code must strictly separate DTOs, Controllers, Business Services, Domain Entities, and Repository layers.
3. **Idempotent Data Pipelines:** Databricks pipelines must support incremental backfills and idempotent upserts into Snowflake.
4. **Agent Guardrails:** The Bedrock Agent never executes arbitrary DDL/DML; it is restricted to safe, read-only analytical tools and parameterized functions.
