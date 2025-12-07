-- BetterFocus Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit entries table (daily tracking)
CREATE TABLE habit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'grey', 'red', 'yellow')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Projects table (includes both projects and goals)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project', 'goal')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'migrated', 'cancelled')),
  date DATE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_habit_entries_habit_id ON habit_entries(habit_id);
CREATE INDEX idx_habit_entries_date ON habit_entries(date);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Enable Row Level Security (RLS)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies (for single user - adjust when adding authentication)
-- These policies allow all operations for now
CREATE POLICY "Allow all operations on habits" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on habit_entries" ON habit_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO habits (name, target_days) VALUES
  ('5/7d Exercise', 5),
  ('5/7d Journal', 5),
  ('7/7d 1x protein shake', 7);

INSERT INTO projects (title, type, due_date) VALUES
  ('Website Redesign', 'project', '2025-12-31'),
  ('Learn TypeScript', 'goal', '2025-06-30');

-- Sample tasks
INSERT INTO tasks (title, status, date) VALUES
  ('Review project proposal', 'pending', CURRENT_DATE),
  ('Update documentation', 'in_progress', CURRENT_DATE);
