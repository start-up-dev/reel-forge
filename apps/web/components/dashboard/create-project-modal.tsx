"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Play, Pause, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/dialog";
import type { Project } from "@repo/types";
import { Platform, VideoStyle, Tone } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VoiceInfo } from "@/lib/api-client";
import { cn } from "@repo/ui/utils";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess: (project: Project) => void;
}

// ─── Static option lists ──────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { value: Platform.TikTok, label: "TikTok" },
  { value: Platform.Instagram, label: "Instagram" },
  { value: Platform.YouTubeShorts, label: "YouTube Shorts" },
  { value: Platform.FacebookReels, label: "Facebook Reels" },
];

const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string; description: string }[] = [
  { value: VideoStyle.Educational, label: "Educational", description: "Teach or explain a concept" },
  { value: VideoStyle.Motivational, label: "Motivational", description: "Inspire action or mindset shift" },
  { value: VideoStyle.Storytelling, label: "Storytelling", description: "Narrative-driven content" },
  { value: VideoStyle.Listicle, label: "Listicle", description: "Top N list format" },
  { value: VideoStyle.Tutorial, label: "Tutorial", description: "Step-by-step how-to" },
  { value: VideoStyle.POV, label: "POV", description: "Point-of-view perspective" },
  { value: VideoStyle.Trending, label: "Trending / Viral", description: "Ride current trends" },
  { value: VideoStyle.Reaction, label: "Reaction", description: "React to content or events" },
  { value: VideoStyle.DayInLife, label: "Day in the Life", description: "Follow-along daily content" },
  { value: VideoStyle.Challenge, label: "Challenge", description: "Participate in or set a challenge" },
  { value: VideoStyle.Unboxing, label: "Unboxing / Review", description: "Product reveals and reviews" },
  { value: VideoStyle.Transformation, label: "Transformation", description: "Before and after journey" },
  { value: VideoStyle.Commentary, label: "Commentary", description: "Opinion or analysis" },
  { value: VideoStyle.BehindScenes, label: "Behind the Scenes", description: "Process or making-of content" },
  { value: VideoStyle.Comedy, label: "Comedy / Skit", description: "Humour and entertainment" },
  { value: VideoStyle.Tips, label: "Tips & Tricks", description: "Quick actionable advice" },
  { value: VideoStyle.Storytime, label: "Storytime", description: "Personal story or confession" },
  { value: VideoStyle.Showcase, label: "Product Showcase", description: "Feature a product or service" },
  { value: VideoStyle.Comparison, label: "Comparison", description: "Side-by-side comparisons" },
  { value: VideoStyle.Rant, label: "Rant / Opinion", description: "Strong takes and hot opinions" },
  { value: VideoStyle.News, label: "News / Update", description: "Timely news or announcements" },
  { value: VideoStyle.Asmr, label: "ASMR", description: "Relaxing, sensory-focused content" },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: Tone.Casual, label: "Casual" },
  { value: Tone.Professional, label: "Professional" },
  { value: Tone.Humorous, label: "Humorous" },
  { value: Tone.Inspirational, label: "Inspirational" },
  { value: Tone.Dramatic, label: "Dramatic" },
  { value: Tone.Energetic, label: "Energetic" },
  { value: Tone.Empathetic, label: "Empathetic" },
  { value: Tone.Bold, label: "Bold / Direct" },
  { value: Tone.Mysterious, label: "Mysterious" },
  { value: Tone.Friendly, label: "Friendly / Warm" },
  { value: Tone.Urgent, label: "Urgent" },
  { value: Tone.Chill, label: "Chill / Relaxed" },
  { value: Tone.Playful, label: "Playful" },
  { value: Tone.Raw, label: "Raw / Unfiltered" },
  { value: Tone.Sarcastic, label: "Sarcastic" },
];

