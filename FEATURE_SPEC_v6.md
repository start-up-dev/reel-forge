# ReelForge — Feature Enhancement Tasks

**Version:** 6.0
**Date:** May 5, 2026
**Depends on:** All prior FEATURE_SPEC tracks (v2–v5) complete

One track:

| Track | Title                            | Scope                                                                                                  |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 15    | Extension-Native Visual Pipeline | Remove all server-side image generation; extension handles text→image→video per scene in parallel tabs |

---

## Track 15 — Extension-Native Visual Pipeline

### Overview

**Problem:** The API currently generates a base image for every scene before the extension can process clips. This involves two server-side steps: Phase B (character sheet for UGC/talking videos) and Phase C (per-scene image loop via the xAI Grok image API). These images are stored in GCS, displayed to the user in the scene review step, and then fetched by the extension background script before being passed to the content script for image-to-video generation. This creates API cost, latency, and complexity for a step the extension can handle itself.

**Solution:** Remove server-side image generation entirely across all video types (UGC/talking, Stories/generated, Action Reel). The API becomes a pure text and prompt orchestration layer. The extension content script handles the full visual pipeline — text→image, then image→video — within a single Grok Imagine tab per scene. Tabs continue to run in parallel (one per scene), matching the current architecture.

**User-facing change:** The scene review step (Step 4) no longer shows base images. Users approve or reject scenes based on text prompts only. The base image is a transient artefact generated and consumed entirely within the extension tab, never stored.

**Visual consistency strategy:** Character and visual consistency across scenes is maintained via text: the `visualPrompt` for each scene already embeds a VISUAL BIBLE line (established on scene 0 and repeated verbatim on every subsequent scene). No cross-tab reference image passing is needed.

**What does NOT change:**

- One tab per scene, all parallel
- GCS upload → `/operator/clips/:id/complete` flow
- FFmpeg assembly pipeline
- All Claude prompt generation (script, scene, visual, motion prompts)
- ElevenLabs voiceover generation (for stories category)
- The `ATTACH_IMAGE` main-world injection mechanism (repurposed for locally-captured images)
- The video download and GCS upload logic in the background service worker

---

### Key Assumptions (verified against live UI May 2026)

1. **Same-page flow** ✓ — text→image and image→video are on the same `grok.com/imagine` page. No navigation needed.
2. **Image CDN src** ✓ — Generated images have `src` on `imagine-public.x.ai` (e.g. `https://imagine-public.x.ai/imagine-public/images/<uuid>.jpg`). The `x\.ai` domain filter in `isGeneratedImage` correctly captures these.
3. **Multiple images generated** ✓ — Grok generates **two images** per prompt in a grid. `waitForNewImage` picks the first new one in DOM insertion order; that is the image the content script clicks.
4. **Click-to-open-lightbox** ✓ — Clicking one of the generated images opens a **full-screen lightbox view** of that image. This is Phase 1.5. The lightbox has its own bottom bar with a prompt input and action buttons.
5. **Lightbox bottom bar layout** ✓ — The lightbox bottom bar contains (left to right): `+` add button | image thumbnail | `"Type to imagine, @ to reference images"` prompt input | `480p` `720p` resolution options | `6s` `10s` duration options | **video camera icon button** | arrow/submit button.
6. **Video camera icon, not "Make video"** ✓ — The correct Phase 2 entry point is clicking the **video camera icon** (not a labelled "Make video" button). After clicking it, the mode switches to video generation. The motion prompt is then typed into the `"Type to imagine"` input and submitted via the arrow button. `resolveVideoButton` must target this icon button.
7. **Phase 2 prompt input** ✓ — The `"Type to imagine, @ to reference images"` input in the lightbox accepts the `motionPrompt`. It is empty by default (no pre-fill from the image prompt). Enter `motionPrompt`, then click the arrow submit button.
8. **Phase 1 timing** — image generation on Grok Imagine completes in under 2 minutes.

