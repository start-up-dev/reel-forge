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
- [ ] Configure `turbo.json` with `build`, `dev`, `lint`, `test` pipelines
- [x] Configure `pnpm-workspace.yaml` to declare `apps/*` and `packages/*`
- [x] Set up root `package.json` with shared dev dependencies (TypeScript, ESLint, Prettier)
- [ ] Create `packages/config` with shared ESLint config, shared TypeScript `tsconfig.base.json`, and shared Tailwind config
- [ ] Create `packages/types` package — empty scaffold with `index.ts`
- [ ] Create `packages/utils` package — empty scaffold with `index.ts`
- [ ] Add `.gitignore`, `.env.example` files at root
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
- [ ] Run initial migration — apply schema to dev database
- [ ] Verify all FK constraints and indexes via `psql` or Drizzle Studio

### 1.2 Shared Types Package

- [x] Define and export all shared interfaces in `packages/types`:
  - `User`, `Project`, `Video`, `Scene`, `ClipRequest`
  - `VideoStatus` enum (all states from the state machine)
  - `PlanType` enum (`none`, `starter`, `pro`)
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

- [ ] Initialize `apps/api` as a Node.js + TypeScript project
- [ ] Install Fastify and plugins: `@fastify/cors`, `@fastify/helmet`, `@fastify/multipart`, `@fastify/sensible`
- [ ] Set up Fastify server entry point with graceful shutdown
- [ ] Configure CORS to allow requests from the Next.js app domain
- [ ] Set up environment variable loading (`dotenv` / Zod schema validation for required env vars)
- [ ] Create `apps/api/lib/auth.ts` — Clerk JWT verification middleware using `@clerk/fastify`
- [ ] Apply auth middleware to all routes except `/health` and `/api/billing/webhook`

### 2.2 GCP Storage Helper

- [ ] Create `apps/api/lib/storage.ts`:
  - `generateSignedUploadUrl(path, contentType, expiresInMinutes)` — returns a signed URL for PUT
  - `generateSignedReadUrl(path, expiresInMinutes)` — returns a signed URL for GET
  - `deleteObject(path)` — deletes a GCS object
  - `listObjects(prefix)` — lists objects under a path

### 2.3 Project CRUD Routes

- [ ] `GET /api/projects` — list projects for authenticated user, ordered by `updated_at` desc
- [ ] `POST /api/projects` — create project, validate all required fields
- [ ] `GET /api/projects/:id` — get single project (enforce `user_id` ownership check)
- [ ] `PUT /api/projects/:id` — update project settings (enforce ownership)
- [ ] `DELETE /api/projects/:id` — soft delete (set `deleted_at`)
- [ ] Write integration tests for all 5 project endpoints

### 2.4 Video CRUD Routes

- [ ] `GET /api/projects/:id/videos` — list videos in project with pagination
- [ ] `POST /api/projects/:id/videos` — create new video (DRAFT status), enforce quota check before allowing creation
- [ ] `GET /api/videos/:id` — get video with all scenes and clip_request statuses
- [ ] `DELETE /api/videos/:id` — soft delete video, queue async GCS asset cleanup
- [ ] Write integration tests for video CRUD endpoints

### 2.5 Quota Enforcement Middleware

- [ ] Create `apps/api/lib/quota.ts` — reusable quota check function:
  - Reads `plan`, `trial_paid`, `trial_video_remaining`, `videos_today`, `videos_this_month`, `daily_limit`, `monthly_limit` from users table
  - Returns `{ allowed: boolean, reason: string, redirect?: string }`
- [ ] Wire quota check into `POST /api/projects/:id/videos`
- [ ] Create `POST /api/billing/webhook` handler to update `users.plan`, `users.daily_limit`, `users.monthly_limit` on Stripe events:
  - `checkout.session.completed` (trial payment)
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Verify Stripe webhook signature on every request

### 2.6 Assets Routes

- [ ] `GET /api/assets/bgm` — list BGM tracks from a `bgm_tracks` config (JSON file or DB table)
- [ ] `GET /api/assets/voices` — return curated list of ElevenLabs voice IDs with names, preview URLs, and language tags

