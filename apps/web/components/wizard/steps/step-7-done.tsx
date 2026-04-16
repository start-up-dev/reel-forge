"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDuration } from "@repo/utils";
import { Button } from "@repo/ui/button";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step7DoneProps {
  video: VideoDetail;
  projectId: string;
  onMakeAnother: () => void;
}

export function Step7Done({ video, projectId, onMakeAnother }: Step7DoneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [confettiDone, setConfettiDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setConfettiDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  async function handleCopyLink() {
    try {
      const shareUrl = `${window.location.origin}/videos/${video.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Expires in 7 days.");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function handleDownload() {
    if (!video.outputUrl) {
      toast.error("Video URL not available");
      return;
    }
    const a = document.createElement("a");
    a.href = video.outputUrl;
    a.download = `${video.title.replace(/\s+/g, "_")}.mp4`;
    a.click();
  }

  const createdDate = new Date(video.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      {/* Success animation */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-success)]/20 transition-transform duration-500",
            confettiDone ? "scale-100" : "scale-0"
          )}
        >
          <CheckCircle2 className="h-8 w-8 text-[var(--accent-success)]" />
        </div>

        {/* Confetti dots (CSS-only, subtle) */}
        {!confettiDone && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="absolute block h-2 w-2 rounded-full animate-bounce"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${5 + Math.random() * 40}%`,
                  backgroundColor: [
                    "var(--accent-primary)",
                    "var(--accent-success)",
                    "var(--accent-secondary)",
                    "var(--accent-warning)",
                  ][i % 4],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Your video is ready!
        </h1>
      </div>

      {/* Video player */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: "9/16", maxHeight: 560 }}>
        {video.outputUrl ? (
          <video
            ref={videoRef}
            src={video.outputUrl}
            controls
            autoPlay
            muted
            playsInline
            loop
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
            Video unavailable
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mb-8 flex gap-3 text-xs text-[var(--text-muted)]">
        {video.durationSeconds && (
          <span>{formatDuration(Math.round(video.durationSeconds))}</span>
        )}
        <span>·</span>
        <span>1080×1920</span>
        <span>·</span>
        <span>MP4</span>
        <span>·</span>
        <span>Created {createdDate}</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleDownload}
          disabled={!video.outputUrl}
          className="flex-1 gap-2"
        >
          <Download className="h-4 w-4" />
          Download MP4
        </Button>
        <Button
          variant="secondary"
          onClick={handleCopyLink}
          className="flex-1 gap-2"
        >
          <Link2 className="h-4 w-4" />
          Copy Shareable Link
        </Button>
        <Button
          variant="ghost"
          onClick={onMakeAnother}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Make Another Video
        </Button>
      </div>
    </div>
  );
}
