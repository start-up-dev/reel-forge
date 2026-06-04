# ReelForge — Product Requirements Document v2

**Date:** May 19, 2026
**Status:** Authoritative. Supersedes all prior spec files (PRD_ReelForge.md, FEATURE_SPEC_v2–v7, ReelForge_MVP_Tasks.md, ReelForge_UI_UX_Spec.md).

---

## 1. Product Vision

ReelForge is a **set-and-go content machine** for short-form video. A user connects their Facebook page, then reviews and confirms an AI-generated brand profile (Claude analyses the connected page and proposes the niche, tone, audience, and character — the user edits any field inline or refines it conversationally), and generates a weekly content calendar. They press Approve and an agentic pipeline generates all videos — scripts, scenes, Grok Imagine clips, FFmpeg assembly, subtitles — fully automatically. Videos can auto-post to Facebook as drafts or scheduled posts. The user receives an email each time a video finishes assembly, plus a batch summary when the full week is ready.

---

## 2. User Journey

```
Connect Facebook page
        ↓
Brand onboarding (review AI-generated brand profile)
        ↓
Generate character sheet (GPT-image-2)
        ↓
Create content plan (Claude generates 7-day calendar)
        ↓
Review & optionally edit topics
        ↓
Choose posting mode (draft / scheduled / download only)
        ↓
Approve → batch generation starts automatically
        ↓
Claude generates scripts + scenes for all videos in parallel
        ↓
Operator extension claims clips, runs Grok Imagine, uploads to R2
        ↓
FFmpeg worker assembles clips, burns subtitles, produces final MP4s
        ↓
(If draft/scheduled) Auto-post to Facebook
        ↓
Email notification: "Your week is ready"
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 / React 19 / TypeScript 5.9 (port 3000) |
| API | Fastify 5 / TypeScript (port 4000) |
| Database | Neon PostgreSQL + Drizzle ORM |
| Storage | **Cloudflare R2** (S3-compatible API) |
| Auth | Clerk |
| Billing | Stripe |
| Email | Resend |
| AI – Script/Scenes/Plans | Claude Sonnet 4.6 (Anthropic SDK) |
| AI – Character Sheet | OpenAI GPT-image-2 |
| AI – Video Clips | xAI Grok Imagine (via operator Chrome extension) |
| AI – Transcription | Whisper (in worker) |
| Assembly | FFmpeg (Docker: jrottenberg/ffmpeg — do NOT run locally; Homebrew FFmpeg lacks libass) |
| Monorepo | Turborepo + pnpm 9, Node ≥ 18 |

---

## 4. Repository Structure

```
apps/
  web/       # Next.js 16 app — user-facing product
  api/       # Fastify API — all backend logic
  worker/    # FFmpeg assembly worker (Cloud Run, Docker)
  extension/ # Chrome MV3 operator extension (drives Grok Imagine)
packages/
  types/             # @repo/types — all domain types, enums, API shapes
  utils/             # @repo/utils — pure utility functions
  ui/                # @repo/ui — shared React component library
  eslint-config/     # shared ESLint configs
  typescript-config/ # shared TS configs
