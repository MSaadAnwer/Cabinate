# Technical Architecture & Coding Standards

## Project: Cabinate.com

### 1. Technology Stack
* **Frontend**: React + TypeScript (Vite)
* **Backend API**: Java 21+ with Spring Boot 3.x
* **Base Package**: `com.cabinate.api`
* **Operational Database**: MongoDB
* **Data Warehouse**: Snowflake
* **ETL Lakehouse**: Databricks (PySpark / Python)
* **Agentic AI**: Amazon Bedrock Agents (Anthropic Claude models)

### 2. Backend Architecture Guidelines (Spring Boot N-Tier, Package-by-Feature)
* **Package Structure**:
  * Root: `com.cabinate.api`
  * Slices: `com.cabinate.api.recipe`, `com.cabinate.api.pantry`, `com.cabinate.api.common`
* **Strict Layering Within Slices**:
  * `controller`: Handles HTTP requests/responses, URI routing, and validation. Interacts *only* with DTOs and the Service layer.
  * `service`: Pure business logic, validation, orchestrations, and transactions. Never leaks HTTP specifics.
  * `repository`: Data access abstraction using `MongoRepository` or Spring Data templates.
  * `model`: Mongo document entities (`@Document`).
  * `dto`: Request/Response transfer objects ensuring API contracts are decoupled from database persistence schemas.
* **Separation of Concerns**:
  * MongoDB is strictly the transactional operational database (OLTP) for raw recipe inputs and fast CRUD.
  * Snowflake is the analytical warehouse (OLAP). Heavy analytical queries or macro aggregation must not be offloaded to MongoDB.