const LANGUAGE_OPTIONS = [
  "English", "Bengali", "Hindi", "Spanish", "French", "Arabic", "Portuguese",
  "German", "Italian", "Japanese", "Korean", "Mandarin Chinese", "Russian",
  "Turkish", "Indonesian", "Urdu", "Malay", "Thai", "Vietnamese", "Polish",
];

// 100+ niches grouped for the combobox
const NICHES: string[] = [
  // Finance & Business
  "Personal Finance", "Investing", "Cryptocurrency", "Stock Trading", "Real Estate",
  "E-commerce", "Dropshipping", "Freelancing", "Side Hustles", "Passive Income",
  "Entrepreneurship", "Startups", "Marketing", "Digital Marketing", "Sales",
  "Business Tips", "Small Business", "Online Business", "NFTs", "DeFi",
  // Health & Wellness
  "Fitness", "Weight Loss", "Nutrition", "Mental Health", "Yoga", "Meditation",
  "Running", "Bodybuilding", "Keto Diet", "Vegan Lifestyle", "Sleep Health",
  "Supplements", "Skincare", "Hair Care", "Self-Care", "Intermittent Fasting",
  "Gym Workouts", "Calisthenics", "Pilates", "Stretching & Mobility",
  // Entertainment
  "Movies & TV", "Music", "Gaming", "Comedy", "Memes", "Celebrity News",
  "Sports", "Anime", "Book Reviews", "Podcast Clips", "True Crime", "Paranormal",
  "Horror", "Sci-Fi", "Pop Culture", "Reality TV",
  // Food & Drink
  "Cooking", "Baking", "Recipes", "Food Reviews", "Restaurant Reviews",
  "Meal Prep", "Street Food", "Vegan Cooking", "Desserts", "Cocktails & Drinks",
  "Coffee", "Wine & Spirits", "BBQ & Grilling", "Quick Meals",
  // Lifestyle
  "Travel", "Fashion", "Luxury", "Beauty", "Relationships", "Dating",
  "Parenting", "Home Decor", "DIY & Crafts", "Minimalism", "Sustainable Living",
  "Productivity", "Morning Routines", "Life Hacks", "Organisation",
  "Adulting Tips", "Moving Abroad", "Expat Life", "Van Life", "Tiny Homes",
  // Technology
  "Tech Reviews", "Gadgets", "AI & Machine Learning", "Coding", "App Development",
  "Cybersecurity", "Social Media Tips", "Photography", "Videography", "Digital Art",
  "3D Printing", "Smart Home", "Electric Vehicles", "Space Tech",
  // Education
  "Science", "History", "Mathematics", "Languages", "Study Tips", "Career Advice",
  "Psychology", "Philosophy", "Trivia & Facts", "College Tips", "Job Hunting",
  // Niche & Hobby
  "Cars & Automotive", "Pets & Animals", "Spirituality", "Astrology",
  "Sports Betting", "Fantasy Sports", "Hunting & Fishing", "Outdoor & Hiking",
  "Camping", "Cycling", "Surfing", "Skateboarding", "Tattoos", "Sneakers",
  "Watches & Luxury Goods", "Comic Books", "Collectibles", "Gardening",
  // Creator / Platform
  "Content Creation", "YouTube Tips", "TikTok Growth", "Instagram Growth",
  "Personal Branding", "Influencer Tips", "Brand Deals", "UGC Content",
  "Faceless Content", "Voiceover Content",
  // Adult / Entertainment
  "Fitness Model", "Dance", "Lifestyle Vlog", "Beauty & Glam", "Body Positivity",
];