```

---

## 5. Database Schema

All tables use `created_at` and `updated_at` timestamps. All UUID primary keys except `users.id` which is the Clerk user ID (text).

### 5.1 `users`

| Column | Type | Notes |
|---|---|---|
| id | text PK | Clerk user ID |
| email | text unique | |
| first_name, last_name | text nullable | |
| plan | enum | `none` \| `try_out` \| `starter` \| `pro` |
| stripe_customer_id | text unique nullable | |
| stripe_subscription_id | text nullable | |
| trial_paid | bool default false | true after $5 one-time payment |
| trial_video_remaining | int default 0 | set to 7 on trial payment (one full week at 1/day) |
| videos_today | int default 0 | reset daily (UTC midnight) |
| videos_this_month | int default 0 | reset monthly |
| daily_limit | int default 0 | set by plan |
| monthly_limit | int default 0 | set by plan |
| last_reset_at | timestamp | |
| onboarding_complete | bool default false | |
| email_notify_ready | bool default true | |
| email_notify_failed | bool default true | |

### 5.2 `videos`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text FK users | cascade |
| brand_profile_id | uuid FK brand_profiles nullable | set null on delete |
| content_plan_id | uuid FK content_plans nullable | set null on delete |
| title | text | |
| status | enum | see §5.2.1 |
| idea | text nullable | |
| script | text nullable | |
| duration_seconds | int nullable | |
| subtitle_style | enum | `bold_pop` \| `word_highlight` \| `minimal` \| `cinematic` \| `neon_glow` \| `oversized_pop` \| `grouped_bold` \| `grouped_cinematic` \| `karaoke` |
| bgm_enabled | bool default false | |
| bgm_asset_id | text nullable | |
| bgm_volume | int default 15 | 0–100 |
| target_duration_seconds | int default 30 | 15/30/45/60 |
| video_type | enum | `generated` \| `talking` \| `action_reel` |
| ugc_visual_style | text nullable | |
| action_reel_style | text nullable | |
| voice_speed | real default 1.0 | |
| scene_count | int default 0 | |
| render_style | enum nullable | `mascot` \| `cartoon` \| `animation_2d` \| `motion_graphics` \| `cinematic` \| `stock_footage` \| `whiteboard` |
| dialogue_segments | jsonb nullable | `[{ sceneIndex, dialogue }]` |
| output_url | text nullable | R2 signed URL (7-day TTL) |
| error | text nullable | |
| deleted_at | timestamp nullable | soft delete |

**Indexes:** `(user_id)`, `(user_id, status)`

#### 5.2.1 `video_status` enum state machine

```
DRAFT
→ BRAINSTORM_PENDING → SCRIPT_PENDING → SCRIPT_READY
→ SCENES_PENDING → SCENES_READY
→ CLIPS_QUEUED → CLIPS_PROCESSING → CLIPS_NEEDS_REVIEW
→ ASSEMBLY_PENDING → ASSEMBLY_PROCESSING
→ COMPLETE | FAILED
```

### 5.3 `scenes`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| video_id | uuid FK videos | cascade |
| scene_index | int | 0-based |
| text_excerpt | text | narration fragment for this scene |
| visual_prompt | text | AI image prompt (9:16 framing) |
| motion_prompt | text | camera + subject movement instructions |
| duration_hint_seconds | int nullable | 1–6 |
| base_image_url | text nullable | Grok Phase 1 output |
| base_image_path | text nullable | R2 path |
| clip_url | text nullable | Grok Phase 2 output |
| clip_path | text nullable | R2 path |
| approved | bool default false | |

**Index:** `(video_id)`

### 5.4 `clip_requests`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| video_id | uuid FK videos | cascade |
| user_id | text FK users | cascade |
| scene_index | int | |
| visual_prompt | text | |
| motion_prompt | text | dialogue prepended if dialogue_segments exist |
| base_image_url | text nullable | |
| status | enum | `queued` \| `processing` \| `done` \| `failed` |
| queued_at | timestamp | |
| claimed_at | timestamp nullable | |
| processed_at | timestamp nullable | |
| clip_url | text nullable | |
| error | text nullable | |

**Indexes:** `(status, queued_at)`, `(video_id)`

### 5.5 `social_accounts`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text FK users | cascade |
| brand_profile_id | uuid FK brand_profiles nullable | set null on delete |
| platform | text | `facebook` \| `tiktok` |
| page_id | text | Facebook Page ID |
| page_name | text | |
| page_avatar_url | text nullable | |
| access_token | text | Facebook Page access token |
| token_expires_at | timestamp nullable | |

**Index:** `(user_id)`

### 5.6 `brand_profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text FK users | cascade |
| name | text | display name |
| niche | text | category |
| niche_description | text nullable | free-text detail |
| target_audience_age | text nullable | `gen_z` \| `millennial` \| `gen_x` \| `all` |
| target_audience_vibe | text nullable | `entertainment` \| `education` \| `inspiration` \| `humor` |
| tone | text | |
| visual_style | text | `realistic` \| `anime` \| `3d_animation` \| `cartoon` \| `cinematic` \| `minimalist` |
| character_type | text | `human` \| `mascot` \| `abstract` \| `none` \| `podcast` |
| character_description | text nullable | appearance, outfit, traits. For `podcast`, describes BOTH presenters (host + co-host) in this one field |
| character_sheet_gcs_path | text nullable | R2 path (field name legacy; actually R2) |
| logo_gcs_path | text nullable | R2 path (field name legacy; actually R2) |
| primary_color | text nullable | hex |
| secondary_color | text nullable | hex |
| reference_video_url | text nullable | TikTok/Reels vibe reference |
| website_url | text nullable | user's brand website URL |
| website_context | text nullable | Claude-extracted brand facts from the website |
| onboarding_complete | bool default false | |
| character_sheet_generation_count | int default 0 | capped at 10 |

**Index:** `(user_id)`

**Podcast duo (`character_type = podcast`):** A two-person podcast format reusing the `talking` pipeline — no new video type or schema column. Both presenters are described together in `character_description`. The character sheet is generated as a single two-shot studio scene (both presenters stacked top/bottom with mics + headphones) rather than a single-character reference grid; Grok reproduces that scene for every clip with one active speaker per line. Requires a character sheet like other non-`none` types.

### 5.7 `content_plans`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| brand_profile_id | uuid FK brand_profiles | cascade |
| user_id | text FK users | cascade |
| week_start_date | date | start of the plan week |
| posts_per_day | int default 1 | 1 \| 2 \| 3 \| 5 |
| status | text | `draft` \| `approved` \| `generating` \| `complete` |
| topics | jsonb | array of TopicEntry (see below) |
| post_type | text | `draft` \| `scheduled` \| `manual` |

