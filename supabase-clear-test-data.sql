-- Clear habit entries only
-- Run this in your Supabase SQL Editor

-- Clear all habit entries (they were created with wrong week dates)
DELETE FROM habit_entries;

-- Verify table is empty
SELECT 'habit_entries' as table_name, COUNT(*) as remaining_rows FROM habit_entries;

-- You can now go back to the app and re-mark your habits
-- Week 48 will now correctly show Nov 24-30 instead of Nov 23-29