const AUDIENCE_OPTIONS: string[] = [
  "Gen Z (18-24 years old)",
  "Millennials (25-40 years old)",
  "Gen X (40-55 years old)",
  "Teenagers (13-17)",
  "Young adults (18-25)",
  "Young professionals (22-35)",
  "College students",
  "Parents with young children",
  "Small business owners",
  "Entrepreneurs & startup founders",
  "Working professionals",
  "Fitness enthusiasts",
  "Beginners learning the topic",
  "Intermediate learners",
  "Advanced practitioners / experts",
  "Budget-conscious consumers",
  "Luxury consumers",
  "Stay-at-home parents",
  "Retirees & seniors (55+)",
  "Students & academics",
  "Content creators & influencers",
  "Online shoppers",
  "Tech-savvy early adopters",
  "General / mainstream audience",
  "Men 18-35",
  "Women 18-35",
  "Men 35-55",
  "Women 35-55",
  "Men 18-55",
  "Women 18-55",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  platforms: Platform[];
  niche: string;
  language: string;
  targetAudience: string;
  videoStyle: VideoStyle;
  tone: Tone;
  voiceId: string;
  claudeSystemPrompt: string;
};

const defaultForm: FormData = {
  name: "",
  platforms: [Platform.TikTok],
  niche: "",
  language: "English",
  targetAudience: "",
  videoStyle: VideoStyle.Educational,
  tone: Tone.Casual,
  voiceId: "",
  claudeSystemPrompt: "",
};

// ─── Searchable combobox ──────────────────────────────────────────────────────

