CREATE TABLE "social_accounts" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform"         text NOT NULL,
  "page_id"          text NOT NULL,
  "page_name"        text NOT NULL,
  "page_avatar_url"  text,
  "access_token"     text NOT NULL,
  "token_expires_at" timestamp,
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "platform", "page_id")
);
