-- ==============================================================================
-- CABINATE DATA LAKEHOUSE: Snowflake Database, Schemas, Warehouse & RBAC Setup
-- Milestone 3: Data Lakehouse & ETL Pipeline
-- ==============================================================================

USE ROLE ACCOUNTADMIN;

-- ------------------------------------------------------------------------------
-- 1. Virtual Warehouse Creation
-- ------------------------------------------------------------------------------
CREATE WAREHOUSE IF NOT EXISTS CABINATE_WH
    WITH 
    WAREHOUSE_SIZE = 'X-SMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    INITIALLY_SUSPENDED = TRUE
    COMMENT = 'Virtual warehouse for Cabinate ETL ingestion, dbt transformations, and agentic queries';

USE WAREHOUSE CABINATE_WH;

-- ------------------------------------------------------------------------------
-- 2. Database Creation
-- ------------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS CABINATE_DW
    COMMENT = 'Cabinate Analytical Data Warehouse hosting Raw Lake, Staging, and Analytics Star Schema';

USE DATABASE CABINATE_DW;

-- ------------------------------------------------------------------------------
-- 3. Schema Architecture (Multi-Tier Lakehouse)
-- ------------------------------------------------------------------------------
-- RAW: Landing schema storing raw JSON/BSON documents as VARIANT types
CREATE SCHEMA IF NOT EXISTS CABINATE_DW.RAW
    COMMENT = 'Raw landing schema for unprocessed MongoDB extracts and web scraping payloads';

-- STAGING: Cleaned, parsed, and tokenized tabular data ready for dimensional loading
CREATE SCHEMA IF NOT EXISTS CABINATE_DW.STAGING
    COMMENT = 'Staging schema containing cleaned, tokenized, and typed intermediate tables';

-- ANALYTICS: Conformed Dimensional Star Schema and analytical marts
CREATE SCHEMA IF NOT EXISTS CABINATE_DW.ANALYTICS
    COMMENT = 'Production analytical star schema (Dimensions, Facts, and Materialized Views)';

-- ------------------------------------------------------------------------------
-- 4. Role-Based Access Control (RBAC) Setup
-- ------------------------------------------------------------------------------

-- CABINATE_ADMIN: Administrative role with full privileges over CABINATE_DW
CREATE ROLE IF NOT EXISTS CABINATE_ADMIN;

-- CABINATE_ETL_ROLE: Role for Databricks / PySpark data pipeline services (Read/Write)
CREATE ROLE IF NOT EXISTS CABINATE_ETL_ROLE;

-- CABINATE_AGENT_ROLE: Read-only role for Bedrock LLM Agent Text-to-SQL execution
CREATE ROLE IF NOT EXISTS CABINATE_AGENT_ROLE;

-- Grant warehouse usage
GRANT USAGE, OPERATE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_ADMIN;
GRANT USAGE, OPERATE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE ON WAREHOUSE CABINATE_WH TO ROLE CABINATE_AGENT_ROLE;

-- Grant Database privileges
GRANT ALL PRIVILEGES ON DATABASE CABINATE_DW TO ROLE CABINATE_ADMIN;
GRANT USAGE ON DATABASE CABINATE_DW TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE ON DATABASE CABINATE_DW TO ROLE CABINATE_AGENT_ROLE;

-- Schema Privileges for ETL (PySpark Pipeline)
GRANT ALL PRIVILEGES ON SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT USAGE, CREATE TABLE, CREATE VIEW ON SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;

-- Future Grants for ETL on existing & new tables in RAW, STAGING, ANALYTICS
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.RAW TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.STAGING TO ROLE CABINATE_ETL_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_ETL_ROLE;

-- Schema Privileges for Bedrock AI Agent (Read-Only access to ANALYTICS)
GRANT USAGE ON SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON FUTURE TABLES IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;
GRANT SELECT ON FUTURE VIEWS IN SCHEMA CABINATE_DW.ANALYTICS TO ROLE CABINATE_AGENT_ROLE;

-- Grant roles to ACCOUNTADMIN for inheritance and governance
GRANT ROLE CABINATE_ADMIN TO ROLE ACCOUNTADMIN;
GRANT ROLE CABINATE_ETL_ROLE TO ROLE CABINATE_ADMIN;
GRANT ROLE CABINATE_AGENT_ROLE TO ROLE CABINATE_ADMIN;
