"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Plug, UserSquare2, ChevronRight } from "lucide-react";
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

export default function BrandsPage() {
  const api = useApiClient();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brands</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Connect a channel to create a brand. Claude builds the identity from your page.
          </p>
        </div>
        <Button onClick={() => void handleConnectChannel()} loading={connecting} className="gap-2">
          <Plug className="h-4 w-4" />
          Connect Channel
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--bg-border)] py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <Plug className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              No brands yet
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Connect a Facebook page and Claude will build your brand profile automatically.
            </p>
          </div>
          <Button onClick={() => void handleConnectChannel()} loading={connecting} className="gap-2">
            <Plug className="h-4 w-4" />
            Connect Channel
          </Button>
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
  );
}
