import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planTypeEnum = pgEnum("plan_type", ["none", "starter", "pro"]);

export const platformEnum = pgEnum("platform", [
  "tiktok",
  "instagram",
  "youtube_shorts",
  "facebook_reels",
]);

export const videoStyleEnum = pgEnum("video_style", [
  "cinematic",
  "vlog",
  "animated",
  "documentary",
]);

export const toneEnum = pgEnum("tone", [
  "energetic",
  "calm",
  "motivational",
  "humorous",
  "professional",
]);

export const subtitleStyleEnum = pgEnum("subtitle_style", [
  "bold_pop",
  "word_highlight",
  "minimal",
  "cinematic",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "DRAFT",
  "BRAINSTORM_PENDING",
  "SCRIPT_PENDING",
  "SCRIPT_READY",
  "VOICE_PENDING",
  "VOICE_READY",
  "SCENES_PENDING",
  "SCENES_READY",
  "CLIPS_QUEUED",
  "CLIPS_PROCESSING",
  "ASSEMBLY_PENDING",
  "ASSEMBLING",
  "COMPLETE",
  "FAILED",
]);

export const clipRequestStatusEnum = pgEnum("clip_request_status", [
  "queued",
  "processing",
  "done",
  "failed",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  plan: planTypeEnum("plan").notNull().default("none"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  trialPaid: boolean("trial_paid").notNull().default(false),
  trialVideoRemaining: integer("trial_video_remaining").notNull().default(1),
  videosToday: integer("videos_today").notNull().default(0),
  videosThisMonth: integer("videos_this_month").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(0),
  monthlyLimit: integer("monthly_limit").notNull().default(0),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    platform: platformEnum("platform").notNull(),
    niche: text("niche"),
    targetAudience: text("target_audience"),
    tone: toneEnum("tone"),
    voiceId: text("voice_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: videoStatusEnum("status").notNull().default("DRAFT"),
    idea: text("idea"),
    script: text("script"),
    audioUrl: text("audio_url"),
    wordTimestampsUrl: text("word_timestamps_url"),
    durationSeconds: real("duration_seconds"),
    subtitleStyle: subtitleStyleEnum("subtitle_style")
      .notNull()
      .default("bold_pop"),
    bgmEnabled: boolean("bgm_enabled").notNull().default(false),
    bgmAssetId: text("bgm_asset_id"),
    bgmVolume: real("bgm_volume").notNull().default(0.3),
    outputUrl: text("output_url"),
    error: text("error"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("videos_user_id_idx").on(t.userId),
    index("videos_user_project_status_idx").on(t.userId, t.projectId, t.status),
  ],
);

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    visualPrompt: text("visual_prompt").notNull(),
    durationHintSeconds: real("duration_hint_seconds"),
    baseImageUrl: text("base_image_url"),
    baseImagePath: text("base_image_path"),
    clipUrl: text("clip_url"),
    clipPath: text("clip_path"),
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scenes_video_id_idx").on(t.videoId)],
);

export const clipRequests = pgTable(
  "clip_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    sceneIndex: integer("scene_index").notNull(),
    status: clipRequestStatusEnum("status").notNull().default("queued"),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    clipUrl: text("clip_url"),
    error: text("error"),
  },
  (t) => [
    index("clip_requests_status_queued_at_idx").on(t.status, t.queuedAt),
    index("clip_requests_video_id_idx").on(t.videoId),
  ],
);

// ─── Inferred types (re-exported for packages/types to consume) ───────────────

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ProjectRow = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type VideoRow = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type SceneRow = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;

export type ClipRequestRow = typeof clipRequests.$inferSelect;
export type NewClipRequest = typeof clipRequests.$inferInsert;
