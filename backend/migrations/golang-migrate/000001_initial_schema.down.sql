-- Rollback initial schema migration for auth-service
-- This drops all tables and extensions

-- Drop all foreign key constraints first (handled by CASCADE)
-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS group_services CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS role_groups CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop extension (be careful - this might affect other applications)
-- DROP EXTENSION IF EXISTS "pgcrypto";