# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of Truth

**`PRD_v2.md`** at the repo root is the single authoritative reference for this codebase — architecture, data model, API contracts, services, billing, extension, worker. Read it before making non-trivial decisions.

All older files (`PRD_ReelForge.md`, `FEATURE_SPEC_v2` through `v7`, `ReelForge_MVP_Tasks.md`, `ReelForge_UI_UX_Spec.md`) are superseded and should be ignored.

## PRD Maintenance Rule

**After completing any major change, update `PRD_v2.md` in the same session — never defer it.**

A major change is anything that affects: database schema (new/modified tables or columns), API routes (new endpoints, changed contracts), billing/plan logic, service behavior, extension or worker pipeline, or new web pages/flows.

Specifically update the relevant section(s) of `PRD_v2.md`:
- New table or column → update §5 (Database Schema)
- New or changed endpoint → update §6 (API Routes)
- Service logic change → update §7 (Core Services)
- Prompt change → update §8 (Prompt Architecture)
- Billing/plan change → update §12 (Billing & Quota)
- New page or UI flow → update §14 (Web App Pages)
- New env var → update §17 (Environment Variables)

Do not rewrite the entire PRD — only edit the sections that changed.

## Commands

All commands run from repo root unless noted.

```bash
pnpm dev          # Start all apps (web: 3000, api: 4000)
pnpm build        # Build all workspaces
pnpm lint         # Lint all workspaces (zero warnings required)
pnpm check-types  # Type-check all workspaces
pnpm format       # Format .ts, .tsx, .md with Prettier
```

```bash
# Workspace-scoped
pnpm --filter @repo/api dev
pnpm --filter web dev
pnpm --filter @repo/types check-types
```

```bash
# Database (run from apps/api or via --filter)
pnpm --filter @repo/api db:generate   # Generate migration from schema changes
pnpm --filter @repo/api db:migrate    # Apply migrations
pnpm --filter @repo/api db:push       # Push schema directly (dev only)
pnpm --filter @repo/api db:studio     # Open Drizzle Studio
```

```bash
# Tests
pnpm --filter @repo/api test          # Run API tests (Vitest)
```

## Monorepo Structure

```
apps/
  web/       # Next.js 16 app (port 3000) — user-facing product
  api/       # Fastify API (port 4000) — all backend logic
  worker/    # FFmpeg assembly worker — runs in Docker (not locally)
  extension/ # Chrome MV3 operator extension
packages/
  types/            # @repo/types — all domain interfaces, enums, API shapes
  utils/            # @repo/utils — pure utility functions
  ui/               # @repo/ui — shared React component library
  eslint-config/    # shared ESLint configs
  typescript-config/ # shared TS configs
```

## Architecture Overview

ReelForge is a **set-and-go content machine**. The full user flow:

1. **Connect Facebook** (OAuth) → selects a page → saved to `social_accounts`
2. **Brand onboarding** (7-step wizard at `/brands/new`) → saved to `brand_profiles`
3. **Character sheet** (GPT-image-2 via `openai-image.ts`) → stored in R2, path in `brand_profiles.character_sheet_gcs_path`
4. **Content plan** (Claude generates a full week of topics) → saved to `content_plans.topics` as JSONB
5. **Approve plan** → `batch-generator.ts` runs all videos in parallel (semaphore: max 3 concurrent)
6. **Each video pipeline** inside `batch-generator.ts`:
   - Claude generates script → scenes → dialogue segments
   - `clip_requests` rows inserted (one per scene) → extension picks them up
   - Extension drives Grok Imagine (Chrome tab per clip), uploads result to R2
   - Worker (`POST /assemble`) runs FFmpeg concat + Whisper subtitles → output uploaded to R2
7. **Auto-post** to Facebook (draft / scheduled / manual) after batch completes

### API (`apps/api/`)

Entry point: `src/index.ts`. Routes registered:

| File | Prefix | Purpose |
|---|---|---|
| `routes/videos.ts` | `/api/videos` | Video CRUD, scene generation, clip submission |
| `routes/brands.ts` | `/api/brand-profiles` | Brand profile CRUD, logo/character-sheet upload, onboarding |
| `routes/social.ts` | `/api/auth/facebook`, `/api/social` | Facebook OAuth, connect pages, post video |
| `routes/content-plans.ts` | `/api/content-plans` | Create/approve/regenerate week plans, SSE progress |
| `routes/operator.ts` | `/api/operator` | Extension queue: claim clips, mark done/failed, upload URLs |
| `routes/billing.ts` | `/api/billing` | Stripe checkout, webhooks, portal |
| `routes/jobs.ts` | `/api/jobs` | Cron: reset daily quota, cleanup stale clips |
| `routes/assets.ts` | `/api/assets` | R2 signed upload/download URLs |
| `routes/users.ts` | `/api/users` | User profile, onboarding flag |
| `routes/admin.ts` | `/api/admin` | Internal admin ops |

Key libraries:
- `lib/quota.ts` — pure `checkQuota(user)` function; call before any video creation, never mutates counters
- `lib/plan-event-bus.ts` — in-memory SSE bus (EventEmitter + 50-event ring buffer) for batch progress; `emitPlanEvent` / `subscribeToPlan`
- `lib/clip-events.ts` — in-memory SSE bus for per-video clip progress
- `lib/storage.ts` — Cloudflare R2 via S3-compatible API (NOT GCS); `generateSignedUploadUrl`, `generateSignedReadUrl`
- `lib/cloud-tasks.ts` — dispatches assembly tasks to the FFmpeg worker via HTTP

