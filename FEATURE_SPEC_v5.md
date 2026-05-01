# ReelForge — Feature Enhancement Tasks

**Version:** 5.0  
**Date:** May 1, 2026  
**Depends on:** MVP phases 1–9 + FEATURE_SPEC_v3.md tracks 1–6 + FEATURE_SPEC_v4.md tracks 7–9 complete

Four feature tracks:

| Track | Title | Scope |
|-------|-------|-------|
| 10 | Video Type & Style Overhaul | UGC Video + Stories, 15 UGC visual styles, AI Clone |
| 11 | FFmpeg Pipeline Enhancements | Transitions, volume normalization, subtitle scene-boundary fix |
| 13 | UGC Character Consistency | Dedicated character description generation, neutral character sheet pre-step, server-injected CHARACTER anchor |
| 14 | Step 6 Clip Generation Live Updates | Fix clip previews not appearing, SSE stream reliability, connection status UX, queue position |

---

## Track 10 — Video Type & Style Overhaul

### Overview

Replace the "Talking / Generated" split with **UGC Video / Stories**.

- **UGC Video** (was: Talking) — AI-generated character speaks directly to camera with lipsync. The old `TalkingSubtype` (ugc, short_film, explainer…) is removed entirely and replaced by a **visual style** axis: 15 styles from Realistic to Anime to AI Clone.
- **Stories** (was: Generated) — voiceover-driven cinematic B-roll with no on-screen speaking character. Keeps the existing `RenderStyle` enum unchanged.

The `VideoType` enum DB values (`"generated"`, `"talking"`) do not change — only UI labels change.

---

### 10.0 — Shared Types (`packages/types/src/index.ts`)

- [ ] Add `UGCVisualStyle` enum **before** the `VideoType` enum:
  ```ts
  export enum UGCVisualStyle {
    Realistic     = "realistic",
    Anime         = "anime",
    Ghibli        = "ghibli",
    Mascot        = "mascot",
    Cartoon       = "cartoon",
    Pixar         = "pixar",
    ComicBook     = "comic_book",
    Watercolor    = "watercolor",
    OilPainting   = "oil_painting",
    Render3D      = "3d_render",
    Cyberpunk     = "cyberpunk",
    Fantasy       = "fantasy",
    Vintage       = "vintage",
    NeonSynthwave = "neon_synthwave",
    AIClone       = "ai_clone",
  }
  ```
- [ ] Remove `TalkingSubtype` enum entirely (breaking; handled by DB migration 10.1 and prompt change 10.3)
- [ ] In the `Video` interface: replace `talkingSubtype: TalkingSubtype | null` with `ugcVisualStyle: UGCVisualStyle | null`
- [ ] The `VideoType` enum values stay unchanged (`Generated = "generated"`, `Talking = "talking"`)

---

### 10.1 — Database Migration

**`apps/api/lib/db/schema.ts`**

- [ ] Remove the `talkingSubtypeEnum` pgEnum declaration
- [ ] Remove the `talkingSubtype: talkingSubtypeEnum("talking_subtype")` column from the `videos` table definition
- [ ] Add `ugcVisualStyle: text("ugc_visual_style")` column to the `videos` table (nullable text — not a pgEnum, avoids migrations when adding future styles)
- [ ] `VideoRow` inferred type updates automatically via Drizzle `$inferSelect`

**Migration file: `apps/api/lib/db/migrations/0013_ugc_visual_style.sql`**

```sql
ALTER TABLE "videos" DROP COLUMN "talking_subtype";
DROP TYPE IF EXISTS "public"."talking_subtype";
ALTER TABLE "videos" ADD COLUMN "ugc_visual_style" text;
```

- [ ] Add the migration entry to `apps/api/lib/db/migrations/meta/_journal.json` as entry `0013`

---

### 10.2 — API: Replace `talkingSubtype` with `ugcVisualStyle`

- [ ] In all video create and patch request body schemas (`apps/api/routes/videos.ts` and any other route that accepts video fields): replace the `talkingSubtype` field with `ugcVisualStyle` (type: string, optional)
- [ ] In the scene-generation pipeline (wherever `video.talkingSubtype` was read to select the prompt modifier): replace with `video.ugcVisualStyle`
- [ ] **AI Clone guard** — in the scene-generation route, before dispatching to the prompt builder, add a validation check:
  ```ts
  if (video.ugcVisualStyle === "ai_clone" && !video.characterBaseGcsPath) {
    return reply.code(400).send({
      error: { message: "AI Clone style requires a character reference image. Upload one before generating scenes.", code: "AI_CLONE_IMAGE_REQUIRED" }
    });
  }
  ```
- [ ] Grep the entire repo (`apps/api/`, `apps/web/`, `packages/`) for `talkingSubtype` and `TalkingSubtype` — update every occurrence. The largest surface is `apps/web/components/wizard/steps/step-1-idea.tsx` (which is substantially rewritten by Track 10.4 anyway) and `apps/web/lib/api-client.ts`
- [ ] Remove the import of `TalkingSubtype` from `@repo/types` everywhere it was used across all workspaces

---

### 10.3 — Prompt: UGC Visual Style Modifiers (`apps/api/prompts/talking.ts`)

Replace `TALKING_SUBTYPE_MODIFIERS` with `UGC_VISUAL_STYLE_MODIFIERS` keyed by `UGCVisualStyle` values.

