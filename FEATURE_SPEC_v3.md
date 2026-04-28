# ReelForge — Feature Enhancement Tasks

**Version:** 1.0  
**Date:** April 27, 2026  
**Depends on:** MVP phases 1–9 (worker assembly pipeline complete)

Six interconnected feature tracks. Implement in the order listed — tracks 1, 3, 4, and 6 are independent and can be parallelized. Track 2 depends on track 4 (video categories must exist before cartoon consistency logic splits by type). Track 5 depends on track 4.

---

## Track 1 — Voice Playback Speed Applied at Render

### Overview
The frontend player already lets users choose a playback speed. That selection must be persisted and forwarded to FFmpeg at assembly time, so the final rendered video matches what the user heard in the preview. ElevenLabs audio is generated at normal speed; FFmpeg applies `atempo` to compress or stretch it. Word timestamps and per-scene `durationHint`s are scaled by the same factor so subtitles and clip lengths stay in sync.

### 1.1 — Schema & API

- [x] Add `voiceSpeed` column (float, default `1.0`, range 0.5–2.0) to the `videos` table in `apps/api/lib/db/schema.ts`
- [x] Generate migration `0007_voice_speed.sql` and add to journal
- [x] Add `voiceSpeed` to the `Video` interface in `@repo/types`; inferred `VideoRow` in worker `db.ts` updated
- [x] `voiceSpeed` field added to `PATCH /videos/:id` body schema (validated 0.5–2.0)
- [x] `voiceSpeed` returned in `GET /videos/:id` response (auto-included via `SELECT *`)

### 1.2 — Frontend Speed Control

- [x] Speed selector extended to `0.5×`, `0.75×`, `1×`, `1.25×`, `1.5×`, `2×` in Step 3 player
- [x] Selector wired to `<audio>` `playbackRate` property for instant preview
- [x] On selection, auto-saves via `PATCH /videos/:id` (fire-and-forget with toast on error)
- [x] Active speed highlighted visually (existing badge styling)
- [x] Speed initialised from `video.voiceSpeed` so player shows saved value on re-open

### 1.3 — Worker: FFmpeg Speed Application

- [x] `speedAudio(inputPath, speed, dir)` added to `apps/worker/src/ffmpeg.ts`; uses single `atempo` filter (range 0.5–2.0 fits one filter; no chaining needed for our allowed range)
- [x] In `assemble.ts`, `speedAudio` called before `mixAudio` when `voiceSpeed !== 1.0`
- [x] `audioDurationSeconds` probed from the sped-up file (more accurate than dividing)

### 1.4 — Subtitle Timestamp Sync

- [x] In `assemble.ts`, every `word.start` and `word.end` multiplied by `1/voiceSpeed` after speed change so subtitles align with the adjusted audio

---

## Track 2 — Cartoon Character Consistency (Base Image → Image-to-Image Variants)

### Overview
For `cartoon` and `mascot` render styles, generate a single base character image on scene 0, upload it to GCS, then pass it as a reference image to every subsequent Grok Imagine call (image-to-image). This locks in visual character identity across all scenes instead of letting Grok drift per-generation.

### 2.1 — Grok Image-to-Image Support

- [x] Research and confirm the exact Grok Imagine API parameter for passing a reference/init image (`image_url` or `init_image` or equivalent) — update `apps/api/services/grok-image.ts` accordingly
- [x] Add `generateImageFromReference(prompt, referenceImageUrl, strength, dir)` to `grok-image.ts`:
  - `strength` controls how closely the output follows the reference (0.0–1.0; recommend `0.7` as default for character consistency)
  - Falls back to standard `generateImage` if the Grok API returns an error on the image-to-image call
- [x] Export the new function from the service

### 2.2 — Base Character Sheet Generation

- [x] In `apps/api/services/claude.ts` (or the new prompt registry — see Track 6), add `generateCharacterSheet(project, renderStyle)` that asks Claude to write a hyper-detailed character bible prompt for the mascot/cartoon character based on the project niche and tone
- [x] Add a `POST /videos/:id/generate-character` route that:
  - Calls `generateCharacterSheet`
  - Calls `generateImage` with the character sheet prompt
  - Uploads the resulting PNG to GCS at `videos/:id/character_base.png`
  - Stores the GCS path in a new `characterBaseGcsPath` column on the `videos` table
