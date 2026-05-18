"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Loader2,
  Film,
  Calendar,
  Zap,
} from "lucide-react";
import { useApiClient, withToast } from "@/lib/api-client";

const TOTAL_STEPS = 3;

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const api = useApiClient();
  const router = useRouter();

  async function handleDone() {
    await withToast(
      () => api.users.update({ onboardingComplete: true }),
      "Failed to complete onboarding"
    );
    onComplete();
    router.push("/brands");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-modal)]">
        <div className="flex gap-1 p-4 pb-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {step === 1 && <Step1 onNext={() => setStep(2)} />}
          {step === 2 && (
            <Step2 onBack={() => setStep(1)} onNext={() => setStep(3)} />
          )}
          {step === 3 && (
            <Step3 onDone={handleDone} onBack={() => setStep(2)} />
          )}
        </div>

        <div className="border-t border-[var(--bg-border)] px-6 py-3 text-center text-xs text-[var(--text-muted)]">
          Step {step} of {TOTAL_STEPS}
        </div>
      </div>
    </div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
        <Sparkles className="h-3 w-3" />
        Welcome to ReelForge!
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
        Your agentic content machine
      </h2>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        Set up a brand once — ReelForge plans, scripts, and generates a full week of short-form videos automatically.
      </p>

      <button
        onClick={onNext}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Sparkles className="h-4 w-4" />
        Get Started
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

const HOW_IT_WORKS = [
  { icon: Sparkles, title: "Create a brand", desc: "Set your niche, tone, and visual style once. ReelForge builds a full character sheet." },
  { icon: Calendar, title: "Generate a content plan", desc: "AI plans a week of topics, hooks, and video formats tailored to your brand." },
  { icon: Zap, title: "Approve and generate", desc: "One click — ReelForge scripts, scenes, and assembles all videos automatically." },
  { icon: Film, title: "Review and post", desc: "Download finished 9:16 MP4s or auto-post to Facebook as drafts or scheduled reels." },
  { icon: CheckCircle, title: "Repeat weekly", desc: "A new content plan every week. Your brand grows on autopilot." },
];

function Step2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [activeCard, setActiveCard] = useState(0);

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">How ReelForge works</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Five steps from brand to published video.
      </p>

      <div className="mt-5 space-y-2">
        {HOW_IT_WORKS.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveCard(i)}
              className={`w-full flex items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                activeCard === i
                  ? "bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30"
                  : "hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activeCard === i ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  <span className="mr-1.5 text-xs text-[var(--text-muted)]">0{i + 1}</span>
                  {item.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={onNext}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Step3({ onBack, onDone }: { onBack: () => void; onDone: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleDone() {
    setLoading(true);
    await onDone();
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-success)]/20">
        <CheckCircle className="h-8 w-8 text-[var(--accent-success)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">You&apos;re all set!</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Create your first brand to start generating content automatically.
      </p>

      <button
        onClick={handleDone}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Create My First Brand
      </button>

      <button
        onClick={onBack}
        className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
