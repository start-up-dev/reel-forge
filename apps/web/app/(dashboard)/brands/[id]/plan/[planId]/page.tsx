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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { ContentPlan, ContentFormat, PostType, TopicEntry } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import { usePlanProgress } from "@/hooks/usePlanProgress";

const SLOT_TIMES: Record<number, string[]> = {
  1: ["9:00 AM"],
  2: ["9:00 AM", "6:00 PM"],
  3: ["9:00 AM", "12:00 PM", "6:00 PM"],
  5: ["7:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"],
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

const VIDEO_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; order: number }
> = {
  COMPLETE: {
    label: "Ready",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-[var(--accent-success)]",
    order: 0,
  },
  SCRIPT_PENDING: {
    label: "Scripting…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-amber-400",
    order: 2,
  },
  SCENES_PENDING: {
    label: "Planning scenes…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-amber-400",
    order: 2,
  },
  CLIPS_QUEUED: {
    label: "In Grok queue…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-400",
    order: 2,
  },
  CLIPS_PROCESSING: {
    label: "Generating clips…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-400",
    order: 2,
  },
  ASSEMBLY_PENDING: {
    label: "Assembling video…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-purple-400",
    order: 2,
  },
  ASSEMBLY_PROCESSING: {
    label: "Assembling video…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-purple-400",
    order: 2,
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-[var(--accent-danger)]",
    order: 3,
  },
};

function getVideoStatusCfg(status: string) {
  return (
    VIDEO_STATUS_CONFIG[status] ?? {
      label: "Waiting",
      icon: <Circle className="h-4 w-4" />,
      color: "text-[var(--text-muted)]",
      order: 4,
    }
  );
}

interface OverridePanel {
  topic: TopicEntry;
  topicIndex: number;
}

