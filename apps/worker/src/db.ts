import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Minimal schema needed by the worker ─────────────────────────────────────

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
  "ASSEMBLY_PROCESSING",
  "COMPLETE",
  "FAILED",
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

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  emailNotifyReady: boolean("email_notify_ready").notNull().default(true),
  emailNotifyFailed: boolean("email_notify_failed").notNull().default(true),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  language: text("language").notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  status: videoStatusEnum("status").notNull().default("DRAFT"),
  subtitleStyle: subtitleStyleEnum("subtitle_style").notNull().default("bold_pop"),
  bgmEnabled: boolean("bgm_enabled").notNull().default(false),
  bgmAssetId: text("bgm_asset_id"),
  bgmVolume: integer("bgm_volume").notNull().default(15),
  videoType: videoTypeEnum("video_type").notNull().default("generated"),
  renderStyle: renderStyleEnum("render_style"),
  voiceSpeed: real("voice_speed").notNull().default(1.0),
  characterBaseGcsPath: text("character_base_gcs_path"),
  outputUrl: text("output_url"),
  durationSeconds: integer("duration_seconds"),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scenes = pgTable("scenes", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").notNull(),
  sceneIndex: integer("scene_index").notNull(),
  textExcerpt: text("text_excerpt"),
  durationHintSeconds: integer("duration_hint_seconds"),
  clipPath: text("clip_path"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type VideoRow = typeof videos.$inferSelect;
export type SceneRow = typeof scenes.$inferSelect;
export type UserRow = typeof users.$inferSelect;

// ─── DB connection ────────────────────────────────────────────────────────────

const sql = neon(process.env["DATABASE_URL"]!);
export const db = drizzle({ client: sql });
