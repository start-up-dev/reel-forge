"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Film, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";

const EXAMPLE_TOPICS = [
  "5 morning habits that will change your life",
  "The one mindset shift that doubled my productivity",
  "Why most people fail at this (and how to avoid it)",
  "What nobody tells you about getting started",
];

export default function NewSingleVideoPage() {
  const { id: brandId } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [topic, setTopic] = useState("");
  const [letClaudePick, setLetClaudePick] = useState(false);
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [brandName, setBrandName] = useState<string | null>(null);

  useEffect(() => {
    void api.brands.get(brandId).then((res) => {
      if (res?.data) setBrandName(res.data.name);
    });
  }, [api, brandId]);

  async function handleSubmit() {
    setCreating(true);
    const effectiveTopic = letClaudePick
      ? "Pick the most engaging topic for this brand and its audience"
      : topic.trim() || "Pick the most engaging topic for this brand and its audience";

    const res = await withToast(
      () =>
        api.videos.generateSingle({
          brandProfileId: brandId,
          topic: effectiveTopic,
          targetDurationSeconds: duration,
        }),
      "Failed to start video generation"
    );
    setCreating(false);
    if (res?.data) {
      router.push(`/brands/${brandId}/video/${res.data.videoId}`);
    }
  }

  const canSubmit = letClaudePick || topic.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Back link */}
      <Link
        href={`/brands/${brandId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {brandName ?? "Brand"}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create a Video</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Claude writes the script, designs the scenes, and generates the clips. You just give it a topic.
        </p>
      </div>

      <div className="space-y-6">
        {/* Topic */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Topic / Script notes
            </label>
            <button
              type="button"
              onClick={() => {
                setLetClaudePick((v) => !v);
                if (!letClaudePick) setTopic("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                letClaudePick
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Let Claude pick
            </button>
          </div>

          {letClaudePick ? (
            <div className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 px-4 py-6 text-center">
              <div>
                <Sparkles className="mx-auto mb-1.5 h-5 w-5 text-[var(--accent-primary)]" />
                <p className="text-sm font-medium text-[var(--accent-primary)]">Claude will choose the best topic</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">Based on your brand niche and audience</p>
              </div>
            </div>
          ) : (
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 5 morning habits that changed my life"
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          )}

          {!letClaudePick && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_TOPICS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setTopic(ex)}
                  className="rounded-full border border-[var(--bg-border)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-secondary)]"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Duration
          </label>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  duration === d
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={() => void handleSubmit()}
          disabled={creating || !canSubmit}
          className="w-full gap-2"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting generation…
            </>
          ) : (
            <>
              <Film className="h-4 w-4" />
              Generate Video →
            </>
          )}
        </Button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          You&apos;ll see live progress as Claude writes the script and generates each clip.
        </p>
      </div>
    </div>
  );
}
