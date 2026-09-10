-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Reference Dimension Seeds & Standard Nutritional Data
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.ANALYTICS
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA ANALYTICS;

-- ------------------------------------------------------------------------------
-- 1. Populate DIM_DATE (3-Year Calendar: 2025-01-01 to 2027-12-31)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. Populate DIM_INGREDIENTS (Canonical Pantry Staples & Fresh Ingredients)
-- ------------------------------------------------------------------------------
MERGE INTO ANALYTICS.DIM_INGREDIENTS target
USING (
    SELECT * FROM (VALUES
        -- Produce
        ('Garlic', 'Fresh Garlic', 'Produce', 'Alliums', 'cloves', TRUE, FALSE, 90, FALSE, NULL),
        ('Yellow Onion', 'Yellow Onion', 'Produce', 'Alliums', 'item', TRUE, FALSE, 60, FALSE, NULL),
        ('Red Bell Pepper', 'Red Bell Pepper', 'Produce', 'Vegetables', 'item', FALSE, TRUE, 14, FALSE, NULL),
        ('Asparagus', 'Fresh Asparagus', 'Produce', 'Vegetables', 'grams', FALSE, TRUE, 7, FALSE, NULL),
        ('Lemon', 'Fresh Lemon', 'Produce', 'Citrus', 'item', TRUE, FALSE, 21, FALSE, NULL),
        ('Tomato', 'Fresh Vine Tomatoes', 'Produce', 'Nightshades', 'grams', FALSE, TRUE, 10, FALSE, NULL),
        ('Cilantro', 'Fresh Cilantro', 'Produce', 'Fresh Herbs', 'bunches', FALSE, TRUE, 7, FALSE, NULL),
        ('Fresh Dill', 'Fresh Dill', 'Produce', 'Fresh Herbs', 'bunches', FALSE, TRUE, 7, FALSE, NULL),
        ('Spinach', 'Baby Spinach', 'Produce', 'Leafy Greens', 'grams', FALSE, TRUE, 7, FALSE, NULL),
        
        -- Dairy & Eggs
        ('Egg', 'Large Pasture-Raised Eggs', 'Dairy', 'Eggs', 'items', TRUE, TRUE, 30, TRUE, 'Eggs'),
        ('Greek Yogurt', 'Plain Greek Yogurt (0% or 2%)', 'Dairy', 'Cultured Dairy', 'grams', TRUE, TRUE, 21, TRUE, 'Dairy'),
        ('Feta Cheese', 'Crumbled Feta Cheese', 'Dairy', 'Cheese', 'grams', FALSE, TRUE, 30, TRUE, 'Dairy'),
        ('Whole Milk', 'Whole Pasteurized Milk', 'Dairy', 'Liquid Dairy', 'ml', TRUE, TRUE, 14, TRUE, 'Dairy'),
        ('Parmesan Cheese', 'Aged Parmigiano Reggiano', 'Dairy', 'Hard Cheese', 'grams', TRUE, FALSE, 90, TRUE, 'Dairy'),
        
        -- Meat & Seafood
        ('Atlantic Salmon Fillet', 'Wild Atlantic Salmon Fillet', 'Meat & Seafood', 'Fish', 'grams', FALSE, TRUE, 3, TRUE, 'Fish'),
        ('Chicken Breast', 'Boneless Skinless Chicken Breast', 'Meat & Seafood', 'Poultry', 'grams', FALSE, TRUE, 4, FALSE, NULL),
        ('Ground Turkey', 'Lean Ground Turkey (93/7)', 'Meat & Seafood', 'Poultry', 'grams', FALSE, TRUE, 3, FALSE, NULL),
        ('Shrimp', 'Peeled & Deveined Wild Shrimp', 'Meat & Seafood', 'Shellfish', 'grams', FALSE, TRUE, 3, TRUE, 'Shellfish'),

        -- Grains, Pasta & Bakery
        ('Jasmine Rice', 'Fragrant Jasmine Rice', 'Grains & Pasta', 'Rice', 'grams', TRUE, FALSE, 365, FALSE, NULL),
        ('Rolled Oats', 'Old Fashioned Rolled Oats', 'Grains & Pasta', 'Cereals', 'grams', TRUE, FALSE, 365, FALSE, NULL),
        ('Sourdough Bread', 'Artisan Sourdough Loaf', 'Bakery', 'Bread', 'slices', FALSE, TRUE, 7, TRUE, 'Wheat'),
        ('Quinoa', 'Organic Tri-Color Quinoa', 'Grains & Pasta', 'Ancient Grains', 'grams', TRUE, FALSE, 365, FALSE, NULL),

        -- Oils & Condiments
        ('Extra Virgin Olive Oil', 'Extra Virgin Olive Oil (Cold-Pressed)', 'Condiments & Oils', 'Cooking Oils', 'ml', TRUE, FALSE, 540, FALSE, NULL),
        ('Soy Sauce', 'Low Sodium Tamari Soy Sauce', 'Condiments & Oils', 'Asian Sauces', 'ml', TRUE, FALSE, 365, TRUE, 'Soy'),
        ('Dijon Mustard', 'Traditional French Dijon Mustard', 'Condiments & Oils', 'Mustards', 'grams', TRUE, FALSE, 180, FALSE, NULL),
        ('Honey', 'Raw Unfiltered Clover Honey', 'Baking & Sweeteners', 'Natural Sweeteners', 'grams', TRUE, FALSE, 720, FALSE, NULL),

        -- Spices & Seasonings
        ('Ground Cumin', 'Ground Cumin Seed', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Paprika', 'Sweet Smoked Spanish Paprika', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Red Pepper Flakes', 'Crushed Red Chili Pepper Flakes', 'Spices & Seasonings', 'Chili Flakes', 'grams', TRUE, FALSE, 720, FALSE, NULL),
        ('Kosher Salt', 'Coarse Flake Kosher Salt', 'Spices & Seasonings', 'Salt', 'grams', TRUE, FALSE, 1825, FALSE, NULL),
        ('Black Pepper', 'Freshly Ground Tellicherry Black Pepper', 'Spices & Seasonings', 'Ground Spices', 'grams', TRUE, FALSE, 720, FALSE, NULL),

        -- Canned & Dry Goods
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

-- ------------------------------------------------------------------------------
-- 3. Populate DIM_NUTRITION (Standard USDA Reference Values per 100g)
-- ------------------------------------------------------------------------------
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
