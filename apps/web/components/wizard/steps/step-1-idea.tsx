"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { toast } from "sonner";
import { VideoStatus } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step1IdeaProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: { idea?: string }) => void;
  onAdvance: () => void;
}

type Mode = "brainstorm" | "direct";

interface IdeaCard {
  title: string;
  body: string;
}

const TIPS = [
  "Be specific about your niche or audience (e.g. 'morning routine for busy parents')",
  "Mention a problem you're solving or a transformation you're showing",
  "Include a style hint if helpful (e.g. 'fast-paced listicle', 'calming tutorial')",
  "Aim for 1–2 sentences — more detail gives better scripts",
];

export function Step1Idea({
  video,
  onVideoUpdate,
  onScheduleSave,
  onAdvance,
}: Step1IdeaProps) {
  const api = useApiClient();
  const [mode, setMode] = useState<Mode>("brainstorm");
  const [topic, setTopic] = useState(video.idea ?? "");
  const [directIdea, setDirectIdea] = useState(video.idea ?? "");
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<IdeaCard | null>(null);
  const [generating, setGenerating] = useState(
    video.status === VideoStatus.BrainstormPending
  );
  const [submitting, setSubmitting] = useState(false);
  const [showTips, setShowTips] = useState(false);

  async function handleGenerateIdeas() {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }
    setGenerating(true);
    setIdeas([]);
    setSelectedIdea(null);

    const result = await withToast(
      () => api.videos.brainstorm(video.id, { topic: topic.trim() }),
      "Failed to generate ideas"
    );
    if (result?.data?.ideas) {
      setIdeas(result.data.ideas);
    }
    setGenerating(false);
  }

  async function handleUseIdea(idea: IdeaCard) {
    setSelectedIdea(idea);
    const ideaText = `${idea.title}: ${idea.body}`;
    setSubmitting(true);

    // Save idea and trigger script generation
    const result = await withToast(
      () => api.videos.generateScript(video.id, { idea: ideaText }),
      "Failed to start script generation"
    );
    if (result?.data) {
      onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
      onAdvance();
    }
    setSubmitting(false);
  }

  async function handleDirectSubmit() {
    if (!directIdea.trim()) {
      toast.error("Enter your idea first");
      return;
    }
    setSubmitting(true);

    const result = await withToast(
      () => api.videos.generateScript(video.id, { idea: directIdea.trim() }),
      "Failed to start script generation"
    );
    if (result?.data) {
      onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
      onAdvance();
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        What&apos;s your video about?
      </h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        Start with a topic or paste your full idea — we&apos;ll turn it into a
        polished script.
      </p>

      {/* Mode toggle */}
      <div className="mb-6 inline-flex rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-1">
        {(["brainstorm", "direct"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              mode === m
                ? "bg-[var(--accent-primary)] text-white shadow"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {m === "brainstorm" ? "Brainstorm with AI" : "I have an idea"}
          </button>
        ))}
      </div>

      {mode === "brainstorm" ? (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                onScheduleSave({ idea: e.target.value });
              }}
              disabled={generating}
              placeholder="e.g. 'Quick tips for building a morning routine'"
              rows={4}
              className={cn(
                "w-full resize-none rounded-xl border border-[var(--bg-border)]",
                "bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]",
                "placeholder:text-[var(--text-muted)] outline-none transition-colors",
                "focus:border-[var(--accent-primary)]",
                generating && "opacity-60"
              )}
            />
          </div>

          <Button
            onClick={handleGenerateIdeas}
            loading={generating}
            disabled={!topic.trim() || generating}
            className="w-full"
          >
            {generating ? "Thinking…" : "Generate Ideas"}
          </Button>

          {/* Idea cards */}
          {(ideas.length > 0 || generating) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-1">
              {generating && ideas.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl bg-[var(--bg-elevated)]"
                    />
                  ))
                : ideas.map((idea, i) => {
                    const isSelected =
                      selectedIdea?.title === idea.title;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative rounded-xl border p-4 transition-all",
                          isSelected
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                            : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/50"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <p className="mb-1 font-semibold text-[var(--text-primary)]">
                          {idea.title}
                        </p>
                        <p className="mb-3 text-sm text-[var(--text-secondary)] line-clamp-3">
                          {idea.body}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={submitting && isSelected}
                          disabled={submitting}
                          onClick={() => handleUseIdea(idea)}
                          className="hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        >
                          Use This Idea →
                        </Button>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={directIdea}
              onChange={(e) => {
                setDirectIdea(e.target.value);
                onScheduleSave({ idea: e.target.value });
              }}
              placeholder="Paste or type your full video idea here"
              rows={6}
              maxLength={2000}
              className={cn(
                "w-full resize-none rounded-xl border border-[var(--bg-border)]",
                "bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]",
                "placeholder:text-[var(--text-muted)] outline-none transition-colors",
                "focus:border-[var(--accent-primary)]"
              )}
            />
            <span className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)]">
              {directIdea.length}/2000
            </span>
          </div>

          <Button
            onClick={handleDirectSubmit}
            loading={submitting}
            disabled={!directIdea.trim() || submitting}
            className="w-full"
          >
            Use This Idea →
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowTips((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          {showTips ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Tips for great ideas
        </button>
        {showTips && (
          <ul className="mt-3 space-y-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
            {TIPS.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