- [ ] Remove `TalkingSubtypeModifier` interface and `TALKING_SUBTYPE_MODIFIERS` export
- [ ] Add `UGCVisualStyleModifier` interface (same shape as the removed one: `{ visual: string; motion: string }`)
- [ ] Add `UGC_VISUAL_STYLE_MODIFIERS: Record<string, UGCVisualStyleModifier>` with one entry per `UGCVisualStyle` value. Use the `visual` field to describe the art-direction for the CHARACTER and SETTING sections of the scene prompt; use the `motion` field for delivery and camera style. Full values:

  | Key | `visual` | `motion` |
  |-----|----------|---------|
  | `realistic` | Natural skin tones and practical lighting. Clothing and setting are unconstrained — match the content mood. No stylisation, no filters. The character looks like a real human on camera. | Natural handheld or subtle push-in camera. Character delivery is grounded and conversational — real expressions, real energy. |
  | `anime` | Flat cel-shaded character with bold black outlines, large expressive eyes, vibrant Japanese anime colour palette, and high-contrast dramatic lighting. Hair is stylised with sharp highlights. Background is semi-detailed anime environment. | Energetic anime-style delivery with exaggerated expressions — wide eyes on shock, narrow eyes for intensity. Camera stays tight on the face. Fast cuts in motion are implied by the pose. |
  | `ghibli` | Soft watercolour painterly aesthetic in the style of Studio Ghibli. Rounded warm character design, hand-painted backgrounds, muted natural colour palette with warm highlights. Character has gentle expressive eyes and soft outlines. | Warm, unhurried delivery — the character speaks with genuine emotion and slight hesitation. Camera is a gentle slow push-in that feels handcrafted and human. |
  | `mascot` | Bold simplified character design with thick black outlines, oversized head, exaggerated friendly features, and brand-mascot proportions. Could be any object, animal, or abstract shape brought to life as a mascot. Flat or lightly shaded. Colour-popping background. | Bouncy, enthusiastic delivery with broad physical gestures. The character's whole body reacts. Camera is locked-off or very slightly zoomed in — lets the mascot's movement carry the frame. |
  | `cartoon` | Saturated cartoon colour palette, exaggerated proportions, classic 2D cartoon style with smooth clean lines. Expressive rubber-hose limbs. Background is illustrated cartoon environment. | Classic cartoon energy — rubbery movement, big facial reactions, comedic timing. Camera is punchy and direct. |
  | `pixar` | High-quality 3D CGI render in the style of Pixar Animation. Subsurface scattering on skin, physically based materials, expressive oversized eyes, smooth character design. Studio-quality HDRI lighting. | Emotionally rich delivery — the character's face conveys every micro-expression. Camera does a slow cinematic push-in to emphasise the emotional peak. |
  | `comic_book` | Halftone dot pattern overlay, bold black ink outlines in Marvel/DC comic style, high-contrast two-tone colouring with dramatic shadows. Action lines and panel-border feel. Speech-bubble energy without actual text bubbles. | Dramatic, punchy delivery with bold gesture. Character leans into the frame like a panel hero. Camera angle is slightly heroic — low angle or Dutch tilt. |
  | `watercolor` | Soft wet-on-wet watercolour washes with visible paper texture and paint bleed at edges. Muted pastel palette. Loose outlines. Background bleeds into character edges. | Gentle, reflective delivery. Soft body language — slight lean, quiet gestures. Camera barely moves — a delicate held frame. |
  | `oil_painting` | Visible impasto brushstrokes and rich oil paint texture. Classical portrait style with dramatic chiaroscuro lighting. Deep saturated background with shallow depth of field. Character looks painted from life. | Deliberate, measured delivery — like a classical subject sitting for a portrait. One slow push-in over the duration of the scene. |
  | `3d_render` | Photorealistic 3D CGI render. Detailed PBR textures on skin, hair, and clothing. Studio HDRI three-point lighting with subtle specular highlights. Background is a rendered environment with depth. | Clean, polished delivery that matches the high-fidelity look. Subtle camera movement — slight push or rotation — that showcases the 3D space. |
  | `cyberpunk` | Neon-lit dark urban environment with holographic overlays, rain-slicked reflections, and high-tech low-life aesthetic. Character has LED accent lighting and futuristic clothing. Deep shadow with neon pink/blue/green rim light. | Intense, urgent delivery with a conspiratorial edge. Camera is close — ECU is appropriate for this style. Slight handheld shake. |
  | `fantasy` | High fantasy setting with magical particle effects, bioluminescent ambient lighting, and ethereal glow. Character wears fantasy costume appropriate to the content. Rich saturated colour with magical realism. | Awe-inspiring or dramatic delivery depending on script. Character's gestures have weight and purpose. Camera does a slow reveal-style push-in. |
  | `vintage` | Film grain overlay, desaturated warm sepia-and-amber tone, retro 70s/80s photography aesthetic. Light leaks at frame edges. Character styling appropriate to the era. Slightly soft focus. | Warm, nostalgic delivery — relaxed pace, authentic feeling. Camera is slightly unsteady as if shot on Super 8. |
  | `neon_synthwave` | Retrowave aesthetic: neon pinks, purples, and electric blues against a dark grid-horizon background. Chrome and glass textures. Character has synthwave outfit with neon accents. Deep shadow with coloured rim lights. | High-energy, confident delivery. The character owns every word. Slow camera pull-back to reveal the neon landscape. |
  | `ai_clone` | **Intentionally unreachable — see 10.3a.** This entry exists only as documentation. The `buildTalkingSceneMessages` function checks `if (ugcVisualStyle === "ai_clone")` before consulting the map and injects the override block instead. This map entry is never evaluated at runtime. | *(same — unreachable)* |

- [ ] Update `buildTalkingSceneMessages` signature: replace `subtype?: string` parameter with `ugcVisualStyle?: string`; use `UGC_VISUAL_STYLE_MODIFIERS[ugcVisualStyle]` to look up the modifier
- [ ] Update the section header in the injected prompt: replace `## Subtype rules: ${subtype}` with `## Visual style: ${ugcVisualStyle?.replace(/_/g, " ").toUpperCase()}`

**10.3a — AI Clone special case**

The `ai_clone` style does not generate a character description — the character's appearance comes from the uploaded reference image.

- [ ] When `ugcVisualStyle === "ai_clone"`: inject a different section into the system prompt instead of the normal visual modifier:

  ```
  ## Visual style: AI CLONE
  The character's appearance comes entirely from the uploaded reference image provided by the user.
  DO NOT invent any character details (hair, skin, face, clothing, build).

  CHARACTER ANCHOR RULE OVERRIDE — applies only to this style:
  - Scene 0: write CHARACTER section as exactly: "CHARACTER: Use the face, hair, skin tone, and identity from the uploaded reference image verbatim. Do not alter or describe any physical features."
  - Scenes 1+: copy that CHARACTER line word for word — identical across every scene.

  All other sections (EXPRESSION, FRAMING, SETTING, LIGHTING, COLOUR GRADE) follow the standard realistic rules.
  ```

- [ ] Implement this override in `buildTalkingSceneMessages`: check `if (ugcVisualStyle === "ai_clone")` before looking up `UGC_VISUAL_STYLE_MODIFIERS`, and inject the override block instead

---

### 10.4 — Frontend: Wizard Type Picker & Visual Style Grid

**Step 1 of the video creation wizard (`apps/web/`)**

- [ ] Add a top-level **video type picker** as the first choice when creating a video. Two options:
  - **UGC Video** — "AI-generated talking character with lipsync. Pick your visual style below."
  - **Stories** — "Voiceover-driven B-roll. No on-screen character speaking."
- [ ] When **UGC Video** is selected: show a 15-card visual style grid (one card per `UGCVisualStyle`). Each card shows: style name + one-line description. Cards are organised in a 3-column grid. Selected card uses the `--accent-primary` border highlight (same pattern as other wizard pickers).
  - **AI Clone card special behaviour**: when selected, show an inline image upload sub-step below the grid — "Upload your character image (face reference)". Flow:
    1. Frontend calls `POST /api/videos/:id/character-image/upload-url` (new endpoint — see below) → receives `{ uploadUrl: string; gcsPath: string }`
    2. Frontend `PUT`s the image bytes directly to the signed GCS `uploadUrl`
    3. Frontend calls `PATCH /api/videos/:id` with `{ characterBaseGcsPath: gcsPath }` to persist the path
    4. Advance button is disabled until `characterBaseGcsPath` is set on the video
  - Accepted file types: `image/jpeg`, `image/png`, `image/webp`. Max size: 10 MB. Required before advancing.
  - All other UGC style cards advance without extra sub-steps.
