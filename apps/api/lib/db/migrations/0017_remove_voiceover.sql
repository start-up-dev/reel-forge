-- Track 16: Remove ElevenLabs voiceover columns, add dialogue_segments
ALTER TABLE "videos"
  DROP COLUMN IF EXISTS "audio_url",
  DROP COLUMN IF EXISTS "word_timestamps_url",
  DROP COLUMN IF EXISTS "voice_id";--> statement-breakpoint

ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "voice_id";--> statement-breakpoint

ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "dialogue_segments" jsonb;
