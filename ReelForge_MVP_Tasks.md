# ReelForge MVP — Complete Task List

**Version:** 1.0  
**Date:** April 16, 2026  
**Based on:** PRD v1.1 + UI/UX Spec v1.0

Tasks are ordered by dependency. Each phase can largely begin after the previous phase's foundation tasks are done. Sub-tasks within a phase can be parallelized across team members.

---

## Phase 0 — Project Setup & Infrastructure

### 0.1 Repository & Tooling

- [x] Create GitHub repository (private)
- [x] Initialize Turborepo monorepo with pnpm workspaces
- [x] Configure `turbo.json` with `build`, `dev`, `lint`, `check-types` pipelines (note: `test` pipeline not yet added)
- [x] Configure `pnpm-workspace.yaml` to declare `apps/*` and `packages/*`
- [x] Set up root `package.json` with shared dev dependencies (TypeScript, ESLint, Prettier)
- [x] Create shared config packages — implemented as `packages/eslint-config` + `packages/typescript-config` (no single `packages/config` — PRD §6 description differs from reality; separate packages are the correct approach)
- [x] Create `packages/types` package — fully implemented with all interfaces and enums
- [x] Create `packages/utils` package — fully implemented with all 5 utility functions
- [x] Add `.gitignore`, `.env.example` files at root
- [x] Configure Prettier with consistent formatting rules across all workspaces

### 0.2 GCP Project Setup

- [ ] Create GCP project (`reelforge-prod` and `reelforge-dev`)
- [ ] Enable required APIs: Cloud Run, Cloud Tasks, Cloud Storage, Cloud Scheduler, Secret Manager, Artifact Registry
- [ ] Create two GCS buckets: `reelforge-assets-dev` and `reelforge-assets-prod`
- [ ] Configure GCS bucket CORS policy to allow signed URL uploads from the app domain
- [ ] Set up GCS lifecycle rules: 30-day auto-delete for `videos/*/output.mp4`, immediate delete for intermediate assets on assembly complete
- [ ] Create GCP service accounts: `api-server`, `ffmpeg-worker`, `cloud-tasks-invoker`
- [ ] Grant appropriate IAM roles to each service account
- [ ] Set up Artifact Registry repository for Docker images
- [ ] Configure Google Cloud Secret Manager for all secrets (operator secret, API keys)

### 0.3 Third-Party Accounts & Keys

- [ ] Create/verify Anthropic API account — obtain Claude API key
- [ ] Create/verify ElevenLabs account — obtain API key, note available voice IDs
- [ ] Create/verify xAI account — obtain Grok Imagine API key
- [ ] Create/verify Clerk application (dev + prod environments) — obtain publishable key and secret key
- [ ] Create/verify Stripe account — create Starter and Pro subscription price IDs, create $2 one-time price ID
- [ ] Create/verify Resend account — set up sending domain and obtain API key
- [ ] Create/verify Neon PostgreSQL project — provision dev and prod databases, obtain connection strings

### 0.4 CI/CD

- [ ] Set up GitHub Actions workflow: `ci.yml` — runs lint + type-check + test on every PR
- [ ] Set up GitHub Actions workflow: `deploy-api.yml` — builds and deploys API to GCP Cloud Run on merge to `main`
- [ ] Set up GitHub Actions workflow: `deploy-web.yml` — builds and deploys Next.js app on merge to `main`
- [ ] Set up GitHub Actions workflow: `deploy-worker.yml` — builds and deploys FFmpeg worker on merge to `main`
- [ ] Store all secrets in GitHub Actions secrets

---

## Phase 1 — Database & Shared Types

### 1.1 Drizzle ORM Schema

- [x] Install Drizzle ORM and `drizzle-kit` in `apps/api`
- [x] Create `apps/api/lib/db/schema.ts` with all tables:
  - `users`
  - `projects`
  - `videos`
  - `scenes`
  - `clip_requests`
- [x] Add all indexes: `projects(user_id)`, `videos(user_id, project_id, status)`, `clip_requests(status, queued_at)`, `clip_requests(video_id)`, `scenes(video_id)`
- [x] Configure `drizzle.config.ts` pointing to Neon dev database
- [x] Run initial migration — apply schema to dev database
- [x] Verify all FK constraints and indexes via `psql` or Drizzle Studio

### 1.2 Shared Types Package

- [x] Define and export all shared interfaces in `packages/types`:
  - `User`, `Project`, `Video`, `Scene`, `ClipRequest`
  - `VideoStatus` enum (all states from the state machine)
  - `PlanType` enum (`none`, `try_out`, `starter`, `pro`) — `try_out` added for $5 one-time plan
  - `Platform` enum, `VideoStyle` enum, `Tone` enum, `SubtitleStyle` enum
  - `ClipRequestStatus` enum
  - API response shapes: `ApiResponse<T>`, `PaginatedResponse<T>`
- [x] Infer Drizzle types from schema and re-export via `packages/types`

### 1.3 Shared Utils Package

- [x] Implement and export shared utility functions in `packages/utils`:
  - `slugify(text)` — URL-safe slug generation
  - `formatDuration(seconds)` — "1:23" format
  - `estimateScriptDuration(wordCount)` — returns seconds based on ~150 wpm
  - `gcsPathToFileName(path)` — extracts filename from GCS path
  - `formatRelativeDate(date)` — "3 days ago"

---

