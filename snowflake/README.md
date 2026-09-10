# Cabinate Data Lakehouse: Snowflake Architecture & DDL

This directory contains the complete Snowflake Data Warehouse definitions, Role-Based Access Control (RBAC), multi-tier schemas, dimensional star models, and analytical views for **Cabinate.com** (Milestone 3: Data Lakehouse & ETL Pipeline).

---

## 1. Directory Structure

```
snowflake/
├── 01_setup/
│   └── 01_database_roles_warehouse.sql   # Virtual warehouse, database, schemas, RBAC
├── 02_raw/
│   └── 01_create_raw_tables.sql          # VARIANT landing zone for MongoDB extracts
├── 03_staging/
│   └── 01_create_staging_tables.sql      # Flattened, parsed, and tokenized tables
├── 04_analytics/
│   ├── 01_create_dimensions.sql          # DIM_DATE, DIM_INGREDIENTS, DIM_NUTRITION, DIM_RECIPES
│   ├── 02_create_facts.sql               # FACT_PANTRY_INVENTORY, FACT_RECIPE_INGREDIENTS
│   └── 03_create_views.sql               # Curated views for Bedrock Agent Text-to-SQL
├── 05_seeds/
│   └── 01_seed_reference_data.sql        # 3-year calendar + USDA nutrient references
├── deploy_all.sql                        # Consolidated 1-click execution script
└── README.md                             # Architecture and integration reference
```

---

## 2. Multi-Tier Lakehouse Architecture

```
                    MongoDB (OLTP)
                          │
                          ▼ (Databricks Batch Ingest)
         ┌─────────────────────────────────────────────────┐
         │              CABINATE_DW (Snowflake)            │
         │                                                 │
         │  [ RAW ]                                        │
         │  - MONGODB_RAW_INGEST (VARIANT)                 │
         │  - MONGODB_RECIPES (VARIANT)                    │
         │  - MONGODB_PANTRY_ITEMS (VARIANT)               │
         │                        │                        │
         │                        ▼ (PySpark Parsing/NLP)  │
         │  [ STAGING ]                                    │
         │  - STG_RECIPES                                  │
         │  - STG_RECIPE_INGREDIENTS                       │
         │  - STG_PANTRY_ITEMS                             │
         │                        │                        │
         │                        ▼ (Idempotent MERGE)     │
         │  [ ANALYTICS ] (Star Schema)                    │
         │  - DIM_DATE                                     │
         │  - DIM_INGREDIENTS                              │
         │  - DIM_NUTRITION (USDA 100g standards)          │
         │  - DIM_RECIPES                                  │
         │  - FACT_PANTRY_INVENTORY                        │
         │  - FACT_RECIPE_INGREDIENTS                      │
         │                        │                        │
         │                        ▼ (Agent Views)          │
         │  - V_PANTRY_EXPIRING_ITEMS                      │
         │  - V_RECIPE_NUTRITION_PROFILES                  │
         │  - V_PANTRY_RECIPE_FEASIBILITY                  │
         └────────────────────────┬────────────────────────┘
                                  │
                                  ▼ (Text-to-SQL Tools)
                      Amazon Bedrock Agent (Claude)
```

---

## 3. Dimensional Model (Star Schema)

### Conformed Dimensions
- **`DIM_DATE`**: Calendar dimension keyed by `YYYYMMDD`. Supports tracking inventory intake dates, consumption patterns, and expiration horizons.
- **`DIM_INGREDIENTS`**: Canonical ingredient master keyed by surrogate key `INGREDIENT_KEY` with unique `CANONICAL_NAME`. Standardizes spelling variations, categorizes items (Produce, Dairy, Meat, Grains, etc.), and flags common allergens.
- **`DIM_NUTRITION`**: Reference nutritional profiles per 100g serving aligned with USDA FoodData Central standards (Calories, Protein, Total Carbs, Total Fat, Fiber, Sugar, Sodium).
- **`DIM_RECIPES`**: Catalog dimension mapping to MongoDB recipe documents, storing title, prep/cook/total duration in minutes, servings, and difficulty.

### Fact Tables
- **`FACT_PANTRY_INVENTORY`**: Captures pantry stock snapshot state, remaining quantities, storage locations (Fridge, Freezer, Shelf), expiration dates, and days remaining before spoilage.
- **`FACT_RECIPE_INGREDIENTS`**: Bridge / transaction fact detailing every ingredient requirement per recipe, with normalized gram weight conversions and estimated per-line macro contributions.

---

## 4. Analytical Views for Bedrock LLM Agent

The `ANALYTICS` schema exposes three pre-optimized analytical views tailored for natural language Text-to-SQL conversion:

1. **`V_PANTRY_EXPIRING_ITEMS`**:
   - Classifies pantry items as `CRITICAL` (<= 2 days), `WARNING` (<= 7 days), `EXPIRED`, or `FRESH`.
   - Used by the Agent to prioritize ingredients that must be cooked immediately.

2. **`V_RECIPE_NUTRITION_PROFILES`**:
   - Calculates total and per-serving macronutrient totals (kcal, protein, carbs, fat) across all recipes.
   - Example agent query:
     ```sql
     SELECT TITLE, SERVINGS, TOTAL_TIME_MINUTES, PROTEIN_G_PER_SERVING, CALORIES_PER_SERVING
     FROM ANALYTICS.V_RECIPE_NUTRITION_PROFILES
     WHERE PROTEIN_G_PER_SERVING >= 30.0 AND TOTAL_TIME_MINUTES <= 30
     ORDER BY PROTEIN_G_PER_SERVING DESC;
     ```

3. **`V_PANTRY_RECIPE_FEASIBILITY`**:
   - Cross-checks active unexpired pantry stock against recipe ingredient lists, calculating `PANTRY_MATCH_PERCENT` and `CAN_COOK_NOW` (100% match).
   - Example agent query:
     ```sql
     SELECT TITLE, PANTRY_MATCH_PERCENT, MISSING_INGREDIENTS_COUNT, TOTAL_TIME_MINUTES
     FROM ANALYTICS.V_PANTRY_RECIPE_FEASIBILITY
     WHERE CAN_COOK_NOW = TRUE;
     ```

---

## 5. Deployment Instructions

### Quick Deploy (One-Click)
1. Open your Snowflake Web UI (Snowsight).
2. Create a new SQL Worksheet.
3. Paste the contents of [`deploy_all.sql`](file:///c:/Users/saada/OneDrive/Desktop/Cabinate/snowflake/deploy_all.sql).
4. Run all queries using the `ACCOUNTADMIN` role.

### Step-by-Step Deploy
If using CI/CD or database migration tools (e.g. Flyway, Schemachange, dbt), execute in numeric order:
1. `01_setup/01_database_roles_warehouse.sql`
2. `02_raw/01_create_raw_tables.sql`
3. `03_staging/01_create_staging_tables.sql`
4. `04_analytics/01_create_dimensions.sql`
5. `04_analytics/02_create_facts.sql`
6. `04_analytics/03_create_views.sql`
7. `05_seeds/01_seed_reference_data.sql`
