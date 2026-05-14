// ─── Enums ───────────────────────────────────────────────────────────────────

export type SocialPlatform = "facebook" | "tiktok";

export enum PlanType {
  None = "none",
  TryOut = "try_out",
  Starter = "starter",
  Pro = "pro",
}

export enum Platform {
  TikTok = "tiktok",
  Instagram = "instagram",
  YouTubeShorts = "youtube_shorts",
  FacebookReels = "facebook_reels",
}

// PRD §7.2 — corrected values
export enum VideoStyle {
  Educational = "educational",
  Motivational = "motivational",
  Storytelling = "storytelling",
  Listicle = "listicle",
  Tutorial = "tutorial",
  POV = "pov",
  Trending = "trending",
  Reaction = "reaction",
  DayInLife = "day_in_life",
  Challenge = "challenge",
  Unboxing = "unboxing",
  Transformation = "transformation",
  Commentary = "commentary",
  BehindScenes = "behind_scenes",
  Comedy = "comedy",
  Tips = "tips",
  Storytime = "storytime",
  Showcase = "showcase",
  Comparison = "comparison",
  Rant = "rant",
  News = "news",
  Asmr = "asmr",
}

export enum RenderStyle {
  Mascot = "mascot",
  Cartoon = "cartoon",
  Animation2D = "animation_2d",
  MotionGraphics = "motion_graphics",
  Cinematic = "cinematic",
  StockFootage = "stock_footage",
  Whiteboard = "whiteboard",
}

// PRD §7.2 — corrected values
export enum Tone {
  Casual = "casual",
  Professional = "professional",
  Humorous = "humorous",
  Inspirational = "inspirational",
  Dramatic = "dramatic",
  Energetic = "energetic",
  Empathetic = "empathetic",
  Bold = "bold",
  Mysterious = "mysterious",
  Friendly = "friendly",
  Urgent = "urgent",
  Chill = "chill",
  Playful = "playful",
  Raw = "raw",
  Sarcastic = "sarcastic",
}

export enum SubtitleStyle {
  BoldPop = "bold_pop",
  WordHighlight = "word_highlight",
  Minimal = "minimal",
  Cinematic = "cinematic",
  NeonGlow = "neon_glow",
  OversizedPop = "oversized_pop",
  GroupedBold = "grouped_bold",
  GroupedCinematic = "grouped_cinematic",
  Karaoke = "karaoke",
}

// PRD §7.3 state machine — includes ASSEMBLY_PROCESSING
export enum VideoStatus {
  Draft = "DRAFT",
  BrainstormPending = "BRAINSTORM_PENDING",
  ScriptPending = "SCRIPT_PENDING",
  ScriptReady = "SCRIPT_READY",
  VoicePending = "VOICE_PENDING",
  VoiceReady = "VOICE_READY",
  ScenesPending = "SCENES_PENDING",
  ScenesReady = "SCENES_READY",
  ClipsQueued = "CLIPS_QUEUED",
  ClipsProcessing = "CLIPS_PROCESSING",
  ClipsNeedsReview = "CLIPS_NEEDS_REVIEW",
  AssemblyPending = "ASSEMBLY_PENDING",
  AssemblyProcessing = "ASSEMBLY_PROCESSING",
  Complete = "COMPLETE",
  Failed = "FAILED",
}

export enum ClipRequestStatus {
  Queued = "queued",
  Processing = "processing",
  Done = "done",
  Failed = "failed",
}

export enum UGCVisualStyle {
  Realistic     = "realistic",
  Anime         = "anime",
  Ghibli        = "ghibli",
  Mascot        = "mascot",
  Cartoon       = "cartoon",
  Pixar         = "pixar",
  ComicBook     = "comic_book",
  Watercolor    = "watercolor",
  OilPainting   = "oil_painting",
  Render3D      = "3d_render",
  Cyberpunk     = "cyberpunk",
  Fantasy       = "fantasy",
  Vintage       = "vintage",
  NeonSynthwave = "neon_synthwave",
  AIClone       = "ai_clone",
}

export enum VideoType {
  Generated  = "generated",
  Talking    = "talking",
  ActionReel = "action_reel",
}

