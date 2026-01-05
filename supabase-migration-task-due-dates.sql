-- Add due_date column to tasks table
-- This allows tasks to have editable due dates

-- Add due_date column (defaults to the task's date field for existing tasks)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS due_date DATE;

-- For existing tasks, set due_date to match the existing date field
UPDATE tasks
SET due_date = date
WHERE due_date IS NULL;

-- Create index for faster queries on due_date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Note: The 'date' column will remain for backward compatibility
-- New tasks will use 'due_date' as the primary date field
