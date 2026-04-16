"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  Mic,
  Image,
  Film,
  Download,
  CheckCircle,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import { useApiClient, withToast } from "@/lib/api-client";
import type { Project } from "@repo/types";

const TOTAL_STEPS = 3;

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(true);
  const api = useApiClient();
  const router = useRouter();

  async function handleDone() {
    await withToast(
      () => api.users.update({ onboardingComplete: true }),
      "Failed to complete onboarding"
    );
    onComplete();
    if (createdProject) {
      router.push(`/projects/${createdProject.id}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-modal)]">
        {/* Step progress bar */}
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
          {step === 1 && (
            <Step1
              onNext={(project) => {
                setCreatedProject(project);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <Step2
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              onDone={handleDone}
              onBack={() => setStep(2)}
            />
          )}
        </div>

        {/* Step indicator */}
        <div className="border-t border-[var(--bg-border)] px-6 py-3 text-center text-xs text-[var(--text-muted)]">
          Step {step} of {TOTAL_STEPS}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Create First Project ───────────────────────────────────────── */

function Step1({ onNext }: { onNext: (project: Project) => void }) {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
        <Sparkles className="h-3 w-3" />
        Welcome to ReelForge!
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
        Create your first project
      </h2>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        A project is a channel or content niche. Set it up once — ReelForge will tailor every script, voice, and visual style for it.
      </p>

      <button
        onClick={() => setModalOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Sparkles className="h-4 w-4" />
        Set Up My First Project
        <ArrowRight className="h-4 w-4" />
      </button>

      <CreateProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={(project) => {
          setModalOpen(false);
          onNext(project);
        }}
      />
    </div>
  );
}

/* ── Step 2: How It Works ───────────────────────────────────────────────── */

const HOW_IT_WORKS = [
  { icon: Sparkles, title: "Write your idea", desc: "Type a topic or let AI brainstorm 3 ideas for you." },
  { icon: CheckCircle, title: "Approve the script", desc: "Review and edit before we generate the voiceover." },
  { icon: Mic, title: "Pick a voice", desc: "Choose from 20+ multilingual AI voices." },
  { icon: Image, title: "Review scenes", desc: "Approve or swap out AI-generated visuals." },
  { icon: Download, title: "Download your video", desc: "Get a finished 1080×1920 MP4 ready to post." },
];

function Step2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [activeCard, setActiveCard] = useState(0);

  // Auto-advance every 3s
  // (Optional enhancement — keep simple for MVP)

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">How ReelForge works</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Five steps from idea to finished video.
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

/* ── Step 3: You're all set ─────────────────────────────────────────────── */

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
        Your first project is ready. Start creating your first video — it takes under 10 minutes.
      </p>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Your first video costs $2 to generate. You&apos;ll be prompted to pay when you hit Submit.
      </p>

      <button
        onClick={handleDone}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Film className="h-4 w-4" />
        )}
        Go to Dashboard
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
