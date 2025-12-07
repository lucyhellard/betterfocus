-- Add tag column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tag VARCHAR(20);

-- Add tag_color column to projects table for custom colors
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tag_color VARCHAR(7) DEFAULT '#3b82f6';
