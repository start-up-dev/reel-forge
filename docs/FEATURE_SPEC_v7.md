# ReelForge — Feature Spec v7: Agentic Content Machine

**Version:** 7.0
**Date:** May 13, 2026
**Depends on:** All prior FEATURE_SPEC tracks (v2–v6) complete

---

## Vision

Transform ReelForge from a per-video step-by-step wizard into a **set-and-go content machine**. A user connects their Facebook page, answers one onboarding interview, generates a character sheet, picks a posting cadence, reviews a week-1 content calendar, and presses Go. From that point, an agentic pipeline generates all videos — scripts, scene prompts, Grok clips, FFmpeg assembly, draft posts — fully automatically. The user gets an email when their week is ready to review.

---

## What Changes vs Current

| Removed | Replaced By |
|---|---|
| ElevenLabs voiceover | Grok generates clips with audio built-in; Whisper transcribes for subtitles |
| Per-video wizard (6 manual steps) | Brand onboarding once → content plan → fully agentic |
| "Create project" form | Connect Facebook page (OAuth) |
| Manual video submission | Auto-batch generation from content plan approval |
| No social posting | Draft / scheduled posts via Facebook Graph API |
| No character sheet | GPT-image-2 character reference, attached in extension Phase 1 |
| One video at a time | Week batch (N videos × 7 days), all in parallel |

## What Stays the Same

- Clerk auth, Stripe billing
- Extension architecture — one Grok Imagine tab per scene, parallel
- Grok Imagine text → image → video flow (Track 15 / v6)
- FFmpeg worker (audio handling adjusted; Whisper subtitle path unchanged)
- Claude prompt generation (adjusted — motion prompts embed dialogue)
- All DB infrastructure (Neon, Drizzle ORM)
- GCS signed URL storage

---

## Track Overview

| Track | Title | Scope |
|---|---|---|
| 16 | Remove ElevenLabs + Audio-Aware FFmpeg | Delete EL service, embed dialogue in motion prompts, update FFmpeg to preserve clip audio |
| 17 | Facebook OAuth + Channel Connection | FB OAuth, page selection, `social_accounts` table |
| 18 | Brand Profile + Onboarding | 7-step guided card questionnaire, logo upload, `brand_profiles` table |
| 19 | Character Sheet (GPT-image-2) | OpenAI image gen service, Claude character prompt, review/regenerate UI, GCS storage |
| 20 | Content Planner | `content_plans` table, Claude week plan, calendar UI, per-card overrides, approve trigger |
| 21 | Agentic Pipeline + Progress UI | Batch orchestration via SSE, Agent Activity panel, email on completion |
| 22 | Facebook Posting | Graph API draft/schedule, `post_schedules` table, post status badges |
| 23 | Extension — Character Sheet Attachment | Restore ATTACH_IMAGE mechanism, pre-fetch character sheet in SW, inject before Phase 1 |

---

## New Data Model

### New Tables

#### `social_accounts`

```sql
CREATE TABLE "social_accounts" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "platform"          text NOT NULL,           -- 'facebook' | 'tiktok'
  "page_id"           text NOT NULL,
  "page_name"         text NOT NULL,
  "page_avatar_url"   text,
  "access_token"      text NOT NULL,           -- encrypted at rest
  "token_expires_at"  timestamp,
  "created_at"        timestamp NOT NULL DEFAULT now(),
  "updated_at"        timestamp NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "platform", "page_id")
);
```

#### `brand_profiles`

```sql
CREATE TABLE "brand_profiles" (
  "id"                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "social_account_id"          uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  "name"                       text NOT NULL,           -- display name e.g. "My Fitness Brand"
  "niche"                      text NOT NULL,
  "niche_description"          text,                    -- free-text detail
  "target_audience_age"        text,                    -- 'gen_z' | 'millennial' | 'gen_x' | 'all'
  "target_audience_vibe"       text,                    -- 'entertainment' | 'education' | 'inspiration' | 'humor'
  "tone"                       text NOT NULL,           -- 'energetic' | 'calm' | 'witty' | 'inspirational' | 'professional' | 'dramatic'
  "visual_style"               text NOT NULL,           -- 'realistic' | 'anime' | '3d_animation' | 'cartoon' | 'cinematic' | 'minimalist'
  "character_type"             text NOT NULL,           -- 'human' | 'mascot' | 'abstract' | 'none'
  "character_description"      text,                    -- free-text: appearance, outfit, traits
  "character_sheet_gcs_path"   text,
  "logo_gcs_path"              text,
  "primary_color"              text,                    -- hex e.g. '#f55c2a'
  "secondary_color"            text,
  "reference_video_url"        text,                    -- optional TikTok/Reels URL for vibe
  "onboarding_complete"        boolean NOT NULL DEFAULT false,
  "created_at"                 timestamp NOT NULL DEFAULT now(),
  "updated_at"                 timestamp NOT NULL DEFAULT now()
);
```

#### `content_plans`

```sql
CREATE TABLE "content_plans" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "brand_profile_id" uuid NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  "user_id"         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "week_start_date" date NOT NULL,
  "posts_per_day"   integer NOT NULL DEFAULT 1,   -- 1 | 2 | 3 | 5
  "status"          text NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'generating' | 'complete'
  "topics"          jsonb NOT NULL DEFAULT '[]',   -- see Topics JSONB schema below
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);
```

**Topics JSONB schema** (array of):
```typescript
{
  index: number;          // 0-based position in the week (0 = Mon slot 1)
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  slot: number;           // 1-based slot within the day
  title: string;          // short headline
  hook: string;           // opening hook line
  format: "ugc" | "montage" | "tutorial" | "story";
  angle: string;          // creative angle
  scriptOutline: string;  // 2–3 sentence content brief
  overridden: boolean;    // true if user manually edited
}
```

#### `post_schedules`

```sql
CREATE TABLE "post_schedules" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id"          uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  "social_account_id" uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  "scheduled_at"      timestamp,          -- null = draft (no schedule)
  "post_type"         text NOT NULL,      -- 'draft' | 'scheduled'
  "platform_post_id"  text,              -- Facebook video ID after upload
  "status"            text NOT NULL DEFAULT 'pending',  -- 'pending' | 'posted' | 'failed'
  "error_message"     text,
  "created_at"        timestamp NOT NULL DEFAULT now(),
  "updated_at"        timestamp NOT NULL DEFAULT now()
);
```

### Modified Tables

#### `videos` — add columns

```sql
ALTER TABLE "videos"
  ADD COLUMN "content_plan_id"    uuid REFERENCES content_plans(id) ON DELETE SET NULL,
  ADD COLUMN "brand_profile_id"   uuid REFERENCES brand_profiles(id) ON DELETE SET NULL,
  ADD COLUMN "dialogue_segments"  jsonb;  -- array of { sceneIndex: number, dialogue: string }
```

#### `clip_requests` — add column

```sql
ALTER TABLE "clip_requests"
  ADD COLUMN "character_sheet_url" text;   -- pre-signed GCS URL (7-day TTL), nullable
```

---

## Track 16 — Remove ElevenLabs + Audio-Aware FFmpeg

### 16.1 — Delete ElevenLabs Service

**File: `apps/api/services/elevenlabs.ts`**

- [x] Delete this file entirely
- [x] Verify no other callers:
  ```bash
  grep -rn "elevenlabs" apps/ packages/
  ```

**File: `apps/api/lib/env.ts`**

- [x] Remove `ELEVENLABS_API_KEY` from env validation
- [x] Remove from `.env.example`

**File: `apps/api/routes/videos.ts`**

- [x] Remove the voiceover generation step from `processScenes` (or wherever ElevenLabs is called)
- [x] Remove `voiceoverUrl`, `voiceoverPath` from any payload construction
- [x] Remove the `POST /api/videos/:id/voiceover` endpoint if it exists
- [x] Remove voice selection from Step 3 schema if applicable

**`packages/types/src/index.ts`**

- [x] Remove `voiceId`, `voiceoverUrl`, `voiceoverPath` from `Video` interface
- [x] Remove any `VoiceId` or `ElevenLabsVoice` types

**DB migration: `apps/api/lib/db/migrations/0017_remove_voiceover.sql`**

```sql
ALTER TABLE "videos"
  DROP COLUMN IF EXISTS "voiceover_url",
  DROP COLUMN IF EXISTS "voiceover_path",
  DROP COLUMN IF EXISTS "voice_id";
```

- [x] Add migration entry to `_journal.json` as idx 17
- [x] Run `pnpm --filter @repo/api db:migrate`

### 16.2 — Dialogue-Embedded Motion Prompts

The script is no longer spoken by ElevenLabs. Instead, Claude generates per-scene dialogue lines. The extension embeds them in motion prompts so Grok generates the character speaking.

**File: `apps/api/prompts/talking.ts`** (or wherever scene prompts are built)

- [x] Add a `dialogueLine` parameter to `buildTalkingSceneMessages` / motion prompt builders
- [x] Append to motion prompt:
  ```
  The character speaks these exact words directly to camera: "[dialogueLine]"
  ```
  Place this at the START of the motion prompt, before movement descriptors.

**File: `apps/api/services/claude.ts`**

- [x] Add `generateDialogueSegments(script: string, sceneCount: number): Promise<{sceneIndex: number, dialogue: string}[]>`
  - System prompt: Given this script and N scenes, break the narration into N segments, one per scene. Return JSON array `[{sceneIndex, dialogue}]`. Each segment should be 1–3 sentences. The segments in order must together cover the full script.
  - Model: `claude-sonnet-4-6`, `max_tokens: 500`

**File: `apps/api/routes/videos.ts`**

- [x] In `processScenes`, after scene insertion, call `generateDialogueSegments`
- [x] Store result in `videos.dialogue_segments`
- [x] When creating `clip_requests`, look up the dialogue segment for each scene index and pass it as part of the visual/motion prompt context

**`packages/types/src/index.ts`**

- [x] Add `dialogueSegments: {sceneIndex: number, dialogue: string}[] | null` to `Video` interface

### 16.3 — FFmpeg Worker: Audio-Aware Assembly

Grok clips now carry audio. The FFmpeg pipeline must preserve clip audio rather than discarding it and overlaying a separate voiceover.

**File: `apps/worker/src/ffmpeg.ts`**

- [x] In `concatenateWithTransitions`: ensure audio streams from input clips are included in the filter graph
  - Current filter graph may strip audio. Add `[0:a][1:a]acrossfade=...` chains for audio transitions when clips have audio
  - For clips without audio (legacy or silent), use `aevalsrc=0:c=stereo:s=44100:d=<duration>` as silent placeholder

- [x] In `normalizeAllClips`: audio normalization already handles `hasAudio=true` — confirm it still works correctly when clips have spoken audio (not just background music). The `-af "loudnorm=I=-23:TP=-1.5:LRA=11"` filter is correct here.

- [x] Remove voiceover mixing step: find any `amerge`, `amix`, or voiceover overlay code in the assembly pipeline and remove it.

**File: `apps/worker/src/assemble.ts`**

