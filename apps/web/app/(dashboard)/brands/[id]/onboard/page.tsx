"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Pencil, Check, RefreshCw, Globe, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { BrandSuggestion, ContentTone, VisualStyle, CharacterType, TargetAudienceAge, TargetAudienceVibe } from "@repo/types";
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

// ─── Editable card ────────────────────────────────────────────────────────────

function SuggestionCard({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-sm text-[var(--text-primary)]">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-border)] hover:text-[var(--text-primary)]"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
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
}: {
  label: string;
  value: T;
  options?: { value: T; label: string }[];
  isTextarea?: boolean;
  onSave: (v: T) => void;
  onCancel: () => void;
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
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Check className="h-3 w-3" /> Save
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Phase = "url-input" | "loading" | "suggestion";

export default function BrandOnboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [phase, setPhase] = useState<Phase>("url-input");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteAnalyzed, setWebsiteAnalyzed] = useState(false);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [channel, setChannel] = useState<{ pageName: string; pageAvatarUrl: string | null; platform: string } | null>(null);
  const [suggestion, setSuggestion] = useState<BrandSuggestion | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(SubtitleStyle.BoldPop);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAndSuggest = useCallback(async (feedbackText?: string) => {
    const brandResult = await withToast(() => api.brands.get(id), "Failed to load brand");
    if (brandResult?.data?.channels?.[0]) {
      const ch = brandResult.data.channels[0];
      setChannel({ pageName: ch.pageName, pageAvatarUrl: ch.pageAvatarUrl, platform: ch.platform });
    }
    if (brandResult?.data?.subtitleStyle) {
      setSubtitleStyle(brandResult.data.subtitleStyle);
    }

    const suggestResult = await withToast(
      () => api.brands.suggest(id, feedbackText),
      "Failed to generate suggestions"
    );
    if (suggestResult?.data) {
      setSuggestion(suggestResult.data);
    }
    setPhase("suggestion");
    setRegenerating(false);
  }, [api, id]);

  async function handleContinue() {
    setPhase("loading");

    if (websiteUrl.trim()) {
      setAnalyzingWebsite(true);
      const result = await withToast(
        () => api.brands.ingestWebsite(id, websiteUrl.trim()),
        "Could not analyze website — continuing without it"
      );
      if (result?.data) {
        setWebsiteAnalyzed(true);
        toast.success("Website analyzed — Claude will use it for your brand profile.");
      }
      setAnalyzingWebsite(false);
    }

    await loadAndSuggest();
  }

  function updateField<K extends keyof BrandSuggestion>(key: K, value: BrandSuggestion[K]) {
    setSuggestion((prev) => prev ? { ...prev, [key]: value } : prev);
    setEditingField(null);
  }

  async function handleRegenerate() {
    if (!feedback.trim()) return;
    setRegenerating(true);
    await loadAndSuggest(feedback.trim());
    setFeedback("");
  }

  async function handleConfirm() {
    if (!suggestion) return;
    setSaving(true);

    const result = await withToast(
      () => api.brands.update(id, {
        name: channel?.pageName ?? suggestion.niche,
        niche: suggestion.niche,
        nicheDescription: suggestion.nicheDescription,
        tone: suggestion.tone as ContentTone,
        visualStyle: suggestion.visualStyle as VisualStyle,
        characterType: suggestion.characterType as CharacterType,
        characterDescription: suggestion.characterDescription || undefined,
        targetAudienceAge: suggestion.targetAudienceAge as TargetAudienceAge,
        targetAudienceVibe: suggestion.targetAudienceVibe as TargetAudienceVibe,
        primaryColor: suggestion.primaryColor,
        secondaryColor: suggestion.secondaryColor,
        subtitleStyle,
      }),
      "Failed to save brand profile"
    );

    if (!result) { setSaving(false); return; }

    toast.success("Brand profile saved!");

    if (suggestion.characterType !== "none") {
      router.push(`/brands/${id}/character-sheet`);
    } else {
      await withToast(() => api.brands.completeOnboarding(id), "Failed to complete onboarding");
      router.push(`/brands/${id}/plan/new`);
    }
  }

  // ── URL input phase ────────────────────────────────────────────────────────

  if (phase === "url-input") {
    const trimmed = websiteUrl.trim();
    const isValidUrl = trimmed === "" || (() => {
      try {
        const u = new URL(trimmed);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    })();
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Add your website</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Claude will read your site to build a more accurate brand profile — specific products, offers, and tone, not generic guesses. Optional, but recommended.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleContinue(); }}
              placeholder="https://yourbusiness.com"
              className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          {trimmed && !isValidUrl && (
            <p className="mt-1.5 text-xs text-[var(--accent-danger)]">Enter a valid URL starting with https:// or http://</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            We read your homepage or about page — nothing is stored except the extracted brand summary.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => { setWebsiteUrl(""); void handleContinue(); }}
            className="flex-shrink-0 rounded-lg border border-[var(--bg-border)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            Skip
          </button>
          <Button
            onClick={() => void handleContinue()}
            disabled={!isValidUrl}
            className="flex-1 gap-2"
          >
            {trimmed ? "Analyze & Continue" : "Continue"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading phase ──────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        <p className="text-sm text-[var(--text-muted)]">
          {analyzingWebsite
            ? "Reading your website…"
            : channel
              ? "Claude is analysing your channel…"
              : "Claude is building your brand profile…"}
        </p>
      </div>
    );
  }

  // ── Suggestion not loaded yet ──────────────────────────────────────────────

  if (!suggestion) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Failed to generate suggestions.{" "}
        <button type="button" className="underline" onClick={() => { setPhase("loading"); void loadAndSuggest(); }}>
          Try again
        </button>
      </div>
    );
  }

  // ── Suggestion phase ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {/* Channel header */}
      {channel && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
          {channel.pageAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.pageAvatarUrl} alt={channel.pageName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-border)]">
              <Globe className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{channel.pageName}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{channel.platform}</p>
          </div>
          {websiteAnalyzed && (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 px-2.5 py-1">
              <ExternalLink className="h-3 w-3 text-[var(--accent-success)]" />
              <span className="text-[10px] font-semibold text-[var(--accent-success)]">Website analyzed</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {channel ? "Claude analysed your channel" : "Claude built your brand profile"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{suggestion.reasoning}</p>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-2">
        {editingField === "niche" ? (
          <FieldEditor label="Niche" value={suggestion.niche} onSave={(v) => updateField("niche", v)} onCancel={() => setEditingField(null)} />
        ) : (
          <SuggestionCard label="Niche" value={`${suggestion.niche} — ${suggestion.nicheDescription}`} onEdit={() => setEditingField("niche")} />
        )}

        {editingField === "tone" ? (
          <FieldEditor
            label="Tone"
            value={suggestion.tone}
            options={(Object.entries(TONE_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as ContentTone, label: l }))}
            onSave={(v) => updateField("tone", v as ContentTone)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <SuggestionCard label="Tone" value={TONE_LABEL[suggestion.tone] ?? suggestion.tone} onEdit={() => setEditingField("tone")} />
        )}

        {editingField === "audience" ? (
          <FieldEditor
            label="Audience age"
            value={suggestion.targetAudienceAge}
            options={(Object.entries(AGE_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as TargetAudienceAge, label: l }))}
            onSave={(v) => { updateField("targetAudienceAge", v as TargetAudienceAge); }}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <SuggestionCard
            label="Audience"
            value={`${AGE_LABEL[suggestion.targetAudienceAge] ?? suggestion.targetAudienceAge} · ${VIBE_LABEL[suggestion.targetAudienceVibe] ?? suggestion.targetAudienceVibe}`}
            onEdit={() => setEditingField("audience")}
          />
        )}

        {editingField === "visualStyle" ? (
          <FieldEditor
            label="Visual style"
            value={suggestion.visualStyle}
            options={(Object.entries(VISUAL_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as VisualStyle, label: l }))}
            onSave={(v) => updateField("visualStyle", v as VisualStyle)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <SuggestionCard label="Visual style" value={VISUAL_LABEL[suggestion.visualStyle] ?? suggestion.visualStyle} onEdit={() => setEditingField("visualStyle")} />
        )}

        {editingField === "characterType" ? (
          <FieldEditor
            label="Character"
            value={suggestion.characterType}
            options={(Object.entries(CHARACTER_LABEL) as [string, string][]).map(([v, l]) => ({ value: v as CharacterType, label: l }))}
            onSave={(v) => updateField("characterType", v as CharacterType)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <SuggestionCard label="Character" value={CHARACTER_LABEL[suggestion.characterType] ?? suggestion.characterType} onEdit={() => setEditingField("characterType")} />
        )}

        {suggestion.characterType !== "none" && (
          editingField === "characterDescription" ? (
            <FieldEditor
              label="Character description"
              value={suggestion.characterDescription}
              isTextarea
              onSave={(v) => updateField("characterDescription", v)}
              onCancel={() => setEditingField(null)}
            />
          ) : (
            <SuggestionCard label="Character description" value={suggestion.characterDescription} onEdit={() => setEditingField("characterDescription")} />
          )
        )}

        <div className="flex items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
          <div className="flex gap-2">
            <div
              className="h-6 w-6 rounded-full border border-[var(--bg-border)]"
              style={{ background: suggestion.primaryColor }}
              title="Primary color"
            />
            <div
              className="h-6 w-6 rounded-full border border-[var(--bg-border)]"
              style={{ background: suggestion.secondaryColor }}
              title="Secondary color"
            />
          </div>
          <p className="flex-1 text-xs text-[var(--text-muted)]">
            {suggestion.primaryColor} · {suggestion.secondaryColor}
          </p>
        </div>
      </div>

      {/* Subtitle style picker */}
      <div className="mt-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Subtitle style
        </p>
        <div className="grid grid-cols-1 gap-2">
          {SUBTITLE_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSubtitleStyle(s.value)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                subtitleStyle === s.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                  : "border-[var(--bg-border)] hover:border-[var(--accent-primary)]/40"
              }`}
            >
              <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                subtitleStyle === s.value
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                  : "border-[var(--text-muted)]"
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${subtitleStyle === s.value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {s.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{s.description}</p>
              </div>
              <SubtitlePreview style={s.value} />
            </button>
          ))}
        </div>
      </div>

      {/* Ask Claude to change */}
      <div className="mt-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
          Ask Claude to change something
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && feedback.trim()) void handleRegenerate(); }}
            placeholder='e.g. "Make the character more playful" or "Change tone to humorous"'
            className="flex-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={!feedback.trim() || regenerating}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/50 disabled:opacity-40"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div className="mt-6">
        <Button
          onClick={() => void handleConfirm()}
          disabled={saving || !!editingField}
          loading={saving}
          className="w-full gap-2"
        >
          Looks good
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          {suggestion.characterType !== "none"
            ? "Next: generate your character sheet"
            : "Next: create your first content plan"}
        </p>
      </div>
    </div>
  );
}
