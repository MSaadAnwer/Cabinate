-- ==============================================================================
-- CABINATE ANALYTICAL LAKEHOUSE: MASTER DEPLOYMENT SCRIPT
-- Project: Cabinate.com (Intelligent Pantry & Nutrition Architect)
-- Milestone 3: Data Lakehouse & ETL Pipeline (Snowflake DDL & Modeling)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Log in to Snowflake (Web UI / SnowSQL / VS Code Snowflake Extension).
-- 2. Open a new SQL Worksheet.
-- 3. Run this entire script as ACCOUNTADMIN or SYSADMIN.
-- ==============================================================================

USE ROLE ACCOUNTADMIN;

-- ==============================================================================
-- STEP 1: INFRASTRUCTURE, WAREHOUSE & DATABASE
-- ==============================================================================

CREATE WAREHOUSE IF NOT EXISTS CABINATE_WH
    WITH 
    WAREHOUSE_SIZE = 'X-SMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    INITIALLY_SUSPENDED = TRUE
    COMMENT = 'Virtual warehouse for Cabinate ETL ingestion and agentic analytical queries';

USE WAREHOUSE CABINATE_WH;

CREATE DATABASE IF NOT EXISTS CABINATE_DW
    COMMENT = 'Cabinate Analytical Data Warehouse';

USE DATABASE CABINATE_DW;

-- Create Multi-Tier Lakehouse Schemas
CREATE SCHEMA IF NOT EXISTS CABINATE_DW.RAW
    COMMENT = 'Raw landing schema for unprocessed MongoDB extracts and web scraping payloads';

CREATE SCHEMA IF NOT EXISTS CABINATE_DW.STAGING
    COMMENT = 'Staging schema containing cleaned, tokenized, and typed intermediate tables';

CREATE SCHEMA IF NOT EXISTS CABINATE_DW.ANALYTICS
    COMMENT = 'Production analytical star schema (Dimensions, Facts, and Materialized Views)';

-- ==============================================================================
-- STEP 2: ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

CREATE ROLE IF NOT EXISTS CABINATE_ADMIN;
CREATE ROLE IF NOT EXISTS CABINATE_ETL_ROLE;
CREATE ROLE IF NOT EXISTS CABINATE_AGENT_ROLE;

-- Warehouse permissions
GRANT USAGE, OPERATE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_ADMIN;
GRANT USAGE, OPERATE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_AGENT_ROLE;

-- Database permissions
GRANT ALL PRIVILEGES ON DATABASE CABINATE_DW TO ROLE CABINATE_ADMIN;
GRANT USAGE ON DATABASE CABINATE_DW TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE ON DATABASE CABINATE_DW TO ROLE CABINATE_AGENT_ROLE;

-- ETL Schema & Table grants (Databricks PySpark write access)
GRANT ALL PRIVILEGES ON SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE, CREATE TABLE, CREATE VIEW ON SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;

-- Bedrock Agent grants (Read-only access to conformed star schema)
GRANT USAGE ON SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON FUTURE TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON FUTURE VIEWS IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;

-- Governance inheritance
GRANT ROLE CABINATE_ADMIN TO ROLE ACCOUNTADMIN;
GRANT ROLE CABINATE_ETL_ROLE TO ROLE CABINATE_ADMIN;
GRANT ROLE CABINATE_AGENT_ROLE TO ROLE CABINATE_ADMIN;

-- ==============================================================================
-- STEP 3: RAW SCHEMA TABLES (Landing Zone)
-- ==============================================================================
USE SCHEMA CABINATE_DW.RAW;

CREATE TABLE IF NOT EXISTS RAW.MONGODB_RAW_INGEST (
    INGEST_ID           VARCHAR(64) NOT NULL,
    SOURCE              VARCHAR(64),
    SOURCE_URL          VARCHAR(1024),
    CONTENT_TYPE        VARCHAR(64),
    RAW_PAYLOAD         VARIANT,
    METADATA            VARIANT,
    STATUS              VARCHAR(32),
    INGESTED_AT         TIMESTAMP_NTZ,
    LOADED_AT           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (INGEST_ID)
)
COMMENT = 'Raw landing table for MongoDB raw_ingest_payloads documents containing JSON/BSON variants';

CREATE TABLE IF NOT EXISTS RAW.MONGODB_RECIPES (
    RECIPE_ID           VARCHAR(64) NOT NULL,
    RAW_DOCUMENT        VARIANT NOT NULL,
    LOADED_AT           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (RECIPE_ID)
)
COMMENT = 'Raw landing table for complete MongoDB recipe documents in VARIANT format';