**Indexes:** `(brand_profile_id)`, `(user_id)`

**TopicEntry shape (one element per video slot):**
```typescript
{
  index: number;         // 0-based position in the week
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;  // 1 = Monday
  slot: number;          // 1-based slot within the day
  title: string;
  hook: string;          // opening line / pattern interrupt
  format: "ugc" | "montage" | "tutorial" | "story";
  angle: string;         // creative angle
  scriptOutline: string; // 2–3 sentence brief
  overridden: boolean;   // true if user manually edited this topic
}
```

### 5.8 `post_schedules`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| video_id | uuid FK videos | cascade |
| social_account_id | uuid FK social_accounts | cascade |
| scheduled_at | timestamp nullable | null = draft |
| post_type | text | `draft` \| `scheduled` \| `manual` |
| platform_post_id | text nullable | Facebook video ID after upload |
| status | text | `pending` \| `posted` \| `failed` |
| error_message | text nullable | |

**Indexes:** `(video_id)`, `(social_account_id)`

---

## 6. API Routes

### 6.1 Authentication

All routes require Clerk auth (`Authorization: Bearer <session_token>`) except:
- `POST /api/billing/webhook` (Stripe signature validation)
- `POST /api/users/sync` (Clerk webhook SVIX signature)
- Operator routes: `X-Operator-Secret` header instead

### 6.2 Videos (`/api/videos`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/videos` | List user's videos. Query: `page`, `search`, `status`. Returns paginated `VideoLibraryItem[]` with `postSchedule`. |
| GET | `/api/videos/:id` | Single video with scenes + clip request statuses. |
| PATCH | `/api/videos/:id` | Update fields: title, idea, script, subtitleStyle, bgmEnabled, bgmAssetId, bgmVolume, targetDurationSeconds, renderStyle, videoType, ugcVisualStyle, actionReelStyle, voiceSpeed. |
| DELETE | `/api/videos/:id` | Soft delete (sets `deletedAt`). |
| PATCH | `/api/videos/:id/scenes/:index` | Edit scene: visualPrompt, motionPrompt, approved. |
| GET | `/api/videos/:id/progress` | SSE stream of clip generation events (CLIP_PROCESSING, CLIP_DONE, CLIP_FAILED, SNAPSHOT, QUEUE_POSITION, HEARTBEAT). |
| GET | `/api/videos/:id/status-stream` | SSE polling every 2s: status, clipsDone, clipsTotal, queuePosition, estimatedWaitSeconds. |
| POST | `/api/videos/:id/post` | Manually post video to Facebook. Body: `{ socialAccountId, postType, scheduledAt? }`. |
| GET | `/api/videos/:id/post-status` | All post_schedules for a video. |

### 6.3 Users (`/api/users`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/users/sync` | Clerk webhook (user.created) — inserts user row. |
| GET | `/api/users/me` | Authenticated user profile. |
| PATCH | `/api/users/me` | Update: onboardingComplete, firstName, lastName, emailNotifyReady, emailNotifyFailed. |

### 6.4 Brand Profiles (`/api/brand-profiles`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/brand-profiles` | List all brands with connected channels. |
| POST | `/api/brand-profiles` | Create brand. Body: name, niche, tone, visualStyle, characterType, + optional fields. |
| GET | `/api/brand-profiles/:id` | Single brand with channels array and signed characterSheetUrl. |
| PATCH | `/api/brand-profiles/:id` | Partial update any fields. |
| DELETE | `/api/brand-profiles/:id` | Delete brand. |
| POST | `/api/brand-profiles/:id/suggest` | Claude analyzes channel info (+ website context if ingested) and suggests brand profile values. Body: `{ feedback? }`. Returns `BrandSuggestion`. |
| POST | `/api/brand-profiles/:id/ingest-website` | Fetch website, extract brand facts with Claude, save to `website_context`. Body: `{ websiteUrl }`. Returns `{ websiteContext }`. |
| POST | `/api/brand-profiles/:id/logo-upload-url` | Get R2 signed PUT URL for logo. Body: `{ contentType }`. Returns `{ uploadUrl, gcsPath }`. |
| POST | `/api/brand-profiles/:id/complete-onboarding` | Set `onboardingComplete = true`. |
| POST | `/api/brand-profiles/:id/generate-character-sheet` | Generate character sheet via GPT-image-2. Rate-limited: max 10 per brand. Returns `{ characterSheetUrl }`. |
| GET | `/api/brand-profiles/:id/character-sheet-url` | Returns `{ url, generationCount }`. |
| GET | `/api/brand-profiles/:brandId/content-plans` | List content plans for a brand. |