export enum ActionReelStyle {
  Workout    = "workout",
  Dance      = "dance",
  Sports     = "sports",
  Yoga       = "yoga",
  MartialArts = "martial_arts",
  Fighting   = "fighting",
  Gardening  = "gardening",
  Driving    = "driving",
  Parkour    = "parkour",
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

/**
 * User — id is the Clerk user ID (text PK), per PRD §9.
 */
export interface User {
  id: string;                       // Clerk user ID — the primary key
  email: string;
  firstName: string | null;
  lastName: string | null;
  plan: PlanType;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialPaid: boolean;
  trialVideoRemaining: number;      // 0 or 1; set to 1 after $2 payment
  videosToday: number;
  videosThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  lastResetAt: Date;
  onboardingComplete: boolean;
  emailNotifyReady: boolean;
  emailNotifyFailed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project — all fields required per PRD §7.2.
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  platforms: Platform[];
  niche: string;
  language: string;
  targetAudience: string;
  videoStyle: VideoStyle;
  tone: Tone;
  defaultSubtitleStyle: SubtitleStyle | null;
  defaultBgmEnabled: boolean;
  defaultBgmAssetId: string | null;
  claudeSystemPrompt: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  status: VideoStatus;
  idea: string | null;
  script: string | null;
  durationSeconds: number | null;
  subtitleStyle: SubtitleStyle;
  bgmEnabled: boolean;
  bgmAssetId: string | null;
  bgmVolume: number;
  targetDurationSeconds: number;
  videoType: VideoType;
  ugcVisualStyle: UGCVisualStyle | null;
  actionReelStyle: ActionReelStyle | null;
  ugcCharacterDescription: string | null;
  sceneCount: number;
  voiceSpeed: number;
  characterBaseGcsPath: string | null;
  renderStyle: RenderStyle | null;
  dialogueSegments: { sceneIndex: number; dialogue: string }[] | null;
  outputUrl: string | null;
  error: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scene — textExcerpt added (PRD §7.6, required for scene card UI).
 * sceneIndex renamed from index (matches PRD §7.6 JSON shape).
 */
export interface Scene {
  id: string;
  videoId: string;
  sceneIndex: number;
  textExcerpt: string;
  visualPrompt: string;
  motionPrompt: string;
  durationHintSeconds: number | null;
  baseImageUrl: string | null;
  baseImagePath: string | null;
  clipUrl: string | null;
  clipPath: string | null;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClipRequest — aligned to PRD §7.7.
 * Removed: sceneId FK (scene linked via videoId + sceneIndex).
 * Added: userId, visualPrompt (denormalised for extension queue).
 */
export interface ClipRequest {
  id: string;
  videoId: string;
  userId: string;
  sceneIndex: number;
  visualPrompt: string;
  motionPrompt: string;
  baseImageUrl: string | null;
  status: ClipRequestStatus;
  queuedAt: Date;
  claimedAt: Date | null;
  processedAt: Date | null;
  clipUrl: string | null;
  error: string | null;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Live Clip Progress (Track 7) ─────────────────────────────────────────────

export interface SnapshotClip {
  sceneIndex: number;
  status: "queued" | "processing" | "done" | "failed";
  clipUrl?: string;
  error?: string;
}

export type ClipStatusMap = Record<number, SnapshotClip>;

// ─── Brand Profiles (Track 18) ────────────────────────────────────────────────

export type TargetAudienceAge = "gen_z" | "millennial" | "gen_x" | "all";
export type TargetAudienceVibe = "entertainment" | "education" | "inspiration" | "humor";
export type ContentTone = "energetic" | "calm" | "witty" | "inspirational" | "professional" | "dramatic";
export type VisualStyle = "realistic" | "anime" | "3d_animation" | "cartoon" | "cinematic" | "minimalist";
export type CharacterType = "human" | "mascot" | "abstract" | "none";

export interface BrandProfile {
  id: string;
  userId: string;
  socialAccountId: string | null;
  name: string;
  niche: string;
  nicheDescription: string | null;
  targetAudienceAge: TargetAudienceAge | null;
  targetAudienceVibe: TargetAudienceVibe | null;
  tone: ContentTone;
  visualStyle: VisualStyle;
  characterType: CharacterType;
  characterDescription: string | null;
  characterSheetGcsPath: string | null;
  logoGcsPath: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  referenceVideoUrl: string | null;
  onboardingComplete: boolean;
  characterSheetGenerationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Content Plans (Track 20) ─────────────────────────────────────────────────

export type ContentPlanStatus = "draft" | "approved" | "generating" | "complete";
export type ContentFormat = "ugc" | "montage" | "tutorial" | "story";

export interface TopicEntry {
  index: number;
  day: number;
  slot: number;
  title: string;
  hook: string;
  format: ContentFormat;
  angle: string;
  scriptOutline: string;
  overridden: boolean;
}

export type PostType = "draft" | "scheduled" | "manual";
export type PostScheduleStatus = "pending" | "posted" | "failed";

export interface PostSchedule {
  id: string;
  videoId: string;
  socialAccountId: string;
  scheduledAt: Date | null;
  postType: PostType;
  platformPostId: string | null;
  status: PostScheduleStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPlan {
  id: string;
  brandProfileId: string;
  userId: string;
  weekStartDate: string;
  postsPerDay: number;
  status: ContentPlanStatus;
  topics: TopicEntry[];
  postType: PostType;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Social Accounts (Track 17) ───────────────────────────────────────────────

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  pageId: string;
  pageName: string;
  pageAvatarUrl: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacebookPage {
  id: string;
  name: string;
  pictureUrl: string | null;
  accessToken: string;
}

export type ClipProgressEvent =
  | { type: "CLIP_PROCESSING"; videoId: string; sceneIndex: number }
  | { type: "CLIP_DONE"; videoId: string; sceneIndex: number; clipUrl: string }
  | { type: "CLIP_FAILED"; videoId: string; sceneIndex: number; error: string }
  | { type: "HEARTBEAT" }
  | { type: "SNAPSHOT"; clips: SnapshotClip[]; queuePosition: number }
  | { type: "QUEUE_POSITION"; videoId: string; queuePosition: number };
