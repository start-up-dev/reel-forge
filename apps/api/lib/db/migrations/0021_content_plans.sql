CREATE TABLE "content_plans" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "brand_profile_id" uuid NOT NULL REFERENCES "brand_profiles"("id") ON DELETE CASCADE,
  "user_id"          text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start_date"  date NOT NULL,
  "posts_per_day"    integer NOT NULL DEFAULT 1,
  "status"           text NOT NULL DEFAULT 'draft',
  "topics"           jsonb NOT NULL DEFAULT '[]',
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "videos"
  ADD COLUMN "content_plan_id"  uuid REFERENCES "content_plans"("id") ON DELETE SET NULL,
  ADD COLUMN "brand_profile_id" uuid REFERENCES "brand_profiles"("id") ON DELETE SET NULL;
