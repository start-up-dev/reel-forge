"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { SubtitleStyle } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step5StyleProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (
    data: Partial<{
      subtitleStyle: SubtitleStyle;
      bgmEnabled: boolean;
      bgmAssetId: string;
      bgmVolume: number;
    }>
  ) => void;
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

interface BgmTrack {
  id: string;
  name: string;
  category: string;
  duration: number;
  previewUrl: string;
}

export function Step5Style({
  video,
  onVideoUpdate,
  onScheduleSave,
  onAdvance,
}: Step5StyleProps) {
  const api = useApiClient();
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(
    video.subtitleStyle ?? SubtitleStyle.BoldPop
  );
  const [bgmEnabled, setBgmEnabled] = useState(video.bgmEnabled);
  const [bgmAssetId, setBgmAssetId] = useState(video.bgmAssetId ?? "");
  const [bgmVolume, setBgmVolume] = useState(video.bgmVolume ?? 30);
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function loadTracks() {
      const result = await withToast(
        () => api.assets.bgm(),
        "Failed to load BGM tracks"
      );
      if (result?.data) {
        setBgmTracks(result.data as BgmTrack[]);
      }
    }
    if (bgmEnabled) void loadTracks();
  }, [bgmEnabled, api]);

  function handleSubtitleChange(style: SubtitleStyle) {
    setSubtitleStyle(style);
    onScheduleSave({ subtitleStyle: style });
  }

  function handleBgmToggle(enabled: boolean) {
    setBgmEnabled(enabled);
    onScheduleSave({ bgmEnabled: enabled });
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  }

  function handleTrackSelect(trackId: string) {
    setBgmAssetId(trackId);
    onScheduleSave({ bgmAssetId: trackId });
  }

  function handleVolumeChange(vol: number) {
    setBgmVolume(vol);
    onScheduleSave({ bgmVolume: vol });
  }

  function toggleTrackPreview(track: BgmTrack) {
    if (!audioRef.current) return;
    if (playingTrackId === track.id) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.current.src = track.previewUrl;
      void audioRef.current.play();
      setPlayingTrackId(track.id);
    }
  }

  async function handleGenerateVideo() {
    setSubmitting(true);
    // Save final style/bgm fields first
    await withToast(
      () =>
        api.videos.patch(video.id, {
          subtitleStyle,
          bgmEnabled,
          bgmAssetId: bgmAssetId || undefined,
          bgmVolume,
        }),
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

      {/* BGM section */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Background Music
          </h2>
          <button
            type="button"
            role="switch"
            aria-checked={bgmEnabled}
            onClick={() => handleBgmToggle(!bgmEnabled)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              bgmEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                bgmEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {bgmEnabled && (
          <div className="space-y-4">
            {/* Track list */}
            {bgmTracks.length === 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 w-36 shrink-0 animate-pulse rounded-xl bg-[var(--bg-elevated)]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {bgmTracks.map((track) => {
                  const isSelected = bgmAssetId === track.id;
                  const isPlaying = playingTrackId === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleTrackSelect(track.id)}
                      className={cn(
                        "relative flex w-36 shrink-0 flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                          : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/40"
                      )}
                    >
                      <span className="inline-block rounded-full bg-[var(--accent-primary)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary)]">
                        {track.category}
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {track.name}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTrackPreview(track);
                          }}
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                          className="rounded-full bg-[var(--bg-base)] p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          {isPlaying ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Volume slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)] w-20">
                Volume: {bgmVolume}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={bgmVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1 accent-[var(--accent-primary)]"
                aria-label="BGM volume"
              />
            </div>
          </div>
        )}
      </section>

      {/* Hidden audio element for previews */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTrackId(null)}
        className="hidden"
      />

      {/* Generate button */}
      <div className="space-y-2">
        <Button
          onClick={handleGenerateVideo}
          loading={submitting}
          className="w-full"
          size="lg"
        >
          Generate Video
        </Button>
        <p className="text-center text-xs text-[var(--text-muted)]">
          Once submitted, your clips will be queued. You&apos;ll get an email
          when your video is ready.
        </p>
      </div>
    </div>
  );
}