CREATE TABLE IF NOT EXISTS RAW.MONGODB_PANTRY_ITEMS (
    PANTRY_ITEM_ID      VARCHAR(64) NOT NULL,
    RAW_DOCUMENT        VARIANT NOT NULL,
    LOADED_AT           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (PANTRY_ITEM_ID)
)
COMMENT = 'Raw landing table for complete MongoDB pantry_items documents in VARIANT format';

-- ==============================================================================
-- STEP 4: STAGING SCHEMA TABLES (Transformation Zone)
-- ==============================================================================
USE SCHEMA CABINATE_DW.STAGING;

CREATE TABLE IF NOT EXISTS STAGING.STG_RECIPES (
    STG_RECIPE_ID       VARCHAR(64) NOT NULL,
    RAW_INGEST_ID       VARCHAR(64),
    TITLE               VARCHAR(255) NOT NULL,
    DESCRIPTION         VARCHAR(2000),
    SOURCE_URL          VARCHAR(1024),
    PREP_TIME_MINUTES   NUMBER(6, 0),
    COOK_TIME_MINUTES   NUMBER(6, 0),
    TOTAL_TIME_MINUTES  NUMBER(6, 0),
    SERVINGS            NUMBER(4, 0),
    RAW_TEXT            VARCHAR(16777216),
    EXTRACTED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (STG_RECIPE_ID)
)
COMMENT = 'Staging table for cleaned and flattened recipe records before dimensional modeling';

CREATE TABLE IF NOT EXISTS STAGING.STG_RECIPE_INGREDIENTS (
    STG_LINE_ID             VARCHAR(64) NOT NULL,
    STG_RECIPE_ID           VARCHAR(64) NOT NULL,
    LINE_ORDER              NUMBER(4, 0) DEFAULT 1,
    RAW_LINE_TEXT           VARCHAR(500) NOT NULL,
    PARSED_QUANTITY         FLOAT,
    PARSED_UNIT             VARCHAR(64),
    PARSED_INGREDIENT_NAME  VARCHAR(255) NOT NULL,
    STANDARDIZED_NAME       VARCHAR(255),
    PARSED_NOTES            VARCHAR(255),
    EXTRACTED_AT            TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (STG_LINE_ID)
)
COMMENT = 'Staging table for NLP-tokenized recipe ingredients (quantities, units, ingredient names)';

CREATE TABLE IF NOT EXISTS STAGING.STG_PANTRY_ITEMS (
    STG_PANTRY_ITEM_ID  VARCHAR(64) NOT NULL,
    ITEM_NAME           VARCHAR(255) NOT NULL,
    QUANTITY            FLOAT NOT NULL,
    UNIT                VARCHAR(64) NOT NULL,
    CATEGORY            VARCHAR(64),
    LOCATION            VARCHAR(64),
    EXPIRATION_DATE     DATE,
    RECORDED_AT         TIMESTAMP_NTZ,
    EXTRACTED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (STG_PANTRY_ITEM_ID)
)
COMMENT = 'Staging table for standardized pantry stock inventory snapshots';

-- ==============================================================================
-- STEP 5: ANALYTICS SCHEMA - DIMENSION TABLES
-- ==============================================================================
USE SCHEMA CABINATE_DW.ANALYTICS;

CREATE TABLE IF NOT EXISTS ANALYTICS.DIM_DATE (
    DATE_KEY            NUMBER(8, 0) NOT NULL, -- Format: YYYYMMDD
    FULL_DATE           DATE NOT NULL,
    DAY_OF_WEEK         NUMBER(1, 0) NOT NULL, -- 1 = Monday ... 7 = Sunday
    DAY_OF_WEEK_NAME    VARCHAR(10) NOT NULL,
    DAY_OF_MONTH        NUMBER(2, 0) NOT NULL,
    DAY_OF_YEAR         NUMBER(3, 0) NOT NULL,
    WEEK_OF_YEAR        NUMBER(2, 0) NOT NULL,
    MONTH_NUMBER        NUMBER(2, 0) NOT NULL,
    MONTH_NAME          VARCHAR(15) NOT NULL,
    QUARTER             NUMBER(1, 0) NOT NULL,
    YEAR                NUMBER(4, 0) NOT NULL,
    IS_WEEKEND          BOOLEAN NOT NULL,
    PRIMARY KEY (DATE_KEY)
)
COMMENT = 'Date dimension for analyzing pantry inventory lifecycle, expiration risk, and recipe usage';

