import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planTypeEnum = pgEnum("plan_type", ["none", "try_out", "starter", "pro"]);


// PRD §7.2 — corrected values (was: cinematic, vlog, animated, documentary)
export const videoStyleEnum = pgEnum("video_style", [
  "educational",
  "motivational",
  "storytelling",
  "listicle",
  "tutorial",
  "pov",
  "trending",
  "reaction",
  "day_in_life",
  "challenge",
  "unboxing",
  "transformation",
  "commentary",
  "behind_scenes",
  "comedy",
  "tips",
  "storytime",
  "showcase",
  "comparison",
  "rant",
  "news",
  "asmr",
]);

// PRD §7.2 — corrected values (was: energetic, calm, motivational, humorous, professional)
export const toneEnum = pgEnum("tone", [
  "casual",
  "professional",
  "humorous",
  "inspirational",
  "dramatic",
  "energetic",
  "empathetic",
  "bold",
  "mysterious",
  "friendly",
  "urgent",
  "chill",
  "playful",
  "raw",
  "sarcastic",
]);

export const subtitleStyleEnum = pgEnum("subtitle_style", [
  "bold_pop",
  "word_highlight",
  "minimal",
  "cinematic",
  "neon_glow",
  "oversized_pop",
  "grouped_bold",
  "grouped_cinematic",
  "karaoke",
]);

// PRD §7.3 — added ASSEMBLY_PROCESSING between ASSEMBLY_PENDING and COMPLETE
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
  "CLIPS_NEEDS_REVIEW",
  "ASSEMBLY_PENDING",
  "ASSEMBLY_PROCESSING",
  "COMPLETE",
  "FAILED",
]);

export const clipRequestStatusEnum = pgEnum("clip_request_status", [
  "queued",
  "processing",
  "done",
  "failed",
]);

export const renderStyleEnum = pgEnum("render_style", [
  "mascot",
  "cartoon",
  "animation_2d",
  "motion_graphics",
  "cinematic",
  "stock_footage",
  "whiteboard",
]);