- [ ] **New API endpoint: `POST /api/videos/:id/character-image/upload-url`** (add to `apps/api/routes/videos.ts`, Clerk-auth-gated, same ownership check as other video routes):
  - Generates a GCS signed PUT URL for `videos/${videoId}/character_base.<ext>` (derive extension from the `contentType` body param)
  - Body: `{ contentType: "image/jpeg" | "image/png" | "image/webp" }`
  - Returns: `{ data: { uploadUrl: string; gcsPath: string } }`
  - Uses the existing `generateSignedUploadUrl` helper from `apps/api/lib/storage.ts` (same pattern as clip upload-url endpoint in operator routes)
- [ ] When **Stories** is selected: show the existing `RenderStyle` 7-card grid unchanged.
- [ ] Update all wizard labels: everywhere "Talking Video" appears, replace with "UGC Video"; everywhere "Generated Video" appears, replace with "Stories".
- [ ] Remove all references to `TalkingSubtype` in wizard components. The `ugcVisualStyle` field is the new field sent to the API on video creation/patch.
- [ ] **Wizard state restoration** — when a user opens the wizard for an existing video (e.g. navigating back, or re-entering the wizard), pre-select the saved values: if `video.videoType === "talking"` pre-select UGC Video and highlight `video.ugcVisualStyle` in the style grid; if `video.videoType === "generated"` pre-select Stories and highlight `video.renderStyle`. If `video.ugcVisualStyle === "ai_clone"` and `video.characterBaseGcsPath` is already set, show a thumbnail of the uploaded image with a "Replace" option instead of the blank upload prompt.
- [ ] `characterBaseGcsPath` note: this field already exists on `Video` and was previously described as "cartoon/mascot only". Remove that restriction — it is now used for AI Clone as the face reference image. No DB change needed.

---

## Track 11 — FFmpeg Pipeline Enhancements

### Overview

Three independent changes to `apps/worker/src/`:

1. **Transitions** — replace hard cuts with smooth `xfade`/`acrossfade` transitions between every clip, always-on, with predefined presets per video type and render style.
2. **Volume normalization** — apply EBU R128 `loudnorm` to each UGC clip's audio during normalization so perceived loudness is consistent across lipsync clips.
3. **Subtitle scene boundaries** — teach the subtitle grouper about clip cut times so grouped subtitle styles never display words from two different clips in a single subtitle card.

All three changes are independent and can be implemented in any order.

---

### 11.0 — Smooth Transitions Between Clips (`apps/worker/src/ffmpeg.ts`)

**Transition preset table — applied based on video type and render style:**

| Condition | FFmpeg transition | Duration |
|-----------|-------------------|----------|
| `videoType === "talking"` (any UGC visual style) | `fade` | 0.3 s |
| `videoType === "generated"` + `renderStyle` is `cinematic` or `stock_footage` | `fade` | 0.5 s |
| `videoType === "generated"` + `renderStyle` is `cartoon` or `animation_2d` | `dissolve` | 0.4 s |
| `videoType === "generated"` + `renderStyle` is `motion_graphics` | `zoomin` | 0.3 s |
| `videoType === "generated"` + `renderStyle` is `mascot` | `dissolve` | 0.4 s |
| `videoType === "generated"` + `renderStyle` is `whiteboard` | `fade` | 0.3 s |
| Any other / null | `fade` | 0.4 s |

**Changes:**

- [ ] Add `TransitionPreset` type: `{ transition: string; duration: number }`
- [ ] Add `TRANSITION_PRESETS` constant that encodes the table above as a lookup structure
- [ ] Add `getTransitionPreset(videoType: string, renderStyle: string | null): TransitionPreset` — returns the preset from the table; falls back to `{ transition: "fade", duration: 0.4 }` for unrecognised values
- [ ] Add `concatenateWithTransitions(normalizedPaths: string[], preset: TransitionPreset, dir: string): Promise<string>`:

  **Algorithm:**

  1. If `normalizedPaths.length === 0`: throw an error.
  2. If `normalizedPaths.length === 1`: copy the single file to `join(dir, "concatenated.mp4")` with a simple `-c copy` FFmpeg call and return. No transitions needed.
  3. Probe the actual duration of every normalized clip using `probeDuration`. Run probes in batches of `NORMALIZE_CONCURRENCY` (3) to stay within Cloud Run memory limits.
  4. **Clamp guard**: if `preset.duration >= Math.min(...durations)`, set effective `transitionDuration = Math.min(...durations) * 0.4`. This prevents `xfade` offset from going negative.
  5. Build the `filter_complex` string programmatically for N clips (N-1 transitions):

     ```
     Video chain labels: v1, v2, ..., v{N-2}, vfinal
     Audio chain labels: a1, a2, ..., a{N-2}, afinal

     Video filter for transition i (i = 1..N-1):
       prevVLabel = (i === 1) ? "0:v" : `v${i-1}`
       nextVLabel = (i === N-1) ? "vfinal" : `v${i}`
       offset = sum(durations[0..i-1]) - i * transitionDuration   (clamped to > 0)
       line: `[${prevVLabel}][${i}:v]xfade=transition=${preset.transition}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${nextVLabel}]`

     Audio filter for transition i (i = 1..N-1):
       prevALabel = (i === 1) ? "0:a" : `a${i-1}`
       nextALabel = (i === N-1) ? "afinal" : `a${i}`
       line: `[${prevALabel}][${i}:a]acrossfade=d=${transitionDuration.toFixed(3)}:c1=tri:c2=tri[${nextALabel}]`

     Offset formula derivation:
       After chaining transitions, the output timeline advances by (d[i] - transitionDuration) per clip
       offset[0] = d[0] - transitionDuration
       offset[k] = sum(d[0..k]) - (k+1) * transitionDuration
     ```

  6. Run FFmpeg with all input files (`-i clip0 -i clip1 ...`), the `filter_complex` string, mapping `[vfinal]` and `[afinal]`:
     ```
     ffmpeg -y -i clip0 -i clip1 ... -filter_complex "<built string>"
            -map [vfinal] -map [afinal]
            -c:v libx264 -crf 18 -preset fast
            -c:a aac -b:a 192k -ar 44100 -pix_fmt yuv420p
            concatenated.mp4
     ```
     > **CRF 18 here, not 23.** `burnSubtitles` (and `mixAudio` for generated videos) will re-encode this output again. Using CRF 18 for the intermediate file preserves more quality headroom before the second encode. The final output (`burnSubtitles`) uses CRF 23 as before.
  7. Return `join(dir, "concatenated.mp4")`.

