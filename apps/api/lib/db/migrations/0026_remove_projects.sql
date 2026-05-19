ALTER TABLE "videos" DROP COLUMN IF EXISTS "project_id";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "ugc_character_description";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "character_base_gcs_path";--> statement-breakpoint
DROP INDEX IF EXISTS "videos_user_project_status_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_user_status_idx" ON "videos" ("user_id", "status");--> statement-breakpoint
DROP TABLE IF EXISTS "projects" CASCADE;
