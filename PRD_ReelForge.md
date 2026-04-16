# Product Requirements Document
## ReelForge — AI-Powered Short-Form Video Generation Platform

**Version:** 1.1 (MVP)  
**Status:** Draft  
**Date:** April 16, 2026  

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Apr 16, 2026 | Initial draft |
| 1.1 | Apr 16, 2026 | Next.js 16.1, PostgreSQL (Neon) + Drizzle ORM replacing Firestore, Resend email replacing FCM, $2 one-time trial charge |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [Monorepo Structure](#6-monorepo-structure)
7. [Core Features](#7-core-features)
   - 7.1 Authentication & Onboarding
   - 7.2 Project Management
   - 7.3 Video Creation Workflow
   - 7.4 Script Generation
   - 7.5 Voiceover Generation
   - 7.6 Scene & Base Image Generation
   - 7.7 Clip Generation Queue
   - 7.8 Operator Browser Extension
   - 7.9 Subtitle Generation
   - 7.10 Video Assembly (FFmpeg)
   - 7.11 Notification System
   - 7.12 Video Library
   - 7.13 Background Music
8. [Monetization](#8-monetization)
9. [Data Models](#9-data-models)
10. [API Contracts](#10-api-contracts)
11. [Browser Extension Spec](#11-browser-extension-spec)
12. [FFmpeg Pipeline Spec](#12-ffmpeg-pipeline-spec)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Out of Scope for MVP](#14-out-of-scope-for-mvp)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Milestones](#16-milestones)

---

## 1. Product Overview

**ReelForge** is a web-based AI platform that enables social media content creators to produce 30–60 second short-form videos at scale — targeting 5+ finished videos per day across multiple channels and platforms (TikTok, Instagram Reels, YouTube Shorts, Facebook Reels).

The platform orchestrates a multi-AI pipeline:

| Stage | Tool |
|-------|------|
| Script generation | Claude Sonnet 4.6 |
| Voiceover | ElevenLabs Multilingual v3 |
| Base image per scene | xAI Grok Imagine Image API |
| Video clip per scene | Grok Imagine Video (via operator browser extension) |
| Video assembly | FFmpeg on GCP Cloud Run |

### The Core Cost Insight

Video clip generation via API is expensive at scale. ReelForge avoids per-clip API costs by routing all clip generation through an **operator-run browser extension** that uses the operator's existing SuperGrok subscription (100+ generations/day). The extension runs a fully automated pipeline — auto-filling prompts and base images into Grok's web UI, auto-clicking generate, detecting completion, and uploading results to GCP — with no user involvement in this step.

### What "End-to-End" Looks Like for a User

1. Open a project → start a new video
2. Brainstorm or paste an idea
3. Review and approve the AI-generated script
4. Review and approve the AI-generated voiceover
5. Review and approve AI-generated base images per scene
6. Select a subtitle style
7. Submit → clips go into the operator queue → video assembles automatically
8. Receive email → watch and download the finished video

Active effort per video: **under 10 minutes.**

---

## 2. Goals & Success Metrics

### MVP Goals

| Goal | Metric | Target |
|------|--------|--------|
| End-to-end pipeline works | Videos assembled successfully | 95%+ success rate in QA |
| Fast user workflow | Active time per video | < 10 min |
| Operator queue is efficient | Clips generated per hour via extension | 60–100 clips/hr |
| Multi-tenant isolation | User A cannot see or access User B data | Zero cross-user data leakage |
| Monetization works | Trial purchase + subscription flow | Functional at launch |

### Key Post-MVP Metrics to Track

- Trial-to-subscription conversion rate
- Average videos generated per active user per day
- Operator queue average wait time (idea submitted to video ready)
- Clip generation failure rate per extension session

---

## 3. User Personas

### Persona 1: Solo Content Creator (Primary MVP Target)

- Manages 2–5 social media channels across niches
- Posts 3–7 short-form videos per day
- Non-technical — needs a clean, step-by-step UI with zero ambiguity
- Main pain point: content production speed and consistency
- Willing to pay a monthly subscription if it saves 2+ hours/day

### Persona 2: Operator (Internal — Founder or Employee)

- Runs the browser extension on a dedicated machine
- Monitors and processes the global clip generation queue
- Not a product user — operates the extension as a backend service
- Needs a reliable, fast, low-friction interface to process 50–200 clips per session

### Persona 3: Small Content Agency (Post-MVP)

- Manages 10–20 client accounts
- Needs per-client project isolation
- Higher volume demands — 20–50 videos/day
- Out of scope for MVP but architecture must not block this

---

## 4. System Architecture

```
+-------------------------------------------------------------+
|                      Web App (Next.js 16.1)                 |
|  Projects | Video Workflow | Library | Settings | Billing   |
+----------------------------+--------------------------------+
                             |  REST + SSE
+----------------------------v--------------------------------+
|                    Backend API (Node.js / Fastify)          |
|         Auth (Clerk) | Job Queue | Neon DB | Storage        |
+---+----------+----------+--------------+----------+---------+
    |          |          |              |          |
    v          v          v              v          v
 Claude     ElevenLabs  Grok Image   GCP Cloud   GCP Cloud
 Sonnet 4.6  API        API (base    Storage     Tasks
 (script)   (voice +    images)      (assets)    (job queue)
             timestamps)
                                                |
                                   +------------v-----------+
                                   |   FFmpeg Worker         |
                                   |   (GCP Cloud Run)       |
                                   +------------------------+
                                                ^
                             +------------------+
             +---------------+-----------------+
             |       Operator Extension         |
             |  (Chrome/Edge, Manifest V3)      |
             |                                  |
             |  Polls queue -> Opens Grok tabs  |
             |  Auto-fills image + prompt       |
             |  Auto-clicks Generate            |
             |  Detects done -> Uploads clip    |
             +----------------------------------+
```

### Real-Time Status Updates (SSE)

Since PostgreSQL replaces Firestore, real-time video status on the processing screen is delivered via **Server-Sent Events (SSE)**:

- Client opens a persistent SSE connection to `GET /api/videos/:id/status-stream`
- API polls the database every 2 seconds and pushes status change events to the client
- SSE connection auto-closes when the video reaches `COMPLETE` or `FAILED`
- Clean, lightweight, no additional services required

### Key Architectural Principles

- **Async-first:** Every AI call is a background job. The UI never blocks waiting for AI responses.
- **Stateless API:** All state lives in Neon PostgreSQL and GCP Storage. API workers are horizontally scalable.
- **Queue-driven assembly:** FFmpeg is triggered automatically by a GCP Cloud Task when all clips for a video are uploaded — no polling needed.
- **Operator extension is internal-only:** Authenticates with a hardcoded operator secret, not user credentials. Users have zero visibility into this layer.
- **Monorepo:** All code (web app, backend API, FFmpeg worker, extension) lives in one repository for unified deployment and shared types/utilities.

---

## 5. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 16.1 (App Router) | Latest stable — Turbopack default, Cache Components, proxy.ts routing |
| Styling | Tailwind CSS + shadcn/ui | Speed of development, consistent UI |
| Auth | Clerk | Drop-in multi-tenant auth, social login, webhooks |
| Backend API | Node.js + Fastify | Lightweight, fast, TypeScript-native |
| Database | Neon PostgreSQL + Drizzle ORM | Serverless Postgres — relational model fits perfectly, Drizzle is TypeScript-native and lightweight |
| File Storage | GCP Cloud Storage | Scalable blob storage for audio, images, clips, videos |
| Job Queue | GCP Cloud Tasks | Reliable async task dispatch with retries |
| Real-time updates | Server-Sent Events (SSE) | Lightweight real-time status push, no extra service |
| Video Assembly | FFmpeg on GCP Cloud Run | Headless video editing, auto-scaling |
| Script AI | Anthropic Claude Sonnet 4.6 | Best-in-class script generation |
| Voiceover | ElevenLabs Multilingual v3 | High-quality multilingual TTS + word timestamps |
| Base Images | xAI Grok Imagine Image API | Fast image generation, visually consistent with video clips |
| Video Clips | Grok Imagine Video (browser) | Cost-free via SuperGrok subscription |
| Browser Extension | Chrome Extension Manifest V3 | Tab automation, DOM interaction |
| Email Notifications | Resend | Simple transactional email — one email when video is ready |
| Monorepo | Turborepo + pnpm workspaces | Unified builds, shared packages, fast CI |
| Deployment | GCP Cloud Run (all services) | Serverless containers, auto-scaling |
| CI/CD | GitHub Actions | Automated test and deploy per workspace |

### Why PostgreSQL over Firestore for this project

The data in ReelForge is fundamentally relational: Users → Projects → Videos → Scenes → ClipRequests. Key benefits of PostgreSQL here:

- **Transactions:** Quota enforcement (increment `videos_today` and check limit atomically) and clip queue claiming (mark `processing` without race conditions) both require ACID transactions — Firestore cannot guarantee this.
- **Joins:** Fetching a video with all its scenes and clip request statuses in one query is natural SQL. Firestore requires multiple round-trips.
- **Neon serverless:** Scales to zero between requests, HTTP-compatible, no connection pool management needed from Cloud Run.
- **Drizzle ORM:** Type-safe, schema-defined in TypeScript, migrations built-in, zero runtime overhead.

---

## 6. Monorepo Structure

```
reelforge/
├── apps/
│   ├── web/                        # Next.js 16.1 web application
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, signup (Clerk)
│   │   │   ├── dashboard/          # Home / project list
│   │   │   ├── projects/[id]/      # Project detail
│   │   │   ├── videos/[id]/        # Video creation wizard
│   │   │   └── library/            # Finished videos
│   │   ├── proxy.ts                # Next.js 16 routing (replaces middleware.ts)
│   │   ├── components/
│   │   └── lib/                    # API client, hooks, utils
│   │
│   ├── api/                        # Node.js Fastify backend
│   │   ├── routes/                 # REST + SSE endpoints
│   │   ├── services/               # Claude, ElevenLabs, Grok, FFmpeg, Resend
│   │   ├── jobs/                   # Cloud Tasks job handlers
│   │   └── lib/
│   │       ├── db/                 # Drizzle ORM client + schema
│   │       ├── storage.ts          # GCP Storage helpers
│   │       └── auth.ts             # Clerk JWT validation
│   │
│   ├── worker/                     # FFmpeg Cloud Run worker
│   │   ├── assembler.ts            # Main FFmpeg assembly logic
│   │   ├── subtitles.ts            # Subtitle generation from timestamps
│   │   └── Dockerfile
│   │
│   └── extension/                  # Chrome Extension (Manifest V3)
│       ├── manifest.json
│       ├── background/             # Service worker (queue polling, tab manager)
│       ├── content/                # Injected scripts for Grok Imagine page
│       ├── popup/                  # Operator UI (React)
│       └── lib/                    # API client, upload helpers
│
├── packages/
│   ├── types/                      # Shared TypeScript interfaces
│   ├── utils/                      # Shared pure utility functions
│   └── config/                     # Shared ESLint, TS, Tailwind configs
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Shared Package Strategy

- `packages/types` exports all shared interfaces: `Project`, `Video`, `Scene`, `ClipRequest`, `Job`, etc. The web app, API, and extension all import from this package — no type drift between layers.
- `packages/utils` exports shared helpers: slug generation, timestamp formatting, video duration math.
- Drizzle schema lives in `apps/api/lib/db/schema.ts` and is the single source of truth for the database structure. Types are inferred from the schema and re-exported via `packages/types`.

---

## 7. Core Features

---

### 7.1 Authentication & Onboarding

**Provider:** Clerk

**Auth flows:**
- Email/password signup and login
- Google OAuth
- Clerk JWT passed as `Authorization: Bearer` to every API request

**Next.js 16.1 note:** Route protection is implemented in `proxy.ts` (replaces `middleware.ts`). The exported function is renamed from `middleware` to `proxy`. All `/dashboard`, `/projects`, `/videos`, and `/library` routes redirect to login if no valid Clerk session exists.

**First-time user onboarding:**

After signup, a 3-step modal guides the user:
- Step 1: Create your first project
- Step 2: Brief animated overview of the video creation workflow
- Step 3: Purchase trial video to get started ($2 one-time)

Onboarding completion state tracked in the `users` table. Never shown again once completed.

**Trial:**
- User must complete a $2 Stripe payment before their first video is created
- Payment is one-time — not a subscription
- After trial video is complete, user is prompted to subscribe for ongoing access
- No credit card details stored — all handled by Stripe

---

### 7.2 Project Management

A **Project** represents one channel or content category. Every video is created inside a project and inherits all project-level settings.

#### Project Creation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | e.g., "TikTok — Fitness Tips" |
| `platform` | enum | Yes | TikTok, Instagram, YouTube Shorts, Facebook Reels |
| `niche` | string | Yes | e.g., "Personal Finance", "Fitness", "Cooking" |
| `language` | string | Yes | Dropdown: English, Bengali, Spanish, Hindi, etc. |
| `target_audience` | string | Yes | Free text: e.g., "18–35 year old gym beginners" |
| `video_style` | enum | Yes | Educational, Motivational, Storytelling, Listicle, Tutorial, POV |
| `tone` | enum | Yes | Casual, Professional, Humorous, Inspirational, Dramatic |
| `voice_id` | string | Yes | Selected from ElevenLabs voice picker with audio preview |
| `default_subtitle_style` | enum | No | Bold Pop, Minimal, Cinematic, Word-by-Word Highlight |
| `default_bgm_enabled` | bool | No | Whether BGM is on by default for new videos |
| `default_bgm_asset_id` | string | No | Pre-selected BGM track ID |
| `claude_system_prompt` | string | No | Optional extra instructions Claude follows for this project |

#### Project Dashboard

- Grid view of all projects with most recent video thumbnail
- Each card: project name, platform icon, video count, last activity date
- "New Video" shortcut button on each card
- Project settings via gear icon (edit or delete project)

---

### 7.3 Video Creation Workflow

The video creation flow is a **linear multi-step wizard** with persistent state. Users can leave and return at any step without losing progress. Each video has a `status` column in PostgreSQL tracking the current pipeline stage.

#### Video Status State Machine

```
DRAFT
  -> SCRIPT_PENDING   -> SCRIPT_READY
  -> VOICE_PENDING    -> VOICE_READY
  -> SCENES_PENDING   -> SCENES_READY
  -> CLIPS_QUEUED     -> CLIPS_PROCESSING
  -> ASSEMBLY_PENDING -> ASSEMBLY_PROCESSING
  -> COMPLETE | FAILED
```

#### Step 1 — Idea Input

- Text area: "What's your video about?"
- Two modes:
  - **Brainstorm mode:** User types a loose topic. Claude generates 3 idea cards to choose from.
  - **Direct mode:** User pastes a fully formed idea and proceeds straight to script generation.
- Selected idea saved to `videos.idea`.

#### Step 2 — Script Review

- Claude generates a script (see Section 7.4)
- Shown in an editable text area — user can freely edit before approving
- Estimated duration shown based on word count / speech rate
- Buttons: **Regenerate** | **Approve Script**

#### Step 3 — Voiceover Review

- ElevenLabs generates audio (see Section 7.5)
- Inline audio player with waveform visualization
- Buttons: **Regenerate Voice** | **Approve Voice**

#### Step 4 — Scene & Base Image Review

- System splits script into 8–12 scenes automatically
- Each scene card shows:
  - Text excerpt for that scene
  - Auto-generated visual prompt (from Claude)
  - Base image generated via Grok Image API
- Per-scene actions: **Regenerate Image** | **Edit Prompt + Regenerate** | **Upload Own Image**
- Bulk action: **Approve All Scenes** proceeds to next step

#### Step 5 — Subtitle & BGM Selection

- Subtitle style picker with 4 visual preview cards
- BGM toggle: on/off
  - If on: BGM library picker + volume slider (default 30%)
- Button: **Generate Video** — submits all clip requests to queue

#### Step 6 — Processing Screen

Real-time status via SSE:
- Script approved (done)
- Voiceover ready (done)
- Base images ready (done)
- Clips in queue: "Your clips are #4 in queue" (live update)
- Video assembling (spinner)

User can leave this page. Email sent via Resend on completion.

#### Step 7 — Video Ready

- Inline video player (full preview)
- Download button (MP4)
- Private shareable link (expires 7 days)
- "Make Another Video" shortcut button

---

### 7.4 Script Generation

**Model:** Claude Sonnet 4.6

**Trigger:** User approves idea in Step 1

**System prompt assembled dynamically from project settings:**

```
You are a viral short-form video scriptwriter.

Project context:
- Platform: {platform}
- Niche: {niche}
- Target audience: {target_audience}
- Video style: {video_style}
- Tone: {tone}
- Language: {language}
- Additional instructions: {claude_system_prompt}

Rules:
- Script must be 80-150 words (30-60 seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in {language}

User's idea: {idea}

Write the script now.
```

**Brainstorm mode (separate call):**

Claude returns a JSON array of 3 short ideas. Each rendered as a selectable card. On selection, the main script generation call fires.

**Output:** Plain text stored in `videos.script`

**Regeneration:** Fresh Claude API call with the same prompt. No version history in MVP.

---

### 7.5 Voiceover Generation

**Model:** ElevenLabs Multilingual v3

**Trigger:** User approves script in Step 2

**API parameters:**
- `voice_id`: from `projects.voice_id`
- `text`: `videos.script`
- `model_id`: `eleven_multilingual_v3`
- `output_format`: `mp3_44100_128`
- `with_timestamps`: `true` — returns word-level alignment data

**Output stored in GCP Storage:**
- `videos/{video_id}/audio.mp3`
- `videos/{video_id}/word_timestamps.json` — array of `{ word, start_time, end_time }`

Word timestamps are the source of truth for subtitle sync in the FFmpeg pipeline.

**Voice picker in Project Settings:**
- Lists available ElevenLabs voices with language tag
- Inline "Preview" button plays a 5-second sample
- Voice ID stored at project level — shared across all videos in the project

---

### 7.6 Scene & Base Image Generation

#### Scene Splitting

**Trigger:** User approves voiceover in Step 3

A Claude API call receives the approved script and returns a structured JSON array:

```json
[
  {
    "scene_index": 0,
    "text_excerpt": "Did you know 80% of people quit the gym in January?",
    "visual_prompt": "Crowded gym in January, people on treadmills, bright overhead lighting, motivational posters on wall, cinematic wide shot",
    "duration_hint_seconds": 4
  }
]
```

Scene splitting rules given to Claude:
- Produce 8–12 scenes total
- Each scene maps to a distinct visual moment
- Visual prompts must be specific, cinematic, and generation-safe
- Sum of `duration_hint_seconds` must approximately match audio duration

#### Base Image Generation

**API:** `POST https://api.x.ai/v1/images/generations`

**Trigger:** Scene split complete — all image requests fired in parallel

**Request body:**
```json
{
  "model": "grok-2-image",
  "prompt": "{scene.visual_prompt}",
  "n": 1,
  "response_format": "url"
}
```

All base images generated in parallel — 8–12 images complete in approximately 10–15 seconds total.

**User actions per scene card:**
- **Regenerate** — new Grok Image API call, same prompt
- **Edit Prompt + Regenerate** — editable prompt field, then new call
- **Upload Image** — replaces base image with user-uploaded file

Approved base images stored at: `videos/{video_id}/scenes/{n}/base_image.jpg`

---

### 7.7 Clip Generation Queue

When the user clicks "Generate Video" in Step 5, the backend creates one `clip_requests` row per scene in PostgreSQL and inserts each into the FIFO operator queue.

#### clip_requests Table Row

```typescript
interface ClipRequest {
  id: string;
  video_id: string;
  user_id: string;
  scene_index: number;
  visual_prompt: string;
  base_image_url: string;        // Short-lived signed GCS URL
  status: 'queued' | 'processing' | 'done' | 'failed';
  queued_at: Date;
  claimed_at: Date | null;       // Set when extension claims it
  processed_at: Date | null;
  clip_url: string | null;       // GCS path once uploaded
  error: string | null;
}
```

#### Queue Behavior

- **FIFO across all users** — ordered strictly by `queued_at`
- Extension polls `/api/operator/queue` every 3 seconds when active
- Extension fetches next N requests (batch size configurable, default 30)
- Claim is atomic: a single `UPDATE ... WHERE status = 'queued' ORDER BY queued_at LIMIT N RETURNING *` with `FOR UPDATE SKIP LOCKED` — PostgreSQL handles concurrent access safely with no race conditions
- **Stale lock timeout:** A GCP Cloud Task runs every 5 minutes and resets any `clip_requests` row that has been `processing` for more than 10 minutes back to `queued`

#### Video Assembly Trigger

A GCP Cloud Task is dispatched when the last `clip_requests` row for a `video_id` is marked `done`. The task hits the FFmpeg worker endpoint to begin assembly.

---

### 7.8 Operator Browser Extension

The extension is an **internal operator tool** — not distributed to users. It runs on the operator's machine, processes the global clip queue, and uploads results back to GCP.

Full specification in Section 11.

---

### 7.9 Subtitle Generation

**Source data:** `word_timestamps.json` from ElevenLabs response

**Format:** ASS subtitle file generated by the FFmpeg worker

**Subtitle Styles:**

| Style | Description |
|-------|-------------|
| Bold Pop | Large bold white text, black drop shadow, center screen, active word highlighted in yellow |
| Minimal | Small white text, bottom third, sentence-by-sentence, no background |
| Cinematic | White text on semi-transparent black bar, bottom third, sentence-level |
| Word-by-Word Highlight | Each word scales in individually at exact timestamp, center screen |

Style selection stored in `videos.subtitle_style`. The FFmpeg worker uses this to choose the correct ASS style template during assembly.

---

### 7.10 Video Assembly (FFmpeg)

**Runtime:** GCP Cloud Run (dedicated worker container)

**Trigger:** GCP Cloud Task dispatched when all clip requests for a video are done

Full pipeline specification in Section 12.

---

### 7.11 Notification System

**Provider:** Resend (transactional email only)

One email is sent to the user when their video reaches `COMPLETE` or `FAILED` status. No push notifications, no SMS — email only for MVP.

#### Email Templates

**Video Ready:**
```
Subject: Your video is ready — ReelForge

Hi {first_name},

Your video "{video_title}" is ready to watch and download.

[Watch Video] <- button linking to /videos/{id}

The ReelForge Team
```

**Video Failed:**
```
Subject: There was a problem with your video — ReelForge

Hi {first_name},

We ran into an issue generating your video "{video_title}".

[Retry Video] <- button linking to /videos/{id}

If the problem persists, reply to this email.

The ReelForge Team
```

Email is sent from the FFmpeg worker via the Resend API at the end of the assembly step. The API call is a simple `POST` with the user's email address (fetched from the `users` table) and the template content.

---

### 7.12 Video Library

Paginated grid of all completed videos across all projects.

**Features:**
- Filter by project, filter by date range
- Each card: first-frame thumbnail, duration, project name, creation date
- Click card to expand inline video player
- Download button (MP4)
- Private shareable link (7-day expiry)
- Delete video (soft delete — marks `deleted_at`, removes GCS assets async)

---

### 7.13 Background Music

**MVP scope:** Curated library of 20–30 royalty-free tracks, categorized by mood (Energetic, Calm, Motivational, Cinematic, Upbeat).

**Per-video BGM settings:**
- Toggle on/off (inherits project default)
- Track picker from library
- Volume level 0–100%, default 30%
- FFmpeg applies automatic ducking — BGM volume reduces under voiceover sections

BGM tracks are stored in GCP Storage and managed by the operator. User-uploaded BGM is out of scope for MVP.

---

## 8. Monetization

### Plan Structure

| Plan | Price | Type | Daily Limit | Monthly Limit |
|------|-------|------|-------------|---------------|
| Trial | $2 one-time | One-time Stripe payment | 1 video (lifetime) | — |
| Starter | $X/month | Subscription | 5 videos/day | 150 videos |
| Pro | $Y/month | Subscription | 15 videos/day | 450 videos |

*Exact subscription pricing ($X, $Y) set by founder before launch.*

### Trial Flow

1. User signs up and completes onboarding
2. Before creating their first video (at Step 1), a payment modal appears: "Get your first video for $2"
3. Stripe Checkout opens for a one-time $2 payment
4. On payment success: `users.trial_paid = true`, `users.trial_video_remaining = 1`
5. User proceeds to create their video
6. After the trial video is complete, a subscription prompt appears: "Keep creating — choose a plan"

### Subscription Flow

- Stripe Subscription created for Starter or Pro
- Webhook updates `users.plan`, `users.daily_limit`, `users.monthly_limit`
- Cancellation: access continues until end of billing period, then plan reverts

### Quota Enforcement

Backend checks quota before allowing a video past Step 1:

```sql
SELECT videos_today, daily_limit, trial_video_remaining, trial_paid, plan
FROM users WHERE id = $1
```

Logic:
- If `plan = 'none'` and `trial_paid = false` → show $2 payment modal
- If `plan = 'none'` and `trial_paid = true` and `trial_video_remaining = 0` → show subscription prompt
- If `plan` is active and `videos_today >= daily_limit` → show quota exceeded modal
- Otherwise → allow creation, increment `videos_today` atomically

`videos_today` resets to 0 at UTC midnight via a scheduled GCP Cloud Task.

### Usage Tracking Columns (in `users` table)

```typescript
{
  plan: 'none' | 'starter' | 'pro';
  trial_paid: boolean;
  trial_video_remaining: number;         // 0 or 1
  videos_today: number;
  videos_this_month: number;
  daily_limit: number;
  monthly_limit: number;
  last_reset_at: Date;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}
```

---

## 9. Data Models

### PostgreSQL Schema (Drizzle ORM)

#### users
```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),                  // Clerk user ID
  email: text('email').notNull(),
  first_name: text('first_name'),
  plan: text('plan').default('none'),
  trial_paid: boolean('trial_paid').default(false),
  trial_video_remaining: integer('trial_video_remaining').default(0),
  videos_today: integer('videos_today').default(0),
  videos_this_month: integer('videos_this_month').default(0),
  daily_limit: integer('daily_limit').default(0),
  monthly_limit: integer('monthly_limit').default(0),
  last_reset_at: timestamp('last_reset_at').defaultNow(),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  onboarding_complete: boolean('onboarding_complete').default(false),
  created_at: timestamp('created_at').defaultNow(),
});
```

#### projects
```typescript
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  niche: text('niche').notNull(),
  language: text('language').notNull(),
  target_audience: text('target_audience').notNull(),
  video_style: text('video_style').notNull(),
  tone: text('tone').notNull(),
  voice_id: text('voice_id').notNull(),
  default_subtitle_style: text('default_subtitle_style'),
  default_bgm_enabled: boolean('default_bgm_enabled').default(false),
  default_bgm_asset_id: text('default_bgm_asset_id'),
  claude_system_prompt: text('claude_system_prompt'),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

#### videos
```typescript
export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  project_id: uuid('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  idea: text('idea').notNull(),
  script: text('script'),
  audio_url: text('audio_url'),
  word_timestamps_url: text('word_timestamps_url'),  // GCS path to JSON file
  subtitle_style: text('subtitle_style').notNull().default('bold_pop'),
  bgm_enabled: boolean('bgm_enabled').default(false),
  bgm_asset_id: text('bgm_asset_id'),
  bgm_volume: integer('bgm_volume').default(30),
  status: text('status').notNull().default('DRAFT'),
  output_url: text('output_url'),
  duration_seconds: integer('duration_seconds'),
  error: text('error'),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

#### scenes
```typescript
export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  video_id: uuid('video_id').notNull().references(() => videos.id),
  scene_index: integer('scene_index').notNull(),
  text_excerpt: text('text_excerpt').notNull(),
  visual_prompt: text('visual_prompt').notNull(),
  base_image_url: text('base_image_url'),
  clip_url: text('clip_url'),
  clip_request_id: uuid('clip_request_id'),
  duration_hint_seconds: integer('duration_hint_seconds').notNull(),
  approved: boolean('approved').default(false),
});
```

#### clip_requests
```typescript
export const clip_requests = pgTable('clip_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  video_id: uuid('video_id').notNull().references(() => videos.id),
  user_id: text('user_id').notNull().references(() => users.id),
  scene_index: integer('scene_index').notNull(),
  visual_prompt: text('visual_prompt').notNull(),
  base_image_url: text('base_image_url').notNull(),
  status: text('status').notNull().default('queued'),
  queued_at: timestamp('queued_at').defaultNow(),
  claimed_at: timestamp('claimed_at'),
  processed_at: timestamp('processed_at'),
  clip_url: text('clip_url'),
  error: text('error'),
});
```

---

## 10. API Contracts

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects for authenticated user |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project by ID |
| PUT | `/api/projects/:id` | Update project settings |
| DELETE | `/api/projects/:id` | Soft delete project |

### Videos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/videos` | List videos in project |
| POST | `/api/projects/:id/videos` | Create new video |
| GET | `/api/videos/:id` | Get video with scenes and status |
| GET | `/api/videos/:id/status-stream` | SSE stream for real-time status updates |
| POST | `/api/videos/:id/brainstorm` | Generate 3 idea options (Claude) |
| POST | `/api/videos/:id/script` | Generate script (Claude) |
| POST | `/api/videos/:id/voice` | Generate voiceover (ElevenLabs) |
| POST | `/api/videos/:id/scenes` | Generate scene split + base images |
| POST | `/api/videos/:id/scenes/:index/regenerate` | Regenerate one scene's base image |
| POST | `/api/videos/:id/submit` | Submit to clip queue and begin pipeline |
| DELETE | `/api/videos/:id` | Soft delete video |

### Operator Queue (Extension Only)

Authenticated with `X-Operator-Secret` header. Not accessible to regular users.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/operator/queue` | Atomically claim next N queued clip requests |
| POST | `/api/operator/clips/:id/upload-url` | Get signed GCS upload URL for clip |
| POST | `/api/operator/clips/:id/complete` | Mark clip done with GCS path |
| POST | `/api/operator/clips/:id/fail` | Mark clip failed with error message |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets/bgm` | List available BGM tracks |
| GET | `/api/assets/voices` | List available ElevenLabs voices with preview URLs |

### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/trial-checkout` | Create Stripe $2 one-time checkout session |
| POST | `/api/billing/subscribe` | Create Stripe subscription checkout session |
| POST | `/api/billing/webhook` | Stripe webhook handler (plan updates) |
| GET | `/api/billing/portal` | Stripe billing portal link |

---

## 11. Browser Extension Spec

### Overview

A **Chrome/Edge Manifest V3 extension** installed only on the operator's machine. Distributed as an unpacked extension or signed CRX — not published to the Chrome Web Store.

### Authentication

- Operator secret (256-bit random token) stored in `chrome.storage.local`
- Configured once on first setup via the extension settings page
- All backend requests include `X-Operator-Secret: {secret}` header
- Secret can be rotated from the extension settings page

### Extension UI (Popup)

```
+--------------------------------+
|  ReelForge Operator            |
|  ----------------------------  |
|  Queue: 47 pending clips       |
|                                |
|  Batch size:  [30]             |
|  Auto-click:  [ON]  toggle     |
|  Click delay: [Normal 2-5s]    |
|                                |
|  [> Start Processing]          |
|                                |
|  Session stats:                |
|  12 done  |  0 failed          |
|  Est. remaining: ~18 min       |
+--------------------------------+
```

### Full Automation Flow (Per Clip)

1. Extension service worker fetches a batch of `N` ClipRequests from `/api/operator/queue` — rows are atomically claimed via `FOR UPDATE SKIP LOCKED`
2. For each request, opens a new Grok Imagine tab
3. Injects content script into the tab
4. Content script waits for Grok page to fully load (polls for input field readiness)
5. Downloads the `base_image_url` and sets it as the image input in Grok's interface
6. Pastes the `visual_prompt` into the text prompt field
7. If **Auto-click ON:** waits a randomized delay (2–5 seconds default), then clicks the Generate button
8. If **Auto-click OFF:** highlights the Generate button in green and waits for operator click
9. Content script monitors the DOM for the generated video element to appear
10. On detection: captures the video as a Blob
11. Requests a signed GCS upload URL from `/api/operator/clips/:id/upload-url`
12. Uploads video Blob directly to GCS
13. Calls `/api/operator/clips/:id/complete` with the GCS path
14. Tab closes automatically (configurable to keep open for inspection)

### Failure Handling

- Generation timeout > 3 minutes: call `/api/operator/clips/:id/fail`, release tab
- Upload failure: retry up to 3 times with exponential backoff
- All failures displayed in extension popup with per-clip retry buttons
- No silent failures — every outcome is reported to the backend

### Tab Management

- Maximum 30 concurrent tabs (configurable up to 50 in settings)
- Rolling window: new tab opens when a previous one completes
- In-memory map of `tab_id -> clip_request_id` managed in the service worker

### Auto-Click Delay Modes

| Mode | Delay Range | Notes |
|------|-------------|-------|
| Fast | 1–2 seconds random | Higher detection risk |
| Normal (default) | 2–5 seconds random | Mimics natural human behavior |
| Slow | 5–10 seconds random | Safest, lowest throughput |

### Resilience & Maintainability

- **Stale lock fallback:** A GCP Cloud Task runs every 5 minutes and resets requests stuck in `processing` for 10+ minutes. Extension crashes never permanently block requests.
- **Configurable DOM selectors:** Grok UI selectors (input field, image upload, generate button, output video element) stored as editable strings in `chrome.storage.sync`. When xAI updates their UI, operator edits the selector strings in extension settings — no redeployment needed.
- **Selector error UI:** If a selector fails to find its target, the extension shows a clear "Selector Error" alert identifying which selector failed and its current configured value.

---

## 12. FFmpeg Pipeline Spec

### Trigger

GCP Cloud Task dispatched when all `clip_requests` rows for a `video_id` reach `status = 'done'`. The task hits `POST /assemble` on the FFmpeg Cloud Run worker.

### Input Assets Downloaded from GCP Storage

- `videos/{video_id}/audio.mp3` — ElevenLabs voiceover
- `videos/{video_id}/scenes/{n}/clip.mp4` — Grok video clips (8–12 files)
- `videos/{video_id}/word_timestamps.json` — word-level timing data
- `assets/bgm/{bgm_asset_id}.mp3` — background music (if enabled)

### Assembly Steps

**Step 1 — Normalize all clips**

Resize to `1080x1920` (9:16 vertical), normalize to 30fps, trim to `duration_hint_seconds`:

```bash
ffmpeg -i clip_N.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -r 30 -t {duration_hint} clip_N_normalized.mp4
```

**Step 2 — Concatenate clips**

```bash
ffmpeg -f concat -safe 0 -i clips_list.txt -c copy concatenated.mp4
```

**Step 3 — Mix audio**

With BGM:
```bash
ffmpeg -i concatenated.mp4 -i audio.mp3 -i bgm.mp3 \
  -filter_complex \
    "[2:a]volume={bgm_volume}[bgm];[bgm][1:a]amix=inputs=2:duration=first[aout]" \
  -map 0:v -map [aout] -shortest with_audio.mp4
```

Without BGM:
```bash
ffmpeg -i concatenated.mp4 -i audio.mp3 \
  -map 0:v -map 1:a -shortest with_audio.mp4
```

**Step 4 — Generate subtitle file**

Parse `word_timestamps.json` and produce an ASS file using the selected `subtitle_style`:

- `bold_pop` / `word_highlight`: One ASS event per word, timed to exact `start_time` / `end_time`
- `minimal` / `cinematic`: Groups of 4–6 words per event at sentence level

ASS style definitions encode font, size, color, position, and animation (scale pop effect for `word_highlight`).

**Step 5 — Burn subtitles and export**

```bash
ffmpeg -i with_audio.mp4 \
  -vf "ass=subtitles.ass" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  final.mp4
```

**Step 6 — Upload, update, and notify**

1. Upload `final.mp4` to `videos/{video_id}/output.mp4` in GCS
2. Update PostgreSQL: `videos.status = 'COMPLETE'`, `videos.output_url = {signed_url}`
3. Send email via Resend API: "Your video is ready"

### Output Specification

| Property | Value |
|----------|-------|
| Resolution | 1080 x 1920 (9:16) |
| Format | MP4 (H.264 + AAC) |
| Framerate | 30fps |
| Video bitrate | ~4 Mbps (CRF 23) |
| Audio bitrate | 192 kbps |
| Max duration | 65 seconds |

---

## 13. Non-Functional Requirements

### Performance Targets

| Operation | Target |
|-----------|--------|
| Script generation | < 8 seconds |
| Voiceover generation | < 15 seconds |
| Base images (8–12 in parallel) | < 15 seconds total |
| FFmpeg assembly (after all clips ready) | < 3 minutes |
| Non-AI API endpoints | < 300ms p95 |
| SSE status stream first event | < 1 second after status change |

### Scalability

- Backend API and FFmpeg worker scale horizontally via Cloud Run
- Neon PostgreSQL handles connection pooling via its built-in HTTP driver (no pgBouncer needed)
- GCP Storage scales automatically
- MVP extension is single-operator. Queue architecture supports multiple operators in future — just run the extension on additional machines with the same operator secret.

### Security

- All user data strictly scoped by `user_id` at the API layer (enforced via SQL `WHERE user_id = $clerk_user_id`, never just by ID)
- GCS assets served only via short-lived signed URLs (15-minute expiry) — never public
- Operator secret is environment-variable only — never returned in API responses
- Clerk JWT validated on every authenticated request
- Extension communicates over HTTPS only
- Stripe webhook signature verified on every webhook event

### Reliability

- GCP Cloud Tasks retry policy: 3 retries with exponential backoff for all async jobs
- Stale clip lock timeout: 10 minutes, cleaned up by scheduled Cloud Task
- FFmpeg worker is idempotent — safe if Cloud Task retries the trigger
- `FAILED` status shown to user with a targeted **Retry** button that re-queues only the failed stage

### Data Retention

- Finished video files: 30 days in GCS (GCS lifecycle rule auto-deletes)
- Intermediate assets (clips, base images, audio): purged after assembly completes successfully
- User and project data: retained until account deletion request
- Deleted accounts: GCS assets purged within 24 hours via a cleanup job

---

## 14. Out of Scope for MVP

- Mobile app (iOS / Android)
- Direct social media publishing (auto-post to TikTok, Instagram, etc.)
- Multi-seat team or agency accounts
- User-uploaded background music
- Video templates or preset scene layouts
- Creator analytics dashboard
- A/B script testing
- Voice cloning
- Custom domain or white-labeling
- Multiple concurrent operator extension instances
- In-app notifications (email only for MVP)

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Grok Imagine UI update breaks extension selectors | Medium | High | DOM selectors stored as configurable strings in extension settings — operator updates in minutes with no redeployment |
| xAI flags SuperGrok account for automation | Low | Critical | Randomized human-mimicking delays. Auto-click is a toggle — instantly switchable to manual mode. Use a dedicated account separate from personal use. |
| ElevenLabs word timestamps unavailable for some languages | Low | Medium | Test all supported languages pre-launch. Fallback: sentence-level timing from punctuation chunking |
| Grok video generation quality is inconsistent | Medium | Medium | Base image input anchors visual style. Post-MVP: allow users to flag and replace individual clips |
| Neon PostgreSQL connection limits under high concurrency | Low | Medium | Use Neon's HTTP driver (serverless-compatible, no persistent connections). Monitor connection usage from day one. |
| GCP Cloud Run cold start delays FFmpeg jobs | Low | Low | Set minimum instance count to 1 for the FFmpeg worker service |
| Clip queue grows faster than one operator can process | Medium | Medium | Queue position shown to users. Post-MVP: run extension on multiple machines simultaneously |
| $2 trial friction reduces signups | Low | Low | $2 is intentional friction to filter serious users. Monitor conversion rate and adjust if needed. |

---

## 16. Milestones

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Monorepo scaffolded (Turborepo + pnpm workspaces)
- [ ] Shared `packages/types` and `packages/utils` initialized
- [ ] Neon PostgreSQL database provisioned
- [ ] Drizzle ORM schema defined and initial migration applied
- [ ] Next.js 16.1 app bootstrapped with Clerk auth and `proxy.ts` route protection
- [ ] Fastify API bootstrapped and deployed to GCP Cloud Run
- [ ] GCP Storage bucket configured with signed URL generation
- [ ] Project CRUD fully working end-to-end (frontend + API + DB)

### Phase 2 — Core AI Pipeline (Weeks 4–7)
- [ ] Video creation wizard UI (all 7 steps, mocked AI responses)
- [ ] SSE status stream endpoint implemented and wired to frontend
- [ ] Claude script generation integrated (brainstorm + direct modes)
- [ ] ElevenLabs voiceover + word timestamp integration
- [ ] Scene splitting via Claude integrated
- [ ] Grok Image API base image generation integrated
- [ ] Scene review UI (regenerate, edit prompt, upload own image)
- [ ] `clip_requests` rows created on video submission
- [ ] Operator queue API endpoints implemented with `FOR UPDATE SKIP LOCKED`

### Phase 3 — Browser Extension (Weeks 7–9)
- [ ] Extension manifest and popup UI built (React)
- [ ] Content script: image upload + prompt injection into Grok Imagine
- [ ] Auto-click logic with randomized delay modes
- [ ] Manual-click toggle (highlights Generate button, waits for operator)
- [ ] DOM selector configuration panel in extension settings
- [ ] Clip upload to GCS via signed URL
- [ ] Complete claim → upload → complete / fail lifecycle
- [ ] Tab management (rolling window, concurrent cap)
- [ ] Failure handling, retry UI, and stale lock server cleanup task

### Phase 4 — Video Assembly (Weeks 9–11)
- [ ] FFmpeg worker containerized (Dockerfile) and deployed to Cloud Run
- [ ] Cloud Task trigger on all-clips-done condition
- [ ] Clip normalization and concatenation pipeline
- [ ] Audio mixing (voiceover + optional BGM with volume control)
- [ ] ASS subtitle generation from word timestamps (all 4 styles)
- [ ] Final output upload to GCS + PostgreSQL status update
- [ ] Resend email integration (video ready + video failed templates)

### Phase 5 — Notifications, Library, Polish (Weeks 11–13)
- [ ] Video library with project filter, date filter, inline player
- [ ] Shareable private video links (7-day expiry)
- [ ] BGM library (20–30 tracks) uploaded to GCS and wired to picker
- [ ] Error states and retry flows across all pipeline stages
- [ ] Responsive UI polish and loading states throughout
- [ ] SSE connection cleanup and reconnect logic

### Phase 6 — Monetization & Launch (Weeks 13–15)
- [ ] Stripe $2 one-time trial checkout integrated
- [ ] Stripe subscription (Starter + Pro) integrated
- [ ] Stripe webhook handler for plan activation / cancellation
- [ ] Stripe billing portal link
- [ ] Quota enforcement (daily limit, trial gate, upgrade modal)
- [ ] Daily quota reset Cloud Task (UTC midnight)
- [ ] Full end-to-end QA: 5 complete videos, 3 different user accounts
- [ ] Production GCP environment configured and secured
- [ ] Launch

---

*End of Document — ReelForge PRD v1.1*