### 2.7 Deploy API to Cloud Run (dev)

- [ ] Create `apps/api/Dockerfile`
- [ ] Configure Cloud Run service: min instances 1, max instances 10, 1GB RAM
- [ ] Deploy API to GCP Cloud Run dev environment
- [ ] Verify health check endpoint returns 200

---

## Phase 3 — Next.js Web App Foundation

### 3.1 Next.js Bootstrap

- [ ] Initialize `apps/web` with Next.js 16.1 (App Router)
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn/ui (initialize with dark theme)
- [ ] Install Clerk SDK for Next.js 16 (`@clerk/nextjs`)
- [ ] Set up `proxy.ts` at app root — protect `/dashboard`, `/projects`, `/videos`, `/library`, `/settings`, `/billing` routes
- [ ] Create layout files: root `layout.tsx` (Clerk provider), authenticated `layout.tsx` (sidebar + nav)
- [ ] Set up global CSS with design system CSS variables from the UI/UX spec

### 3.2 Design System Components

- [ ] Implement color palette as CSS variables in `globals.css`
- [ ] Create reusable `Button` component (Primary, Secondary, Ghost, Danger variants + loading state)
- [ ] Create `Card` component with standard padding and shadow
- [ ] Create `Badge` / `Pill` component
- [ ] Create `Skeleton` loader component (shimmer animation)
- [ ] Create `Toast` notification system (using shadcn Sonner or custom)
- [ ] Create `Modal` / `Dialog` wrapper component
- [ ] Create `Confirm` dialog component (simple popover + typed-confirmation variant)
- [ ] Create `EmptyState` component (accepts illustration, heading, body, action button)
- [ ] Create `ProgressBar` component

### 3.3 Auth Pages

- [ ] Build `/sign-up` page (Clerk `<SignUp />` component, custom-themed card layout)
- [ ] Build `/sign-in` page (Clerk `<SignIn />` component, custom-themed card layout)
- [ ] Test OAuth flow with Google
- [ ] Handle Clerk webhook `user.created` → create row in `users` table via `POST /api/users/sync`
- [ ] Implement `POST /api/users/sync` backend route

### 3.4 API Client

- [ ] Create `apps/web/lib/api-client.ts` — typed fetch wrapper:
  - Automatically attaches Clerk JWT to `Authorization` header
  - Handles `401` → redirect to sign-in
  - Handles generic errors → toast notification
  - Typed response wrappers using `packages/types`
- [ ] Create custom React hooks for each resource: `useProjects()`, `useProject(id)`, `useVideo(id)`, `useVideos(projectId)`

---

## Phase 4 — Core Pages (Pre-AI)

### 4.1 Landing Page

- [ ] Build landing page (`app/page.tsx`) — public route
- [ ] Implement navbar with sign-in / get-started buttons
- [ ] Implement Hero section with CTA
- [ ] Implement "How It Works" section (5-step flow)
- [ ] Implement Feature Highlights section (3 alternating rows)
- [ ] Implement Platform Support bar
- [ ] Implement Pricing section (3 cards)
- [ ] Implement FAQ accordion
- [ ] Implement final CTA section
- [ ] Implement footer
- [ ] Ensure fully responsive (mobile, tablet, desktop)

### 4.2 Onboarding Modal

- [ ] Build 3-step onboarding modal triggered on first login (check `users.onboarding_complete`)
- [ ] Step 1: Project creation form with voice picker (preview audio playback)
- [ ] Step 2: Animated "How It Works" walkthrough (auto-advance + manual nav)
- [ ] Step 3: Confirmation screen with "Go to Dashboard" CTA
- [ ] On completion: call `PATCH /api/users/me` to set `onboarding_complete = true`
- [ ] Ensure modal never shows again after completion

### 4.3 Dashboard — Project List

- [ ] Build `/dashboard` page with sidebar layout
- [ ] Implement sidebar navigation with active states and usage meter
- [ ] Implement project grid with all card states (loading, populated, empty state)
- [ ] Implement "New Project" modal (reuse form from onboarding Step 1)
- [ ] Implement project card gear menu: Edit, View Videos, Delete
- [ ] Implement Delete project confirm dialog

