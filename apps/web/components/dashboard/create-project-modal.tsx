"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, operates in edit mode */
  project?: Project | null;
  onSuccess: (project: Project) => void;
}

const platforms = [
  { value: Platform.TikTok, label: "TikTok" },
  { value: Platform.Instagram, label: "Instagram" },
  { value: Platform.YouTubeShorts, label: "YouTube Shorts" },
  { value: Platform.FacebookReels, label: "Facebook Reels" },
];

const videoStyles = [
  { value: VideoStyle.Educational, label: "Educational" },
  { value: VideoStyle.Motivational, label: "Motivational" },
  { value: VideoStyle.Storytelling, label: "Storytelling" },
  { value: VideoStyle.Listicle, label: "Listicle" },
  { value: VideoStyle.Tutorial, label: "Tutorial" },
  { value: VideoStyle.POV, label: "POV" },
];

const tones = [
  { value: Tone.Casual, label: "Casual" },
  { value: Tone.Professional, label: "Professional" },
  { value: Tone.Humorous, label: "Humorous" },
  { value: Tone.Inspirational, label: "Inspirational" },
  { value: Tone.Dramatic, label: "Dramatic" },
];

const defaultVoices = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", language: "English" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", language: "English" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", language: "English" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", language: "English" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", language: "English" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", language: "English" },
];

type FormData = {
  name: string;
  platform: Platform;
  niche: string;
  language: string;
  targetAudience: string;
  videoStyle: VideoStyle;
  tone: Tone;
  voiceId: string;
};

const defaultForm: FormData = {
  name: "",
  platform: Platform.TikTok,
  niche: "",
  language: "English",
  targetAudience: "",
  videoStyle: VideoStyle.Educational,
  tone: Tone.Casual,
  voiceId: defaultVoices[0]!.id,
};

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

  // Populate form when editing
  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        platform: project.platform,
        niche: project.niche,
        language: project.language,
        targetAudience: project.targetAudience,
        videoStyle: project.videoStyle,
        tone: project.tone,
        voiceId: project.voiceId,
      });
    } else {
      setForm(defaultForm);
    }
  }, [project, open]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isValid =
    form.name.trim().length > 0 &&
    form.niche.trim().length > 0 &&
    form.targetAudience.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);

    const result = await withToast(
      () =>
        isEdit && project
          ? api.projects.update(project.id, form)
          : api.projects.create(form),
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Platform */}
          <Field label="Platform" required>
            <select
              value={form.platform}
              onChange={(e) => set("platform", e.target.value as Platform)}
              className={inputCls}
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Niche */}
          <Field label="Niche" required>
            <input
              type="text"
              value={form.niche}
              onChange={(e) => set("niche", e.target.value)}
              placeholder="e.g. Personal finance, fitness, travel"
              className={inputCls}
              maxLength={80}
            />
          </Field>

          {/* Language */}
          <Field label="Language" required>
            <input
              type="text"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              placeholder="English"
              className={inputCls}
            />
          </Field>

          {/* Target Audience */}
          <Field label="Target Audience" required>
            <input
              type="text"
              value={form.targetAudience}
              onChange={(e) => set("targetAudience", e.target.value)}
              placeholder="e.g. 18-35 year olds interested in side hustles"
              className={inputCls}
              maxLength={120}
            />
          </Field>

          {/* Video Style */}
          <Field label="Video Style">
            <select
              value={form.videoStyle}
              onChange={(e) => set("videoStyle", e.target.value as VideoStyle)}
              className={inputCls}
            >
              {videoStyles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Tone */}
          <Field label="Tone">
            <select
              value={form.tone}
              onChange={(e) => set("tone", e.target.value as Tone)}
              className={inputCls}
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Voice */}
          <Field label="AI Voice">
            <div className="grid grid-cols-2 gap-2">
              {defaultVoices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => set("voiceId", v.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    form.voiceId === v.id
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                      : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 text-[10px] font-bold text-[var(--accent-primary)]">
                    {v.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-medium">{v.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{v.language}</div>
                  </div>
                </button>
              ))}
            </div>
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
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--accent-danger)]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-colors";
