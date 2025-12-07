-- Add display_order column to projects table for custom ordering
ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set default values based on created_at order
UPDATE projects SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM projects
) AS subquery
WHERE projects.id = subquery.id AND projects.display_order IS NULL;