### 4.4 Project Detail Page

- [ ] Build `/projects/[id]` page
- [ ] Implement video grid with status badges
- [ ] Implement filter bar (status, date, search)
- [ ] Implement per-video card actions (download, share, delete)
- [ ] Implement video soft-delete confirm
- [ ] Connect to API with pagination (infinite scroll or load-more button)

### 4.5 Video Library Page

- [ ] Build `/library` page
- [ ] Implement grid and list view toggle
- [ ] Implement cross-project filter
- [ ] Implement date range filter
- [ ] Implement inline video player modal
- [ ] Connect to API: `GET /api/videos` (all videos for user, paginated)
- [ ] Add backend route: `GET /api/videos` listing all user's videos across projects

### 4.6 Settings & Billing Pages

- [ ] Build `/settings/profile` page (display name, delete account)
- [ ] Build `/settings/notifications` page (email toggles)
- [ ] Build `/billing` page (current plan, usage meters, plan comparison table)
- [ ] Implement "Manage Subscription" button linking to Stripe portal
- [ ] Add backend route: `GET /api/billing/portal` (creates and returns Stripe billing portal URL)

---

## Phase 5 — Video Creation Wizard (UI Shell)

### 5.1 Wizard Infrastructure

- [ ] Build wizard page `/videos/[id]` with persistent wizard header
- [ ] Implement step progress bar (7 steps, icons, labels, completed/active/pending states)
- [ ] Implement step routing: URL param or query param for current step (e.g. `?step=2`)
- [ ] Implement "Save Draft" auto-save — debounced `PATCH /api/videos/:id` on any field change
- [ ] Implement back-navigation with confirm dialog if progress would be lost
- [ ] Implement redirect logic: if user visits `/videos/:id`, send them to the correct step based on `videos.status`

### 5.2 Step 1 — Idea Input UI

- [ ] Build Brainstorm / Direct mode toggle
- [ ] Build idea textarea with character counter
- [ ] Build idea card grid (3 cards, selectable with active state)
- [ ] Loading state for brainstorm generation
- [ ] Wire "Use This Idea" → saves idea, advances to Step 2

### 5.3 Step 2 — Script Review UI

- [ ] Build editable script textarea
- [ ] Implement live word count indicator with color-coded range status
- [ ] Implement estimated duration progress bar
- [ ] Build Regenerate button with confirm popover (if manually edited)
- [ ] Wire "Approve Script" → saves script, advances to Step 3

### 5.4 Step 3 — Voiceover Review UI

- [ ] Build custom audio player (waveform display, controls, playback speed)
- [ ] Build Regenerate Voice button
- [ ] Wire "Approve Voice" → advances to Step 4

### 5.5 Step 4 — Scene Review UI

- [ ] Build scene card grid (2-col desktop, 1-col mobile)
- [ ] Build per-scene image area with skeleton loader, loaded state, error state
- [ ] Build visual prompt collapsible section with inline edit mode
- [ ] Build per-scene action buttons (Regenerate, Edit Prompt, Upload Image)
- [ ] Build image upload (file picker → preview → save)
- [ ] Build per-scene approval checkbox
- [ ] Build "Approve All Scenes" bulk action button
- [ ] Build "Regenerate All" button

### 5.6 Step 5 — Subtitle & BGM UI

- [ ] Build 4-card subtitle style picker with preview screenshots
- [ ] Build BGM toggle
- [ ] Build BGM track library (horizontal scroll row, preview playback)
- [ ] Build volume slider (0–100%)
- [ ] Build "Generate Video" button with trial payment gate (payment modal if not paid)
- [ ] Wire "Generate Video" → calls `POST /api/videos/:id/submit`

### 5.7 Step 6 — Processing Screen UI

- [ ] Build vertical progress timeline with SSE-driven state updates
- [ ] Implement SSE client connection to `GET /api/videos/:id/status-stream`
- [ ] Implement live queue position display
- [ ] Implement estimated wait time calculation
- [ ] Implement "You can leave this page" messaging
- [ ] Implement failed state with Retry button
- [ ] Handle SSE reconnect logic on connection drop