### 6.5 Content Plans (`/api/content-plans`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/content-plans` | Create plan. Body: `{ brandProfileId, postsPerDay: 1|2|3|5 }`. Claude generates `postsPerDay × 7` topics. |
| GET | `/api/content-plans/:id` | Plan with nested video statuses: `[{ id, title, status, outputUrl }]`. |
| PATCH | `/api/content-plans/:id/topics/:index` | Override a single topic: title, hook, format, angle, scriptOutline. Sets `overridden: true`. |
| POST | `/api/content-plans/:id/regenerate` | Regenerate only non-overridden topics via Claude. |
| POST | `/api/content-plans/:id/approve` | Body: `{ postType }`. Atomically: set status → approved, insert video rows from topics. Fire-and-forget: starts `startBatchGeneration()`. |
| POST | `/api/content-plans/:id/retry-generation` | Re-triggers stuck approved plans. |
| DELETE | `/api/content-plans/:id` | Delete plan. |
| GET | `/api/content-plans/:id/progress` | SSE stream. Replays buffered events (ring buffer, last 50). Emits: SNAPSHOT, VIDEO_UPDATE, ERROR, BATCH_COMPLETE. |

### 6.6 Social (`/api/social`, `/api/auth`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/facebook/authorize` | Build Facebook OAuth URL. Query: `brandId?`. Returns `{ authUrl }`. |
| GET | `/api/auth/facebook/callback` | Exchange code for token, fetch user's pages. Returns `{ pages: [{ id, name, pictureUrl, accessToken }] }`. |
| POST | `/api/social/facebook/connect` | Upsert social account. Body: `{ pageId, pageName, pageAvatarUrl?, accessToken, brandProfileId? }`. If no brandProfileId, auto-creates draft brand. |
| GET | `/api/social/accounts` | List user's social accounts (no access_token). |
| DELETE | `/api/social/accounts/:id` | Disconnect. |

### 6.7 Billing (`/api/billing`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/billing/webhook` | Stripe webhook. Handles checkout.session.completed, subscription events. |
| POST | `/api/billing/trial-checkout` | Create $5 one-time Stripe checkout. Body: `{ videoId? }`. |
| POST | `/api/billing/subscribe` | Create subscription checkout. Body: `{ plan: "starter" | "pro" }`. |
| GET | `/api/billing/portal` | Get Stripe customer portal URL. |
| POST | `/api/billing/dev-simulate` | Dev only: simulate plan. Body: `{ plan }`. |

### 6.8 Operator (`/api/operator`) — Extension Only

Authenticated with `X-Operator-Secret` header.

| Method | Path | Description |
|---|---|---|
| GET | `/api/operator/queue/count` | Queued clip count. |
| GET | `/api/operator/queue` | Atomically claim clips (FOR UPDATE SKIP LOCKED). Query: `batch_size` (default 30, max 50). Returns clip details including characterSheetUrl. |
| POST | `/api/operator/clips/:id/upload-url` | Get 30-min signed PUT URL for clip upload. |
| POST | `/api/operator/clips/:id/complete` | Mark clip done, update scene, dispatch assembly if all clips complete. Body: `{ gcsPath }`. |
| POST | `/api/operator/clips/:id/fail` | Mark clip failed. Body: `{ error }`. |
| GET | `/api/operator/clips/statuses` | All active clip statuses. |
| POST | `/api/operator/clips/:id/retry` | Reset failed clip → queued. |

### 6.9 Jobs (`/api/jobs`) — Cron Only

Authenticated with `X-Operator-Secret` header.

| Method | Path | Schedule |
|---|---|---|
| POST | `/api/jobs/cleanup-stale-clips` | Every 5 min — reset processing clips stuck >10min to queued |
| POST | `/api/jobs/reset-daily-quota` | UTC midnight — reset `videosToday = 0` |
| POST | `/api/jobs/reset-monthly-quota` | 1st of month UTC midnight — reset `videosThisMonth = 0` |

---

## 7. Core Services

### 7.1 Claude Service (`apps/api/services/claude.ts`)

All calls use `claude-sonnet-4-6`. Title generation uses `claude-haiku-4-5-20251001`.