- [x] Add `characterBaseGcsPath` (nullable string) to the `videos` schema and generate migration `0009_character_base.sql`

### 2.3 — Scene Generation Uses Reference

- [x] In `processScenes` (apps/api/routes/videos.ts), detect if `renderStyle` is `cartoon` or `mascot` and process scenes sequentially
- [x] For scene 0: call standard `generateImage` (this becomes the base); upload result and store as `characterBaseGcsPath` when not pre-generated
- [x] For scenes 1+: call `generateImageFromReference` with the scene's `visualPrompt` + the `characterBaseGcsPath` signed URL as the reference image
- [x] Export `characterBaseGcsPath` in `@repo/types` Video interface

### 2.4 — Worker & Assembly Changes

- [x] In `apps/worker/src/download.ts`, download `character_base.png` if present alongside clips and audio (for potential future use; no assembly change required in this phase)

---

## Track 3 — Subtitle Styles: Multi-Word Groups + Robustness

### Overview
All four current styles show one word at a time. Add five new styles including multi-word grouped layouts. Fix four known robustness gaps in the ASS generation pipeline. Subtitle style selection in the UI gains a visual preview thumbnail for each style.

### 3.1 — Robustness Fixes (do first — unblocks all new styles)

- [x] `generateSubtitles` now filters words before style builders: removes empty/whitespace strings and entries where `end <= start`
- [x] `toAssTime` clamps input to `Math.max(0, seconds)` — no negative timestamps possible
- [x] In `groupWords`, last element accessed with `!` non-null assertion after the filter guarantees non-empty groups
- [x] In `charsToWords` in `elevenlabs.ts`, skips characters where `starts[i] === undefined` or `ends[i] === undefined` via explicit `continue`

### 3.2 — New Single-Word Styles

- [x] **`neon_glow`** — white text, thick colored outline (`COLOR_ACCENT_ORANGE`), heavy shadow creating a bloom effect. Font size 88px, bold, bottom center.
- [x] **`oversized_pop`** — single word, 120px, all-caps, centered vertically. Black outline 5px.

### 3.3 — New Multi-Word Group Styles (3–4 words per line)

- [x] **`grouped_bold`** — groups of 3 words, bold white, 72px, black outline 3px, bottom center.
- [x] **`grouped_cinematic`** — groups of 4 words, italic warm white, 60px, no outline, heavy shadow, bottom center.
- [x] **`karaoke`** — groups of 4 words; active word highlighted in `COLOR_ACCENT_ORANGE` via ASS inline override tags.

### 3.4 — Subtitle Style Selector UI

- [x] `SubtitleStyle` union type in `@repo/types` includes all nine styles
- [x] `switch` in `generateSubtitles` handles all nine styles
- [x] Step 5 subtitle style picker groups styles as **Single Word** and **Multi Word** sections
- [x] Migration `0008_subtitle_styles.sql` generated and journaled

### 3.5 — Talking Video Subtitle Sync (Whisper)

- [x] `transcribeAudio(audioPath)` added in `apps/worker/src/transcribe.ts` — calls OpenAI Whisper with `verbose_json` + word-level timestamps; maps to `WordTimestamp[]`
- [x] `OPENAI_API_KEY` added to `apps/worker/src/env.ts`
- [x] `extractAudio` added to `apps/worker/src/ffmpeg.ts` to pull audio track from assembled clip
- [x] In `assemble.ts`, for `videoType === "talking"`, calls `transcribeAudio` on concatenated clip audio and passes result to `generateSubtitles`

---

## Track 4 — Two Video Categories: Generated vs Talking

### Overview
Videos are now either **Generated** (Grok clips with ambient audio or silence + ElevenLabs voiceover) or **Talking** (Grok generates clips with baked-in lipsync voice — UGC, short films, interviews — no ElevenLabs). The two categories have different assembly pipelines in the worker and different UI flows.

### 4.1 — Schema & Types