- [x] Remove `voiceoverPath` / `voiceoverUrl` references from the assembly input
- [x] Remove `voiceoverGcsPath` download step if present
- [x] Confirm the Whisper subtitle path is unaffected: Whisper is called on the assembled (or individual) clips regardless — this step requires no change

**File: `apps/worker/src/db.ts`**

- [x] Remove `voiceoverUrl` / `voiceoverPath` from the worker's video type definition

### 16.4 — Web UI: Remove Voice Step

**File: `apps/web/components/wizard/steps/step-3-voice.tsx`** (or equivalent)

- [x] Delete this file entirely (or hide it from the wizard flow)

**File: `apps/web/components/wizard/index.tsx`** (or wizard router)

- [x] Remove Step 3 (voice) from the wizard step array
- [x] Renumber subsequent steps if needed

**File: `apps/web/lib/api-client.ts`**

- [x] Remove `voiceId`, voiceover-related methods from the web API client

### 16.5 — Verification

- [x] `pnpm check-types` — zero errors
- [x] `pnpm lint` — zero warnings
- [x] Confirm `elevenlabs` has zero remaining references:
  ```bash
  grep -ri "elevenlabs" apps/ packages/
  ```
- [x] Confirm `voiceover` has zero remaining references in business logic:
  ```bash
  grep -ri "voiceover" apps/ packages/
  ```

---

## Track 17 — Facebook OAuth + Channel Connection

### 17.1 — Database Migration

**Migration: `apps/api/lib/db/migrations/0018_social_accounts.sql`**

```sql
CREATE TABLE "social_accounts" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform"         text NOT NULL,
  "page_id"          text NOT NULL,
  "page_name"        text NOT NULL,
  "page_avatar_url"  text,
  "access_token"     text NOT NULL,
  "token_expires_at" timestamp,
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "platform", "page_id")
);
```

- [x] Add migration to `_journal.json` as idx 18
- [x] Add `SocialAccountRow` inferred type from schema
- [x] Run `pnpm --filter @repo/api db:migrate`

**File: `apps/api/lib/db/schema.ts`**

- [x] Add `socialAccounts` Drizzle table definition matching the SQL above
- [x] Export `SocialAccountRow` inferred type

### 17.2 — API: OAuth Routes

**File: `apps/api/routes/social.ts`** (new file)

**`GET /api/auth/facebook/authorize`**

- [x] Build Facebook OAuth URL:
  ```
  https://www.facebook.com/v19.0/dialog/oauth
    ?client_id={FACEBOOK_APP_ID}
    &redirect_uri={FACEBOOK_REDIRECT_URI}
    &scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata
    &state={userId}:{nonce}
    &response_type=code
  ```
- [x] Return `{ authUrl: string }` — the web app opens this in a popup or redirect

**`GET /api/auth/facebook/callback`**

- [x] Validate `state` param (userId + nonce match)
- [x] Exchange `code` for user access token via `GET https://graph.facebook.com/v19.0/oauth/access_token`
- [x] Fetch user's pages: `GET https://graph.facebook.com/v19.0/me/accounts?fields=id,name,picture`
- [x] Return `{ pages: { id, name, pictureUrl }[] }` — user selects which page to connect

**`POST /api/social/facebook/connect`**

- [x] Request body: `{ pageId: string, pageName: string, pageAvatarUrl: string, accessToken: string }`
- [x] Exchange short-lived page token for long-lived token if needed (60-day expiry)
- [x] Upsert into `social_accounts`
- [x] Return `{ account: SocialAccountRow }`

**`GET /api/social/accounts`**

- [x] Return all `social_accounts` for the authenticated user
- [x] Strip `access_token` from response (never expose to client)

**`DELETE /api/social/accounts/:id`**

- [x] Delete the social account (cascade deletes post_schedules)
- [x] Return `{ ok: true }`

**File: `apps/api/lib/env.ts`**

- [x] Add `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` to env validation

**File: `apps/api/app.ts`**

- [x] Register `social.ts` router

### 17.3 — Types

**`packages/types/src/index.ts`**

- [x] Add `SocialPlatform = 'facebook' | 'tiktok'`
- [x] Add `SocialAccount` interface (id, userId, platform, pageId, pageName, pageAvatarUrl, createdAt)
- [x] Add `FacebookPage` interface (id, name, pictureUrl)

### 17.4 — Web UI: Connect Channel Page

**File: `apps/web/app/channels/page.tsx`** (new page)

- [x] Show connected accounts (page name, avatar, platform badge, "Disconnect" button)
- [x] "Connect Facebook Page" button → calls `/api/auth/facebook/authorize` → opens popup/redirect
- [x] After OAuth callback: show page picker modal (radio list of pages returned by API)
- [x] On page selection → `POST /api/social/facebook/connect` → reload connected list
- [x] Empty state: "No channels connected yet — connect a Facebook page to start generating content"

**File: `apps/web/app/channels/callback/page.tsx`** (new page, handles OAuth return)

- [x] On mount, read `code` + `state` from URL params
- [x] Call `/api/auth/facebook/callback?code=...&state=...`
- [x] If pages returned → show page picker
- [x] On selection → `POST /api/social/facebook/connect`
- [x] Redirect to `/channels` on success

**File: `apps/web/lib/api-client.ts`**

- [x] Add `social.authorize()` — `GET /api/auth/facebook/authorize`
- [x] Add `social.callback(code, state)` — `GET /api/auth/facebook/callback`
- [x] Add `social.connect(data)` — `POST /api/social/facebook/connect`
- [x] Add `social.list()` — `GET /api/social/accounts`
- [x] Add `social.disconnect(id)` — `DELETE /api/social/accounts/:id`

### 17.5 — Navigation

**File: `apps/web/components/layout/Sidebar.tsx`** (or Nav)

- [x] Add "Channels" nav item linking to `/channels`
- [x] Add "Brand Profiles" nav item linking to `/brands`

---

## Track 18 — Brand Profile + Onboarding

### 18.1 — Database Migration

**Migration: `apps/api/lib/db/migrations/0019_brand_profiles.sql`**

```sql
CREATE TABLE "brand_profiles" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                  text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "social_account_id"        uuid REFERENCES "social_accounts"("id") ON DELETE SET NULL,
  "name"                     text NOT NULL,
  "niche"                    text NOT NULL,
  "niche_description"        text,
  "target_audience_age"      text,
  "target_audience_vibe"     text,
  "tone"                     text NOT NULL,
  "visual_style"             text NOT NULL,
  "character_type"           text NOT NULL,
  "character_description"    text,
  "character_sheet_gcs_path" text,
  "logo_gcs_path"            text,
  "primary_color"            text,
  "secondary_color"          text,
  "reference_video_url"      text,
  "onboarding_complete"      boolean NOT NULL DEFAULT false,
  "created_at"               timestamp NOT NULL DEFAULT now(),
  "updated_at"               timestamp NOT NULL DEFAULT now()
);
```

- [x] Add migration to `_journal.json` as idx 19
- [x] Add `brandProfiles` table to `apps/api/lib/db/schema.ts`
- [x] Export `BrandProfileRow` inferred type
- [x] Run `pnpm --filter @repo/api db:migrate`

### 18.2 — API: Brand Profile Routes

**File: `apps/api/routes/brands.ts`** (new file)

**`POST /api/brand-profiles`**

- [x] Request body: `{ name, socialAccountId?, niche, nicheDescription?, targetAudienceAge?, targetAudienceVibe?, tone, visualStyle, characterType, characterDescription?, primaryColor?, secondaryColor?, referenceVideoUrl? }`
- [x] Validate all required fields with Zod
- [x] Insert into `brand_profiles` with `onboardingComplete: false`
- [x] Return `{ brandProfile: BrandProfileRow }`

**`GET /api/brand-profiles`**

- [x] Return all brand profiles for authenticated user

**`GET /api/brand-profiles/:id`**

- [x] Return single brand profile (must belong to authenticated user)
- [x] Include character sheet signed URL if `characterSheetGcsPath` is set (7-day TTL)

**`PATCH /api/brand-profiles/:id`**

- [x] Accept any subset of brand profile fields
- [x] Validate with Zod (all fields optional)
- [x] Update `updatedAt`

**`POST /api/brand-profiles/:id/logo-upload-url`**

- [x] Request: `{ contentType: 'image/png' | 'image/jpeg' | 'image/webp' }`
- [x] Generate GCS signed PUT URL for path `brands/{id}/logo.{ext}`
- [x] Return `{ uploadUrl: string, gcsPath: string }`

**`POST /api/brand-profiles/:id/complete-onboarding`**

- [x] Validate that `characterSheetGcsPath` is set (character sheet must exist before onboarding completes)
- [x] Set `onboardingComplete: true`
- [x] Return `{ ok: true }`

**File: `apps/api/app.ts`**

- [x] Register `brands.ts` router

### 18.3 — Types

**`packages/types/src/index.ts`**

- [x] Add `BrandProfile` interface
- [x] Add `TargetAudienceAge = 'gen_z' | 'millennial' | 'gen_x' | 'all'`
- [x] Add `ContentTone = 'energetic' | 'calm' | 'witty' | 'inspirational' | 'professional' | 'dramatic'`
- [x] Add `VisualStyle = 'realistic' | 'anime' | '3d_animation' | 'cartoon' | 'cinematic' | 'minimalist'`
- [x] Add `CharacterType = 'human' | 'mascot' | 'abstract' | 'none'`

### 18.4 — Web UI: Brand Onboarding (7 guided card steps)

**File: `apps/web/app/brands/new/page.tsx`** (new page — onboarding wizard)

**Step 1 — Your Niche**
- [x] Category card grid (3 columns): Fitness, Finance, Beauty, Gaming, Food, Business, Education, Entertainment, Lifestyle, Other
- [x] "Describe your specific niche" text input (shows after category selection)
- [x] `canAdvance`: category selected

**Step 2 — Your Audience**
- [x] Two card rows:
  - Age group: Gen Z (16–25), Millennials (25–40), Gen X (40–55), All ages
  - Content vibe: Entertainment, Education, Inspiration, Humor
- [x] Both must be selected to advance

**Step 3 — Brand Tone**
- [x] 6 large cards (2 columns): Energetic & Hype, Calm & Educational, Witty & Funny, Inspirational, Professional, Dramatic & Intense
- [x] Each card has a one-line descriptor and icon
- [x] Single select

**Step 4 — Visual Style**
- [x] 6 cards (2 columns): Realistic, Anime, 3D Animation, Cartoon, Cinematic, Minimalist
- [x] Each card has a small example image and style tag
- [x] Single select

**Step 5 — Your Character**
- [x] 4 cards: Human Presenter, Brand Mascot, Abstract Character, No Character
- [x] If Human or Mascot selected: expand inline text area — "Describe your character's appearance (skin tone, hair color, outfit, distinctive features)"
- [x] `canAdvance`: character type selected; if Human/Mascot, description must be filled

