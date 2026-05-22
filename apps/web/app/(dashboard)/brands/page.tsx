"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plug, UserSquare2, ChevronRight, Plus, Globe, X } from "lucide-react";
import { Button } from "@repo/ui/button";
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

function CreateBrandDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const api = useApiClient();
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const result = await withToast(
      () =>
        api.brands.create({
          name: name.trim(),
          niche: "general",
          tone: "professional",
          visualStyle: "realistic",
          characterType: "human",
        }),
      "Failed to create brand"
    );

    if (!result?.data) {
      setCreating(false);
      return;
    }

    const brandId = result.data.id;

    if (websiteUrl.trim()) {
      await withToast(
        () => api.brands.ingestWebsite(brandId, websiteUrl.trim()),
        "Could not fetch website — you can add it during onboarding"
      );
    }

    onCreated(brandId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Create brand</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Business name <span className="text-[var(--accent-danger)]">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Chen Real Estate"
              className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Website URL{" "}
              <span className="text-[var(--text-muted)]">(recommended — Claude reads it for context)</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Claude will build the full brand profile during onboarding. You can connect a Facebook page later.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={creating} disabled={!name.trim()}>
              Create & set up brand
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const api = useApiClient();
  const router = useRouter();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await withToast(() => api.brands.list(), "Failed to load brand profiles");
      if (result?.data) setBrands(result.data);
      setLoading(false);
    })();
  }, [api]);

  async function handleConnectChannel() {
    setConnecting(true);
    const result = await withToast(() => api.social.authorize(), "Failed to start Facebook OAuth");
    if (result?.data?.authUrl) {
      window.location.href = result.data.authUrl;
    }
    setConnecting(false);
  }

  function handleBrandCreated(id: string) {
    router.push(`/brands/${id}/onboard`);
  }

  return (
    <>
      {showCreateDialog && (
        <CreateBrandDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleBrandCreated}
        />
      )}

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brands</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Connect a Facebook page or create a brand with just a website.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Brand
            </Button>
            <Button onClick={() => void handleConnectChannel()} loading={connecting} className="gap-2">
              <Plug className="h-4 w-4" />
              Connect Channel
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-[var(--bg-border)] py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
              <UserSquare2 className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No brands yet</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Connect a Facebook page or add a website — Claude builds the brand profile for you.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Brand
              </Button>
              <Button onClick={() => void handleConnectChannel()} loading={connecting} className="gap-2">
                <Plug className="h-4 w-4" />
                Connect Channel
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {brands.map((brand) => (
              <li key={brand.id}>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
