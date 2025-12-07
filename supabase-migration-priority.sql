-- Add is_priority column to tasks table
-- Run this migration in your Supabase SQL Editor

ALTER TABLE tasks
ADD COLUMN is_priority BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_tasks_is_priority ON tasks(is_priority);
