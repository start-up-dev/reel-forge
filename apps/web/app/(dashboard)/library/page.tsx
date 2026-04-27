"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  Search,
  Download,
  Share2,
  Trash2,
  Play,
  Film,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@repo/ui/skeleton";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { Video } from "@repo/types";
import { VideoStatus } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import { formatRelativeDate } from "@repo/utils";

function statusBadgeStyles(status: VideoStatus) {
  switch (status) {
    case VideoStatus.Complete:
      return { bg: "bg-[var(--accent-success)]/20", text: "text-[var(--accent-success)]", label: "Ready" };
    case VideoStatus.Failed:
      return { bg: "bg-[var(--accent-danger)]/20", text: "text-[var(--accent-danger)]", label: "Failed" };
    case VideoStatus.Draft:
      return { bg: "bg-[var(--bg-border)]", text: "text-[var(--text-muted)]", label: "Draft" };
    default:
      return { bg: "bg-[var(--accent-warning)]/20", text: "text-[var(--accent-warning)]", label: "Processing" };
  }
}

type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const api = useApiClient();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteVideo, setDeleteVideo] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

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
            href="/dashboard"
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
              onPreview={() => setPreviewVideo(video)}
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
                  onPreview={() => setPreviewVideo(video)}
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

      {/* Inline video preview modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onDelete={() => {
            setDeleteVideo(previewVideo);
            setPreviewVideo(null);
          }}
        />
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
  onPreview,
  onDelete,
}: {
  video: Video;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const s = statusBadgeStyles(video.status);
  const canDownload = video.status === VideoStatus.Complete && video.outputUrl;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      {/* Thumbnail */}
      <div
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPreview(); }}
        className="relative block w-full cursor-pointer aspect-[9/16] overflow-hidden bg-[var(--bg-elevated)]"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-8 w-8 text-[var(--bg-border)]" />
        </div>
        <div className="absolute right-2 top-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            {canDownload && (
              <a
                href={video.outputUrl!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Download"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            )}
            {canDownload && (
              <button
                aria-label="Share"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(video.outputUrl ?? "");
                  toast.success("Link copied!");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-danger)]/30 text-[var(--accent-danger)] backdrop-blur-sm hover:bg-[var(--accent-danger)]/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="p-2.5">
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">{video.title}</p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {formatRelativeDate(new Date(video.createdAt))}
        </p>
      </div>
    </div>
  );
}

/* ── List Row ───────────────────────────────────────────────────────────── */

function LibraryListRow({
  video,
  onPreview,
  onDelete,
}: {
  video: Video;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const s = statusBadgeStyles(video.status);
  const canDownload = video.status === VideoStatus.Complete && video.outputUrl;

  return (
    <tr className="group bg-[var(--bg-surface)] transition-colors hover:bg-[var(--bg-elevated)]">
      {/* Title */}
      <td className="py-3 pl-4 pr-3">
        <button
          onClick={onPreview}
          className="flex items-center gap-3 text-left"
        >
          <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated)] flex items-center justify-center">
            <Film className="h-4 w-4 text-[var(--bg-border)]" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
            {video.title}
          </span>
        </button>
      </td>
      {/* Status */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
          {s.label}
        </span>
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

/* ── Video Preview Modal ─────────────────────────────────────────────────── */

function VideoPreviewModal({
  video,
  onClose,
  onDelete,
}: {
  video: Video;
  onClose: () => void;
  onDelete: () => void;
}) {
  const canDownload = video.status === VideoStatus.Complete && video.outputUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Video / placeholder */}
        {canDownload ? (
          <video
            src={video.outputUrl!}
            className="aspect-[9/16] w-full object-cover"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="aspect-[9/16] w-full flex items-center justify-center bg-[var(--bg-elevated)]">
            <div className="flex flex-col items-center gap-3 text-center">
              {video.status === VideoStatus.Failed ? (
                <AlertCircle className="h-10 w-10 text-[var(--accent-danger)]" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-primary)]" />
              )}
              <p className="text-sm text-[var(--text-muted)]">
                {video.status === VideoStatus.Failed ? "Video failed" : "Still processing…"}
              </p>
            </div>
          </div>
        )}

        {/* Info + actions */}
        <div className="p-4">
          <h3 className="truncate font-semibold text-[var(--text-primary)]">{video.title}</h3>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {formatRelativeDate(new Date(video.createdAt))}
            {video.durationSeconds && (
              <> · {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, "0")}</>
            )}
          </p>
          {canDownload && (
            <div className="mt-4 flex gap-2">
              <a
                href={video.outputUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(video.outputUrl ?? "");
                  toast.success("Link copied!");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          )}
          <button
            onClick={onDelete}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
