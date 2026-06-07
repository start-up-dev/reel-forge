ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "source_image_gcs_path" text;
--> statement-breakpoint
ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "is_podcast" boolean;
