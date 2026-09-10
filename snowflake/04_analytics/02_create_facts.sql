-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Dimensional Star Schema - Fact Tables
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.ANALYTICS
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA ANALYTICS;

-- ------------------------------------------------------------------------------
-- 1. FACT_PANTRY_INVENTORY
-- Periodic snapshot / current state fact table capturing household pantry items,
-- stock levels, shelf-life horizons, and calculated expiration risk indicators.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ANALYTICS.FACT_PANTRY_INVENTORY (
    INVENTORY_KEY           NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    DATE_KEY                NUMBER(8, 0) NOT NULL,
    INGREDIENT_KEY          NUMBER(38, 0),
    MONGO_PANTRY_ID         VARCHAR(64),
    ITEM_NAME               VARCHAR(255) NOT NULL,
    QUANTITY                FLOAT NOT NULL,
    UNIT                    VARCHAR(64) NOT NULL,
    LOCATION                VARCHAR(64),          -- Refrigerator, Freezer, Pantry Shelf, Spice Rack
    EXPIRATION_DATE         DATE,
    EXPIRATION_DATE_KEY     NUMBER(8, 0),
    DAYS_UNTIL_EXPIRATION   NUMBER(5, 0),
    IS_EXPIRED              BOOLEAN DEFAULT FALSE,
    IS_EXPIRING_SOON        BOOLEAN DEFAULT FALSE, -- True if days until expiration <= 3
    RECORDED_AT             TIMESTAMP_NTZ,
    LOADED_AT               TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (INVENTORY_KEY),
    FOREIGN KEY (DATE_KEY) REFERENCES ANALYTICS.DIM_DATE(DATE_KEY),
    FOREIGN KEY (INGREDIENT_KEY) REFERENCES ANALYTICS.DIM_INGREDIENTS(INGREDIENT_KEY)
)
COMMENT = 'Fact table tracking pantry inventory stock levels, storage locations, and expiration telemetry';

-- ------------------------------------------------------------------------------
-- 2. FACT_RECIPE_INGREDIENTS
-- Granular bridge fact table mapping recipes to required canonical ingredients,
-- with standardized gram weight conversions and calculated macronutrient contributions.
-- ------------------------------------------------------------------------------
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
