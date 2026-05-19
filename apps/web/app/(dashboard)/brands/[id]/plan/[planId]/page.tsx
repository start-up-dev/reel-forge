"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  Pencil,
  RefreshCw,
  CheckCircle2,
  X,
  XCircle,
  Circle,
  Download,
  Clock,
  CalendarCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { ContentPlan, ContentFormat, PostType, TopicEntry } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import { usePlanProgress, type PlanProgressState } from "@/hooks/usePlanProgress";

const SLOT_TIMES: Record<number, string[]> = {
  1: ["9:00 AM"],
  3: ["9:00 AM", "2:00 PM", "6:00 PM"],
};

function getWeekDates(weekStartDate: string): Date[] {
  const parts = weekStartDate.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const start = new Date(Date.UTC(y, m - 1, d));
  return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
}

const FORMAT_BADGE: Record<ContentFormat, { label: string; className: string }> = {
  ugc: { label: "UGC", className: "bg-blue-500/15 text-blue-400" },
  montage: { label: "Montage", className: "bg-purple-500/15 text-purple-400" },
  tutorial: { label: "Tutorial", className: "bg-emerald-500/15 text-emerald-400" },
  story: { label: "Story", className: "bg-amber-500/15 text-amber-400" },
};

const FORMAT_OPTIONS: ContentFormat[] = ["ugc", "montage", "tutorial", "story"];

