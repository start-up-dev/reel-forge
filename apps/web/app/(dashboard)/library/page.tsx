"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  Search,
  Download,
  Share2,
  Trash2,
  Play,
  Pause,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@repo/ui/skeleton";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { PostSchedule } from "@repo/types";
import { VideoStatus } from "@repo/types";
import { useApiClient, withToast, type VideoLibraryItem } from "@/lib/api-client";
import { formatRelativeDate } from "@repo/utils";

function statusBadgeStyles(status: VideoStatus) {
  switch (status) {
    case VideoStatus.Complete:
      return { bg: "bg-[var(--accent-success)]/20", text: "text-[var(--accent-success)]", label: "Ready" };
    case VideoStatus.Failed:
      return { bg: "bg-[var(--accent-danger)]/20", text: "text-[var(--accent-danger)]", label: "Failed" };
    case VideoStatus.Draft:
      return { bg: "bg-[var(--bg-border)]", text: "text-[var(--text-muted)]", label: "Draft" };
    case VideoStatus.ClipsNeedsReview:
      return { bg: "bg-[var(--accent-warning)]/20", text: "text-[var(--accent-warning)]", label: "Under Review" };
    default:
      return { bg: "bg-[var(--accent-warning)]/20", text: "text-[var(--accent-warning)]", label: "Processing" };
  }
}

