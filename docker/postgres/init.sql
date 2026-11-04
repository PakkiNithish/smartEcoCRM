-- PostgreSQL Initialization Script
-- Executed on initial database container creation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure alembic_version supports long revision strings in PostgreSQL
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(255) NOT NULL PRIMARY KEY
);
