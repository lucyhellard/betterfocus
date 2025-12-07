-- Migration: Add sort_order to habits for custom ordering
-- Run this in your Supabase SQL Editor

-- Add sort_order column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Set initial sort_order based on created_at
UPDATE habits SET sort_order = (
  SELECT COUNT(*)
  FROM habits h2
  WHERE h2.created_at <= habits.created_at
) WHERE sort_order IS NULL;

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_habits_sort_order ON habits(sort_order);
