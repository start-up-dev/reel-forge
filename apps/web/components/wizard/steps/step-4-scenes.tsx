"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
} from "lucide-react";
import { VideoStatus } from "@repo/types";
import type { Scene } from "@repo/types";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface Step4ScenesProps {
  video: VideoDetail;
  onVideoUpdate: (v: VideoDetail) => void;
  onBack: () => void;
  onAdvance: () => void;
}

export function Step4Scenes({
  video,
  onVideoUpdate,
  onBack,
  onAdvance,
}: Step4ScenesProps) {
  const api = useApiClient();
  const [scenes, setScenes] = useState<Scene[]>(video.scenes ?? []);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [editingMotion, setEditingMotion] = useState<number | null>(null);
  const [motionDraft, setMotionDraft] = useState("");
  const [approvingAll, setApprovingAll] = useState(false);

  const isPending = video.status === VideoStatus.ScenesPending;
  const totalScenes = scenes.length;
  const approvedCount = scenes.filter((s) => s.approved).length;
  const allApproved = totalScenes > 0 && approvedCount === totalScenes;

  // Poll while generating — update when scenes are ready
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      const result = await withToast(
        () => api.videos.get(video.id),
        "Failed to check scene status",
      );
      if (result?.data) {
        setScenes(result.data.scenes ?? []);
        if (result.data.status !== VideoStatus.ScenesPending) {
          onVideoUpdate(result.data);
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, api, video.id, onVideoUpdate]);

  async function savePrompt(sceneIndex: number) {
    const result = await withToast(
      () =>
        api.scenes.update(video.id, sceneIndex, { visualPrompt: promptDraft }),
      "Failed to save prompt",
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) =>
          s.sceneIndex === sceneIndex ? { ...s, ...result.data } : s,
        ),
      );
    }
    setEditingPrompt(null);
  }

  async function saveMotion(sceneIndex: number) {
    const result = await withToast(
      () =>
        api.scenes.update(video.id, sceneIndex, { motionPrompt: motionDraft }),
      "Failed to save motion prompt",
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) =>
          s.sceneIndex === sceneIndex ? { ...s, ...result.data } : s,
        ),
      );
    }
    setEditingMotion(null);
  }

  async function toggleApproval(sceneIndex: number, approved: boolean) {
    const result = await withToast(
      () => api.scenes.update(video.id, sceneIndex, { approved }),
      "Failed to update approval",
    );
    if (result?.data) {
      setScenes((prev) =>
        prev.map((s) => (s.sceneIndex === sceneIndex ? { ...s, approved } : s)),
      );
    }
  }

  async function approveAll() {
    setApprovingAll(true);
    await Promise.all(
      scenes
        .filter((s) => !s.approved)
        .map((s) => toggleApproval(s.sceneIndex, true)),
    );
    setApprovingAll(false);
  }

  // ─── Preparing state (pending, no scenes yet) ───────────────────────────────
  if (isPending && totalScenes === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Generating scenes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Splitting your script into scenes and writing visual prompts…
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-5 py-4">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent-primary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            Preparing your scene list…
          </span>
        </div>
      </div>
    );
  }

  // ─── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isPending ? "Generating scenes…" : "Review your scenes"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {approvedCount === totalScenes && totalScenes > 0
              ? `${totalScenes} scenes · All approved`
              : `${approvedCount} of ${totalScenes} approved`}
          </p>
        </div>

        {!isPending && (
          <Button
            onClick={() => void approveAll().then(() => onAdvance())}
            loading={approvingAll}
            disabled={totalScenes === 0}
            className="shrink-0"
          >
            Approve All →
          </Button>
        )}
      </div>

      {/* Scene grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {scenes.map((scene) => {
          const isExpanded = expandedScene === scene.sceneIndex;
          const isEditingThisPrompt = editingPrompt === scene.sceneIndex;
          const isEditingThisMotion = editingMotion === scene.sceneIndex;

          return (
            <div
              key={scene.sceneIndex}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border bg-[var(--bg-surface)] transition-all",
                scene.approved
                  ? "border-[var(--accent-success)]"
                  : "border-[var(--bg-border)]",
              )}
            >
              {/* Scene header */}
              <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-3 py-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Scene {scene.sceneIndex + 1}
                  {scene.durationHintSeconds
                    ? ` · ${scene.durationHintSeconds}s`
                    : ""}
                </span>
                {scene.approved && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent-success)]" />
                )}
              </div>

              {/* Text excerpt */}
              <p className="mx-4 mt-3 text-xs italic leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                &ldquo;{scene.textExcerpt}&rdquo;
              </p>

              {/* Expandable prompts */}
              <button
                type="button"
                onClick={() =>
                  setExpandedScene(isExpanded ? null : scene.sceneIndex)
                }
                className="mx-4 mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {isExpanded ? "Hide prompts" : "Show prompts"}
              </button>

              {isExpanded && (
                <div className="mx-4 mt-2 space-y-2">
                  {/* Visual prompt */}
                  <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Visual Prompt
                    </p>
                    {isEditingThisPrompt ? (
                      <div className="space-y-2">
                        <textarea
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded bg-[var(--bg-base)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--accent-primary)]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => savePrompt(scene.sceneIndex)}
                            className="h-6 text-[10px]"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrompt(null)}
                            className="h-6 text-[10px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {scene.visualPrompt}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrompt(scene.sceneIndex);
                            setPromptDraft(scene.visualPrompt);
                            setExpandedScene(scene.sceneIndex);
                          }}
                          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Motion prompt */}
                  <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Motion Prompt
                    </p>
                    {isEditingThisMotion ? (
                      <div className="space-y-2">
                        <textarea
                          value={motionDraft}
                          onChange={(e) => setMotionDraft(e.target.value)}
                          rows={2}
                          placeholder="e.g. slow push-in, particles drifting…"
                          className="w-full resize-none rounded bg-[var(--bg-base)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveMotion(scene.sceneIndex)}
                            className="h-6 text-[10px]"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMotion(null)}
                            className="h-6 text-[10px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {scene.motionPrompt || (
                            <span className="italic text-[var(--text-muted)]">
                              None set
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMotion(scene.sceneIndex);
                            setMotionDraft(scene.motionPrompt);
                          }}
                          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action row */}
              <div className="mt-3 flex items-center justify-end border-t border-[var(--bg-border)] px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    toggleApproval(scene.sceneIndex, !scene.approved)
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                    scene.approved
                      ? "bg-[var(--accent-success)]/15 text-[var(--accent-success)]"
                      : "border border-[var(--bg-border)] text-[var(--text-muted)] hover:border-[var(--accent-success)] hover:text-[var(--accent-success)]",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {scene.approved ? "Approved" : "Approve"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom navigation */}
      {totalScenes > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex items-center gap-3">
            {!allApproved && (
              <span className="text-xs text-[var(--text-muted)]">
                {approvedCount} / {totalScenes} approved
              </span>
            )}
            <Button onClick={onAdvance} disabled={!allApproved || isPending}>
              {isPending
                ? "Generating…"
                : allApproved
                  ? "Continue to Style →"
                  : "Approve all scenes to continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
