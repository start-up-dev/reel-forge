CREATE TYPE "public"."clip_request_status" AS ENUM('queued', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('none', 'starter', 'pro');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'youtube_shorts', 'facebook_reels');--> statement-breakpoint
CREATE TYPE "public"."subtitle_style" AS ENUM('bold_pop', 'word_highlight', 'minimal', 'cinematic');--> statement-breakpoint
CREATE TYPE "public"."tone" AS ENUM('casual', 'professional', 'humorous', 'inspirational', 'dramatic');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('DRAFT', 'BRAINSTORM_PENDING', 'SCRIPT_PENDING', 'SCRIPT_READY', 'VOICE_PENDING', 'VOICE_READY', 'SCENES_PENDING', 'SCENES_READY', 'CLIPS_QUEUED', 'CLIPS_PROCESSING', 'ASSEMBLY_PENDING', 'ASSEMBLY_PROCESSING', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."video_style" AS ENUM('educational', 'motivational', 'storytelling', 'listicle', 'tutorial', 'pov');--> statement-breakpoint
CREATE TABLE "clip_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scene_index" integer NOT NULL,
	"visual_prompt" text NOT NULL,
	"base_image_url" text NOT NULL,
	"status" "clip_request_status" DEFAULT 'queued' NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"clip_url" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"platform" "platform" NOT NULL,
	"niche" text NOT NULL,
	"language" text NOT NULL,
	"target_audience" text NOT NULL,
	"video_style" "video_style" NOT NULL,
	"tone" "tone" NOT NULL,
	"voice_id" text NOT NULL,
	"default_subtitle_style" "subtitle_style",
	"default_bgm_enabled" boolean DEFAULT false NOT NULL,
	"default_bgm_asset_id" text,
	"claude_system_prompt" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"scene_index" integer NOT NULL,
	"text_excerpt" text NOT NULL,
	"visual_prompt" text NOT NULL,
	"duration_hint_seconds" integer,
	"base_image_url" text,
	"base_image_path" text,
	"clip_url" text,
	"clip_path" text,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"plan" "plan_type" DEFAULT 'none' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_paid" boolean DEFAULT false NOT NULL,
	"trial_video_remaining" integer DEFAULT 0 NOT NULL,
	"videos_today" integer DEFAULT 0 NOT NULL,
	"videos_this_month" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer DEFAULT 0 NOT NULL,
	"monthly_limit" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "video_status" DEFAULT 'DRAFT' NOT NULL,
	"idea" text,
	"script" text,
	"audio_url" text,
	"word_timestamps_url" text,
	"duration_seconds" integer,
	"subtitle_style" "subtitle_style" DEFAULT 'bold_pop' NOT NULL,
	"bgm_enabled" boolean DEFAULT false NOT NULL,
	"bgm_asset_id" text,
	"bgm_volume" integer DEFAULT 30 NOT NULL,
	"output_url" text,
	"error" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clip_requests" ADD CONSTRAINT "clip_requests_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_requests" ADD CONSTRAINT "clip_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clip_requests_status_queued_at_idx" ON "clip_requests" USING btree ("status","queued_at");--> statement-breakpoint
CREATE INDEX "clip_requests_video_id_idx" ON "clip_requests" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenes_video_id_idx" ON "scenes" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_user_project_status_idx" ON "videos" USING btree ("user_id","project_id","status");