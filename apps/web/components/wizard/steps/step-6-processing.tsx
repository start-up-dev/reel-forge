"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { VideoStatus } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step6ProcessingProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onAdvance: () => void;
}

type TimelineStatus = "done" | "active" | "pending";

interface TimelineItem {
  label: string;
  status: TimelineStatus;
  detail?: string;
}

function buildTimeline(video: VideoDetail, queuePosition: number): TimelineItem[] {
  const s = video.status;

  const scriptDone = [
    VideoStatus.VoicePending, VideoStatus.VoiceReady,
    VideoStatus.ScenesPending, VideoStatus.ScenesReady,
    VideoStatus.ClipsQueued, VideoStatus.ClipsProcessing,
    VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing,
    VideoStatus.Complete,
  ].includes(s);

  const voiceDone = [
    VideoStatus.ScenesPending, VideoStatus.ScenesReady,
    VideoStatus.ClipsQueued, VideoStatus.ClipsProcessing,
    VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing,
    VideoStatus.Complete,
  ].includes(s);

  const scenesDone = [
    VideoStatus.ClipsQueued, VideoStatus.ClipsProcessing,
    VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing,
    VideoStatus.Complete,
  ].includes(s);

  const clipsActive = [
    VideoStatus.ClipsQueued, VideoStatus.ClipsProcessing,
  ].includes(s);
  const clipsDone = [
    VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing,
    VideoStatus.Complete,
  ].includes(s);

  const assemblyActive = [
    VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing,
  ].includes(s);
  const assemblyDone = s === VideoStatus.Complete;

  return [
    { label: "Script approved", status: scriptDone ? "done" : "active" },
    { label: "Voiceover ready", status: voiceDone ? "done" : scriptDone ? "active" : "pending" },
    { label: "Base images ready", status: scenesDone ? "done" : voiceDone ? "active" : "pending" },
    {
      label: "Clips generating",
      status: clipsDone ? "done" : clipsActive ? "active" : "pending",
      detail:
        clipsActive && queuePosition > 0
          ? `Position #${queuePosition} in queue`
          : clipsActive
          ? "Being generated…"
          : undefined,
    },
    {
      label: "Assembling video",
      status: assemblyDone ? "done" : assemblyActive ? "active" : "pending",
      detail: assemblyActive ? "In progress…" : undefined,
    },
  ];
}

export function Step6Processing({
  video,
  onVideoUpdate,
  onAdvance,
}: Step6ProcessingProps) {
  const api = useApiClient();
  const [queuePosition, setQueuePosition] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const isFailed = video.status === VideoStatus.Failed;
  const isComplete = video.status === VideoStatus.Complete;

  // Poll video status while processing
  useEffect(() => {
    if (isFailed || isComplete) return;

    const interval = setInterval(async () => {
      const result = await withToast(
        () => api.videos.get(video.id),
        "Failed to check video status"
      );
      if (result?.data) {
        onVideoUpdate(result.data);
        if (result.data.status === VideoStatus.Complete) {
          clearInterval(interval);
          onAdvance();
        } else if (result.data.status === VideoStatus.Failed) {
          clearInterval(interval);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isFailed, isComplete, api, video.id, onVideoUpdate, onAdvance]);

  // TODO: Replace polling with SSE when Phase 6.4 is implemented
  // Connect to GET /api/videos/:id/status-stream for real-time updates

  const estimatedWait =
    queuePosition > 0 ? `~${Math.round(queuePosition * 0.5)} min` : null;
  const timeline = buildTimeline(video, queuePosition);

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        {isFailed ? "Something went wrong" : video.title}
      </h1>
      <p className="mb-12 text-sm text-[var(--text-secondary)]">
        {isFailed ? "Your video couldn't be processed." : "Being processed…"}
      </p>

      {/* Queue position indicator */}
      {queuePosition > 0 && !isFailed && (
        <div className="mb-8 flex flex-col items-center gap-1">
          <span className="text-5xl font-black text-[var(--text-muted)]">
            #{queuePosition}
          </span>
          <span className="text-xs text-[var(--text-muted)]">in the queue</span>
          {estimatedWait && (
            <span className="mt-1 text-sm text-[var(--text-secondary)]">
              Estimated wait: {estimatedWait}
            </span>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="w-full space-y-4">
        {timeline.map((item, i) => (
          <div key={i} className="flex items-start gap-4">
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {item.status === "done" && (
                <CheckCircle2 className="h-5 w-5 text-[var(--accent-success)]" />
              )}
              {item.status === "active" && !isFailed && (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
              )}
              {item.status === "active" && isFailed && (
                <AlertCircle className="h-5 w-5 text-[var(--accent-danger)]" />
              )}
              {item.status === "pending" && (
                <Circle className="h-5 w-5 text-[var(--text-muted)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  item.status === "done" && "text-[var(--text-secondary)]",
                  item.status === "active" && !isFailed && "text-[var(--text-primary)]",
                  item.status === "active" && isFailed && "text-[var(--accent-danger)]",
                  item.status === "pending" && "text-[var(--text-muted)]"
                )}
              >
                {item.label}
              </p>
              {item.detail && (
                <p className="text-xs text-[var(--text-muted)]">{item.detail}</p>
              )}
            </div>

            <span
              className={cn(
                "shrink-0 text-xs",
                item.status === "done" && "text-[var(--accent-success)]",
                item.status === "active" && !isFailed && "text-[var(--text-secondary)]",
                item.status === "active" && isFailed && "text-[var(--accent-danger)]",
                item.status === "pending" && "text-[var(--text-muted)]"
              )}
            >
              {item.status === "done" && "Done"}
              {item.status === "active" && !isFailed && "In progress…"}
              {item.status === "active" && isFailed && "Failed"}
              {item.status === "pending" && "Waiting"}
            </span>
          </div>
        ))}
      </div>

      {/* Failed state */}
      {isFailed && video.error && (
        <details className="mt-6 w-full">
          <summary className="cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            Error details
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--bg-elevated)] p-3 text-xs text-[var(--accent-danger)]">
            {video.error}
          </pre>
        </details>
      )}

      {isFailed && (
        <Button
          onClick={async () => {
            setRetrying(true);
            const result = await withToast(
              () => api.videos.submit(video.id),
              "Failed to retry"
            );
            if (result?.data) {
              onVideoUpdate({ ...video, ...result.data, scenes: video.scenes });
            }
            setRetrying(false);
          }}
          loading={retrying}
          className="mt-8"
        >
          Retry
        </Button>
      )}

      {/* Leave message */}
      {!isFailed && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <Mail className="h-5 w-5 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            You can close this tab — we&apos;ll email you when your video is
            ready.
          </p>
          <Link
            href="/library"
            className="mt-1 text-xs text-[var(--accent-secondary)] hover:underline"
          >
            Go to Library
          </Link>
        </div>
      )}
    </div>
  );
}