- [ ] Keep the existing `concatenateClips` function in place — it is still referenced in tests or may be needed as a fallback. Do not delete it.
- [ ] Note: `xfade` and `acrossfade` require FFmpeg ≥ 4.3. The Docker image (`jrottenberg/ffmpeg:latest`) satisfies this. No Dockerfile changes needed.

**`apps/worker/src/assemble.ts`**

- [ ] Import `concatenateWithTransitions` and `getTransitionPreset` from `./ffmpeg.js`
- [ ] In **both** the UGC/talking branch and the generated/stories branch: replace the call to `concatenateClips(normalizedPaths, assets.dir)` with:
  ```ts
  const transitionPreset = getTransitionPreset(video.videoType, video.renderStyle ?? null);
  const concatenatedPath = await concatenateWithTransitions(normalizedPaths, transitionPreset, assets.dir);
  ```

---

### 11.1 — Volume Normalization for UGC Videos (`apps/worker/src/ffmpeg.ts`)

Apply single-pass EBU R128 loudness normalization to each UGC clip's audio during the normalize step, so clips with different recorded loudness levels play at consistent perceived volume in the final assembled video.

- [ ] Add `normalizeAudio: boolean = false` parameter to `normalizeClip(clip: ClipEntry, dir: string, normalizeAudio = false): Promise<string>`
- [ ] When `normalizeAudio === true` AND the clip has audio (`hasAudio === true`): add `-af "loudnorm=I=-23:TP=-1.5:LRA=11"` to the FFmpeg args alongside the existing `-vf` video filter. **Do not use `-filter_complex` here** — it conflicts with `-vf` and FFmpeg will reject the command. `-af` and `-vf` coexist correctly as separate filter chains.
  The relevant args section becomes:
  ```
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
  "-af", "loudnorm=I=-23:TP=-1.5:LRA=11",   // added when normalizeAudio === true
  "-map", "0:v:0",
  "-map", "0:a:0",
  "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
  ```
- [ ] When `normalizeAudio === true` AND the clip has NO audio (`hasAudio === false`): do not add `-af loudnorm` — the injected `anullsrc` silent stream is already silent; normalising it achieves nothing and wastes CPU. Keep `-map 1:a:0` as-is.
- [ ] Add `normalizeAudio: boolean = false` parameter to `normalizeAllClips(clips, dir, normalizeAudio = false): Promise<string[]>` and thread it through to each `normalizeClip` call.

**`apps/worker/src/assemble.ts`**

- [ ] In the **UGC/talking branch**: pass `true` for `normalizeAudio`:
  ```ts
  const normalizedPaths = await normalizeAllClips(untrimmedClips, assets.dir, true);
  ```
- [ ] In the **generated/stories branch**: pass `false` (or omit — default is false). Generated clip audio is fully muted in `mixAudio` anyway, so normalization there has no effect and would waste CPU.

---

### 11.2 — Subtitle Scene Boundary Fix (`apps/worker/src/subtitles.ts` + `apps/worker/src/assemble.ts`)

**Root cause:** `groupWords()` groups words purely by count (e.g., 4 words per group) with no awareness of scene/clip boundaries. For UGC videos this causes a visible bug: a 4-word grouped subtitle shows 2 words from scene N's lipsync audio and 2 words from scene N+1's audio, straddling the visual cut.

**Fix:** Add an optional `sceneBoundaries` parameter (sorted array of timestamps in seconds marking where each scene ends) to `generateSubtitles`. The `groupWords` function checks each word against the next unprocessed boundary; if the word's start time is at or past the boundary, flush the current group first before starting a new one.

**`apps/worker/src/subtitles.ts`**

- [ ] Update `groupWords` signature:
  ```ts
  function groupWords(
    words: WordTimestamp[],
    maxSize: number,
    sceneBoundaries?: number[],
  ): WordTimestamp[][]
  ```
- [ ] Updated `groupWords` logic:
  ```
  sorted boundaries = [...(sceneBoundaries ?? [])].sort ascending
  boundaryIdx = 0

  for each word:
    while boundaryIdx < boundaries.length AND word.start >= boundaries[boundaryIdx]:
      if current is non-empty → push current as group, reset current
      advance boundaryIdx
    push word into current
    if current.length >= maxSize OR word ends with [.!?;:]:
      push current as group, reset current

  if current is non-empty → push as final group
  ```
- [ ] Update `generateSubtitles` signature:
  ```ts
  export async function generateSubtitles(
    words: WordTimestamp[],
    style: SubtitleStyle,
    dir: string,
    sceneBoundaries?: number[],
  ): Promise<string>
  ```
- [ ] Pass `sceneBoundaries` through from `generateSubtitles` into every grouped style builder that calls `groupWords`: `buildMinimal`, `buildCinematic`, `buildGroupedBold`, `buildGroupedCinematic`, `buildKaraoke`
- [ ] Single-word style builders (`buildBoldPop`, `buildWordHighlight`, `buildNeonGlow`, `buildOversizedPop`) do not call `groupWords` and are unchanged

**`apps/worker/src/assemble.ts`**

- [ ] For **UGC/talking videos**: after `normalizeAllClips` and before `extractAudio`, probe the actual duration of each normalized clip in parallel (batches of `NORMALIZE_CONCURRENCY = 3`), then compute cumulative scene end times (all but the last clip — there is no cut after the final clip):
  ```ts
  const clipDurations = await ... // probeDuration for each normalizedPath, in sceneIndex order
  const sceneBoundaries: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < clipDurations.length - 1; i++) {
    cumulative += clipDurations[i]!;
    sceneBoundaries.push(cumulative);
  }
  ```
- [ ] Pass `sceneBoundaries` to `generateSubtitles` in the UGC branch:
  ```ts
  const subtitlesPath = await generateSubtitles(
    whisperTimestamps,
    video.subtitleStyle,
    assets.dir,
    sceneBoundaries,
  );
  ```
- [ ] For **generated/stories videos**: also compute `sceneBoundaries` from the `sceneDurations` map (already built from word timestamps). This is optional but recommended for correctness:
  ```ts
  // sceneDurations is a Map<sceneIndex, durationSeconds> already computed above
  const sortedIndices = [...sceneDurations.keys()].sort((a, b) => a - b);
  const storiesBoundaries: number[] = [];
  let cum = 0;
  for (let i = 0; i < sortedIndices.length - 1; i++) {
    cum += sceneDurations.get(sortedIndices[i]!)!;
    storiesBoundaries.push(cum);
  }
  ```
  Pass `storiesBoundaries` to the `generateSubtitles` call in the generated branch.