**Step 6 — Brand Colors (optional)**
- [x] Two color pickers: Primary color, Secondary color
- [x] Upload logo button (PNG/JPG, max 5 MB) — on upload, extract dominant colors and pre-fill pickers
- [x] "Skip for now" button advances without saving colors
- [x] Logo upload flow: call `POST /api/brand-profiles/:id/logo-upload-url` → PUT to signed URL → PATCH `logoGcsPath`

**Step 7 — Review + Name Your Brand**
- [x] Summary cards showing all selected options
- [x] "Brand name" text input (e.g. "My Fitness Channel")
- [x] Optional: "Paste a TikTok or Reels URL you love the vibe of" text input
- [x] "Create Brand Profile" button → `POST /api/brand-profiles`
- [x] On success → redirect to `/brands/:id/character-sheet` (Track 19)

**State management:**
- [x] Use `useState` for wizard step + form values
- [x] On step change, PATCH the in-progress profile (create it on step 1 completion so logo upload has an ID)
- [x] `currentStep` stored in component state, not URL params

**File: `apps/web/app/brands/page.tsx`** (brand list page)

- [x] List all brand profiles (name, character type, visual style, onboarding status)
- [x] "New Brand" CTA → `/brands/new`
- [x] Each brand card: click → `/brands/:id`

**File: `apps/web/lib/api-client.ts`**

- [x] Add `brands.create(data)` — `POST /api/brand-profiles`
- [x] Add `brands.list()` — `GET /api/brand-profiles`
- [x] Add `brands.get(id)` — `GET /api/brand-profiles/:id`
- [x] Add `brands.update(id, data)` — `PATCH /api/brand-profiles/:id`
- [x] Add `brands.logoUploadUrl(id, contentType)` — `POST /api/brand-profiles/:id/logo-upload-url`
- [x] Add `brands.completeOnboarding(id)` — `POST /api/brand-profiles/:id/complete-onboarding`

---

## Track 19 — Character Sheet (GPT-image-2)

### 19.1 — OpenAI Image Service

**File: `apps/api/services/openai-image.ts`** (new file)

- [x] Install `openai` npm package if not present: `pnpm --filter @repo/api add openai`
- [x] Initialize `new OpenAI({ apiKey: env.OPENAI_API_KEY })`
- [x] Export `generateCharacterSheet(prompt: string): Promise<Buffer>`
  - Call `openai.images.generate({ model: "gpt-image-2", prompt, n: 1, size: "1024x1024", response_format: "b64_json" })`
  - Return `Buffer.from(data[0].b64_json!, "base64")`

**File: `apps/api/lib/env.ts`**

- [x] Add `OPENAI_API_KEY` to env validation

### 19.2 — Claude: Character Sheet Prompt

**File: `apps/api/prompts/character-sheet.ts`** (new file)

- [x] Export `buildCharacterSheetPrompt(brand: BrandProfileRow): string`
  - Constructs a detailed GPT-image-2 prompt using all brand profile fields
  - Structure:
    ```
    Create a character reference sheet for a [visualStyle] style animated character.
    
    The sheet must show a 2×3 grid on a plain white background with these views labeled:
    Top row: Front view (full body) | 3/4 view | Side profile
    Bottom row: Expression: Neutral | Expression: Happy/Excited | Expression: Speaking/Talking
    
    Character: [characterDescription]
    Art style: [visualStyle description]
    Color palette: Primary [primaryColor], Secondary [secondaryColor if set]
    Tone: [tone] — the character should look [tone-appropriate descriptor]
    
    Requirements: consistent character design across all views, clean lines, 
    character occupies 80% of each cell, white background between cells.
    ```
  - Return the assembled prompt string

**File: `apps/api/routes/brands.ts`**

**`POST /api/brand-profiles/:id/generate-character-sheet`**

- [x] Get brand profile (verify ownership)
- [x] Validate: `characterType` must not be `'none'` (nothing to generate)
- [x] Validate: `characterDescription` must be set for `human`/`mascot` types
- [x] Call `buildCharacterSheetPrompt(brand)` → `generateCharacterSheet(prompt)`
- [x] Upload resulting buffer to GCS: `brands/{id}/character-sheet.png` (content-type: `image/png`)
- [x] PATCH `characterSheetGcsPath` on the brand profile
- [x] Return `{ characterSheetUrl: string }` (signed URL, 7-day TTL)
- [x] **Rate limit**: max 10 character sheet generations per brand profile (store count in brand_profiles or check count of generation events)

**`GET /api/brand-profiles/:id/character-sheet-url`**

- [x] Return signed URL for the character sheet if `characterSheetGcsPath` is set
- [x] Return `{ url: string | null }`

### 19.3 — Web UI: Character Sheet Review

**File: `apps/web/app/brands/[id]/character-sheet/page.tsx`** (new page)

**Generating state:**
- [x] On mount, if no character sheet exists → auto-call `POST /api/brand-profiles/:id/generate-character-sheet`
- [x] Show animated generation state: spinner + "Creating your character…"

**Review state (character sheet exists):**
- [x] Full-width display of the character sheet image
- [x] Two actions:
  - "Looks great → Continue" → `POST /api/brand-profiles/:id/complete-onboarding` → redirect to `/brands/:id/plan/new`
  - "Regenerate" → call generate endpoint again → show new image
- [x] Show regeneration count: "Generation 2 of 3 previews shown"
- [x] After the 3rd preview, the "Regenerate" button changes to "Try Different Style" which returns to the visual style step of onboarding

**No-character path:**
- [x] If `characterType === 'none'`, skip this page entirely — `complete-onboarding` is called automatically and user is redirected to content plan creation

**File: `apps/web/lib/api-client.ts`**

- [x] Add `brands.generateCharacterSheet(id)` — `POST /api/brand-profiles/:id/generate-character-sheet`
- [x] Add `brands.characterSheetUrl(id)` — `GET /api/brand-profiles/:id/character-sheet-url`

---

## Track 20 — Content Planner

### 20.1 — Database Migration

**Migration: `apps/api/lib/db/migrations/0020_content_plans.sql`**

```sql
CREATE TABLE "content_plans" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "brand_profile_id" uuid NOT NULL REFERENCES "brand_profiles"("id") ON DELETE CASCADE,
  "user_id"          text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start_date"  date NOT NULL,
  "posts_per_day"    integer NOT NULL DEFAULT 1,
  "status"           text NOT NULL DEFAULT 'draft',
  "topics"           jsonb NOT NULL DEFAULT '[]',
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "videos"
  ADD COLUMN "content_plan_id"  uuid REFERENCES "content_plans"("id") ON DELETE SET NULL,
  ADD COLUMN "brand_profile_id" uuid REFERENCES "brand_profiles"("id") ON DELETE SET NULL,
  ADD COLUMN "dialogue_segments" jsonb;
```

- [x] Add migration to `_journal.json` as idx 21 (note: idx 20 was already taken)
- [x] Add `contentPlans` table to `apps/api/lib/db/schema.ts`
- [x] Export `ContentPlanRow` inferred type
- [x] Run `pnpm --filter @repo/api db:migrate`

### 20.2 — Claude: Week Plan Generation

**File: `apps/api/prompts/content-plan.ts`** (new file)

- [x] Export `buildWeekPlanMessages(brand: BrandProfileRow, postsPerDay: number, weekStartDate: string): ClaudeMessage[]`
  - System: "You are a social media content strategist. Generate a 7-day short-form video content plan."
  - User prompt includes all brand profile fields + posts per day + week start date
  - Requests JSON array matching Topics JSONB schema
  - Instructions: vary formats (ugc/montage/tutorial/story), mix evergreen and trending angles, start every hook with a pattern interrupt

**File: `apps/api/services/claude.ts`**

- [x] Add `generateWeekPlan(brand: BrandProfileRow, postsPerDay: number, weekStartDate: string): Promise<Topic[]>`
  - Call `buildWeekPlanMessages`, `max_tokens: 4000`
  - Parse and validate JSON response
  - Return typed `Topic[]` array

### 20.3 — API: Content Plan Routes

**File: `apps/api/routes/content-plans.ts`** (new file)

**`POST /api/content-plans`**

- [x] Request body: `{ brandProfileId: string, postsPerDay: 1 | 2 | 3 | 5 }`
- [x] Get brand profile (verify ownership, verify `onboardingComplete`)
- [x] Compute `weekStartDate` as next Monday (or current Monday if today is Monday)
- [x] Call `generateWeekPlan` → `topics`
- [x] Insert into `content_plans` with `status: 'draft'`
- [x] Return `{ contentPlan: ContentPlanRow }`

**`GET /api/content-plans/:id`**

- [x] Return content plan with nested `videos` array (if generation has started)
- [x] Include video status, thumbnail if available

**`PATCH /api/content-plans/:id/topics/:index`**

- [x] Request body: `{ title?, hook?, format?, angle?, scriptOutline? }`
- [x] Merge override into `topics[index]`, set `overridden: true`
- [x] Update `topics` JSONB in-memory and persist via Drizzle update
- [x] Return updated content plan

**`POST /api/content-plans/:id/regenerate`**

- [x] Re-run `generateWeekPlan` → replace all non-overridden topics
- [x] Topics with `overridden: true` are preserved unchanged
- [x] Return updated content plan

**`POST /api/content-plans/:id/approve`**

- [x] Validate: plan must be in `'draft'` status
- [x] Set plan `status: 'approved'`
- [x] For each topic, create a `videos` row: `{ userId, contentPlanId, brandProfileId, title: topic.title, type: mapFormatToVideoType(topic.format), status: 'DRAFT' }`
- [x] Return `{ ok: true, videoIds: string[] }`

**File: `apps/api/src/index.ts`**

- [x] Register `content-plans.ts` router inside authScope

### 20.4 — Types

**`packages/types/src/index.ts`**

- [x] Add `ContentPlan` interface
- [x] Add `ContentPlanStatus = 'draft' | 'approved' | 'generating' | 'complete'`
- [x] Add `ContentFormat = 'ugc' | 'montage' | 'tutorial' | 'story'`
- [x] Add `TopicEntry` interface matching Topics JSONB schema

### 20.5 — Web UI: Content Plan Creation

**File: `apps/web/app/(dashboard)/brands/[id]/plan/new/page.tsx`** (new page)

**Posting cadence selection:**
- [x] 4 large option cards: 1 video/day, 2 videos/day, 3 videos/day, 5 videos/day
- [x] Each card shows: posts × 7 = total videos this week
- [x] "Generate Week 1 Plan" button → `POST /api/content-plans`
- [x] Show loading state: "Claude is planning your week…"

**File: `apps/web/app/(dashboard)/brands/[id]/plan/[planId]/page.tsx`** (content plan review page)

**Week calendar layout:**
- [x] 7 columns (Mon–Sun), N rows (posts per day)
- [x] Each cell = a topic card:
  - Title (bold, 1 line)
  - Hook (italic, 2 lines max)
  - Format badge (UGC / Montage / Tutorial / Story)
  - Edit icon (pencil) — opens inline override panel
- [x] "Regenerate Plan" button (top right) — preserves overridden cards, re-generates the rest
- [x] "Start Generating →" button (primary CTA, full width at bottom)
  - Calls `POST /api/content-plans/:id/approve`
  - Redirects to `/brands/:id`