CREATE TABLE IF NOT EXISTS ANALYTICS.DIM_INGREDIENTS (
    INGREDIENT_KEY          NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    CANONICAL_NAME          VARCHAR(255) NOT NULL,
    DISPLAY_NAME            VARCHAR(255) NOT NULL,
    CATEGORY                VARCHAR(64) NOT NULL,
    SUB_CATEGORY            VARCHAR(64),
    DEFAULT_UNIT            VARCHAR(32) DEFAULT 'grams',
    IS_COMMON_PANTRY_STAPLE BOOLEAN DEFAULT FALSE,
    IS_PERISHABLE           BOOLEAN DEFAULT TRUE,
    AVERAGE_SHELF_LIFE_DAYS NUMBER(4, 0),
    IS_ALLERGEN             BOOLEAN DEFAULT FALSE,
    ALLERGEN_TYPE           VARCHAR(64),
    CREATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (INGREDIENT_KEY),
    CONSTRAINT UQ_CANONICAL_NAME UNIQUE (CANONICAL_NAME)
)
COMMENT = 'Conformed canonical ingredient dimension with classification, shelf-life, and allergen tags';

CREATE TABLE IF NOT EXISTS ANALYTICS.DIM_NUTRITION (
    NUTRITION_KEY           NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    INGREDIENT_KEY          NUMBER(38, 0) NOT NULL,
    SERVING_SIZE_GRAMS      FLOAT DEFAULT 100.0,
    CALORIES_KCAL           FLOAT DEFAULT 0.0,
    PROTEIN_G               FLOAT DEFAULT 0.0,
    CARBOHYDRATES_G         FLOAT DEFAULT 0.0,
    FAT_G                   FLOAT DEFAULT 0.0,
    SATURATED_FAT_G         FLOAT,
    FIBER_G                 FLOAT DEFAULT 0.0,
    SUGAR_G                 FLOAT DEFAULT 0.0,
    SODIUM_MG               FLOAT DEFAULT 0.0,
    SOURCE                  VARCHAR(64) DEFAULT 'USDA FoodData Central',
    LAST_VERIFIED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (NUTRITION_KEY),
    FOREIGN KEY (INGREDIENT_KEY) REFERENCES ANALYTICS.DIM_INGREDIENTS(INGREDIENT_KEY)
)
COMMENT = 'Nutritional reference dimension providing standardized macro and micronutrient benchmarks per 100g';

CREATE TABLE IF NOT EXISTS ANALYTICS.DIM_RECIPES (
    RECIPE_KEY              NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    MONGO_RECIPE_ID         VARCHAR(64),
    TITLE                   VARCHAR(255) NOT NULL,
    DESCRIPTION             VARCHAR(2000),
    SOURCE_URL              VARCHAR(1024),
    PREP_TIME_MINUTES       NUMBER(6, 0),
    COOK_TIME_MINUTES       NUMBER(6, 0),
    TOTAL_TIME_MINUTES      NUMBER(6, 0),
    SERVINGS                NUMBER(4, 0) DEFAULT 1,
    DIFFICULTY              VARCHAR(32),
    CREATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (RECIPE_KEY),
    CONSTRAINT UQ_MONGO_RECIPE_ID UNIQUE (MONGO_RECIPE_ID)
)
COMMENT = 'Recipe dimension storing curated recipe catalog, timing metrics, and serving counts';

-- ==============================================================================
-- STEP 6: ANALYTICS SCHEMA - FACT TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ANALYTICS.FACT_PANTRY_INVENTORY (
    INVENTORY_KEY           NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    DATE_KEY                NUMBER(8, 0) NOT NULL,
    INGREDIENT_KEY          NUMBER(38, 0),
    MONGO_PANTRY_ID         VARCHAR(64),
    ITEM_NAME               VARCHAR(255) NOT NULL,
    QUANTITY                FLOAT NOT NULL,
    UNIT                    VARCHAR(64) NOT NULL,
    LOCATION                VARCHAR(64),
    EXPIRATION_DATE         DATE,
    EXPIRATION_DATE_KEY     NUMBER(8, 0),
    DAYS_UNTIL_EXPIRATION   NUMBER(5, 0),
    IS_EXPIRED              BOOLEAN DEFAULT FALSE,
    IS_EXPIRING_SOON        BOOLEAN DEFAULT FALSE,
    RECORDED_AT             TIMESTAMP_NTZ,
    LOADED_AT               TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (INVENTORY_KEY),
    FOREIGN KEY (DATE_KEY) REFERENCES ANALYTICS.DIM_DATE(DATE_KEY),
    FOREIGN KEY (INGREDIENT_KEY) REFERENCES ANALYTICS.DIM_INGREDIENTS(INGREDIENT_KEY)
)
COMMENT = 'Fact table tracking pantry inventory stock levels, storage locations, and expiration telemetry';