## Phase 2 — Backend API Foundation

### 2.1 Fastify App Bootstrap

- [x] Initialize `apps/api` as a Node.js + TypeScript project
- [x] Install Fastify and plugins: `@fastify/cors`, `@fastify/helmet`, `@fastify/multipart`, `@fastify/sensible`
- [x] Set up Fastify server entry point with graceful shutdown
- [x] Configure CORS to allow requests from the Next.js app domain
- [x] Set up environment variable loading (`dotenv` / Zod schema validation for required env vars)
- [x] Create `apps/api/lib/auth.ts` — Clerk JWT verification middleware using `@clerk/fastify`
- [x] Apply auth middleware to all routes except `/health` and `/api/billing/webhook`

### 2.2 GCP Storage Helper

- [x] Create `apps/api/lib/storage.ts`:
  - `generateSignedUploadUrl(path, contentType, expiresInMinutes)` — returns a signed URL for PUT
  - `generateSignedReadUrl(path, expiresInMinutes)` — returns a signed URL for GET
  - `deleteObject(path)` — deletes a GCS object
  - `listObjects(prefix)` — lists objects under a path

### 2.3 Project CRUD Routes

- [x] `GET /api/projects` — list projects for authenticated user, ordered by `updated_at` desc
- [x] `POST /api/projects` — create project, validate all required fields
- [x] `GET /api/projects/:id` — get single project (enforce `user_id` ownership check)
- [x] `PUT /api/projects/:id` — update project settings (enforce ownership)
- [x] `DELETE /api/projects/:id` — soft delete (set `deleted_at`)
- [x] Write integration tests for all 5 project endpoints

### 2.4 Video CRUD Routes

- [x] `GET /api/projects/:id/videos` — list videos in project with pagination
- [x] `POST /api/projects/:id/videos` — create new video (DRAFT status), enforce quota check before allowing creation
- [x] `GET /api/videos/:id` — get video with all scenes and clip_request statuses
- [x] `DELETE /api/videos/:id` — soft delete video, queue async GCS asset cleanup
- [x] `GET /api/videos` — all videos for the authenticated user across projects (Library) — already implemented
- [x] `PATCH /api/videos/:id` — update draft video fields (title, idea, script, subtitle style, BGM) — already implemented
- [x] `POST /api/videos/:id/submit` — quota-checked submission, creates clip_requests, increments counters — already implemented
- [x] Write integration tests for video CRUD endpoints

### 2.5 Quota Enforcement Middleware

- [x] Create `apps/api/lib/quota.ts` — reusable quota check function:
  - Reads `plan`, `trial_paid`, `trial_video_remaining`, `videos_today`, `videos_this_month`, `daily_limit`, `monthly_limit` from users table
  - Returns `{ allowed: boolean, reason: string, redirect?: string }`
- [x] Wire quota check into `POST /api/projects/:id/videos`
- [x] Create `POST /api/billing/webhook` handler to update `users.plan`, `users.daily_limit`, `users.monthly_limit` on Stripe events:
  - `checkout.session.completed` (trial payment) — also set `trial_paid = true`, `plan = "try_out"`, `trial_video_remaining = 3`, store `stripe_customer_id`
  - `customer.subscription.created` — store `stripe_subscription_id`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [x] Verify Stripe webhook signature on every request

### 2.6 Assets Routes

- [x] `GET /api/assets/bgm` — list BGM tracks from a `bgm_tracks` config (JSON file or DB table)
- [x] `GET /api/assets/voices` — return curated list of ElevenLabs voice IDs with names, preview URLs, and language tags

### 2.7 Deploy API to Cloud Run (dev)

- [x] Create `apps/api/Dockerfile`
- [ ] Configure Cloud Run service: min instances 1, max instances 10, 1GB RAM
- [ ] Deploy API to GCP Cloud Run dev environment
- [ ] Verify health check endpoint returns 200

---

## Phase 3 — Next.js Web App Foundation

### 3.1 Next.js Bootstrap

- [x] Initialize `apps/web` with Next.js 16.1 (App Router)
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui (initialize with dark theme)
- [x] Install Clerk SDK for Next.js 16 (`@clerk/nextjs`)
- [x] Set up `proxy.ts` at app root — protect `/dashboard`, `/projects`, `/videos`, `/library`, `/settings`, `/billing` routes (Next.js 16 renamed `middleware.ts` → `proxy.ts` and `middleware()` → `proxy()` — PRD was correct)
- [x] Create layout files: root `layout.tsx` (Clerk provider), authenticated `layout.tsx` (sidebar + nav)
- [x] Set up global CSS with design system CSS variables from the UI/UX spec

### 3.2 Design System Components

- [x] Implement color palette as CSS variables in `globals.css`
- [x] Create reusable `Button` component (Primary, Secondary, Ghost, Danger variants + loading state)
- [x] Create `Card` component with standard padding and shadow
- [x] Create `Badge` / `Pill` component
- [x] Create `Skeleton` loader component (shimmer animation)
- [x] Create `Toast` notification system (Sonner via `<Toaster />` in dashboard layout)
- [x] Create `Modal` / `Dialog` wrapper component
- [x] Create `Confirm` dialog component (simple popover + typed-confirmation variant)
- [x] Create `EmptyState` component (accepts illustration, heading, body, action button)
- [x] Create `ProgressBar` component

### 3.3 Auth Pages

