"use client";

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Check, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ActionReelStyle, RenderStyle, UGCVisualStyle, VideoStatus, VideoType } from "@repo/types";
import type { Project } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step1IdeaProps {
  video: VideoDetail;
  project: Project | null;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: { idea?: string; targetDurationSeconds?: number; renderStyle?: RenderStyle | null; videoType?: VideoType; ugcVisualStyle?: UGCVisualStyle | null; actionReelStyle?: ActionReelStyle | null; characterBaseGcsPath?: string | null }) => void;
  onAdvance: () => void;
}

type Mode = "brainstorm" | "direct";

interface IdeaCard {
  title: string;
  body: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15s", hint: "Quick hook" },
  { value: 30, label: "30s", hint: "Standard" },
  { value: 45, label: "45s", hint: "In-depth" },
  { value: 60, label: "60s", hint: "Full story" },
] as const;

const VIDEO_STYLE_OPTIONS: { value: RenderStyle; label: string; emoji: string }[] = [
  { value: RenderStyle.Mascot,        label: "Mascot",         emoji: "🧸" },
  { value: RenderStyle.Cartoon,       label: "Cartoon",        emoji: "🎨" },
  { value: RenderStyle.Animation2D,   label: "2D Animation",   emoji: "✏️" },
  { value: RenderStyle.MotionGraphics,label: "Motion Graphics",emoji: "📊" },
  { value: RenderStyle.Cinematic,     label: "Cinematic",      emoji: "🎬" },
  { value: RenderStyle.StockFootage,  label: "Stock Footage",  emoji: "📷" },
  { value: RenderStyle.Whiteboard,    label: "Whiteboard",     emoji: "📋" },
];

const UGC_STYLE_OPTIONS: { value: UGCVisualStyle; label: string; emoji: string; hint: string }[] = [
  { value: UGCVisualStyle.Realistic,     label: "Realistic",       emoji: "🎥", hint: "Natural human look, real-world lighting" },
  { value: UGCVisualStyle.Anime,         label: "Anime",           emoji: "⛩️", hint: "Cel-shaded, large eyes, vibrant colors" },
  { value: UGCVisualStyle.Ghibli,        label: "Ghibli",          emoji: "🌿", hint: "Painterly, lush, hand-drawn warmth" },
  { value: UGCVisualStyle.Mascot,        label: "Mascot",          emoji: "🧸", hint: "Rounded, friendly branded character" },
  { value: UGCVisualStyle.Cartoon,       label: "Cartoon",         emoji: "🎨", hint: "Bold lines, flat color, classic 2D" },
  { value: UGCVisualStyle.Pixar,         label: "Pixar",           emoji: "🎪", hint: "3D CGI animated, expressive, detailed" },
  { value: UGCVisualStyle.ComicBook,     label: "Comic Book",      emoji: "💥", hint: "Bold inks, halftone shadows, panel-style" },
  { value: UGCVisualStyle.Watercolor,    label: "Watercolor",      emoji: "🎑", hint: "Soft washes, delicate textures" },
  { value: UGCVisualStyle.OilPainting,   label: "Oil Painting",    emoji: "🖼️", hint: "Rich impasto, classical palette" },
  { value: UGCVisualStyle.Render3D,      label: "3D Render",       emoji: "🔷", hint: "Hyper-detailed photorealistic CGI" },
  { value: UGCVisualStyle.Cyberpunk,     label: "Cyberpunk",       emoji: "🌆", hint: "Neon-lit dystopia, chrome and glitch" },
  { value: UGCVisualStyle.Fantasy,       label: "Fantasy",         emoji: "🧝", hint: "Epic high-fantasy, mystical lighting" },
  { value: UGCVisualStyle.Vintage,       label: "Vintage",         emoji: "📽️", hint: "Retro film grain, warm faded palette" },
  { value: UGCVisualStyle.NeonSynthwave, label: "Neon Synthwave",  emoji: "🌈", hint: "Retrowave grid, electric neon glow" },
  { value: UGCVisualStyle.AIClone,       label: "AI Clone",        emoji: "🪞", hint: "Your face, real lipsync — upload a photo" },
];

