-- ============================================================
-- LifeLink Blood Donation System
-- Migration 001: Extensions
-- ============================================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic distance calculations
-- Used internally for nearby donor matching — never exposed to patients
CREATE EXTENSION IF NOT EXISTS postgis;
