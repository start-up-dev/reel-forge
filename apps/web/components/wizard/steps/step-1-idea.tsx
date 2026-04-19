"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check, Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { VideoStatus } from "@repo/types";
import type { Project } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail, VoiceInfo } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step1IdeaProps {
  video: VideoDetail;
  project: Project | null;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: { idea?: string; voiceId?: string | null; targetDurationSeconds?: number }) => void;
  onAdvance: () => void;
}

type Mode = "brainstorm" | "direct";

interface IdeaCard {
  title: string;
  body: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15s", hint: "Quick hook" },
  { value: 30, label: "30s", hint: "Standard" },
  { value: 45, label: "45s", hint: "In-depth" },
  { value: 60, label: "60s", hint: "Full story" },
] as const;

const TIPS = [
  "Be specific about your niche or audience (e.g. 'morning routine for busy parents')",
  "Mention a problem you're solving or a transformation you're showing",
  "Include a style hint if helpful (e.g. 'fast-paced listicle', 'calming tutorial')",
  "Aim for 1–2 sentences — more detail gives better scripts",
];

export function Step1Idea({
  video,
  project,
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

  // Video length
  const [targetDuration, setTargetDuration] = useState(video.targetDurationSeconds ?? 30);

  // Voice selection
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(video.voiceId ?? null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (project === null) return; // wait for project to load before fetching
    async function loadVoices() {
      setVoicesLoading(true);
      const result = await withToast(
        () => api.assets.voices(project?.language),
        "Failed to load voices"
      );
      if (result?.data) setVoices(result.data);
      setVoicesLoading(false);
    }
    void loadVoices();
  }, [api, project]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function selectVoice(id: string) {
    setSelectedVoiceId(id);
    onScheduleSave({ voiceId: id });
  }

  async function togglePreview(voiceId: string) {
    if (playingPreview === voiceId) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    audioRef.current?.pause();
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setLoadingPreview(voiceId);
    try {
      const blobUrl = await api.assets.voicePreviewBlobUrl(voiceId, project?.language);
      blobUrlRef.current = blobUrl;
      audioRef.current = new Audio(blobUrl);
      void audioRef.current.play();
      audioRef.current.onended = () => setPlayingPreview(null);
      setPlayingPreview(voiceId);
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setLoadingPreview(null);
    }
  }

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
    if (!selectedVoiceId) {
      toast.error("Select a voice before continuing");
      return;
    }
    setSelectedIdea(idea);
    const ideaText = `${idea.title}: ${idea.body}`;
    setSubmitting(true);

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
    if (!selectedVoiceId) {
      toast.error("Select a voice before continuing");
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
    <div className="relative mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        What&apos;s your video about?
      </h1>
      <p className="mb-8 text-base text-[var(--text-secondary)]">
        Start with a topic or paste your full idea — we&apos;ll turn it into a
        polished script.
      </p>

      {/* Video Length */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Video Length
        </p>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTargetDuration(opt.value);
                onScheduleSave({ targetDurationSeconds: opt.value });
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border px-4 py-2 transition-all",
                targetDuration === opt.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                  : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              )}
            >
              <span className="text-base font-bold">{opt.label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

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
                    const isSelected = selectedIdea?.title === idea.title;
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

      {/* ── Voice section ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
            Voice
          </p>
          {project?.language && (
            <p className="text-xs text-[var(--text-secondary)]">
              {project.language} voices
            </p>
          )}
        </div>

        {voicesLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-36 shrink-0 animate-pulse rounded-xl bg-[var(--bg-elevated)]"
              />
            ))}
          </div>
        ) : voices.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No voices available.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {voices.map((v) => (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => selectVoice(v.id)}
                onKeyDown={(e) => e.key === "Enter" && selectVoice(v.id)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-all",
                  selectedVoiceId === v.id
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 text-sm font-bold text-[var(--accent-primary)]">
                  {v.name[0]}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{v.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {v.gender ?? v.language}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loadingPreview === v.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void togglePreview(v.id);
                  }}
                  className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                >
                  {loadingPreview === v.id ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : playingPreview === v.id ? (
                    <Square className="h-2.5 w-2.5" />
                  ) : (
                    <Play className="h-2.5 w-2.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {!selectedVoiceId && !voicesLoading && (
          <p className="mt-2 text-xs text-[var(--accent-warning)]">
            Select a voice to continue
          </p>
        )}
      </div>

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
