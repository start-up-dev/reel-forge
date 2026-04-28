"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoreVertical, Edit2, Trash2, Plus, Film } from "lucide-react";
import type { Project } from "@repo/types";
import { Platform } from "@repo/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.TikTok]: "TikTok",
  [Platform.Instagram]: "Instagram",
  [Platform.YouTubeShorts]: "YouTube Shorts",
  [Platform.FacebookReels]: "Facebook Reels",
};

interface ProjectCardProps {
  project: Project;
  videoCount?: number;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onNewVideo: (projectId: string) => void;
}

export function ProjectCard({
  project,
  videoCount = 0,
  onEdit,
  onDelete,
  onNewVideo,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const updatedAt = new Date(project.updatedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const lastActive =
    diffDays === 0 ? "today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Options menu — lives outside <Link> so clicks never trigger navigation */}
      <div ref={menuRef} className="absolute right-2 top-2 z-10">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Project options"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 min-w-[160px] overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-modal)]">
            <button
              onClick={() => { setMenuOpen(false); onEdit(project); }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Project
            </button>
            <div className="my-1 h-px bg-[var(--bg-border)]" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(project); }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Entire card body (thumbnail + content) is a link */}
      <Link href={`/projects/${project.id}`} className="flex flex-col">
        {/* Thumbnail area */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-10 w-10 text-[var(--bg-border)]" />
          </div>
          {/* Platform badges */}
          <div className="absolute left-3 top-3 flex items-center gap-1">
            {project.platforms.slice(0, 3).map((p) => (
              <span
                key={p}
                className="rounded-full border border-[var(--bg-border)] bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
              >
                {PLATFORM_LABELS[p as Platform] ?? p}
              </span>
            ))}
            {project.platforms.length > 3 && (
              <span className="text-[10px] text-white/70">
                +{project.platforms.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 gap-3">
          {/* Name */}
          <div>
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {project.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {project.niche} · {project.language}
            </p>
          </div>

          {/* Stats */}
          <p className="text-xs text-[var(--text-muted)]">
            {videoCount} {videoCount === 1 ? "video" : "videos"} · Last active {lastActive}
          </p>
        </div>
      </Link>

      {/* Footer action — outside the Link so it doesn't navigate */}
      <div className="border-t border-[var(--bg-border)] px-4 py-3">
        <button
          onClick={() => onNewVideo(project.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)]/10 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
        >
          <Plus className="h-3.5 w-3.5" />
          New Video
        </button>
      </div>
    </div>
  );
}