> **Note on transition offset:** Clip durations probed after normalization already reflect actual clip lengths. The `sceneBoundaries` timestamps are in terms of the Whisper audio transcript timeline, which is based on the concatenated audio. Because transitions shorten the video timeline by `(N-1) × transitionDuration` but `acrossfade` blends the audio over the same window, the word timestamps from Whisper already account for this. The computed `sceneBoundaries` will be accurate to within ±transitionDuration/2 (≤ 0.25 s), which is sufficient to prevent cross-clip subtitle grouping. No further correction is needed.

---

## Track 13 — UGC Character Consistency

### Overview

Replace the current character approach — where Claude invents a character in scene 0 and is asked to copy it verbatim into subsequent scenes — with a deterministic three-phase pipeline:

- **Phase A** — Claude generates a locked character description in a dedicated pre-call, before scene generation begins
- **Phase B** — That description drives a clean neutral character sheet image (front-facing, flat lighting, plain gradient background — a stable reference instead of a dramatically composed scene 0 shot)
- **Phase C** — The server injects the fixed character description into every scene prompt; Claude only writes EXPRESSION, FRAMING, SETTING, LIGHTING, and COLOUR GRADE

**Applies to all `ugcVisualStyle` values except `ai_clone`** — AI Clone already receives a user-uploaded face reference via Track 10.4 and uses the 10.3a CHARACTER override. Both Phase A and Phase B are skipped for `ai_clone`.

**Depends on Track 10** being complete (specifically 10.0, 10.1, 10.2, 10.3).

---

### 13.0 — Types + Database

**`packages/types/src/index.ts`**

- [ ] Add `ugcCharacterDescription: string | null` to the `Video` interface

**`apps/api/lib/db/schema.ts`**

- [ ] Add `ugcCharacterDescription: text("ugc_character_description")` column to the `videos` table (nullable text)
- [ ] `VideoRow` inferred type updates automatically via Drizzle `$inferSelect`

**Migration file: `apps/api/lib/db/migrations/0014_ugc_character_description.sql`**

```sql
ALTER TABLE "videos" ADD COLUMN "ugc_character_description" text;
```

- [ ] Add the migration entry to `apps/api/lib/db/migrations/meta/_journal.json` as entry `0014`

---

### 13.1 — Character Description Prompt (`apps/api/prompts/character.ts`)

- [ ] Add `buildUGCCharacterDescriptionPrompt(project: ProjectRow, ugcVisualStyle: string): PromptPair`

- [ ] **System prompt:** "You are a character designer creating a locked visual identity for a short-form video character. Your output will be used as the CHARACTER section of an AI image generation prompt and must produce the same person or character reliably across many different scenes."

- [ ] **User prompt:** instructs Claude to write a 50–80 word character description using exactly these five labelled lines in this order:
  ```
  HAIR: [exact colour, length, style, any distinguishing detail]
  FACE: [skin tone with warmth description, eye colour, brow character]
  CLOTHING: [specific garment + exact colour + texture detail]
  FEATURE: [one unique anchoring detail — earring, freckle, beauty mark, tattoo, etc.]
  BUILD: [brief impression — apparent age, physique]
  ```

- [ ] The `ugcVisualStyle` value informs the aesthetic. Inject a one-line style context into the user prompt before the output instruction based on the style key:

  | `ugcVisualStyle` | Style context line |
  |---|---|
  | `realistic` | Natural proportions, real-world clothing and skin tones, no stylisation |
  | `anime` | Large expressive eyes, cel-shaded skin tone, stylised hair with sharp highlights, vibrant saturated colour palette |
  | `ghibli` | Rounded soft features, warm muted natural colours, gentle expressive eyes, painterly soft-outline feel |
  | `pixar` | Oversized expressive eyes, smooth 3D proportions, physically-based material descriptions (subsurface skin, fabric texture) |
  | `cartoon` | Exaggerated proportions, bold saturated colours, thick black outline feel, rubbery limbs |
  | `mascot` | Could be any object or animal brought to life; large simplified head, oversized friendly features, bold flat colour |
  | `comic_book` | Bold ink-line feel, high-contrast two-tone colouring, heroic or dramatic proportions |
  | `watercolor` | Soft features, slightly blurred edges, muted pastel palette, loose organic outline |
  | `oil_painting` | Classical portrait proportions, rich deep colours, painterly impasto texture feel |
  | `3d_render` | Photorealistic 3D proportions, PBR-appropriate texture descriptions (SSS skin, woven fabric, specular highlights) |
  | `cyberpunk` | Futuristic clothing with LED accents, neon-lit skin tone descriptions, chrome and glass textures |
  | `fantasy` | Fantasy costume appropriate to the content, magical or ethereal features, rich saturated colours |
  | `vintage` | Era-appropriate styling (70s/80s), slightly desaturated warm colour descriptions, retro clothing details |
  | `neon_synthwave` | Synthwave outfit with neon accents, chrome reflections, electric colour palette (pink/purple/blue) |

- [ ] User prompt ends with: `"Output ONLY the five-line character description. No preamble. No scene context. No explanation."`

---

### 13.2 — Claude Service (`apps/api/services/claude.ts`)

- [ ] Add `generateUGCCharacter(project: ProjectRow, ugcVisualStyle: string): Promise<string>` function
- [ ] Builds prompt via `buildUGCCharacterDescriptionPrompt(project, ugcVisualStyle)`
- [ ] Calls Claude with `max_tokens: 200` — the output is short and tightly bounded
- [ ] Returns the raw text content of the response (the five-line character description string, no JSON parsing)

---

### 13.3 — Talking Prompt Update (`apps/api/prompts/talking.ts`)

- [ ] In `buildTalkingSceneMessages`: when `characterNote` (the pre-generated character description from Phase A) is provided, replace the existing CHARACTER LOCK block in the user prompt with:

  ```
  CHARACTER ANCHOR (FIXED — DO NOT MODIFY):
  The character has already been defined. Copy the following text verbatim as your CHARACTER section in every single scene — scene 0 and all subsequent scenes. Do not invent, rephrase, summarise, or change a single word.

  CHARACTER: ${characterNote}

  For each scene you write ONLY: EXPRESSION, FRAMING, SETTING, LIGHTING, COLOUR GRADE.
  The CHARACTER line in every scene is always exactly: "CHARACTER: ${characterNote}"
  ```

- [ ] Remove the "Scene 0: invent and write the complete character anchor..." and "Scenes 1+: copy the CHARACTER section from scene 0 EXACTLY..." instructions from the CHARACTER LOCK block when `characterNote` is present — they are replaced by the fixed anchor above
- [ ] When `characterNote` is null (fallback path or non-UGC context): keep the existing CHARACTER LOCK behaviour unchanged

---

### 13.4 — Scene Generation Pipeline (`apps/api/routes/videos.ts`)

This task modifies `processScenes` and the `splitScenes` call it makes. **Tracks 10.2 and 13.4 both touch these function signatures and must be applied together in one edit.** The final signatures after both tracks are applied:

