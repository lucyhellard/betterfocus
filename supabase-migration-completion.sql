-- Migration: Add completion tracking to projects/goals
-- Run this in your Supabase SQL Editor

-- Add completed_at column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at DATE;

-- Add index for querying completed projects
CREATE INDEX IF NOT EXISTS idx_projects_completed_at ON projects(completed_at);