export const videoTypeEnum = pgEnum("video_type", ["generated", "talking", "action_reel"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * users — PK is the Clerk user ID (text), per PRD §9.
 * No separate clerkId column — Clerk ID IS the primary key.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),                          // Clerk user ID
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  plan: planTypeEnum("plan").notNull().default("none"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialPaid: boolean("trial_paid").notNull().default(false),
  trialVideoRemaining: integer("trial_video_remaining").notNull().default(0), // Fixed: default 0, set to 1 on $2 payment
  videosToday: integer("videos_today").notNull().default(0),
  videosThisMonth: integer("videos_this_month").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(0),
  monthlyLimit: integer("monthly_limit").notNull().default(0),
  lastResetAt: timestamp("last_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  emailNotifyReady: boolean("email_notify_ready").notNull().default(true),
  emailNotifyFailed: boolean("email_notify_failed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * videos — userId is text FK.
 * Fixed: bgmVolume is integer 0–100 (was: real 0.0–1.0, PRD §9 says integer).
 */
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: videoStatusEnum("status").notNull().default("DRAFT"),
    idea: text("idea"),
    script: text("script"),
    durationSeconds: integer("duration_seconds"),
    subtitleStyle: subtitleStyleEnum("subtitle_style")
      .notNull()
      .default("bold_pop"),
    bgmEnabled: boolean("bgm_enabled").notNull().default(false),
    bgmAssetId: text("bgm_asset_id"),
    bgmVolume: integer("bgm_volume").notNull().default(15),   // integer 0–100; 15 = 15% BGM mix
    targetDurationSeconds: integer("target_duration_seconds").notNull().default(30),
    videoType: videoTypeEnum("video_type").notNull().default("generated"),
    ugcVisualStyle: text("ugc_visual_style"),
    actionReelStyle: text("action_reel_style"),
    voiceSpeed: real("voice_speed").notNull().default(1.0),
    sceneCount: integer("scene_count").notNull().default(0),
    renderStyle: renderStyleEnum("render_style"),
    dialogueSegments: jsonb("dialogue_segments"),
    contentPlanId: uuid("content_plan_id").references(() => contentPlans.id, { onDelete: "set null" }),
    brandProfileId: uuid("brand_profile_id").references(() => brandProfiles.id, { onDelete: "set null" }),
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
    index("videos_user_status_idx").on(t.userId, t.status),
  ],
);

/**
 * scenes — added textExcerpt (PRD §9 + spec Step 4 scene card).
 * Renamed: index → sceneIndex to match PRD §7.6 JSON shape.
 * Kept: baseImagePath, clipPath for R2 asset management (not in PRD schema
 * but needed for signed URL generation and async deletion).
 */
export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    sceneIndex: integer("scene_index").notNull(),
    textExcerpt: text("text_excerpt").notNull(),
    visualPrompt: text("visual_prompt").notNull(),
    motionPrompt: text("motion_prompt").notNull().default(""),
    durationHintSeconds: integer("duration_hint_seconds"),
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

/**
 * clip_requests — aligned to PRD §7.7 / §9.
 * Removed: sceneId FK (not in PRD; scene linked via videoId + sceneIndex).
 * Added: userId (for queue ownership tracking), visualPrompt, baseImageUrl
 *        (denormalised from scenes so the extension gets everything in one query).
 */
export const clipRequests = pgTable(
  "clip_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sceneIndex: integer("scene_index").notNull(),
    visualPrompt: text("visual_prompt").notNull(),
    motionPrompt: text("motion_prompt").notNull().default(""),
    baseImageUrl: text("base_image_url"),
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

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brandProfileId: uuid("brand_profile_id").references(() => brandProfiles.id, {
      onDelete: "set null",
    }),
    platform: text("platform").notNull(),
    pageId: text("page_id").notNull(),
    pageName: text("page_name").notNull(),
    pageAvatarUrl: text("page_avatar_url"),
    accessToken: text("access_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("social_accounts_user_id_idx").on(t.userId)],
);

export const brandProfiles = pgTable(
  "brand_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    niche: text("niche").notNull(),
    nicheDescription: text("niche_description"),
    targetAudienceAge: text("target_audience_age"),
    targetAudienceVibe: text("target_audience_vibe"),
    tone: text("tone").notNull(),
    visualStyle: text("visual_style").notNull(),
    characterType: text("character_type").notNull(),
    characterDescription: text("character_description"),
    characterSheetGcsPath: text("character_sheet_gcs_path"),
    logoGcsPath: text("logo_gcs_path"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    referenceVideoUrl: text("reference_video_url"),
    websiteUrl: text("website_url"),
    websiteContext: text("website_context"),
    subtitleStyle: subtitleStyleEnum("subtitle_style").notNull().default("bold_pop"),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    characterSheetGenerationCount: integer("character_sheet_generation_count")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("brand_profiles_user_id_idx").on(t.userId)],
);

export const contentPlans = pgTable(
  "content_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandProfileId: uuid("brand_profile_id")
      .notNull()
      .references(() => brandProfiles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    postsPerDay: integer("posts_per_day").notNull().default(1),
    status: text("status").notNull().default("draft"),
    topics: jsonb("topics").notNull().default([]),
    postType: text("post_type").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("content_plans_brand_profile_id_idx").on(t.brandProfileId),
    index("content_plans_user_id_idx").on(t.userId),
  ],
);

export const postSchedules = pgTable(
  "post_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at"),
    postType: text("post_type").notNull().default("draft"),
    platformPostId: text("platform_post_id"),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("post_schedules_video_id_idx").on(t.videoId),
    index("post_schedules_social_account_id_idx").on(t.socialAccountId),
  ],
);

// ─── Inferred types ───────────────────────────────────────────────────────────

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type VideoRow = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type SceneRow = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;

export type ClipRequestRow = typeof clipRequests.$inferSelect;
export type NewClipRequest = typeof clipRequests.$inferInsert;

export type SocialAccountRow = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;

export type BrandProfileRow = typeof brandProfiles.$inferSelect;
export type NewBrandProfile = typeof brandProfiles.$inferInsert;

export type ContentPlanRow = typeof contentPlans.$inferSelect;
export type NewContentPlan = typeof contentPlans.$inferInsert;

export type PostScheduleRow = typeof postSchedules.$inferSelect;
export type NewPostSchedule = typeof postSchedules.$inferInsert;
