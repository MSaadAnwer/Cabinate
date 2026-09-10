-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Dimensional Star Schema - Dimensions
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.ANALYTICS
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA ANALYTICS;

-- ------------------------------------------------------------------------------
-- 1. DIM_DATE
-- Standard date dimension table supporting pantry expiration timelines,
-- seasonal meal planning, and consumption cadence.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. DIM_INGREDIENTS
-- Conformed canonical ingredient dimension. Unifies varied textual mentions
-- (e.g. "large brown eggs", "egg whites", "beaten egg" -> "Egg").
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ANALYTICS.DIM_INGREDIENTS (
    INGREDIENT_KEY          NUMBER(38, 0) IDENTITY(1, 1) NOT NULL,
    CANONICAL_NAME          VARCHAR(255) NOT NULL,
    DISPLAY_NAME            VARCHAR(255) NOT NULL,
    CATEGORY                VARCHAR(64) NOT NULL, -- Produce, Dairy, Meat & Seafood, Grains & Pasta, Spices, Condiments, etc.
    SUB_CATEGORY            VARCHAR(64),
    DEFAULT_UNIT            VARCHAR(32) DEFAULT 'grams',
    IS_COMMON_PANTRY_STAPLE BOOLEAN DEFAULT FALSE,
    IS_PERISHABLE           BOOLEAN DEFAULT TRUE,
    AVERAGE_SHELF_LIFE_DAYS NUMBER(4, 0),
    IS_ALLERGEN             BOOLEAN DEFAULT FALSE,
    ALLERGEN_TYPE           VARCHAR(64),          -- Dairy, Eggs, Tree Nuts, Peanuts, Wheat, Soy, Fish, Shellfish
    CREATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (INGREDIENT_KEY),
    CONSTRAINT UQ_CANONICAL_NAME UNIQUE (CANONICAL_NAME)
)
COMMENT = 'Conformed canonical ingredient dimension with classification, shelf-life, and allergen tags';

-- ------------------------------------------------------------------------------
-- 3. DIM_NUTRITION
-- Standardized nutritional reference profile per 100 grams for canonical ingredients.
-- Cross-referenced with USDA FoodData Central and public nutrient standards.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. DIM_RECIPES
-- Conformed recipe dimension storing recipe metadata, cooking time parameters,
-- and serving counts.
-- ------------------------------------------------------------------------------
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
    DIFFICULTY              VARCHAR(32),          -- Easy, Medium, Advanced
    CREATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (RECIPE_KEY),
    CONSTRAINT UQ_MONGO_RECIPE_ID UNIQUE (MONGO_RECIPE_ID)
)
COMMENT = 'Recipe dimension storing curated recipe catalog, timing metrics, and serving counts';