```ts
// processScenes — talkingSubtype renamed to ugcVisualStyle (Track 10.2), no new params
async function processScenes(
  videoId: string,
  script: string,
  durationSeconds: number,
  videoType: string,
  renderStyle?: string | null,
  ugcVisualStyle?: string | null,   // was: talkingSubtype
  characterNote?: string | null,
): Promise<void>

// splitScenes in claude.ts — same rename, effectiveCharacterNote passed as characterNote
splitScenes(script, durationSeconds, videoType, renderStyle, ugcVisualStyle, effectiveCharacterNote)
```

The changes restructure `processScenes` into this execution order:

**Step 1 — Move video row query to top of function (before `splitScenes`):**
- [ ] The current code queries the video row *after* the scene insert to read `characterBaseGcsPath`. Move this query to the very top of the `try` block — before `splitScenes` is called — and expand it to also select `ugcCharacterDescription` and `projectId`:
  ```ts
  const [videoRow] = await db
    .select({
      characterBaseGcsPath: videos.characterBaseGcsPath,
      ugcCharacterDescription: videos.ugcCharacterDescription,
      projectId: videos.projectId,
    })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);
  let charBase: string | null = videoRow?.characterBaseGcsPath ?? null;
  let charBaseSignedUrl: string | null = charBase
    ? await generateSignedReadUrl(charBase, ASSET_URL_TTL_MINUTES)
    : null;
  ```
- [ ] Remove the original video row query that currently sits after the scene insert — it is fully replaced by this earlier query

**Phase A — Character description (runs immediately after the video row query, before `splitScenes`):**
- [ ] Condition: `videoType === "talking"` AND `ugcVisualStyle !== "ai_clone"`
- [ ] If `videoRow.ugcCharacterDescription` is null (first generation):
  - Fetch the project row: `const [project] = await db.select().from(projects).where(eq(projects.id, videoRow.projectId)).limit(1)`
  - Call `generateUGCCharacter(project, ugcVisualStyle)`
  - Store: `await db.update(videos).set({ ugcCharacterDescription: result, updatedAt: new Date() }).where(eq(videos.id, videoId))`
  - Set local: `const effectiveCharacterNote = result`
- [ ] If `videoRow.ugcCharacterDescription` is already set (re-generation — reuse, no new Claude call):
  - Set local: `const effectiveCharacterNote = videoRow.ugcCharacterDescription`
- [ ] For `ai_clone` or non-UGC video types: `const effectiveCharacterNote: string | null = null`

**`splitScenes` call — update the existing call (do not add a new one):**
- [ ] Pass `ugcVisualStyle` and `effectiveCharacterNote` to the existing `splitScenes` call:
  ```ts
  const sceneList = await splitScenes(
    script, durationSeconds, videoType, renderStyle, ugcVisualStyle, effectiveCharacterNote,
  );
  ```

**Phase B — Character sheet image (after scene insert, before image loop):**
- [ ] Condition: `videoType === "talking"` AND `ugcVisualStyle !== "ai_clone"` AND `charBase` is null
- [ ] Build the neutral character sheet prompt:
  ```ts
  const sheetPrompt = `CHARACTER: ${effectiveCharacterNote}. Front-facing. Neutral resting expression. Soft flat even lighting from front. Plain light gradient background. Full figure visible from head to mid-torso. 9:16 vertical frame. Character reference sheet.`;
  ```
- [ ] Call `generateImage(sheetPrompt)`, upload to `videos/${videoId}/character_sheet.jpg`, store as `characterBaseGcsPath` on the video, and update `charBase` / `charBaseSignedUrl` for the loop
- [ ] If `charBase` was already set (re-generation, or AI Clone upload from Track 10.4): skip entirely

**Phase C — Scene image loop (inside the existing loop):**
- [ ] Add `const UGC_REFERENCE_STRENGTH = 0.65` constant at module level
- [ ] Update `imagePrompt` construction — for UGC videos use `scene.visualPrompt` directly (CHARACTER is already embedded by Claude); for all other types keep `withCharacterNote`:
  ```ts
  const imagePrompt = videoType === "talking"
    ? scene.visualPrompt
    : withCharacterNote(scene.visualPrompt, characterNote);
  ```
- [ ] Update the `generateImageFromReference` call to pass UGC strength:
  ```ts
  const imageBuffer = useRef
    ? await generateImageFromReference(
        imagePrompt,
        charBaseSignedUrl!,
        videoType === "talking" ? UGC_REFERENCE_STRENGTH : 0.85,
      )
    : await generateImage(imagePrompt);
  ```
- [ ] The existing `if (scene.sceneIndex === 0 && !charBase)` block inside the loop is now unreachable for UGC videos — Phase B always sets `charBase` before the loop. Leave it in place as it remains the mechanism for non-UGC styles

---

## Track 14 — Step 6: Clip Generation Live Updates

### Overview

Two bugs prevent the "Generating clips" step from working correctly:

1. **Clip previews don't appear** — completed clip URLs are signed with a short TTL in the operator `complete` endpoint. By the time the SSE event reaches the browser and React renders the `<video>` element, the URL has already expired.
2. **Progress stops updating** — the SSE connection is established with the Clerk session token fetched at hook initialisation. Clerk tokens expire (~1 hour). When the token expires the stream silently dies; the reconnection logic re-fires but reuses the same cached stale token, so every reconnect attempt fails too.

This track fixes both root causes and adds the UX polish that makes the step feel live: real connection status feedback, a heartbeat watchdog, and a working queue position indicator.

No DB changes required. This track is independent of Tracks 10–13 and can be implemented in any order.

---

### 14.0 — Fix clip preview URL TTL (`apps/api/routes/operator.ts`)

The `POST /api/operator/clips/:id/complete` endpoint signs the clip URL before embedding it in the SSE `CLIP_DONE` event. That signed URL is the one the frontend `<video>` element uses to render the preview.

- [ ] Import `ASSET_URL_TTL_MINUTES` (already defined in `apps/api/routes/videos.ts`) or move it to a shared constant in `apps/api/lib/storage.ts` so both files can use it without duplication
- [ ] In the `complete` handler, replace the short TTL used for the clip signed read URL with `ASSET_URL_TTL_MINUTES` (7 days). This single change fixes the primary bug — previews will load and remain valid for the full duration of the wizard session and beyond

---

### 14.1 — Fix SNAPSHOT clip URLs (`apps/api/routes/videos.ts`)

The `GET /api/videos/:id/progress` SSE endpoint sends a `SNAPSHOT` event on initial connection containing all clips and their current status. For clips already in `"done"` state this snapshot includes the stored `clipUrl`. If that stored URL was signed with the short TTL it is already expired when the SNAPSHOT arrives after a reconnect.

- [ ] In the SNAPSHOT builder, for any clip with `status === "done"` and a non-null `clipUrl` (GCS path): generate a fresh signed read URL using `ASSET_URL_TTL_MINUTES` instead of using the stored URL directly
- [ ] This ensures that reconnecting to the stream after a network blip or token refresh immediately delivers valid, loadable clip previews without requiring a page reload

