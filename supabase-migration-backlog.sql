-- Add is_backlog column to tasks table
-- Run this migration in your Supabase SQL Editor

ALTER TABLE tasks
ADD COLUMN is_backlog BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_tasks_is_backlog ON tasks(is_backlog);
