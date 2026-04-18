ALTER TABLE "clip_requests" ADD COLUMN "motion_prompt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "motion_prompt" text DEFAULT '' NOT NULL;