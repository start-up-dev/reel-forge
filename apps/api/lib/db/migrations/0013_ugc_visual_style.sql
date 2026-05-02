ALTER TABLE "videos" DROP COLUMN "talking_subtype";
DROP TYPE IF EXISTS "public"."talking_subtype";
ALTER TABLE "videos" ADD COLUMN "ugc_visual_style" text;
