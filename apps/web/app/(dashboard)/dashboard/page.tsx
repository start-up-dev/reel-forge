"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Plus, Layers, ArrowRight, BarChart2 } from "lucide-react";
import { Skeleton } from "@repo/ui/skeleton";
import type { BrandProfile, ContentPlan } from "@repo/types";
import { useUser } from "@/lib/hooks/use-user";
import { useApiClient } from "@/lib/api-client";

interface BrandWithPlan extends BrandProfile {
  activePlan?: ContentPlan | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { user, loading: userLoading } = useUser();
  const api = useApiClient();

  const [brands, setBrands] = useState<BrandWithPlan[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Redirect new users to brand onboarding
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || userLoading) return;
    if (user && !user.onboardingComplete) {
      router.replace("/brands/new?onboarding=true");
    }
  }, [clerkLoaded, isSignedIn, user, userLoading, router]);

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const res = await api.brands.list();
      if (res.data) {
        setBrands(res.data);
      }
    } finally {
      setBrandsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || userLoading) return;
    if (user && !user.onboardingComplete) return;
    void loadBrands();
  }, [clerkLoaded, isSignedIn, user, userLoading, loadBrands]);

  const isLoading = userLoading || brandsLoading;

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border-t-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mb-4 text-2xl">✦</div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Welcome to ReelForge
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your content machine is almost ready. Set up your first brand to start generating videos automatically.
          </p>
          <button
            onClick={() => router.push("/brands/new")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Set Up My Brand
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard</h2>
        <button
          onClick={() => router.push("/brands/new")}
          className="flex items-center gap-2 rounded-lg border border-[var(--bg-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" />
          New Brand
        </button>
      </div>

      <p className="mb-6 text-sm text-[var(--text-muted)]">Your Brands</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            onCreatePlan={() => router.push(`/brands/${brand.id}/plan/new`)}
            onClick={() => router.push(`/brands/${brand.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function BrandCard({
  brand,
  onCreatePlan,
  onClick,
}: {
  brand: BrandWithPlan;
  onCreatePlan: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="group cursor-pointer rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] transition-all hover:scale-[1.01] hover:border-[var(--accent-primary)]/20"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{brand.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill>{brand.niche}</Pill>
            <Pill>{brand.visualStyle}</Pill>
            <Pill>{brand.characterType}</Pill>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {brand.onboardingComplete ? (
              <span className="flex items-center gap-1 text-[var(--accent-success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]" />
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--accent-warning)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warning)]" />
                Setup incomplete
              </span>
            )}
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)]">
          <Layers className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCreatePlan();
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <BarChart2 className="h-4 w-4" />
        Create Week Plan
      </button>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] capitalize text-[var(--text-muted)]">
      {children}
    </span>
  );
}