CREATE TABLE IF NOT EXISTS ANALYTICS.FACT_RECIPE_INGREDIENTS (
    RECIPE_INGREDIENT_KEY   NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    RECIPE_KEY              NUMBER(38, 0) NOT NULL,
    INGREDIENT_KEY          NUMBER(38, 0),
    LINE_ORDER              NUMBER(4, 0) DEFAULT 1,
    RAW_INGREDIENT_TEXT     VARCHAR(500) NOT NULL,
    QUANTITY                FLOAT,
    UNIT                    VARCHAR(64),
    NORMALIZED_GRAMS        FLOAT,
    EST_CALORIES_KCAL       FLOAT,
    EST_PROTEIN_G           FLOAT,
    EST_CARBS_G             FLOAT,
    EST_FAT_G               FLOAT,
    LOADED_AT               TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (RECIPE_INGREDIENT_KEY),
    FOREIGN KEY (RECIPE_KEY) REFERENCES ANALYTICS.DIM_RECIPES(RECIPE_KEY),
    FOREIGN KEY (INGREDIENT_KEY) REFERENCES ANALYTICS.DIM_INGREDIENTS(INGREDIENT_KEY)
)
COMMENT = 'Fact table connecting recipes to required ingredients with scaled metric weight and nutritional totals';

-- ==============================================================================
-- STEP 7: ANALYTICS SCHEMA - VIEWS (Agent & Dashboard Marts)
-- ==============================================================================

CREATE OR REPLACE VIEW ANALYTICS.V_PANTRY_EXPIRING_ITEMS AS
SELECT
    f.INVENTORY_KEY,
    f.MONGO_PANTRY_ID,
    f.ITEM_NAME,
    COALESCE(i.CANONICAL_NAME, f.ITEM_NAME) AS CANONICAL_NAME,
    COALESCE(i.CATEGORY, 'Uncategorized') AS CATEGORY,
    f.QUANTITY,
    f.UNIT,
    f.LOCATION,
    f.EXPIRATION_DATE,
    DATEDIFF('day', CURRENT_DATE(), f.EXPIRATION_DATE) AS DAYS_REMAINING,
    CASE
        WHEN f.EXPIRATION_DATE IS NULL THEN 'NO_DATE'
        WHEN f.EXPIRATION_DATE < CURRENT_DATE() THEN 'EXPIRED'
        WHEN DATEDIFF('day', CURRENT_DATE(), f.EXPIRATION_DATE) <= 2 THEN 'CRITICAL'
        WHEN DATEDIFF('day', CURRENT_DATE(), f.EXPIRATION_DATE) <= 7 THEN 'WARNING'
        ELSE 'FRESH'
    END AS EXPIRATION_STATUS,
    CASE
        WHEN f.EXPIRATION_DATE < CURRENT_DATE() THEN TRUE
        ELSE FALSE
    END AS IS_EXPIRED,
    COALESCE(i.IS_ALLERGEN, FALSE) AS IS_ALLERGEN,
    i.ALLERGEN_TYPE
FROM ANALYTICS.FACT_PANTRY_INVENTORY f
LEFT JOIN ANALYTICS.DIM_INGREDIENTS i
    ON f.INGREDIENT_KEY = i.INGREDIENT_KEY
ORDER BY 
    CASE 
        WHEN f.EXPIRATION_DATE IS NULL THEN 9999
        ELSE DATEDIFF('day', CURRENT_DATE(), f.EXPIRATION_DATE)
    END ASC;

