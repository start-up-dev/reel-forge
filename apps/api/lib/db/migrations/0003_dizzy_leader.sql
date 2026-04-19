ALTER TABLE "users" ADD COLUMN "email_notify_ready" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notify_failed" boolean DEFAULT true NOT NULL;