function TopicCard({ topic, onEdit }: { topic: TopicEntry; onEdit: () => void }) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;

  return (
    <div className="relative min-h-[110px] rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3">
      {topic.overridden && (
        <span className="absolute right-2 top-2 rounded-full bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
          edited
        </span>
      )}
      <div className="mb-1.5 flex items-start gap-1.5">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mb-1 pr-6 text-xs font-semibold leading-snug text-[var(--text-primary)] line-clamp-2">
        {topic.title}
      </p>
      <p className="line-clamp-2 text-[11px] italic text-[var(--text-muted)]">{topic.hook}</p>
      <button
        type="button"
        onClick={onEdit}
        className="absolute bottom-2 right-2 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        aria-label="Edit topic"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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
              <option key={f} value={f}>
                {FORMAT_BADGE[f].label}
              </option>
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
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
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

function AgentActivityPanel({
  planId,
  totalVideos,
  brandId,
}: {
  planId: string;
  totalVideos: number;
  brandId: string;
}) {
  const router = useRouter();
  const api = useApiClient();
  const progress = usePlanProgress(planId, totalVideos);
  const pct = totalVideos > 0 ? Math.round((progress.completedCount / totalVideos) * 100) : 0;
  const [retrying, setRetrying] = useState(false);
  // Show retry after 15s with no activity
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
  }

  const sortedEntries = [...progress.videoStatuses.entries()].sort(
    ([, a], [, b]) => getVideoStatusCfg(a.status).order - getVideoStatusCfg(b.status).order
  );

  return (
    <div className="mt-8 space-y-3">
      {/* Status banner */}
      <div
        className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-5 py-4"
        style={{ borderLeftWidth: "4px", borderLeftColor: "var(--accent-primary)" }}
      >
        {progress.isBatchComplete ? (
          <div className="text-center">
            <div className="mb-2 flex justify-center">
              <Sparkles className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <p className="font-semibold text-[var(--text-primary)]">
              All done!{" "}
              {progress.completedCount} video{progress.completedCount !== 1 ? "s" : ""} ready
            </p>
            {progress.failedCount > 0 && (
              <p className="mt-0.5 text-sm text-[var(--accent-danger)]">
                {progress.failedCount} failed
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--text-muted)]">Check your email for a summary.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => router.push(`/library?plan=${planId}`)} className="gap-2">
                Review Videos →
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/brands/${brandId}`)}
              >
                View Brand
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Generating your Week 1 content
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {progress.completedCount} / {totalVideos} &middot; {pct}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              {pct === 0 ? (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--accent-primary)]/40" />
              ) : (
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              You can close this tab — we&apos;ll email you when everything&apos;s ready
            </p>
            {showRetry && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--accent-warning)]/30 bg-[var(--accent-warning)]/10 px-3 py-2">
                <span className="flex-1 text-xs text-[var(--accent-warning)]">
                  Generation seems stuck. Try restarting?
                </span>
                <Button
                  variant="secondary"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="h-7 px-3 text-xs"
                >
                  {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Retry"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Activity feed */}
      {(sortedEntries.length > 0 || !progress.isBatchComplete) && (
        <div className="overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <div className="border-b border-[var(--bg-border)] px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Activity
            </span>
          </div>
          {sortedEntries.length === 0 ? (
            <div className="divide-y divide-[var(--bg-border)]">
              {Array.from({ length: Math.min(totalVideos, 5) }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
                  <div
                    className="h-2.5 animate-pulse rounded-full bg-[var(--bg-elevated)]"
                    style={{ width: `${45 + (i * 11) % 35}%` }}
                  />
                  <div className="ml-auto h-2.5 w-14 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--bg-border)]">
              {sortedEntries.map(([videoId, entry]) => {
                const cfg = getVideoStatusCfg(entry.status);
                return (
                  <div key={videoId} className="flex items-center gap-3 px-4 py-3">
                    <span className={`shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                    <p className="flex-1 truncate text-sm text-[var(--text-primary)]">
                      {entry.title || "Untitled video"}
                    </p>
                    <span className={`shrink-0 text-xs ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContentPlanPage() {
  const { id: brandId, planId } = useParams<{ id: string; planId: string }>();
  const api = useApiClient();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [overridePanel, setOverridePanel] = useState<OverridePanel | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [postType, setPostType] = useState<PostType>("draft");

  const loadPlan = useCallback(async () => {
    const result = await withToast(() => api.contentPlans.get(planId), "Failed to load plan");
    if (result?.data) setPlan(result.data as ContentPlan);
    setLoading(false);
  }, [api, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await withToast(
      () => api.contentPlans.regenerate(planId),
      "Regeneration failed"
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
          data as Parameters<typeof api.contentPlans.overrideTopic>[2]
        ),
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
    const result = await withToast(
      () => api.contentPlans.approve(planId, { postType }),
      "Failed to approve plan"
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

  const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
  const postsPerDay = plan.postsPerDay;
  const totalVideos = postsPerDay * 7;
  const weekDates = getWeekDates(plan.weekStartDate);
  const slotTimes = SLOT_TIMES[postsPerDay] ?? SLOT_TIMES[1] ?? ["9:00 AM"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {overridePanel && (
        <OverridePanelDrawer
          panel={overridePanel}
          onClose={() => setOverridePanel(null)}
          onSave={handleSaveOverride}
          saving={savingOverride}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Week Plan</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Week of {plan.weekStartDate} &middot; {postsPerDay} post
            {postsPerDay > 1 ? "s" : ""}/day &middot; {topics.length} videos
          </p>
        </div>
        {plan.status === "draft" && (
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
            Regenerate Plan
          </Button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row: time spacer + 7 day columns */}
          <div
            className="mb-2 grid gap-2"
            style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}
          >
            <div /> {/* spacer for time label column */}
            {weekDates.map((date, i) => (
              <div
                key={i}
                className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-center"
              >
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
              <div
                key={slotIdx}
                className="mb-2 grid gap-2"
                style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}
              >
                {/* Time label */}
                <div className="flex items-center justify-end pr-1">
                  <span className="text-[10px] font-medium leading-tight text-[var(--text-muted)]">
                    {slotTime}
                  </span>
                </div>

                {weekDates.map((_, dayIdx) => {
                  const dayNumber = dayIdx + 1;
                  const topic = topics.find(
                    (t) => t.day === dayNumber && t.slot === slotIdx + 1
                  );
                  if (!topic) {
                    return (
                      <div
                        key={dayIdx}
                        className="min-h-[110px] rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/50"
                      />
                    );
                  }
                  return (
                    <TopicCard
                      key={dayIdx}
                      topic={topic}
                      onEdit={() => setOverridePanel({ topic, topicIndex: topic.index })}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approve CTA (draft state) */}
      {plan.status === "draft" && (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Facebook posting
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    value: "draft",
                    label: "Save as Drafts",
                    description: "Posts created as Facebook drafts — publish manually",
                  },
                  {
                    value: "scheduled",
                    label: "Schedule Automatically",
                    description: "Posts scheduled at optimal time slots",
                  },
                  {
                    value: "manual",
                    label: "Download Only",
                    description: "No Facebook posting — download videos yourself",
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
                    className={`text-xs font-semibold ${
                      postType === opt.value
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{opt.description}</p>
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
            Start Generating &rarr;
          </Button>
        </div>
      )}

      {/* Agentic progress panel (post-approval) */}
      {plan.status !== "draft" && (
        <AgentActivityPanel planId={planId} totalVideos={totalVideos} brandId={brandId} />
      )}
    </div>
  );
}
