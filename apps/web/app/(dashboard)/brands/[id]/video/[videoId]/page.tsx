"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Loader2, CheckCircle, XCircle, ArrowLeft, ArrowRight, Film } from "lucide-react";
import { Button } from "@repo/ui/button";
import { VideoStatus } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STATUS_LABEL: Record<string, string> = {
  [VideoStatus.Draft]: "Starting up…",
  [VideoStatus.BrainstormPending]: "Brainstorming ideas…",
  [VideoStatus.ScriptPending]: "Writing your script…",
  [VideoStatus.ScriptReady]: "Script written",
  [VideoStatus.VoicePending]: "Preparing voice…",
  [VideoStatus.VoiceReady]: "Voice ready",
  [VideoStatus.ScenesPending]: "Designing scenes…",
  [VideoStatus.ScenesReady]: "Scenes ready",
  [VideoStatus.ClipsQueued]: "In the generation queue…",
  [VideoStatus.ClipsProcessing]: "Generating clips…",
  [VideoStatus.ClipsNeedsReview]: "Reviewing clips…",
  [VideoStatus.AssemblyPending]: "Preparing assembly…",
  [VideoStatus.AssemblyProcessing]: "Assembling your video…",
  [VideoStatus.Complete]: "Video complete!",
  [VideoStatus.Failed]: "Generation failed",
};

const STEPS = [
  { label: "Script", statuses: [VideoStatus.Draft, VideoStatus.BrainstormPending, VideoStatus.ScriptPending, VideoStatus.ScriptReady] },
  { label: "Scenes", statuses: [VideoStatus.ScenesPending, VideoStatus.ScenesReady] },
  { label: "Clips", statuses: [VideoStatus.ClipsQueued, VideoStatus.ClipsProcessing, VideoStatus.ClipsNeedsReview] },
  { label: "Assembly", statuses: [VideoStatus.AssemblyPending, VideoStatus.AssemblyProcessing] },
  { label: "Done", statuses: [VideoStatus.Complete] },
];

function getStepIndex(status: string): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i]!.statuses.includes(status as VideoStatus)) return i;
  }
  return -1;
}

interface StatusData {
  status: string;
  clipsDone?: number;
  clipsTotal?: number;
  queuePosition?: number;
  estimatedWaitSeconds?: number;
}

function useVideoStatus(videoId: string) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [connected, setConnected] = useState(false);
  const terminalRef = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function connect() {
      const token = await getTokenRef.current({ skipCache: true });
      if (!active) return;

      try {
        const res = await fetch(`${API_BASE}/api/videos/${videoId}/status-stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;
        setConnected(true);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || !active) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            try {
              const event = JSON.parse(line.slice(5).trim()) as { type: string; data: StatusData };
              if (event.type === "status_update") {
                setStatusData(event.data);
                if (event.data.status === "COMPLETE" || event.data.status === "FAILED") {
                  terminalRef.current = true;
                }
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    async function connectWithRetry() {
      while (active && !terminalRef.current) {
        await connect();
        if (!active || terminalRef.current) break;
        // Brief pause before reconnecting after an unexpected disconnect
        await new Promise<void>((res) => setTimeout(res, 3000));
      }
    }

    void connectWithRetry();

    return () => {
      active = false;
      controller.abort();
    };
  }, [videoId]);

  return { statusData, connected };
}

export default function SingleVideoProgressPage() {
  const { id: brandId, videoId } = useParams<{ id: string; videoId: string }>();
  const { statusData, connected } = useVideoStatus(videoId);

  const status = statusData?.status ?? "";
  const isComplete = status === VideoStatus.Complete;
  const isFailed = status === VideoStatus.Failed;
  const isDone = isComplete || isFailed;
  const currentStep = getStepIndex(status);

  const label = STATUS_LABEL[status] ?? "Processing…";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/brands/${brandId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to brand
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Generating your video</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Claude is writing the script, designing scenes, and generating clips. Sit tight.
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isStepDone = isFailed ? false : (currentStep > i || isComplete);
            const isActive = !isFailed && currentStep === i;
            const isFutureStep = currentStep < i && !isComplete;

            return (
              <div key={step.label} className="flex flex-1 flex-col items-center">
                <div className="relative flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        isStepDone || (currentStep > i) ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
                      }`}
                    />
                  )}
                  <div
                    className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isFailed && i === currentStep
                        ? "border-[var(--accent-danger)] bg-[var(--accent-danger)]/10"
                        : isStepDone
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                          : isActive
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                            : "border-[var(--bg-border)] bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {isStepDone ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : isActive && !isFailed ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-primary)]" />
                    ) : isFailed && i === currentStep ? (
                      <XCircle className="h-4 w-4 text-[var(--accent-danger)]" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isFutureStep ? "bg-[var(--bg-border)]" : "bg-[var(--accent-primary)]/40"
                        }`}
                      />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        currentStep > i && !isFailed ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-medium ${
                    isActive
                      ? "text-[var(--accent-primary)]"
                      : isStepDone
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status card */}
      <div
        className={`rounded-2xl border p-6 text-center transition-colors ${
          isComplete
            ? "border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5"
            : isFailed
              ? "border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/5"
              : "border-[var(--bg-border)] bg-[var(--bg-surface)]"
        }`}
      >
        {!connected && !statusData ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Connecting…</p>
          </div>
        ) : isComplete ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-success)]/15">
              <CheckCircle className="h-7 w-7 text-[var(--accent-success)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">Video complete!</p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                Your video has been generated and is ready to view.
              </p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-danger)]/15">
              <XCircle className="h-7 w-7 text-[var(--accent-danger)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">Generation failed</p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                Something went wrong. You can try creating a new video.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
              <Film className="h-7 w-7 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{label}</p>
              {statusData?.clipsTotal && statusData.clipsTotal > 0 && (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {statusData.clipsDone ?? 0} of {statusData.clipsTotal} clips done
                </p>
              )}
              {statusData?.queuePosition && statusData.queuePosition > 0 && (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Position {statusData.queuePosition} in queue
                  {statusData.estimatedWaitSeconds
                    ? ` · ~${Math.ceil(statusData.estimatedWaitSeconds / 60)}m wait`
                    : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Clip progress bar */}
        {!isDone && statusData?.clipsTotal && statusData.clipsTotal > 0 && (
          <div className="mt-4 overflow-hidden rounded-full bg-[var(--bg-elevated)]" style={{ height: 4 }}>
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
              style={{
                width: `${Math.round(((statusData.clipsDone ?? 0) / statusData.clipsTotal) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        {isComplete && (
          <Button asChild className="w-full gap-2">
            <Link href="/library">
              View in Library
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}

        {isFailed && (
          <Button asChild variant="secondary" className="w-full gap-2">
            <Link href={`/brands/${brandId}/video/new`}>
              <Film className="h-4 w-4" />
              Try Again
            </Link>
          </Button>
        )}

        {!isDone && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            This page updates in real time. You can leave and come back — your video will keep generating.
          </p>
        )}

        <Link
          href="/library"
          className="text-center text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          View all videos in Library →
        </Link>
      </div>
    </div>
  );
}