- [x] Build `/sign-up` page (Clerk `<SignUp />` component, custom-themed card layout)
- [x] Build `/sign-in` page (Clerk `<SignIn />` component, custom-themed card layout)
- [ ] Test OAuth flow with Google
- [ ] Configure Clerk webhook in dashboard → point to `POST /api/users/sync` with `user.created` event
- [x] Implement `POST /api/users/sync` backend route (inserts user with Clerk ID as text PK)
- [x] Implement `GET /api/users/me` — return authenticated user profile
- [x] Implement `PATCH /api/users/me` — update `onboarding_complete`, `firstName`, `lastName`

### 3.4 API Client

- [x] Create `apps/web/lib/api-client.ts` — typed fetch wrapper:
  - Automatically attaches Clerk JWT to `Authorization` header
  - Handles `401` → redirect to sign-in
  - Handles generic errors → toast notification
  - Typed response wrappers using `packages/types`
- [x] Create custom React hooks for each resource: `useProjects()`, `useProject(id)`, `useVideo(id)`, `useVideos(projectId)`

---

## Phase 4 — Core Pages (Pre-AI)

### 4.1 Landing Page

- [x] Build landing page (`app/page.tsx`) — public route (Polished v2)
- [x] Implement navbar with sign-in / get-started buttons
- [x] Implement Hero section with CTA
- [x] Implement "How It Works" section (5-step flow)
- [x] Implement Feature Highlights section (3 alternating rows)
- [x] Implement Platform Support bar
- [x] Implement Pricing section (3 cards)
- [x] Implement FAQ accordion
- [x] Implement final CTA section
- [x] Implement footer
- [x] Create Privacy Policy page (`/privacy`) and link from footer
- [x] Ensure fully responsive (mobile, tablet, desktop)

### 4.2 Onboarding Modal

- [x] Build 3-step onboarding modal triggered on first login (check `users.onboarding_complete`)
- [x] Step 1: Project creation form with voice picker (preview audio playback — voice cards implemented; live preview deferred to Phase 5)
- [x] Step 2: Animated "How It Works" walkthrough (auto-advance + manual nav)
- [ ] Step 3: Trial purchase — "$2 to generate your first video" (PRD §7.1 + §8); call `POST /api/billing/trial-checkout` → redirect to Stripe Checkout; on success Stripe redirects back here and onboarding completes (deferred to Phase 11)
- [x] On completion: call `PATCH /api/users/me` to set `onboarding_complete = true`
- [x] Ensure modal never shows again after completion

### 4.3 Dashboard — Project List

- [x] Build `/dashboard` page with sidebar layout
- [x] Implement sidebar navigation with active states and usage meter
- [x] Implement project grid with all card states (loading, populated, empty state)
- [x] Implement "New Project" modal (reuse form from onboarding Step 1)
- [x] Implement project card gear menu: Edit, View Videos, Delete
- [x] Implement Delete project confirm dialog

### 4.4 Project Detail Page

- [x] Build `/projects/[id]` page
- [x] Implement video grid with status badges
- [x] Implement filter bar (status, date, search)
- [x] Implement per-video card actions (download, share, delete)
- [x] Implement video soft-delete confirm
- [x] Connect to API with pagination (infinite scroll or load-more button)

### 4.5 Video Library Page

- [x] Build `/library` page
- [x] Implement grid and list view toggle
- [ ] Implement cross-project filter (deferred — needs project list dropdown wired to API filter)
- [ ] Implement date range filter (deferred)
- [x] Implement inline video player modal
- [x] Connect to API: `GET /api/videos` (already implemented in Phase 2.4)

### 4.6 Settings & Billing Pages

- [x] Build `/settings/profile` page (display name, delete account)
- [x] Build `/settings/notifications` page (email toggles for "video ready" and "video failed")
- [x] Add `email_notify_ready` and `email_notify_failed` boolean columns to `users` table (default `true`) — needed for notification preferences UI
- [ ] Add `PATCH /api/users/me` support for `emailNotifyReady` and `emailNotifyFailed` fields
- [x] Build `/billing` page (current plan, usage meters, plan comparison table)
- [x] Implement "Manage Subscription" button — wired to real `GET /api/billing/portal` API (redirects to Stripe portal)
- [x] Add backend route: `GET /api/billing/portal` (creates and returns Stripe billing portal URL)

---

## Phase 5 — Video Creation Wizard (UI Shell)

### 5.1 Wizard Infrastructure

- [x] Build wizard page `/videos/[id]` with persistent wizard header
- [x] Implement step progress bar (7 steps, icons, labels, completed/active/pending states)
- [x] Implement step routing: URL param or query param for current step (e.g. `?step=2`)
- [x] Implement "Save Draft" auto-save — debounced `PATCH /api/videos/:id` on any field change
- [x] Implement back-navigation with confirm dialog if progress would be lost
- [x] Implement redirect logic: if user visits `/videos/:id`, send them to the correct step based on `videos.status`

### 5.2 Step 1 — Idea Input UI

- [x] Build Brainstorm / Direct mode toggle
- [x] Build idea textarea with character counter
- [x] Build idea card grid (3 cards, selectable with active state); each card has a **title** (1 line) and **body** (2–3 lines) — match PRD §7.6 JSON shape: `{ title, body }`
- [x] Build "Tips for great ideas" expandable hint section below the textarea (UI spec §7 Step 1)
- [x] Loading state for brainstorm generation (BRAINSTORM_PENDING status → spinner on cards)
- [x] Wire "Use This Idea" → saves idea to `videos.idea`, triggers `POST /api/videos/:id/script` (sets SCRIPT_PENDING), advances to Step 2