| Function | Purpose |
|---|---|
| `generateScript(brand, idea, targetDurationSeconds, renderStyle?, videoType?, actionReelStyle?)` | Returns a plain text script. Word range: 15s→30–45w, 30s→65–85w, 45s→100–120w, 60s→135–160w. Talking videos: sceneCount sentences, 12–16 words each. |
| `generateTitle(idea)` | Returns 3–6 word title (haiku model). |
| `generateDialogueSegments(script, sceneCount)` | Splits script into N segments: `[{ sceneIndex, dialogue }]`. Best-effort, non-fatal if fails. |
| `splitScenes(script, audioDurationSeconds, videoType, renderStyle?, ugcVisualStyle?, characterNote?, actionReelStyle?, hasCharacterSheet?)` | Returns `[{ sceneIndex, textExcerpt, visualPrompt, motionPrompt, durationHintSeconds }]`. Retry loop 3× on parse failure. Talking/action_reel: always 6s per clip. |
| `generateWeekPlan(brand, postsPerDay, weekStartDate)` | Returns `TopicEntry[]` (postsPerDay × 7). Uses jsonrepair for malformed JSON. |
| `suggestBrandProfile(channelInfo)` | Returns `BrandSuggestion` from channel name/avatar + optional `websiteContext`. |
| `extractWebsiteContext(url, pageText)` | Claude (Haiku) extracts brand facts from stripped website text. Returns a compact key-value summary. |
| `generateIdeas(brand, topic, videoType?, actionReelStyle?)` | Returns 3 `IdeaCard[]`. |

### 7.2 Batch Generator (`apps/api/services/batch-generator.ts`)

`startBatchGeneration(planId, userId)` — fires and forgets, runs in background.

**Semaphore:** max 3 concurrent video generations.

**Self-healing:** if plan was approved but video rows are missing (crash during approve transaction), recreates video rows from `plan.topics`.

**Per-video pipeline (`processVideo`):**
1. `generateScript()` → updates `videos.script`, status → SCRIPT_READY
2. `generateTitle()` if title is missing
3. `splitScenes()` → inserts `scenes` rows, status → SCENES_READY
4. `generateDialogueSegments()` (best-effort) → stores in `videos.dialogue_segments`
5. Inserts `clip_requests` rows (dialogue prepended to motionPrompt if present), status → CLIPS_QUEUED
6. Increments `users.videosToday + 1`, `videosThisMonth + 1`
7. Polls video status every 30s, timeout 30 minutes
8. Returns `"COMPLETE" | "FAILED"`

**After all videos complete:**
- Calls `autoPostCompletedVideos()` — posts to Facebook if `postType !== "manual"`
- Calls `sendBatchCompleteEmail()`

**Scheduled post times:** slots map to UTC hours 9, 14, 17, 20. day=1 → weekStartDate, day=7 → weekStartDate + 6 days.

### 7.3 Facebook Service (`apps/api/services/facebook.ts`)

`uploadReelToFacebook(pageId, pageAccessToken, videoBuffer, description, options)`

Posts to `graph-video.facebook.com/v19.0/{pageId}/videos` via multipart FormData.
- `content_category`: `BEAUTY_FASHION`
- Draft: `published=false`
- Scheduled: `published=false`, `scheduled_publish_time={unix epoch}` (min 10 minutes from now)
- Immediate: `published=true`

Returns Facebook video ID.

### 7.4 OpenAI Image Service (`apps/api/services/openai-image.ts`)

`generateCharacterSheet(prompt): Promise<Buffer>`

Calls GPT-image-2 (`openai.images.generate`) with `size: "1024x1024"`, `response_format: "b64_json"`. Returns PNG buffer.

---

## 8. Prompt Architecture

All prompt builders live in `apps/api/prompts/`. They return structured input for Claude API calls; Claude service functions call them.

| File | Builder | Inputs |
|---|---|---|
| `script.ts` | `buildScriptMessages(brand, idea, targetDurationSeconds, renderStyle?, videoType?, actionReelStyle?)` | Brand context, idea, duration target. When `brand.character_type = podcast`: writes a strict turn-by-turn two-host dialogue (no speaker labels), one sentence per 6s clip, alternating Speaker A/B |
| `scenes.ts` | `buildScenesMessages(script, audioDurationSeconds, targetCount, renderStyle?, characterNote?, hasCharacterSheet?)` | For `generated` videoType |
| `talking.ts` | `buildTalkingSceneMessages(script, audioDurationSeconds, targetCount, ugcVisualStyle?, characterNote?, hasCharacterSheet?, isPodcast?)` | For `talking` videoType — 6s clips. `isPodcast` enables PODCAST DUO mode (two-shot, both presenters, one active speaker per line) |
| `action-reel.ts` | `buildActionReelScriptMessages(brand, idea, targetDurationSeconds, actionReelStyle?)` | Shot-by-shot action plan (no narration) |
| `action-reel.ts` | `buildActionReelSceneMessages(script, audioDurationSeconds, targetCount, actionReelStyle?, characterNote?, hasCharacterSheet?)` | For `action_reel` videoType — 6s clips |
| `content-plan.ts` | `buildWeekPlanMessages(brand, postsPerDay, weekStartDate)` | Generates JSON TopicEntry array |
| `character-sheet.ts` | `buildCharacterSheetPrompt(brand, feedback?)` | Returns GPT-image-2 prompt string. Default: character 2×3 reference grid. When `character_type = podcast`: a single two-shot podcast studio scene (both presenters) |
| `character.ts` | (character description builder) | Used in scene prompts |
| `ideas.ts` | `buildIdeasMessages(brand, topic, videoType?, actionReelStyle?)` | Returns 3 IdeaCard objects |
| `utils.ts` | `brandContext(brand)` | Formats brand profile as readable context string |

