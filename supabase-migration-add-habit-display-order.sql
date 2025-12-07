-- Add display_order column to habits table for custom ordering
ALTER TABLE habits ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set default values based on created_at order
UPDATE habits SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM habits
) AS subquery
WHERE habits.id = subquery.id AND habits.display_order IS NULL;
