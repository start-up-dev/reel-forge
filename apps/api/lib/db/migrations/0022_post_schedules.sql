CREATE TABLE "post_schedules" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id"          uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "social_account_id" uuid NOT NULL REFERENCES "social_accounts"("id") ON DELETE CASCADE,
  "scheduled_at"      timestamp,
  "post_type"         text NOT NULL DEFAULT 'draft',
  "platform_post_id"  text,
  "status"            text NOT NULL DEFAULT 'pending',
  "error_message"     text,
  "created_at"        timestamp NOT NULL DEFAULT now(),
  "updated_at"        timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "content_plans"
  ADD COLUMN "post_type" text NOT NULL DEFAULT 'draft';
