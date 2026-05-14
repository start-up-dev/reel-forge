"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { BrandProfile, CharacterType, ContentTone, TargetAudienceAge, TargetAudienceVibe, VisualStyle } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

// ─── Step data ────────────────────────────────────────────────────────────────

const NICHE_CATEGORIES = [
  "Fitness", "Finance", "Beauty", "Gaming", "Food",
  "Business", "Education", "Entertainment", "Lifestyle", "Other",
];

const AUDIENCE_AGE_OPTIONS: { value: TargetAudienceAge; label: string; sub: string }[] = [
  { value: "gen_z", label: "Gen Z", sub: "16–25" },
  { value: "millennial", label: "Millennials", sub: "25–40" },
  { value: "gen_x", label: "Gen X", sub: "40–55" },
  { value: "all", label: "All ages", sub: "Everyone" },
];

const AUDIENCE_VIBE_OPTIONS: { value: TargetAudienceVibe; label: string }[] = [
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "inspiration", label: "Inspiration" },
  { value: "humor", label: "Humor" },
];

const TONE_OPTIONS: { value: ContentTone; label: string; desc: string; emoji: string }[] = [
  { value: "energetic", label: "Energetic & Hype", desc: "High energy, fast-paced, exciting", emoji: "⚡" },
  { value: "calm", label: "Calm & Educational", desc: "Relaxed, informative, trustworthy", emoji: "🧘" },
  { value: "witty", label: "Witty & Funny", desc: "Clever humor, light-hearted, fun", emoji: "😄" },
  { value: "inspirational", label: "Inspirational", desc: "Uplifting, motivating, heartfelt", emoji: "✨" },
  { value: "professional", label: "Professional", desc: "Polished, credible, authoritative", emoji: "💼" },
  { value: "dramatic", label: "Dramatic & Intense", desc: "Bold, cinematic, attention-grabbing", emoji: "🎬" },
];

const VISUAL_STYLE_OPTIONS: { value: VisualStyle; label: string; tag: string }[] = [
  { value: "realistic", label: "Realistic", tag: "Photo-real" },
  { value: "anime", label: "Anime", tag: "Japanese animation" },
  { value: "3d_animation", label: "3D Animation", tag: "Pixar-style" },
  { value: "cartoon", label: "Cartoon", tag: "2D animated" },
  { value: "cinematic", label: "Cinematic", tag: "Film-quality" },
  { value: "minimalist", label: "Minimalist", tag: "Clean & simple" },
];

const CHARACTER_TYPE_OPTIONS: { value: CharacterType; label: string; desc: string }[] = [
  { value: "human", label: "Human Presenter", desc: "A realistic or stylized human character" },
  { value: "mascot", label: "Brand Mascot", desc: "A unique character that represents your brand" },
  { value: "abstract", label: "Abstract Character", desc: "A non-human stylized character" },
  { value: "none", label: "No Character", desc: "Scenes without a recurring character" },
];

const TOTAL_STEPS = 7;