### 5.8 Step 7 — Video Ready UI

- [ ] Build success state with animation
- [ ] Build in-page video player
- [ ] Build Download MP4 button
- [ ] Build "Copy Shareable Link" button with toast feedback
- [ ] Build "Make Another Video" shortcut

---

## Phase 6 — AI Integrations (Backend)

### 6.1 Claude — Script Generation

- [ ] Create `apps/api/services/claude.ts`:
  - `generateIdeas(projectContext, topic)` → returns array of 3 idea objects
  - `generateScript(projectContext, idea)` → returns plain text script
  - `splitScenes(script, audioDurationSeconds)` → returns array of scene objects with visual prompts and duration hints
- [ ] Assemble system prompt dynamically from project fields (platform, niche, tone, etc.)
- [ ] Implement `POST /api/videos/:id/brainstorm` — calls `generateIdeas`, stores result temporarily
- [ ] Implement `POST /api/videos/:id/script` — calls `generateScript`, stores in `videos.script`, updates status to `SCRIPT_READY`
- [ ] Implement error handling: API errors → set `videos.status = FAILED` + store error message
- [ ] Write unit tests for prompt assembly logic

### 6.2 ElevenLabs — Voiceover

- [ ] Create `apps/api/services/elevenlabs.ts`:
  - `generateVoiceover(script, voiceId)` → returns `{ audioBuffer, wordTimestamps }`
  - Handle `model_id: "eleven_v3"`, `with_timestamps: true`, `output_format: "mp3_44100_128"`
- [ ] Implement `POST /api/videos/:id/voice`:
  - Call ElevenLabs API
  - Upload `audio.mp3` to GCS at `videos/{id}/audio.mp3`
  - Upload `word_timestamps.json` to GCS at `videos/{id}/word_timestamps.json`
  - Update `videos.audio_url`, `videos.word_timestamps_url`, `videos.duration_seconds`
  - Update status to `VOICE_READY`

### 6.3 Grok Image API — Base Images

- [ ] Create `apps/api/services/grok-image.ts`:
  - `generateImage(prompt)` → returns image URL
- [ ] Implement scene splitting via Claude call inside `POST /api/videos/:id/scenes`:
  - Call Claude `splitScenes()`
  - Create `scenes` rows in DB
  - Fire all image generation requests in parallel (`Promise.allSettled`)
  - Upload each base image to GCS at `videos/{id}/scenes/{n}/base_image.jpg`
  - Update each scene's `base_image_url` in DB
  - Update video status to `SCENES_READY`
- [ ] Implement `POST /api/videos/:id/scenes/:index/regenerate` — single scene image regeneration
- [ ] Handle image upload from user (`POST /api/videos/:id/scenes/:index/upload-url` + update scene on complete)

### 6.4 SSE Status Stream

- [ ] Implement `GET /api/videos/:id/status-stream`:
  - Establish SSE connection, set appropriate headers
  - Poll DB every 2 seconds for status changes
  - Push events: `{ type: 'status_update', data: { status, queue_position?, clips_done?, clips_total? } }`
  - Auto-close connection when status reaches `COMPLETE` or `FAILED`
  - Handle client disconnect cleanup

### 6.5 Video Submission

- [ ] Implement `POST /api/videos/:id/submit`:
  - Run quota check (daily + monthly + trial)
  - If trial not paid: return `402` with `{ redirect: 'trial_checkout' }`
  - Create one `clip_requests` row per scene (status: `queued`, `queued_at: now()`)
  - Update video status to `CLIPS_QUEUED`
  - Update `users.videos_today` and `users.videos_this_month` atomically

---

## Phase 7 — Operator Queue API

### 7.1 Queue Endpoints

- [ ] Create Fastify route plugin for `/api/operator/*` — validates `X-Operator-Secret` header against env var, rejects with `403` if missing/wrong
- [ ] Implement `GET /api/operator/queue`:
  - Accept `?batch_size=N` query param (default 30, max 50)
  - Run atomic `UPDATE clip_requests SET status='processing', claimed_at=NOW() WHERE id IN (SELECT id FROM clip_requests WHERE status='queued' ORDER BY queued_at ASC LIMIT N FOR UPDATE SKIP LOCKED) RETURNING *`
  - For each claimed request, generate a fresh 60-minute signed GCS read URL from `base_image_path`
  - Return array of claimed requests with fresh `base_image_url`