**Inline override panel (per card):**
- [x] Slide-in from the right — opens when edit icon clicked
- [x] Fields: Title, Hook, Format (dropdown), Angle, Script outline
- [x] "Save Override" → `PATCH /api/content-plans/:id/topics/:index`
- [x] Overridden cards show a small "edited" badge in the top corner

**File: `apps/web/lib/api-client.ts`**

- [x] Add `contentPlans.create(data)` — `POST /api/content-plans`
- [x] Add `contentPlans.get(id)` — `GET /api/content-plans/:id`
- [x] Add `contentPlans.overrideTopic(id, index, data)` — `PATCH /api/content-plans/:id/topics/:index`
- [x] Add `contentPlans.regenerate(id)` — `POST /api/content-plans/:id/regenerate`
- [x] Add `contentPlans.approve(id)` — `POST /api/content-plans/:id/approve`

---

## Track 21 — Agentic Pipeline + Progress UI

### 21.1 — Batch Generation Orchestrator

**File: `apps/api/services/batch-generator.ts`** (new file)

This service processes all videos in a content plan sequentially per-video, parallelizing at the scene/clip level (as current).

```typescript
export async function startBatchGeneration(planId: string): Promise<void>
```

- [x] Fetch the content plan + all its videos
- [x] Set plan `status: 'generating'`
- [x] For each video in the plan (process in parallel up to a concurrency limit of 3):
  1. Emit `VIDEO_UPDATE` SSE event: `{ videoId, status: 'SCRIPT_PENDING' }`
  2. `generateScript(video)` → update `videos.script`
  3. Emit `VIDEO_UPDATE`: `{ status: 'SCENES_PENDING' }`
  4. `generateDialogueSegments(script, sceneCount)` → update `videos.dialogueSegments`
  5. `splitScenes` inline (all scenes auto-approved for batch)
  6. Emit `VIDEO_UPDATE`: `{ status: 'CLIPS_QUEUED' }`
  7. Insert `clip_requests` and set `CLIPS_QUEUED`
  8. Wait for video `status` to become `'COMPLETE'` or `'FAILED'` (poll every 30s with 30-min timeout)
  9. Emit `VIDEO_UPDATE`: `{ status: 'DONE' | 'FAILED' }`
- [x] After all videos processed: set plan `status: 'complete'`
- [x] Send completion email via Resend (see 21.3)
- [x] Emit `BATCH_COMPLETE` SSE event

**Concurrency control:**
- [x] Simple semaphore: max 3 videos generating concurrently

**Error handling:**
- [x] If a video fails, mark it `FAILED`, continue with remaining videos

### 21.2 — SSE Progress Stream

**File: `apps/api/routes/content-plans.ts`**

**`GET /api/content-plans/:id/progress`** (SSE endpoint)

- [x] Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- [x] Subscribe to plan event bus (EventEmitter-based, same pattern as `videos.ts`)
- [x] Forward all `VIDEO_UPDATE`, `BATCH_COMPLETE`, `ERROR` events as SSE
- [x] Send heartbeat `event: ping` every 15 seconds
- [x] Close connection when `BATCH_COMPLETE` received

**File: `apps/api/lib/plan-event-bus.ts`** (new file)

- [x] Singleton map of planId → EventEmitter
- [x] `emitPlanEvent(planId, event)` — broadcast to all subscribers
- [x] `subscribeToPlan(planId, handler)` — returns unsubscribe function
- [x] Auto-cleanup: remove emitter 5 minutes after `BATCH_COMPLETE`

### 21.3 — Completion Email

**File: `apps/api/services/email.ts`** (new file)

- [x] `sendBatchCompleteEmail(userId, planId, successCount, failCount)`
- [x] Fetch user email from DB
- [x] Send via Resend with HTML template and CTA link

### 21.4 — Web UI: Agent Activity Panel

**File: `apps/web/app/(dashboard)/brands/[id]/plan/[planId]/progress/page.tsx`** (new page)

- [x] Top banner: "Your content is being generated" with animated pulse indicator
- [x] Sub-text: "You can close this tab — we'll email you when everything's ready"
- [x] Scrollable feed: video title + status icon + label
- [x] Color coding: green (complete), amber (in-progress), red (failed)
- [x] Status labels: "Scripting…", "Planning scenes…", "In Grok queue…", "Assembling…", "Ready"
- [x] Bottom summary bar: "X / Y videos complete"
- [x] On `BATCH_COMPLETE`: "All done! N videos ready" + "Review Videos" CTA

**File: `apps/web/hooks/usePlanProgress.ts`** (new hook)

- [x] Connect to `GET /api/content-plans/:id/progress` SSE via fetch + Auth header
- [x] Parse events into `videoStatuses: Map<videoId, { title, status, message }>`
- [x] Track `completedCount`, `failedCount`, `totalCount`, `isBatchComplete`
- [x] Auto-disconnect when `BATCH_COMPLETE`

---

## Track 22 — Facebook Posting

### 22.1 — Database Migration

**Migration: `apps/api/lib/db/migrations/0021_post_schedules.sql`**

```sql
CREATE TABLE "post_schedules" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id"          uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "social_account_id" uuid NOT NULL REFERENCES "social_accounts"("id") ON DELETE CASCADE,
  "scheduled_at"      timestamp,
  "post_type"         text NOT NULL DEFAULT 'draft',
  "platform_post_id"  text,
  "status"            text NOT NULL DEFAULT 'pending',
  "error_message"     text,
  "created_at"        timestamp NOT NULL DEFAULT now(),
  "updated_at"        timestamp NOT NULL DEFAULT now()
);
```

- [x] Add migration to `_journal.json` as idx 22 (file: 0022_post_schedules.sql)
- [x] Add `postSchedules` table to schema
- [x] Export `PostScheduleRow`
- [ ] Run `pnpm --filter @repo/api db:migrate`

### 22.2 — Facebook Graph API Service

**File: `apps/api/services/facebook.ts`** (new file)

- [x] Export `uploadReelToFacebook(pageId: string, pageAccessToken: string, videoBuffer: Buffer, description: string, options: { draft: boolean, scheduledAt?: Date }): Promise<string>`
  - Use `form-data` multipart POST to `https://graph-video.facebook.com/v19.0/{pageId}/videos`
  - Fields: `source` (video buffer), `description`, `published` = `false` (always upload as unpublished first), `content_category: 'BEAUTY_FASHION'` (or appropriate)
  - If `!draft && scheduledAt`: add `scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000)`
  - If `!draft && !scheduledAt`: add `published: true` for immediate publishing
  - Returns `videoId` (Facebook's video ID)

**Notes on Facebook video upload:**
- Max file size: 10 GB
- Supported formats: MP4, MOV
- Scheduled publish time must be at least 10 minutes in the future and at most 6 months
- Requires `pages_manage_posts` permission

### 22.3 — API: Posting Routes

**File: `apps/api/routes/social.ts`** (extend existing file)

**`POST /api/videos/:id/post`**

- [x] Request body: `{ socialAccountId: string, postType: 'draft' | 'scheduled', scheduledAt?: string }`
- [x] Fetch video (must be `COMPLETE` status, must belong to user)
- [x] Fetch social account (must belong to user)
- [x] Download video from GCS to buffer
- [x] Call `uploadReelToFacebook(...)` 
- [x] Insert into `post_schedules`
- [x] Return `{ postSchedule: PostScheduleRow }`

**`GET /api/videos/:id/post-status`**

- [x] Return all `post_schedules` for the video

### 22.4 — Agentic Auto-Post

In `apps/api/services/batch-generator.ts`:

- [x] After a video reaches `COMPLETE` status, check if the content plan's brand profile has a connected `social_account_id`
- [x] Check the user's posting preference (`postType` set during content plan approval — add this field to content_plans)
- [x] If `autoPost: true`: call `POST /api/videos/:id/post` logic directly
- [x] `scheduledAt`: computed from the topic's `day` + `slot` relative to `weekStartDate`, using best-practice time slots (e.g. day 1 slot 1 = Monday 9am local time — use UTC, let user configure timezone later)

### 22.5 — Add Posting Preference to Content Plan Approval

**`POST /api/content-plans/:id/approve`** — extend request body:

- [x] Add `postType: 'draft' | 'scheduled' | 'manual'` to request body
- [x] Store as column on `content_plans`: `post_type text NOT NULL DEFAULT 'draft'`
- [x] Migration: add `post_type` column to `content_plans`

**Web UI — content plan review page:**

- [x] Above "Start Generating →" button, add posting preference selector:
  - "Save as Drafts" (default) — posts created as FB drafts, user publishes manually
  - "Schedule automatically" — posts scheduled based on optimal time slots
  - "Don't post — download only" — no Facebook posting

### 22.6 — Video Library: Post Status Badges

**File: `apps/web/app/library/page.tsx`** (existing video library)

- [x] Each video card: show `post_schedules` status badge
  - No schedule: no badge
  - Draft: gray "Draft" badge
  - Scheduled: blue "Scheduled [date]" badge
  - Posted: green "Posted" badge
  - Failed: red "Failed" badge with tooltip

---

## Track 23 — Extension: Character Sheet Attachment

### 23.1 — Operator Queue: Include Character Sheet URL

**File: `apps/api/routes/operator.ts`**

In `GET /api/operator/queue` SQL:

- [x] Join `videos` → `brand_profiles` to get `characterSheetGcsPath`
- [x] If `characterSheetGcsPath` is set, generate a signed URL (7-day TTL) and include it as `characterSheetUrl` in the `ClaimedClip` response
- [x] If not set, return `characterSheetUrl: null`

```sql
-- In the CTE, join to brand_profiles:
LEFT JOIN brand_profiles bp ON v.brand_profile_id = bp.id
```

```typescript
// In the TypeScript row type:
characterSheetUrl: characterSheetGcsPath
  ? await generateSignedUrl(characterSheetGcsPath, 7 * 24 * 60)
  : null
```

### 23.2 — Extension Types

**File: `apps/extension/src/lib/api-client.ts`**

- [x] Add `characterSheetUrl: string | null` to `ClaimedClip` interface

**File: `apps/extension/src/lib/messages.ts`**

- [x] Add `characterSheetBytes: number[] | null` and `characterSheetType: string` to `ProcessClipMsg` (or to `PROCESS_CLIP` message type definition)

### 23.3 — Extension Background Service Worker

**File: `apps/extension/src/background/index.ts`**

**`TabEntry` interface:**

- [x] Add `characterSheetUrl: string | null`
- [x] Add `characterSheetBytes: number[] | null`
- [x] Add `characterSheetType: string`

**In `sendClipToTab` (the function that pre-fetches assets and sends `PROCESS_CLIP`):**

- [x] After claiming the clip, check `clip.characterSheetUrl`
- [x] If present, pre-fetch the character sheet:
  ```typescript
  let characterSheetBytes: Uint8Array | null = null;
  let characterSheetType = "image/png";
  if (clip.characterSheetUrl) {
    try {
      const res = await fetch(clip.characterSheetUrl);
      if (res.ok) {
        characterSheetBytes = new Uint8Array(await res.arrayBuffer());
        characterSheetType = res.headers.get("content-type") ?? "image/png";
      }
    } catch (err) {
      console.warn(`[SW] Character sheet fetch failed:`, err);
      // Non-fatal — proceed without character sheet
    }
  }
  ```
- [x] Include in `PROCESS_CLIP` message:
  ```typescript
  characterSheetBytes: characterSheetBytes ? Array.from(characterSheetBytes) : null,
  characterSheetType,
  ```

**Restore `ATTACH_IMAGE` message handler:**

- [x] Add `ATTACH_IMAGE` back to the `ContentMsg` union type:
  ```typescript
  | { type: "ATTACH_IMAGE"; clipId: string; imageBytes: number[]; imageType: string }
  ```
- [x] Restore the `case "ATTACH_IMAGE":` handler in the content-script message listener.
  This handler executes in the `MAIN` world via `chrome.scripting.executeScript`:
  1. Converts `imageBytes: number[]` → `Uint8Array` → `Blob` → `File`
  2. Finds `document.querySelector<HTMLInputElement>('input[type="file"]')`
  3. Sets `input.files` via `DataTransfer`
  4. Dispatches `change` + `input` events
  5. Calls React fiber `onChange` directly (walk `__reactFiber*` key chain)
  6. Returns `{ ok: boolean, reason: string }`

  **Full handler code (restore from commit `ac7cc1c:apps/extension/src/background/index.ts` lines 504–589).**

### 23.4 — Extension Content Script

**File: `apps/extension/src/content/index.ts`**

**`ProcessClipMsg` interface:**

- [x] Add `characterSheetBytes: number[] | null`
- [x] Add `characterSheetType: string`

**In `processClip` destructuring:**

- [x] Add `characterSheetBytes` and `characterSheetType` from `msg`

**Restore `attachImageViaMainWorld`:**

- [x] Restore the function (from commit `ac7cc1c:apps/extension/src/content/index.ts`):
  ```typescript
  function attachImageViaMainWorld(
    clipId: string,
    imageBytes: Uint8Array,
    imageType: string,
  ): Promise<void>
  ```
  Sends `{ type: "ATTACH_IMAGE", clipId, imageBytes: Array.from(imageBytes), imageType }` to the background script and awaits `{ ok: true }`.

**Phase 0 — Character Sheet Attachment (new, before Phase 1):**

Insert this block at the very top of `processClip`, before the Phase 1 image snapshot:

```typescript
// ── Phase 0: attach character sheet (if present) ──────────────────────────
```

- [x] Check: `if (characterSheetBytes && characterSheetBytes.length > 0)`
- [x] Convert: `const bytes = new Uint8Array(characterSheetBytes)`
- [x] Call: `await attachImageViaMainWorld(clip.id, bytes, characterSheetType)`
- [x] Wait 800ms after attachment for Grok's UI to process the file (Grok may show a preview thumbnail)
- [x] If attachment fails, log warning and continue — the visual prompt VISUAL BIBLE text anchor provides fallback consistency
- [x] Wrap in try/catch: catch → `console.warn("[RF] Character sheet attachment failed:", err)` → continue (non-fatal)

**Ordering in `processClip`:**
```
Phase 0: attach character sheet
Phase 1: snapshot pre-existing images → type visual prompt → click generate → wait for image
Phase 1.5: click image → wait for lightbox
Phase 2: click video icon → type motion prompt → submit → wait for video → upload
```

### 23.5 — Verification

- [x] `pnpm check-types` — zero errors across all workspaces including extension
- [x] `pnpm lint` — zero warnings
- [x] Confirm `ATTACH_IMAGE` appears exactly once in background and once in content script:
  ```bash
  grep -rn "ATTACH_IMAGE" apps/extension/src/
  ```
- [ ] Confirm `characterSheetUrl` flows through: operator.ts → api-client.ts → background → content script

---

## Migration Summary (in order)

| idx | File | Description |
|---|---|---|
| 0017 | `0017_remove_voiceover.sql` | Drop voiceover columns from videos |
| 0018 | `0018_social_accounts.sql` | Create social_accounts table |
| 0019 | `0019_brand_profiles.sql` | Create brand_profiles table |
| 0020 | `0020_content_plans.sql` | Create content_plans, add columns to videos |
| 0021 | `0021_post_schedules.sql` | Create post_schedules, add post_type to content_plans |

All migrations must be added to `apps/api/lib/db/migrations/meta/_journal.json` before running.

---

## New Environment Variables

| Variable | Service | Required By |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-image-2) | Track 19 |
| `FACEBOOK_APP_ID` | Facebook OAuth | Track 17 |
| `FACEBOOK_APP_SECRET` | Facebook OAuth | Track 17 |
| `FACEBOOK_REDIRECT_URI` | Facebook OAuth | Track 17 |

