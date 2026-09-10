-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Staging Layer Tables
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.STAGING
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA STAGING;

-- ------------------------------------------------------------------------------
-- 1. STG_RECIPES
-- Cleaned, flattened recipe records extracted from MongoDB or raw ingest payloads
-- by Databricks PySpark prior to dimensional loading.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. STG_RECIPE_INGREDIENTS
-- Structured tokenized ingredients extracted from unstructured recipe ingredient lines
-- via PySpark regex / NLP parsing.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. STG_PANTRY_ITEMS
-- Cleaned snapshot records of pantry stock items.
-- ------------------------------------------------------------------------------
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
