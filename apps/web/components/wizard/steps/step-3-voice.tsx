"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RefreshCw,
  Rewind,
  SkipForward,
} from "lucide-react";
import { VideoStatus, VideoType } from "@repo/types";
import { formatDuration } from "@repo/utils";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step3VoiceProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onBack: () => void;
  onAdvance: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

function isValidSpeed(s: number): s is Speed {
  return (SPEEDS as readonly number[]).includes(s);
}

export function Step3Voice({ video, onVideoUpdate, onBack, onAdvance }: Step3VoiceProps) {
  const api = useApiClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds ?? 0);
  const initialSpeed: Speed = isValidSpeed(video.voiceSpeed) ? video.voiceSpeed : 1;
  const [speed, setSpeed] = useState<Speed>(initialSpeed);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const isPending = video.status === VideoStatus.VoicePending;

  // Stable waveform heights — recalculated only when a new audio URL arrives
  const waveHeights = useMemo(
    () => Array.from({ length: 60 }, (_, i) => Math.max(8, 20 + Math.sin(i * 0.7) * 15 + Math.random() * 20)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [video.audioUrl],
  );
  const isFailed = video.status === VideoStatus.Failed;

  // Sync duration from server once voice generation completes
  useEffect(() => {
    if (video.durationSeconds) setDuration(video.durationSeconds);
  }, [video.durationSeconds]);

  // Auto-start generation when arriving at this step with an approved script.
  // Talking and Action Reel videos skip ElevenLabs entirely.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || video.status !== VideoStatus.ScriptReady) return;
    if (video.videoType === VideoType.Talking || video.videoType === VideoType.ActionReel) return;
    autoStartedRef.current = true;
    onVideoUpdate({ ...video, status: VideoStatus.VoicePending });
    void api.videos.generateVoice(video.id).catch(() => {
      // Polling will detect the FAILED status and surface the error
    });
  }, [video, api, onVideoUpdate]);

  // Poll while voice is generating
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      const result = await withToast(
        () => api.videos.get(video.id),
        "Failed to check voice status"
      );
      if (result?.data && result.data.status !== VideoStatus.VoicePending) {
        onVideoUpdate(result.data);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, api, video.id, onVideoUpdate]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  }

  function seek(delta: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.currentTime + delta, duration)
    );
  }

  function setPlaybackSpeed(s: Speed) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
    // Auto-save to DB so the worker applies the same speed at render time
    void withToast(
      () => api.videos.patch(video.id, { voiceSpeed: s }),
      "Failed to save voice speed",
    );
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setPlaying(false);
    const result = await withToast(
      () => api.videos.generateVoice(video.id),
      "Failed to regenerate voice"
    );
    if (result?.data) {
      onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
    }
    setRegenerating(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = await withToast(
      () => api.videos.generateScenes(video.id),
      "Failed to start scene generation"
    );
    if (result) {
      onVideoUpdate({ ...video, status: VideoStatus.ScenesPending, scenes: [] });
      onAdvance();
    }
    setApproving(false);
  }

  if (isFailed && !regenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-[var(--accent-danger)]">
          {video.error ?? "Voice generation failed. Please try again."}
        </p>
        <Button onClick={handleRegenerate} loading={regenerating}>
          Retry Voice Generation
        </Button>
      </div>
    );
  }

  // Talking videos skip ElevenLabs — voice comes from Grok Imagine lipsync
  if (video.videoType === VideoType.Talking) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
          Voice via Grok Imagine
        </h1>
        <p className="mb-8 text-sm text-[var(--text-secondary)]">
          Talking videos generate voice directly inside each clip with accurate lipsync — no separate voiceover is needed.
        </p>
        <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">What happens next</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Grok Imagine generates each scene clip with your character speaking the script</li>
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Lipsync and voice are baked directly into the video clip</li>
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Whisper transcribes the clip audio for subtitle sync</li>
          </ul>
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={onBack}>← Back</Button>
          <Button onClick={handleApprove} loading={approving} className="flex-1">Continue to Scenes →</Button>
        </div>
      </div>
    );
  }

  // Action Reel videos are silent — no voice step at all
  if (video.videoType === VideoType.ActionReel) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
          No voice needed
        </h1>
        <p className="mb-8 text-sm text-[var(--text-secondary)]">
          Action Reels are silent — scenes are generated directly from your shot plan. Add background music in the final step.
        </p>
        <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">What happens next</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Each shot in your plan becomes a cinematic 6-second clip</li>
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Grok Imagine renders the action with your chosen activity style</li>
            <li className="flex gap-2"><span className="text-[var(--accent-primary)]">→</span> Clips are assembled into a silent reel — add BGM in Step 5</li>
          </ul>
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={onBack}>← Back</Button>
          <Button onClick={handleApprove} loading={approving} className="flex-1">Continue to Scenes →</Button>
        </div>
      </div>
    );
  }

  if (isPending || regenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        <p className="text-sm text-[var(--text-secondary)]">
          {regenerating ? "Regenerating voice…" : "Generating your voiceover…"}
        </p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Review your voiceover
      </h1>

      {/* Voice info */}
      <p className="mb-8 text-sm text-[var(--text-muted)]">
        Duration: {formatDuration(Math.round(duration))}
      </p>

      {/* Audio player */}
      {video.audioUrl && (
        <audio
          ref={audioRef}
          src={video.audioUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() =>
            setCurrentTime(audioRef.current?.currentTime ?? 0)
          }
          onLoadedMetadata={() => {
            setAudioError(null);
            const d = audioRef.current?.duration ?? 0;
            setDuration(d);
          }}
          onError={(e) => {
            const el = e.currentTarget;
            const code = el.error?.code;
            const msg =
              code === 1 ? "Audio load aborted"
              : code === 2 ? "Audio network error — check GCS CORS"
              : code === 3 ? "Audio decode error"
              : code === 4 ? "Audio format not supported"
              : "Audio failed to load";
            setAudioError(msg);
            console.error("[Step3Voice] audio error:", msg, el.error);
          }}
        />
      )}

      <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-6">
        {/* Waveform (static visual) */}
        {audioError && (
          <p className="mb-2 text-xs text-[var(--accent-danger)]">{audioError}</p>
        )}
        <div className="mb-4 flex h-14 items-end gap-[2px] overflow-hidden">
          {waveHeights.map((height, i) => {
            const played = (i / 60) * 100 < progress;
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors duration-100",
                  played
                    ? "bg-[var(--accent-primary)]"
                    : "bg-[var(--bg-border)]"
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Progress bar (clickable) */}
        <div
          className="mb-4 h-1 w-full cursor-pointer overflow-hidden rounded-full bg-[var(--bg-border)]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) {
              audioRef.current.currentTime = pct * duration;
            }
          }}
        >
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <div className="mb-4 flex justify-between text-xs text-[var(--text-muted)]">
          <span>{formatDuration(Math.round(currentTime))}</span>
          <span>{formatDuration(Math.round(duration))}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => seek(-5)}
            aria-label="Rewind 5 seconds"
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
          >
            <Rewind className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-colors"
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seek(5)}
            aria-label="Skip 5 seconds"
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Speed */}
        <div className="mt-4 flex justify-center gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPlaybackSpeed(s)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                speed === s
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        Slight variations between generations are normal.
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate Voice
          </Button>
        </div>

        <Button onClick={handleApprove} loading={approving}>
          Approve Voice →
        </Button>
      </div>
    </div>
  );
}