- [ ] Implement `POST /api/operator/clips/:id/upload-url`:
  - Verify clip_request exists and is in `processing` status
  - Return a signed GCS upload URL for `videos/{video_id}/scenes/{scene_index}/clip.mp4`
- [ ] Implement `POST /api/operator/clips/:id/complete`:
  - Set `clip_requests.status = 'done'`, `processed_at = NOW()`, `clip_url = {gcs_path}`
  - Update corresponding `scenes.clip_url`
  - Check if all clips for `video_id` are done — if so, dispatch GCP Cloud Task to trigger FFmpeg assembly
  - Update video status to `ASSEMBLY_PENDING` when task is dispatched
- [ ] Implement `POST /api/operator/clips/:id/fail`:
  - Set `clip_requests.status = 'failed'`, `error = {message}`
  - If this failure causes the video to be unrecoverable, set video status to `FAILED`

### 7.2 Stale Lock Cleanup

- [ ] Create `apps/api/jobs/cleanup-stale-clips.ts`:
  - Runs as a GCP Cloud Task endpoint `POST /api/jobs/cleanup-stale-clips`
  - Finds all `clip_requests` with `status = 'processing'` and `claimed_at < NOW() - INTERVAL '10 minutes'`
  - Resets them to `status = 'queued'`, clears `claimed_at`
- [ ] Set up GCP Cloud Scheduler to trigger this endpoint every 5 minutes

### 7.3 Quota Reset Jobs

- [ ] Create `apps/api/jobs/reset-daily-quota.ts`:
  - `POST /api/jobs/reset-daily-quota` — sets `videos_today = 0` for all users
- [ ] Create `apps/api/jobs/reset-monthly-quota.ts`:
  - `POST /api/jobs/reset-monthly-quota` — sets `videos_this_month = 0` for all users
- [ ] Set up GCP Cloud Scheduler: daily reset at UTC midnight every day
- [ ] Set up GCP Cloud Scheduler: monthly reset at UTC midnight on the 1st of each month

---

## Phase 8 — Browser Extension

### 8.1 Extension Scaffold

- [ ] Set up `apps/extension` as a Chrome Manifest V3 project with TypeScript + Vite
- [ ] Write `manifest.json`: permissions (`tabs`, `storage`, `webRequest`), host permissions for Grok domain and API backend
- [ ] Set up React + Tailwind for popup UI
- [ ] Configure Vite build to output all required extension files

### 8.2 Extension API Client

- [ ] Create `apps/extension/lib/api-client.ts`:
  - Reads `backendUrl` and `operatorSecret` from `chrome.storage.local`
  - Typed methods: `claimClips(batchSize)`, `getUploadUrl(clipId)`, `completeClip(clipId, gcsPath)`, `failClip(clipId, error)`

### 8.3 Background Service Worker

- [ ] Implement `background/service-worker.ts`:
  - State machine: `idle` → `running` → `idle`
  - Queue polling loop (every 3 seconds when running): calls `claimClips(batchSize)`, dispatches each to tab manager
  - In-memory map: `tabId → clipRequestId`
  - Tab lifecycle management: open tabs up to concurrent limit, listen for tab close events, re-open when slots free up
  - Message passing with popup: send session stats, receive start/stop commands

### 8.4 Content Script

- [ ] Implement `content/grok-inject.ts` — injected into Grok Imagine tabs:
  - Reads `clipRequestId` and `baseImageUrl` and `visualPrompt` from tab URL params or message
  - Polls DOM until page is fully ready (checks for prompt input field)
  - Downloads base image as Blob from signed URL
  - Uses configured selector to find image upload input, programmatically sets the file
  - Pastes visual prompt into the prompt textarea using configured selector
  - If auto-click ON: waits randomized delay, clicks Generate button
  - If auto-click OFF: highlights Generate button in green, waits for click event
  - Polls DOM for generated video element appearance (using configured selector)
  - On detection: captures video as Blob
  - Calls `getUploadUrl`, uploads Blob to GCS
  - Calls `completeClip` with GCS path
  - Sends completion message to service worker
  - On timeout (3 min): calls `failClip`, sends failure message

