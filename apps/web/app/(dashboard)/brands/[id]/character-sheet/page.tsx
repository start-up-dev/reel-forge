"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, RefreshCw, ArrowRight, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";

const MAX_UI_PREVIEWS = 3;
const MAX_GENERATIONS = 10;

export default function CharacterSheetPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const api = useApiClient();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [uiPreviewCount, setUiPreviewCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [characterType, setCharacterType] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const generate = useCallback(async () => {
    setGenerating(true);
    const res = await withToast(
      () => api.brands.generateCharacterSheet(params.id),
      "Failed to generate character sheet"
    );
    setGenerating(false);
    if (res?.data) {
      setImageUrl(res.data.characterSheetUrl);
      setUiPreviewCount((n) => n + 1);
      setGenerationCount((n) => n + 1);
    }
  }, [api, params.id]);

  useEffect(() => {
    void (async () => {
      // Fetch brand to check character type
      const brandRes = await withToast(() => api.brands.get(params.id), "Failed to load brand");
      if (!brandRes?.data) { setInitializing(false); return; }

      const brand = brandRes.data;
      setCharacterType(brand.characterType);

      // No-character path: auto-complete and redirect
      if (brand.characterType === "none") {
        const res = await withToast(
          () => api.brands.completeOnboarding(params.id),
          "Failed to complete onboarding"
        );
        if (res) {
          router.push(`/brands/${params.id}/plan/new`);
        }
        setInitializing(false);
        return;
      }

      // Check if character sheet already exists
      const sheetRes = await withToast(
        () => api.brands.characterSheetUrl(params.id),
        "Failed to load character sheet"
      );

      if (sheetRes?.data?.url) {
        setImageUrl(sheetRes.data.url);
        setGenerationCount(sheetRes.data.generationCount);
      } else {
        // Auto-generate on first visit
        setInitializing(false);
        await generate();
        return;
      }

      setInitializing(false);
    })();
  }, [api, params.id, generate, router]);

  async function handleComplete() {
    setCompleting(true);
    const res = await withToast(
      () => api.brands.completeOnboarding(params.id),
      "Failed to complete onboarding"
    );
    setCompleting(false);
    if (res) {
      toast.success("Brand profile complete!");
      router.push(`/brands/${params.id}/plan/new`);
    }
  }

  async function handleRegenerate() {
    await generate();
  }

  // Loading / initializing
  if (initializing || (generating && !imageUrl)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-primary)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">Creating your character…</p>
        <p className="text-xs text-[var(--text-muted)]">
          This usually takes 15–30 seconds
        </p>
      </div>
    );
  }

  // No-character redirect in progress
  if (characterType === "none") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">Setting up your brand…</p>
      </div>
    );
  }

  const atUiLimit = uiPreviewCount >= MAX_UI_PREVIEWS;
  const atBackendLimit = generationCount >= MAX_GENERATIONS;
  const canRegenerate = !atUiLimit && !atBackendLimit;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Character Sheet</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Review your AI-generated character reference sheet. Regenerate until you&apos;re happy.
        </p>
      </div>

      {/* Generation counter */}
      {generationCount > 0 && (
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Generation {uiPreviewCount} of {MAX_UI_PREVIEWS} previews shown
          {generationCount > 0 ? ` · ${generationCount} total generated` : ""}
        </p>
      )}

      {/* Character sheet image */}
      {imageUrl ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Character reference sheet"
            className="w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6 flex h-64 items-center justify-center rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
          <p className="text-sm text-[var(--text-muted)]">No image yet</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {canRegenerate && !generating && (
            <Button
              variant="secondary"
              onClick={() => void handleRegenerate()}
              disabled={generating}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          )}

          {atUiLimit && !atBackendLimit && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/brands/${params.id}/edit`)}
              className="gap-2"
            >
              <Palette className="h-4 w-4" />
              Try Different Style
            </Button>
          )}

          {generating && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </div>
          )}
        </div>

        <Button
          onClick={() => void handleComplete()}
          disabled={!imageUrl || completing}
          loading={completing}
          className="gap-2"
        >
          Looks great — Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {atBackendLimit && (
        <p className="mt-4 text-xs text-[var(--accent-warning)]">
          Maximum generations reached. Use the current sheet or{" "}
          <button
            type="button"
            className="underline hover:text-[var(--text-secondary)]"
            onClick={() => router.push(`/brands/${params.id}/edit`)}
          >
            edit your brand profile
          </button>{" "}
          to start fresh.
        </p>
      )}
    </div>
  );
}