---

## Implementation Order

Given cross-track dependencies, implement in this order:

1. **Track 16** — Remove ElevenLabs (no dependencies, cleans up pipeline)
2. **Track 17** — Social accounts (needed by brand profiles + posting)
3. **Track 18** — Brand profiles (needed by character sheet + content plan)
4. **Track 19** — Character sheet (needed by extension attachment)
5. **Track 23** — Extension character sheet attachment (depends on 19 for the GCS path; depends on 16 for clean motion prompt flow)
6. **Track 20** — Content planner (depends on brand profiles)
7. **Track 21** — Agentic pipeline (depends on content plans)
8. **Track 22** — Facebook posting (depends on social accounts + agentic pipeline)

---

## Open Questions / Verify Before Coding

1. **`input[type="file"]` presence in Grok Phase 1**: The `ATTACH_IMAGE` mechanism relies on `document.querySelector('input[type="file"]')` being present on the Grok Imagine page. Verify this in DevTools before the extension character sheet attachment is considered stable. The selector has worked historically (commit `ac7cc1c`) but Grok's DOM may have changed.

2. **Grok audio generation**: Confirm that Grok Imagine's video generation currently produces clips with spoken audio when the motion prompt contains dialogue instructions (e.g. "Character says: 'Did you know that...'"). Test with one clip before finalizing the dialogue prompt format.

3. **Facebook App Review**: For production use of `pages_manage_posts`, a Facebook App Review is required (1–2 week process). For MVP development, use a test page registered to the developer account — no review needed. Plan App Review submission alongside Track 22 development.

4. **GPT-image-2 character sheet quality**: After Track 19 is implemented, evaluate whether the single `1024×1024` multi-pose sheet provides sufficient reference for Grok to maintain character consistency across scenes. If not, consider generating a single close-up reference portrait instead and using Grok's `@` reference for consistency.

---

## Spec Corrections & Clarifications

Issues found during review of v7.0 draft. All corrections below supersede the corresponding track sections.

### C1 — Facebook OAuth Pattern (Track 17)
The spec says "popup or redirect" — **use redirect-back pattern**. Flow:
1. API returns `authUrl`
2. Web app does `window.location.href = authUrl` (full redirect, not popup — avoids popup blockers)
3. Facebook redirects to `FACEBOOK_REDIRECT_URI` (e.g. `https://app.reelforge.io/channels/fb-callback`)
4. The callback page reads `?code=...&state=...` from URL, calls the API, shows page picker modal
5. On page selection → connect → redirect to `/channels`

### C2 — Facebook Reels Endpoint (Track 22)
Use `/{page-id}/video_reels` (not `/{page-id}/videos`) for Reels-format posts. This endpoint is optimized for vertical short-form and creates a Reel rather than a standard video post. Parameters differ slightly: use `video_url` (for remote URL from GCS) instead of `source` (binary upload) to avoid buffering the whole file in memory — GCS signed URLs work directly.

### C3 — Logo Color Extraction (Track 18 Step 6)
Implement client-side only using Canvas API. After the logo is uploaded and the GCS signed URL is available:
1. Draw the image onto an off-screen `<canvas>`
2. Sample a grid of pixels (e.g. 10×10 = 100 samples)
3. Cluster by hue into 2 dominant colors
4. Pre-fill the color pickers
No backend service needed. Use a small helper function in the web app.

### C4 — Batch Concurrency (Track 21)
Revise: process scripts and scenes for ALL videos in parallel (Claude rate limits are generous), but throttle `submitForClips` calls so at most **5 videos** have open clip requests at once. This prevents flooding the extension queue before earlier clips are processed. Use a sliding window semaphore on the `submitForClips` step only.

### C5 — Agent Activity Page State Persistence (Track 21)
When a user navigates away and returns to the progress page, it must reconstruct state from the DB (not rely on in-memory SSE events). On mount:
1. `GET /api/content-plans/:id` — fetch plan + nested videos with current `status`
2. Render each video's status from DB state
3. Subscribe to SSE for live updates going forward
4. The SSE stream replays the last 30 events on connect (server keeps a ring buffer per plan) so late joiners catch up

### C6 — Brand Onboarding API Timing (Track 18)
Create the `brand_profiles` row immediately when the user starts step 1 (on "Continue" from step 1). This gives all subsequent steps a `brandId` to PATCH against. Logo upload and character generation need this ID. Implement in the web app: `useEffect` on step 1 completion → `POST /api/brand-profiles` with the niche data → store `brandId` in component state.

### C7 — Wizard Deprecation (Existing Pages)
The old per-video wizard at `/videos/[id]` is **deprecated for new content** but kept for legacy pre-v7 videos:
- Videos with `content_plan_id: null` (old): still open the wizard as before
- Videos with `content_plan_id` set (new batch): the wizard URL redirects to a read-only "Video Detail" view (see U13)
- Step 3 (Voice) is removed from the wizard for all videos (Track 16)
- The wizard step count changes from 7 to 6 steps

### C8 — Billing Impact
The existing daily video limit model is preserved but applied at the **batch generation level**. When a content plan is approved:
- The system checks `dailyLimit * 7 >= totalVideosInPlan` — if not, shows a warning: "Your Starter plan allows 5 videos/day. This plan has 14 videos (2/day). Approve anyway and we'll pace the generation to respect your daily limit."
- Generation is paced: max `dailyLimit` videos are submitted per calendar day
- If the user's plan runs out mid-week, generation pauses and they're notified

### C9 — SSE Ring Buffer for Plan Events
In `plan-event-bus.ts`, maintain a ring buffer of the last 50 events per plan. On SSE connect, flush the buffer to the new subscriber before switching to live events. This handles the "user closes tab and reopens" scenario without requiring a separate DB query for event history.

### C10 — `video_reels` Upload Approach
Facebook's Reels API accepts `video_url` pointing to a publicly accessible URL. Since GCS signed URLs are public-readable by anyone with the URL, pass the signed URL directly. This avoids streaming the entire video buffer through the API server. Steps:
1. Generate a fresh signed GET URL (15-min TTL) for the assembled video
2. POST to `/{page-id}/video_reels` with `{ video_url: signedUrl, description, published: false }`
3. Facebook fetches the video from GCS directly
4. Store the returned `video_id` as `platform_post_id`

