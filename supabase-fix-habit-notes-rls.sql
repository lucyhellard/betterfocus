-- Fix RLS policies for habit_weekly_notes table

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on habit_weekly_notes" ON habit_weekly_notes;

-- Enable Row Level Security
ALTER TABLE habit_weekly_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for single user app)
CREATE POLICY "Allow all operations on habit_weekly_notes"
ON habit_weekly_notes FOR ALL
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'habit_weekly_notes';