- [x] Add `videoType` enum to `apps/api/lib/db/schema.ts`: `"generated" | "talking"`
- [x] Set default to `"generated"` (backwards-compatible with all existing videos)
- [x] `bgmVolume` integer column already exists; default updated from 30 → 15 (15% mix); worker divides by 100
- [x] Added `talkingSubtype` nullable enum column to `videos` table
- [x] Migration `0006_video_type_talking.sql` created and added to journal
- [x] Export `VideoType` and `TalkingSubtype` enums from `@repo/types`
- [x] `splitScenes` updated to accept `videoType` param; voice endpoint guards talking videos with 400

### 4.2 — UI: Video Type Selection

- [x] Added **Video Type** selector to Step 1 (before render style picker) — two cards: Generated Video / Talking Video
- [x] When Talking is selected: render style picker hidden, voice section hidden, subtype picker shown
- [x] When Generated is selected: existing render style + voice sections shown normally
- [x] Talking info card in Step 3 (Voice step) explains lipsync flow and lets user continue without ElevenLabs
- [x] `videoType` and `talkingSubtype` wired through `onScheduleSave` → PATCH API
- [x] Pre-existing lint warnings in unrelated files fixed (zero-warning baseline restored)

### 4.3 — Prompt Changes for Talking Videos

- [x] `buildTalkingSceneMessages` in `prompts/talking.ts` provides the talking-specific scene director system (on-camera character, lipsync focus, per-subtype visual/motion modifiers)
- [x] `splitScenes` in `claude.ts` branches on `videoType === "talking"` to use the talking prompt builder
- [x] Talking scene director system prompt added to `PROMPT_REGISTRY`

### 4.4 — Pipeline Differences in Worker

- [x] `assemble.ts` branches on `video.videoType`:
  - **`"generated"`**: downloads ElevenLabs audio, applies voice speed, mixes at `bgmVolume/100`, uses ElevenLabs timestamps for subtitles
  - **`"talking"`**: skips audio download, skips `mixAudio`, uses `encodeVideoFinal` (no subtitle burn yet — Whisper is Track 3.5)
- [x] `mixAudio` updated to accept `bgmVolume` float param (default 0.15); called with `video.bgmVolume / 100`
- [x] `normalizeClip` probes for audio stream with `probeHasAudio`; clips without audio get a silent `anullsrc` track injected so `amix` filter never errors
- [x] `download.ts` makes audio/timestamps download conditional on `videoType` — talking videos skip both
- [x] `POST /api/videos/:id/scenes` allows `SCRIPT_READY` state for talking videos; uses `targetDurationSeconds` as scene-split budget when no ElevenLabs duration exists

### 4.5 — ElevenLabs Voice Step Conditional

- [x] Step 3 wizard shows lipsync info card for talking videos; Continue button calls `generateScenes` (same as Approve Voice for generated)
- [x] `POST /api/videos/:id/voice` returns `400` for talking videos

---

## Track 5 — Talking Video: UGC / Short Film / Lipsync Category Details

### Overview
Talking videos are distinct enough to deserve first-class treatment in the UI and operator extension flow. This track handles the content type taxonomy and operator extension changes.

### 5.1 — Content Type Taxonomy

- [x] `talkingSubtype` column already added in Track 4.1 migration `0006_video_type_talking.sql`
- [x] Migration already generated
- [x] Subtype picker already added to Step 1 wizard in Track 4.2

### 5.2 — Operator Extension: Talking Video Clip Generation

- [x] Updated operator queue SQL (apps/api/routes/operator.ts) to return `textExcerpt` and `videoType` via CTE JOIN with scenes + videos tables
- [x] Updated `ClaimedClip` interface (apps/extension/src/lib/api-client.ts) to include `textExcerpt` and `videoType`
- [x] Updated `TabEntry`, `FailedClipEntry`, `sendClipToTab`, retry path in background/index.ts to carry new fields
- [x] In content/index.ts `processClip`: for talking videos, builds prompt as `SAY EXACTLY: "[textExcerpt]"\n\n${motionPrompt}` so Grok generates accurate lipsync
- [x] Audio preserved on upload — GCS PUT uploads the video blob as-is (existing behaviour)

### 5.3 — Lipsync Quality Prompts per Subtype

- [x] Per-subtype `TALKING_SUBTYPE_MODIFIERS` already defined in `apps/api/prompts/talking.ts` (Track 4.3)
- [x] Modifier injected into scene director prompt via `buildTalkingSceneMessages` (Track 4.3)

---

## Track 6 — Prompt Registry: Centralised & Editable Prompt Orchestration