CREATE OR REPLACE VIEW ANALYTICS.V_RECIPE_NUTRITION_PROFILES AS
SELECT
    r.RECIPE_KEY,
    r.MONGO_RECIPE_ID,
    r.TITLE,
    r.SERVINGS,
    r.PREP_TIME_MINUTES,
    r.COOK_TIME_MINUTES,
    COALESCE(r.TOTAL_TIME_MINUTES, r.PREP_TIME_MINUTES + r.COOK_TIME_MINUTES) AS TOTAL_TIME_MINUTES,
    r.DIFFICULTY,
    r.SOURCE_URL,
    COUNT(f.RECIPE_INGREDIENT_KEY) AS INGREDIENT_COUNT,
    ROUND(SUM(COALESCE(f.EST_CALORIES_KCAL, 0)), 1) AS TOTAL_CALORIES_KCAL,
    ROUND(SUM(COALESCE(f.EST_PROTEIN_G, 0)), 1) AS TOTAL_PROTEIN_G,
    ROUND(SUM(COALESCE(f.EST_CARBS_G, 0)), 1) AS TOTAL_CARBS_G,
    ROUND(SUM(COALESCE(f.EST_FAT_G, 0)), 1) AS TOTAL_FAT_G,
    -- Per-serving macros
    ROUND(SUM(COALESCE(f.EST_CALORIES_KCAL, 0)) / GREATEST(COALESCE(r.SERVINGS, 1), 1), 1) AS CALORIES_PER_SERVING,
    ROUND(SUM(COALESCE(f.EST_PROTEIN_G, 0)) / GREATEST(COALESCE(r.SERVINGS, 1), 1), 1) AS PROTEIN_G_PER_SERVING,
    ROUND(SUM(COALESCE(f.EST_CARBS_G, 0)) / GREATEST(COALESCE(r.SERVINGS, 1), 1), 1) AS CARBS_G_PER_SERVING,
    ROUND(SUM(COALESCE(f.EST_FAT_G, 0)) / GREATEST(COALESCE(r.SERVINGS, 1), 1), 1) AS FAT_G_PER_SERVING
FROM ANALYTICS.DIM_RECIPES r
LEFT JOIN ANALYTICS.FACT_RECIPE_INGREDIENTS f
    ON r.RECIPE_KEY = f.RECIPE_KEY
GROUP BY
    r.RECIPE_KEY,
    r.MONGO_RECIPE_ID,
    r.TITLE,
    r.SERVINGS,
    r.PREP_TIME_MINUTES,
    r.COOK_TIME_MINUTES,
    r.TOTAL_TIME_MINUTES,
    r.DIFFICULTY,
    r.SOURCE_URL;

CREATE OR REPLACE VIEW ANALYTICS.V_PANTRY_RECIPE_FEASIBILITY AS
WITH active_pantry_ingredients AS (
    SELECT DISTINCT
        p.INGREDIENT_KEY
    FROM ANALYTICS.FACT_PANTRY_INVENTORY p
    WHERE p.INGREDIENT_KEY IS NOT NULL
      AND (p.EXPIRATION_DATE IS NULL OR p.EXPIRATION_DATE >= CURRENT_DATE())
      AND p.QUANTITY > 0
),
recipe_ingredient_matches AS (
    SELECT
        r.RECIPE_KEY,
        r.TITLE,
        r.SERVINGS,
        r.TOTAL_TIME_MINUTES,
        COUNT(ri.RECIPE_INGREDIENT_KEY) AS TOTAL_REQUIRED_INGREDIENTS,
        COUNT(ap.INGREDIENT_KEY) AS INGREDIENTS_IN_STOCK,
        COUNT(ri.RECIPE_INGREDIENT_KEY) - COUNT(ap.INGREDIENT_KEY) AS MISSING_INGREDIENTS_COUNT
    FROM ANALYTICS.DIM_RECIPES r
    JOIN ANALYTICS.FACT_RECIPE_INGREDIENTS ri
        ON r.RECIPE_KEY = ri.RECIPE_KEY
    LEFT JOIN active_pantry_ingredients ap
        ON ri.INGREDIENT_KEY = ap.INGREDIENT_KEY
    GROUP BY
        r.RECIPE_KEY,
        r.TITLE,
        r.SERVINGS,
        r.TOTAL_TIME_MINUTES
)
SELECT
    m.RECIPE_KEY,
    m.TITLE,
    m.SERVINGS,
    m.TOTAL_TIME_MINUTES,
    m.TOTAL_REQUIRED_INGREDIENTS,
    m.INGREDIENTS_IN_STOCK,
    m.MISSING_INGREDIENTS_COUNT,
    ROUND((m.INGREDIENTS_IN_STOCK * 100.0) / NULLIF(m.TOTAL_REQUIRED_INGREDIENTS, 0), 1) AS PANTRY_MATCH_PERCENT,
    CASE 
        WHEN m.MISSING_INGREDIENTS_COUNT = 0 THEN TRUE 
        ELSE FALSE 
    END AS CAN_COOK_NOW
FROM recipe_ingredient_matches m
ORDER BY PANTRY_MATCH_PERCENT DESC, m.TOTAL_TIME_MINUTES ASC;

-- ==============================================================================
-- STEP 8: REFERENCE SEED DATA POPULATION
-- ==============================================================================