function postScheduleBadge(schedule: PostSchedule | null): { label: string; className: string } | null {
  if (!schedule) return null;
  if (schedule.status === "posted") {
    return { label: "Posted", className: "bg-[var(--accent-success)]/15 text-[var(--accent-success)]" };
  }
  if (schedule.status === "failed") {
    return { label: "Failed", className: "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)]" };
  }
  if (schedule.postType === "draft") {
    return { label: "Draft", className: "bg-[var(--bg-border)] text-[var(--text-muted)]" };
  }
  if (schedule.postType === "scheduled" && schedule.scheduledAt) {
    const d = new Date(schedule.scheduledAt);
    return {
      label: `Scheduled ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      className: "bg-blue-500/15 text-blue-400",
    };
  }
  return null;
}

type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const api = useApiClient();
  const [videos, setVideos] = useState<VideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteVideo, setDeleteVideo] = useState<VideoLibraryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const res = await api.library.list({
          page: pageNum,
          limit: 24,
          search: debouncedSearch || undefined,
        });
        if (pageNum === 1) {
          setVideos(res.data ?? []);
        } else {
          setVideos((prev) => [...prev, ...(res.data ?? [])]);
        }
        setHasMore(res.hasMore ?? false);
        setTotal(res.total ?? 0);
        setPage(pageNum);
      } catch {
        toast.error("Failed to load library");
      } finally {
        setLoading(false);
      }
    },
    [api, debouncedSearch]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  async function handleDelete() {
    if (!deleteVideo) return;
    setDeleting(true);
    const result = await withToast(
      () => api.videos.delete(deleteVideo.id),
      "Failed to delete video"
    );
    setDeleting(false);
    if (result !== null) {
      toast.success("Video deleted");
      setDeleteVideo(null);
      setVideos((prev) => prev.filter((v) => v.id !== deleteVideo.id));
      setTotal((t) => t - 1);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            My Videos
          </h2>
          {!loading && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {total} {total === 1 ? "video" : "videos"} total
            </p>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-1">
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="List view"
            className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search videos…"
          className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/30"
        />
      </div>

      {/* Loading */}
      {loading && page === 1 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              : "space-y-2"
          }
        >
          {Array.from({ length: 8 }).map((_, i) =>
            viewMode === "grid" ? (
              <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
            ) : (
              <Skeleton key={i} className="h-16 rounded-lg" />
            )
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--bg-border)] p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <Film className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">No videos yet</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Videos you generate will appear here once they&apos;re ready.
            </p>
          </div>
          <Link
            href="/brands"
            className="rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Create your first video
          </Link>
        </div>
      )}

      {/* Grid view */}
      {!loading && videos.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <LibraryGridCard
              key={video.id}
              video={video}
              onDelete={() => setDeleteVideo(video)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && videos.length > 0 && viewMode === "list" && (
        <div className="overflow-x-auto rounded-xl border border-[var(--bg-border)]">
          <table className="w-full">
            <thead className="border-b border-[var(--bg-border)] bg-[var(--bg-elevated)]">
              <tr>
                <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-[var(--text-muted)]">
                  Video
                </th>
                <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-muted)] hidden sm:table-cell">
                  Status
                </th>
                <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-muted)] hidden md:table-cell">
                  Duration
                </th>
                <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-muted)] hidden lg:table-cell">
                  Created
                </th>
                <th className="py-3 pl-3 pr-4 text-right text-xs font-medium text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bg-border)]">
              {videos.map((video) => (
                <LibraryListRow
                  key={video.id}
                  video={video}
                  onDelete={() => setDeleteVideo(video)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => load(page + 1)}
            className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-6 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Load more
          </button>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteVideo}
        onOpenChange={(open) => !open && setDeleteVideo(null)}
        title="Delete Video"
        description={
          deleteVideo
            ? `Are you sure you want to delete "${deleteVideo.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ── Grid Card ──────────────────────────────────────────────────────────── */

function LibraryGridCard({
  video,
  onDelete,
}: {
  video: VideoLibraryItem;
  onDelete: () => void;
}) {
  const s = statusBadgeStyles(video.status);
  const canPlay = video.status === VideoStatus.Complete && !!video.outputUrl;
  const postBadge = postScheduleBadge(video.postSchedule);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      {/* Video / placeholder */}
      <div className="relative aspect-[9/16] overflow-hidden bg-[var(--bg-elevated)]">
        {canPlay ? (
          <>
            <video
              ref={videoRef}
              src={video.outputUrl!}
              preload="metadata"
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              onEnded={() => setPlaying(false)}
            />
            {/* Badges */}
            <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
              {postBadge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${postBadge.className}`}>
                  {postBadge.label}
                </span>
              )}
            </div>
            {/* Play/pause tap area */}
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-opacity ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
                {playing
                  ? <Pause className="h-5 w-5 text-white" />
                  : <Play className="h-5 w-5 translate-x-0.5 text-white" />}
              </div>
            </button>
            {/* Delete overlay button */}
            <button
              type="button"
              aria-label="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-white/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-[var(--accent-danger)]/60 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="h-8 w-8 text-[var(--bg-border)]" />
            </div>
            <div className="absolute right-2 top-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                {s.label}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer: title + actions */}
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--text-primary)]">{video.title}</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {formatRelativeDate(new Date(video.createdAt))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canPlay && (
            <>
              <a
                href={video.outputUrl!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download"
                title="Download"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                aria-label="Copy link"
                title="Copy link"
                onClick={() => {
                  navigator.clipboard.writeText(video.outputUrl ?? "");
                  toast.success("Link copied!");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!canPlay && (
            <button
              type="button"
              aria-label="Delete"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-danger)]/40 hover:text-[var(--accent-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── List Row ───────────────────────────────────────────────────────────── */

function LibraryListRow({
  video,
  onDelete,
}: {
  video: VideoLibraryItem;
  onDelete: () => void;
}) {
  const s = statusBadgeStyles(video.status);
  const canDownload = video.status === VideoStatus.Complete && !!video.outputUrl;
  const postBadge = postScheduleBadge(video.postSchedule);

  return (
    <tr className="group bg-[var(--bg-surface)] transition-colors hover:bg-[var(--bg-elevated)]">
      {/* Title */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated)] flex items-center justify-center">
            <Film className="h-4 w-4 text-[var(--bg-border)]" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
            {video.title}
          </span>
        </div>
      </td>
      {/* Status */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          {postBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${postBadge.className}`}>
              {postBadge.label}
            </span>
          )}
        </div>
      </td>
      {/* Duration */}
      <td className="py-3 px-3 text-sm text-[var(--text-muted)] hidden md:table-cell">
        {video.durationSeconds
          ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, "0")}`
          : "—"}
      </td>
      {/* Created */}
      <td className="py-3 px-3 text-sm text-[var(--text-muted)] hidden lg:table-cell">
        {formatRelativeDate(new Date(video.createdAt))}
      </td>
      {/* Actions */}
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center justify-end gap-1.5">
          {canDownload && (
            <a
              href={video.outputUrl!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {canDownload && (
            <button
              aria-label="Share"
              onClick={() => {
                navigator.clipboard.writeText(video.outputUrl ?? "");
                toast.success("Link copied!");
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            aria-label="Delete"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

