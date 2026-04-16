"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, CheckCircle, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@repo/ui/progress";
import { Badge } from "@repo/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import { useApiClient, withToast } from "@/lib/api-client";
import { PlanType } from "@repo/types";

const planLabels: Record<PlanType, string> = {
  [PlanType.None]: "Free / Trial",
  [PlanType.Starter]: "Starter",
  [PlanType.Pro]: "Pro",
};

const plans = [
  {
    name: "Trial",
    price: "$2",
    period: "one time",
    planType: PlanType.None,
    features: ["1 video credit", "All subtitle styles", "20+ AI voices", "1080×1920 MP4 output"],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/ month",
    planType: PlanType.Starter,
    features: ["5 videos per day", "150 videos per month", "All platforms", "BGM library", "Email notifications"],
  },
  {
    name: "Pro",
    price: "$79",
    period: "/ month",
    planType: PlanType.Pro,
    highlight: true,
    badge: "Most Popular",
    features: ["15 videos per day", "450 videos per month", "All Starter features", "Priority queue", "Custom voice prompts"],
  },
];

export default function BillingPage() {
  const { user, loading } = useUser();
  const api = useApiClient();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function handleManageSubscription() {
    setPortalLoading(true);
    const result = await withToast(
      () => api.library.list({ limit: 1 }) as unknown as Promise<{ url: string }>,
      "Failed to open billing portal"
    );
    setPortalLoading(false);
    // In production this would open the Stripe portal URL
    toast.info("Stripe billing portal coming soon");
  }

  async function handleUpgrade(planName: string) {
    setCheckoutLoading(planName);
    // In production this calls POST /api/billing/subscribe
    await new Promise((r) => setTimeout(r, 500));
    setCheckoutLoading(null);
    toast.info("Stripe checkout coming soon");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const dailyUsed = user?.videosToday ?? 0;
  const dailyLimit = user?.dailyLimit ?? 1;
  const monthlyUsed = user?.videosThisMonth ?? 0;
  const monthlyLimit = user?.monthlyLimit ?? 1;
  const currentPlan = user?.plan ?? PlanType.None;

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
                {planLabels[currentPlan]}
              </h3>
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
              value={(dailyUsed / dailyLimit) * 100}
              color={dailyUsed >= dailyLimit ? "danger" : dailyUsed / dailyLimit > 0.8 ? "warning" : "primary"}
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
              value={(monthlyUsed / monthlyLimit) * 100}
              color={monthlyUsed >= monthlyLimit ? "danger" : monthlyUsed / monthlyLimit > 0.8 ? "warning" : "primary"}
            />
          </div>
        </div>

        {currentPlan === PlanType.None && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            You&apos;re on the Trial plan.{" "}
            <Link href="#plans" className="text-[var(--accent-primary)] hover:underline">
              Upgrade to Starter or Pro
            </Link>{" "}
            for daily video creation.
          </p>
        )}
      </section>

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
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={!!checkoutLoading}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${
                      plan.highlight
                        ? "bg-[var(--accent-primary)] text-white"
                        : "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {checkoutLoading === plan.name ? (
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
