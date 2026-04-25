// ─── Enums ───────────────────────────────────────────────────────────────────

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
}

export enum SubtitleStyle {
  BoldPop = "bold_pop",
  WordHighlight = "word_highlight",
  Minimal = "minimal",
  Cinematic = "cinematic",
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
  voiceId: string | null;
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
  audioUrl: string | null;
  wordTimestampsUrl: string | null;
  durationSeconds: number | null;
  subtitleStyle: SubtitleStyle;
  bgmEnabled: boolean;
  bgmAssetId: string | null;
  bgmVolume: number;                // integer 0–100, default 30
  targetDurationSeconds: number;    // 15 | 30 | 45 | 60
  renderStyle: RenderStyle | null;  // visual/render style for script + scene prompts
  voiceId: string | null;           // overrides project voiceId when set
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
 * Added: userId, visualPrompt, baseImageUrl (denormalised for extension queue).
 */
export interface ClipRequest {
  id: string;
  videoId: string;
  userId: string;
  sceneIndex: number;
  visualPrompt: string;
  motionPrompt: string;
  baseImageUrl: string;
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
