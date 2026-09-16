# Cabinate: Development Roadmap & Milestones

**Mission:** Build and release Cabinate as an iOS-first Intelligent Pantry & Nutrition Architect.

---

## Milestone 0: Local Environment & Scaffolding
- [x] Setup local Docker environment (MongoDB + Mongo Express)
- [x] Install Java 21 LTS (Temurin) & verify local toolchain
- [x] Initialize Spring Boot project (`com.cabinate.api`, Java 21, Maven, Spring Web, Spring Data MongoDB)
- [x] Validate project compiles and boots locally

## Milestone 1: Operational Backend & Ingestion API (Spring Boot + MongoDB)
- [x] Design domain models: `Recipe`, `PantryItem`, `RawIngestPayload`
- [x] Implement N-Tier Architecture (Package-by-Feature):
  - Repository layer (`MongoRepository`)
  - Service layer (business rules, validation)
  - Controller layer (REST endpoints, DTO mapping)
- [x] Write integration and unit tests (MockMvc, Testcontainers or embedded Mongo)
- [x] Create seed data generation script for testing raw recipe payloads

## Milestone 2: Modern Frontend (React + TypeScript)
- [x] Scaffold Vite + React + TypeScript application
- [x] Build core UI components:
  - Pantry inventory dashboard
  - Recipe submission / ingestion form
  - Raw JSON / text paste view
- [x] Integrate React client with Spring Boot API endpoints

## Milestone 2A: iOS App Pivot (React Native + Expo)
- [x] Scaffold `mobile/` as a React Native + Expo + TypeScript app
- [x] Reuse or mirror existing TypeScript API contracts for pantry, recipes, and ingest workflows
- [x] Build mobile-first navigation for Inventory, Recipes, Grocery List, and Capture
- [x] Add camera/library receipt photo entry point with local saved receipts
- [x] Add paste-link entry point and saved capture inbox for social recipe links (native share extension deferred)
- [ ] Add receipt scanning flow for staging pantry inventory updates
- [ ] Add social recipe import flow for Instagram Reels, TikTok, and YouTube Shorts links
- [x] Add recipe-based grocery lists with optional conservative pantry-name matching and review
- [ ] Extend pantry matching with quantity comparisons and unit conversions
- [x] Configure EAS Build for iOS development builds from Windows
- [x] Document physical iPhone testing flow and App Store/TestFlight release requirements

## Milestone 2B: Kitchen Companion Redesign
- [x] Home-first navigation, farm silhouettes, and uneven tomato sections for List, Pantry, Cookbook, Account
- [x] Illustrated Pantry categories, All/search, animated add menu, and validated manual item creation
- [x] Multiple named grocery lists, aisle grouping/correction, and persistent item checks
- [x] Manual recipe creation, searchable cookbook, ingredient view, and persistent cooking steps
- [x] Monthly meal-photo calendar with captions and pantry expiration markers
- [x] In-app expiration reminders and account placeholder
- [x] Persist lists, photos, and cooking progress on the device
- [x] TypeScript checks, recipe/date tests, iOS export, and browser interaction checks
- [ ] Physical iPhone verification of camera permissions, photo persistence, keyboard, and native transitions
- [ ] Connect AI recipe generation, automatic receipt/video extraction, product recall feed, and push notifications
- [ ] Add account authentication and sync locally stored records between devices

The manual flows are implemented first by product decision. AI and automatic extraction remain visibly marked as upcoming; the inspiration screen currently suggests existing saved recipes with pantry matches.

## Milestone 3: Data Lakehouse & ETL Pipeline (Databricks + Python)
- [x] Set up Snowflake trial account, database, schemas (`RAW`, `STAGING`, `ANALYTICS`), and warehouse
- [x] Design Snowflake dimensional star schema (`DIM_INGREDIENTS`, `DIM_NUTRITION`, `FACT_PANTRY_INVENTORY`)
- [ ] Implement Databricks PySpark pipeline:
  - Connect to MongoDB source
  - Parse unstructured recipe strings, extract quantities, units, and ingredient names
  - Normalize receipt line items into canonical pantry ingredients
  - Extract recipe candidates from social video captions and metadata
  - Enrich with standardized macro-nutrient tables
  - Write idempotent MERGE/UPSERT into Snowflake

## Milestone 4: Autonomous Agent Integration (Amazon Bedrock)
- [ ] Configure AWS Bedrock foundation model access (e.g. Anthropic Claude 3.5 Sonnet)
- [ ] Define Bedrock Agent Action Groups:
  - Lambda or API tools for Text-to-SQL execution against Snowflake
  - Semantic context retrieval tool for recipe notes from MongoDB
  - Grocery-list generation tool that compares recipe requirements against current pantry inventory
- [ ] Establish guardrails and system prompts for pantry-aware meal generation
- [ ] Expose Bedrock Agent endpoint via Spring Boot to the React frontend

## Milestone 5: Production Readiness & Deployment (Cabinate.com)
- [ ] Containerize applications with multi-stage Dockerfiles
- [ ] Setup CI/CD pipelines (GitHub Actions)
- [ ] Deploy frontend (Vercel / Cloudflare Pages / AWS Amplify)
- [ ] Deploy Spring Boot backend (AWS ECS / App Runner)
- [ ] Domain setup, SSL, and security hardening for Cabinate.com
