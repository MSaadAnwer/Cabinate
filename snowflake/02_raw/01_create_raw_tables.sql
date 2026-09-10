-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Raw Landing Zone Tables
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- Schema: CABINATE_DW.RAW
-- ==============================================================================

USE DATABASE CABINATE_DW;
USE SCHEMA RAW;

-- ------------------------------------------------------------------------------
-- 1. MONGODB_RAW_INGEST
-- Stores raw unstructured scraping payloads, user paste text, and external recipes
-- extracted from the MongoDB 'raw_ingest_payloads' collection.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. MONGODB_RECIPES
-- Stores document extracts from MongoDB 'recipes' collection.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS RAW.MONGODB_RECIPES (
    RECIPE_ID           VARCHAR(64) NOT NULL,
    RAW_DOCUMENT        VARIANT NOT NULL,
    LOADED_AT           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (RECIPE_ID)
)
COMMENT = 'Raw landing table for complete MongoDB recipe documents in VARIANT format';

-- ------------------------------------------------------------------------------
-- 3. MONGODB_PANTRY_ITEMS
-- Stores document extracts from MongoDB 'pantry_items' collection.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS RAW.MONGODB_PANTRY_ITEMS (
    PANTRY_ITEM_ID      VARCHAR(64) NOT NULL,
    RAW_DOCUMENT        VARIANT NOT NULL,
    LOADED_AT           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (PANTRY_ITEM_ID)
)
COMMENT = 'Raw landing table for complete MongoDB pantry_items documents in VARIANT format';