---

### 14.2 — Auth token refresh on reconnect (`apps/web/lib/hooks/useClipProgress.ts`)

The hook opens the SSE stream with `Authorization: Bearer <token>` in the fetch headers. The token is obtained once and reused across reconnect attempts — if it has expired, every reconnect attempt returns a 401 and the exponential backoff eventually gives up.

- [ ] On **every** reconnect attempt (including the initial connection), call `await getToken({ skipCache: true })` to obtain a guaranteed-fresh Clerk token immediately before the `fetch` call
- [ ] Do **not** cache the token in a ref or state variable between connections — always request it fresh per connection attempt
- [ ] This makes the SSE stream survive across the full clip generation session regardless of how long it takes

---

### 14.3 — Heartbeat watchdog (`apps/web/lib/hooks/useClipProgress.ts`)

The SSE heartbeat is emitted every 15 seconds by the server. If the connection silently drops (TCP timeout, mobile network switch, laptop sleep), no error event fires — the fetch stream just stops producing data. The current code has no mechanism to detect this.

- [ ] Add a watchdog timer: reset a 45-second `setTimeout` on every received SSE event (any type — SNAPSHOT, CLIP_DONE, HEARTBEAT, etc.)
- [ ] If the timer fires without being reset, the stream is considered stale: cancel the current fetch, clear the timer, and trigger the same reconnect path used for explicit errors (exponential backoff starting at 1 s)
- [ ] Clear the watchdog timer on unmount so it does not fire after the component is gone

---

### 14.4 — Connection status UI (`apps/web/components/wizard/ClipProgressPanel.tsx`)

The panel already has a pulsing green dot for "connected". Add two additional states so the user knows when updates have paused.

- [ ] Expose a `connectionStatus: "connected" | "reconnecting" | "lost"` prop on `ClipProgressPanel`. The hook (`useClipProgress`) must return this value in addition to the clips map:
  - `"connected"` — stream is active and receiving events
  - `"reconnecting"` — a reconnect attempt is in progress (backoff timer running or fetch in flight)
  - `"lost"` — reconnect attempts have been exhausted (current max retries exceeded)
- [ ] Render the connection indicator based on this value:
  - `"connected"` → pulsing green dot + "Live" label (existing behaviour)
  - `"reconnecting"` → pulsing amber dot + "Reconnecting…" label
  - `"lost"` → static grey dot + "Connection lost" label + a "Retry" button that resets the backoff counter and triggers a fresh connection attempt
- [ ] The `"lost"` state should not auto-advance to a broken Step 7 — keep the user on Step 6 with the retry option visible

---

### 14.5 — Queue position (`apps/web/components/wizard/steps/step-6-processing.tsx` + `apps/api/routes/videos.ts`)

The queue position is currently hardcoded to `useState(0)` and never updates. The timeline shows "Position #N in queue" but N is always 0.

**Backend — add `queuePosition` to the SSE SNAPSHOT:**
- [ ] In the `GET /api/videos/:id/progress` SNAPSHOT builder, compute the video's queue position: count the number of distinct videos whose clips are ahead in the queue. Wrap the subquery in a `CASE` to guard against NULL when the video has no queued clips (all clips already processing or done):
  ```sql
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM clip_requests WHERE video_id = $1 AND status = 'queued'
    ) THEN 0
    ELSE (
      SELECT COUNT(DISTINCT video_id) FROM clip_requests
      WHERE status = 'queued'
        AND queued_at < (
          SELECT MIN(queued_at) FROM clip_requests
          WHERE video_id = $1 AND status = 'queued'
        )
    )
  END AS queue_position
  ```
- [ ] Include `queuePosition: number` in the SNAPSHOT event payload. The `CASE` guard ensures this always returns `0` (never NULL) when the video's clips have already started processing
- [ ] Add a new `QUEUE_POSITION` SSE event type emitted from the operator `GET /queue` claim endpoint: after claiming clips, emit a `QUEUE_POSITION: 0` event to the video's SSE subscribers to signal it has reached the front. No additional DB query needed — the claim itself proves position 0

**Frontend — consume `queuePosition` from SNAPSHOT:**
- [ ] In `useClipProgress`, add `queuePosition: number` to the returned state, initialised from the SNAPSHOT payload and updated by `QUEUE_POSITION` events
- [ ] In `step-6-processing.tsx`, replace `const [queuePosition] = useState(0)` with the value from `useClipProgress`. The existing queue position display and estimated wait time calculation are already wired to this variable — no further UI changes needed

---

## Implementation Order

```
Day 1 — Types and DB (no runtime impact, unblocks everything)
  10.0 — UGCVisualStyle enum, remove TalkingSubtype, update Video interface in @repo/types
  10.1 — schema.ts update + migration 0013_ugc_visual_style.sql
  13.0 — ugcCharacterDescription column in schema.ts + Video interface + migration 0014_ugc_character_description.sql
  Run: pnpm --filter @repo/api db:migrate

Day 2 — Backend prompt and API
  10.2 — Replace talkingSubtype with ugcVisualStyle in all routes + grep apps/api/ apps/web/ packages/ (Track 10.2 and 13.4 share processScenes/splitScenes — apply both signature changes in one edit)
  10.2 — New endpoint: POST /api/videos/:id/character-image/upload-url
  10.3 — talking.ts: UGC_VISUAL_STYLE_MODIFIERS (14 standard styles) + AI Clone override (10.3a)
  13.1 — character.ts: buildUGCCharacterDescriptionPrompt (14 style context entries)
  13.2 — claude.ts: generateUGCCharacter service function
  13.3 — talking.ts: fixed-anchor CHARACTER LOCK block when characterNote is provided
  13.4 — videos.ts: move video row query to top, Phase A before splitScenes, Phase B after scene insert, Phase C in image loop

Day 2.5 (independent of Track 10/13 — can run in parallel) — Step 6 live updates
  14.0 — operator.ts: fix clip complete endpoint to use ASSET_URL_TTL_MINUTES (quickest fix, highest impact)
  14.1 — videos.ts: fix SNAPSHOT to re-sign done clip URLs with ASSET_URL_TTL_MINUTES
  14.2 — useClipProgress.ts: getToken({ skipCache: true }) on every reconnect attempt
  14.3 — useClipProgress.ts: 45-second heartbeat watchdog + reconnect trigger
  14.4 — ClipProgressPanel.tsx: connectionStatus prop + amber/grey dot states + Retry button
  14.5 — Backend SNAPSHOT queuePosition (with NULL guard) + QUEUE_POSITION event; frontend useClipProgress + step-6 wiring

Day 3 — FFmpeg enhancements (all three are independent)
  11.1 — Volume normalization: normalizeAudio flag in normalizeClip / normalizeAllClips (quickest)
  11.0 — concatenateWithTransitions + getTransitionPreset + wire into assemble.ts
  11.2 — Subtitle scene boundary fix: groupWords + generateSubtitles + assemble.ts wiring

Day 4 — Frontend wizard
  10.4 — Type picker + UGC visual style grid + AI Clone upload sub-step + label updates throughout (step-1-idea.tsx is a near-full rewrite; TalkingSubtype cleanup in this file was already handled in Day 2 grep pass)

Day 5 — End-to-end verification
  UGC Anime style: verify scene prompts include anime visual modifier; verify ugcCharacterDescription stored on video row with HAIR/FACE/CLOTHING/FEATURE/BUILD fields; verify character_sheet.jpg generated in GCS; verify all scene images use strength 0.65
  UGC AI Clone: upload base image → verify Phase A and Phase B skipped; verify all clip_requests use user-uploaded image as baseImageUrl
  UGC Realistic: check that CHARACTER section is identical word-for-word in every scene's visualPrompt
  Transitions: assembled video has smooth fades between clips; single-clip video assembles cleanly
  Volume: UGC assembled video has consistent loudness across clips; verify loudnorm in FFmpeg stderr
  Subtitles: 4-clip video with GroupedBold style never shows a group spanning a scene cut
  Step 6: completed clip <video> elements load and play immediately after CLIP_DONE event; reconnecting after killing API server shows amber dot then green dot with clips intact; queue position shows correct number on initial load and drops to 0 once clips start processing
```

