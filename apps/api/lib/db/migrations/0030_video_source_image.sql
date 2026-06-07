ALTER TABLE "videos"
  ADD COLUMN "source_image_gcs_path" text;
--> statement-breakpoint
ALTER TABLE "videos"
  ADD COLUMN "is_podcast" boolean;
