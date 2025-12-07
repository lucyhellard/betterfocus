-- Migration: Fix completed/cancelled tasks without completed_at dates
-- This backfills completed_at for tasks that were marked as completed/cancelled
-- but don't have a completed_at date set

-- Add completed_at column to tasks table if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at DATE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);

-- Backfill completed_at for tasks that are completed/cancelled but don't have a completed_at date
-- Set it to their task date (the day they were supposed to be done)
UPDATE tasks
SET completed_at = date
WHERE (status = 'completed' OR status = 'cancelled')
  AND completed_at IS NULL;

-- Note: This will make old completed tasks appear in the completed section
-- If you want them to appear under their original completion date instead of task date,
-- you could set completed_at to created_at::date, but using task date is more logical
