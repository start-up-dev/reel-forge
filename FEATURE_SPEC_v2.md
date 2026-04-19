# ReelForge — Feature Bundle Implementation Spec

**Created:** April 20, 2026  
**Status:** Ready to implement  
**Start a fresh session and work through the Implementation Order at the bottom.**

---

## Change Summary

| # | Feature | Layers |
|---|---------|--------|
| 1 | Video length pills (15/30/45/60s) on Step 1 | DB · API · Web |
| 2 | Voice selection on Step 1 (language-filtered from ElevenLabs) | DB · API · Web |
| 3 | Remove voice picker from project creation | Web · API · DB |
| 4 | Multiple platform selection on project creation | DB · API · Types · Web |
| 5 | Claude Skills API integration (Anthropic skill_id) | API |
| 6 | FFmpeg: clips are max 6s, audio is never cut | Worker · API |
| 7 | General wizard UI/UX visual lift | Web |

---

## 1. Database Migrations

### `videos` table — add 2 columns

```sql
ALTER TABLE videos
  ADD COLUMN target_duration_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN voice_id text;
```

- `target_duration_seconds`: one of 15 | 30 | 45 | 60. Default 30.
- `voice_id`: nullable. When set, overrides `project.voice_id` for ElevenLabs generation.

### `projects` table — platform becomes array, voice_id nullable

```sql
-- Migrate platform → platforms (text array)
ALTER TABLE projects ADD COLUMN platforms text[] NOT NULL DEFAULT ARRAY['tiktok'];
UPDATE projects SET platforms = ARRAY[platform::text];
ALTER TABLE projects DROP COLUMN platform;

-- Make voice_id optional (voice now lives per-video, chosen in wizard Step 1)
ALTER TABLE projects ALTER COLUMN voice_id DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN voice_id SET DEFAULT NULL;
```

**Note:** The pgEnum `platformEnum` in schema.ts must be removed; `platforms` is stored as `text[]`.

### Drizzle schema changes (`apps/api/lib/db/schema.ts`)

```typescript
// projects table — REPLACE:
// platform: platformEnum("platform").notNull()
// WITH:
platforms: text("platforms").array().notNull().default(["tiktok"]),
voiceId: text("voice_id"),   // nullable now (was .notNull())

// videos table — ADD:
targetDurationSeconds: integer("target_duration_seconds").notNull().default(30),
voiceId: text("voice_id"),   // nullable — overrides project voiceId
```

Run after changes:
```bash
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api db:migrate
```

---

## 2. Types Package (`packages/types/src/index.ts`)

### `Project` interface

```typescript
// FROM:
platform: Platform;
voiceId: string;

// TO:
platforms: Platform[];      // array, min length 1
voiceId: string | null;     // nullable — voice now per-video
```

### `Video` interface — add 2 fields

```typescript
targetDurationSeconds: number;  // 15 | 30 | 45 | 60
voiceId: string | null;         // overrides project voiceId when set
```

---

## 3. API Changes

### 3a. `apps/api/routes/projects.ts`

**Body schema — create and update:**

```typescript
// FROM:
platform: z.nativeEnum(Platform),
voiceId: z.string(),

// TO:
platforms: z.array(z.nativeEnum(Platform)).min(1),
voiceId: z.string().optional(),  // optional, defaults to null
```

### 3b. `apps/api/routes/videos.ts`

**`POST /api/projects/:id/videos` — body:**

```typescript
const createVideoBody = z.object({
  title: z.string().min(1).max(200).default("Untitled Video"),
  targetDurationSeconds: z.number().int()
    .refine(v => [15, 30, 45, 60].includes(v), "Must be 15, 30, 45, or 60")
    .default(30),
});
// Insert with targetDurationSeconds
```

**`PATCH /api/videos/:id` — add two new optional fields:**

```typescript
voiceId: z.string().nullable().optional(),
targetDurationSeconds: z.number().int()
  .refine(v => [15, 30, 45, 60].includes(v))
  .optional(),
```