Claude AI calls all live in `services/claude.ts`: `generateScript`, `splitScenes`, `generateDialogueSegments`, `generateWeekPlan`, `generateTitle`.

Prompts are separated into `prompts/`: `script.ts`, `scenes.ts`, `talking.ts`, `action-reel.ts`, `content-plan.ts`, `character-sheet.ts`, `character.ts`.

### Database Schema

Eight tables in `apps/api/lib/db/schema.ts`. All UUIDs except `users.id` (Clerk user ID, text PK).

```
users              — Clerk ID PK, plan, quota counters (videosToday, videosThisMonth, dailyLimit, monthlyLimit), trial fields
videos             — per-video state machine (see videoStatusEnum), FK to users/brandProfiles/contentPlans
scenes             — per-scene prompts, FK to videos
clip_requests      — one per scene, claimed by extension; queued → processing → done/failed
social_accounts    — Facebook pages linked to a user+brand
brand_profiles     — brand identity: niche, tone, visualStyle, characterType, characterSheetGcsPath
content_plans      — week plan: topics JSONB, postsPerDay, status, postType
post_schedules     — Facebook posting record per video
```

The `videoStatusEnum` state machine: `DRAFT → BRAINSTORM_PENDING → SCRIPT_PENDING → SCRIPT_READY → SCENES_PENDING → SCENES_READY → CLIPS_QUEUED → CLIPS_PROCESSING → CLIPS_NEEDS_REVIEW → ASSEMBLY_PENDING → ASSEMBLY_PROCESSING → COMPLETE | FAILED`

### Extension (`apps/extension/`)

Chrome MV3. Two scripts:
- `background/index.ts` — service worker; polls `/api/operator/queue`, spawns one Chrome tab per clip, manages tab lifecycle and retry logic
- `content/index.ts` — injected into Grok Imagine tabs; drives the UI (enters prompts, attaches character sheet image, triggers generation, monitors for video output, uploads to R2)

The extension authenticates using `OPERATOR_SECRET` header (not Clerk). Character sheet is pre-fetched as bytes in the SW and injected into each content script.

### Worker (`apps/worker/`)

Fastify app (`src/index.ts`). Called via `POST /assemble` with `{ videoId }`. Runs in Docker (`jrottenberg/ffmpeg` base image — do not run locally, Homebrew FFmpeg lacks `libass`).

Pipeline in `assemble.ts`: download clips from R2 → FFmpeg normalize → FFmpeg concat + transitions → Whisper transcription for subtitles → burn subtitles → BGM mix → upload final MP4 to R2 → update video status to `COMPLETE`.

### Web App (`apps/web/`)

Next.js App Router. All dashboard pages are under `app/(dashboard)/` with a shared layout (`AppSidebar` + `AppHeader`).

Key pages:
- `/brands` — brand list; `/brands/new` — 7-step onboarding wizard
- `/brands/[id]/character-sheet` — GPT-image-2 review + regenerate
- `/brands/[id]/plan/new` — choose cadence; `/brands/[id]/plan/[planId]` — calendar + approve
- `/brands/[id]/plan/[planId]/progress` — agentic progress view
- `/library` — video library with post schedule status
- `/channels` — connect/manage Facebook pages
- `/billing` — plan selection, Stripe checkout

`lib/api-client.ts` — typed API client factory, `useApiClient()` hook returns it bound to the current Clerk session token. `withToast()` wrapper handles errors.

`hooks/usePlanProgress.ts` — SSE hook that subscribes to `/api/content-plans/:id/progress` and tracks per-video statuses.

## Tech Stack

- **Next.js 16** / **React 19** / **TypeScript 5.9**
- **Fastify** + **Drizzle ORM** + **Neon PostgreSQL**
- **Clerk** (auth) · **Stripe** (billing) · **Resend** (email)
- **Cloudflare R2** (S3-compatible) for all asset storage
- **Claude Sonnet 4.6** (scripts, scenes, week plans, dialogue)
- **OpenAI GPT-image-2** (character sheets)
- **xAI Grok Imagine** (video clip generation via extension)
- **FFmpeg + Whisper** (assembly + subtitles, in Docker worker)
- **Turbo 2.9**, **pnpm 9** (required), Node ≥ 18

## Shared Packages

- **`@repo/types`** — single source of truth for all domain types. Import from here everywhere; never redeclare types in app code.
- **`@repo/utils`** — `slugify`, `formatDuration`, `estimateScriptDuration`, `gcsPathToFileName`, `formatRelativeDate`. Pure, no side effects.
- **`@repo/ui`** — component library. New components go in `packages/ui/src/` and must be exported from `exports` in `packages/ui/package.json`.

## Design System Tokens

Defined in `apps/web/app/globals.css`:
- Background: `--bg-base: #09090b`, `--bg-surface: #111113`, `--bg-elevated: #1a1a1e`
- Accent: `--accent-primary: #f55c2a` (orange CTA), `--accent-secondary: #4a90e2`
- Status: `--accent-success: #34D399`, `--accent-warning: #FBBF24`, `--accent-danger: #F87171`
- Text: `--text-primary: #F4F4F8`, `--text-secondary: #a1a1aa`, `--text-muted: #52525b`
- Font: Inter (UI) + JetBrains Mono (code). Base spacing unit: 4px.