const ACTION_REEL_STYLE_OPTIONS: { value: ActionReelStyle; label: string; emoji: string; hint: string }[] = [
  { value: ActionReelStyle.Workout,    label: "Workout",      emoji: "🏋️", hint: "Gym, weights, athletic training" },
  { value: ActionReelStyle.Dance,      label: "Dance",        emoji: "💃", hint: "Choreography, movement, rhythm" },
  { value: ActionReelStyle.Sports,     label: "Sports",       emoji: "⚽", hint: "Athletic performance, competition" },
  { value: ActionReelStyle.Yoga,       label: "Yoga",         emoji: "🧘", hint: "Wellness, poses, mindful movement" },
  { value: ActionReelStyle.MartialArts,label: "Martial Arts", emoji: "🥋", hint: "Karate, boxing, jiu-jitsu, training" },
  { value: ActionReelStyle.Fighting,   label: "Fighting",     emoji: "🥊", hint: "Cinematic combat choreography" },
  { value: ActionReelStyle.Gardening,  label: "Gardening",    emoji: "🌱", hint: "Plants, soil, outdoor labour" },
  { value: ActionReelStyle.Driving,    label: "Driving",      emoji: "🚗", hint: "Road, speed, automotive content" },
  { value: ActionReelStyle.Parkour,    label: "Parkour",      emoji: "🏃", hint: "Urban freerunning, vaults, flips" },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const TIPS = [
  "Be specific about your niche or audience (e.g. 'morning routine for busy parents')",
  "Mention a problem you're solving or a transformation you're showing",
  "Include a style hint if helpful (e.g. 'fast-paced listicle', 'calming tutorial')",
  "Aim for 1–2 sentences — more detail gives better scripts",
];

export function Step1Idea({
  video,
  onVideoUpdate,
  onScheduleSave,
  onAdvance,
}: Step1IdeaProps) {
  const api = useApiClient();
  const [mode, setMode] = useState<Mode>("brainstorm");
  const [topic, setTopic] = useState(video.idea ?? "");
  const [directIdea, setDirectIdea] = useState(video.idea ?? "");
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<IdeaCard | null>(null);
  const [generating, setGenerating] = useState(
    video.status === VideoStatus.BrainstormPending
  );
  const [submitting, setSubmitting] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Video length
  const [targetDuration, setTargetDuration] = useState(video.targetDurationSeconds ?? 30);

  // Video type: "talking" = UGC Video, "generated" = Stories, "action_reel" = Action Reel
  const [videoType, setVideoType] = useState<VideoType>(video.videoType ?? VideoType.Generated);
  const [ugcVisualStyle, setUgcVisualStyle] = useState<UGCVisualStyle | null>(video.ugcVisualStyle ?? null);
  const [actionReelStyle, setActionReelStyle] = useState<ActionReelStyle | null>(video.actionReelStyle ?? null);

  // Render style (Stories only)
  const [renderStyle, setRenderStyle] = useState<RenderStyle | null>(video.renderStyle ?? null);

  // AI Clone upload state
  const [cloneImageUploading, setCloneImageUploading] = useState(false);
  // Track the persisted storage path (restored from video on mount)
  const [cloneGcsPath, setCloneGcsPath] = useState<string | null>(
    video.ugcVisualStyle === UGCVisualStyle.AIClone ? (video.characterBaseGcsPath ?? null) : null
  );
  const cloneFileInputRef = useRef<HTMLInputElement>(null);

  const isUgc = videoType === VideoType.Talking;
  const isActionReel = videoType === VideoType.ActionReel;
  const isAiClone = ugcVisualStyle === UGCVisualStyle.AIClone;

  async function handleCloneImageUpload(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      toast.error("Accepted formats: JPEG, PNG, WebP");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setCloneImageUploading(true);
    try {
      const urlResult = await api.videos.characterImageUploadUrl(
        video.id,
        file.type as AcceptedImageType
      );
      if (!urlResult?.data) throw new Error("Failed to get upload URL");
      const { uploadUrl, gcsPath } = urlResult.data;

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const patchResult = await api.videos.patch(video.id, { characterBaseGcsPath: gcsPath });
      if (!patchResult?.data) throw new Error("Failed to save image path");

      setCloneGcsPath(gcsPath);
      onScheduleSave({ characterBaseGcsPath: gcsPath });
      onVideoUpdate({ ...video, characterBaseGcsPath: gcsPath });
      toast.success("Character image saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCloneImageUploading(false);
    }
  }

  async function handleGenerateIdeas() {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }
    setGenerating(true);
    setIdeas([]);
    setSelectedIdea(null);

    const result = await withToast(
      () => api.videos.brainstorm(video.id, { topic: topic.trim() }),
      "Failed to generate ideas"
    );
    if (result?.data?.ideas) {
      setIdeas(result.data.ideas);
    }
    setGenerating(false);
  }

  function canAdvance(): boolean {
    if (isUgc) {
      if (!ugcVisualStyle) return false;
      if (isAiClone && !cloneGcsPath) return false;
      return true;
    }
    if (isActionReel) return !!actionReelStyle;
    return !!renderStyle;
  }

  async function handleUseIdea(idea: IdeaCard) {
    if (!canAdvance()) {
      if (isUgc && !ugcVisualStyle) toast.error("Select a UGC visual style before continuing");
      else if (isUgc && isAiClone && !cloneGcsPath) toast.error("Upload your character image before continuing");
      else if (isActionReel && !actionReelStyle) toast.error("Select an activity type before continuing");
      else toast.error("Select a video style before continuing");
      return;
    }
    setSelectedIdea(idea);
    const ideaText = `${idea.title}: ${idea.body}`;
    setSubmitting(true);

    const result = await withToast(
      () => api.videos.generateScript(video.id, { idea: ideaText }),
      "Failed to start script generation"
    );
    if (result?.data) {
      onVideoUpdate({
        ...video,
        ...result.data,
        videoType,
        ugcVisualStyle,
        actionReelStyle,
        renderStyle,
        scenes: video.scenes,
      });
      onAdvance();
    }
    setSubmitting(false);
  }

  async function handleDirectSubmit() {
    if (!directIdea.trim()) {
      toast.error("Enter your idea first");
      return;
    }
    if (!canAdvance()) {
      if (isUgc && !ugcVisualStyle) toast.error("Select a UGC visual style before continuing");
      else if (isUgc && isAiClone && !cloneGcsPath) toast.error("Upload your character image before continuing");
      else if (isActionReel && !actionReelStyle) toast.error("Select an activity type before continuing");
      else toast.error("Select a video style before continuing");
      return;
    }
    setSubmitting(true);

    const result = await withToast(
      () => api.videos.generateScript(video.id, { idea: directIdea.trim() }),
      "Failed to start script generation"
    );
    if (result?.data) {
      onVideoUpdate({
        ...video,
        ...result.data,
        videoType,
        ugcVisualStyle,
        actionReelStyle,
        renderStyle,
        scenes: video.scenes,
      });
      onAdvance();
    }
    setSubmitting(false);
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        What&apos;s your video about?
      </h1>
      <p className="mb-8 text-base text-[var(--text-secondary)]">
        Start with a topic or paste your full idea — we&apos;ll turn it into a
        polished script.
      </p>

      {/* Video Length */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Video Length
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTargetDuration(opt.value);
                onScheduleSave({ targetDurationSeconds: opt.value });
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border px-4 py-2 transition-all",
                targetDuration === opt.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                  : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              )}
            >
              <span className="text-base font-bold">{opt.label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Video Type picker */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Video Type
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([
            {
              value: VideoType.Talking,
              label: "UGC Video",
              emoji: "🗣️",
              hint: "AI talking character with lipsync.",
            },
            {
              value: VideoType.Generated,
              label: "Stories",
              emoji: "🎬",
              hint: "Dialogue-driven cinematic B-roll.",
            },
            {
              value: VideoType.ActionReel,
              label: "Action Reel",
              emoji: "⚡",
              hint: "Silent activity video — workout, dance, sport & more.",
            },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setVideoType(opt.value);
                onScheduleSave({ videoType: opt.value });
              }}
              className={cn(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                videoType === opt.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                  : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
              )}
            >
              <span className="mb-1 text-lg">{opt.emoji}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</span>
              <span className="text-xs text-[var(--text-muted)]">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* UGC Visual Style grid (UGC Video only) */}
      {isUgc && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
            Visual Style
          </p>
          <div className="grid grid-cols-3 gap-2">
            {UGC_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setUgcVisualStyle(opt.value);
                  onScheduleSave({ ugcVisualStyle: opt.value });
                  // Clear clone path if switching away from AI Clone
                  if (opt.value !== UGCVisualStyle.AIClone) {
                    setCloneGcsPath(null);
                  } else {
                    // Restore from video if already uploaded
                    setCloneGcsPath(video.characterBaseGcsPath ?? null);
                  }
                }}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                  ugcVisualStyle === opt.value
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
                )}
              >
                <span className="mb-1 text-base">{opt.emoji}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{opt.label}</span>
                <span className="mt-0.5 text-[10px] leading-tight text-[var(--text-muted)]">{opt.hint}</span>
              </button>
            ))}
          </div>

          {!ugcVisualStyle && (
            <p className="mt-2 text-xs text-[var(--accent-warning)]">
              Select a visual style to continue
            </p>
          )}

          {/* AI Clone upload sub-step */}
          {isAiClone && (
            <div className="mt-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
                🪞 Character Image
              </p>
              <p className="mb-3 text-xs text-[var(--text-secondary)]">
                Upload a face reference photo (JPEG, PNG, WebP — max 10 MB). Required before generating.
              </p>

              {cloneGcsPath ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-success)]/10">
                    <Check className="h-5 w-5 text-[var(--accent-success)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--accent-success)]">Image uploaded</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">{cloneGcsPath.split("/").pop()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cloneFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--bg-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--text-muted)] transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={cloneImageUploading}
                  onClick={() => cloneFileInputRef.current?.click()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors",
                    cloneImageUploading
                      ? "border-[var(--bg-border)] opacity-60 cursor-not-allowed"
                      : "border-[var(--bg-border)] hover:border-[var(--accent-primary)]/50 cursor-pointer"
                  )}
                >
                  {cloneImageUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                  ) : (
                    <Upload className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                  <span className="text-sm text-[var(--text-muted)]">
                    {cloneImageUploading ? "Uploading…" : "Click to upload"}
                  </span>
                </button>
              )}

              <input
                ref={cloneFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCloneImageUpload(file);
                  e.target.value = "";
                }}
              />

              {!cloneGcsPath && !cloneImageUploading && (
                <p className="mt-2 text-xs text-[var(--accent-warning)]">
                  Image required before you can continue
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Style grid (Action Reel only) */}
      {isActionReel && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
            Activity Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ACTION_REEL_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setActionReelStyle(opt.value);
                  onScheduleSave({ actionReelStyle: opt.value });
                }}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                  actionReelStyle === opt.value
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
                )}
              >
                <span className="mb-1 text-base">{opt.emoji}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{opt.label}</span>
                <span className="mt-0.5 text-[10px] leading-tight text-[var(--text-muted)]">{opt.hint}</span>
              </button>
            ))}
          </div>
          {!actionReelStyle && (
            <p className="mt-2 text-xs text-[var(--accent-warning)]">
              Select an activity type to continue
            </p>
          )}
        </div>
      )}

      {/* Video Style grid (Stories only) */}
      {!isUgc && !isActionReel && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
            Video Style
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRenderStyle(opt.value);
                  onScheduleSave({ renderStyle: opt.value });
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                  renderStyle === opt.value
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                )}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          {!renderStyle && (
            <p className="mt-2 text-xs text-[var(--accent-warning)]">
              Select a style to continue
            </p>
          )}
        </div>
      )}

      {/* Mode toggle */}
      <div className="mb-6 inline-flex rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-1">
        {(["brainstorm", "direct"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              mode === m
                ? "bg-[var(--accent-primary)] text-white shadow"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {m === "brainstorm" ? "Brainstorm with AI" : "I have an idea"}
          </button>
        ))}
      </div>

      {mode === "brainstorm" ? (
        <div className="space-y-4">
          <textarea
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              onScheduleSave({ idea: e.target.value });
            }}
            disabled={generating}
            placeholder="e.g. 'Quick tips for building a morning routine'"
            rows={4}
            className={cn(
              "w-full resize-none rounded-xl border border-[var(--bg-border)]",
              "bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)] outline-none transition-colors",
              "focus:border-[var(--accent-primary)]",
              generating && "opacity-60"
            )}
          />

          <Button
            onClick={handleGenerateIdeas}
            loading={generating}
            disabled={!topic.trim() || generating}
            className="w-full"
          >
            {generating ? "Thinking…" : "Generate Ideas"}
          </Button>

          {/* Idea cards */}
          {(ideas.length > 0 || generating) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-1">
              {generating && ideas.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl bg-[var(--bg-elevated)]"
                    />
                  ))
                : ideas.map((idea, i) => {
                    const isSelected = selectedIdea?.title === idea.title;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative rounded-xl border p-4 transition-all",
                          isSelected
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                            : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/50"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <p className="mb-1 font-semibold text-[var(--text-primary)]">
                          {idea.title}
                        </p>
                        <p className="mb-3 text-sm text-[var(--text-secondary)] line-clamp-3">
                          {idea.body}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={submitting && isSelected}
                          disabled={submitting || !canAdvance()}
                          onClick={() => handleUseIdea(idea)}
                          className="hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        >
                          Use This Idea →
                        </Button>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={directIdea}
              onChange={(e) => {
                setDirectIdea(e.target.value);
                onScheduleSave({ idea: e.target.value });
              }}
              placeholder="Paste or type your full video idea here"
              rows={6}
              maxLength={2000}
              className={cn(
                "w-full resize-none rounded-xl border border-[var(--bg-border)]",
                "bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]",
                "placeholder:text-[var(--text-muted)] outline-none transition-colors",
                "focus:border-[var(--accent-primary)]"
              )}
            />
            <span className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)]">
              {directIdea.length}/2000
            </span>
          </div>

          <Button
            onClick={handleDirectSubmit}
            loading={submitting}
            disabled={!directIdea.trim() || submitting || !canAdvance()}
            className="w-full"
          >
            Use This Idea →
          </Button>
        </div>
      )}

      {/* Action Reel audio notice */}
      {isActionReel && (
        <div className="mt-8 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">🔇 Silent video</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Action Reels are silent — no dialogue is generated. Add background music in the final step.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowTips((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          {showTips ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Tips for great ideas
        </button>
        {showTips && (
          <ul className="mt-3 space-y-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
            {TIPS.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
