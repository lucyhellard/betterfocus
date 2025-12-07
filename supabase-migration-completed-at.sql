-- Migration: Add completed_at to tasks for tracking completion date
-- Run this in your Supabase SQL Editor

-- Add completed_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at DATE;

-- Add index for filtering by completion date
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
