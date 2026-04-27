"use client";

import { useState } from "react";
import { X, Loader2, Zap, Crown } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";

interface SubscriptionPromptModalProps {
  onClose: () => void;
}

const PLANS = [
  {
    key: "starter" as const,
    label: "Starter",
    price: "$29/mo",
    icon: Zap,
    perks: ["5 videos/day", "150 videos/month", "All styles & voices"],
  },
  {
    key: "pro" as const,
    label: "Pro",
    price: "$79/mo",
    icon: Crown,
    perks: ["15 videos/day", "450 videos/month", "Priority processing"],
    highlight: true,
  },
];

export function SubscriptionPromptModal({ onClose }: SubscriptionPromptModalProps) {
  const api = useApiClient();
  const [loading, setLoading] = useState<"starter" | "pro" | null>(null);

  async function handleSubscribe(plan: "starter" | "pro") {
    setLoading(plan);
    const result = await withToast(
      () => api.billing.subscribe(plan),
      "Failed to start checkout"
    );
    if (result?.data?.url) {
      window.location.href = result.data.url;
    } else {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
            Your first video is done 🎉
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            Keep the momentum going
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Subscribe to create unlimited short-form content for your channels.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLANS.map(({ key, label, price, icon: Icon, perks, highlight }) => (
            <div
              key={key}
              className={`rounded-xl border p-5 ${
                highlight
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/8 shadow-[0_0_0_1px_var(--accent-primary)]"
                  : "border-[var(--bg-border)] bg-[var(--bg-elevated)]"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${highlight ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                {highlight && (
                  <span className="ml-auto rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Popular
                  </span>
                )}
              </div>
              <p className="mb-3 text-2xl font-black text-[var(--text-primary)]">{price}</p>
              <ul className="mb-4 space-y-1">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-success)]">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(key)}
                disabled={loading !== null}
                variant={highlight ? "primary" : "secondary"}
                size="sm"
                className="w-full"
              >
                {loading === key ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </span>
                ) : (
                  `Get ${label}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Cancel anytime · Secured by Stripe
        </p>
      </div>
    </div>
  );
}
