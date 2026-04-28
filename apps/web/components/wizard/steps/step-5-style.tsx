"use client";

import { useState } from "react";
import { SubtitleStyle } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step5StyleProps {
  video: VideoDetail;
  trialPaid: boolean;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: Partial<{ subtitleStyle: SubtitleStyle }>) => void;
  onBack: () => void;
  onAdvance: () => void;
  onRequestPayment: () => void;
}

interface StyleOption {
  value: SubtitleStyle;
  label: string;
  desc: string;
  preview: string;
  previewClass: string;
}

const SINGLE_WORD_STYLES: StyleOption[] = [
  {
    value: SubtitleStyle.BoldPop,
    label: "Bold Pop",
    desc: "One word at a time, large and bold. High-energy.",
    preview: "BOLD",
    previewClass: "text-xl font-black text-white drop-shadow-lg",
  },
  {
    value: SubtitleStyle.WordHighlight,
    label: "Word Highlight",
    desc: "Each word pops with an orange outline as it's spoken.",
    preview: "Word",
    previewClass: "text-base font-bold text-white [text-shadow:0_0_0_3px_#f55c2a]",
  },
  {
    value: SubtitleStyle.NeonGlow,
    label: "Neon Glow",
    desc: "White text with a thick glowing orange outline. Bold energy.",
    preview: "GLOW",
    previewClass: "text-xl font-black text-white [text-shadow:0_0_12px_#f55c2a,0_0_24px_#f55c2a]",
  },
  {
    value: SubtitleStyle.OversizedPop,
    label: "Oversized Pop",
    desc: "Massive single word, centered in the frame. Maximum impact.",
    preview: "BIG",
    previewClass: "text-3xl font-black text-white drop-shadow-xl tracking-tight",
  },
];

const MULTI_WORD_STYLES: StyleOption[] = [
  {
    value: SubtitleStyle.Minimal,
    label: "Minimal",
    desc: "5-word groups, small clean text. Professional.",
    preview: "Clean and simple subtitle",
    previewClass: "text-xs font-medium text-white/80",
  },
  {
    value: SubtitleStyle.Cinematic,
    label: "Cinematic",
    desc: "4-word italic phrases. Warm, story-driven.",
    preview: "A cinematic moment",
    previewClass: "text-sm italic font-light text-white/90 tracking-wide",
  },
  {
    value: SubtitleStyle.GroupedBold,
    label: "Grouped Bold",
    desc: "3 words per line, bold. Standard social media captions.",
    preview: "Three bold words",
    previewClass: "text-base font-bold text-white drop-shadow",
  },
  {
    value: SubtitleStyle.GroupedCinematic,
    label: "Grouped Cinematic",
    desc: "4-word italic groups, heavy shadow. Low-key and dramatic.",
    preview: "Four cinematic words here",
    previewClass: "text-sm italic font-light text-[#F8F4F4] [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]",
  },
  {
    value: SubtitleStyle.Karaoke,
    label: "Karaoke",
    desc: "4-word group stays visible; active word lights up in orange.",
    preview: (
      <span>
        Hello{" "}
        <span className="text-[#f55c2a] font-bold">World</span>{" "}
        Right Now
      </span>
    ) as unknown as string,
    previewClass: "text-sm font-bold text-white",
  },
];

export function Step5Style({
  video,
  trialPaid,
  onVideoUpdate,
  onScheduleSave,
  onBack,
  onAdvance,
  onRequestPayment,
}: Step5StyleProps) {
  const api = useApiClient();
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(
    video.subtitleStyle ?? SubtitleStyle.BoldPop
  );
  const [submitting, setSubmitting] = useState(false);

  function handleSubtitleChange(style: SubtitleStyle) {
    setSubtitleStyle(style);
    onScheduleSave({ subtitleStyle: style });
  }

  async function handleGenerateVideo() {
    if (!trialPaid) {
      onRequestPayment();
      return;
    }

    setSubmitting(true);
    await withToast(
      () => api.videos.patch(video.id, { subtitleStyle }),
      "Failed to save settings"
    );

    const result = await withToast(
      () => api.videos.submit(video.id),
      "Failed to submit video"
    );
    if (result?.data) {
      onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
      onAdvance();
    }
    setSubmitting(false);
  }

  function renderStyleCard(opt: StyleOption) {
    const isSelected = subtitleStyle === opt.value;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => handleSubtitleChange(opt.value)}
        className={cn(
          "rounded-xl border p-4 text-left transition-all hover:border-[var(--accent-primary)]/60",
          isSelected
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[0_0_0_1px_var(--accent-primary)]"
            : "border-[var(--bg-border)] bg-[var(--bg-elevated)]"
        )}
      >
        <div className={cn("mb-3 flex h-14 items-center justify-center rounded-lg bg-black/60 px-3", isSelected && "bg-black/80")}>
          <span className={cn("text-center leading-tight", opt.previewClass)}>
            {opt.preview as string}
          </span>
        </div>
        <p className="font-semibold text-[var(--text-primary)] text-sm">{opt.label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{opt.desc}</p>
      </button>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-[var(--text-primary)]">
        Choose your style
      </h1>

      {/* Single Word styles */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Single Word
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {SINGLE_WORD_STYLES.map(renderStyleCard)}
        </div>
      </section>

      {/* Multi Word styles */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Multi Word
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {MULTI_WORD_STYLES.map(renderStyleCard)}
        </div>
      </section>

      {/* Generate button */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            ← Back
          </Button>
          <Button
            onClick={handleGenerateVideo}
            loading={submitting}
            className="flex-1"
            size="lg"
          >
            {trialPaid ? "Generate Video" : "Generate Video · $5"}
          </Button>
        </div>
        <p className="text-center text-xs text-[var(--text-muted)]">
          Once submitted, your clips will be queued. You&apos;ll get an email
          when your video is ready.
        </p>
      </div>
    </div>
  );
}
