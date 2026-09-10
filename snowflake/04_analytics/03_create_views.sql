-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Analytical Views & Agent Marts
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.ANALYTICS
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA ANALYTICS;

-- ------------------------------------------------------------------------------
-- 1. V_PANTRY_EXPIRING_ITEMS
-- Returns all active pantry stock classified by expiration urgency.
-- Used by the frontend alerts banner and Bedrock Agent meal waste prevention.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. V_RECIPE_NUTRITION_PROFILES
-- Aggregated nutritional breakdown per recipe and calculated per-serving macros.
-- Tailored specifically for Amazon Bedrock Agent Text-to-SQL queries:
-- "Find me high protein recipes (>30g) ready in under 30 minutes".
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. V_PANTRY_RECIPE_FEASIBILITY
-- Real-time match matrix cross-referencing available pantry stock against recipe
-- requirements to determine what meals can be cooked right now or with few items.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW ANALYTICS.V_PANTRY_RECIPE_FEASIBILITY AS
WITH active_pantry_ingredients AS (
    -- Unique active ingredients present in the pantry that are unexpired
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
