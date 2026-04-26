"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";

interface TrialPaymentModalProps {
  videoId: string;
  onClose: () => void;
}

export function TrialPaymentModal({
  videoId,
  onClose,
}: TrialPaymentModalProps) {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    const result = await withToast(
      () => api.billing.trialCheckout(videoId),
      "Failed to start checkout",
    );
    if (result?.data?.url) {
      window.location.href = result.data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15">
          <Sparkles className="h-7 w-7 text-[var(--accent-primary)]" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
          Generate your first video
        </h2>
        <p className="mb-1 text-sm text-[var(--text-secondary)]">
          One-time payment · No subscription required
        </p>

        {/* Price callout */}
        <div className="my-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/8 px-5 py-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-[var(--text-primary)]">
              $5
            </span>
            <span className="text-sm text-[var(--text-muted)]">one time</span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Unlocks 3 full video — script, voiceover, scenes, and final MP4.
          </p>
        </div>

        {/* What you get */}
        <ul className="mb-6 space-y-1.5 text-sm text-[var(--text-secondary)]">
          {[
            "AI script written for your channel",
            "ElevenLabs voice-over in your language",
            "AI-generated video clips per scene",
            "Subtitles + BGM burned in",
            "Download-ready MP4",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-[var(--accent-success)]">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <Button
          onClick={handlePay}
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to checkout…
            </span>
          ) : (
            "Pay $5 and Generate Video"
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Secured by Stripe · Cancel anytime before paying
        </p>
      </div>
    </div>
  );
}
