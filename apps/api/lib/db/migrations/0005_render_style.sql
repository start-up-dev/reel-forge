-- Add render_style enum and column to videos
CREATE TYPE "public"."render_style" AS ENUM('mascot', 'cartoon', 'animation_2d', 'motion_graphics', 'cinematic', 'stock_footage', 'whiteboard');--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "render_style" "render_style";