function Combobox({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = false,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          inputCls,
          "flex items-center justify-between text-left",
          !value && "text-[var(--text-muted)]"
        )}
      >
        <span className="truncate">{value || placeholder || "Select…"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-xl">
          <div className="flex items-center gap-2 border-b border-[var(--bg-border)] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) select(filtered[0]!);
                if (e.key === "Enter" && allowCustom && query && filtered.length === 0) select(query);
                if (e.key === "Escape") { setOpen(false); setQuery(""); }
              }}
              placeholder="Search…"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-[var(--text-muted)]">
                {allowCustom ? `Press Enter to use "${query}"` : "No results"}
              </li>
            )}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => select(opt)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-elevated)]",
                    value === opt ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  )}
                >
                  {value === opt && <Check className="h-3 w-3 shrink-0 text-[var(--accent-primary)]" />}
                  <span className={cn(value !== opt && "ml-5")}>{opt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Voice picker ─────────────────────────────────────────────────────────────

function VoicePicker({
  language,
  value,
  onChange,
}: {
  language: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const api = useApiClient();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    api.assets.voices(language).then((res) => {
      if (res?.data) setVoices(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function togglePreview(voiceId: string) {
    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingId(voiceId);
    try {
      const blobUrl = await api.assets.voicePreviewBlobUrl(voiceId, language);
      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading voices…
      </div>
    );
  }

  if (voices.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No voices available for {language}.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {voices.map((v) => {
        const selected = value === v.id;
        const previewing = playingId === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(selected ? "" : v.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
              selected
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            )}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void togglePreview(v.id); }}
              className={cn(
                "shrink-0 rounded-full p-1 transition-colors",
                previewing ? "bg-[var(--accent-primary)] text-white" : "hover:bg-[var(--bg-border)]"
              )}
              title={previewing ? "Stop preview" : "Preview voice"}
            >
              {previewing
                ? <Pause className="h-3 w-3" />
                : <Play className="h-3 w-3" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{v.name}</p>
              {v.gender && <p className="text-[10px] text-[var(--text-muted)] capitalize">{v.gender}</p>}
            </div>
            {selected && <Check className="ml-auto h-3 w-3 shrink-0 text-[var(--accent-primary)]" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function CreateProjectModal({
  open,
  onOpenChange,
  project,
  onSuccess,
}: CreateProjectModalProps) {
  const api = useApiClient();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const isEdit = !!project;

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        platforms: project.platforms,
        niche: project.niche,
        language: project.language,
        targetAudience: project.targetAudience,
        videoStyle: project.videoStyle,
        tone: project.tone,
        voiceId: project.voiceId ?? "",
        claudeSystemPrompt: project.claudeSystemPrompt ?? "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [project, open]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(p: Platform) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  }

  const isValid =
    form.name.trim().length > 0 &&
    form.niche.trim().length > 0 &&
    form.targetAudience.trim().length > 0 &&
    form.platforms.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);

    const payload = {
      name: form.name,
      platforms: form.platforms,
      niche: form.niche,
      language: form.language,
      targetAudience: form.targetAudience,
      videoStyle: form.videoStyle,
      tone: form.tone,
      voiceId: form.voiceId || undefined,
      claudeSystemPrompt: form.claudeSystemPrompt.trim() || null,
    };

    const result = await withToast(
      () =>
        isEdit && project
          ? api.projects.update(project.id, payload)
          : api.projects.create(payload),
      isEdit ? "Failed to update project" : "Failed to create project"
    );

    setSaving(false);
    if (result?.data) {
      toast.success(isEdit ? "Project updated" : "Project created");
      onSuccess(result.data);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Name */}
          <Field label="Project Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My TikTok Channel"
              className={inputCls}
              maxLength={80}
            />
          </Field>

          {/* Platforms */}
          <Field label="Platforms" required>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const selected = form.platforms.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      selected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                        : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    {selected && <Check className="h-3 w-3 text-[var(--accent-primary)]" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
            {form.platforms.length === 0 && (
              <p className="mt-1 text-xs text-[var(--accent-danger)]">Select at least one platform</p>
            )}
          </Field>

          {/* Language */}
          <Field label="Language" required>
            <Combobox
              options={LANGUAGE_OPTIONS}
              value={form.language}
              onChange={(v) => set("language", v)}
              placeholder="Select language…"
              allowCustom
            />
          </Field>

          {/* Niche */}
          <Field label="Niche" required>
            <Combobox
              options={NICHES}
              value={form.niche}
              onChange={(v) => set("niche", v)}
              placeholder="Search or select a niche…"
              allowCustom
            />
          </Field>

          {/* Target Audience */}
          <Field label="Target Audience" required>
            <Combobox
              options={AUDIENCE_OPTIONS}
              value={form.targetAudience}
              onChange={(v) => set("targetAudience", v)}
              placeholder="Search or select an audience…"
              allowCustom
            />
          </Field>

          {/* Video Style */}
          <Field label="Video Style">
            <div className="grid grid-cols-2 gap-1.5">
              {VIDEO_STYLE_OPTIONS.map((s) => {
                const selected = form.videoStyle === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("videoStyle", s.value)}
                    title={s.description}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                      selected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                        : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    {selected && <Check className="h-3 w-3 shrink-0 text-[var(--accent-primary)]" />}
                    <span className={cn("text-xs font-medium", !selected && "ml-4")}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Tone */}
          <Field label="Tone">
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => {
                const selected = form.tone === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("tone", t.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                        : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Voice */}
          <Field label="Default Voice" hint="Optional — can be changed per video">
            <VoicePicker
              language={form.language}
              value={form.voiceId}
              onChange={(id) => set("voiceId", id)}
            />
          </Field>

          {/* Character / Style Notes */}
          <Field
            label="Character & Style Notes"
            hint="Optional — describe your character's appearance, clothing style, or any specific visual direction for the AI"
          >
            <textarea
              value={form.claudeSystemPrompt}
              onChange={(e) => set("claudeSystemPrompt", e.target.value)}
              placeholder="e.g. A fit woman in her 20s with long dark hair, wearing a crop top and shorts, energetic dancer. Always maintain this same character across all scenes."
              className={cn(inputCls, "min-h-[80px] resize-y")}
              maxLength={2000}
            />
            {form.claudeSystemPrompt.length > 1800 && (
              <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
                {form.claudeSystemPrompt.length}/2000
              </p>
            )}
          </Field>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Project"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--accent-danger)]">*</span>}
        </label>
        {hint && <span className="text-[10px] text-[var(--text-muted)]">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-colors";
