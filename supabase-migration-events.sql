-- Add event fields to tasks table
-- This allows tasks to be marked as events with time and date information

-- Add is_event column to distinguish events from tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_event BOOLEAN DEFAULT FALSE;

-- Add event_time column for storing time of events (stored as TIME type)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS event_time TIME;

-- Add event_date column for events (can be different from due_date)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS event_date DATE;

-- Create index for faster queries on events
CREATE INDEX IF NOT EXISTS idx_tasks_is_event ON tasks(is_event);
CREATE INDEX IF NOT EXISTS idx_tasks_event_date ON tasks(event_date);

-- Note: Events will have:
-- - is_event = true
-- - event_date = the date of the event
-- - event_time = the time of the event
-- - due_date will still be used for grouping/display purposes