interface WizardData {
  nicheCategory: string;
  nicheDescription: string;
  targetAudienceAge: TargetAudienceAge | null;
  targetAudienceVibe: TargetAudienceVibe | null;
  tone: ContentTone | null;
  visualStyle: VisualStyle | null;
  characterType: CharacterType | null;
  characterDescription: string;
  primaryColor: string;
  secondaryColor: string;
  referenceVideoUrl: string;
  name: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Step {step} of {TOTAL_STEPS}
      </p>
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
          : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-elevated)]"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
          <Check className="h-3 w-3 text-white" />
        </span>
      )}
      {children}
    </button>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8 flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all ${
            i < step ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Individual steps ─────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div>
      <StepHeader step={1} title="What's your niche?" subtitle="Pick the category that best describes your content." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NICHE_CATEGORIES.map((cat) => (
          <OptionCard key={cat} selected={data.nicheCategory === cat} onClick={() => onChange({ nicheCategory: cat })}>
            <span className="text-sm font-medium">{cat}</span>
          </OptionCard>
        ))}
      </div>
      {data.nicheCategory && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Describe your specific niche</label>
          <input
            type="text"
            value={data.nicheDescription}
            onChange={(e) => onChange({ nicheDescription: e.target.value })}
            placeholder={`e.g. "Beginner home workouts without equipment"`}
            className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function Step2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div>
      <StepHeader step={2} title="Who's your audience?" subtitle="Tell us about the people you're creating content for." />
      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Age group</p>
        <div className="grid grid-cols-2 gap-3">
          {AUDIENCE_AGE_OPTIONS.map((opt) => (
            <OptionCard key={opt.value} selected={data.targetAudienceAge === opt.value} onClick={() => onChange({ targetAudienceAge: opt.value })}>
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{opt.sub}</p>
            </OptionCard>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Content vibe</p>
        <div className="grid grid-cols-2 gap-3">
          {AUDIENCE_VIBE_OPTIONS.map((opt) => (
            <OptionCard key={opt.value} selected={data.targetAudienceVibe === opt.value} onClick={() => onChange({ targetAudienceVibe: opt.value })}>
              <p className="text-sm font-semibold">{opt.label}</p>
            </OptionCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div>
      <StepHeader step={3} title="Brand tone" subtitle="How should your content feel?" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TONE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={data.tone === opt.value} onClick={() => onChange({ tone: opt.value })}>
            <p className="mb-1 text-xl">{opt.emoji}</p>
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{opt.desc}</p>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function Step4({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div>
      <StepHeader step={4} title="Visual style" subtitle="Choose the art style for your videos." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VISUAL_STYLE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={data.visualStyle === opt.value} onClick={() => onChange({ visualStyle: opt.value })}>
            <p className="text-sm font-semibold">{opt.label}</p>
            <span className="mt-1 inline-block rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {opt.tag}
            </span>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function Step5({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const showDescription = data.characterType === "human" || data.characterType === "mascot";
  return (
    <div>
      <StepHeader step={5} title="Your character" subtitle="Will your brand have a recurring character?" />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHARACTER_TYPE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={data.characterType === opt.value} onClick={() => onChange({ characterType: opt.value })}>
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{opt.desc}</p>
          </OptionCard>
        ))}
      </div>
      {showDescription && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Describe your character&apos;s appearance
          </label>
          <textarea
            value={data.characterDescription}
            onChange={(e) => onChange({ characterDescription: e.target.value })}
            rows={3}
            placeholder="Skin tone, hair color, outfit, distinctive features, personality traits…"
            className="w-full resize-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function Step6({
  data,
  onChange,
  brandId,
}: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  brandId: string;
}) {
  const api = useApiClient();
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(file: File) {
    const ct = file.type as "image/jpeg" | "image/png" | "image/webp";
    setUploading(true);
    const res = await withToast(() => api.brands.logoUploadUrl(brandId, ct), "Failed to get upload URL");
    if (!res?.data) { setUploading(false); return; }
    try {
      await fetch(res.data.uploadUrl, { method: "PUT", headers: { "Content-Type": ct }, body: file });
      await withToast(() => api.brands.update(brandId, { logoGcsPath: res.data.gcsPath }), "Failed to save logo");
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <StepHeader step={6} title="Brand colors (optional)" subtitle="Add your brand colors and logo." />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Primary color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={data.primaryColor || "#f55c2a"} onChange={(e) => onChange({ primaryColor: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--bg-border)] bg-transparent p-1" />
              <input type="text" value={data.primaryColor} onChange={(e) => onChange({ primaryColor: e.target.value })} placeholder="#f55c2a" className="flex-1 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Secondary color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={data.secondaryColor || "#4a90e2"} onChange={(e) => onChange({ secondaryColor: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--bg-border)] bg-transparent p-1" />
              <input type="text" value={data.secondaryColor} onChange={(e) => onChange({ secondaryColor: e.target.value })} placeholder="#4a90e2" className="flex-1 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none" />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Logo (PNG/JPG, max 5 MB)</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--bg-border)] px-4 py-3 transition-colors hover:border-[var(--accent-primary)]/50">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" /> : <span className="text-sm text-[var(--text-muted)]">Click to upload logo…</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleLogoUpload(file); }} />
          </label>
        </div>
      </div>
    </div>
  );
}

function Step7({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const TONE_LABEL: Record<string, string> = { energetic: "Energetic & Hype", calm: "Calm & Educational", witty: "Witty & Funny", inspirational: "Inspirational", professional: "Professional", dramatic: "Dramatic & Intense" };
  const VISUAL_LABEL: Record<string, string> = { realistic: "Realistic", anime: "Anime", "3d_animation": "3D Animation", cartoon: "Cartoon", cinematic: "Cinematic", minimalist: "Minimalist" };
  const CHAR_LABEL: Record<string, string> = { human: "Human Presenter", mascot: "Brand Mascot", abstract: "Abstract Character", none: "No Character" };
  const rows = [
    { label: "Niche", value: data.nicheCategory + (data.nicheDescription ? ` — ${data.nicheDescription}` : "") },
    { label: "Audience", value: `${data.targetAudienceAge ?? "—"} · ${data.targetAudienceVibe ?? "—"}` },
    { label: "Tone", value: data.tone ? TONE_LABEL[data.tone] : "—" },
    { label: "Visual style", value: data.visualStyle ? VISUAL_LABEL[data.visualStyle] : "—" },
    { label: "Character", value: data.characterType ? CHAR_LABEL[data.characterType] : "—" },
  ];
  return (
    <div>
      <StepHeader step={7} title="Review & name your brand" subtitle="Everything look right? Save your changes." />
      <div className="mb-6 divide-y divide-[var(--bg-border)] rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{row.label}</span>
            <span className="text-right text-xs text-[var(--text-primary)]">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          Brand name <span className="text-[var(--accent-danger)]">*</span>
        </label>
        <input type="text" value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder='e.g. "My Fitness Channel"' className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Reference video URL (optional)</label>
        <input type="text" value={data.referenceVideoUrl} onChange={(e) => onChange({ referenceVideoUrl: e.target.value })} placeholder="Paste a TikTok or Reels URL you love the vibe of…" className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
    </div>
  );
}

// ─── Main edit page ───────────────────────────────────────────────────────────

function brandToWizardData(brand: BrandProfile): WizardData {
  return {
    nicheCategory: NICHE_CATEGORIES.includes(brand.niche) ? brand.niche : "Other",
    nicheDescription: brand.nicheDescription ?? "",
    targetAudienceAge: brand.targetAudienceAge ?? null,
    targetAudienceVibe: brand.targetAudienceVibe ?? null,
    tone: brand.tone as ContentTone,
    visualStyle: brand.visualStyle as VisualStyle,
    characterType: brand.characterType as CharacterType,
    characterDescription: brand.characterDescription ?? "",
    primaryColor: brand.primaryColor ?? "",
    secondaryColor: brand.secondaryColor ?? "",
    referenceVideoUrl: brand.referenceVideoUrl ?? "",
    name: brand.name,
  };
}

export default function EditBrandPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const api = useApiClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<WizardData>({
    nicheCategory: "",
    nicheDescription: "",
    targetAudienceAge: null,
    targetAudienceVibe: null,
    tone: null,
    visualStyle: null,
    characterType: null,
    characterDescription: "",
    primaryColor: "",
    secondaryColor: "",
    referenceVideoUrl: "",
    name: "",
  });

  const loadBrand = useCallback(async () => {
    const res = await withToast(() => api.brands.get(params.id), "Failed to load brand profile");
    if (res?.data) {
      setData(brandToWizardData(res.data));
    }
    setLoading(false);
  }, [api, params.id]);

  useEffect(() => {
    void loadBrand();
  }, [loadBrand]);

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return !!data.nicheCategory;
      case 2: return !!data.targetAudienceAge && !!data.targetAudienceVibe;
      case 3: return !!data.tone;
      case 4: return !!data.visualStyle;
      case 5: {
        if (!data.characterType) return false;
        if ((data.characterType === "human" || data.characterType === "mascot") && !data.characterDescription.trim()) return false;
        return true;
      }
      case 6: return true;
      case 7: return !!data.name.trim();
      default: return false;
    }
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    const res = await withToast(
      () => api.brands.update(params.id, {
        name: data.name.trim(),
        niche: data.nicheCategory,
        nicheDescription: data.nicheDescription || undefined,
        targetAudienceAge: data.targetAudienceAge ?? undefined,
        targetAudienceVibe: data.targetAudienceVibe ?? undefined,
        tone: data.tone!,
        visualStyle: data.visualStyle!,
        characterType: data.characterType!,
        characterDescription: data.characterDescription || undefined,
        primaryColor: data.primaryColor || undefined,
        secondaryColor: data.secondaryColor || undefined,
        referenceVideoUrl: data.referenceVideoUrl || undefined,
      }),
      "Failed to save brand profile"
    );
    setSubmitting(false);
    if (res) {
      toast.success("Brand profile saved");
      router.push("/brands");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : router.push("/brands"))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Edit Brand Profile</h1>
      </div>

      <ProgressBar step={step} />

      <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-6">
        {step === 1 && <Step1 data={data} onChange={update} />}
        {step === 2 && <Step2 data={data} onChange={update} />}
        {step === 3 && <Step3 data={data} onChange={update} />}
        {step === 4 && <Step4 data={data} onChange={update} />}
        {step === 5 && <Step5 data={data} onChange={update} />}
        {step === 6 && <Step6 data={data} onChange={update} brandId={params.id} />}
        {step === 7 && <Step7 data={data} onChange={update} />}

        <div className="mt-8 flex items-center justify-between">
          {step === 6 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Skip for now
            </button>
          )}
          {step !== 6 && <div />}

          <Button
            onClick={() => void handleNext()}
            disabled={!canAdvance() || submitting}
            loading={submitting}
            className="ml-auto gap-2"
          >
            {step === TOTAL_STEPS ? (
              "Save Changes"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