-- 1. Populate DIM_DATE (2025-2027)
MERGE INTO ANALYTICS.DIM_DATE target
USING (
    WITH date_spine AS (
        SELECT DATEADD(day, SEQ4(), '2025-01-01'::DATE) AS d
        FROM TABLE(GENERATOR(ROWCOUNT => 1096))
    )
    SELECT
        TO_NUMBER(TO_VARCHAR(d, 'YYYYMMDD')) AS DATE_KEY,
        d AS FULL_DATE,
        DAYOFWEEKISO(d) AS DAY_OF_WEEK,
        DAYNAME(d) AS DAY_OF_WEEK_NAME,
        DAY(d) AS DAY_OF_MONTH,
        DAYOFYEAR(d) AS DAY_OF_YEAR,
        WEEKOFYEAR(d) AS WEEK_OF_YEAR,
        MONTH(d) AS MONTH_NUMBER,
        MONTHNAME(d) AS MONTH_NAME,
        QUARTER(d) AS QUARTER,
        YEAR(d) AS YEAR,
        CASE WHEN DAYOFWEEKISO(d) IN (6, 7) THEN TRUE ELSE FALSE END AS IS_WEEKEND
    FROM date_spine
) source
ON target.DATE_KEY = source.DATE_KEY
WHEN NOT MATCHED THEN
    INSERT (
        DATE_KEY, FULL_DATE, DAY_OF_WEEK, DAY_OF_WEEK_NAME, DAY_OF_MONTH, DAY_OF_YEAR,
        WEEK_OF_YEAR, MONTH_NUMBER, MONTH_NAME, QUARTER, YEAR, IS_WEEKEND
    )
    VALUES (
        source.DATE_KEY, source.FULL_DATE, source.DAY_OF_WEEK, source.DAY_OF_WEEK_NAME,
        source.DAY_OF_MONTH, source.DAY_OF_YEAR, source.WEEK_OF_YEAR, source.MONTH_NUMBER,
        source.MONTH_NAME, source.QUARTER, source.YEAR, source.IS_WEEKEND
    );

