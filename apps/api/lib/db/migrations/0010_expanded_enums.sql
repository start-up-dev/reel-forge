-- Expand video_style and tone enums with new content categories
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'trending';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'reaction';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'day_in_life';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'challenge';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'unboxing';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'transformation';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'commentary';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'behind_scenes';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'comedy';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'tips';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'storytime';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'showcase';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'comparison';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'rant';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'news';
ALTER TYPE "public"."video_style" ADD VALUE IF NOT EXISTS 'asmr';

ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'energetic';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'empathetic';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'bold';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'mysterious';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'friendly';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'urgent';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'chill';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'playful';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'raw';
ALTER TYPE "public"."tone" ADD VALUE IF NOT EXISTS 'sarcastic';