### 5.3 Step 2 — Script Review UI

- [x] Build editable script textarea
- [x] Implement live word count indicator with color-coded range status
- [x] Implement estimated duration progress bar
- [x] Build Regenerate button with confirm popover (if manually edited)
- [x] Wire "Approve Script" → saves script, advances to Step 3

### 5.4 Step 3 — Voiceover Review UI

- [x] Build custom audio player (waveform display, controls, playback speed)
- [x] Build Regenerate Voice button
- [x] Wire "Approve Voice" → advances to Step 4

### 5.5 Step 4 — Scene Review UI

- [x] Build scene card grid (2-col desktop, 1-col mobile)
- [x] Build per-scene image area with skeleton loader, loaded state, error state
- [x] Display `textExcerpt` on each scene card to show which script segment it covers
- [x] Build visual prompt collapsible section with inline edit mode
- [x] Build per-scene action buttons (Regenerate, Edit Prompt, Upload Image)
- [x] Build image upload flow: file picker → `POST /api/videos/:id/scenes/:index/upload-url` → PUT to GCS → `PATCH /api/videos/:id/scenes/:index` to confirm `base_image_url`
- [x] Build per-scene approval checkbox
- [x] Build "Approve All Scenes" bulk action button
- [x] Build video title inline edit (pencil icon → editable, calls `PATCH /api/videos/:id`) per UI spec §7 wizard header
- [x] Build "Regenerate All" button

### 5.6 Step 5 — Subtitle & BGM UI

- [x] Build 4-card subtitle style picker with preview screenshots
- [x] Build BGM toggle
- [x] Build BGM track library (horizontal scroll row, preview playback)
- [x] Build volume slider (0–100%)
- [x] Build "Generate Video" button — before calling submit, check `users.trial_paid`; if false, open Trial Payment Modal (Phase 11.2) instead of submitting
- [x] Wire "Generate Video" (post-payment) → calls `POST /api/videos/:id/submit`

### 5.7 Step 6 — Processing Screen UI

> ⚠️ Depends on Phase 6.4 (SSE endpoint). Build UI shell first; wire SSE in Phase 6.4.

- [x] Build vertical progress timeline with SSE-driven state updates
- [ ] Implement SSE client connection to `GET /api/videos/:id/status-stream` (deferred to Phase 6.4; currently uses polling)
- [x] Implement live queue position display (`queue_position` from SSE event)
- [x] Implement estimated wait time: `queue_position × avg_seconds_per_clip` (avg is server-computed; include in SSE payload)
- [x] Implement "You can leave this page" messaging
- [x] Implement failed state with Retry button
- [ ] Handle SSE reconnect logic on connection drop (deferred to Phase 6.4)

### 5.8 Step 7 — Video Ready UI

- [x] Build success state with animation
- [x] Build in-page video player
- [x] Build Download MP4 button
- [x] Build "Copy Shareable Link" button with toast feedback
- [x] Build "Make Another Video" shortcut

---

## Phase 6 — AI Integrations (Backend)

### 6.1 Claude — Script Generation

- [x] Create `apps/api/services/claude.ts`:
  - `generateIdeas(projectContext, topic)` → returns `Array<{ title: string; body: string }>` (3 items)
  - `generateScript(projectContext, idea)` → returns plain text script
  - `splitScenes(script, audioDurationSeconds)` → returns `Array<{ scene_index, text_excerpt, visual_prompt, duration_hint_seconds }>`
- [x] Assemble system prompt dynamically from project fields: `platform`, `niche`, `language`, `target_audience`, `video_style`, `tone`, `claude_system_prompt` (all now in `projects` table)
- [x] Implement `POST /api/videos/:id/brainstorm` — set status to `BRAINSTORM_PENDING` → call `generateIdeas` → return ideas in response (blocking; fast enough for MVP)
- [x] Implement `POST /api/videos/:id/script` — set status to `SCRIPT_PENDING` → call `generateScript` → store in `videos.script` → update status to `SCRIPT_READY`
- [x] Implement error handling: API errors → set `videos.status = FAILED` + store error message
- [ ] Write unit tests for prompt assembly logic

### 6.2 ElevenLabs — Voiceover

- [x] Create `apps/api/services/elevenlabs.ts`:
  - `generateVoiceover(script, voiceId)` → returns `{ audioBuffer, wordTimestamps, durationSeconds }`
  - Uses `model_id: "eleven_multilingual_v3"`, `with-timestamps` endpoint, `output_format: "mp3_44100_128"`
  - Converts character-level timestamps to word-level `WordTimestamp[]` before saving
- [x] Implement `POST /api/videos/:id/voice`:
  - Validates SCRIPT_READY state; returns 202, fires generation async
  - Uploads `audio.mp3` to GCS at `videos/{id}/audio.mp3`
  - Uploads `word_timestamps.json` to GCS at `videos/{id}/word_timestamps.json`
  - Updates `videos.audio_url`, `videos.word_timestamps_url`, `videos.duration_seconds`
  - Updates status to `VOICE_READY` (or `FAILED` on error)

### 6.3 Grok Image API — Base Images

