"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Pencil, RefreshCw, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { ContentPlan, ContentFormat, PostType, TopicEntry } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FORMAT_BADGE: Record<ContentFormat, { label: string; className: string }> = {
  ugc: { label: "UGC", className: "bg-blue-500/15 text-blue-400" },
  montage: { label: "Montage", className: "bg-purple-500/15 text-purple-400" },
  tutorial: { label: "Tutorial", className: "bg-emerald-500/15 text-emerald-400" },
  story: { label: "Story", className: "bg-amber-500/15 text-amber-400" },
};

const FORMAT_OPTIONS: ContentFormat[] = ["ugc", "montage", "tutorial", "story"];

interface OverridePanel {
  topic: TopicEntry;
  topicIndex: number;
}

function TopicCard({
  topic,
  onEdit,
}: {
  topic: TopicEntry;
  onEdit: () => void;
}) {
  const badge = FORMAT_BADGE[topic.format as ContentFormat] ?? FORMAT_BADGE.ugc;

  return (
    <div className="relative rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
      {topic.overridden && (
        <span className="absolute right-2 top-2 rounded-full bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
          edited
        </span>
      )}
      <p className="mb-1 pr-12 text-xs font-semibold leading-snug text-[var(--text-primary)]">
        {topic.title}
      </p>
      <p className="mb-2 line-clamp-2 text-[11px] italic text-[var(--text-muted)]">
        {topic.hook}
      </p>
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          aria-label="Edit topic"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function OverridePanelDrawer({
  panel,
  onClose,
  onSave,
  saving,
}: {
  panel: OverridePanel;
  onClose: () => void;
  onSave: (index: number, data: Partial<TopicEntry>) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(panel.topic.title);
  const [hook, setHook] = useState(panel.topic.hook);
  const [format, setFormat] = useState<ContentFormat>(panel.topic.format as ContentFormat);
  const [angle, setAngle] = useState(panel.topic.angle);
  const [scriptOutline, setScriptOutline] = useState(panel.topic.scriptOutline);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit Topic</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Hook</span>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ContentFormat)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_BADGE[f].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Angle</span>
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-muted)]">Script Outline</span>
          <textarea
            value={scriptOutline}
            onChange={(e) => setScriptOutline(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </label>
      </div>
      <div className="border-t border-[var(--bg-border)] px-5 py-4">
        <Button
          onClick={() =>
            onSave(panel.topicIndex, { title, hook, format, angle, scriptOutline })
          }
          disabled={saving}
          className="w-full"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Override"}
        </Button>
      </div>
    </div>
  );
}

export default function ContentPlanPage() {
  const { id: brandId, planId } = useParams<{ id: string; planId: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [overridePanel, setOverridePanel] = useState<OverridePanel | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [postType, setPostType] = useState<PostType>("draft");

  const loadPlan = useCallback(async () => {
    const result = await withToast(() => api.contentPlans.get(planId), "Failed to load plan");
    if (result?.data) setPlan(result.data as ContentPlan);
    setLoading(false);
  }, [api, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await withToast(
      () => api.contentPlans.regenerate(planId),
      "Regeneration failed"
    );
    if (result?.data) {
      setPlan(result.data);
      toast.success("Plan regenerated");
    }
    setRegenerating(false);
  }

  async function handleSaveOverride(index: number, data: Partial<TopicEntry>) {
    setSavingOverride(true);
    const result = await withToast(
      () => api.contentPlans.overrideTopic(planId, index, data as Parameters<typeof api.contentPlans.overrideTopic>[2]),
      "Failed to save override"
    );
    if (result?.data) {
      setPlan(result.data);
      toast.success("Override saved");
      setOverridePanel(null);
    }
    setSavingOverride(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = await withToast(
      () => api.contentPlans.approve(planId, { postType }),
      "Failed to approve plan"
    );
    if (result?.data?.ok) {
      toast.success("Plan approved — generation starting");
      router.push(`/brands/${brandId}/plan/${planId}/progress`);
    }
    setApproving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Content plan not found.
      </div>
    );
  }

  const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
  const postsPerDay = plan.postsPerDay;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {overridePanel && (
        <OverridePanelDrawer
          panel={overridePanel}
          onClose={() => setOverridePanel(null)}
          onSave={handleSaveOverride}
          saving={savingOverride}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Week Plan</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Week of {plan.weekStartDate} &middot; {postsPerDay} post{postsPerDay > 1 ? "s" : ""}/day &middot; {topics.length} videos
          </p>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={regenerating || plan.status !== "draft"}
          className="gap-2"
          variant="secondary"
        >
          {regenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerate Plan
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="mb-2 grid gap-2" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
            {DAYS.map((day) => (
              <div
                key={day}
                className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Slot rows */}
          {Array.from({ length: postsPerDay }, (_, slotIdx) => (
            <div
              key={slotIdx}
              className="mb-2 grid gap-2"
              style={{ gridTemplateColumns: `repeat(7, 1fr)` }}
            >
              {DAYS.map((_, dayIdx) => {
                const dayNumber = dayIdx + 1;
                const topic = topics.find(
                  (t) => t.day === dayNumber && t.slot === slotIdx + 1
                );
                if (!topic) {
                  return (
                    <div
                      key={dayIdx}
                      className="rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/50 p-3 min-h-[100px]"
                    />
                  );
                }
                return (
                  <TopicCard
                    key={dayIdx}
                    topic={topic}
                    onEdit={() =>
                      setOverridePanel({ topic, topicIndex: topic.index })
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Approve CTA */}
      {plan.status === "draft" && (
        <div className="mt-8 space-y-4">
          {/* Posting preference */}
          <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Facebook posting
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  { value: "draft", label: "Save as Drafts", description: "Posts created as Facebook drafts — publish manually" },
                  { value: "scheduled", label: "Schedule Automatically", description: "Posts scheduled at optimal time slots" },
                  { value: "manual", label: "Download Only", description: "No Facebook posting — download videos yourself" },
                ] as { value: PostType; label: string; description: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPostType(opt.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    postType === opt.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                      : "border-[var(--bg-border)] hover:border-[var(--accent-primary)]/50"
                  }`}
                >
                  <p className={`text-xs font-semibold ${postType === opt.value ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleApprove}
            disabled={approving}
            className="w-full gap-2 py-3 text-base"
          >
            {approving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            Start Generating &rarr;
          </Button>
        </div>
      )}

      {plan.status !== "draft" && (
        <div className="mt-8 rounded-xl border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/10 px-5 py-4 text-center text-sm font-medium text-[var(--accent-success)]">
          Plan approved &mdash; videos are being generated.
        </div>
      )}
    </div>
  );
}