---

### 15.1 — Database Migration

**File: `apps/api/lib/db/schema.ts`**

- [x] Change `clipRequests.baseImageUrl` from `.notNull()` to nullable: `text("base_image_url")` (remove `.notNull()`)
- [x] `scenes.baseImageUrl` and `scenes.baseImagePath` are already nullable — no schema change needed
- [x] `videos.characterBaseGcsPath` stays in schema but is no longer populated — no schema change needed

**Migration file: `apps/api/lib/db/migrations/0016_nullable_clip_base_image.sql`**

```sql
ALTER TABLE "clip_requests" ALTER COLUMN "base_image_url" DROP NOT NULL;
```

- [x] Add the migration entry to `apps/api/lib/db/migrations/meta/_journal.json` as entry `0016` (idx: 16) — entries 0014 and 0015 already exist; do not reuse those indices
- [x] Run `pnpm --filter @repo/api db:migrate` to apply

---

### 15.2 — API: Remove Server-Side Image Generation

**File: `apps/api/routes/videos.ts`**

**In `processScenes` function:**

- [x] Remove import of `generateImage` and `generateImageFromReference` from `../services/grok-image.js`
- [x] Remove the `charBase` and `charBaseSignedUrl` variables (lines ~97–99) — they only existed to feed Phase B and C
- [x] Simplify the Step 1 DB query (lines ~88–96): `characterBaseGcsPath` is no longer needed. Only select `ugcCharacterDescription` and `projectId` (still required for Phase A character description generation)
- [x] Remove Phase B entirely (character sheet generation for UGC/talking videos, lines ~148–165)
- [x] Remove Phase C entirely (the `for (const scene of sorted)` image generation loop, lines ~167–203)
- [x] Remove the `withCharacterNote` helper function (lines ~71–73) — dead code after Phase C removal
- [x] Remove the `UGC_REFERENCE_STRENGTH = 0.65` constant (line ~75) — dead code after Phase C removal
- [x] After scene insert and `sceneCount` update, immediately set video status to `SCENES_READY` — no other async work needed:
  ```typescript
  await db
    .update(videos)
    .set({ status: "SCENES_READY", updatedAt: new Date() })
    .where(eq(videos.id, videoId));
  ```
- [x] Remove the try/catch wrapper around Phase C (the outer try still covers scene insertion)

**In the submit-for-clips endpoint (`POST /api/videos/:id/submit`):**

- [x] Remove the `missingImages` check (lines ~1231–1238) — there are no base images to check for
- [x] In `clipValues`, remove `baseImageUrl: scene.baseImageUrl!` — the column is now nullable and defaults to `null`

**Remove endpoints entirely:**

- [x] `POST /api/videos/:id/scenes/:index/regenerate` — delete the handler (lines ~800–857). This was the "regenerate base image" endpoint. (Note: the route slug is `/regenerate`, not `/regen-image`.)
- [x] `POST /api/videos/:id/scenes/:index/upload-url` — delete the handler (lines ~859 onward). This was the signed URL endpoint for user-supplied custom base images.
- [x] `POST /api/videos/:id/generate-character` — delete the handler (lines ~1093–1148). This was the manual character sheet generation endpoint for cartoon/mascot Stories videos.

**In the scene update endpoint (`PATCH /api/videos/:id/scenes/:index`):**

- [x] Remove `baseImagePath` from the accepted request body schema (line ~909)
- [x] Remove the `updateFields.baseImageUrl` and `updateFields.baseImagePath` assignment block (lines ~957–962) — `baseImagePath` is no longer an accepted field

---

### 15.3 — API: Delete grok-image Service and generateCharacterSheet

- [x] Delete `apps/api/services/grok-image.ts` entirely
- [x] Check all imports of `grok-image` across the `apps/api` directory and remove them:
  ```bash
  grep -r "grok-image" apps/api/
  ```
  Expected: only `apps/api/routes/videos.ts` (already handled in 15.2)