**`POST /api/videos/:id/voice` — voice resolution:**

```typescript
// FROM: const voiceId = project.voiceId
// TO:
const voiceId = video.voiceId ?? project?.voiceId;
if (!voiceId) {
  return reply.status(409).send({
    error: { code: "NO_VOICE", message: "Select a voice in Step 1 before generating audio." },
  });
}
```

**`POST /api/videos/:id/script` — pass duration to Claude:**

```typescript
const script = await generateScript(project, parsed.data.idea, video.targetDurationSeconds ?? 30);
```

### 3c. `apps/api/routes/assets.ts` — ElevenLabs voice fetch with language filter

```typescript
fastify.get<{ Querystring: { language?: string } }>(
  "/assets/voices",
  async (request, reply) => {
    const { language } = request.query;
    const voices = await getVoicesByLanguage(language);
    return reply.send({ data: voices });
  }
);
```

### 3d. `apps/api/services/elevenlabs.ts` — add `getVoicesByLanguage`

```typescript
export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: string | null;
  previewUrl: string | null;
}

export async function getVoicesByLanguage(language?: string): Promise<VoiceInfo[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed: ${res.status}`);
  const data = await res.json() as { voices: ElevenLabsVoice[] };

  const voices: VoiceInfo[] = data.voices.map(v => ({
    id: v.voice_id,
    name: v.name,
    language: v.labels?.language ?? "English",
    gender: v.labels?.gender ?? null,
    previewUrl: v.preview_url ?? null,
  }));

  if (!language) return voices;

  const lang = language.toLowerCase();
  const filtered = voices.filter(v => v.language.toLowerCase() === lang);
  // If no voices match the language, return all (frontend shows a fallback note)
  return filtered.length > 0 ? filtered : voices;
}
```

---

## 4. Claude Skills API (`apps/api/services/claude.ts`)

### Architecture

**Anthropic Skills API (Option A confirmed):** The code calls Claude skills by `skill_id` instead of providing system prompts. The skill configuration (system prompt, persona, language constraints) is managed in the Anthropic console.

### Skill IDs

| Skill | ID | Status |
|-------|----|--------|
| Bengali script writer | `skill_01UG5GQFxCxtoBTxUnYHY15r` | Ready |
| English script writer | `PLACEHOLDER_ENGLISH_SCRIPT_SKILL_ID` | Add when created |
| Grok visual + motion prompt generator | `PLACEHOLDER_GROK_PROMPT_SKILL_ID` | Add when created |
| Idea generator | `PLACEHOLDER_IDEA_GENERATOR_SKILL_ID` | Add when created |

Store skill IDs in environment variables (not hardcoded):
```
CLAUDE_SKILL_SCRIPT_BENGALI=skill_01UG5GQFxCxtoBTxUnYHY15r
CLAUDE_SKILL_SCRIPT_ENGLISH=PLACEHOLDER_ENGLISH_SCRIPT_SKILL_ID
CLAUDE_SKILL_GROK_PROMPTS=PLACEHOLDER_GROK_PROMPT_SKILL_ID
CLAUDE_SKILL_IDEAS=PLACEHOLDER_IDEA_GENERATOR_SKILL_ID
```

### How to call a skill via the Anthropic SDK

Check the Anthropic SDK docs for the exact parameter — likely one of these forms:

```typescript
// Form A — skill_id as top-level param
await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  skill_id: env.CLAUDE_SKILL_SCRIPT_BENGALI,
  messages: [{ role: "user", content: userMessage }],
});

// Form B — skill referenced in system array
await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: [{ type: "skill", skill_id: env.CLAUDE_SKILL_SCRIPT_BENGALI }],
  messages: [{ role: "user", content: userMessage }],
});
```

**TODO before coding:** Verify the exact SDK parameter by checking [Anthropic API docs](https://docs.anthropic.com) or the `@anthropic-ai/sdk` TypeScript types for the `MessageCreateParams` interface.

### Language → script skill routing

```typescript
const SCRIPT_SKILL_BY_LANGUAGE: Record<string, string | undefined> = {
  Bengali: env.CLAUDE_SKILL_SCRIPT_BENGALI,
  English: env.CLAUDE_SKILL_SCRIPT_ENGLISH,
  // Add more as you create skills in the Anthropic console
};

