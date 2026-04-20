"use client";

import { useState } from "react";
import { SubtitleStyle } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step5StyleProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: Partial<{ subtitleStyle: SubtitleStyle }>) => void;
  onBack: () => void;
  onAdvance: () => void;
}

const SUBTITLE_STYLES: { value: SubtitleStyle; label: string; desc: string }[] = [
  {
    value: SubtitleStyle.BoldPop,
    label: "Bold Pop",
    desc: "Large bold text, one word at a time. High-energy.",
  },
  {
    value: SubtitleStyle.WordHighlight,
    label: "Word Highlight",
    desc: "Each word highlights as it's spoken. Engaging & clear.",
  },
  {
    value: SubtitleStyle.Minimal,
    label: "Minimal",
    desc: "Clean small text, sentence by sentence. Professional.",
  },
  {
    value: SubtitleStyle.Cinematic,
    label: "Cinematic",
    desc: "Centered italic phrases with subtle fade. Dramatic.",
  },
];

export function Step5Style({
  video,
  onVideoUpdate,
  onScheduleSave,
  onBack,
  onAdvance,
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-[var(--text-primary)]">
        Choose your style
      </h1>

      {/* Subtitle style picker */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Subtitle Style
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SUBTITLE_STYLES.map(({ value, label, desc }) => {
            const isSelected = subtitleStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSubtitleChange(value)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all hover:border-[var(--accent-primary)]/60",
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[0_0_0_1px_var(--accent-primary)]"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)]"
                )}
              >
                {/* Style preview mock */}
                <div
                  className={cn(
                    "mb-3 flex h-16 items-end justify-center rounded-lg bg-[var(--bg-base)] px-3 pb-2",
                    isSelected && "bg-black/40"
                  )}
                >
                  <span
                    className={cn(
                      "text-center leading-tight",
                      value === SubtitleStyle.BoldPop &&
                        "text-xl font-black text-white drop-shadow-lg",
                      value === SubtitleStyle.WordHighlight &&
                        "text-base font-bold text-[var(--accent-primary)]",
                      value === SubtitleStyle.Minimal &&
                        "text-xs font-medium text-white/80",
                      value === SubtitleStyle.Cinematic &&
                        "text-sm italic font-light text-white/90 tracking-wide"
                    )}
                  >
                    {value === SubtitleStyle.BoldPop && "BOLD"}
                    {value === SubtitleStyle.WordHighlight && "Word by Word"}
                    {value === SubtitleStyle.Minimal && "Clean & simple subtitle text"}
                    {value === SubtitleStyle.Cinematic && "A cinematic moment"}
                  </span>
                </div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">
                  {label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{desc}</p>
              </button>
            );
          })}
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
            Generate Video
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
