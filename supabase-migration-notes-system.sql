-- Migration: Comprehensive Notes System
-- This creates tables for rich text notes with images, tags, and search functionality

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Stores Tiptap JSON content
  plain_text TEXT, -- Extracted plain text for search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}', -- Array of tags
  search_vector tsvector -- For full-text search
);

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);

-- Create index for task_id lookups
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON notes(task_id);

-- Create index for project_id lookups
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);

-- Create index for tags
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- Create index for updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- Create function to automatically update search_vector and plain_text
CREATE OR REPLACE FUNCTION update_notes_search_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract plain text from Tiptap JSON content
  -- This is a simplified extraction - will capture text from basic nodes
  NEW.plain_text := regexp_replace(
    NEW.content::text,
    '"text":"([^"]+)"',
    '\1',
    'g'
  );

  -- Update search vector from title and plain text
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.plain_text, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tags, '{}'), ' ')), 'C');

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search fields on insert/update
DROP TRIGGER IF EXISTS trigger_update_notes_search ON notes;
CREATE TRIGGER trigger_update_notes_search
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_search_fields();

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all operations for single user app)
-- Since this is a single-user app with no auth, allow all operations
-- Data is still private to your Supabase instance
DROP POLICY IF EXISTS "Allow all operations on notes" ON notes;
CREATE POLICY "Allow all operations on notes"
ON notes FOR ALL
USING (true)
WITH CHECK (true);

-- Create images table for inline images in notes
CREATE TABLE IF NOT EXISTS note_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  url TEXT NOT NULL, -- Public URL
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for note_id lookups
CREATE INDEX IF NOT EXISTS idx_note_images_note_id ON note_images(note_id);

-- Enable Row Level Security
ALTER TABLE note_images ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all operations for single user)
DROP POLICY IF EXISTS "Allow all operations on note_images" ON note_images;
CREATE POLICY "Allow all operations on note_images"
ON note_images FOR ALL
USING (true)
WITH CHECK (true);