function getScriptSkillId(language: string): string {
  return SCRIPT_SKILL_BY_LANGUAGE[language] ?? env.CLAUDE_SKILL_SCRIPT_ENGLISH;
}
```

### Word count targets by duration

The user message to the skill must specify the word target:

```typescript
const WORDS_FOR_DURATION: Record<number, [number, number]> = {
  15: [30, 45],
  30: [65, 85],
  45: [100, 120],
  60: [135, 160],
};

// In generateScript():
const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];
const userMessage = `Target: ${targetDurationSeconds} seconds spoken (${minW}–${maxW} words).
Platform: ${project.platforms.join(", ")}
Niche: ${project.niche}
Target audience: ${project.targetAudience}
Tone: ${project.tone}
Additional: ${project.claudeSystemPrompt ?? "none"}

Idea: ${idea}

Write the script now. Return ONLY the script text.`;
```

### Grok prompt skill (scene splitting)

The Grok prompt skill system prompt (in Anthropic console) must specify:
- Each Grok Imagine clip = exactly 6 seconds
- `durationHintSeconds` ≤ 6 per scene (how much of the 6s clip to use)
- Sum of all `durationHintSeconds` = total audio duration exactly
- No text overlays, no real people
- Returns JSON array only

```typescript
// In splitScenes(), user message:
const minScenes = Math.ceil(audioDurationSeconds / 6);
const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

const userMessage = `Script:\n${script}

Audio duration: ${audioDurationSeconds} seconds
Required scenes: exactly ${targetCount}
Max durationHintSeconds per scene: 6 (Grok generates 6-second clips)
Sum of all durationHintSeconds: must equal exactly ${audioDurationSeconds}

Return ONLY a JSON array:
[{"sceneIndex":0,"textExcerpt":"...","visualPrompt":"...","motionPrompt":"...","durationHintSeconds":N}]`;
```

### Idea generator skill

```typescript
// In generateIdeas(), user message:
const userMessage = `Platform: ${project.platforms.join(", ")}
Niche: ${project.niche}
Target audience: ${project.targetAudience}
Language: ${project.language}
Style: ${project.videoStyle}
Tone: ${project.tone}

Topic: ${topic}

Generate 3 distinct video ideas. Return ONLY JSON:
[{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."}]`;
```

### Fallback when skill ID is placeholder

```typescript
function isPlaceholder(id: string | undefined): boolean {
  return !id || id.startsWith("PLACEHOLDER_");
}

// If skill ID is a placeholder, fall back to the existing claude.ts system prompt approach
// This allows development to continue before all skills are created in the Anthropic console
```

---

## 5. FFmpeg Worker — Audio-Authoritative, 6s Clip Max

### Changes to `apps/worker/src/ffmpeg.ts`

**`mixAudio` — replace `-shortest` with `-t audioDurationSeconds`:**

```typescript
// FROM signature:
export async function mixAudio(
  videoPath: string,
  audioPath: string,
  bgmPath: string | null,
  bgmVolume: number,
  dir: string,
): Promise<string>

// TO signature:
export async function mixAudio(
  videoPath: string,
  audioPath: string,
  bgmPath: string | null,
  bgmVolume: number,
  audioDurationSeconds: number,   // NEW — audio is authoritative
  dir: string,
): Promise<string>
```

In the FFmpeg command args: replace `-shortest` with `"-t", String(audioDurationSeconds)` in both the with-BGM and without-BGM paths.

### Changes to `apps/worker/src/assemble.ts`

Pass `video.durationSeconds` (stored at voice generation time) to `mixAudio`:

```typescript
await mixAudio(concatPath, audioPath, bgmPath, video.bgmVolume, video.durationSeconds, dir);
```

### Changes to `apps/api/routes/videos.ts`

In `processScenes`, clamp `durationHintSeconds` to max 6:

```typescript
durationHintSeconds: Math.max(1, Math.min(6, Math.round(s.durationHintSeconds))),
```

---

## 6. Project Creation Modal — Multi-Platform + Remove Voice

### File: `apps/web/components/dashboard/create-project-modal.tsx`

**Remove entirely:** The "AI Voice" `<Field>` section (all `defaultVoices` array, voice grid, `voiceId` in `FormData`).

**`FormData` type change:**

```typescript
// FROM:
type FormData = {
  // ...
  platform: Platform;
  voiceId: string;
};