---

## Information Architecture (New in v7)

### Navigation Structure

The sidebar navigation is restructured from the current Projects-centric model to a Brands-centric model.

**Current sidebar:**
```
Dashboard (Projects)
My Videos
Settings
Billing
```

**New sidebar:**
```
─────────────────────────
  ReelForge  [logo]
─────────────────────────
  Home             /dashboard
  Library          /library
─────────────────────────
  Brands           /brands
  Channels         /channels
─────────────────────────
  Settings         /settings
  Billing          /billing
─────────────────────────
  [Usage meter]
  [Upgrade CTA]
```

Two visual divider groups:
1. **Overview** — Home + Library (consuming existing content)
2. **Content** — Brands + Channels (managing the content machine)
3. **Account** — Settings + Billing

### Page Hierarchy

```
/dashboard                      → New home: brands overview + active plans
/channels                       → Social account connections
/channels/fb-callback           → Facebook OAuth return handler

/brands                         → Brand profile list
/brands/new                     → Brand onboarding wizard (7 steps)
/brands/[id]                    → Brand detail + content plans list
/brands/[id]/character-sheet    → Character sheet review
/brands/[id]/plan/new           → Cadence picker + generate plan
/brands/[id]/plan/[planId]      → Content plan calendar + overrides
/brands/[id]/plan/[planId]/progress → Agent activity feed

/library                        → All videos (updated with post status)
/videos/[id]                    → Legacy wizard (pre-v7 videos) / Video detail (v7 videos)

/settings                       → Unchanged
/billing                        → Minor updates
```

All `/brands`, `/channels`, `/brands/*` pages live inside the `(dashboard)` route group and use the existing sidebar layout.

### First-Time User Funnel (replaces existing onboarding modal)

The existing 3-step modal (create project → how it works → done) is **replaced**. Instead:

1. New user signs up via Clerk
2. `/dashboard` checks: `user.onboardingComplete === false`
3. Rather than a modal, redirect immediately to `/brands/new` with a `?onboarding=true` query param
4. `/brands/new` with `?onboarding=true` shows a **welcome banner** at the top:
   - "Welcome! Let's set up your content machine. Takes about 5 minutes."
   - Dismissible × button (sets `onboardingComplete: true` without requiring brand setup)
5. After completing brand setup → character sheet → first plan → generation starts → mark `onboardingComplete: true`

This is a **funnel, not a modal** — users can navigate away and return, and the brand wizard saves progress at each step.

---

## UI/UX Specifications (v7 Screens)

Design system tokens are the same as `ReelForge_UI_UX_Spec.md` §1. All new screens use the same dark palette, Inter font, and 4px spacing scale. Notes below only call out deviations or component-specific details.

---

### U1 — Sidebar Navigation (Updated)

**File to update:** `apps/web/components/layout/app-sidebar.tsx`

```
Section 1: Overview
  Home       (HomeIcon)       /dashboard
  Library    (LibraryIcon)    /library

Section 2: Content
  Brands     (LayersIcon)     /brands
  Channels   (PlugIcon)       /channels

Section 3: Account
  Settings   (SettingsIcon)   /settings
  Billing    (CreditCardIcon) /billing
```

Visual treatment for section headers (new pattern):
- Small all-caps label `--text-muted`, font-size 10px, letter-spacing 0.08em, padding: 16px top + 4px bottom
- No nav item bullet for section labels — they're non-interactive

Active state rule: `pathname.startsWith(href)` — `/brands/new` activates Brands, `/brands/:id/...` activates Brands.

Remove `FolderOpen` "Projects" nav item entirely.

Usage meter and Upgrade CTA — unchanged logic, same position.

---

### U2 — New Dashboard / Home (`/dashboard`)

**File:** `apps/web/app/(dashboard)/dashboard/page.tsx` — full rewrite.

**Three states:**

**State A — No brands yet (new user):**
```
┌─────────────────────────────────────────┐
│  ✦ Welcome to ReelForge                 │
│                                         │
│  Your content machine is almost ready.  │
│  Set up your first brand to start       │
│  generating videos automatically.       │
│                                         │
│  [→ Set Up My Brand]  (primary, large)  │
└─────────────────────────────────────────┘
```
Full-width centered card (`--bg-surface`, 16px radius, accent primary top border 2px). No grid — just this single card centered with a faint animated gradient background (same as the landing page hero gradient).

**State B — Has brands, no active plans:**
```
Page header: "Dashboard"  [+ New Brand] (secondary button)

Brand cards grid (2 columns on desktop, 1 on mobile):
┌────────────────────────────┐
│  [Character sheet thumb]   │ ← 120×120 image, rounded-lg
│                            │
│  My Fitness Brand          │ ← bold, --text-primary
│  Fitness · Cartoon · Human │ ← muted pills
│  ● Facebook · Page Name    │ ← green dot + page name, or "No channel connected"
│                            │
│  [Create Week Plan →]      │ ← primary button, full width
└────────────────────────────┘
```

Brand card specs:
- `--bg-surface`, 12px radius, `shadow-card`
- Character sheet thumbnail: 120×120, `object-fit: cover`, rounded-lg, positioned top-right of card
- If no character sheet yet: gray placeholder with a person icon
- Platform badge: green dot + page name if connected; yellow dot + "Connect channel" if not
- Hover: subtle scale(1.01) + glow border `--accent-primary` at 20% opacity

**State C — Has active content plans:**
```
"Active this week"  (section heading, --text-secondary)
┌───────────────────────────────────────────────┐
│  My Fitness Brand · Week of May 13            │
│  ████████████░░░░░░  8 / 14 videos done       │
│  3 ready to post · 2 queued · 4 generating    │
│  [View Progress]  [Go to Plan]                │
└───────────────────────────────────────────────┘

"Your Brands"  (section heading)
[Brand cards grid — same as State B]
```

Active plan card: `--bg-elevated`, 12px radius, accent secondary left border (3px). Progress bar uses `--accent-primary`. Status counts use color-coded pills: success for ready, warning for generating, muted for queued.

---

### U3 — Channels Page (`/channels`)

**File:** `apps/web/app/(dashboard)/channels/page.tsx` (new)

```
Page header: "Channels"

Connected accounts list:
┌────────────────────────────────────────┐
│  [FB icon]  My Fitness Page            │
│             Facebook · Connected       │
│             Last used: 2 days ago      │
│                           [Disconnect] │
└────────────────────────────────────────┘

Empty state (no channels):
┌────────────────────────────────────────────────┐
│  [Plug icon centered]                          │
│  No channels connected                         │
│  Connect a social account to enable            │
│  auto-posting when your videos are ready.      │
│  [Connect Facebook Page →]  (primary button)   │
└────────────────────────────────────────────────┘
```

Connected account card: `--bg-surface`, `shadow-card`, flex row. Left: platform color circle with platform icon (Facebook blue `#1877F2`). Middle: page name + platform + last used. Right: "Disconnect" danger ghost button. On disconnect: confirm dialog ("This will stop auto-posting for all brands using this channel.").

**Facebook connect button CTA:** Opens Facebook OAuth (full redirect). After OAuth callback + page selection, returns here with the new account listed.

**Page picker modal** (shown after OAuth callback):
- Modal, 480px wide, title: "Choose a Page to connect"
- List of pages from the API (radio select)
- Each row: page avatar + page name + follower count
- "Connect this page →" primary button
- If user has no pages: "No pages found. You need to be an admin of a Facebook Page."

---

### U4 — Brand List Page (`/brands`)

**File:** `apps/web/app/(dashboard)/brands/page.tsx` (new)

```
Page header: "Brands"                    [+ New Brand] (primary button)

Brand grid (2 columns desktop, 1 mobile):
[Brand cards — same as Dashboard State B]
```

Empty state (no brands):
```
[Layers icon centered]
"No brands yet"
"A brand is your content identity — visual style, character,
 and tone — that travels across all your videos."
[Create Your First Brand →]
```

Brand card click → navigates to `/brands/:id`.

---

### U5 — Brand Detail Page (`/brands/[id]`)

**File:** `apps/web/app/(dashboard)/brands/[id]/page.tsx` (new)

```
Breadcrumb: Home > Brands > [Brand Name]

Brand header row:
  [Character sheet 80×80]   My Fitness Brand
                            Fitness · Cartoon · Human · Facebook connected
                            [Edit Brand]  [+ New Plan]

Content Plans section:
  "Week of May 13 — 14 videos"   [generating badge]   [View]
  "Week of May 6 — 14 videos"    [complete badge]      [View]

Empty state for plans:
  "No content plans yet."
  [Create Week 1 Plan →]
```

Plan list rows: `--bg-surface` card, flex row. Left: week date range. Middle: video count + status badge. Right: "View Plan" link. Completed plans show a green checkmark badge. Generating plans show an amber spinner badge.

---

### U6 — Brand Onboarding Wizard (`/brands/new`)

**File:** `apps/web/app/(dashboard)/brands/new/page.tsx` (new)

**Layout:** Full-page within the dashboard layout (sidebar visible). Center column max-width 640px. Step progress bar at the top of the content area (not inside a modal).

**Welcome banner** (shown with `?onboarding=true`):
```
┌─────────────────────────────────────────────────────┐
│ ✦ Welcome!  Set up your brand — takes ~5 minutes.   │
│ Your character and content plan are created here.  [×]│
└─────────────────────────────────────────────────────┘
```
Amber background (`--accent-warning` at 10% opacity), amber left border.

**Progress bar:** 7 horizontal segments above the step card. Completed = `--accent-primary`. Active = `--accent-primary` at 50% + pulsing. Remaining = `--bg-border`. Step labels shown below each segment (hidden on mobile, visible on ≥768px).

Step labels: Niche · Audience · Tone · Style · Character · Colors · Review

---

**Step 1 — Your Niche**

```
H2: "What's your content about?"
Subtext: "We'll use this to tailor every script and visual."

Niche category grid (3 columns, 10 cards):
┌───────────┐ ┌───────────┐ ┌───────────┐
│  💪        │ │  💰        │ │  💄        │
│  Fitness  │ │  Finance  │ │  Beauty   │
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│  🎮        │ │  🍕        │ │  🏢        │
│  Gaming   │ │  Food     │ │  Business │
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│  📚        │ │  🎭        │ │  🌿        │
│  Education│ │  EntTment │ │  Lifestyle│
└───────────┘ └───────────┘ └───────────┘
             ┌───────────┐
             │  ＋        │
             │  Other    │
             └───────────┘

[After selection — text input slides in below]
"Describe your specific niche:"
[e.g. "Calisthenics for beginners over 40"    ]  ← textarea 2 rows

canAdvance: category selected
```

Category card specs: 80×80px, `--bg-elevated`, 12px radius. Selected state: `--accent-primary` border 2px + `--accent-primary` at 8% background. Emoji 24px. Label 12px `--text-primary`. On category select: text input fades in with a CSS height transition.

---

**Step 2 — Your Audience**

