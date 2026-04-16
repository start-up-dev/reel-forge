// ─── Enums ───────────────────────────────────────────────────────────────────

export enum PlanType {
  None = "none",
  Starter = "starter",
  Pro = "pro",
}

export enum Platform {
  TikTok = "tiktok",
  Instagram = "instagram",
  YouTubeShorts = "youtube_shorts",
  FacebookReels = "facebook_reels",
}

export enum VideoStyle {
  Cinematic = "cinematic",
  Vlog = "vlog",
  Animated = "animated",
  Documentary = "documentary",
}

export enum Tone {
  Energetic = "energetic",
  Calm = "calm",
  Motivational = "motivational",
  Humorous = "humorous",
  Professional = "professional",
}

export enum SubtitleStyle {
  BoldPop = "bold_pop",
  WordHighlight = "word_highlight",
  Minimal = "minimal",
  Cinematic = "cinematic",
}

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
  Assembling = "ASSEMBLING",
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

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  plan: PlanType;
  stripeCustomerId: string | null;
  trialPaid: boolean;
  trialVideoRemaining: number;
  videosToday: number;
  videosThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  platform: Platform;
  niche: string | null;
  targetAudience: string | null;
  tone: Tone | null;
  voiceId: string | null;
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
  bgmVolume: number;
  outputUrl: string | null;
  error: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scene {
  id: string;
  videoId: string;
  index: number;
  visualPrompt: string;
  durationHintSeconds: number | null;
  baseImageUrl: string | null;
  baseImagePath: string | null;
  clipUrl: string | null;
  clipPath: string | null;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClipRequest {
  id: string;
  videoId: string;
  sceneId: string;
  sceneIndex: number;
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
