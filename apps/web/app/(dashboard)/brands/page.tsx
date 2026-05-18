"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Plus, UserSquare2, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { BrandProfile } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

const TONE_LABEL: Record<string, string> = {
  energetic: "Energetic",
  calm: "Calm",
  witty: "Witty",
  inspirational: "Inspirational",
  professional: "Professional",
  dramatic: "Dramatic",
};

const VISUAL_STYLE_LABEL: Record<string, string> = {
  realistic: "Realistic",
  anime: "Anime",
  "3d_animation": "3D Animation",
  cartoon: "Cartoon",
  cinematic: "Cinematic",
  minimalist: "Minimalist",
};

const CHARACTER_TYPE_LABEL: Record<string, string> = {
  human: "Human Presenter",
  mascot: "Brand Mascot",
  abstract: "Abstract Character",
  none: "No Character",
};

export default function BrandsPage() {
  const api = useApiClient();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await withToast(() => api.brands.list(), "Failed to load brand profiles");
      if (result?.data) setBrands(result.data);
      setLoading(false);
    })();
  }, [api]);

  async function handleDelete() {
    if (!deleteId) return;
    const result = await withToast(
      () => api.brands.delete(deleteId),
      "Failed to delete brand profile"
    );
    if (result?.data?.ok) {
      setBrands((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success("Brand profile deleted");
    }
    setDeleteId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Profiles</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Define your brand identity — niche, tone, visual style, and character.
          </p>
        </div>
        <Button asChild>
          <Link href="/brands/new" className="gap-2 flex items-center">
            <Plus className="h-4 w-4" />
            New Brand
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--bg-border)] py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <UserSquare2 className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              No brand profiles yet
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create your first brand profile to start generating content.
            </p>
          </div>
          <Button asChild>
            <Link href="/brands/new">Create Brand Profile</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {brands.map((brand) => (
            <li key={brand.id} className="group relative">
              <Link
                href={`/brands/${brand.id}`}
                className="flex items-center gap-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-5 py-4 transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface)]">
                  <UserSquare2 className="h-5 w-5 text-[var(--accent-primary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {brand.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {brand.niche} · {TONE_LABEL[brand.tone] ?? brand.tone} ·{" "}
                    {VISUAL_STYLE_LABEL[brand.visualStyle] ?? brand.visualStyle} ·{" "}
                    {CHARACTER_TYPE_LABEL[brand.characterType] ?? brand.characterType}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    brand.onboardingComplete
                      ? "bg-[var(--accent-success)]/15 text-[var(--accent-success)]"
                      : "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]"
                  }`}
                >
                  {brand.onboardingComplete ? "Ready" : "Setup"}
                </span>

                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </Link>

              {/* Edit / Delete actions — sit on top of the link */}
              <div className="absolute right-12 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  href={`/brands/${brand.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(brand.id); }}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-border)] hover:text-[var(--accent-danger)]"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete brand profile?"
        description="This will permanently delete the brand profile and all associated data."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