**`hasCharacterSheet` flag:** When true, visual prompts instruct Claude to defer character description to the attached reference sheet rather than describing in text. The extension then attaches the character sheet image to the Grok Imagine tab.

---

## 9. Operator Extension

Located in `apps/extension/src/`. Chrome MV3, two scripts.

### 9.1 Background Service Worker (`background/index.ts`)

**Runtime state:**
```typescript
activeTabs: Map<tabId, TabEntry>   // clips being processed
session: { done, failed, startedAt }
failedClips: FailedClipEntry[]
running: boolean
clipStatuses: StoredClipStatusMap  // persisted 7-day history
```

**Settings** (stored in `chrome.storage.local`):
- `backendUrl`, `operatorSecret`, `batchSize` (default 30), `concurrentTabs` (default 3)

**State machine:**
1. `start()` — enable polling
2. `poll()` — `GET /api/operator/queue` → for each clip, `openClipTab()`
3. `openClipTab()` — create Chrome tab for grok.com/imagine, send PROCESS_CLIP message
4. Content script drives Grok, reports back via chrome.runtime.sendMessage
5. On CLIP_COMPLETE: close tab, continue
6. On TAB_ERROR: close tab, call `/api/operator/clips/:id/fail`
7. `stop()` — disable polling

**TabEntry shape:**
```typescript
{
  clipId, videoId, videoTitle, sceneIndex,
  visualPrompt, motionPrompt, textExcerpt,
  videoType, characterSheetUrl,
  characterSheetBytes: number[] | null,
  characterSheetType: string,
  startedAt: number
}
```

**Character sheet:** Pre-fetched as bytes array in SW, injected into content script alongside the clip data.

### 9.2 Content Script (`content/index.ts`)

Injected into Grok Imagine tabs. Receives `PROCESS_CLIP` message.

**Steps:**
1. Fill visual prompt into Grok's input
2. If `characterSheetBytes`: attach as reference image to Grok's file input
3. Set motion prompt / combined prompt
4. Click generate, wait for video output
5. Download generated clip from Grok
6. `POST /api/operator/clips/:id/upload-url` → get signed R2 PUT URL
7. `PUT` clip to R2
8. `POST /api/operator/clips/:id/complete` with `{ gcsPath }`
9. Send CLIP_COMPLETE to background

---

## 10. FFmpeg Worker

Located in `apps/worker/src/`. Standalone Fastify service. **Must run in Docker** — uses jrottenberg/ffmpeg base image for `libass` subtitle support.

**Entry:** `POST /assemble` with `{ videoId }` — responds 202 immediately, processes async.

**Assembly pipeline (`assemble.ts`):**

1. **Claim:** Atomic update `ASSEMBLY_PENDING → ASSEMBLY_PROCESSING` (SKIP LOCKED for multi-instance safety)
2. **Download:** All scene clips from R2, BGM track if `bgmEnabled`
3. **Normalize:** `normalizeAllClips()` — EBU R128 loudness, trim to `durationHintSeconds` (generated only; talking/action_reel clips not trimmed to preserve lipsync/pacing)
4. **Concatenate:** `concatenateWithTransitions()` — cross-fade transitions between clips
5. **Transcribe:** `transcribeAudio()` — Whisper API on assembled audio
6. **Subtitles:** `generateSubtitles()` — builds a styled `.ass` from Whisper word timestamps; `burnSubtitles()` — ffmpeg `ass` filter. All styles render **middle-centred** (ASS alignment 5) so captions sit in the vertical middle of the frame (suits the podcast two-shot seam). Robustness: zero-length Whisper word windows are kept (not dropped), and `holdUntilNext()` extends every caption to the start of the next one — no flashing or missed words; the final caption gets a minimum tail.
7. **BGM:** Mix in if `bgmEnabled` (volume from `bgmVolume` 0–100)
8. **Upload:** Final MP4 to R2
9. **Complete:** Update `videos.status = COMPLETE`, `videos.outputUrl = signed URL (7-day TTL)`, emit `COMPLETE` event

---

## 11. Plan Progress (SSE)

**Plan event bus** (`apps/api/lib/plan-event-bus.ts`):
- In-memory `EventEmitter` per planId
- **Ring buffer**: last 50 events stored — late subscribers replay on connect
- Events cleaned up 5 minutes after `BATCH_COMPLETE`
- Thread-safe: single Node.js process

**Event types:**
```typescript
VIDEO_UPDATE  — { videoId, title, status, message }
BATCH_COMPLETE — { totalVideos, successCount, failCount }
ERROR          — { videoId?, message }
```

