"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { useApiClient } from "@/lib/api-client";

type PostsPerDay = 1 | 2 | 3 | 5;

const CADENCE_OPTIONS: { value: PostsPerDay; label: string; sub: string; total: number }[] = [
  { value: 1, label: "1 video / day", sub: "Consistent daily presence", total: 7 },
  { value: 2, label: "2 videos / day", sub: "Double your reach", total: 14 },
  { value: 3, label: "3 videos / day", sub: "High-volume growth", total: 21 },
  { value: 5, label: "5 videos / day", sub: "Maximum output mode", total: 35 },
];

export default function NewContentPlanPage() {
  const { id: brandId } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [selected, setSelected] = useState<PostsPerDay>(1);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await api.contentPlans.create({ brandProfileId: brandId, postsPerDay: selected });
      if (result?.data?.id) {
        router.push(`/brands/${brandId}/plan/${result.data.id}`);
      } else {
        toast.error("Failed to generate plan: unexpected response");
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate plan";
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Content Plan</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Choose your posting cadence and Claude will plan your full week.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {CADENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={`rounded-xl border p-5 text-left transition-all ${
              selected === opt.value
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/40"
            }`}
          >
            <p className="text-base font-semibold text-[var(--text-primary)]">{opt.label}</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{opt.sub}</p>
            <p className="mt-2 text-xs font-medium text-[var(--accent-primary)]">
              {opt.total} videos this week
            </p>
          </button>
        ))}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Claude is planning your week&hellip;
          </>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" />
            Generate Week 1 Plan
          </>
        )}
      </Button>
    </div>
  );
}