- [x] Create `apps/api/services/grok-image.ts`:
  - `generateImage(prompt)` → returns Buffer (via xAI `grok-2-image-1212`, `b64_json` format)
- [x] Implement `POST /api/videos/:id/scenes` (async): validates VOICE_READY → set `SCENES_PENDING` → call `splitScenes()` → insert scene rows → fire all Grok Image calls in parallel → upload to GCS → update `scenes.base_image_url` + `scenes.base_image_path` → set `SCENES_READY`
- [x] Implement `POST /api/videos/:id/scenes/:index/regenerate` — single scene image regeneration (synchronous, ~5s)
- [x] Implement `POST /api/videos/:id/scenes/:index/upload-url` — generate signed GCS upload URL for user-supplied base image
- [x] Implement `PATCH /api/videos/:id/scenes/:index` — accepts `baseImagePath`, `visualPrompt`, `approved`; generates fresh signed read URL for baseImagePath

### 6.4 SSE Status Stream

- [x] Implement `GET /api/videos/:id/status-stream`:
  - Establishes SSE connection with appropriate headers (`text/event-stream`, `X-Accel-Buffering: no`)
  - Polls DB every 2 seconds for status changes via `reply.hijack()`
  - Pushes events: `{ type: 'status_update', data: { status, queue_position?, clips_done?, clips_total?, estimated_wait_seconds? } }`
  - `queue_position`: count of `clip_requests` with `status='queued'` and `queued_at < this video's first queued_at`
  - `estimated_wait_seconds`: `queue_position × 30`
  - Auto-closes connection when status reaches `COMPLETE` or `FAILED`
  - Handles client disconnect cleanup via `request.raw.on("close", ...)`

### 6.5 Video Submission

- [x] `POST /api/videos/:id/submit` already implemented in Phase 2.4. Confirm it:
  - Validates `SCENES_READY` status and all approved scenes have `base_image_url`
  - Denormalises `visual_prompt` + `base_image_url` onto each `clip_requests` row
  - Creates one `clip_requests` row per approved scene with `userId`, `visualPrompt`, `baseImageUrl`
  - Updates video status to `CLIPS_QUEUED`
  - Increments `videos_today`, `videos_this_month`, decrements `trial_video_remaining`

---

## Phase 7 — Operator Queue API

### 7.1 Queue Endpoints

- [x] Create Fastify route plugin for `/api/operator/*` — validates `X-Operator-Secret` header against env var, rejects with `403` if missing/wrong
- [x] Implement `GET /api/operator/queue`:
  - Accept `?batch_size=N` query param (default 30, max 50)
  - Run atomic `UPDATE clip_requests SET status='processing', claimed_at=NOW() WHERE id IN (SELECT id FROM clip_requests WHERE status='queued' ORDER BY queued_at ASC LIMIT N FOR UPDATE SKIP LOCKED) RETURNING *`
  - `visual_prompt` and `base_image_url` are already on the `clip_requests` row (denormalised at submit time) — no join required
  - Return array with all fields the extension needs: `id`, `videoId`, `sceneIndex`, `visualPrompt`, `baseImageUrl`
  - Also transitions video status from `CLIPS_QUEUED` → `CLIPS_PROCESSING` on first claim
- [x] Implement `POST /api/operator/clips/:id/upload-url`:
  - Verify clip_request exists and is in `processing` status
  - Return a signed GCS upload URL for `videos/{video_id}/scenes/{scene_index}/clip.mp4`
- [x] Implement `POST /api/operator/clips/:id/complete`:
  - Set `clip_requests.status = 'done'`, `processed_at = NOW()`, `clip_url = {gcs_path}`
  - Update corresponding `scenes.clip_url` + `scenes.clip_path` (lookup by `videoId + sceneIndex`)
  - Check if all clips for `video_id` are done — if so, dispatch FFmpeg assembly task
  - Update video status to `ASSEMBLY_PENDING` when task is dispatched
- [x] Implement `POST /api/operator/clips/:id/fail`:
  - Set `clip_requests.status = 'failed'`, `error = {message}`
  - If no clips remain queued/processing, set video status to `FAILED`
- [x] Create `apps/api/lib/cloud-tasks.ts` — `dispatchAssemblyTask(videoId)` calls `WORKER_URL/assemble`; no-ops with a warning if `WORKER_URL` is not set (dev without worker)

### 7.2 Stale Lock Cleanup

- [x] Implemented as `POST /api/jobs/cleanup-stale-clips` in `apps/api/routes/jobs.ts`:
  - Finds all `clip_requests` with `status = 'processing'` and `claimed_at < NOW() - INTERVAL '10 minutes'`
  - Resets them to `status = 'queued'`, clears `claimed_at`
- [x] Set up GCP Cloud Scheduler to trigger this endpoint every 5 minutes

### 7.3 Quota Reset Jobs

- [x] Implemented as `POST /api/jobs/reset-daily-quota` — sets `videos_today = 0` for all users
- [x] Implemented as `POST /api/jobs/reset-monthly-quota` — sets `videos_this_month = 0` for all users
- [x] Set up GCP Cloud Scheduler: daily reset at UTC midnight every day
- [x] Set up GCP Cloud Scheduler: monthly reset at UTC midnight on the 1st of each month

---

## Phase 8 — Browser Extension

### 8.1 Extension Scaffold

