"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Circle, Sparkles } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import { usePlanProgress } from "@/hooks/usePlanProgress";
import type { ContentPlan } from "@repo/types";

const STATUS_CONFIG: Record<
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
    label: "Writing script…",
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
  POSTING: {
    label: "Posting to Facebook…",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-400",
    order: 2,
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-[var(--accent-danger)]",
    order: 3,
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: "Waiting",
      icon: <Circle className="h-4 w-4" />,
      color: "text-[var(--text-muted)]",
      order: 4,
    }
  );
}

export default function PlanProgressPage() {
  const { id: brandId, planId } = useParams<{ id: string; planId: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const loadPlan = useCallback(async () => {
    const result = await withToast(() => api.contentPlans.get(planId), "Failed to load plan");
    if (result?.data) setPlan(result.data as ContentPlan);
    setLoadingPlan(false);
  }, [api, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const totalVideos = plan ? plan.postsPerDay * 7 : 0;
  const progress = usePlanProgress(planId, totalVideos);

  const sortedEntries = [...progress.videoStatuses.entries()].sort(
    ([, a], [, b]) => getStatusConfig(a.status).order - getStatusConfig(b.status).order
  );

  const pct = totalVideos > 0 ? Math.round((progress.completedCount / totalVideos) * 100) : 0;

  if (loadingPlan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Status banner */}
      <div
        className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-6 py-5"
        style={{ borderLeftWidth: "4px", borderLeftColor: "var(--accent-primary)" }}
      >
        {progress.isBatchComplete ? (
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <Sparkles className="h-8 w-8 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              All done! {progress.completedCount} video
              {progress.completedCount !== 1 ? "s" : ""} ready
            </h1>
            {progress.failedCount > 0 && (
              <p className="mt-1 text-sm text-[var(--accent-danger)]">
                {progress.failedCount} video{progress.failedCount !== 1 ? "s" : ""} failed
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Check your email for a summary.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                onClick={() => router.push(`/library?plan=${planId}`)}
                className="gap-2"
              >
                Review Videos →
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/brands/${brandId}/plan/${planId}`)}
              >
                View Content Plan
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
                <h1 className="text-base font-semibold text-[var(--text-primary)]">
                  Generating your Week 1 content
                </h1>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {progress.completedCount} / {totalVideos} &middot; {pct}%
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              You can close this tab — we&apos;ll email you when everything&apos;s ready
            </p>
          </>
        )}
      </div>

      {/* Activity feed */}
      <div className="overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Activity
          </span>
          {!progress.isBatchComplete && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/brands/${brandId}/plan/${planId}`)}
              className="h-6 px-2 text-[10px]"
            >
              View Plan
            </Button>
          )}
        </div>

        {sortedEntries.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            Waiting for generation to start&hellip;
          </div>
        ) : (
          <div
            className="divide-y divide-[var(--bg-border)] overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {sortedEntries.map(([videoId, entry]) => {
              const cfg = getStatusConfig(entry.status);
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

      {/* Summary bar */}
      {totalVideos > 0 && !progress.isBatchComplete && (
        <div className="mt-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-5 py-3 text-center text-sm text-[var(--text-secondary)]">
          {progress.completedCount} / {totalVideos} videos complete
          {progress.failedCount > 0 && (
            <span className="ml-2 text-[var(--accent-danger)]">
              &middot; {progress.failedCount} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
