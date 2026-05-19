"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CalendarDays, Lock, ArrowUpRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { PlanType } from "@repo/types";
import { useApiClient } from "@/lib/api-client";
import { useUser } from "@/lib/hooks/use-user";

type PostsPerDay = 1 | 3;

interface CadenceOption {
  value: PostsPerDay;
  label: string;
  sub: string;
  total: number;
  requiredPlan: "any" | "pro";
}

const CADENCE_OPTIONS: CadenceOption[] = [
  {
    value: 1,
    label: "1 video / day",
    sub: "Consistent daily presence · 7 videos total",
    total: 7,
    requiredPlan: "any",
  },
  {
    value: 3,
    label: "3 videos / day",
    sub: "High-volume growth · 21 videos total",
    total: 21,
    requiredPlan: "pro",
  },
];

function PaywallOverlay() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-primary)]/10">
          <Lock className="h-6 w-6 text-[var(--accent-primary)]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Upgrade to start</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          You need a plan to generate a content calendar. Try Out gives you one full week to see how it works.
        </p>
        <div className="mt-6 space-y-2">
          <Link
            href="/billing"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <ArrowUpRight className="h-4 w-4" />
            See Plans →
          </Link>
          <Link
            href="/brands"
            className="block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to Brands
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function NewContentPlanPage() {
  const { id: brandId } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const { user, loading: userLoading } = useUser();
  const [selected, setSelected] = useState<PostsPerDay>(1);
  const [loading, setLoading] = useState(false);

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const plan = user?.plan ?? PlanType.None;
  const trialPaid = !!user?.trialPaid;
  const hasAccess = plan === PlanType.Starter || plan === PlanType.Pro || trialPaid;

  if (!hasAccess) {
    return <PaywallOverlay />;
  }

  const isPro = plan === PlanType.Pro;
  const trialRemaining = user?.trialVideoRemaining ?? 0;
  const isTrial = trialPaid && plan !== PlanType.Starter && plan !== PlanType.Pro;

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await api.contentPlans.create({ brandProfileId: brandId, postsPerDay: selected });
      if (result?.data?.id) {
        router.push(`/brands/${brandId}/plan/${result.data.id}`);
      } else {
        toast.error("Failed to generate plan: unexpected response");
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate plan";
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Content Plan</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Claude will plan your full week. All videos generate at once — posting happens day by day automatically.
        </p>
      </div>

      {isTrial && (
        <div className="mb-6 rounded-xl border border-[var(--accent-warning)]/30 bg-[var(--accent-warning)]/8 px-4 py-3">
          <p className="text-sm font-medium text-[var(--accent-warning)]">
            Trial: {trialRemaining} of 7 credits remaining
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Creating a 1/day plan uses all 7 credits.{" "}
            <Link href="/billing" className="underline hover:text-[var(--accent-primary)]">
              Upgrade
            </Link>{" "}
            for unlimited monthly plans.
          </p>
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {CADENCE_OPTIONS.map((opt) => {
          const locked = opt.requiredPlan === "pro" && !isPro;
          const isSelected = selected === opt.value && !locked;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !locked && setSelected(opt.value)}
              disabled={locked}
              className={`relative rounded-xl border p-5 text-left transition-all ${
                locked
                  ? "cursor-not-allowed border-[var(--bg-border)] bg-[var(--bg-elevated)]/50 opacity-60"
                  : isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/40"
              }`}
            >
              {locked && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  <Lock className="h-2.5 w-2.5" />
                  Pro
                </span>
              )}
              {isSelected && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-[var(--accent-primary)]" />
              )}
              <p className="text-base font-semibold text-[var(--text-primary)]">{opt.label}</p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{opt.sub}</p>
              {locked && (
                <Link
                  href="/billing"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                >
                  Upgrade to Pro <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Claude is planning your week&hellip;
          </>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" />
            Generate Week Plan
          </>
        )}
      </Button>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        All videos are generated upfront. Facebook handles the day-by-day posting automatically.
      </p>
    </div>
  );
}