// TO:
type FormData = {
  // ...
  platforms: Platform[];   // array
  // voiceId removed
};
```

**Replace platform `<select>` with toggleable pills:**

```tsx
const PLATFORM_OPTIONS = [
  { value: Platform.TikTok, label: "TikTok" },
  { value: Platform.Instagram, label: "Instagram" },
  { value: Platform.YouTubeShorts, label: "YouTube Shorts" },
  { value: Platform.FacebookReels, label: "Facebook Reels" },
];

function togglePlatform(p: Platform) {
  setForm(prev => ({
    ...prev,
    platforms: prev.platforms.includes(p)
      ? prev.platforms.filter(x => x !== p)
      : [...prev.platforms, p],
  }));
}

// In JSX:
<Field label="Platforms" required>
  <div className="flex flex-wrap gap-2">
    {PLATFORM_OPTIONS.map(p => {
      const selected = form.platforms.includes(p.value);
      return (
        <button
          key={p.value}
          type="button"
          onClick={() => togglePlatform(p.value)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
            selected
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
              : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
          )}
        >
          {p.label}
          {selected && <Check className="h-3 w-3 text-[var(--accent-primary)]" />}
        </button>
      );
    })}
  </div>
  {form.platforms.length === 0 && (
    <p className="mt-1 text-xs text-[var(--accent-danger)]">Select at least one platform</p>
  )}
</Field>
```

**Validation:** `isValid` must also check `form.platforms.length > 0`.

### File: `apps/web/components/dashboard/project-card.tsx`

Show up to 3 platform labels (or icons) inline:

```tsx
<div className="flex items-center gap-1">
  {project.platforms.slice(0, 3).map(p => (
    <span key={p} className="rounded-full border border-[var(--bg-border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
      {PLATFORM_LABELS[p]}
    </span>
  ))}
  {project.platforms.length > 3 && (
    <span className="text-[10px] text-[var(--text-muted)]">+{project.platforms.length - 3}</span>
  )}
</div>
```

---

## 7. Step 1 (Idea Step) — Full Redesign

### File: `apps/web/components/wizard/steps/step-1-idea.tsx`

### New layout (top to bottom)

```
1. Heading: "What's your video about?"
2. Subtext
3. Video Length section (pills)
4. Mode toggle (Brainstorm / Direct)
5. Topic/idea textarea
6. Generate/Submit button
7. Idea cards (brainstorm mode only)
8. ── Voice section ──
9. Voice cards (horizontal scroll, filtered by project language)
10. Tips expandable
```

### Video length pills

```tsx
const DURATION_OPTIONS = [
  { value: 15, label: "15s", hint: "Quick hook" },
  { value: 30, label: "30s", hint: "Standard" },
  { value: 45, label: "45s", hint: "In-depth" },
  { value: 60, label: "60s", hint: "Full story" },
] as const;

// State:
const [targetDuration, setTargetDuration] = useState(video.targetDurationSeconds ?? 30);

// On change: scheduleSave({ targetDurationSeconds: value })

// JSX:
<div>
  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
    Video Length
  </p>
  <div className="flex gap-2">
    {DURATION_OPTIONS.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => { setTargetDuration(opt.value); scheduleSave({ targetDurationSeconds: opt.value }); }}
        className={cn(
          "flex flex-col items-center rounded-xl border px-4 py-2 transition-all",
          targetDuration === opt.value
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
            : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
        )}
      >
        <span className="text-base font-bold">{opt.label}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{opt.hint}</span>
      </button>
    ))}
  </div>