Web hook `usePlanProgress(planId, totalVideos)` in `apps/web/hooks/usePlanProgress.ts` — connects to `GET /api/content-plans/:id/progress` SSE, maintains a `Map<videoId, { title, status }>`.

---

## 12. Billing & Quota

### 12.1 Plans

| Plan | Price | Type | Credits/Limits |
|---|---|---|---|
| **Try Out** | $5 | one-time | 7 video credits — one full week at 1/day (`trialVideoRemaining`) |
| **Starter** | $49/month | subscription | 1 video/day, 30 videos/month |
| **Pro** | $99/month | subscription | 3 videos/day, 90 videos/month |

Stripe price IDs from env: `STRIPE_TRIAL_PRICE_ID`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`.

### 12.2 Quota Logic (`apps/api/lib/quota.ts`)

`checkQuota(user): { allowed, reason, redirect? }` — pure function, evaluated in order:

1. `plan === "starter" | "pro"` → check `videosToday < dailyLimit` and `videosThisMonth < monthlyLimit`
2. `trialPaid === true` → check `trialVideoRemaining > 0`
3. No paid access → redirect to `"trial_checkout"`

Counters incremented in `batch-generator.ts → processVideo()` atomically with SQL: `videosToday + 1`, `videosThisMonth + 1`, and `GREATEST(trialVideoRemaining - 1, 0)` (trial users only, floored at 0).

**Plan approval pre-flight** (`POST /api/content-plans/:id/approve`): performs a fresh DB read of the user row and enforces:
- Trial users: `trialVideoRemaining >= topicCount` — else 403 INSUFFICIENT_CREDITS
- Starter/Pro users: `videosThisMonth + topicCount <= monthlyLimit` — else 403 QUOTA_EXCEEDED
- No paid access: 403 NO_PLAN

Note: `checkQuota()` in `lib/quota.ts` is a helper used for UI status checks; quota enforcement for batch generation is done via the approval pre-flight + per-video counter decrement described above.

### 12.3 Stripe Webhook Events

| Event | Action |
|---|---|
| `checkout.session.completed` (payment) | plan="try_out", trialPaid=true, trialVideoRemaining=7 |
| `checkout.session.completed` (subscription) | save stripeCustomerId, set plan + dailyLimit + monthlyLimit |
| `customer.subscription.created/updated` | sync plan limits if active/trialing |
| `customer.subscription.deleted` | plan="none", limits=0 |

---

## 13. Storage (Cloudflare R2)

All assets stored in Cloudflare R2 via S3-compatible API.

- **API:** `lib/storage.ts` — `generateSignedUploadUrl(path, ttlMinutes)`, `generateSignedReadUrl(path, ttlMinutes)`, `uploadFile(path, buffer, contentType)`, `deleteObject(path)`, `listObjects(prefix)`
- **TTL:** 7 days for read URLs served to clients / extension
- **Path conventions:**
  - Clips: `clips/{videoId}/{sceneIndex}.mp4`
  - Assembled output: `output/{videoId}/final.mp4`
  - Character sheets: `brands/{brandId}/character-sheet.png`
  - Logos: `brands/{brandId}/logo.{ext}`
- **Note:** Column names use `gcs_path` (legacy naming) but the actual storage backend is R2

---

## 14. Web App Pages

All under `app/(dashboard)/` with `AppSidebar` + `AppHeader` layout.

| Route | Page |
|---|---|
| `/dashboard` | Home overview — recent videos, stats |
| `/library` | Video gallery — paginated, searchable, filterable by status |
| `/brands` | Brand profile list — entry point is "Connect Channel" (Facebook OAuth) |
| `/brands/[id]` | Brand detail — two-column hub: identity cards with inline edit + channels + content plans (left); character sheet preview/regenerate + delete brand (right) |
| `/brands/[id]/onboard` | Claude-assistant brand setup/edit — works for both new and completed brands |
| `/brands/[id]/character-sheet` | GPT-image-2 character sheet — post-onboarding setup destination |
| `/brands/[id]/plan/new` | Choose posting cadence (1/2/3/5 per day) |
| `/brands/[id]/plan/[planId]` | Content plan — draft state shows calendar grid for topic editing; post-approval shows pipeline kanban (Generating / Ready / Posted / Failed) with calendar as secondary view |
| `/brands/[id]/plan/[planId]/progress` | Agentic progress view — status per video, activity feed |
| `/channels/callback` | Facebook OAuth callback — page picker (no user-facing `/channels` index) |
| `/billing` | Plan selection, usage meters, Stripe checkout |
| `/settings` | Profile + notification preferences |

### 14.1 Layout

`components/layout/app-sidebar.tsx` — navigation sections: Content (Brands, Library), Account (Settings, Billing). Shows usage meter (paid plans) or upgrade CTA (free/trial). Channels are managed inline on each brand's detail page; there's no top-level Channels nav.

`components/layout/app-header.tsx` — page title, usage indicator (trial credits or daily count), Clerk `UserButton`.

### 14.2 Key Client Hooks

| Hook | Location | Purpose |
|---|---|---|
| `useUser()` | `lib/hooks/use-user.ts` | Clerk auth + `/api/users/me` profile |
| `useVideos()` | `lib/hooks/use-videos.ts` | Paginated library with search/filter |
| `useClipProgress(videoId)` | `lib/hooks/useClipProgress.ts` | SSE clip generation events |
| `usePlanProgress(planId, total)` | `hooks/usePlanProgress.ts` | SSE batch generation events |
| `useApiClient()` | `lib/api-client.ts` | Returns typed API client bound to Clerk token |

---

## 15. Shared Packages

### `@repo/types` (`packages/types/src/index.ts`)

Single source of truth. Import from here everywhere — never redeclare domain types in app code.

Key enums: `PlanType`, `VideoStatus`, `VideoType`, `RenderStyle`, `SubtitleStyle`, `ClipRequestStatus`, `UGCVisualStyle`, `ActionReelStyle`, `Platform`, `SocialPlatform`, `VideoStyle`, `Tone`

Key interfaces: `User`, `Video`, `Scene`, `ClipRequest`, `BrandProfile`, `BrandSuggestion`, `ContentPlan`, `TopicEntry`, `PostSchedule`, `SocialAccount`, `FacebookPage`, `IdeaCard`, `ClipProgressEvent`, `ApiResponse<T>`, `PaginatedResponse<T>`

### `@repo/utils` (`packages/utils/src/`)

Pure functions: `slugify`, `formatDuration`, `estimateScriptDuration`, `gcsPathToFileName`, `formatRelativeDate`

### `@repo/ui` (`packages/ui/src/`)

Shared React components. New components must be added to `packages/ui/src/` AND exported from `packages/ui/package.json` → `exports`.

---

## 16. Design System

CSS custom properties in `apps/web/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#09090b` | Page background |
| `--bg-surface` | `#111113` | Cards, panels |
| `--bg-elevated` | `#1a1a1e` | Inputs, hover states |
| `--bg-border` | (dark) | Borders |
| `--accent-primary` | `#f55c2a` | Orange CTA |
| `--accent-secondary` | `#4a90e2` | Blue secondary |
| `--accent-success` | `#34D399` | Green |
| `--accent-warning` | `#FBBF24` | Yellow |
| `--accent-danger` | `#F87171` | Red |
| `--text-primary` | `#F4F4F8` | |
| `--text-secondary` | `#a1a1aa` | |
| `--text-muted` | `#52525b` | |

