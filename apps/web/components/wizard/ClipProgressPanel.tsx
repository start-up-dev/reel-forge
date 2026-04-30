"use client";

import type { ClipStatusMap, SnapshotClip } from "@repo/types";
import { cn } from "@repo/ui/utils";

interface ClipProgressPanelProps {
  totalScenes: number;
  clips: ClipStatusMap;
  connected: boolean;
}

function StatusBadge({ status }: { status: SnapshotClip["status"] }) {
  if (status === "queued")
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)]">
        Queued
      </span>
    );
  if (status === "processing")
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] animate-pulse">
        Generating…
      </span>
    );
  if (status === "done")
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-success)]/20 text-[var(--accent-success)]">
        Done
      </span>
    );
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-danger)]/20 text-[var(--accent-danger)]">
      Failed
    </span>
  );
}

export function ClipProgressPanel({
  totalScenes,
  clips,
  connected,
}: ClipProgressPanelProps) {
  if (totalScenes === 0) return null;

  const doneCount = Object.values(clips).filter((c) => c.status === "done").length;

  return (
    <div className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-border)]">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              connected
                ? "bg-[var(--accent-success)] animate-pulse"
                : "bg-[var(--text-muted)]",
            )}
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Generating clips
          </span>
        </div>
        <span className="text-xs tabular-nums text-[var(--text-secondary)]">
          {doneCount} / {totalScenes} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[var(--bg-elevated)]">
        <div
          className="h-full bg-[var(--accent-primary)] transition-all duration-700"
          style={{ width: `${(doneCount / totalScenes) * 100}%` }}
        />
      </div>

      {/* Scene grid */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {Array.from({ length: totalScenes }, (_, i) => {
          const clip = clips[i];
          const status: SnapshotClip["status"] = clip?.status ?? "queued";

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-2",
                status === "queued" && "border-[var(--bg-border)] bg-[var(--bg-elevated)]",
                status === "processing" && "border-[var(--accent-warning)]/40 bg-[var(--bg-elevated)] animate-[border-pulse_1.5s_ease-in-out_infinite]",
                status === "done" && "border-[var(--accent-success)]/30 bg-[var(--bg-elevated)]",
                status === "failed" && "border-[var(--accent-danger)]/40 bg-[var(--bg-elevated)]",
              )}
            >
              {/* Video preview for done clips */}
              {status === "done" && clip?.clipUrl ? (
                <div className="w-full overflow-hidden rounded" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={clip.clipUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-full rounded bg-[var(--bg-base)]"
                  style={{ aspectRatio: "16/9" }}
                />
              )}

              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Scene {i + 1}
                </span>
                <StatusBadge status={status} />
              </div>

              {status === "failed" && clip?.error && (
                <p className="truncate text-[10px] text-[var(--accent-danger)]">
                  {clip.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
