# Cabinate: System Architecture Document

**Target Product:** Cabinate iOS App (Intelligent Pantry & Nutrition Architect)  
**Architecture Style:** Mobile-First Full-Stack, Event/Batch Data Processing, Agentic AI  
**Development Target:** Windows 11 with Codex or Antigravity, Expo/EAS for iOS builds, physical iPhone testing  
**Deployment Target:** iOS App Store + Cloud Native Backend Production

---

## 1. High-Level Architecture Overview

Cabinate combines transactional OLTP capabilities with modern OLAP data warehousing and agentic reasoning:

```
[ React Native + Expo iOS App ]
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

### 2.1 Mobile Client Layer
* **Tech:** React Native, Expo, TypeScript, EAS Build
* **Role:** Primary iOS user experience for grocery logging, receipt scanning, social recipe capture, recipe browsing, pantry management, grocery list generation, and conversational meal planning.
* **Development Reality:** Windows can be the main coding environment when paired with Expo/EAS cloud builds and a physical iPhone. The iOS Simulator and local native iOS compilation remain macOS/Xcode responsibilities.

### 2.2 Backend API Layer
* **Tech:** Java 21+, Spring Boot 3.x
* **Base Package:** `com.cabinate.api`
* **Pattern:** N-Tier Architecture (`Controller` -> `Service` -> `Repository` / `DAO`) organized by feature slices.
* **Role:** Authentication, CRUD operations, raw data ingestion, receipt parsing orchestration, social recipe ingestion adapters, grocery list generation, and client-facing workflows.

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
* **Role:** Extract unstructured JSON/BSON from MongoDB, clean and normalize receipt line items, parse social-caption recipe text, validate nutrition calculations, and load conformed ingredient and recipe data into Snowflake analytical tables.

### 2.6 Agentic AI Layer
* **Tech:** Amazon Bedrock Agents (Claude 3.5 Sonnet / Anthropic models)
* **Role:** Reasoning engine equipped with Action Groups / Tools:
  - Text-to-SQL over Snowflake inventory and macros.
  - Context retriever from MongoDB for qualitative recipe notes.
  - Pantry gap analysis for recipe-to-grocery-list generation.
  - Synthesizing pantry-aware meal recommendations.

---

### 2.7 Core Product Workflows
* **Receipt-to-inventory workflow:** User scans a receipt, Cabinate extracts purchased food items, normalizes item names and quantities, and stages changes before updating pantry inventory.
* **Short-form recipe capture workflow:** User submits an Instagram Reel, TikTok, or YouTube Shorts link, Cabinate captures available captions or metadata, and converts ingredient/instruction text into a saved recipe candidate.
* **Recipe-to-grocery-list workflow:** User selects a recipe, Cabinate compares required ingredients with available pantry items, and generates a grocery list for missing or insufficient ingredients.

---

### 2.8 Legacy Web Prototype
* **Tech:** React + TypeScript + Vite
* **Role:** Existing web client remains useful for rapid UI prototyping, backend smoke testing, demos, and a possible future admin dashboard.
* **Boundary:** New consumer-facing workflows should be designed for mobile first. Shared TypeScript types and API client patterns can be reused where practical, but the web app should not drive the main product interaction model.

---

## 3. Guiding Architectural Principles
1. **Separation of Concerns:** Clear boundaries between OLTP (MongoDB) and OLAP (Snowflake). Operational services never run heavy analytical queries against MongoDB.
2. **N-Tier Decoupling:** Spring Boot code must strictly separate DTOs, Controllers, Business Services, Domain Entities, and Repository layers.
3. **Idempotent Data Pipelines:** Databricks pipelines must support incremental backfills and idempotent upserts into Snowflake.
4. **Human-in-the-loop data capture:** Receipt OCR and social-caption extraction should stage proposed pantry or recipe changes for user review before mutating trusted records.
5. **Mobile-first interaction design:** Core flows must optimize for a phone camera, kitchen context, grocery store use, intermittent attention, and fast correction of extracted data.
6. **Agent Guardrails:** The Bedrock Agent never executes arbitrary DDL/DML; it is restricted to safe, read-only analytical tools and parameterized functions.
