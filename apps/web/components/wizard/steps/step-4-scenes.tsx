"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Pencil, RefreshCw, Upload } from "lucide-react";
import { VideoStatus } from "@repo/types";
import type { Scene } from "@repo/types";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step4ScenesProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onAdvance: () => void;
}

export function Step4Scenes({ video, onVideoUpdate, onAdvance }: Step4ScenesProps) {
  const api = useApiClient();
  const [scenes, setScenes] = useState<Scene[]>(video.scenes ?? []);
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(new Set());
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const isPending = video.status === VideoStatus.ScenesPending;

  // Poll while scenes are generating
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      const result = await withToast(
        () => api.videos.get(video.id),
        "Failed to check scene status"
      );
      if (result?.data && result.data.status !== VideoStatus.ScenesPending) {
        onVideoUpdate(result.data);
        setScenes(result.data.scenes ?? []);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, api, video.id, onVideoUpdate]);

  async function regenerateScene(sceneIndex: number) {
    const result = await withToast(
      () => api.scenes.regenerate(video.id, sceneIndex),
      "Failed to regenerate scene"
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) =>
          s.sceneIndex === sceneIndex ? { ...s, ...result.data, baseImageUrl: null } : s
        )
      );
      // Poll for this scene's image
      const poll = setInterval(async () => {
        const r = await withToast(
          () => api.videos.get(video.id),
          "Failed to check scene"
        );
        if (r?.data) {
          const updated = r.data.scenes.find((s) => s.sceneIndex === sceneIndex);
          if (updated?.baseImageUrl) {
            setScenes((prev) =>
              prev.map((s) => (s.sceneIndex === sceneIndex ? updated : s))
            );
            clearInterval(poll);
          }
        }
      }, 3000);
    }
  }

  async function saveEditedPrompt(sceneIndex: number) {
    const result = await withToast(
      () => api.scenes.update(video.id, sceneIndex, { visualPrompt: promptDraft }),
      "Failed to save prompt"
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) => (s.sceneIndex === sceneIndex ? { ...s, ...result.data } : s))
      );
    }
    setEditingPrompt(null);
  }

  async function handleUploadImage(sceneIndex: number, file: File) {
    const urlResult = await withToast(
      () => api.scenes.uploadUrl(video.id, sceneIndex),
      "Failed to get upload URL"
    );
    if (!urlResult?.data) return;

    const { uploadUrl, path } = urlResult.data;
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!uploadRes.ok) {
      return;
    }

    const confirmResult = await withToast(
      () =>
        api.scenes.update(video.id, sceneIndex, {
          baseImageUrl: path,
          baseImagePath: path,
        }),
      "Failed to confirm upload"
    );
    if (confirmResult?.data) {
      setScenes((prev) =>
        prev.map((s) =>
          s.sceneIndex === sceneIndex ? { ...s, ...confirmResult.data } : s
        )
      );
    }
  }

  async function toggleApproval(sceneIndex: number, approved: boolean) {
    const result = await withToast(
      () => api.scenes.update(video.id, sceneIndex, { approved }),
      "Failed to update approval"
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) =>
          s.sceneIndex === sceneIndex ? { ...s, approved } : s
        )
      );
    }
  }

  async function approveAll() {
    setApprovingAll(true);
    await Promise.all(
      scenes
        .filter((s) => !s.approved)
        .map((s) => toggleApproval(s.sceneIndex, true))
    );
    setApprovingAll(false);
  }

  async function regenerateAll() {
    setRegeneratingAll(true);
    const result = await withToast(
      () => api.videos.generateScenes(video.id),
      "Failed to regenerate scenes"
    );
    if (result?.data) {
      onVideoUpdate(result.data);
      setScenes(result.data.scenes ?? []);
    }
    setRegeneratingAll(false);
  }

  const allApproved = scenes.length > 0 && scenes.every((s) => s.approved);
  const readyCount = scenes.filter((s) => s.baseImageUrl).length;

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
          Generating scenes…
        </h1>
        <p className="mb-8 text-sm text-[var(--text-secondary)]">
          Creating base images for each scene. This may take a moment.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Review your scenes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {readyCount < scenes.length
              ? `${readyCount} / ${scenes.length} images ready`
              : `${scenes.length} scenes generated · All images ready`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerateAll}
            loading={regeneratingAll}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate All
          </Button>
          <Button
            onClick={() => {
              void approveAll().then(() => onAdvance());
            }}
            loading={approvingAll}
            disabled={scenes.length === 0}
          >
            Approve All →
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {scenes.map((scene) => {
          const isExpanded = expandedPrompts.has(scene.sceneIndex);
          const isEditing = editingPrompt === scene.sceneIndex;

          return (
            <div
              key={scene.sceneIndex}
              className={cn(
                "rounded-xl border bg-[var(--bg-elevated)] transition-all",
                scene.approved
                  ? "border-[var(--accent-success)]/60"
                  : "border-[var(--bg-border)]"
              )}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-[var(--text-muted)]">
                  Scene {scene.sceneIndex + 1}
                  {scene.durationHintSeconds
                    ? ` · ${scene.durationHintSeconds}s`
                    : ""}
                </span>
                {/* Approval toggle */}
                <button
                  type="button"
                  onClick={() =>
                    toggleApproval(scene.sceneIndex, !scene.approved)
                  }
                  aria-label={
                    scene.approved ? "Unapprove scene" : "Approve scene"
                  }
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border transition-all text-xs",
                    scene.approved
                      ? "border-[var(--accent-success)] bg-[var(--accent-success)] text-white"
                      : "border-[var(--bg-border)] hover:border-[var(--accent-success)]"
                  )}
                >
                  {scene.approved && "✓"}
                </button>
              </div>

              {/* Image area (9:16 aspect) */}
              <div className="relative mx-4 overflow-hidden rounded-lg bg-[var(--bg-base)]"
                style={{ aspectRatio: "9/16", maxHeight: 240 }}>
                {scene.baseImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scene.baseImageUrl}
                    alt={`Scene ${scene.sceneIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="animate-pulse text-[var(--text-muted)]">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">Generating…</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Text excerpt */}
              <p className="mx-4 mt-3 text-xs italic text-[var(--text-secondary)] line-clamp-2">
                "{scene.textExcerpt}"
              </p>

              {/* Visual prompt */}
              <div className="mx-4 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPrompts((prev) => {
                      const next = new Set(prev);
                      isExpanded
                        ? next.delete(scene.sceneIndex)
                        : next.add(scene.sceneIndex);
                      return next;
                    })
                  }
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {isExpanded ? "Hide prompt" : "Show prompt"}
                </button>
                {isExpanded && (
                  <div className="mt-2 rounded-lg bg-[var(--bg-base)] px-3 py-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded bg-[var(--bg-elevated)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--accent-primary)]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditedPrompt(scene.sceneIndex)}
                            className="text-xs"
                          >
                            Save & Regenerate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrompt(null)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {scene.visualPrompt}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 px-4 py-3">
                <button
                  type="button"
                  onClick={() => regenerateScene(scene.sceneIndex)}
                  aria-label="Regenerate image"
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrompt(scene.sceneIndex);
                    setPromptDraft(scene.visualPrompt);
                    setExpandedPrompts((prev) => new Set([...prev, scene.sceneIndex]));
                  }}
                  aria-label="Edit prompt"
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Prompt
                </button>
                <label
                  aria-label="Upload image"
                  className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadImage(scene.sceneIndex, file);
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      {scenes.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={onAdvance}
            disabled={!allApproved}
          >
            {allApproved ? "Continue to Style →" : `Approve all scenes to continue`}
          </Button>
        </div>
      )}
    </div>
  );
}
