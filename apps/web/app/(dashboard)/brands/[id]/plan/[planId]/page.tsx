"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  Pencil,
  RefreshCw,
  CheckCircle2,
  X,
  XCircle,
  Download,
  CalendarCheck,
  FileText,
  Sparkles,
  Play,
  Pause,
  Film,
  LayoutGrid,
  Columns3,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type {
  ContentPlan,
  ContentFormat,
  PostType,
  TopicEntry,
} from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import {
  usePlanProgress,
  type PlanProgressState,
} from "@/hooks/usePlanProgress";

function getWeekDates(weekStartDate: string): Date[] {
  const parts = weekStartDate.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const start = new Date(Date.UTC(y, m - 1, d));
  return Array.from(
    { length: 7 },
    (_, i) => new Date(start.getTime() + i * 86400000),
  );
}

const FORMAT_BADGE: Record<
  ContentFormat,
  { label: string; className: string; accent: string }
> = {
  ugc: {
    label: "UGC",
    className: "bg-blue-500/15 text-blue-400",
    accent: "bg-blue-500",
  },
  montage: {
    label: "Montage",
    className: "bg-purple-500/15 text-purple-400",
    accent: "bg-purple-500",
  },
  tutorial: {
    label: "Tutorial",
    className: "bg-emerald-500/15 text-emerald-400",
    accent: "bg-emerald-500",
  },
  story: {
    label: "Story",
    className: "bg-amber-500/15 text-amber-400",
    accent: "bg-amber-500",
  },
};

const FORMAT_OPTIONS: ContentFormat[] = ["ugc", "montage", "tutorial", "story"];

interface VideoInfo {
  id: string;
  title: string;
  status: string;
  outputUrl?: string | null;
  postSchedule?: {
    postType: string;
    status: string;
    scheduledAt: string | null;
  } | null;
}

interface OverridePanel {
  topic: TopicEntry;
  topicIndex: number;
}

// Bucket a video into a pipeline column
type PipelineBucket = "generating" | "ready" | "posted" | "failed";

function bucketOf(
  videoStatus: string,
  postSchedule: VideoInfo["postSchedule"],
): PipelineBucket {
  if (videoStatus === "FAILED") return "failed";
  if (videoStatus !== "COMPLETE") return "generating";
  if (postSchedule?.status === "failed") return "failed";
  if (postSchedule?.status === "posted") return "posted";
  return "ready";
}

function getGeneratingStageLabel(status: string): {
  label: string;
  pct: number;
} {
  switch (status) {
    case "BRAINSTORM_PENDING":
      return { label: "Starting", pct: 5 };
    case "SCRIPT_PENDING":
      return { label: "Writing script", pct: 20 };
    case "SCRIPT_READY":
      return { label: "Script ready", pct: 30 };
    case "SCENES_PENDING":
      return { label: "Designing scenes", pct: 40 };
    case "SCENES_READY":
      return { label: "Scenes ready", pct: 50 };
    case "CLIPS_QUEUED":
      return { label: "Queued for clips", pct: 55 };
    case "CLIPS_PROCESSING":
      return { label: "Generating clips", pct: 70 };
    case "CLIPS_NEEDS_REVIEW":
      return { label: "Awaiting review", pct: 80 };
    case "ASSEMBLY_PENDING":
      return { label: "Assembling", pct: 88 };
    case "ASSEMBLY_PROCESSING":
      return { label: "Assembling", pct: 92 };
    default:
      return { label: "Queued", pct: 0 };
  }
}

function postStatusLabel(
  postSchedule: VideoInfo["postSchedule"],
  planPostType: string,
): { label: string; icon: React.ReactNode; color: string } {
  if (postSchedule?.status === "posted") {
    if (postSchedule.postType === "scheduled" && postSchedule.scheduledAt) {
      const d = new Date(postSchedule.scheduledAt);
      const label = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return {
        label: `Scheduled ${label}`,
        icon: <CalendarCheck className="h-3 w-3" />,
        color: "text-[var(--accent-secondary)]",
      };
    }
    if (postSchedule.postType === "draft") {
      return {
        label: "Saved as draft",
        icon: <FileText className="h-3 w-3" />,
        color: "text-[var(--text-muted)]",
      };
    }
    return {
      label: "Posted",
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-[var(--accent-success)]",
    };
  }
  if (planPostType === "manual") {
    return {
      label: "Ready to download",
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-[var(--accent-success)]",
    };
  }
  return {
    label: "Ready",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-[var(--accent-success)]",
  };
}

