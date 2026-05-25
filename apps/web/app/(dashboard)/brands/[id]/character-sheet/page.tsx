"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, RefreshCw, ArrowRight, Palette, Send } from "lucide-react";
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
  const [feedback, setFeedback] = useState("");

  const generate = useCallback(async (feedbackText?: string) => {
    setGenerating(true);
    const res = await withToast(
      () => api.brands.generateCharacterSheet(params.id, feedbackText ? { feedback: feedbackText } : undefined),
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
      const brandRes = await withToast(() => api.brands.get(params.id), "Failed to load brand");
      if (!brandRes?.data) { setInitializing(false); return; }

      const brand = brandRes.data;
      setCharacterType(brand.characterType);

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

      const sheetRes = await withToast(
        () => api.brands.characterSheetUrl(params.id),
        "Failed to load character sheet"
      );

      if (sheetRes?.data?.url) {
        setImageUrl(sheetRes.data.url);
        setGenerationCount(sheetRes.data.generationCount);
      } else {
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
    const fb = feedback.trim();
    setFeedback("");
    await generate(fb || undefined);
  }

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
          Review your AI-generated character reference sheet. Describe changes or regenerate until you&apos;re happy.
        </p>
      </div>

      {generationCount > 0 && (
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Generation {uiPreviewCount} of {MAX_UI_PREVIEWS} previews shown
          {generationCount > 0 ? ` · ${generationCount} total generated` : ""}
        </p>
      )}

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

      {/* Feedback input */}
      {canRegenerate && !generating && (
        <div className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
            Ask Claude to change something
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleRegenerate();
                }
              }}
              placeholder='e.g. "Add glasses and make the hair red" or "Make the character taller"'
              className="flex-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20 disabled:opacity-50"
            >
              {feedback.trim() ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Refine
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {atUiLimit && !atBackendLimit && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/brands/${params.id}/onboard`)}
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
            onClick={() => router.push(`/brands/${params.id}/onboard`)}
          >
            edit your brand profile
          </button>{" "}
          to start fresh.
        </p>
      )}
    </div>
  );
}