- [x] Set up `apps/extension` as a Chrome Manifest V3 project with TypeScript + Vite
- [x] Write `manifest.json`: permissions (`tabs`, `storage`, `scripting`), host permissions for Grok domain and API backend
- [x] Set up React + Tailwind for popup UI
- [x] Configure Vite + esbuild build to output all required extension files (`build.mjs` — three-pass: Vite for HTML pages, esbuild for background/content scripts)

### 8.2 Extension API Client

- [x] Create `apps/extension/src/lib/api-client.ts`:
  - Reads `backendUrl` and `operatorSecret` from `chrome.storage.local`
  - Typed methods: `claimClips(batchSize)`, `getUploadUrl(clipId)`, `completeClip(clipId, gcsPath)`, `failClip(clipId, error)`

### 8.3 Background Service Worker

- [x] Implement `src/background/index.ts`:
  - State machine: `idle` → `running` → `idle`
  - Queue polling loop (every 3 seconds when running): calls `claimClips(batchSize)`, dispatches each to tab manager
  - In-memory map: `tabId → TabEntry`
  - Tab lifecycle management: open tabs up to concurrent limit, listen for tab close events, re-open when slots free up
  - Message passing with popup: send session stats, receive start/stop/retry commands

### 8.4 Content Script

- [x] Implement `src/content/index.ts` — injected into Grok Imagine tabs:
  - Receives `clipRequestId`, `baseImageUrl`, and `visualPrompt` via `chrome.runtime.onMessage`
  - Polls DOM until page is fully ready (MutationObserver + polling for prompt input field)
  - Downloads base image as Blob from signed URL
  - Uses configured selector to find image upload input, programmatically sets the file
  - Pastes visual prompt into the prompt textarea using configured selector
  - If auto-click ON: waits randomized delay (fast/normal/slow mode), clicks Generate button
  - If auto-click OFF: highlights Generate button in green, waits for click event
  - Polls DOM for generated video element appearance (using configured selector)
  - On detection: fetches video as Blob, gets signed upload URL, uploads to GCS, calls `completeClip`
  - Sends `CLIP_DONE` / `CLIP_FAILED` / `SELECTOR_ERROR` messages to service worker
  - On timeout (3 min): calls `failClip`, sends failure message

### 8.5 Extension Popup UI

- [x] Build popup layout (480×520px) with dark theme matching app design system
- [x] Build status section: queue count, connection indicator, active tab count
- [x] Build controls: batch size input, auto-click toggle, delay mode selector, concurrent tabs input
- [x] Build Start/Stop button with running state (pulse animation)
- [x] Build session stats display
- [x] Build failed clips list with per-clip Retry buttons
- [x] Connect all controls to service worker via `chrome.runtime.sendMessage`

### 8.6 Extension Settings / Options Page

- [x] Build options page (`options/index.html`): full-page React app
- [x] Build API configuration section: backend URL input, operator secret input
- [x] Implement "Test Connection" → calls `GET /health` with operator secret header
- [x] Build DOM selector configuration table (4 selectors, editable, stored in `chrome.storage.local`)
- [ ] Implement "Test Selectors" → opens Grok tab and highlights matched elements (deferred — low priority for MVP)
- [x] Save all settings to `chrome.storage.local`

### 8.7 Failure Handling & Resilience

- [x] Implement tab crash detection (`chrome.tabs.onRemoved` listener while tab still in `activeTabs` map)
- [x] Implement upload retry logic (3 retries with exponential backoff in content script)
- [x] Implement selector error detection and display in popup (`SELECTOR_ERROR` message → banner)
- [x] Ensure all failures report to backend via `failClip` — no silent failures
- [x] Implement stale tab watchdog (3-minute timeout checked on every poll cycle)

---

## Phase 9 — FFmpeg Worker

### 9.1 Worker Scaffold

- [x] Initialize `apps/worker` as a Node.js TypeScript project
- [x] Install `execa` (full-control CLI wrapper, preferred over fluent-ffmpeg or raw child_process)
- [x] Install `@google-cloud/storage` for GCS access
- [x] Set up Fastify HTTP server with single POST endpoint: `POST /assemble`
- [x] Implement input validation: verify `video_id` param, verify video status is `ASSEMBLY_PENDING`
- [x] Set up GCS service account authentication

### 9.2 Asset Download

- [x] Implement `downloadAssetsFromGCS(videoId, options)`:
  - Download `videos/{id}/audio.mp3` → `/tmp/{id}/audio.mp3`
  - Download `videos/{id}/word_timestamps.json` → `/tmp/{id}/word_timestamps.json`
  - Download each `videos/{id}/scenes/{n}/clip.mp4` → `/tmp/{id}/clips/clip_{n}.mp4`
  - Download `assets/bgm/{bgmAssetId}.mp3` → `/tmp/{id}/bgm.mp3` (if BGM enabled)
  - Handle missing files with clear error messages

### 9.3 FFmpeg Pipeline Steps

- [x] **Step 1 — Normalize clips**: resize each clip to 1080×1920 at 30fps, trim to `duration_hint_seconds`. Parallel execution.
- [x] **Step 2 — Concatenate**: generate `clips_list.txt`, run `ffmpeg -f concat` to produce `concatenated.mp4`
- [x] **Step 3 — Mix audio**:
  - Without BGM: simple overlay of voiceover onto video
  - With BGM: use `amix` filter with `volume={bgm_volume / 100}` (PRD §12; `bgm_volume` is integer 0–100)