Fonts: Inter (UI), JetBrains Mono (code). Base spacing unit: 4px.

---

## 17. Environment Variables

Full list validated in `apps/api/lib/env.ts` via Zod:

```
# Core
NODE_ENV, PORT (default 4000)
DATABASE_URL                     # Neon PostgreSQL
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Billing
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_PRICE_ID
STRIPE_PRO_PRICE_ID
STRIPE_TRIAL_PRICE_ID

# Storage (Cloudflare R2)
R2_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY

# Security
OPERATOR_SECRET                  # shared by extension + cron jobs

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL

# AI
ANTHROPIC_API_KEY
OPENAI_API_KEY                   # optional — GPT-image-2 character sheets

# Claude Skills (Anthropic Console)
CLAUDE_SKILL_SCRIPT_BENGALI      # default: "skill_01UG5GQFxCxtoBTxUnYHY15r"
CLAUDE_SKILL_SCRIPT_ENGLISH      # placeholder fallback
CLAUDE_SKILL_GROK_PROMPTS        # placeholder fallback
CLAUDE_SKILL_IDEAS               # placeholder fallback

# Facebook OAuth (optional)
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI

# URLs
NEXT_PUBLIC_APP_URL              # default: http://localhost:3000
API_URL                          # default: http://localhost:4000
WORKER_URL                       # optional — FFmpeg worker URL
```

---

## 18. Development Commands

```bash
# From repo root
pnpm dev            # web (3000) + api (4000) concurrently
pnpm build          # build all workspaces
pnpm lint           # zero warnings required
pnpm check-types    # type-check all workspaces
pnpm format         # Prettier all .ts .tsx .md

# Workspace-scoped
pnpm --filter @repo/api dev
pnpm --filter web dev
pnpm --filter @repo/api test     # Vitest

# Database (from apps/api or via --filter)
pnpm --filter @repo/api db:generate   # generate migration from schema changes
pnpm --filter @repo/api db:migrate    # apply migrations
pnpm --filter @repo/api db:push       # push schema directly (dev only)
pnpm --filter @repo/api db:studio     # Drizzle Studio GUI

# Worker (requires Docker)
docker build -t reel-forge-worker ./apps/worker
docker run -p 5000:5000 --env-file .env reel-forge-worker
```
