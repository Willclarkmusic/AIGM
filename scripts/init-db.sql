-- AIGM Database Initialization Script
-- This script sets up the basic database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (handled by docker-compose environment)
-- The actual table creation will be handled by SQLAlchemy migrations