</div>
```

### Voice selection section

```tsx
// Fetch on mount
const [voices, setVoices] = useState<VoiceInfo[]>([]);
const [voicesLoading, setVoicesLoading] = useState(true);
const [selectedVoiceId, setSelectedVoiceId] = useState(video.voiceId ?? null);
const [playingPreview, setPlayingPreview] = useState<string | null>(null);
const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  async function loadVoices() {
    const result = await withToast(
      () => api.assets.voices(project.language),
      "Failed to load voices"
    );
    if (result?.data) setVoices(result.data);
    setVoicesLoading(false);
  }
  void loadVoices();
}, [project.language]);

function selectVoice(id: string) {
  setSelectedVoiceId(id);
  scheduleSave({ voiceId: id });
}

function togglePreview(previewUrl: string) {
  if (playingPreview === previewUrl) {
    audioRef.current?.pause();
    setPlayingPreview(null);
  } else {
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(previewUrl);
    audioRef.current.play();
    audioRef.current.onended = () => setPlayingPreview(null);
    setPlayingPreview(previewUrl);
  }
}

// JSX:
<div className="mt-8">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
      Voice
    </p>
    <p className="text-xs text-[var(--text-secondary)]">
      {project.language} voices
    </p>
  </div>

  {voicesLoading ? (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 w-36 shrink-0 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
      ))}
    </div>
  ) : (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {voices.map(v => (
        <button
          key={v.id}
          type="button"
          onClick={() => selectVoice(v.id)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition-all",
            selectedVoiceId === v.id
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
              : "border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 text-sm font-bold text-[var(--accent-primary)]">
            {v.name[0]}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--text-primary)]">{v.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{v.gender ?? v.language}</p>
          </div>
          {v.previewUrl && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); togglePreview(v.previewUrl!); }}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {playingPreview === v.previewUrl
                ? <Square className="h-2.5 w-2.5" />
                : <Play className="h-2.5 w-2.5" />}
            </button>
          )}
        </button>
      ))}
    </div>
  )}

  {!selectedVoiceId && !voicesLoading && (
    <p className="mt-2 text-xs text-[var(--accent-warning)]">Select a voice to continue</p>
  )}
</div>
```

### Advance guard

Before calling `handleUseIdea` or `handleDirectSubmit`, check that `selectedVoiceId` is set:

```typescript
if (!selectedVoiceId) {
  toast.error("Select a voice before continuing");
  return;
}
```

### `api-client.ts` — add voices method

```typescript
assets: {
  voices: (language?: string) =>
    get<VoiceInfo[]>(`/api/assets/voices${language ? `?language=${encodeURIComponent(language)}` : ""}`),
},
```

---

## 8. General UI/UX Visual Lift

### Step transitions — `wizard-client.tsx`

```tsx
// FROM:
className="relative flex-1 overflow-y-auto animate-in fade-in duration-200"

