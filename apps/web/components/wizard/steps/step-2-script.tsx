"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { VideoStatus, VideoType } from "@repo/types";
import { estimateScriptDuration } from "@repo/utils";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

const MIN_WORDS = 80;
const MAX_WORDS = 150;

interface Step2ScriptProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onScheduleSave: (data: { script?: string }) => void;
  onBack: () => void;
  onAdvance: () => void;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function Step2Script({
  video,
  onVideoUpdate,
  onScheduleSave,
  onBack,
  onAdvance,
}: Step2ScriptProps) {
  const api = useApiClient();
  const [script, setScript] = useState(video.script ?? "");
  const [originalScript, setOriginalScript] = useState(video.script ?? "");
  const [isEdited, setIsEdited] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const isPending = video.status === VideoStatus.ScriptPending;
  const isActionReel = video.videoType === VideoType.ActionReel;

  // Poll for script when pending
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      const result = await withToast(
        () => api.videos.get(video.id),
        "Failed to check script status"
      );
      if (result?.data && result.data.status !== VideoStatus.ScriptPending) {
        onVideoUpdate(result.data);
        if (result.data.script) {
          setScript(result.data.script);
          setOriginalScript(result.data.script);
        }
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, api, video.id, onVideoUpdate]);

  const wordCount = countWords(script);
  const shotCount = script.trim().split(/\n+/).filter(Boolean).length;
  const durationSeconds = estimateScriptDuration(wordCount);
  const durationLabel = `~${Math.round(durationSeconds)} sec`;
  const durationPct = Math.min((durationSeconds / 60) * 100, 100);

  let wordCountColor = "text-[var(--accent-success)]";
  let barColor = "bg-[var(--accent-success)]";
  if (!isActionReel) {
    if (wordCount < MIN_WORDS || durationSeconds < 30) {
      wordCountColor = "text-[var(--accent-warning)]";
      barColor = "bg-[var(--accent-warning)]";
    }
    if (wordCount > MAX_WORDS || durationSeconds > 60) {
      wordCountColor = "text-[var(--accent-danger)]";
      barColor = "bg-[var(--accent-danger)]";
    }
  }

  function handleScriptChange(val: string) {
    setScript(val);
    setIsEdited(val !== originalScript);
    onScheduleSave({ script: val });
  }

  async function handleApprove() {
    setApproving(true);
    await withToast(
      () => api.videos.patch(video.id, { script }),
      "Failed to save script"
    );
    if (video.videoType === VideoType.Talking || video.videoType === VideoType.ActionReel) {
      // Talking and Action Reel videos skip ElevenLabs — go straight to scene generation
      const result = await withToast(
        () => api.videos.generateScenes(video.id),
        "Failed to start scene generation"
      );
      if (result) {
        onVideoUpdate({ ...video, status: VideoStatus.ScenesPending, scenes: [] });
        onAdvance();
      }
    } else {
      const result = await withToast(
        () => api.videos.generateVoice(video.id),
        "Failed to start voice generation"
      );
      if (result?.data) {
        onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
        onAdvance();
      }
    }
    setApproving(false);
  }

  async function handleRegenerate() {
    setShowRegenConfirm(false);
    setRegenerating(true);
    const result = await withToast(
      () =>
        api.videos.generateScript(video.id, { idea: video.idea ?? "" }),
      "Failed to regenerate script"
    );
    if (result?.data) {
      onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
      const newScript = result.data.script ?? "";
      setScript(newScript);
      setOriginalScript(newScript);
      setIsEdited(false);
    }
    setRegenerating(false);
  }

  if (isPending || regenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        <p className="text-sm text-[var(--text-secondary)]">
          {isActionReel ? "Planning your shots…" : "Writing your script…"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        {isActionReel ? "Review your shot plan" : "Review your script"}
      </h1>

      {/* Info strip */}
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        {isActionReel
          ? `${script.trim().split(/\n+/).filter(Boolean).length} shots · ${wordCount} words`
          : `${wordCount} words · ${durationLabel} estimated duration`}
      </p>

      {/* Script textarea */}
      <div className="relative mb-1 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] focus-within:border-[var(--accent-primary)] transition-colors">
        <textarea
          value={script}
          onChange={(e) => handleScriptChange(e.target.value)}
          rows={12}
          className="w-full min-h-[240px] resize-none rounded-xl bg-transparent px-4 py-3 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          placeholder={isActionReel ? "Your shot plan will appear here…" : "Your script will appear here…"}
        />
        <span
          className={cn(
            "absolute bottom-3 right-4 text-xs font-medium",
            wordCountColor
          )}
        >
          {isActionReel ? `${shotCount} shots` : `${wordCount} / ${MIN_WORDS}–${MAX_WORDS} words`}
        </span>
      </div>

      {/* Duration bar (hidden for action_reel — shot plan has no spoken duration) */}
      {!isActionReel && (
        <div className="mb-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-border)]">
            <div
              className={cn("h-full rounded-full transition-all duration-300", barColor)}
              style={{ width: `${durationPct}%` }}
            />
          </div>
          <p className={cn("mt-1 text-right text-xs", wordCountColor)}>
            {durationSeconds > 60
              ? `${durationLabel} — too long, consider trimming`
              : durationLabel}
          </p>
        </div>
      )}
      {isActionReel && <div className="mb-6" />}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (isEdited ? setShowRegenConfirm(true) : handleRegenerate())}
            loading={regenerating}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>

        <Button onClick={handleApprove} loading={approving}>
          {isActionReel ? "Approve Shot Plan →" : "Approve Script →"}
        </Button>
      </div>

      <ConfirmDialog
        open={showRegenConfirm}
        onOpenChange={setShowRegenConfirm}
        title="Regenerate script?"
        description="Your manual edits will be lost and a new script will be generated from your idea."
        confirmLabel="Regenerate"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={handleRegenerate}
      />
    </div>
  );
}