```
H2: "Who are you making this for?"

Age group (single select row):
[ Gen Z (16–25) ]  [ Millennials (25–40) ]  [ Gen X (40–55) ]  [ All ages ]

Content vibe (single select row):
[ Entertainment ]  [ Education ]  [ Inspiration ]  [ Humor ]

canAdvance: both rows have a selection
```

These are pill-toggle buttons (full-round, 36px tall). Selected state: `--accent-primary` background, white text. Unselected: `--bg-elevated`, `--text-secondary`.

---

**Step 3 — Brand Tone**

```
H2: "How does your brand communicate?"

2-column card grid (3 rows = 6 cards):
┌──────────────────────┐ ┌──────────────────────┐
│  ⚡ Energetic & Hype  │ │  📖 Calm & Educational│
│  High energy, fast   │ │  Informative, clear   │
│  paced, exciting     │ │  and trustworthy      │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│  😄 Witty & Funny    │ │  🌟 Inspirational     │
│  Humor, memes,       │ │  Uplifting, motivating│
│  relatable takes     │ │  transformation focus │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│  💼 Professional     │ │  🎬 Dramatic & Intense│
│  Expert, polished,   │ │  Cinematic, tension,  │
│  authoritative       │ │  high stakes          │
└──────────────────────┘ └──────────────────────┘
```

Card specs: flex column, 120px tall, `--bg-elevated` → `--bg-surface` on selected. Selected: `--accent-primary` border 2px. Emoji 20px. Title bold 14px. Description 11px `--text-muted`.

---

**Step 4 — Visual Style**

```
H2: "What should your videos look like?"

2-column card grid (3 rows = 6 cards):
Each card has a small example image (80×45px, object-fit cover, rounded-md)
plus style name and a 1-line descriptor.

Realistic    │  Real-world, photography feel
Anime        │  Japanese animation style
3D Animation │  Pixar / game engine quality
Cartoon      │  Flat design, illustrated
Cinematic    │  Film-grade, dramatic lighting
Minimalist   │  Clean, simple, whitespace-heavy
```

