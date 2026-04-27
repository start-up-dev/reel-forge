-- Track 4: Add video_type and talking_subtype enums + columns
-- bgm_volume default updated from 30 to 15 (15% BGM mix for generated videos)

CREATE TYPE "public"."video_type" AS ENUM('generated', 'talking');--> statement-breakpoint
CREATE TYPE "public"."talking_subtype" AS ENUM('ugc', 'short_film', 'interview', 'explainer', 'podcast_clip');--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "video_type" "video_type" DEFAULT 'generated' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "talking_subtype" "talking_subtype";--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "bgm_volume" SET DEFAULT 15;