- [x] Delete `generateCharacterSheet` from `apps/api/services/claude.ts`. Verify it has no other callers first:
  ```bash
  grep -rn "generateCharacterSheet" apps/ packages/
  ```
  Expected: only the `generate-character` endpoint in `videos.ts` (already deleted). If confirmed, remove the function and its export.

**Environment variable cleanup:**

- [x] Check whether `XAI_API_KEY` is used anywhere else in `apps/api`:
  ```bash
  grep -r "XAI_API_KEY" apps/api/
  ```
- [x] If `XAI_API_KEY` is only referenced in `grok-image.ts` and `apps/api/lib/env.ts`, remove it from `env.ts` validation and from `.env.example`
- [x] Remove `XAI_API_KEY` from any deployment environment configs (Cloud Run, etc.)

---

### 15.4 — Operator Queue: Remove baseImageUrl

**File: `apps/api/routes/operator.ts`**

In `GET /api/operator/queue` SQL:

- [x] Remove `u.base_image_url AS "baseImageUrl"` from the `SELECT` in the `WITH updated AS (...)` CTE (and from the `RETURNING` clause of the inner `UPDATE`)
- [x] Remove `baseImageUrl` from the TypeScript type annotation on `claimed` rows

The returned `ClaimedClip` objects will no longer carry `baseImageUrl`. The extension no longer needs it.

---

### 15.5 — Extension: Types and Messages

**File: `apps/extension/src/lib/api-client.ts`**

- [x] Remove `baseImageUrl: string` from the `ClaimedClip` interface

**File: `apps/extension/src/lib/messages.ts`**

- [x] Remove `baseImageUrl: string` from the `FailedClipEntry` interface (line ~11). This field is no longer populated since clips have no pre-generated base image.

No new message types are needed. The image capture handshake originally planned here is obsolete: clicking the generated image in Phase 1.5 causes Grok to embed it as the video reference automatically — no image bytes need to be captured or transferred.

---

### 15.6 — Extension: Background Service Worker

**File: `apps/extension/src/background/index.ts`**

**`TabEntry` interface:**

- [x] Remove `baseImageUrl: string` from the `TabEntry` interface
- [x] Remove `baseImageUrl: entry.baseImageUrl` from wherever `TabEntry` objects are constructed (line ~169)

**`FailedClipEntry` construction (line ~279):**

- [x] Remove `baseImageUrl: entry.baseImageUrl` from the object literal passed to `failedClips.push(...)` — the field no longer exists on either `TabEntry` or `FailedClipEntry`

**Base image fetch block (lines ~207–225) in `sendClipToTab`:**

- [x] Remove the entire block that declares `imageBytes`, `imageType`, fetches `clip.baseImageUrl`, and logs the result
- [x] Remove `imageBytes` and `imageType` from the `PROCESS_CLIP` message construction (lines ~229–234)
- [x] Add `visualPrompt: clip.visualPrompt` to the `PROCESS_CLIP` message

**Stale-tab watchdog timeout:**

- [x] Change `TEN_MIN` (currently `10 * 60 * 1000`) to `FIFTEEN_MIN = 15 * 60 * 1000`. The new 2-phase flow (image gen ~2 min + video gen ~3–4 min + upload ~1 min + click delays) can approach 10 minutes on slow generations; 15 minutes provides safe headroom.

**`ATTACH_IMAGE` handler — remove entirely:**

- [x] Delete the `case "ATTACH_IMAGE":` block from the content-script message listener. With Phase 2 no longer needing a file upload (Grok embeds the reference automatically when the image is clicked), `ATTACH_IMAGE` has no remaining callers and is dead code.
- [x] Remove `ATTACH_IMAGE` from the `ContentMsg` union type.

No new SW message handlers are needed for Track 15.

---

### 15.7 — Extension: Content Script (Core Change)

**File: `apps/extension/src/content/index.ts`**

