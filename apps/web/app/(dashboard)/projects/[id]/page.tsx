"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  Download,
  Share2,
  Trash2,
  Play,
  Film,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@repo/ui/badge";
import { Skeleton } from "@repo/ui/skeleton";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { Video } from "@repo/types";
import { VideoStatus } from "@repo/types";
import { useProject } from "@/lib/hooks/use-projects";
import { useVideos } from "@/lib/hooks/use-videos";
import { useApiClient, withToast } from "@/lib/api-client";
import { formatRelativeDate } from "@repo/utils";

/* ── Status badge helpers ──────────────────────────────────────────────── */

type StatusVariant = "default" | "primary" | "success" | "warning" | "danger" | "secondary";

function statusBadge(status: VideoStatus): {
  label: string;
  variant: StatusVariant;
  icon?: React.ReactNode;
} {
  switch (status) {
    case VideoStatus.Complete:
      return { label: "Ready", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> };
    case VideoStatus.Failed:
      return { label: "Failed", variant: "danger", icon: <AlertCircle className="h-3 w-3" /> };
    case VideoStatus.Draft:
      return { label: "Draft", variant: "secondary" };
    case VideoStatus.ClipsQueued:
    case VideoStatus.ClipsProcessing:
    case VideoStatus.AssemblyPending:
    case VideoStatus.AssemblyProcessing:
      return { label: "Processing", variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> };
    case VideoStatus.ScriptPending:
    case VideoStatus.VoicePending:
    case VideoStatus.ScenesPending:
    case VideoStatus.BrainstormPending:
      return { label: "Generating", variant: "primary", icon: <Loader2 className="h-3 w-3 animate-spin" /> };
    default:
      return { label: "Draft", variant: "secondary" };
  }
}

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Ready", value: VideoStatus.Complete },
  { label: "Processing", value: "processing" },
  { label: "Draft", value: VideoStatus.Draft },
  { label: "Failed", value: VideoStatus.Failed },
];

const PROCESSING_STATUSES = new Set([
  VideoStatus.ClipsQueued,
  VideoStatus.ClipsProcessing,
  VideoStatus.AssemblyPending,
  VideoStatus.AssemblyProcessing,
  VideoStatus.ScriptPending,
  VideoStatus.VoicePending,
  VideoStatus.ScenesPending,
  VideoStatus.BrainstormPending,
]);

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const api = useApiClient();

  const { project, loading: projectLoading } = useProject(projectId);
  const { videos, loading: videosLoading, hasMore, loadMore, refetch } = useVideos(projectId);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteVideo, setDeleteVideo] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleNewVideo() {
    const result = await withToast(
      () => api.videos.create(projectId),
      "Failed to create video"
    );
    if (result?.data) {
      router.push(`/videos/${result.data.id}`);
    }
  }

  async function handleDeleteVideo() {
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
      refetch();
    }
  }

  // Filter videos client-side
  const filteredVideos = videos.filter((v) => {
    if (statusFilter !== "all") {
      if (statusFilter === "processing") {
        if (!PROCESSING_STATUSES.has(v.status)) return false;
      } else {
        if (v.status !== statusFilter) return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!v.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--text-secondary)] transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {projectLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="text-[var(--text-primary)]">{project?.name ?? "Project"}</span>
        )}
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {projectLoading ? (
            <>
              <Skeleton className="mb-2 h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </>
          ) : project ? (
            <>
              <h1 className="truncate text-2xl font-semibold text-[var(--text-primary)]">
                {project.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="primary" className="text-xs">
                  {project.platform}
                </Badge>
                <span className="text-sm text-[var(--text-muted)]">{project.niche}</span>
              </div>
            </>
          ) : null}
        </div>
        <button
          onClick={handleNewVideo}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Video
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-border)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/30"
          />
        </div>
      </div>

      {/* Videos loading */}
      {videosLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!videosLoading && filteredVideos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--bg-border)] p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <Film className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {videos.length === 0 ? "No videos yet" : "No matching videos"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {videos.length === 0
                ? "Create your first video for this project."
                : "Try adjusting your filters or search query."}
            </p>
          </div>
          {videos.length === 0 && (
            <button
              onClick={handleNewVideo}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create First Video
            </button>
          )}
        </div>
      )}

      {/* Video grid */}
      {!videosLoading && filteredVideos.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={() => setDeleteVideo(video)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-6 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
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
        onConfirm={handleDeleteVideo}
      />
    </div>
  );
}

/* ── Video Card ─────────────────────────────────────────────────────────── */

function VideoCard({
  video,
  onDelete,
}: {
  video: Video;
  onDelete: () => void;
}) {
  const { label, variant, icon } = statusBadge(video.status);
  const canDownload = video.status === VideoStatus.Complete && video.outputUrl;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="relative block aspect-[9/16] max-h-48 w-full overflow-hidden bg-[var(--bg-elevated)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-8 w-8 text-[var(--bg-border)]" />
        </div>
        {/* Status badge */}
        <div className="absolute right-2 top-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              variant === "success"
                ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]"
                : variant === "danger"
                  ? "bg-[var(--accent-danger)]/20 text-[var(--accent-danger)]"
                  : variant === "warning"
                    ? "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]"
                    : variant === "primary"
                      ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                      : "bg-[var(--bg-border)] text-[var(--text-muted)]"
            }`}
          >
            {icon}
            {label}
          </span>
        </div>
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 text-white" />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
          {video.title}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(new Date(video.createdAt))}
          {video.durationSeconds && (
            <>
              <span className="mx-0.5">·</span>
              {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, "0")}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-1.5">
          <Link
            href={`/videos/${video.id}`}
            aria-label="View video"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Play className="h-3.5 w-3.5" />
          </Link>
          {canDownload && (
            <a
              href={video.outputUrl!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download video"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {canDownload && (
            <button
              aria-label="Share video"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              onClick={() => {
                navigator.clipboard.writeText(video.outputUrl ?? "");
                toast.success("Link copied!");
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            aria-label="Delete video"
            onClick={onDelete}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
