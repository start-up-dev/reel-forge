"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Plus,
  CalendarDays,
  Pencil,
  Check,
  ChevronRight,
  UserSquare2,
  Globe,
  Plug,
  RefreshCw,
  Trash2,
  Sparkles,
  ImageIcon,
  Film,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type {
  BrandProfile,
  ContentPlan,
  ContentTone,
  VisualStyle,
  CharacterType,
  TargetAudienceAge,
} from "@repo/types";
import { SubtitleStyle } from "@repo/types";
import { SubtitlePreview } from "@/components/dashboard/subtitle-preview";
import { useApiClient, withToast } from "@/lib/api-client";

// ─── Display maps ─────────────────────────────────────────────────────────────

const TONE_LABEL: Record<string, string> = {
  energetic: "Energetic & Hype",
  calm: "Calm & Educational",
  witty: "Witty & Funny",
  inspirational: "Inspirational",
  professional: "Professional",
  dramatic: "Dramatic & Intense",
};

const VISUAL_LABEL: Record<string, string> = {
  realistic: "Realistic",
  anime: "Anime",
  "3d_animation": "3D Animation",
  cartoon: "Cartoon",
  cinematic: "Cinematic",
  minimalist: "Minimalist",
};

const CHARACTER_LABEL: Record<string, string> = {
  human: "Human Presenter",
  mascot: "Brand Mascot",
  abstract: "Abstract Character",
  none: "No Character",
};

const AGE_LABEL: Record<string, string> = {
  gen_z: "Gen Z (16–25)",
  millennial: "Millennials (25–40)",
  gen_x: "Gen X (40–55)",
  all: "All ages",
};

const VIBE_LABEL: Record<string, string> = {
  entertainment: "Entertainment",
  education: "Education",
  inspiration: "Inspiration",
  humor: "Humor",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:      { label: "Draft",      className: "bg-[var(--bg-border)] text-[var(--text-muted)]" },
  approved:   { label: "Approved",   className: "bg-blue-500/15 text-blue-400" },
  generating: { label: "Generating", className: "bg-amber-500/15 text-amber-400" },
  complete:   { label: "Complete",   className: "bg-[var(--accent-success)]/15 text-[var(--accent-success)]" },
};

const MAX_CHARACTER_GENERATIONS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekOf(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function PlanStatusDot({ status }: { status: string }) {
  if (status === "generating") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
      </span>
    );
  }
  return null;
}

// ─── Identity card (label + value + edit icon) ────────────────────────────────