### Overview
All Claude prompts are currently inline strings inside `apps/api/services/claude.ts` (~550 lines). Move every prompt into a dedicated `apps/api/prompts/` directory with typed builder functions. `claude.ts` becomes thin — only API calls, no prompt strings. This makes every prompt visible, diffable, and editable in one place without touching service logic.

### 6.1 — Directory Structure

- [x] Create `apps/api/prompts/` directory with the following files:
  - `ideas.ts` — idea generation system prompt + user template builder
  - `script.ts` — script generation system prompt + style modifier map + user template builder
  - `scenes.ts` — scene director system prompt + per-render-style system overrides + user message builder
  - `character.ts` — base character sheet prompt builder (for Track 2)
  - `talking.ts` — talking video scene director system + per-subtype modifier map (for Track 5)
  - `index.ts` — re-exports everything; single import point for `claude.ts`
- [x] Each file exports: typed constants for static strings, and builder functions (e.g. `buildIdeasMessages(project)`, `buildScenesMessages(script, count, style)`) that return `{ system?: string; user: string }`

### 6.2 — Migrate Existing Prompts

- [x] Move `BENGALI_SCRIPT_SYSTEM` from `claude.ts` into `prompts/script.ts`
- [x] Move `RENDER_STYLE_SCRIPT_MODIFIERS` record into `prompts/script.ts`
- [x] Move `RENDER_STYLE_SCENE_SYSTEMS` record into `prompts/scenes.ts`
- [x] Move `SCENE_DIRECTOR_SYSTEM` into `prompts/scenes.ts`
- [x] Move the idea generation system string into `prompts/ideas.ts`
- [x] Update `claude.ts` to import all prompt builders from `prompts/index.ts` — remove all inline prompt strings
- [x] Verify `pnpm check-types` and `pnpm lint` pass with zero warnings after migration

### 6.3 — Prompt Metadata (for future UI)

- [x] Add a `PROMPT_REGISTRY` constant exported from `prompts/index.ts` — an array of `{ id, label, description, file }` objects describing each prompt family. No runtime behaviour; purely informational metadata for a future admin prompt editor UI.
- [x] Add a `GET /api/admin/prompts` route (operator-secret-gated) that returns the registry so a future UI can list what prompts exist and which files to edit

### 6.4 — Documentation

- [x] Add a `PROMPTS.md` file in `apps/api/prompts/` documenting: the purpose of each file, how to add a new render style, and how to add a new language system prompt — one page, no fluff

---

## Implementation Order

```
Week 1
  Track 6 (prompt registry) — pure refactor, unblocks all future prompt work
  Track 4.1–4.2 (schema + video type UI) — unblocks tracks 2, 3, 5

Week 2
  Track 1 (voice speed) — self-contained, ship fast
  Track 3.1 (subtitle robustness fixes) — small, high value, ship fast
  Track 4.3–4.5 (pipeline split in worker)

Week 3
  Track 3.2–3.4 (new subtitle styles + UI)
  Track 3.5 + Track 5 (Whisper + lipsync talking flow)
  Track 2 (cartoon consistency — depends on Track 4 category schema)

Week 4
  Integration testing across all tracks
  QA: generated video + talking video end-to-end with each subtitle style
  QA: voice speed 0.5×, 1×, 1.5× renders verified frame-accurate
```

---

## Acceptance Criteria (per track)

| Track | Done when |
|-------|-----------|
| 1 — Voice speed | A video rendered at 1.5× has audio and subtitles that are exactly 1/1.5 the duration of the 1× render; clips are trimmed proportionally |
| 2 — Cartoon consistency | Scenes 1–N in a cartoon video visually share the same character design as scene 0; the base image is stored in GCS |
| 3 — Subtitle styles | All 9 styles render without crash on an empty word list; karaoke style highlights the active word correctly; grouped styles show 3–4 words |
| 4 — Video categories | Generated video uses ElevenLabs + 15% BGM mix; talking video uses Grok clip audio with no ElevenLabs call made |
| 5 — Talking subtypes | Each subtype produces visibly different visual and motion prompts in the scene breakdown |
| 6 — Prompt registry | `claude.ts` contains zero inline prompt strings; all prompts importable from `prompts/index.ts`; lint passes |