---

## Acceptance Criteria

| Task | Done when |
|------|-----------|
| **10.0 Types** | `UGCVisualStyle` enum with 15 values exported from `@repo/types`; `TalkingSubtype` removed; `Video.ugcVisualStyle: UGCVisualStyle \| null` exists; `pnpm check-types` passes across all workspaces with zero errors |
| **10.1 Migration** | `pnpm --filter @repo/api db:migrate` runs cleanly; `videos.ugc_visual_style` column exists as `text`; `videos.talking_subtype` column is gone; `talking_subtype` pg enum type is dropped |
| **10.2 API** | Video create and patch accept `ugcVisualStyle`; scene generation reads `video.ugcVisualStyle`; attempting scene generation on an ai_clone video with no `characterBaseGcsPath` returns HTTP 400 with code `AI_CLONE_IMAGE_REQUIRED`; no remaining references to `talkingSubtype` or `TalkingSubtype` anywhere in `apps/api/`, `apps/web/`, or `packages/` |
| **10.3 Prompts** | All 14 standard `UGC_VISUAL_STYLE_MODIFIERS` entries defined; selecting Anime produces a scene prompt containing cel-shading and anime colour palette language; selecting Ghibli produces watercolour and painterly language; `ai_clone` map entry is present but the override check fires first so it is never reached |
| **10.3a AI Clone** | When `ugcVisualStyle === "ai_clone"`, the CHARACTER section in every generated scene says "Use the face, hair, skin tone, and identity from the uploaded reference image" — not an invented character |
| **10.4 Frontend** | Wizard opens with UGC/Stories type picker; selecting UGC shows 15-card visual style grid; selecting AI Clone reveals image upload sub-step; `POST /api/videos/:id/character-image/upload-url` returns a signed URL; upload stores path as `characterBaseGcsPath`; advance button disabled until image uploaded; selecting Stories shows RenderStyle grid; re-entering the wizard for an existing video pre-selects the saved type and style; all wizard labels say "UGC Video" and "Stories" |
| **11.0 Transitions** | Assembled UGC video shows smooth 0.3 s cross-dissolve between clips; assembled Stories/Cinematic video shows 0.5 s fade; single-clip video assembles without error; a video where `preset.duration` would exceed shortest clip duration assembles successfully (clamped) |
| **11.1 Volume** | UGC assembled video has consistent perceived loudness when clips had different original volumes; FFmpeg args for each UGC normalizeClip call include `-af loudnorm=...` (not `-filter_complex`); Stories clip normalization does NOT include loudnorm |
| **11.2 Subtitles** | A UGC video with GroupedBold subtitles has no subtitle group whose start time is from one scene and end time from a different scene; subtitle `.ass` file for a 4-clip video has forced group breaks at each cumulative clip boundary |
| **13.0 Types + DB** | `Video.ugcCharacterDescription: string \| null` in `@repo/types`; `videos.ugc_character_description` text column exists after migration 0014; `pnpm check-types` passes across all workspaces |
| **13.1 Character prompt** | `buildUGCCharacterDescriptionPrompt` exists in `character.ts`; realistic style produces natural-proportions language; anime style produces large-eyes/cel-shaded language; output format is exactly five labelled lines (HAIR, FACE, CLOTHING, FEATURE, BUILD) |
| **13.2 Claude service** | `generateUGCCharacter` returns a raw string of ≤ 200 tokens; called with `max_tokens: 200`; no JSON parsing |
| **13.3 Talking prompt** | When `characterNote` is provided, the user prompt contains "CHARACTER ANCHOR (FIXED — DO NOT MODIFY)" and does not contain "Scene 0: invent"; when `characterNote` is null, existing behaviour is unchanged |
| **13.4 Pipeline** | For a new UGC non-ai_clone video: `ugcCharacterDescription` is populated on the video row after scene generation; `characterBaseGcsPath` points to `character_sheet.jpg`; every scene's `visualPrompt` contains an identical CHARACTER section; all `generateImageFromReference` calls for UGC use strength 0.65; for ai_clone: Phase A and Phase B are skipped, user-uploaded `characterBaseGcsPath` used unchanged, strength 0.65 still applied; for re-generation: stored `ugcCharacterDescription` is reused without a new Claude call, character sheet not regenerated |
| **14.0 Clip URL TTL** | Clip preview URLs in `CLIP_DONE` SSE events are signed with 7-day TTL; a `<video>` element rendered from the event URL still plays 2 hours after the event was emitted |
| **14.1 SNAPSHOT URLs** | On reconnect, SNAPSHOT event contains valid (non-expired) signed URLs for all `done` clips; `<video>` elements for already-completed clips render immediately without a page reload |
| **14.2 Token refresh** | SSE stream reconnects successfully after Clerk token expiry; network tab shows a fresh `Authorization` header value on each reconnect attempt |
| **14.3 Heartbeat watchdog** | Simulating a silent TCP drop (server stops sending but connection stays open) triggers a reconnect within 45 seconds; no user action required |
| **14.4 Connection status** | Panel shows green "Live" dot when stream is active; amber "Reconnecting…" dot during backoff; grey "Connection lost" + Retry button when max retries exhausted; Retry button restores the green state |
| **14.5 Queue position** | SNAPSHOT payload includes `queuePosition`; step 6 timeline shows correct non-zero position when video is behind others in queue; position updates to 0 (and indicator changes) once the video's clips begin processing |