function IdentityCard({
  label,
  value,
  onEdit,
  extra,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-sm text-[var(--text-primary)]">{value}</p>
        {extra}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Inline field editor ──────────────────────────────────────────────────────

function FieldEditor<T extends string>({
  label,
  value,
  options,
  isTextarea,
  onSave,
  onCancel,
  saving,
}: {
  label: string;
  value: T;
  options?: { value: T; label: string }[];
  isTextarea?: boolean;
  onSave: (v: T) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-elevated)] px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
        {label}
      </p>
      {options ? (
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDraft(opt.value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                draft === opt.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                  : "border-[var(--bg-border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : isTextarea ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value as T)}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value as T)}
          className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Color editor (two color pickers) ─────────────────────────────────────────

function ColorEditor({
  primary,
  secondary,
  onSave,
  onCancel,
  saving,
}: {
  primary: string;
  secondary: string;
  onSave: (p: string, s: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [p, setP] = useState(primary || "#f55c2a");
  const [s, setS] = useState(secondary || "#4a90e2");
  return (
    <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-elevated)] px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
        Brand colors
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">Primary</label>
          <div className="flex items-center gap-2">
            <input type="color" value={p} onChange={(e) => setP(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border border-[var(--bg-border)] bg-transparent p-1" />
            <input type="text" value={p} onChange={(e) => setP(e.target.value)} className="flex-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">Secondary</label>
          <div className="flex items-center gap-2">
            <input type="color" value={s} onChange={(e) => setS(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border border-[var(--bg-border)] bg-transparent p-1" />
            <input type="text" value={s} onChange={(e) => setS(e.target.value)} className="flex-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(p, s)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Subtitle style picker ────────────────────────────────────────────────────

const SUBTITLE_STYLES: { value: SubtitleStyle; label: string; description: string }[] = [
  { value: SubtitleStyle.BoldPop,          label: "Bold Pop",          description: "Single word, big white caps with black outline" },
  { value: SubtitleStyle.WordHighlight,    label: "Word Highlight",    description: "Single word, orange-outlined for emphasis" },
  { value: SubtitleStyle.GroupedBold,      label: "Grouped Bold",      description: "3-word groups, bold and punchy" },
  { value: SubtitleStyle.Karaoke,          label: "Karaoke",           description: "3-word groups, active word glows orange" },
  { value: SubtitleStyle.NeonGlow,         label: "Neon Glow",         description: "Single word, wide orange bloom effect" },
  { value: SubtitleStyle.OversizedPop,     label: "Oversized Pop",     description: "Huge single word, mid-screen placement" },
  { value: SubtitleStyle.Minimal,          label: "Minimal",           description: "5-word groups, small clean font, no shadow" },
  { value: SubtitleStyle.Cinematic,        label: "Cinematic",         description: "4-word groups, warm white italic, soft shadow" },
  { value: SubtitleStyle.GroupedCinematic, label: "Grouped Cinematic", description: "4-word groups, slim warm italic near the bottom" },
];

const SUBTITLE_LABEL: Record<string, string> = Object.fromEntries(
  SUBTITLE_STYLES.map((s) => [s.value, s.label]),
);

function SubtitleStyleEditor({
  value,
  onSave,
  onCancel,
  saving,
}: {
  value: SubtitleStyle;
  onSave: (v: SubtitleStyle) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<SubtitleStyle>(value);
  return (
    <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-elevated)] px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
        Subtitle style
      </p>
      <div className="space-y-1.5">
        {SUBTITLE_STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setDraft(s.value)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
              draft === s.value
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                : "border-[var(--bg-border)] hover:border-[var(--accent-primary)]/40"
            }`}
          >
            <div className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 ${
              draft === s.value
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                : "border-[var(--text-muted)]"
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${draft === s.value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {s.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{s.description}</p>
            </div>
            <SubtitlePreview style={s.value} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Character sheet sidebar ──────────────────────────────────────────────────

function CharacterSheetPanel({
  brandId,
  brand,
  characterSheetUrl,
  onUpdated,
}: {
  brandId: string;
  brand: BrandProfile;
  characterSheetUrl: string | null;
  onUpdated: (url: string, generationCount: number) => void;
}) {
  const api = useApiClient();
  const [generating, setGenerating] = useState(false);

  const hasCharacter = brand.characterType !== "none";
  const atLimit = brand.characterSheetGenerationCount >= MAX_CHARACTER_GENERATIONS;

  async function handleRegenerate() {
    setGenerating(true);
    const res = await withToast(
      () => api.brands.generateCharacterSheet(brandId),
      "Failed to regenerate character sheet"
    );
    setGenerating(false);
    if (res?.data) {
      onUpdated(res.data.characterSheetUrl, brand.characterSheetGenerationCount + 1);
      toast.success("Character sheet regenerated");
    }
  }

  if (!hasCharacter) {
    return (
      <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Character</h3>
        </div>
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]">
          <p className="text-xs text-[var(--text-muted)]">No character for this brand</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Character Sheet</h3>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {brand.characterSheetGenerationCount}/{MAX_CHARACTER_GENERATIONS} generated
        </span>
      </div>

      <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
        {characterSheetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={characterSheetUrl} alt="Character sheet" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">No character sheet yet</p>
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <p className="text-xs font-medium text-white">Generating…</p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <Button
          variant="secondary"
          onClick={handleRegenerate}
          disabled={generating || atLimit}
          className="w-full gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {characterSheetUrl ? "Regenerate" : "Generate"}
        </Button>
        {atLimit && (
          <p className="text-[10px] text-[var(--accent-warning)]">
            Maximum regenerations reached. Edit the character description to start fresh.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type EditField =
  | "niche"
  | "tone"
  | "visualStyle"
  | "characterType"
  | "characterDescription"
  | "audience"
  | "colors"
  | "referenceVideoUrl"
  | "websiteUrl"
  | "subtitleStyle"
  | null;

export default function BrandHubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [characterSheetUrl, setCharacterSheetUrl] = useState<string | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);
  const [editingField, setEditingField] = useState<EditField>(null);
  const [savingField, setSavingField] = useState(false);
  const [websiteIngesting, setWebsiteIngesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQuickVideo, setShowQuickVideo] = useState(false);
  const [quickTopic, setQuickTopic] = useState("");
  const [quickVideoType, setQuickVideoType] = useState<"talking" | "action_reel">("talking");
  const [quickDuration, setQuickDuration] = useState(30);
  const [quickCreating, setQuickCreating] = useState(false);

  const load = useCallback(async () => {
    const [brandResult, plansResult] = await Promise.all([
      withToast(() => api.brands.get(id), "Failed to load brand"),
      withToast(() => api.contentPlans.listForBrand(id), "Failed to load plans"),
    ]);
    if (brandResult?.data) {
      const { characterSheetUrl: url, ...profile } = brandResult.data;
      setBrand(profile as BrandProfile);
      setCharacterSheetUrl(url ?? null);
    }
    if (plansResult?.data) setPlans(plansResult.data as ContentPlan[]);
    setLoading(false);
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddChannel() {
    setAddingChannel(true);
    const result = await withToast(() => api.social.authorize(id), "Failed to start Facebook OAuth");
    if (result?.data?.authUrl) {
      window.location.href = result.data.authUrl;
    }
    setAddingChannel(false);
  }

  async function patchBrand(data: Parameters<typeof api.brands.update>[1]) {
    if (!brand) return;
    setSavingField(true);
    const res = await withToast(
      () => api.brands.update(brand.id, data),
      "Failed to save changes"
    );
    setSavingField(false);
    if (res?.data) {
      setBrand((prev) => ({ ...res.data, channels: prev?.channels ?? [] }));
      setEditingField(null);
      toast.success("Saved");
    }
  }

  async function handleWebsiteUpdate(url: string) {
    if (!brand) return;
    setWebsiteIngesting(true);
    const res = await withToast(
      () => api.brands.ingestWebsite(brand.id, url),
      "Failed to analyze website"
    );
    setWebsiteIngesting(false);
    if (res?.data) {
      setBrand((prev) => prev ? { ...prev, websiteUrl: url, websiteContext: res.data.websiteContext } : prev);
      setEditingField(null);
      toast.success("Website analyzed — scripts will now use your brand details");
    }
  }

  async function handleQuickVideo() {
    if (!brand || !quickTopic.trim()) return;
    setQuickCreating(true);
    const res = await withToast(
      () => api.videos.generateSingle({ brandProfileId: brand.id, topic: quickTopic.trim(), videoType: quickVideoType, targetDurationSeconds: quickDuration }),
      "Failed to start video generation"
    );
    setQuickCreating(false);
    if (res?.data) {
      setShowQuickVideo(false);
      setQuickTopic("");
      toast.success("Video generation started!");
      router.push("/library");
    }
  }

  async function handleDeleteBrand() {
    if (!brand) return;
    setDeleting(true);
    const res = await withToast(
      () => api.brands.delete(brand.id),
      "Failed to delete brand"
    );
    setDeleting(false);
    if (res?.data?.ok) {
      toast.success("Brand deleted");
      router.push("/brands");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Brand not found.
      </div>
    );
  }

  const activePlan = plans.find((p) => p.status === "generating" || p.status === "approved");
  const latestPlan = plans[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Brand header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <UserSquare2 className="h-6 w-6 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{brand.name}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {brand.niche}
            {brand.nicheDescription ? ` — ${brand.nicheDescription}` : ""}
          </p>
        </div>
      </div>

      {/* Active generation banner */}
      {activePlan && (
        <button
          type="button"
          onClick={() => router.push(`/brands/${id}/plan/${activePlan.id}`)}
          className="mb-6 block w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left transition-colors hover:bg-amber-500/15"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlanStatusDot status={activePlan.status} />
              <span className="text-sm font-semibold text-amber-400">
                {activePlan.status === "generating" ? "Generation in progress" : "Plan approved"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Week of {formatWeekOf(activePlan.weekStartDate)} · {activePlan.postsPerDay * 7} videos
          </p>
        </button>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── LEFT column ── */}
        <div className="space-y-6 lg:col-span-7">
          {/* Identity */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Brand Identity
            </h2>
            <div className="space-y-2">
              {editingField === "niche" ? (
                <FieldEditor
                  label="Niche description"
                  value={brand.nicheDescription ?? ""}
                  isTextarea
                  onSave={(v) => void patchBrand({ nicheDescription: v })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Niche"
                  value={`${brand.niche}${brand.nicheDescription ? ` — ${brand.nicheDescription}` : ""}`}
                  onEdit={() => setEditingField("niche")}
                />
              )}

              {editingField === "audience" ? (
                <FieldEditor
                  label="Audience age"
                  value={brand.targetAudienceAge ?? "all"}
                  options={(Object.entries(AGE_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as TargetAudienceAge, label: l }))}
                  onSave={(v) => void patchBrand({ targetAudienceAge: v as TargetAudienceAge })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Audience"
                  value={`${AGE_LABEL[brand.targetAudienceAge ?? "all"] ?? "—"} · ${VIBE_LABEL[brand.targetAudienceVibe ?? "entertainment"] ?? "—"}`}
                  onEdit={() => setEditingField("audience")}
                />
              )}

              {editingField === "tone" ? (
                <FieldEditor
                  label="Tone"
                  value={brand.tone}
                  options={(Object.entries(TONE_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as ContentTone, label: l }))}
                  onSave={(v) => void patchBrand({ tone: v as ContentTone })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Tone"
                  value={TONE_LABEL[brand.tone] ?? brand.tone}
                  onEdit={() => setEditingField("tone")}
                />
              )}

              {editingField === "visualStyle" ? (
                <FieldEditor
                  label="Visual style"
                  value={brand.visualStyle}
                  options={(Object.entries(VISUAL_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as VisualStyle, label: l }))}
                  onSave={(v) => void patchBrand({ visualStyle: v as VisualStyle })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Visual style"
                  value={VISUAL_LABEL[brand.visualStyle] ?? brand.visualStyle}
                  onEdit={() => setEditingField("visualStyle")}
                />
              )}

              {editingField === "characterType" ? (
                <FieldEditor
                  label="Character type"
                  value={brand.characterType}
                  options={(Object.entries(CHARACTER_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as CharacterType, label: l }))}
                  onSave={(v) => void patchBrand({ characterType: v as CharacterType })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Character"
                  value={CHARACTER_LABEL[brand.characterType] ?? brand.characterType}
                  onEdit={() => setEditingField("characterType")}
                />
              )}

              {brand.characterType !== "none" && (
                editingField === "characterDescription" ? (
                  <FieldEditor
                    label="Character description"
                    value={brand.characterDescription ?? ""}
                    isTextarea
                    onSave={(v) => void patchBrand({ characterDescription: v })}
                    onCancel={() => setEditingField(null)}
                    saving={savingField}
                  />
                ) : (
                  <IdentityCard
                    label="Character description"
                    value={brand.characterDescription || "—"}
                    onEdit={() => setEditingField("characterDescription")}
                  />
                )
              )}

              {editingField === "colors" ? (
                <ColorEditor
                  primary={brand.primaryColor ?? ""}
                  secondary={brand.secondaryColor ?? ""}
                  onSave={(p, s) => void patchBrand({ primaryColor: p, secondaryColor: s })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Colors"
                  value={`${brand.primaryColor ?? "—"} · ${brand.secondaryColor ?? "—"}`}
                  onEdit={() => setEditingField("colors")}
                  extra={
                    <div className="mt-2 flex gap-2">
                      {brand.primaryColor && (
                        <div
                          className="h-5 w-5 rounded-full border border-[var(--bg-border)]"
                          style={{ background: brand.primaryColor }}
                        />
                      )}
                      {brand.secondaryColor && (
                        <div
                          className="h-5 w-5 rounded-full border border-[var(--bg-border)]"
                          style={{ background: brand.secondaryColor }}
                        />
                      )}
                    </div>
                  }
                />
              )}

              {editingField === "referenceVideoUrl" ? (
                <FieldEditor
                  label="Reference video URL"
                  value={brand.referenceVideoUrl ?? ""}
                  onSave={(v) => void patchBrand({ referenceVideoUrl: v })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Reference video"
                  value={brand.referenceVideoUrl || "—"}
                  onEdit={() => setEditingField("referenceVideoUrl")}
                />
              )}

              {editingField === "websiteUrl" ? (
                <FieldEditor
                  label="Brand website URL"
                  value={brand.websiteUrl ?? ""}
                  onSave={(v) => void handleWebsiteUpdate(v)}
                  onCancel={() => setEditingField(null)}
                  saving={websiteIngesting}
                />
              ) : (
                <IdentityCard
                  label="Website"
                  value={brand.websiteUrl || "—"}
                  onEdit={() => setEditingField("websiteUrl")}
                  extra={
                    brand.websiteContext ? (
                      <p className="mt-1 text-[10px] text-[var(--accent-success)]">
                        Analyzed — scripts reference your real brand details
                      </p>
                    ) : null
                  }
                />
              )}

              {editingField === "subtitleStyle" ? (
                <SubtitleStyleEditor
                  value={brand.subtitleStyle}
                  onSave={(v) => void patchBrand({ subtitleStyle: v })}
                  onCancel={() => setEditingField(null)}
                  saving={savingField}
                />
              ) : (
                <IdentityCard
                  label="Subtitle style"
                  value={SUBTITLE_LABEL[brand.subtitleStyle] ?? brand.subtitleStyle}
                  onEdit={() => setEditingField("subtitleStyle")}
                />
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <Link
                href={`/brands/${id}/onboard`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Re-run Claude analysis
              </Link>
            </div>
          </section>

          {/* Channels */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Channels
              </h2>
              <button
                type="button"
                onClick={() => void handleAddChannel()}
                disabled={addingChannel}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {addingChannel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Add Channel
              </button>
            </div>
            {brand.channels && brand.channels.length > 0 ? (
              <ul className="space-y-2">
                {brand.channels.map((ch) => (
                  <li key={ch.id} className="flex items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2.5">
                    {ch.pageAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ch.pageAvatarUrl} alt={ch.pageName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-border)]">
                        <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{ch.pageName}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[var(--accent-secondary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-secondary)]">
                      {ch.platform}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--bg-border)] px-4 py-4 text-center">
                <p className="text-xs text-[var(--text-muted)]">No channels connected yet.</p>
              </div>
            )}
          </section>

          {/* Content Plans */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Content Plans
              </h2>
              {brand.onboardingComplete && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickVideo(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 px-2.5 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
                  >
                    <Film className="h-3.5 w-3.5" />
                    Create Video
                  </button>
                  <Button asChild variant="secondary" className="h-8 gap-1.5 px-3 text-xs">
                    <Link href={`/brands/${id}/plan/new`}>
                      <Plus className="h-3.5 w-3.5" />
                      New Plan
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {plans.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--bg-border)] py-10 text-center">
                <CalendarDays className="h-8 w-8 text-[var(--text-muted)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">No content plans yet</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {brand.onboardingComplete
                      ? "Create your first week plan to start generating videos."
                      : "Complete brand setup before creating a content plan."}
                  </p>
                </div>
                {brand.onboardingComplete ? (
                  <Button asChild>
                    <Link href={`/brands/${id}/plan/new`}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Create Week Plan
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary">
                    <Link href={`/brands/${id}/character-sheet`}>Complete Setup</Link>
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {plans.map((plan) => {
                  const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE["draft"]!;
                  const isActive = plan.status === "generating" || plan.status === "approved";
                  return (
                    <li key={plan.id}>
                      <Link
                        href={`/brands/${id}/plan/${plan.id}`}
                        className="flex items-center gap-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-5 py-4 transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)]"
                      >
                        <CalendarDays className={`h-5 w-5 shrink-0 ${isActive ? "text-amber-400" : "text-[var(--text-muted)]"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Week of {formatWeekOf(plan.weekStartDate)}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {plan.postsPerDay} post{plan.postsPerDay > 1 ? "s" : ""}/day · {plan.postsPerDay * 7} videos
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isActive && <PlanStatusDot status={plan.status} />}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
                            {badge.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {latestPlan?.status === "complete" && !activePlan && (
              <div className="mt-4">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/library?plan=${latestPlan.id}`}>
                    View Videos from Latest Plan
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT column ── */}
        <div className="space-y-6 lg:col-span-5">
          <div className="lg:sticky lg:top-6 space-y-6">
            <CharacterSheetPanel
              brandId={id}
              brand={brand}
              characterSheetUrl={characterSheetUrl}
              onUpdated={(url, count) => {
                setCharacterSheetUrl(url);
                setBrand((prev) => prev ? { ...prev, characterSheetGenerationCount: count } : prev);
              }}
            />

            {/* Danger zone */}
            <div className="rounded-2xl border border-[var(--accent-danger)]/20 bg-[var(--bg-surface)] p-5">
              <h3 className="mb-1 text-sm font-semibold text-[var(--accent-danger)]">Danger Zone</h3>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Permanently delete this brand and all associated content plans, videos, and channel connections.
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-lg border border-[var(--accent-danger)]/30 px-3 py-2 text-xs font-medium text-[var(--accent-danger)] transition-colors hover:bg-[var(--accent-danger)]/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete brand
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick video modal */}
      {showQuickVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Create Single Video</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickVideo(false)}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Topic
                </label>
                <textarea
                  value={quickTopic}
                  onChange={(e) => setQuickTopic(e.target.value)}
                  placeholder="e.g. 5 morning habits that changed my life"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Video type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["talking", "action_reel"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuickVideoType(type)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        quickVideoType === type
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                          : "border-[var(--bg-border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                      }`}
                    >
                      <span className="block font-medium">{type === "talking" ? "Talking Head" : "Action Reel"}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {type === "talking" ? "Character speaks to camera" : "Dynamic visual scenes"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Duration
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setQuickDuration(d)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                        quickDuration === d
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "border-[var(--bg-border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuickVideo(false)}
                disabled={quickCreating}
                className="rounded-xl px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleQuickVideo()}
                disabled={quickCreating || !quickTopic.trim()}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {quickCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {quickCreating ? "Starting…" : "Generate Video"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
        title="Delete brand profile?"
        description="This permanently deletes the brand and all associated content plans, videos, and channel connections. This cannot be undone."
        confirmLabel="Delete brand"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteBrand}
      />
    </div>
  );
}
