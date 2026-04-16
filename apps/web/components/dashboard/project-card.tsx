"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoreVertical, Edit2, FolderOpen, Trash2, Plus, Film } from "lucide-react";
import type { Project } from "@repo/types";
import { Platform } from "@repo/types";

const platformLabels: Record<Platform, string> = {
  [Platform.TikTok]: "TikTok",
  [Platform.Instagram]: "Instagram",
  [Platform.YouTubeShorts]: "YouTube Shorts",
  [Platform.FacebookReels]: "Facebook Reels",
};

const platformColors: Record<Platform, string> = {
  [Platform.TikTok]: "bg-black text-white",
  [Platform.Instagram]: "bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white",
  [Platform.YouTubeShorts]: "bg-red-600 text-white",
  [Platform.FacebookReels]: "bg-blue-600 text-white",
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

  const platformLabel = platformLabels[project.platform] ?? project.platform;
  const platformColor = platformColors[project.platform] ?? "bg-[var(--bg-elevated)] text-[var(--text-secondary)]";

  const updatedAt = new Date(project.updatedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const lastActive =
    diffDays === 0 ? "today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Thumbnail area */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-10 w-10 text-[var(--bg-border)]" />
        </div>
        {/* Platform badge */}
        <div className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${platformColor}`}>
          {platformLabel}
        </div>
        {/* Gear menu trigger */}
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen((v) => !v);
            }}
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
              <Link
                href={`/projects/${project.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                View Videos
              </Link>
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
      </div>

      {/* Content */}
      <Link href={`/projects/${project.id}`} className="flex flex-1 flex-col p-4 gap-3">
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
      </Link>

      {/* Footer action */}
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
