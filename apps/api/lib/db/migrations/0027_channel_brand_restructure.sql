-- Flip the FK: channels now belong to brands, not the other way around.
-- 1. Add brand_profile_id to social_accounts
ALTER TABLE "social_accounts"
  ADD COLUMN "brand_profile_id" uuid REFERENCES "brand_profiles"("id") ON DELETE SET NULL;

-- 2. Migrate existing links: if a brand_profile had a social_account_id, wire it back
UPDATE "social_accounts" sa
  SET "brand_profile_id" = bp."id"
  FROM "brand_profiles" bp
  WHERE bp."social_account_id" = sa."id";

-- 3. Drop social_account_id from brand_profiles
ALTER TABLE "brand_profiles"
  DROP COLUMN IF EXISTS "social_account_id";
