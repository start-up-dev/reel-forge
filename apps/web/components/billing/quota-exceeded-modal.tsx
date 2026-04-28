"use client";

import { X, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/button";

interface QuotaExceededModalProps {
  message: string;
  /** "daily" | "monthly" | "trial_exhausted" */
  type: "daily" | "monthly" | "trial_exhausted";
  onClose: () => void;
}

const CONFIG = {
  daily: {
    icon: Calendar,
    title: "Daily limit reached",
    sub: "Your videos reset at midnight UTC.",
    cta: "Upgrade for more daily videos",
  },
  monthly: {
    icon: TrendingUp,
    title: "Monthly limit reached",
    sub: "Your videos reset on the 1st of next month.",
    cta: "Upgrade for a higher monthly cap",
  },
  trial_exhausted: {
    icon: TrendingUp,
    title: "Trial videos used",
    sub: "Your trial videos have been generated.",
    cta: "Subscribe to keep creating",
  },
};

export function QuotaExceededModal({ message, type, onClose }: QuotaExceededModalProps) {
  const { icon: Icon, title, sub, cta } = CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-warning)]/15">
          <Icon className="h-7 w-7 text-[var(--accent-warning)]" />
        </div>

        <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="mb-1 text-sm text-[var(--text-secondary)]">{message}</p>
        <p className="mb-6 text-xs text-[var(--text-muted)]">{sub}</p>

        <div className="flex flex-col gap-2">
          <Link href="/billing" onClick={onClose}>
            <Button className="w-full" size="lg">
              {cta}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
