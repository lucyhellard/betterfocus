-- Migration: Add settings table for user preferences
-- Run this in your Supabase SQL Editor

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  timezone TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1) -- Ensure only one row exists
);

-- Insert default settings
INSERT INTO settings (id, timezone)
VALUES (1, 'Australia/Brisbane')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (single-user mode)
CREATE POLICY "Allow all operations on settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);