### 8.5 Extension Popup UI

- [ ] Build popup layout (480×520px) with dark theme matching app design system
- [ ] Build status section: queue count, connection indicator, last updated
- [ ] Build controls: batch size input, auto-click toggle, delay mode selector, concurrent tabs input
- [ ] Build Start/Stop button with running state (pulse animation)
- [ ] Build session stats display
- [ ] Build failed clips list with per-clip Retry buttons
- [ ] Connect all controls to service worker via `chrome.runtime.sendMessage`

### 8.6 Extension Settings / Options Page

- [ ] Build options page (`options/index.html`): full-page React app
- [ ] Build API configuration section: backend URL input, operator secret input
- [ ] Implement "Test Connection" → calls `GET /api/health` with operator secret header
- [ ] Build DOM selector configuration table (4 selectors, editable, stored in `chrome.storage.sync`)
- [ ] Implement "Test Selectors" → opens Grok tab and highlights matched elements
- [ ] Save all settings to `chrome.storage.sync` or `chrome.storage.local` as appropriate

### 8.7 Failure Handling & Resilience

- [ ] Implement tab crash detection (tab removed event while still `processing`)
- [ ] Implement upload retry logic (3 retries with exponential backoff)
- [ ] Implement selector error detection and display in popup
- [ ] Ensure all failures report to backend via `failClip` — no silent failures

---

## Phase 9 — FFmpeg Worker

### 9.1 Worker Scaffold

- [ ] Initialize `apps/worker` as a Node.js TypeScript project
- [ ] Install `fluent-ffmpeg` (or use raw child_process for FFmpeg)
- [ ] Install `@google-cloud/storage` for GCS access
- [ ] Set up Fastify HTTP server with single POST endpoint: `POST /assemble`
- [ ] Implement input validation: verify `video_id` param, verify video status is `ASSEMBLY_PENDING`
- [ ] Set up GCS service account authentication

### 9.2 Asset Download

- [ ] Implement `downloadAssetsFromGCS(videoId, options)`:
  - Download `videos/{id}/audio.mp3` → `/tmp/{id}/audio.mp3`
  - Download `videos/{id}/word_timestamps.json` → `/tmp/{id}/word_timestamps.json`
  - Download each `videos/{id}/scenes/{n}/clip.mp4` → `/tmp/{id}/clips/clip_{n}.mp4`
  - Download `assets/bgm/{bgmAssetId}.mp3` → `/tmp/{id}/bgm.mp3` (if BGM enabled)
  - Handle missing files with clear error messages

### 9.3 FFmpeg Pipeline Steps

- [ ] **Step 1 — Normalize clips**: resize each clip to 1080×1920 at 30fps, trim to `duration_hint_seconds`. Parallel execution.
- [ ] **Step 2 — Concatenate**: generate `clips_list.txt`, run `ffmpeg -f concat` to produce `concatenated.mp4`
- [ ] **Step 3 — Mix audio**:
  - Without BGM: simple overlay of voiceover onto video
  - With BGM: sidechain ducking using `sidechaincompress` filter (BGM ducks under voiceover)
- [ ] **Step 4 — Generate subtitles**: implement `apps/worker/subtitles.ts`:
  - Parse `word_timestamps.json`
  - For `bold_pop` / `word_highlight`: one ASS event per word
  - For `minimal` / `cinematic`: group 4–6 words per event at sentence level
  - Encode font, size, color, position, animation in ASS style headers per style
  - Output `subtitles.ass` file
- [ ] **Step 5 — Burn subtitles**: `ffmpeg -vf "ass=subtitles.ass"` with final encoding settings (H.264 CRF 23, AAC 192k)
- [ ] **Step 6 — Upload and notify**:
  - Upload `final.mp4` to `videos/{id}/output.mp4` in GCS
  - Generate 30-day signed URL for output
  - Update PostgreSQL: `videos.status = 'COMPLETE'`, `videos.output_url`, `videos.duration_seconds`
  - Call Resend API to send "Video Ready" email
  - Clean up all `/tmp/{id}/` files and intermediate GCS assets

