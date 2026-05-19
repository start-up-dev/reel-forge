"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Plus,
  CalendarDays,
  Pencil,
  ChevronRight,
  UserSquare2,
  Globe,
  Plug,
} from "lucide-react";
import { Button } from "@repo/ui/button";
import type { BrandProfile, ContentPlan } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  draft:      { label: "Draft",      className: "bg-[var(--bg-border)] text-[var(--text-muted)]" },
  approved:   { label: "Approved",   className: "bg-blue-500/15 text-blue-400" },
  generating: { label: "Generating", className: "bg-amber-500/15 text-amber-400" },
  complete:   { label: "Complete",   className: "bg-[var(--accent-success)]/15 text-[var(--accent-success)]" },
};

function formatWeekOf(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function PlanStatusDot({ status }: { status: string }) {
  if (status === "generating") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
      </span>
    );
  }
  return null;
}

export default function BrandHubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);

  const load = useCallback(async () => {
    const [brandResult, plansResult] = await Promise.all([
      withToast(() => api.brands.get(id), "Failed to load brand"),
      withToast(() => api.contentPlans.listForBrand(id), "Failed to load plans"),
    ]);
    if (brandResult?.data) setBrand(brandResult.data as BrandProfile);
    if (plansResult?.data) setPlans(plansResult.data as ContentPlan[]);
    setLoading(false);
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddChannel() {
    setAddingChannel(true);
    const result = await withToast(() => api.social.authorize(id), "Failed to start Facebook OAuth");
    if (result?.data?.authUrl) {
      window.location.href = result.data.authUrl;
    }
    setAddingChannel(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Brand not found.
      </div>
    );
  }

  const activePlan = plans.find((p) => p.status === "generating" || p.status === "approved");
  const latestPlan = plans[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Brand header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <UserSquare2 className="h-6 w-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{brand.name}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {brand.niche}
              {brand.tone ? ` · ${brand.tone}` : ""}
              {brand.visualStyle ? ` · ${brand.visualStyle}` : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/brands/${id}/edit`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </div>

      {/* Active generation banner */}
      {activePlan && (
        <button
          type="button"
          onClick={() => router.push(`/brands/${id}/plan/${activePlan.id}`)}
          className="mb-6 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left transition-colors hover:bg-amber-500/15"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlanStatusDot status={activePlan.status} />
              <span className="text-sm font-semibold text-amber-400">
                {activePlan.status === "generating" ? "Generation in progress" : "Plan approved"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Week of {formatWeekOf(activePlan.weekStartDate)} &middot; {activePlan.postsPerDay * 7} videos
          </p>
        </button>
      )}

      {/* Channels section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Channels
          </h2>
          <button
            type="button"
            onClick={() => void handleAddChannel()}
            disabled={addingChannel}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {addingChannel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            Add Channel
          </button>
        </div>
        {brand.channels && brand.channels.length > 0 ? (
          <ul className="space-y-2">
            {brand.channels.map((ch) => (
              <li key={ch.id} className="flex items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2.5">
                {ch.pageAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ch.pageAvatarUrl} alt={ch.pageName} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-border)]">
                    <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{ch.pageName}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[var(--accent-secondary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-secondary)]">
                  {ch.platform}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--bg-border)] px-4 py-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">No channels connected yet.</p>
          </div>
        )}
      </div>

      {/* Content Plans section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Content Plans
        </h2>
        {brand.onboardingComplete && (
          <Button asChild variant="secondary" className="h-8 gap-1.5 px-3 text-xs">
            <Link href={`/brands/${id}/plan/new`}>
              <Plus className="h-3.5 w-3.5" />
              New Plan
            </Link>
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--bg-border)] py-12 text-center">
          <CalendarDays className="h-8 w-8 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No content plans yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {brand.onboardingComplete
                ? "Create your first week plan to start generating videos."
                : "Complete brand setup before creating a content plan."}
            </p>
          </div>
          {brand.onboardingComplete ? (
            <Button asChild>
              <Link href={`/brands/${id}/plan/new`}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Week Plan
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href={`/brands/${id}/character-sheet`}>Complete Setup</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => {
            const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE["draft"]!;
            const isActive = plan.status === "generating" || plan.status === "approved";
            return (
              <li key={plan.id}>
                <Link
                  href={`/brands/${id}/plan/${plan.id}`}
                  className="flex items-center gap-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-5 py-4 transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)]"
                >
                  <CalendarDays className={`h-5 w-5 shrink-0 ${isActive ? "text-amber-400" : "text-[var(--text-muted)]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Week of {formatWeekOf(plan.weekStartDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {plan.postsPerDay} post{plan.postsPerDay > 1 ? "s" : ""}/day &middot; {plan.postsPerDay * 7} videos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && <PlanStatusDot status={plan.status} />}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
                      {badge.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Latest complete plan quick link */}
      {latestPlan?.status === "complete" && !activePlan && (
        <div className="mt-6">
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/library?plan=${latestPlan.id}`}>
              View Videos from Latest Plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
