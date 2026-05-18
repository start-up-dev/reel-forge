-- Add action_reel_style column to videos (was missing from all prior migrations)
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "action_reel_style" text;
