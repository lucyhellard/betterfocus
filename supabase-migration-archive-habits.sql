-- Migration: Add archive functionality to habits
-- Run this in your Supabase SQL Editor

-- Add archived column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for filtering archived habits
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived);
