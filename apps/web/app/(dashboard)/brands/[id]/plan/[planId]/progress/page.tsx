"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import { usePlanProgress } from "@/hooks/usePlanProgress";
import type { ContentPlan } from "@repo/types";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  SCRIPT_PENDING:     { label: "Scripting…",       icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-amber-400" },
  SCENES_PENDING:     { label: "Planning scenes…",  icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-amber-400" },
  CLIPS_QUEUED:       { label: "In Grok queue…",    icon: <Clock className="h-4 w-4" />,                color: "text-blue-400" },
  CLIPS_PROCESSING:   { label: "Generating clips…", icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-blue-400" },
  ASSEMBLY_PENDING:   { label: "Assembling…",       icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-purple-400" },
  ASSEMBLY_PROCESSING:{ label: "Assembling…",       icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-purple-400" },
  COMPLETE:           { label: "Ready",             icon: <CheckCircle2 className="h-4 w-4" />,         color: "text-[var(--accent-success)]" },
  FAILED:             { label: "Failed",            icon: <XCircle className="h-4 w-4" />,             color: "text-[var(--accent-danger)]" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-[var(--text-muted)]" };
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
  const videoEntries = [...progress.videoStatuses.entries()];

  if (loadingPlan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header banner */}
      <div className="mb-8 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-6 py-5 text-center">
        {progress.isBatchComplete ? (
          <>
            <div className="mb-3 flex justify-center">
              <Sparkles className="h-8 w-8 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              All done! {progress.completedCount} video{progress.completedCount !== 1 ? "s" : ""} ready
            </h1>
            {progress.failedCount > 0 && (
              <p className="mt-1 text-sm text-[var(--accent-danger)]">
                {progress.failedCount} video{progress.failedCount !== 1 ? "s" : ""} failed
              </p>
            )}
            <Button
              onClick={() => router.push(`/brands/${brandId}/plan/${planId}`)}
              className="mt-4 gap-2"
            >
              Review Videos
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent-primary)]" />
              </span>
              <span className="text-sm font-medium text-[var(--accent-primary)]">Generating</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Your content is being generated
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              You can close this tab &mdash; we&apos;ll email you when everything&apos;s ready
            </p>
          </>
        )}
      </div>

      {/* Progress feed */}
      {videoEntries.length > 0 && (
        <div className="mb-6 space-y-2">
          {videoEntries.map(([videoId, entry]) => {
            const cfg = getStatusConfig(entry.status);
            return (
              <div
                key={videoId}
                className="flex items-center gap-3 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3"
              >
                <span className={cfg.color}>{cfg.icon}</span>
                <p className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                  {entry.title || "Untitled video"}
                </p>
                <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {videoEntries.length === 0 && !progress.isBatchComplete && (
        <div className="rounded-lg border border-dashed border-[var(--bg-border)] py-10 text-center text-sm text-[var(--text-muted)]">
          Waiting for generation to start&hellip;
        </div>
      )}

      {/* Summary bar */}
      {totalVideos > 0 && (
        <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-5 py-3 text-center text-sm text-[var(--text-secondary)]">
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