// TO:
className="relative flex-1 overflow-y-auto animate-in fade-in slide-in-from-bottom-3 duration-300"
```

Add scroll-to-top on step change:

```tsx
useEffect(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTop = 0;
}, [currentStep]);
```

### Step progress bar — `wizard-header.tsx` / `step-progress-bar.tsx`

- Active step: 32px circle (was ~24px), add `shadow-[0_0_12px_rgba(124,92,252,0.4)]`
- Completed steps: checkmark icon replaces number
- Connector line: add a colored fill track (`bg-[var(--accent-primary)]`) that grows left-to-right as steps complete

### Step 2 — Script (`step-2-script.tsx`)

- Textarea: `min-h-[240px]`
- Word count: absolute badge inside textarea bottom-right, color-coded:
  - Too short → `text-[var(--accent-danger)]`
  - Good range → `text-[var(--accent-success)]`
  - Too long → `text-[var(--accent-warning)]`
- Duration bar: colored fill with label "~X seconds"

### Step 3 — Voice Review (`step-3-voice.tsx`)

- Show selected voice name at top of step: "Generating audio with: {voiceName}"
- Resolve voice name by looking up `video.voiceId` against the loaded voice list

### Step 4 — Scene cards (`step-4-scenes.tsx`)

- Switch from `max-w-2xl` to `max-w-4xl` for this step only
- Image container: `aspect-[9/16]` (portrait, matches final 9:16 video)
- Approved card state: `border-l-4 border-l-[var(--accent-success)]` + green checkmark overlay on image
- Scene number badge: absolute top-left on image, `bg-black/50 text-white rounded-br-lg px-2 py-1 text-xs`
- Card hover: `hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/40 transition-all`
- Unapproved image skeleton: shimmer animation until image loads

### Step 5 — Style & BGM (`step-5-style.tsx`)

- Subtitle cards: `grid-cols-2` (2×2 grid, not 4-in-a-row)
- Each subtitle card: render CSS mock of the subtitle style in the card body:
  - bold_pop: large bold white text, black shadow, centered
  - minimal: small text, bottom
  - cinematic: text on semi-transparent dark bar
  - word_highlight: text with one word highlighted yellow
- BGM section: card with track name, duration, inline play button

### Step 6 — Processing (`step-6-processing.tsx`)

- Timeline items: icon-left layout (check/spinner/dot)
- Queue position: amber pill badge `bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]` with `animate-pulse`
- "You can leave this page" callout: distinct box with border + subtle background

### Global wizard improvements (all steps)

- Content `max-w-2xl` on idea/script/voice/style/processing steps
- `max-w-4xl` on scene step only
- Button groups: `gap-3` between primary and secondary
- Form labels: `text-sm` (not `text-xs`) for readability
- Error states: red left border + faint danger tint on error cards

---

## 9. File Change Inventory

| File | Changes |
|------|---------|
| `apps/api/lib/db/schema.ts` | platforms: text[], voiceId nullable on projects; add targetDurationSeconds + voiceId to videos |
| `packages/types/src/index.ts` | Project.platforms: Platform[], Project.voiceId nullable; Video adds targetDurationSeconds + voiceId |
| `apps/api/lib/env.ts` | Add CLAUDE_SKILL_* env vars |
| `apps/api/routes/projects.ts` | Accept platforms array, voiceId optional |
| `apps/api/routes/videos.ts` | targetDurationSeconds on create; voiceId + targetDurationSeconds on patch; voice resolution; pass duration to generateScript; clamp durationHintSeconds to 6 in processScenes |
| `apps/api/routes/assets.ts` | Language-filtered voice endpoint calling ElevenLabs API |
| `apps/api/services/claude.ts` | 4 Claude Skills calls (skill_id routing), language→skill lookup, 6s clip constraint in splitScenes user message |
| `apps/api/services/elevenlabs.ts` | Add getVoicesByLanguage() |
| `apps/worker/src/ffmpeg.ts` | mixAudio: new audioDurationSeconds param, replace -shortest with -t |
| `apps/worker/src/assemble.ts` | Pass video.durationSeconds to mixAudio |
| `apps/web/lib/api-client.ts` | Add voiceId + targetDurationSeconds to video types and API calls; add assets.voices() method |
| `apps/web/components/dashboard/create-project-modal.tsx` | Multi-select platform pills, remove voice picker |
| `apps/web/components/dashboard/project-card.tsx` | Multi-platform label/icon row |
| `apps/web/components/wizard/steps/step-1-idea.tsx` | Full redesign: length pills, voice selector with preview |
| `apps/web/components/wizard/steps/step-2-script.tsx` | Textarea min-h, word count badge |
| `apps/web/components/wizard/steps/step-3-voice.tsx` | Show selected voice name |
| `apps/web/components/wizard/steps/step-4-scenes.tsx` | max-w-4xl, 9:16 aspect, approved state, hover lift |
| `apps/web/components/wizard/steps/step-5-style.tsx` | 2×2 grid, CSS subtitle previews, BGM polish |
| `apps/web/components/wizard/steps/step-6-processing.tsx` | Timeline polish, queue badge |
| `apps/web/components/wizard/wizard-header.tsx` | Progress bar fill, active step glow, checkmarks |
| `apps/web/app/(wizard)/videos/[id]/wizard-client.tsx` | slide-in-from-bottom-3 transition, scroll-to-top on step change |

**No new files needed.** All changes are modifications to existing files.

---

## 10. Environment Variables to Add

```bash
# .env and GCP Secret Manager

