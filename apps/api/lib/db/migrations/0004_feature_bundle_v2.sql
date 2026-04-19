-- Feature Bundle v2: platforms array, per-video voice + duration
--> statement-breakpoint

-- projects: add platforms array column (migrate from single platform)
ALTER TABLE "projects" ADD COLUMN "platforms" text[] NOT NULL DEFAULT ARRAY['tiktok'];--> statement-breakpoint
UPDATE "projects" SET "platforms" = ARRAY["platform"::text];--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "platform";--> statement-breakpoint

-- projects: make voice_id nullable (voice now chosen per-video in wizard)
ALTER TABLE "projects" ALTER COLUMN "voice_id" DROP NOT NULL;--> statement-breakpoint

-- videos: add target_duration_seconds and per-video voice_id
ALTER TABLE "videos" ADD COLUMN "target_duration_seconds" integer NOT NULL DEFAULT 30;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "voice_id" text;