The example images are static placeholder gradients for MVP (solid color blocks matching the style's feel — e.g. Anime = soft purple/teal gradient). Replace with curated sample images post-MVP.

---

**Step 5 — Your Character**

```
H2: "Who stars in your videos?"

2-column card grid (2 rows = 4 cards):
┌──────────────────────┐ ┌──────────────────────┐
│  🧑 Human Presenter  │ │  🐻 Brand Mascot      │
│  Speaks to camera,   │ │  Animal or creature   │
│  relatable narrator  │ │  as your brand icon   │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│  ◈  Abstract         │ │  ∅  No Character      │
│  Symbolic shape or   │ │  Product-focused,     │
│  entity (e.g. AI)    │ │  scene storytelling   │
└──────────────────────┘ └──────────────────────┘

[On Human or Mascot selection — inline text area expands:]
"Describe your character:"
Placeholder: "e.g. 'Young woman, early 30s, athletic build,
short dark hair, always in workout clothes, warm smile'"
Character counter: 0 / 300

canAdvance: character type selected; if Human/Mascot, description ≥ 30 chars
```

The description text area uses `transition: max-height 0.3s ease` to animate in. Background `--bg-base`, border `--bg-border`, 4 rows.

---

**Step 6 — Brand Colors (Optional)**

```
H2: "What colors define your brand?"
Subtext: "These appear in your character design and subtitles."

Logo upload area:
┌────────────────────────────────────────────────┐
│  Upload your logo  (optional)                  │
│  Drag & drop or click to browse                │
│  PNG, JPG, SVG · Max 5 MB                      │
└────────────────────────────────────────────────┘
← On upload: thumbnail preview replaces the upload zone.
  "Colors extracted!" toast. Color pickers auto-fill.

Color pickers (shown below upload zone, or standalone):
Primary color:    [███████] #f55c2a   [color input]
Secondary color:  [███████] #4a90e2   [color input]

[Skip for now →] (ghost button, right-aligned)
[Continue →]     (primary button)

canAdvance: always (colors are optional)
```

Upload zone: dashed border `--bg-border`, `--bg-elevated` background, 120px tall. Color input is `<input type="color">` styled with a 32×32px color swatch + hex text input beside it.

Logo upload flow: call `POST /api/brand-profiles/:id/logo-upload-url` → PUT to signed URL → PATCH `logoGcsPath` → run client-side Canvas color extraction → set color picker values.

---

**Step 7 — Review + Name**

```
H2: "Looking good — name your brand"

Name input (large, prominent):
Brand name: [My Fitness Brand                  ]
            e.g. "My Fitness Brand", "TechByte Clips"

Summary cards (read-only, 2-column grid):
┌──────────────┐ ┌──────────────┐
│ Niche        │ │ Audience     │
│ Fitness      │ │ Millennials  │
│ Calisthenics │ │ Inspiration  │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ Tone         │ │ Style        │
│ Energetic    │ │ 3D Animation │
└──────────────┘ └──────────────┘
┌──────────────┐
│ Character    │
│ Human        │
│ Presenter    │
└──────────────┘

Each summary card has an edit icon (pencil) in the top-right corner — clicking it jumps back to that step.

Optional reference URL:
"Paste a TikTok or Reels URL you love the vibe of:"
[https://                                         ]

[← Edit]  (ghost)    [Create Brand →]  (primary, large)
```

On "Create Brand →":
- `POST /api/brand-profiles` with all data
- Loading state on the button: spinner + "Creating…"
- On success → redirect to `/brands/:id/character-sheet`
- If `characterType === 'none'` → skip character sheet → redirect to `/brands/:id/plan/new`

---

### U7 — Character Sheet Review (`/brands/[id]/character-sheet`)

**File:** `apps/web/app/(dashboard)/brands/[id]/character-sheet/page.tsx` (new)

**Breadcrumb:** Home > Brands > [Brand Name] > Character Sheet

**Three states:**

**State A — Generating (auto-triggered on mount):**
```
──────────────────────────────────────────────
                [Animated sparkle icon]
         Creating your character…
         GPT-image-2 is generating your
         multi-pose reference sheet.
         This takes about 20–30 seconds.
──────────────────────────────────────────────
```
Full-width centered column. Animated pulsing circle in `--accent-primary`. Progress text cycles through:
- "Analyzing your brand profile…"
- "Building character reference…"
- "Rendering poses and expressions…"
- "Almost done…"
(Each line fades in/out every 6 seconds.)

**State B — Review:**
```
┌──────────────────────────────────────────────────┐
│  Your Character                                  │
│  Based on your brand profile                     │
│                                                  │
│  [Full-width character sheet image               │
│   max-width 800px, centered, rounded-xl          │
│   border --bg-border, shadow-card]               │
│                                                  │
│  Generation 1 · Looking for changes?             │
│  [↺ Regenerate]  (ghost)    [Looks great →] (primary) │
└──────────────────────────────────────────────────┘
```

Image: `<img>` with `src={characterSheetUrl}`, `max-width: 800px`, `width: 100%`, `border-radius: 16px`.

On "Regenerate": button changes to `spinner + "Regenerating…"` (disabled). Old image fades out (opacity 0.3). New image fades in. Generation count increments.

After 3rd generation — "Regenerate" becomes "Try different style →" which navigates back to `/brands/new?step=4` (visual style step).

**State C — Error:**
```
[Warning icon]
"Character generation failed."
[Error message from API]
[Try Again]  [Skip for now →]
```

"Skip for now" → set `onboardingComplete: true` with a null characterSheet → navigate to `/brands/:id/plan/new`.

---

### U8 — New Content Plan (`/brands/[id]/plan/new`)

**File:** `apps/web/app/(dashboard)/brands/[id]/plan/new/page.tsx` (new)

**Breadcrumb:** Home > Brands > [Brand Name] > New Plan

```
H1: "How often do you want to post?"
Subtext: "We'll create a full week of content based on your brand."

4 large cards (2×2 grid, mobile: 1 column):
┌─────────────────────┐ ┌─────────────────────┐
│         📅           │ │         📅 📅          │
│   1 video / day     │ │   2 videos / day    │
│   7 videos total    │ │   14 videos total   │
└─────────────────────┘ └─────────────────────┘
┌─────────────────────┐ ┌─────────────────────┐
│      📅 📅 📅         │ │   📅 📅 📅 📅 📅       │
│   3 videos / day    │ │   5 videos / day    │
│   21 videos total   │ │   35 videos total   │
└─────────────────────┘ └─────────────────────┘

[Below selected card — billing note if applicable:]
"Your Starter plan supports up to 5 videos/day. ✓" (green)
OR
"Your Starter plan supports 5/day. 35 videos will be
paced over 7 days." (amber)

Week start date (auto-set, display only):
"Week starting Monday, May 16, 2026"

[← Back]    [Generate Week 1 Plan →]  (primary, large)
```

Card specs: 160px tall, `--bg-elevated`, 12px radius. Selected: `--accent-primary` border 2px, light glow. Calendar emoji stack is decorative — use actual icon or CSS pattern.

On "Generate Week 1 Plan →":
- Button: spinner + "Claude is planning your week…"
- `POST /api/content-plans` 
- On success → redirect to `/brands/:id/plan/:planId`

Loading state takes 5–15 seconds. Show a full-page skeleton while waiting:
```
"Planning your content…"
[Progress bar animating]
"Claude is creating 14 unique video ideas
tailored to your brand."
```

---

### U9 — Content Plan Calendar (`/brands/[id]/plan/[planId]`)

**File:** `apps/web/app/(dashboard)/brands/[id]/plan/[planId]/page.tsx` (new)

**Breadcrumb:** Home > Brands > [Brand Name] > Week of May 13

**Header row:**
```
"Week of May 13 – May 19, 2026"     [↺ Regenerate Plan]  [Start Generating →]
```

"Regenerate Plan" = ghost button. If any cards are overridden, shows tooltip: "Your [N] edited cards will be preserved."

"Start Generating →" = primary button, large. Disabled until user has scrolled to see all cards (or a 3-second delay — accessibility). On click: shows posting preference selector (modal, described below) then triggers generation.

**Posting Preference Modal** (shown before approval):
```
"How should we post your videos?"
○ Save as Drafts         ← Posts uploaded to Facebook as drafts
○ Schedule automatically ← Spaced at optimal times (Mon–Sun)
○ Download only          ← No Facebook posting

[Cancel]  [Start Generating →]
```

**Calendar grid:**

7-column grid (Mon–Sun). `posts_per_day` rows per column. Fixed column width: `(100% - 48px) / 7` on desktop, horizontal scroll on <768px.

Day header row (sticky top):
```
MON   TUE   WED   THU   FRI   SAT   SUN
13    14    15    16    17    18    19
```
Day headers: `--text-muted`, uppercase, 11px, letter-spacing 0.08em. Date below: `--text-secondary`, 14px.

**Topic card** (each video slot):
```
┌─────────────────────┐
│ UGC  [edited badge] │ ← format badge (pill) + optional override badge
│                     │
│ Bold hook line here │ ← title, bold, 13px, 2-line clamp
│ in two lines        │
│                     │
│ Angle/hook preview  │ ← hook, 11px --text-muted, 2-line clamp
│ first line shown    │
│               [✏]   │ ← edit icon, bottom-right
└─────────────────────┘
```

Card specs: `--bg-elevated`, 10px radius, min-height 110px. Format badge: full-round pill, 10px font. Colors by format:
- UGC: `--accent-secondary` (blue) at 15% bg + text
- Montage: purple `#a855f7` at 15% bg + text
- Tutorial: `--accent-success` (green) at 15% bg + text
- Story: `--accent-warning` (amber) at 15% bg + text

`[edited]` badge: tiny orange pill top-right corner.

Edit icon (✏): 14px, `--text-muted`, appears on hover. Click → opens override panel.

**Override slide-in panel** (right-side drawer):
```
"Edit Video Idea"                [×]
──────────────────────────────────
Title:
[                              ]

Hook (opening line):
[                              ]

Format:
[ UGC ▾ ] (dropdown: UGC / Montage / Tutorial / Story)

Angle:
[                              ]

Script outline:
[                              ]
                                (4 rows)
──────────────────────────────────
[Cancel]  [Save Override]  (primary)
```

Drawer: 360px wide, slides in from right, `--bg-surface`, border-left `--bg-border`. Backdrop blur behind it. On save → PATCH API → card updates in place with `[edited]` badge.

**Empty/loading state for calendar:**
While plan is being generated (redirect from plan/new loading state), show a 7-column skeleton grid with pulsing card placeholders.

**Responsive behavior:**
- Desktop (≥ 1024px): 7 columns, all visible
- Tablet (768–1023px): horizontal scroll, min 4 columns visible, scroll indicator
- Mobile (< 768px): single-column list (Mon → Sun), each day as a section header with cards beneath

---

### U10 — Agent Activity Feed (`/brands/[id]/plan/[planId]/progress`)

**File:** `apps/web/app/(dashboard)/brands/[id]/plan/[planId]/progress/page.tsx` (new)

**Overall layout:**
```
┌──────────────────────────────────────────────────────┐
│  ● Generating your Week 1 content                   │
│  You can close this tab — we'll email you when done  │
│                                                      │
│  8 / 14 complete  ██████████░░░░░░  57%             │
└──────────────────────────────────────────────────────┘

"Activity"                         [View Plan]  [Library]

┌──────────────────────────────────────────────────────┐
│ ✓  "5 Fitness Myths Debunked"     Ready   May 13    │
│ ✓  "Morning Routine for Gains"    Ready   May 13    │
│ ⟳  "Pre-Workout Secrets"          Assembling...     │
│ ⟳  "3 Moves for Abs"              In Grok queue...  │
│ ○  "Fat Loss Truth"               Scripting...      │
│ ○  "Sleep & Recovery"             Waiting           │
│    [12 more videos]                                  │
└──────────────────────────────────────────────────────┘
```

**Status banner** (top sticky card):
- Background: `--bg-surface`, left border `--accent-primary` 3px
- Animated green pulse dot (CSS animation) when generating
- Progress bar: `--accent-primary` fill with shimmer animation
- Text: "N / M complete" + percentage

**Activity feed** (scrollable, newest events at top):
- Each row: status icon + video title + status label + timestamp
- Max-height for visible area: calc(100vh - 200px), `overflow-y: auto`
- Rows beyond visible area are collapsed under "Show [N] more" button

Status icon + color:
- ✓ green `--accent-success` — Ready
- ⟳ amber spinning `--accent-warning` — In progress (Scripting / Planning / Queued / Assembling / Posting)
- ✕ red `--accent-danger` — Failed
- ○ muted `--text-muted` — Waiting

Status label text by video status:
| DB Status | Displayed As |
|---|---|
| PENDING | Waiting |
| SCRIPTING | Writing script… |
| SCENE_PLANNING | Planning scenes… |
| QUEUED | In Grok queue… |
| ASSEMBLING | Assembling video… |
| POSTING | Posting to Facebook… |
| COMPLETE | Ready |
| FAILED | Failed — [retry icon] |

Failed videos: show "Retry" ghost button (icon only on narrow screens). Retry re-queues just that video.

**On BATCH_COMPLETE — celebration state:**
```
┌──────────────────────────────────────────────────────┐
│  ✓  All done! 14 videos are ready.                  │
│  Check your email for a summary.                     │
│                                                      │
│  [Review Videos →]       (primary, large)            │
│  [View Content Plan]     (ghost)                    │
└──────────────────────────────────────────────────────┘
```

Status banner updates: green background (`--accent-success` at 10%), checkmark replaces pulse dot.

**"Review Videos →"** → navigates to `/library?plan=[planId]` (library filtered to this plan's videos).

**State persistence** (on page reload):
- On mount, `GET /api/content-plans/:id` to get current video statuses (C5 correction applies)
- Render static state from DB
- Subscribe to SSE for live updates
- SSE ring buffer (C9) replays last 50 events to catch up

---

### U11 — Library Page (Updated)

**File:** `apps/web/app/(dashboard)/library/page.tsx` — update existing page.

**New: Query param filter**
`?plan=[planId]` — filters to a specific content plan's videos. Shows a dismissible banner:
```
"Showing videos from: Week of May 13"  [Clear filter ×]
```

**New: Batch group headers**
When `?plan` is not set (showing all videos), group by content plan:
```
Week of May 13 · 14 videos  [View Plan]
  [video cards row — horizontal scroll on desktop, grid on tablet+]

Week of May 6 · 14 videos   [View Plan]
  [video cards row]

Ungrouped videos             ← legacy pre-v7 videos
  [video cards]
```

**New: Post status badge on video cards**
Add a second badge overlay on the bottom-left of each card thumbnail (below the existing status badge):
- No schedule: nothing
- `draft`: `DRAFT` gray pill
- `scheduled`: `SCHEDULED` blue pill + date on hover tooltip
- `posted`: `POSTED` green pill
- `failed`: `POST FAILED` red pill

**New: "Post to Facebook" action on video cards**
When video status is `COMPLETE` and no `post_schedule` exists:
- Add "Post" button to the video card actions row
- Opens inline popover:
  ```
  [ Save as Draft ]   [ Schedule for later ]
  ```
  "Schedule for later" shows a date/time picker inline.

---

### U12 — Landing Page Updates

**File:** `apps/web/app/page.tsx` and landing components — update text only.

**Section 2.3 "How It Works"** — update to reflect the new agentic flow:
1. **Connect your channel** — Link your Facebook page in one click
2. **Build your brand** — Choose your visual style and create your character
3. **Pick a posting cadence** — Tell us how many videos per day
4. **Review your week plan** — AI generates 7 days of ideas. Edit any.
5. **Press Go — we'll email you** — Automated pipeline runs overnight

Remove "voiceover" from step 3 (old step). Remove any mention of ElevenLabs.

**Section 2.4 Feature Row 3** — update copy:
- Remove: "mention of ElevenLabs voice, Grok visuals, ASS subtitle styles"
- Replace: "Grok-generated visuals with your character. Whisper-transcribed subtitles. Auto-posted to Facebook."

**Hero subheadline** — update from "script, voiceover, scenes, and subtitles" to "script, character, scenes, and subtitles — all automatically scheduled for posting."

---

### U13 — Video Wizard Behavior in v7

The existing wizard at `/videos/[id]` is preserved but changes behavior based on video origin:

**Pre-v7 videos** (`content_plan_id IS NULL`):
- Wizard opens normally
- Step 3 (Voice) is removed (Track 16) — wizard jumps from Script → Scenes
- Step count changes: 6 steps (Idea · Script · Scenes · Style · Processing · Done)

**v7 batch videos** (`content_plan_id IS NOT NULL`):
- Navigating to `/videos/[id]` redirects to a read-only **Video Detail page**
- Video detail shows: title, script, scenes (text prompts), subtitle style, video player, download button, post status
- No wizard navigation — the video was generated agentically, there's nothing to step through
- "Back to Plan" link in the header

**Implementation note:** In `apps/web/app/(wizard)/videos/[id]/page.tsx`, add a server-side check: if `video.contentPlanId` is set, redirect to a new `/videos/[id]/detail` page (or show a different client component).

---

### U14 — Billing Model Update

The billing page at `/billing` needs minor copy updates to reflect the new batch generation model:

**Update plan descriptions:**

| Plan | Current Copy | New Copy |
|---|---|---|
| Starter | "5 videos/day" | "5 videos/day · 35 videos/week · automated posting" |
| Pro | "unlimited videos" | "unlimited videos · all platforms · priority queue" |

**Add to billing FAQ:**
- "What happens if my plan limit is hit mid-week?" → Generation pauses, you're notified, resumes next day.
- "Are auto-posted videos counted against my plan?" → Yes, each generated video counts once.

---

## Revised Open Questions (v7.1)

Replacing the original Open Questions section with an updated list:

1. **`input[type="file"]` on Grok Phase 1**: Verify in DevTools that Grok Imagine still has a `<input type="file">` in Phase 1 (text→image mode). This is the character sheet attachment mechanism. Check before implementing Track 23. If missing: fall back to text-only VISUAL BIBLE anchor (already in motion prompts).

2. **Grok audio with dialogue**: Test whether Grok generates spoken audio matching dialogue in motion prompts. Try: `"Character speaks: 'Did you know 80% of people never stretch?' Direct to camera, excited expression."` — verify the clip has audible voice. If Grok does not generate speech audio reliably, reconsider — either add a minimal TTS fallback (OpenAI TTS is cheap) or design for silent video + subtitle-only.

3. **Facebook App Review timeline**: `pages_manage_posts` requires App Review. Apply during Track 22 development; approval takes 1–2 weeks. MVP can be tested with a developer-owned test page (no review needed). Schedule submission to coincide with Track 22 completion.

4. **GPT-image-2 character sheet fidelity**: After first implementation, test whether the multi-pose `1024×1024` sheet gives Grok enough visual context to maintain character consistency. If not, simplify to a single front-view portrait at `1792×1024` (wider = more detail). The `ATTACH_IMAGE` mechanism doesn't care about sheet layout — only that it's recognizable.

5. **Agentic pipeline rate limits**: With 35 videos in a batch, Claude will receive ~105 API calls (3 per video: script, dialogue, scenes). At `claude-sonnet-4-6` default rate limits (1000 RPM), this is trivial. However, FFmpeg worker capacity may become the bottleneck for assembly — verify Cloud Run instance scaling handles concurrent assembly jobs for 35 videos.

6. **Facebook `video_reels` endpoint validation**: Test the `/{page-id}/video_reels` endpoint with a small test video before Track 22 goes live. Facebook's Reels API has specific requirements: vertical orientation (9:16), minimum 3 seconds, maximum 90 seconds, MP4 format. Confirm the FFmpeg output (1080×1920 MP4) meets these requirements — it should, but verify.

7. **SSE scaling**: The current SSE implementation is in-process (EventEmitter per video). With 35 concurrent SSE streams (one per content plan), this is fine. If the platform scales to hundreds of simultaneous active plans, migrate to Redis pub/sub. Note for future scaling.