// ─── Topic card (draft state) ─────────────────────────────────────────────────

function DraftCell({
  topic,
  onEdit,
}: {
  topic: TopicEntry;
  onEdit: () => void;
}) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;
  return (
    <div className="group overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--bg-border)]/80">
      {/* Thumbnail area — matches PipelineCard proportions */}
      <div className="relative aspect-[9/16] overflow-hidden bg-[var(--bg-elevated)]">
        <div className={`absolute inset-x-0 top-0 h-1 ${badge.accent}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-3">
          <p className="line-clamp-4 text-center text-xs font-semibold leading-snug text-[var(--text-primary)]">
            {topic.title}
          </p>
          {topic.hook && (
            <p className="line-clamp-3 text-center text-[10px] italic leading-snug text-[var(--text-muted)]">
              {topic.hook}
            </p>
          )}
        </div>
        {/* Format badge */}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
        {/* Edited badge */}
        {topic.overridden && (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
            edited
          </span>
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-end p-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Edit topic"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Pipeline card ────────────────────────────────────────────────────────────

function PipelineCard({
  topic,
  video,
  bucket,
  planPostType,
}: {
  topic: TopicEntry;
  video: VideoInfo | null;
  bucket: PipelineBucket;
  planPostType: string;
}) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const outputUrl = video?.outputUrl;
  const canPlay = bucket !== "generating" && bucket !== "failed" && !!outputUrl;
  const stage = video?.status
    ? getGeneratingStageLabel(video.status)
    : { label: "Queued", pct: 0 };
  const postInfo =
    video && (bucket === "ready" || bucket === "posted")
      ? postStatusLabel(video.postSchedule ?? null, planPostType)
      : null;

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function handleDownload() {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${topic.title.replace(/\s+/g, "_")}.mp4`;
    a.click();
  }

  const borderClass =
    bucket === "ready"
      ? "border-[var(--accent-success)]/25"
      : bucket === "posted"
        ? "border-[var(--accent-secondary)]/25"
        : bucket === "failed"
          ? "border-[var(--accent-danger)]/30"
          : "border-[var(--bg-border)]";

  return (
    <div
      className={`group overflow-hidden rounded-xl border ${borderClass} bg-[var(--bg-surface)] transition-colors`}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[9/16] overflow-hidden bg-[var(--bg-elevated)]">
        {canPlay ? (
          <>
            <video
              ref={videoRef}
              src={outputUrl!}
              preload="metadata"
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              onEnded={() => setPlaying(false)}
            />
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-opacity ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
              >
                {playing ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5 text-white" />
                )}
              </div>
            </button>
          </>
        ) : (
          <>
            {/* Format-colored hero strip */}
            <div className={`absolute inset-x-0 top-0 h-1 ${badge.accent}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {bucket === "generating" ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--text-muted)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {stage.label}
                  </p>
                </>
              ) : bucket === "failed" ? (
                <>
                  <XCircle className="h-7 w-7 text-[var(--accent-danger)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent-danger)]">
                    Failed
                  </p>
                </>
              ) : (
                <Film className="h-7 w-7 text-[var(--bg-border)]" />
              )}
            </div>
          </>
        )}

        {/* Format badge top-left */}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>

        {/* Progress bar at bottom for generating */}
        {bucket === "generating" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-700"
              style={{ width: `${stage.pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)]">
          {topic.title}
        </p>
        {postInfo && (
          <div className={`mt-2 flex items-center gap-1 ${postInfo.color}`}>
            {postInfo.icon}
            <span className="text-[10px] font-medium leading-none">
              {postInfo.label}
            </span>
          </div>
        )}
        {(bucket === "ready" || bucket === "posted") && outputUrl && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleDownload}
              className="flex h-7 items-center gap-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-2 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
              aria-label="Download video"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline view ────────────────────────────────────────────────────────────

function PipelineView({
  topics,
  videoByTitle,
  planPostType,
}: {
  topics: TopicEntry[];
  videoByTitle: Map<string, VideoInfo>;
  planPostType: string;
}) {
  const buckets: Record<
    PipelineBucket,
    { topic: TopicEntry; video: VideoInfo | null }[]
  > = {
    generating: [],
    ready: [],
    posted: [],
    failed: [],
  };

  for (const topic of topics) {
    const video = videoByTitle.get(topic.title) ?? null;
    const status = video?.status ?? "BRAINSTORM_PENDING";
    const b = bucketOf(status, video?.postSchedule ?? null);
    buckets[b].push({ topic, video });
  }

  const columnDefs: {
    key: PipelineBucket;
    label: string;
    tint: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "generating",
      label: "Generating",
      tint: "text-amber-400",
      icon: <Loader2 className="h-3.5 w-3.5" />,
    },
    {
      key: "ready",
      label: "Ready",
      tint: "text-[var(--accent-success)]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "posted",
      label: "Posted",
      tint: "text-[var(--accent-secondary)]",
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
    },
    {
      key: "failed",
      label: "Failed",
      tint: "text-[var(--accent-danger)]",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columnDefs.map((col) => {
        const items = buckets[col.key];
        return (
          <div
            key={col.key}
            className="flex flex-col rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)]/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${col.tint}`}
              >
                {col.icon}
                {col.label}
              </div>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {items.length}
              </span>
            </div>
            {items.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--bg-border)]/60 px-3 text-center">
                <p className="text-[10px] text-[var(--text-muted)]">
                  Nothing here yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ topic, video }) => (
                  <PipelineCard
                    key={topic.index}
                    topic={topic}
                    video={video}
                    bucket={col.key}
                    planPostType={planPostType}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar view (used in draft + as secondary tab) ─────────────────────────

function CalendarView({
  topics,
  weekDates,
  postsPerDay,
  isDraft,
  onEditTopic,
  videoByTitle,
  planPostType,
}: {
  topics: TopicEntry[];
  weekDates: Date[];
  postsPerDay: number;
  isDraft: boolean;
  onEditTopic: (topic: TopicEntry) => void;
  videoByTitle: Map<string, VideoInfo>;
  planPostType: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div
          className="mb-2 grid gap-2"
          style={{ gridTemplateColumns: `repeat(7, 1fr)` }}
        >
          {weekDates.map((date, i) => (
            <div
              key={i}
              className="rounded-lg bg-[var(--bg-elevated)] px-2 py-2 text-center"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {date.toLocaleDateString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                })}
              </p>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {date.toLocaleDateString("en-US", {
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </div>
          ))}
        </div>

        {Array.from({ length: postsPerDay }, (_, slotIdx) => {
          return (
            <div
              key={slotIdx}
              className="mb-2 grid gap-2"
              style={{ gridTemplateColumns: `repeat(7, 1fr)` }}
            >
              {weekDates.map((_, dayIdx) => {
                const dayNumber = dayIdx + 1;
                const topic = topics.find(
                  (t) => t.day === dayNumber && t.slot === slotIdx + 1,
                );

                if (!topic) {
                  return (
                    <div
                      key={dayIdx}
                      className="min-h-[120px] rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/30"
                    />
                  );
                }

                if (isDraft) {
                  return (
                    <DraftCell
                      key={dayIdx}
                      topic={topic}
                      onEdit={() => onEditTopic(topic)}
                    />
                  );
                }

                const video = videoByTitle.get(topic.title) ?? null;
                const status = video?.status ?? "BRAINSTORM_PENDING";
                const bucket = bucketOf(status, video?.postSchedule ?? null);
                return (
                  <div key={dayIdx} className="min-h-[120px]">
                    <PipelineCard
                      topic={topic}
                      video={video}
                      bucket={bucket}
                      planPostType={planPostType}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Override drawer ──────────────────────────────────────────────────────────

function OverridePanelDrawer({
  panel,
  onClose,
  onSave,
  saving,
}: {
  panel: OverridePanel;
  onClose: () => void;
  onSave: (index: number, data: Partial<TopicEntry>) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(panel.topic.title);
  const [hook, setHook] = useState(panel.topic.hook);
  const [format, setFormat] = useState<ContentFormat>(
    panel.topic.format as ContentFormat,
  );
  const [angle, setAngle] = useState(panel.topic.angle);
  const [scriptOutline, setScriptOutline] = useState(panel.topic.scriptOutline);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Edit Video Idea
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Hook (opening line)
          </span>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Format
          </span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ContentFormat)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_BADGE[f].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Angle
          </span>
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Script Outline
          </span>
          <textarea
            value={scriptOutline}
            onChange={(e) => setScriptOutline(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
      </div>
      <div className="flex gap-2 border-t border-[var(--bg-border)] px-5 py-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSave(panel.topicIndex, {
              title,
              hook,
              format,
              angle,
              scriptOutline,
            })
          }
          disabled={saving}
          className="flex-1 gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save Override"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function PlanSummaryStrip({
  planId,
  progress,
  totalVideos,
  videos,
  onRetry,
}: {
  planId: string;
  progress: PlanProgressState;
  totalVideos: number;
  videos: VideoInfo[];
  onRetry: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const api = useApiClient();

  const completed = progress.completedCount;
  const failed = progress.failedCount;
  const generating = Math.max(
    0,
    [...progress.videoStatuses.values()].filter(
      (v) => v.status !== "COMPLETE" && v.status !== "FAILED",
    ).length,
  );
  const pct = totalVideos > 0 ? Math.round((completed / totalVideos) * 100) : 0;

  // All done when SSE says so, or when all loaded videos are in a terminal state
  const videosAllDone =
    videos.length > 0 &&
    videos.every((v) => v.status === "COMPLETE" || v.status === "FAILED");
  const allDone = progress.isBatchComplete || (videosAllDone && generating === 0);
  const readyCount = videos.filter((v) => v.status === "COMPLETE").length;

  useEffect(() => {
    if (progress.videoStatuses.size > 0 || progress.isBatchComplete) return;
    const t = setTimeout(() => setShowRetry(true), 15_000);
    return () => clearTimeout(t);
  }, [progress.videoStatuses.size, progress.isBatchComplete]);

  async function handleRetry() {
    setRetrying(true);
    setShowRetry(false);
    await withToast(
      () => api.contentPlans.retryGeneration(planId),
      "Retry failed",
    );
    setRetrying(false);
    onRetry();
  }

  if (allDone) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--accent-success)]/20 bg-[var(--accent-success)]/5 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-success)]">
          <Sparkles className="h-4 w-4" />
          All done — {readyCount} video{readyCount !== 1 ? "s" : ""} ready
        </div>
        <a
          href="/library"
          className="flex items-center gap-1 text-xs font-medium text-[var(--accent-success)] hover:underline"
        >
          View in Library
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          </span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Generation in progress
          </p>
          <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {generating} generating
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-success)]" />
            {completed} ready
          </span>
          {failed > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--accent-danger)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-danger)]" />
              {failed} failed
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {pct === 0 ? (
          <div className="h-full w-1/4 animate-pulse rounded-full bg-[var(--accent-primary)]/40" />
        ) : (
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {showRetry && (
        <div className="mt-3 flex items-center gap-2">
          <span className="flex-1 text-xs text-[var(--accent-warning)]">
            Seems stuck.
          </span>
          <Button
            variant="secondary"
            onClick={handleRetry}
            disabled={retrying}
            className="h-7 px-3 text-xs"
          >
            {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = "pipeline" | "calendar";

export default function ContentPlanPage() {
  const { planId } = useParams<{ id: string; planId: string }>();
  const api = useApiClient();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [overridePanel, setOverridePanel] = useState<OverridePanel | null>(
    null,
  );
  const [savingOverride, setSavingOverride] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [postType, setPostType] = useState<PostType>("draft");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  const totalVideos = plan ? plan.postsPerDay * 7 : 0;
  const progress = usePlanProgress(
    plan?.status !== "draft" ? planId : "",
    totalVideos,
  );

  const loadPlan = useCallback(async () => {
    const result = await withToast(
      () => api.contentPlans.get(planId),
      "Failed to load plan",
    );
    if (result?.data) {
      const data = result.data as unknown as ContentPlan & {
        videos: VideoInfo[];
      };
      setPlan(data);
      setVideos(data.videos ?? []);
    }
    setLoading(false);
  }, [api, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (progress.isBatchComplete) {
      void loadPlan();
    }
  }, [progress.isBatchComplete, loadPlan]);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await withToast(
      () => api.contentPlans.regenerate(planId),
      "Regeneration failed",
    );
    if (result?.data) {
      setPlan(result.data);
      toast.success("Plan regenerated");
    }
    setRegenerating(false);
  }

  async function handleSaveOverride(index: number, data: Partial<TopicEntry>) {
    setSavingOverride(true);
    const result = await withToast(
      () =>
        api.contentPlans.overrideTopic(
          planId,
          index,
          data as Parameters<typeof api.contentPlans.overrideTopic>[2],
        ),
      "Failed to save override",
    );
    if (result?.data) {
      setPlan(result.data);
      toast.success("Override saved");
      setOverridePanel(null);
    }
    setSavingOverride(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = await withToast(
      () => api.contentPlans.approve(planId, { postType }),
      "Failed to approve plan",
    );
    if (result?.data?.ok) {
      toast.success("Plan approved — generation starting");
      setPlan((prev) => (prev ? { ...prev, status: "approved" } : prev));
    }
    setApproving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Content plan not found.
      </div>
    );
  }

  const topics = Array.isArray(plan.topics)
    ? (plan.topics as TopicEntry[])
    : [];
  const postsPerDay = plan.postsPerDay;
  const weekDates = getWeekDates(plan.weekStartDate);
  const isDraft = plan.status === "draft";
  const planPostType = plan.postType ?? "manual";

  // Merge live SSE statuses into video lookup
  const videoByTitle = new Map(
    videos.map((v) => {
      const liveStatus = progress.videoStatuses.get(v.id);
      return [
        v.title,
        {
          ...v,
          status: liveStatus?.status ?? v.status,
        } as VideoInfo,
      ];
    }),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {overridePanel && (
        <OverridePanelDrawer
          panel={overridePanel}
          onClose={() => setOverridePanel(null)}
          onSave={handleSaveOverride}
          saving={savingOverride}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Content Plan
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Week of {plan.weekStartDate} · {postsPerDay} post
            {postsPerDay > 1 ? "s" : ""}/day · {topics.length} videos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <Button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="gap-2"
              variant="secondary"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
          {!isDraft && (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-1">
              <button
                type="button"
                onClick={() => setViewMode("pipeline")}
                aria-label="Pipeline view"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "pipeline"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Pipeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                aria-label="Calendar view"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Calendar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary (post-approval only) */}
      {!isDraft && (
        <PlanSummaryStrip
          planId={planId}
          progress={progress}
          totalVideos={totalVideos}
          videos={videos}
          onRetry={loadPlan}
        />
      )}

      {/* Main content area */}
      {isDraft || viewMode === "calendar" ? (
        <CalendarView
          topics={topics}
          weekDates={weekDates}
          postsPerDay={postsPerDay}
          isDraft={isDraft}
          onEditTopic={(topic) =>
            setOverridePanel({ topic, topicIndex: topic.index })
          }
          videoByTitle={videoByTitle}
          planPostType={planPostType}
        />
      ) : (
        <PipelineView
          topics={topics}
          videoByTitle={videoByTitle}
          planPostType={planPostType}
        />
      )}

      {/* Approve section (draft only) */}
      {isDraft && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Posting mode
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    value: "draft",
                    label: "Save as Drafts",
                    description:
                      "Videos created as Facebook drafts — you publish manually",
                  },
                  {
                    value: "scheduled",
                    label: "Schedule Automatically",
                    description:
                      "Posts auto-scheduled at optimal slots throughout the week",
                  },
                  {
                    value: "manual",
                    label: "Download Only",
                    description:
                      "No Facebook posting — download the MP4s yourself",
                  },
                ] as { value: PostType; label: string; description: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPostType(opt.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    postType === opt.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                      : "border-[var(--bg-border)] hover:border-[var(--accent-primary)]/50"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${postType === opt.value ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleApprove}
            disabled={approving}
            className="w-full gap-2 py-3 text-base"
          >
            {approving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            Start Generating →
          </Button>
        </div>
      )}
    </div>
  );
}
