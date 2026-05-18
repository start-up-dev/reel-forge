-- Remove project-based columns from videos
ALTER TABLE videos DROP COLUMN IF EXISTS project_id;
ALTER TABLE videos DROP COLUMN IF EXISTS ugc_character_description;
ALTER TABLE videos DROP COLUMN IF EXISTS character_base_gcs_path;

-- Drop the old composite index and recreate without project_id
DROP INDEX IF EXISTS videos_user_project_status_idx;
CREATE INDEX IF NOT EXISTS videos_user_status_idx ON videos (user_id, status);

-- Drop projects table (cascade removes FK constraints referencing it)
DROP TABLE IF EXISTS projects CASCADE;