- [x] **Step 4 — Generate subtitles**: implement `apps/worker/src/subtitles.ts`:
  - Parse `word_timestamps.json`
  - For `bold_pop` / `word_highlight`: one ASS event per word
  - For `minimal` / `cinematic`: group 4–6 words per event at sentence level
  - Encode font, size, color, position, animation in ASS style headers per style
  - Output `subtitles.ass` file
- [x] **Step 5 — Burn subtitles**: `ffmpeg -vf "ass=subtitles.ass"` with final encoding settings (H.264 CRF 23, AAC 192k)
- [x] **Step 6 — Upload and notify**:
  - Set video status to `ASSEMBLY_PROCESSING` before upload begins
  - Upload `final.mp4` to `videos/{id}/output.mp4` in GCS
  - Generate 30-day signed URL for output
  - Update PostgreSQL: `videos.status = 'COMPLETE'`, `videos.output_url`, `videos.duration_seconds`
  - Call Resend API to send "Video Ready" email (only if `users.email_notify_ready = true`)
  - Clean up all `/tmp/{id}/` files and intermediate GCS assets

### 9.4 Error Handling & Idempotency

- [x] Wrap entire assembly in a try/catch
- [x] On any failure: update `videos.status = 'FAILED'`, store error in `videos.error`, send "Video Failed" email
- [x] Ensure worker is idempotent: if video is already `COMPLETE`, return early without reprocessing
- [x] Clean up `/tmp` on both success and failure to prevent disk exhaustion

### 9.5 Worker Containerization & Deployment

- [x] Write `apps/worker/Dockerfile`: use `jrottenberg/ffmpeg:latest` as base image, install Node.js, copy app
- [x] Configure Cloud Run service: min instances 1, 4GB RAM, 2 vCPU, 60min request timeout
- [x] Deploy to GCP Cloud Run dev environment
- [x] Write Cloud Tasks dispatcher in `apps/api/lib/cloud-tasks.ts`: `dispatchAssemblyTask(videoId)` — already done in Phase 7
- [x] Wire `dispatchAssemblyTask` call into `POST /api/operator/clips/:id/complete` when all clips done — already done in Phase 7

---

## Phase 10 — Email Notifications

### 10.1 Resend Integration

- [ ] Create `apps/api/services/resend.ts` (API-side email service — needed for future API-triggered notifications)
- [x] Create `apps/worker/src/notify.ts`: `sendVideoReadyEmail` + `sendVideoFailedEmail` with on-brand dark HTML templates
- [ ] Test both email templates via Resend dashboard
- [x] Wire `sendVideoReadyEmail` into FFmpeg worker Step 6
- [x] Wire `sendVideoFailedEmail` into FFmpeg worker error handler

---

## Phase 11 — Monetization

### 11.1 Stripe Integration

- [x] Stripe session logic implemented inline in `apps/api/routes/billing.ts` (not extracted to a separate service file — acceptable for MVP)
- [x] Implement `POST /api/billing/trial-checkout` — creates $5 one-time checkout, returns session URL
- [x] Implement `POST /api/billing/subscribe` — accepts `{ plan: "starter" | "pro" }`, resolves to Stripe price ID internally, returns session URL
- [x] Implement `GET /api/billing/portal` — returns billing portal URL (requires `stripe_customer_id`)
- [x] Implement Stripe webhook handler — handles `checkout.session.completed`, `customer.subscription.created/updated/deleted`
- [x] Add `POST /api/billing/dev-simulate` (dev only) — directly sets plan in DB, bypasses Stripe for local testing
- [ ] Test full trial purchase flow end-to-end in Stripe test mode (requires real Stripe credentials in `.env`)

### 11.2 Frontend Payment Flows

- [x] Wire `/billing` page to real Stripe API — "Get Try Out" → trial checkout, "Upgrade to Starter/Pro" → subscription checkout, both redirect to Stripe
- [x] Handle `?trial_success=1` and `?subscribed=1` redirect params on `/billing` — show success toast and refetch user
- [x] Implement Trial Payment Modal UI (triggered from Step 5 when `trial_paid = false`)
- [x] "Pay $5 and Continue" → calls `POST /api/billing/trial-checkout` → redirect to Stripe Checkout
- [x] Stripe success redirect lands back on the wizard at the correct step
- [x] Implement Subscription Prompt Modal (shown on Step 7 after trial video completes)
- [x] Implement Daily Quota Exceeded Modal
- [x] Implement Monthly Quota Exceeded Modal
- [x] Implement Upgrade button in header usage meter (links to `/billing`)

---

## Phase 12 — BGM Library & Assets

- [ ] Source 20–30 royalty-free BGM tracks (5 categories: Energetic, Calm, Motivational, Cinematic, Upbeat)
- [ ] Normalize all tracks to consistent volume levels
- [ ] Upload all tracks to GCS under `assets/bgm/`
- [ ] Create a `bgm_tracks.json` config file (or DB seed) with track metadata: `{ id, name, category, duration, gcs_path, preview_url }`
- [ ] Source and optimize ElevenLabs voice preview samples — upload to GCS
- [ ] Expose BGM tracks and voices via the `/api/assets/bgm` and `/api/assets/voices` endpoints

---

## Phase 13 — Shareable Links & Video Library Polish

