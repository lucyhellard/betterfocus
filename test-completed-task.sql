-- Create a test task that was created on 3-Dec and completed on 4-Dec
-- Run this in your Supabase SQL Editor

INSERT INTO tasks (title, status, date, created_at, completed_at, is_backlog)
VALUES (
  'Test completed task from Dec 3rd',
  'completed',
  '2025-12-03',
  '2025-12-03 10:00:00+00',
  '2025-12-04',
  false
);
