-- Migration: Add weekly notes for habits
-- This allows users to add notes specific to each week

-- Create habit_weekly_notes table
CREATE TABLE IF NOT EXISTS habit_weekly_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- Create index for querying by week
CREATE INDEX IF NOT EXISTS idx_habit_weekly_notes_week_year ON habit_weekly_notes(week_number, year);

-- Enable Row Level Security
ALTER TABLE habit_weekly_notes ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all operations for single user)
CREATE POLICY "Allow all operations on habit_weekly_notes"
ON habit_weekly_notes FOR ALL
USING (true)
WITH CHECK (true);