This is the primary implementation change. `processClip` is restructured into two sequential phases.

**Update `ProcessClipMsg` interface (defined locally at lines ~10–23 in this file):**

- [x] Remove `imageBytes: number[] | null` field
- [x] Remove `imageType: string` field
- [x] Add `visualPrompt: string` field (the content script needs this for the text→image phase)

**Update `processClip` destructuring:**

- [x] Remove `imageBytes` and `imageType` from the destructured `msg` fields
- [x] Add `visualPrompt` (from `msg.visualPrompt` or directly from `msg.clip.visualPrompt`)

**Remove the hard-throw guard:**

- [x] Delete the `if (!imageBytes || imageBytes.byteLength === 0) throw new Error(...)` block (lines ~78–81) — there is no longer a pre-supplied image to check

**Remove dead helper:**

- [x] Delete `resolveImageUpload` (lines ~388–405) — it is never called in the automated clip-processing flow (the SW's `ATTACH_IMAGE` handler uses its own hardcoded `input[type="file"]` selector). Verify no call sites remain before deleting.

---

#### Phase 1 — Text → Image

Insert this block at the start of `processClip`, before the `preExistingVideoSrcs` snapshot. The existing `preExistingVideoSrcs = snapshotVideoSrcs()` call (currently line ~74) moves to the start of Phase 2; remove it from its current position.

```
// ── Phase 1: text → image ─────────────────────────────────────────────────
```

- [x] **Snapshot pre-existing images** — collect all `<img>` src values currently in the DOM before touching anything:

  ```typescript
  const preExistingImageSrcs = snapshotImageSrcs();
  ```

- [x] **Enter the visual prompt** — wait for the prompt input, clear it, then set it to `visualPrompt` (same `waitForResolved` + `setReactValue` approach used for the motion prompt). Timeout: 30 seconds.

- [x] **Click generate** — use `resolveGenerateButton` + `autoClick` + `isAlreadyGenerating`, identical to the existing video generation flow

- [x] **Wait for new image** — wait for a new `<img>` element whose `src` was not in `preExistingImageSrcs`, using `waitForNewImage`. Grok generates two images; `waitForNewImage` resolves with the **first** new one in DOM insertion order. Timeout: 2 minutes.

- [x] **Wait for image load** — poll until `newImg.complete && newImg.naturalWidth > 0`. Timeout: 30 seconds. Ensures Grok has fully rendered the image before clicking; clicking a loading placeholder may not trigger the video mode transition.

---

#### Phase 1.5 — Open Lightbox

After the image is fully loaded, the content script clicks it to open the full-screen lightbox view. The lightbox contains the prompt input and the video camera icon that initiates video generation.

```
// ── Phase 1.5: open lightbox ──────────────────────────────────────────────
```

- [x] **Click the image** — click `newImg` or its nearest clickable ancestor:
  ```typescript
  const clickTarget =
    newImg.closest<HTMLElement>('[role="button"], button, a, [tabindex]') ?? newImg;
  clickTarget.click();
  ```
- [x] **Wait for lightbox / video camera icon** — poll until `resolveVideoIcon()` returns a non-null element. This confirms the lightbox has opened and the bottom bar is ready. Timeout: 10 seconds.
  ```typescript
  await waitForResolved(
    () => resolveVideoIcon(),
    10_000,
    clip.id,
    "videoIcon",
    "video camera icon",
  );
  ```

---

#### Phase 2 — Image → Video

After Phase 1.5, the lightbox is open. The sequence is: **click video icon → enter motion prompt → click submit arrow.** Grok already has the image as the reference; no file attachment is needed.

```
// ── Phase 2: image → video ────────────────────────────────────────────────
```

- [x] **Snapshot video srcs** — call `const preExistingVideoSrcs = snapshotVideoSrcs()` here (moved from the top of `processClip`)
- [x] **Click the video camera icon** — call `resolveVideoIcon()` and click it. This switches the mode to video generation.
  ```typescript
  const videoIcon = resolveVideoIcon()!;
  videoIcon.click();
  await sleep(500); // brief pause for mode transition
  ```
- [x] **Re-resolve prompt input** — the lightbox prompt input (`"Type to imagine, @ to reference images"`) may be a different element from the Phase 1 prompt. Re-resolve with `waitForResolved(resolvePromptInput, 10_000, ...)`.
- [x] **Clear prompt, enter motion prompt** — `setReactValue(freshPromptEl, "")` then `setReactValue(freshPromptEl, clip.motionPrompt)`.
- [x] **Find and click the submit arrow** — use `resolveSubmitButton()` (see new helpers below). This is the arrow/send button, distinct from both the Phase 1 generate button and the video camera icon. Apply the same `autoClick` + `isAlreadyGenerating` guard.
- [x] **Refresh video snapshot** — same as existing step 8
- [x] **Wait for new video, wait for ready, send UPLOAD_VIDEO** — unchanged

---

#### New Helpers

**`resolveVideoIcon()`** — finds the video camera icon button in the lightbox bottom bar. This button switches the mode to video generation and is distinct from both the Phase 1 generate button and the submit arrow:

- [x] Implement with a multi-signal heuristic (the icon has no visible text label):
  ```typescript
  function resolveVideoIcon(): HTMLElement | null {
    // Prefer aria-label or title containing "video" / "animate"
    for (const el of visibleAll<HTMLElement>('button, [role="button"]')) {
      const label = (
        (el.getAttribute("aria-label") ?? "") +
        " " +
        (el.getAttribute("title") ?? "") +
        " " +
        (el.getAttribute("data-tooltip") ?? "")
      ).toLowerCase();
      if (/\bvideo\b|\banimate\b|\bmake video\b/i.test(label)) return el;
    }
    // Fallback: button that contains a <video>-related SVG and is near resolution/duration controls
    // (480p / 720p / 6s / 10s buttons). Find those controls first, then walk siblings.
    const durationBtn = [...document.querySelectorAll<HTMLElement>('button, [role="button"]')]
      .find((el) => /^(6s|10s|480p|720p)$/i.test(el.textContent?.trim() ?? ""));
    if (durationBtn?.parentElement) {
      const siblings = visibleAll<HTMLElement>('button, [role="button"]').filter(
        (el) => durationBtn.parentElement!.contains(el) && !el.textContent?.trim(),
      );
      // The video icon is the icon-only button in the same bar — prefer last before submit arrow
      if (siblings.length) return siblings[siblings.length - 1] ?? null;
    }
    return null;
  }
  ```
  **Note:** The exact selector for the video icon must be verified against the live DOM before finalising. Open DevTools on the lightbox, inspect the video camera icon button, and check its `aria-label` or `data-*` attributes. Update the primary branch of `resolveVideoIcon` to use the confirmed attribute. The fallback (sibling-of-duration-button) is a safety net if no label is present.

**`resolveSubmitButton()`** — finds the arrow/send submit button in the lightbox. This is the button that actually triggers video generation after the motion prompt is entered:

- [x] Implement:
  ```typescript
  function resolveSubmitButton(): HTMLElement | null {
    // Arrow/send buttons typically have type="submit" or aria-label "Send" / "Submit" / "Go"
    for (const el of visibleAll<HTMLElement>('button[type="submit"], button, [role="button"]')) {
      const label = (
        (el.getAttribute("aria-label") ?? "") +
        " " +
        (el.getAttribute("title") ?? "")
      ).toLowerCase();
      if (/\b(send|submit|go|generate)\b/.test(label)) return el;
    }
    // Fallback: rightmost visible icon-only button in the bottom bar
    const candidates = visibleAll<HTMLElement>('button, [role="button"]').filter(
      (el) => !el.textContent?.trim() && el.querySelector("svg"),
    );
    return candidates[candidates.length - 1] ?? null;
  }
  ```
  **Note:** Like `resolveVideoIcon`, verify the `aria-label` of the submit arrow in the live DOM and lock the primary selector to the confirmed value. The fallback (rightmost icon button) is a last resort.

**`snapshotImageSrcs()`** — mirrors `snapshotVideoSrcs()` for `<img>` elements:

- [x] Implement:
  ```typescript
  function snapshotImageSrcs(): Set<string> {
    const srcs = new Set<string>();
    document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (img.src) srcs.add(img.src);
    });
    return srcs;
  }
  ```

**`waitForNewImage(preExisting, timeoutMs, clipId)`** — mirrors `waitForNewVideo`:

- [x] Implement using `MutationObserver` + polling fallback, watching for a new `<img>` whose `src` is not in `preExisting` and passes the CDN origin filter:
  ```typescript
  function isGeneratedImage(img: HTMLImageElement): boolean {
    // Must be a CDN-hosted image from Grok/xAI (not a data URI, icon, or tracker)
    const src = img.src;
    if (!src || src.startsWith("data:")) return false;
    if (!(/x\.ai|grok\.com/i.test(src))) return false;
    // Accept if loaded (naturalWidth > 100) OR still loading (browser just inserted the element)
    return (img.complete && img.naturalWidth > 100) || !img.complete;
  }
  ```
  The `!img.complete` branch catches the element the moment Grok inserts it; the subsequent "wait for image load" step then waits until it is fully decoded. This is intentional — we want to capture the reference to the element as early as possible.
- [x] On timeout, send `SELECTOR_ERROR` to SW with `selectorName: "outputImage"` and reject
- [x] Return the `HTMLImageElement` (not just a boolean) so the caller can pass `img.src` to `captureGeneratedImage`

**Dead code to remove from `content/index.ts`:**

- [x] Delete `attachImageViaMainWorld` — no longer called; Phase 2 needs no file upload
- [x] Delete `setFileOnElement` — never called in the automation path (pre-existing dead code)
- [x] Delete `findNearestFileInput` — only called by `setFileOnElement`

---

### 15.8 — Web UI: Scene Review Step

**File: `apps/web/components/wizard/steps/step-4-scenes.tsx`**

Remove all base-image-related UI and logic:

- [x] Remove `readyCount` (was `scenes.filter(s => s.baseImageUrl).length`) — all scenes are content-ready once the API returns them
- [x] Remove `regeneratingScenes` state and all references
- [x] Remove `regeneratingAll` state and all references
- [x] Remove `regenerateScene(sceneIndex)` function entirely
- [x] Remove `regenerateAll()` function entirely
- [x] Remove all API calls to `api.scenes.regenerate()`
- [x] Remove the upload-url / custom base image flow (the `<input type="file">` and the signed URL fetch at line ~165)

In scene cards:

- [x] Remove the `<img src={scene.baseImageUrl!} />` image display block (line ~331)
- [x] Remove the loading/generating state that was tied to `isImageReady = !!scene.baseImageUrl`
- [x] Remove the per-scene "Regenerate" button (line ~503)
- [x] Remove the "Regenerate All" button (line ~262)

Update scene card layout:

- [x] Scene card now shows: `visualPrompt` and `motionPrompt` as styled text blocks (similar to the action reel scene card design, which already showed text prompts). A scene is "ready to approve" immediately when it exists.
- [x] The approve/reject toggle and scene edit flows remain unchanged

**File: `apps/web/lib/api-client.ts` (web app API client):**

- [x] Remove `api.scenes.regenerate()` method (called the deleted `/regenerate` endpoint)
- [x] Remove `api.scenes.uploadUrl()` (or equivalent) method (called the deleted `/upload-url` endpoint)
- [x] Remove `api.videos.generateCharacter()` (or equivalent) method (called the deleted `/generate-character` endpoint)
- [x] Confirm with:
  ```bash
  grep -n "regenerate\|uploadUrl\|generateCharacter\|upload-url\|generate-character" apps/web/lib/api-client.ts
  ```

**Files: `apps/web/components/wizard/steps/step-2-script.tsx` and `step-3-voice.tsx`**

- [x] Search for any `baseImageUrl` references and remove them

---

### 15.9 — Cleanup & Verification

- [x] Run `pnpm check-types` — fix any TypeScript errors from removed fields
- [x] Run `pnpm lint` — fix any linting errors
- [x] Run `pnpm build` — confirm full build passes
- [x] Confirm `grok-image.ts` has zero remaining importers:
  ```bash
  grep -r "grok-image" apps/ packages/
  ```
- [x] Confirm `baseImageUrl` is only referenced where expected (nullable DB column, no hard usage in business logic):
  ```bash
  grep -r "baseImageUrl" apps/ packages/
  ```
- [x] Confirm `imageBytes`, `imageType`, `attachImageViaMainWorld`, `ATTACH_IMAGE`, `setFileOnElement`, `findNearestFileInput` are fully gone from the extension:
  ```bash
  grep -r "imageBytes\|imageType\|attachImageViaMainWorld\|ATTACH_IMAGE\|setFileOnElement\|findNearestFileInput\|captureGeneratedImage" apps/extension/src/
  ```
  Expected: zero hits.
- [x] Confirm `withCharacterNote` and `UGC_REFERENCE_STRENGTH` have been removed from `videos.ts`:
  ```bash
  grep -n "withCharacterNote\|UGC_REFERENCE_STRENGTH" apps/api/routes/videos.ts
  ```
- [x] Confirm `resolveImageUpload` has been removed from `content/index.ts`:
  ```bash
  grep -n "resolveImageUpload" apps/extension/src/content/index.ts
  ```
- [x] Confirm `generateCharacterSheet` has been removed from `claude.ts`:
  ```bash
  grep -rn "generateCharacterSheet" apps/ packages/
  ```
- [x] Update `ReelForge_MVP_Tasks.md` — mark Track 15 tasks complete as they are finished

---

### Migration Notes for Existing Data

- Existing videos that have `base_image_url` populated on their `scenes` rows are unaffected — the column stays in the schema, the data stays in the DB, it just stops being written or read.
- Existing `clip_requests` rows with `base_image_url` populated are unaffected — the column is now nullable, old rows retain their data.
- No backfill required.
- The extension will process all new clips without `baseImageUrl` — the new 2-phase content script handles `null` by design.

---

### Open Questions

1. ~~**Image selector heuristic**~~ — **Resolved.** Generated images appear on `imagine-public.x.ai`. The `x\.ai` filter in `isGeneratedImage` correctly captures them.

2. ~~**Phase 1 / Phase 2 UI separation**~~ — **Resolved.** After clicking the generated image, the UI enters a completely different video mode with a new prompt input (placeholder: `"Describe your edit, @ to reference images"`) and a new "Make video" button. Phase 2 must re-resolve both elements. The input is empty by default (the original prompt appears as a `"Use"` chip, not pre-filled).

3. **Three selector verifications needed before coding Phase 1.5 / Phase 2** — open DevTools on the live Grok Imagine page and confirm:
   - **Image click target:** does clicking `<img>` directly open the lightbox, or must you click a parent wrapper? (`$0.click()` in console on the img vs. its closest `[role="button"]` ancestor will confirm)
   - **Video camera icon `aria-label`:** inspect the icon button in the lightbox bottom bar and record its `aria-label` or `title`. Hard-code it as the primary selector in `resolveVideoIcon`.
   - **Submit arrow `aria-label`:** same — inspect the arrow/send button and record its `aria-label`. Hard-code it as the primary selector in `resolveSubmitButton`.

   These are 5-minute live DOM checks. The fallback heuristics in both resolvers handle the unverified case, but locking confirmed attributes first makes the automation more robust.