### 9.4 Error Handling & Idempotency

- [ ] Wrap entire assembly in a try/catch
- [ ] On any failure: update `videos.status = 'FAILED'`, store error in `videos.error`, send "Video Failed" email
- [ ] Ensure worker is idempotent: if video is already `COMPLETE`, return early without reprocessing
- [ ] Clean up `/tmp` on both success and failure to prevent disk exhaustion

### 9.5 Worker Containerization & Deployment

- [ ] Write `apps/worker/Dockerfile`: use `jrottenberg/ffmpeg:latest` as base image, install Node.js, copy app
- [ ] Configure Cloud Run service: min instances 1, 4GB RAM, 2 vCPU, 60min request timeout
- [ ] Deploy to GCP Cloud Run dev environment
- [ ] Write Cloud Tasks dispatcher in `apps/api/lib/cloud-tasks.ts`: `dispatchAssemblyTask(videoId)`
- [ ] Wire `dispatchAssemblyTask` call into `POST /api/operator/clips/:id/complete` when all clips done

---

## Phase 10 — Email Notifications

### 10.1 Resend Integration

- [ ] Create `apps/api/services/resend.ts` (and mirror in `apps/worker/lib/resend.ts`):
  - `sendVideoReadyEmail(toEmail, firstName, videoTitle, videoUrl)`
  - `sendVideoFailedEmail(toEmail, firstName, videoTitle, retryUrl)`
- [ ] Build HTML email templates for both (simple, clean, on-brand dark)
- [ ] Test both email templates via Resend dashboard
- [ ] Wire `sendVideoReadyEmail` into FFmpeg worker Step 6
- [ ] Wire `sendVideoFailedEmail` into FFmpeg worker error handler

---

## Phase 11 — Monetization

### 11.1 Stripe Integration

- [ ] Create `apps/api/services/stripe.ts`:
  - `createTrialCheckoutSession(userId, userEmail)` → Stripe Checkout session for $2
  - `createSubscriptionCheckoutSession(userId, userEmail, priceId)` → Stripe Checkout for Starter/Pro
  - `createBillingPortalSession(stripeCustomerId)` → Stripe Portal URL
- [ ] Implement `POST /api/billing/trial-checkout` — creates $2 checkout, returns session URL
- [ ] Implement `POST /api/billing/subscribe` — creates subscription checkout, returns session URL
- [ ] Implement `GET /api/billing/portal` — returns billing portal URL (requires `stripe_customer_id`)
- [ ] Implement Stripe webhook handler (already scaffolded in Phase 2 quota section — complete all event types)
- [ ] Test full trial purchase flow end-to-end in Stripe test mode

### 11.2 Frontend Payment Flows

- [ ] Implement Trial Payment Modal UI (triggered from Step 5 when `trial_paid = false`)
- [ ] "Pay $2 and Continue" → calls `POST /api/billing/trial-checkout` → redirect to Stripe Checkout
- [ ] Stripe success redirect lands back on the wizard at the correct step
- [ ] Implement Subscription Prompt Modal (shown on Step 7 after trial video completes)
- [ ] Implement Daily Quota Exceeded Modal
- [ ] Implement Monthly Quota Exceeded Modal
- [ ] Implement Upgrade button in sidebar usage meter (links to `/billing`)

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

- [ ] Implement shareable video link generation: `GET /api/videos/:id/share` — generates a 7-day signed GCS URL for `output.mp4` and returns a `/watch/:token` route
- [ ] Build `/watch/[token]` public page — no auth required, just the video player + basic metadata
- [ ] Implement video delete: `DELETE /api/videos/:id` — soft delete in DB + queue GCS asset cleanup job
- [ ] Implement GCS cleanup Cloud Task: `POST /api/jobs/cleanup-deleted-assets` — deletes GCS objects for soft-deleted videos
- [ ] Add `GET /api/videos` endpoint listing all videos for the authenticated user across projects (for Library page)

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

### 14.4 Performance Testing

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