// Video status → display config
function getStatusDisplay(
  videoStatus: string,
  postSchedule: { postType: string; status: string; scheduledAt: string | null } | null,
  planPostType: string,
): { label: string; icon: React.ReactNode; color: string } {
  if (videoStatus === "COMPLETE") {
    if (postSchedule?.status === "failed") {
      return { label: "Posting failed", icon: <XCircle className="h-3 w-3" />, color: "text-[var(--accent-danger)]" };
    }
    if (postSchedule?.status === "posted") {
      if (postSchedule.postType === "scheduled" && postSchedule.scheduledAt) {
        const d = new Date(postSchedule.scheduledAt);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return {
          label: `Scheduled ${label}`,
          icon: <CalendarCheck className="h-3 w-3" />,
          color: "text-[var(--accent-secondary)]",
        };
      }
      if (postSchedule.postType === "draft") {
        return { label: "Saved as Draft", icon: <FileText className="h-3 w-3" />, color: "text-[var(--text-muted)]" };
      }
    }
    if (planPostType === "manual") {
      return { label: "Ready to download", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-[var(--accent-success)]" };
    }
    return { label: "Complete", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-[var(--accent-success)]" };
  }
  if (videoStatus === "FAILED") {
    return { label: "Failed", icon: <XCircle className="h-3 w-3" />, color: "text-[var(--accent-danger)]" };
  }
  if (videoStatus === "ASSEMBLY_PENDING" || videoStatus === "ASSEMBLY_PROCESSING") {
    return { label: "Assembling…", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-purple-400" };
  }
  if (videoStatus === "CLIPS_QUEUED" || videoStatus === "CLIPS_PROCESSING") {
    return { label: "Generating clips…", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-blue-400" };
  }
  if (videoStatus === "SCRIPT_PENDING" || videoStatus === "SCENES_PENDING" || videoStatus === "SCRIPT_READY" || videoStatus === "SCENES_READY") {
    return { label: "Scripting…", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-amber-400" };
  }
  if (videoStatus === "BRAINSTORM_PENDING") {
    return { label: "Starting…", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-amber-400" };
  }
  return { label: "Queued", icon: <Circle className="h-3 w-3" />, color: "text-[var(--text-muted)]" };
}

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

// ─── Topic card (draft state) ─────────────────────────────────────────────────

function DraftCell({ topic, onEdit }: { topic: TopicEntry; onEdit: () => void }) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;
  return (
    <div className="relative flex h-full min-h-[120px] flex-col rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3">
      {topic.overridden && (
        <span className="absolute right-2 top-2 rounded-full bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
          edited
        </span>
      )}
      <span className={`mb-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
        {badge.label}
      </span>
      <p className="flex-1 pr-5 text-xs font-semibold leading-snug text-[var(--text-primary)] line-clamp-3">
        {topic.title}
      </p>
      <p className="mt-1 line-clamp-2 text-[10px] italic text-[var(--text-muted)]">{topic.hook}</p>
      <button
        type="button"
        onClick={onEdit}
        className="absolute bottom-2 right-2 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        aria-label="Edit topic"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Active/complete cell (post-approval) ─────────────────────────────────────

function ActiveCell({
  topic,
  video,
  planPostType,
}: {
  topic: TopicEntry;
  video: VideoInfo | null;
  planPostType: string;
}) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;
  const status = video?.status ?? "DRAFT";
  const display = getStatusDisplay(status, video?.postSchedule ?? null, planPostType);
  const isComplete = status === "COMPLETE";
  const outputUrl = video?.outputUrl;

  function handleDownload() {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${topic.title.replace(/\s+/g, "_")}.mp4`;
    a.click();
  }

  return (
    <div
      className={`relative flex h-full min-h-[120px] flex-col rounded-lg border p-3 transition-colors ${
        isComplete
          ? "border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5"
          : status === "FAILED"
            ? "border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/5"
            : "border-[var(--bg-border)] bg-[var(--bg-elevated)]"
      }`}
    >
      <span className={`mb-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
        {badge.label}
      </span>
      <p className="flex-1 text-xs font-semibold leading-snug text-[var(--text-primary)] line-clamp-3">
        {topic.title}
      </p>

      {/* Status row */}
      <div className={`mt-2 flex items-center gap-1 ${display.color}`}>
        {display.icon}
        <span className="text-[10px] font-medium leading-none">{display.label}</span>
      </div>

      {/* Download button for complete videos */}
      {isComplete && outputUrl && (
        <button
          type="button"
          onClick={handleDownload}
          className="absolute bottom-2 right-2 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
          aria-label="Download video"
          title="Download video"
        >
          <Download className="h-3 w-3" />
        </button>
      )}
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
  const [format, setFormat] = useState<ContentFormat>(panel.topic.format as ContentFormat);
  const [angle, setAngle] = useState(panel.topic.angle);
  const [scriptOutline, setScriptOutline] = useState(panel.topic.scriptOutline);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit Video Idea</h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Hook (opening line)</span>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ContentFormat)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{FORMAT_BADGE[f].label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Angle</span>
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Script Outline</span>
          <textarea
            value={scriptOutline}
            onChange={(e) => setScriptOutline(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
      </div>
      <div className="flex gap-2 border-t border-[var(--bg-border)] px-5 py-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button
          onClick={() => onSave(panel.topicIndex, { title, hook, format, angle, scriptOutline })}
          disabled={saving}
          className="flex-1 gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Override"}
        </Button>
      </div>
    </div>
  );
}

// ─── Slim progress bar (post-approval) ───────────────────────────────────────

function PlanProgressBar({
  planId,
  progress,
  onRetry,
}: {
  planId: string;
  progress: PlanProgressState;
  onRetry: () => void;
}) {
  const router = useRouter();
  const totalVideos = progress.totalCount;
  const pct = totalVideos > 0 ? Math.round((progress.completedCount / totalVideos) * 100) : 0;
  const [retrying, setRetrying] = useState(false);
  const api = useApiClient();

  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => {
    if (progress.videoStatuses.size > 0 || progress.isBatchComplete) return;
    const t = setTimeout(() => setShowRetry(true), 15_000);
    return () => clearTimeout(t);
  }, [progress.videoStatuses.size, progress.isBatchComplete]);

  async function handleRetry() {
    setRetrying(true);
    setShowRetry(false);
    await withToast(() => api.contentPlans.retryGeneration(planId), "Retry failed");
    setRetrying(false);
    onRetry();
  }

  if (progress.isBatchComplete) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent-success)]" />
          <span className="text-sm font-semibold text-[var(--accent-success)]">
            All done — {progress.completedCount} video{progress.completedCount !== 1 ? "s" : ""} ready
          </span>
          {progress.failedCount > 0 && (
            <span className="text-xs text-[var(--accent-danger)]">· {progress.failedCount} failed</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => router.push(`/library?plan=${planId}`)} className="h-8 px-3 text-xs gap-1">
          View in Library →
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          </span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Generating — {progress.completedCount}/{totalVideos} complete
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {pct === 0 ? (
          <div className="h-full w-1/4 animate-pulse rounded-full bg-[var(--accent-primary)]/40" />
        ) : (
          <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-700" style={{ width: `${pct}%` }} />
        )}
      </div>
      {showRetry && (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 text-xs text-[var(--accent-warning)]">Seems stuck.</span>
          <Button variant="secondary" onClick={handleRetry} disabled={retrying} className="h-7 px-3 text-xs">
            {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentPlanPage() {
  const { id: brandId, planId } = useParams<{ id: string; planId: string }>();
  const api = useApiClient();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [overridePanel, setOverridePanel] = useState<OverridePanel | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [postType, setPostType] = useState<PostType>("draft");

  // Live status from SSE (post-approval)
  const totalVideos = plan ? plan.postsPerDay * 7 : 0;
  const progress = usePlanProgress(plan?.status !== "draft" ? planId : "", totalVideos);

  const loadPlan = useCallback(async () => {
    const result = await withToast(() => api.contentPlans.get(planId), "Failed to load plan");
    if (result?.data) {
      const data = result.data as unknown as ContentPlan & { videos: VideoInfo[] };
      setPlan(data);
      setVideos(data.videos ?? []);
    }
    setLoading(false);
  }, [api, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  // Refresh video data when batch completes to pick up outputUrls + postSchedule
  useEffect(() => {
    if (progress.isBatchComplete) {
      void loadPlan();
    }
  }, [progress.isBatchComplete, loadPlan]);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await withToast(() => api.contentPlans.regenerate(planId), "Regeneration failed");
    if (result?.data) {
      setPlan(result.data);
      toast.success("Plan regenerated");
    }
    setRegenerating(false);
  }

  async function handleSaveOverride(index: number, data: Partial<TopicEntry>) {
    setSavingOverride(true);
    const result = await withToast(
      () => api.contentPlans.overrideTopic(planId, index, data as Parameters<typeof api.contentPlans.overrideTopic>[2]),
      "Failed to save override"
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
    const result = await withToast(() => api.contentPlans.approve(planId, { postType }), "Failed to approve plan");
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

  const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
  const postsPerDay = plan.postsPerDay;
  const weekDates = getWeekDates(plan.weekStartDate);
  const slotTimes = SLOT_TIMES[postsPerDay] ?? SLOT_TIMES[1] ?? ["9:00 AM"];
  const isDraft = plan.status === "draft";
  const planPostType = plan.postType ?? "manual";

  // Merge live SSE statuses into video lookup
  const mergedVideoByTitle = new Map(
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
    <div className="mx-auto max-w-full px-4 py-6">
      {overridePanel && (
        <OverridePanelDrawer
          panel={overridePanel}
          onClose={() => setOverridePanel(null)}
          onSave={handleSaveOverride}
          saving={savingOverride}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Content Calendar</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            From {plan.weekStartDate} &middot; {postsPerDay} post{postsPerDay > 1 ? "s" : ""}/day &middot; {topics.length} videos
          </p>
        </div>
        {isDraft && (
          <Button onClick={handleRegenerate} disabled={regenerating} className="gap-2" variant="secondary">
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
        )}
      </div>

      {/* Progress bar (post-approval) */}
      {!isDraft && (
        <PlanProgressBar
          planId={planId}
          progress={progress}
          onRetry={loadPlan}
        />
      )}

      {/* Full-width calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="mb-2 grid gap-2" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
            <div />
            {weekDates.map((date, i) => (
              <div key={i} className="rounded-lg bg-[var(--bg-elevated)] px-2 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                </p>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}
                </p>
              </div>
            ))}
          </div>

          {/* Slot rows */}
          {Array.from({ length: postsPerDay }, (_, slotIdx) => {
            const slotTime = slotTimes[slotIdx] ?? "";
            return (
              <div key={slotIdx} className="mb-2 grid gap-2" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
                <div className="flex items-start justify-end pt-3 pr-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-medium leading-tight text-[var(--text-muted)]">
                    <Clock className="h-2.5 w-2.5" />
                    {slotTime}
                  </span>
                </div>

                {weekDates.map((_, dayIdx) => {
                  const dayNumber = dayIdx + 1;
                  const topic = topics.find((t) => t.day === dayNumber && t.slot === slotIdx + 1);

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
                        onEdit={() => setOverridePanel({ topic, topicIndex: topic.index })}
                      />
                    );
                  }

                  const video = mergedVideoByTitle.get(topic.title) ?? null;
                  return (
                    <ActiveCell
                      key={dayIdx}
                      topic={topic}
                      video={video}
                      planPostType={planPostType}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approve section (draft only) */}
      {isDraft && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Posting mode
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  { value: "draft", label: "Save as Drafts", description: "Videos created as Facebook drafts — you publish manually" },
                  { value: "scheduled", label: "Schedule Automatically", description: "Posts auto-scheduled at optimal slots throughout the week" },
                  { value: "manual", label: "Download Only", description: "No Facebook posting — download the MP4s yourself" },
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
                  <p className={`text-xs font-semibold ${postType === opt.value ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleApprove} disabled={approving} className="w-full gap-2 py-3 text-base">
            {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Start Generating →
          </Button>
        </div>
      )}
    </div>
  );
}