- [ ] Implement shareable link: `GET /api/videos/:id/share` — stores a short-lived token in DB (`expires_at = now() + 7 days`), returns app URL `/watch/{token}` (not a raw GCS URL — keeps expiry control in-app)
- [ ] Add `share_tokens` table to schema: `id (uuid)`, `video_id (uuid)`, `token (text, unique)`, `expires_at (timestamp)`; generate migration
- [ ] Build `/watch/[token]` public page — verify token not expired, serve video player + title (no auth required)
- [ ] Implement GCS cleanup Cloud Task: `POST /api/jobs/cleanup-deleted-assets` — deletes GCS objects for soft-deleted videos
- [ ] ~~Add `GET /api/videos`~~ — already implemented in Phase 2.4

---

## Phase 14 — Quality Assurance

### 14.1 End-to-End Testing

- [ ] Complete 5 full videos end-to-end across 3 different test user accounts
- [ ] Test all 4 subtitle styles
- [ ] Test with BGM enabled (all 3 volume levels: 10%, 30%, 70%) and BGM disabled
- [ ] Test with 8 scenes (minimum) and 12 scenes (maximum)
- [ ] Test Brainstorm mode and Direct mode for idea input
- [ ] Test all 4 platforms (TikTok, Instagram, YouTube Shorts, Facebook Reels) as project settings
- [ ] Test voiceover in at least 2 languages (English + one other)

### 14.2 Error Path Testing

- [ ] Test clip request failure (simulate via extension fail button) — verify video reaches FAILED status and retry works
- [ ] Test stale clip lock cleanup — manually stall a clip and verify the 10-minute reset job works
- [ ] Test quota enforcement — daily limit, monthly limit, trial gate — all 3 paths
- [ ] Test Stripe webhook handling — cancel subscription, verify plan reverts
- [ ] Test SSE reconnect — drop connection mid-processing, verify it reconnects and resumes

### 14.3 Security Testing

- [ ] Verify User A cannot access User B's projects, videos, or scenes (cross-user data isolation)
- [ ] Verify GCS signed URLs are not publicly accessible (try accessing without signature)
- [ ] Verify operator endpoints return 403 for all non-operator requests
- [ ] Verify Stripe webhook rejects requests with invalid signature
- [ ] Verify Clerk JWT rejection on all authenticated endpoints (try invalid / expired token)

### 14.4 Accessibility Testing

- [ ] Verify visible focus rings on all interactive elements (keyboard navigation through wizard without mouse)
- [ ] Verify all icon-only buttons have `aria-label` attributes
- [ ] Verify wizard steps are keyboard navigable (Tab order, Enter/Space to activate)
- [ ] Verify color contrast meets WCAG AA for all text on background color combinations
- [ ] Test with screen reader (VoiceOver / NVDA) on sign-up and wizard flows

### 14.5 Performance Testing

- [ ] Verify script generation completes in < 8 seconds under load
- [ ] Verify voiceover generation completes in < 15 seconds
- [ ] Verify 12 base images generate in < 15 seconds (parallel)
- [ ] Verify FFmpeg assembly completes in < 3 minutes for a 60-second video
- [ ] Verify SSE first event arrives < 1 second after a status change
- [ ] Verify non-AI API endpoints respond at p95 < 300ms

---

## Phase 15 — Production Launch

- [ ] Provision production Neon PostgreSQL database — run migrations
- [ ] Provision production GCP Cloud Run services (API, Worker) with production environment variables
- [ ] Configure custom domain for API and web app (DNS, SSL)
- [ ] Switch Stripe to live mode — create live price IDs for Starter and Pro (set actual prices)
- [ ] Switch Clerk to production instance
- [ ] Switch ElevenLabs, Anthropic, xAI API keys to production accounts
- [ ] Configure GCS production bucket with correct lifecycle rules and CORS
- [ ] Set up GCP Cloud Monitoring alerts: Cloud Run error rate > 1%, Cloud Tasks queue depth > 200, FFmpeg worker memory > 80%
- [ ] Set up uptime monitoring (e.g. Better Uptime) on health check endpoint
- [ ] Configure GCP Cloud Logging to export error logs to a Slack channel
- [ ] Final security review: check all secrets are in Secret Manager, no API keys in code
- [ ] Deploy to production and smoke-test: sign up → trial payment → full video → download
- [ ] Update landing page with real creator testimonials / metrics (post-launch)
- [ ] Announce launch

---

## Ongoing / Post-MVP Backlog

- [ ] Mobile app (React Native)
- [ ] Direct social media publishing (TikTok, Instagram APIs)
- [ ] Multi-seat agency accounts with per-client project isolation
- [ ] User-uploaded background music
- [ ] Video templates and preset scene layouts
- [ ] Creator analytics dashboard (videos/day, most-used styles, etc.)
- [ ] A/B script testing (two scripts, compare performance)
- [ ] Voice cloning (ElevenLabs Professional Voice Clone)
- [ ] Custom domain / white-labeling for agencies
- [ ] Multiple concurrent operator extension instances
- [ ] In-app notifications (in addition to email)
- [ ] Scene reordering via drag-and-drop
- [ ] Script version history (save previous versions before regenerate)
- [ ] Batch video creation (submit multiple ideas at once)
- [ ] Per-clip retry from the video library (replace one bad clip)

---

_End of ReelForge MVP Task List v1.0_
