"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, CheckCircle, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@repo/ui/progress";
import { Badge } from "@repo/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import { useApiClient, withToast } from "@/lib/api-client";
import { PlanType } from "@repo/types";

const planLabels: Record<PlanType, string> = {
  [PlanType.None]: "No Plan",
  [PlanType.TryOut]: "Try Out",
  [PlanType.Starter]: "Starter",
  [PlanType.Pro]: "Pro",
};

const plans = [
  {
    name: "Try Out",
    price: "$5",
    period: "one time",
    planType: PlanType.TryOut,
    features: ["3 video credits", "All subtitle styles", "20+ AI voices", "1080×1920 MP4 output"],
  },
  {
    name: "Starter",
    price: "$49",
    period: "/ month",
    planType: PlanType.Starter,
    features: ["5 videos per day", "150 videos per month", "All platforms", "BGM library", "Email notifications"],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/ month",
    planType: PlanType.Pro,
    highlight: true,
    badge: "Most Popular",
    features: ["15 videos per day", "450 videos per month", "All Starter features", "Priority queue", "Custom voice prompts"],
  },
];

export default function BillingPage() {
  const { user, loading, refetch } = useUser();
  const api = useApiClient();
  const searchParams = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("trial_success") === "1") {
      toast.success("Try Out activated! 3 videos are ready to create.");
      void refetch();
    } else if (searchParams.get("subscribed") === "1") {
      toast.success("Subscription activated! Welcome aboard.");
      void refetch();
    }
  }, [searchParams, refetch]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    const result = await withToast(() => api.billing.portal(), "Failed to open billing portal");
    setPortalLoading(false);
    if (result?.data?.url) window.location.href = result.data.url;
  }

  async function handleUpgrade(plan: PlanType) {
    if (plan === PlanType.TryOut) {
      setCheckoutLoading(PlanType.TryOut);
      const result = await withToast(() => api.billing.trialCheckout(), "Failed to start checkout");
      setCheckoutLoading(null);
      if (result?.data?.url) window.location.href = result.data.url;
    } else if (plan === PlanType.Starter || plan === PlanType.Pro) {
      setCheckoutLoading(plan);
      const result = await withToast(() => api.billing.subscribe(plan), "Failed to start checkout");
      setCheckoutLoading(null);
      if (result?.data?.url) window.location.href = result.data.url;
    }
  }

  async function handleDevSimulate(plan: PlanType) {
    setCheckoutLoading(plan);
    const result = await withToast(() => api.billing.devSimulate(plan), "Simulation failed");
    setCheckoutLoading(null);
    if (result) {
      toast.success(`Simulated ${planLabels[plan]} plan`);
      void refetch();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const currentPlan = user?.plan ?? PlanType.None;
  const dailyUsed = user?.videosToday ?? 0;
  const dailyLimit = currentPlan === PlanType.None ? 0 : (user?.dailyLimit ?? 0);
  const monthlyUsed = user?.videosThisMonth ?? 0;
  const monthlyLimit = currentPlan === PlanType.None ? 0 : (user?.monthlyLimit ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Billing</h2>

      {/* Current plan card */}
      <section className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Current Plan</p>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                {currentPlan === PlanType.None ? "No Active Plan" : planLabels[currentPlan]}
              </h3>
              {currentPlan !== PlanType.None && (
                <Badge
                  variant={
                    currentPlan === PlanType.Pro
                      ? "primary"
                      : currentPlan === PlanType.Starter
                        ? "secondary"
                        : "default"
                  }
                >
                  {planLabels[currentPlan]}
                </Badge>
              )}
            </div>
          </div>
          {currentPlan !== PlanType.None && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage Subscription
            </button>
          )}
        </div>

        {/* Usage meters */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Videos today</span>
              <span className="font-medium text-[var(--text-primary)]">
                {dailyUsed} / {dailyLimit}
              </span>
            </div>
            <ProgressBar
              value={dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0}
              color={dailyLimit > 0 && dailyUsed >= dailyLimit ? "danger" : dailyLimit > 0 && dailyUsed / dailyLimit > 0.8 ? "warning" : "primary"}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Videos this month</span>
              <span className="font-medium text-[var(--text-primary)]">
                {monthlyUsed} / {monthlyLimit}
              </span>
            </div>
            <ProgressBar
              value={monthlyLimit > 0 ? (monthlyUsed / monthlyLimit) * 100 : 0}
              color={monthlyLimit > 0 && monthlyUsed >= monthlyLimit ? "danger" : monthlyLimit > 0 && monthlyUsed / monthlyLimit > 0.8 ? "warning" : "primary"}
            />
          </div>
        </div>

        {currentPlan === PlanType.None && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            You don&apos;t have an active plan.{" "}
            <Link href="#plans" className="text-[var(--accent-primary)] hover:underline">
              Try Out for $5
            </Link>{" "}
            or subscribe to Starter or Pro for daily video creation.
          </p>
        )}
      </section>

      {/* Dev tools */}
      {process.env.NODE_ENV === "development" && (
        <section className="rounded-xl border border-dashed border-[var(--accent-warning)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent-warning)]">
            Dev Tools
          </p>
          <div className="flex flex-wrap gap-2">
            {([PlanType.TryOut, PlanType.Starter, PlanType.Pro] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleDevSimulate(p)}
                disabled={!!checkoutLoading || currentPlan === p}
                className="rounded-lg border border-[var(--accent-warning)] px-3 py-1.5 text-xs font-medium text-[var(--accent-warning)] hover:bg-[var(--accent-warning)] hover:text-black transition-colors disabled:opacity-40"
              >
                {checkoutLoading === p ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  `Simulate ${planLabels[p]}`
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Plan comparison */}
      <section id="plans">
        <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          Available Plans
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.planType === currentPlan;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl p-5 ${
                  plan.highlight
                    ? "border border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-[var(--shadow-glow-accent)]"
                    : "border border-[var(--bg-border)] bg-[var(--bg-surface)]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-primary)] px-3 py-0.5 text-[10px] font-semibold text-white">
                    {plan.badge}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-success)] px-3 py-0.5 text-[10px] font-semibold text-white">
                    Current Plan
                  </div>
                )}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">
                    {plan.name}
                  </h4>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="mb-0.5 text-xs text-[var(--text-muted)]">{plan.period}</span>
                  </div>
                </div>
                <ul className="mb-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[var(--accent-success)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-muted)]">
                    <CheckCircle className="h-3.5 w-3.5 text-[var(--accent-success)]" />
                    Active
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.planType)}
                    disabled={!!checkoutLoading}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${
                      plan.highlight
                        ? "bg-[var(--accent-primary)] text-white"
                        : "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {checkoutLoading === plan.planType ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                    {currentPlan === PlanType.None ? "Get" : "Upgrade to"} {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