-- 2. Populate Canonical DIM_INGREDIENTS
MERGE INTO ANALYTICS.DIM_INGREDIENTS target
USING (
    SELECT * FROM (VALUES
        ('Garlic', 'Fresh Garlic', 'Produce', 'Alliums', 'cloves', TRUE, FALSE, 90, FALSE, NULL),
        ('Yellow Onion', 'Yellow Onion', 'Produce', 'Alliums', 'item', TRUE, FALSE, 60, FALSE, NULL),
        ('Red Bell Pepper', 'Red Bell Pepper', 'Produce', 'Vegetables', 'item', FALSE, TRUE, 14, FALSE, NULL),
        ('Asparagus', 'Fresh Asparagus', 'Produce', 'Vegetables', 'grams', FALSE, TRUE, 7, FALSE, NULL),
        ('Lemon', 'Fresh Lemon', 'Produce', 'Citrus', 'item', TRUE, FALSE, 21, FALSE, NULL),
        ('Tomato', 'Fresh Vine Tomatoes', 'Produce', 'Nightshades', 'grams', FALSE, TRUE, 10, FALSE, NULL),
        ('Cilantro', 'Fresh Cilantro', 'Produce', 'Fresh Herbs', 'bunches', FALSE, TRUE, 7, FALSE, NULL),
        ('Fresh Dill', 'Fresh Dill', 'Produce', 'Fresh Herbs', 'bunches', FALSE, TRUE, 7, FALSE, NULL),
        ('Spinach', 'Baby Spinach', 'Produce', 'Leafy Greens', 'grams', FALSE, TRUE, 7, FALSE, NULL),
        ('Egg', 'Large Pasture-Raised Eggs', 'Dairy', 'Eggs', 'items', TRUE, TRUE, 30, TRUE, 'Eggs'),
        ('Greek Yogurt', 'Plain Greek Yogurt (0% or 2%)', 'Dairy', 'Cultured Dairy', 'grams', TRUE, TRUE, 21, TRUE, 'Dairy'),
        ('Feta Cheese', 'Crumbled Feta Cheese', 'Dairy', 'Cheese', 'grams', FALSE, TRUE, 30, TRUE, 'Dairy'),
        ('Whole Milk', 'Whole Pasteurized Milk', 'Dairy', 'Liquid Dairy', 'ml', TRUE, TRUE, 14, TRUE, 'Dairy'),
        ('Parmesan Cheese', 'Aged Parmigiano Reggiano', 'Dairy', 'Hard Cheese', 'grams', TRUE, FALSE, 90, TRUE, 'Dairy'),
        ('Atlantic Salmon Fillet', 'Wild Atlantic Salmon Fillet', 'Meat & Seafood', 'Fish', 'grams', FALSE, TRUE, 3, TRUE, 'Fish'),
        ('Chicken Breast', 'Boneless Skinless Chicken Breast', 'Meat & Seafood', 'Poultry', 'grams', FALSE, TRUE, 4, FALSE, NULL),
        ('Ground Turkey', 'Lean Ground Turkey (93/7)', 'Meat & Seafood', 'Poultry', 'grams', FALSE, TRUE, 3, FALSE, NULL),
        ('Shrimp', 'Peeled & Deveined Wild Shrimp', 'Meat & Seafood', 'Shellfish', 'grams', FALSE, TRUE, 3, TRUE, 'Shellfish'),
        ('Jasmine Rice', 'Fragrant Jasmine Rice', 'Grains & Pasta', 'Rice', 'grams', TRUE, FALSE, 365, FALSE, NULL),
        ('Rolled Oats', 'Old Fashioned Rolled Oats', 'Grains & Pasta', 'Cereals', 'grams', TRUE, FALSE, 365, FALSE, NULL),
        ('Sourdough Bread', 'Artisan Sourdough Loaf', 'Bakery', 'Bread', 'slices', FALSE, TRUE, 7, TRUE, 'Wheat'),
        ('Quinoa', 'Organic Tri-Color Quinoa', 'Grains & Pasta', 'Ancient Grains', 'grams', TRUE, FALSE, 365, FALSE, NULL),
        ('Extra Virgin Olive Oil', 'Extra Virgin Olive Oil (Cold-Pressed)', 'Condiments & Oils', 'Cooking Oils', 'ml', TRUE, FALSE, 540, FALSE, NULL),
        ('Soy Sauce', 'Low Sodium Tamari Soy Sauce', 'Condiments & Oils', 'Asian Sauces', 'ml', TRUE, FALSE, 365, TRUE, 'Soy'),
        ('Dijon Mustard', 'Traditional French Dijon Mustard', 'Condiments & Oils', 'Mustards', 'grams', TRUE, FALSE, 180, FALSE, NULL),
        ('Honey', 'Raw Unfiltered Clover Honey', 'Baking & Sweeteners', 'Natural Sweeteners', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Ground Cumin', 'Ground Cumin Seed', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Paprika', 'Sweet Smoked Spanish Paprika', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Red Pepper Flakes', 'Crushed Red Chili Pepper Flakes', 'Spices & Seasonings', 'Chili Flakes', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Kosher Salt', 'Coarse Flake Kosher Salt', 'Spices & Seasonings', 'Salt', 'grams', TRUE, FALSE, 1825, FALSE, NULL),
        ('Black Pepper', 'Freshly Ground Tellicherry Black Pepper', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Crushed Tomatoes', 'Canned San Marzano Crushed Tomatoes', 'Canned & Jarred', 'Canned Vegetables', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Chickpeas', 'Canned Cooked Chickpeas / Garbanzo', 'Canned & Jarred', 'Beans & Legumes', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Black Beans', 'Low-Sodium Canned Black Beans', 'Canned & Jarred', 'Beans & Legumes', 'grams', TRUE, FALSE, 720, FALSE, NULL)
    ) AS s (
        CANONICAL_NAME, DISPLAY_NAME, CATEGORY, SUB_CATEGORY, DEFAULT_UNIT,
        IS_COMMON_PANTRY_STAPLE, IS_PERISHABLE, AVERAGE_SHELF_LIFE_DAYS, IS_ALLERGEN, ALLERGEN_TYPE
    )
) source
ON target.CANONICAL_NAME = source.CANONICAL_NAME
WHEN NOT MATCHED THEN
    INSERT (
        CANONICAL_NAME, DISPLAY_NAME, CATEGORY, SUB_CATEGORY, DEFAULT_UNIT,
        IS_COMMON_PANTRY_STAPLE, IS_PERISHABLE, AVERAGE_SHELF_LIFE_DAYS, IS_ALLERGEN, ALLERGEN_TYPE
    )
    VALUES (
        source.CANONICAL_NAME, source.DISPLAY_NAME, source.CATEGORY, source.SUB_CATEGORY, source.DEFAULT_UNIT,
        source.IS_COMMON_PANTRY_STAPLE, source.IS_PERISHABLE, source.AVERAGE_SHELF_LIFE_DAYS, source.IS_ALLERGEN, source.ALLERGEN_TYPE
    );

-- 3. Populate DIM_NUTRITION
MERGE INTO ANALYTICS.DIM_NUTRITION target
USING (
    WITH ingredient_lookup AS (
        SELECT INGREDIENT_KEY, CANONICAL_NAME FROM ANALYTICS.DIM_INGREDIENTS
    )
    SELECT
        il.INGREDIENT_KEY,
        vals.SERVING_SIZE_GRAMS,
        vals.CALORIES_KCAL,
        vals.PROTEIN_G,
        vals.CARBOHYDRATES_G,
        vals.FAT_G,
        vals.FIBER_G,
        vals.SUGAR_G,
        vals.SODIUM_MG
    FROM (VALUES
        ('Egg', 100.0, 143.0, 12.6, 0.7, 9.5, 0.0, 0.4, 142.0),
        ('Greek Yogurt', 100.0, 59.0, 10.0, 3.6, 0.4, 0.0, 3.2, 36.0),
        ('Feta Cheese', 100.0, 264.0, 14.2, 4.1, 21.3, 0.0, 4.1, 917.0),
        ('Atlantic Salmon Fillet', 100.0, 208.0, 20.4, 0.0, 13.4, 0.0, 0.0, 59.0),
        ('Chicken Breast', 100.0, 165.0, 31.0, 0.0, 3.6, 0.0, 0.0, 74.0),
        ('Asparagus', 100.0, 20.0, 2.2, 3.9, 0.1, 2.1, 1.9, 2.0),
        ('Red Bell Pepper', 100.0, 31.0, 1.0, 6.0, 0.3, 2.1, 4.2, 4.0),
        ('Yellow Onion', 100.0, 40.0, 1.1, 9.3, 0.1, 1.7, 4.2, 4.0),
        ('Garlic', 100.0, 149.0, 6.4, 33.1, 0.5, 2.1, 1.0, 17.0),
        ('Extra Virgin Olive Oil', 100.0, 884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 2.0),
        ('Crushed Tomatoes', 100.0, 32.0, 1.6, 7.3, 0.2, 1.9, 4.4, 186.0),
        ('Jasmine Rice', 100.0, 130.0, 2.7, 28.2, 0.3, 0.4, 0.1, 1.0),
        ('Rolled Oats', 100.0, 379.0, 13.2, 67.7, 6.5, 10.1, 1.0, 6.0),
        ('Chickpeas', 100.0, 164.0, 8.9, 27.4, 2.6, 7.6, 4.8, 24.0)
    ) AS vals (
        CANONICAL_NAME, SERVING_SIZE_GRAMS, CALORIES_KCAL, PROTEIN_G, CARBOHYDRATES_G,
        FAT_G, FIBER_G, SUGAR_G, SODIUM_MG
    )
    JOIN ingredient_lookup il
        ON vals.CANONICAL_NAME = il.CANONICAL_NAME
) source
ON target.INGREDIENT_KEY = source.INGREDIENT_KEY
WHEN NOT MATCHED THEN
    INSERT (
        INGREDIENT_KEY, SERVING_SIZE_GRAMS, CALORIES_KCAL, PROTEIN_G, CARBOHYDRATES_G,
        FAT_G, FIBER_G, SUGAR_G, SODIUM_MG
    )
    VALUES (
        source.INGREDIENT_KEY, source.SERVING_SIZE_GRAMS, source.CALORIES_KCAL, source.PROTEIN_G, source.CARBOHYDRATES_G,
        source.FAT_G, source.FIBER_G, source.SUGAR_G, source.SODIUM_MG
    );

-- ==============================================================================
-- STEP 9: DEPLOYMENT VERIFICATION SMOKE TESTS
-- ==============================================================================
SELECT 'DIM_DATE row count' AS CHECK_ITEM, COUNT(*) AS RECORD_COUNT FROM ANALYTICS.DIM_DATE
UNION ALL
SELECT 'DIM_INGREDIENTS row count', COUNT(*) FROM ANALYTICS.DIM_INGREDIENTS
UNION ALL
SELECT 'DIM_NUTRITION row count', COUNT(*) FROM ANALYTICS.DIM_NUTRITION
UNION ALL
SELECT 'DIM_RECIPES row count', COUNT(*) FROM ANALYTICS.DIM_RECIPES
UNION ALL
SELECT 'FACT_PANTRY_INVENTORY row count', COUNT(*) FROM ANALYTICS.FACT_PANTRY_INVENTORY
UNION ALL
SELECT 'FACT_RECIPE_INGREDIENTS row count', COUNT(*) FROM ANALYTICS.FACT_RECIPE_INGREDIENTS;