# Claude Skills (from Anthropic Console)
CLAUDE_SKILL_SCRIPT_BENGALI=skill_01UG5GQFxCxtoBTxUnYHY15r
CLAUDE_SKILL_SCRIPT_ENGLISH=PLACEHOLDER_ENGLISH_SCRIPT_SKILL_ID
CLAUDE_SKILL_GROK_PROMPTS=PLACEHOLDER_GROK_PROMPT_SKILL_ID
CLAUDE_SKILL_IDEAS=PLACEHOLDER_IDEA_GENERATOR_SKILL_ID
```

Add all four to `apps/api/lib/env.ts` (Zod schema). Skill IDs that start with `PLACEHOLDER_` should trigger a fallback to the existing hardcoded system prompt approach so dev still works.

---

## 11. Implementation Order

Work through these in order. Each block is independently testable.

```
Block 1 — DB + Types
  1. Update apps/api/lib/db/schema.ts
  2. Run db:generate + db:migrate
  3. Update packages/types/src/index.ts

Block 2 — API + Services
  4. Update apps/api/routes/projects.ts (platforms array)
  5. Update apps/api/routes/videos.ts (targetDurationSeconds, voiceId, voice resolution, 6s clamp)
  6. Update apps/api/routes/assets.ts (voice endpoint)
  7. Update apps/api/services/elevenlabs.ts (getVoicesByLanguage)
  8. Update apps/api/services/claude.ts (Claude Skills API calls)
  9. Update apps/api/lib/env.ts (new env vars)

Block 3 — FFmpeg Worker
  10. Update apps/worker/src/ffmpeg.ts (mixAudio signature)
  11. Update apps/worker/src/assemble.ts (pass audioDurationSeconds)

Block 4 — Web App
  12. Update apps/web/lib/api-client.ts
  13. Update create-project-modal.tsx (platform pills, remove voice)
  14. Update project-card.tsx (multi-platform display)
  15. Redesign step-1-idea.tsx (length pills + voice selector)
  16. Polish step-2-script.tsx
  17. Update step-3-voice.tsx
  18. Polish step-4-scenes.tsx
  19. Polish step-5-style.tsx
  20. Polish step-6-processing.tsx
  21. Update wizard-header.tsx (progress bar)
  22. Update wizard-client.tsx (transitions)

Block 5 — Type check + lint
  23. pnpm check-types
  24. pnpm lint
```

---

## 12. Known Gaps / Pre-Coding Checklist

- [ ] **Verify Claude Skills API parameter name** in `@anthropic-ai/sdk` TypeScript types (`MessageCreateParams`) — is it `skill_id`, `system: [{type:"skill"}]`, or something else? Check Anthropic docs before coding Block 2 step 8.
- [ ] **Create remaining Claude skills** in Anthropic console: English scriptwriter, Grok prompt generator, idea generator. Update env vars with real IDs.
- [ ] **ElevenLabs voice labels** — confirm that custom voices you created in ElevenLabs have the `language` label set (e.g., `Bengali`). The `getVoicesByLanguage` filter matches on `v.labels?.language`. If your voices use a different label key, adjust the filter.
- [ ] **Onboarding modal** — it uses the same `CreateProjectModal` component. After removing `voiceId`, the onboarding Step 1 (project creation) no longer collects a voice. This is intentional — voice is now chosen per-video. Confirm no onboarding copy references voice selection.

---

*End of spec — FEATURE_SPEC_v2.md*
