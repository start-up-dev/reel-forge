# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Documentation

Three spec files live at the repo root (not tracked in git). Read these before making non-trivial decisions:

| File | Purpose |
|------|---------|
| `PRD_ReelForge.md` | Full product requirements: architecture, tech stack, API contracts, data models, FFmpeg pipeline, monetization, browser extension spec |
| `ReelForge_UI_UX_Spec.md` | Design system (colors, typography, spacing), page-by-page UI specs for every screen and component |
| `ReelForge_MVP_Tasks.md` | Phase-by-phase task list with completion status; the source of truth for what's done and what to build next |

## Task Tracking Rule

**After completing any task or sub-task from `ReelForge_MVP_Tasks.md`, immediately update that file by changing `- [ ]` to `- [x]` for the completed item.** Do this as part of the same session — never defer it. `ReelForge_MVP_Tasks.md` is the single source of truth for build progress.

Key facts from the PRD:
- ReelForge routes video clip generation through an **operator browser extension** (Chrome MV3) that drives Grok Imagine's web UI — this avoids per-clip API costs and is central to the architecture.
- The AI pipeline: **Claude** (script) → **ElevenLabs** (voiceover) → **Grok Imagine** (base images + video clips) → **FFmpeg on Cloud Run** (assembly).
- Auth: Clerk. DB: Neon PostgreSQL + Drizzle ORM. Storage: GCS signed URLs. Email: Resend. Payments: Stripe.

## Commands

All commands should be run from the repo root unless noted.

### Development
```bash
pnpm dev          # Start all apps in dev mode (web: 3000, api: 4000)
pnpm build        # Build all apps and packages
pnpm lint         # Lint all workspaces (zero warnings allowed)
pnpm check-types  # Type-check all workspaces
pnpm format       # Format all .ts, .tsx, .md files with Prettier
```

### Filtering to a specific workspace
```bash
pnpm --filter @repo/api dev        # API only
pnpm --filter web dev              # Next.js web app only
pnpm --filter @repo/types check-types
pnpm --filter @repo/utils check-types
```

### Database (Drizzle)
```bash
# Run from apps/api or use --filter @repo/api
pnpm --filter @repo/api db:generate   # Generate migration files from schema changes
pnpm --filter @repo/api db:migrate    # Apply migrations to the DB
pnpm --filter @repo/api db:push       # Push schema directly (dev only)
pnpm --filter @repo/api db:studio     # Open Drizzle Studio
```

### UI Package
```bash
pnpm --filter @repo/ui generate:component   # Scaffold a new React component via Turbo generator
```

## Architecture

```
apps/
  web/       # Next.js 16 app (port 3000) — user-facing product
  api/       # Fastify API (port 4000) — all backend routes
  docs/      # Next.js docs app (port 3001)
  worker/    # FFmpeg assembly worker (Cloud Run) — Phase 9
  extension/ # Chrome MV3 operator extension — Phase 8
packages/
  types/            # @repo/types — domain interfaces and enums
  utils/            # @repo/utils — shared pure utility functions
  ui/               # @repo/ui — shared React component library
  eslint-config/    # @repo/eslint-config — shared ESLint configs
  typescript-config/ # @repo/typescript-config — shared TS configs
```

### Shared Packages

- **`@repo/types`** — single source of truth for all domain types: `User`, `Project`, `Video`, `Scene`, `ClipRequest`, plus all enums (`VideoStatus`, `PlanType`, `Platform`, etc.) and API response shapes. Import from here everywhere.
- **`@repo/utils`** — `slugify`, `formatDuration`, `estimateScriptDuration`, `gcsPathToFileName`, `formatRelativeDate`. Pure functions, no dependencies.
- **`@repo/ui`** — component library. New components go in `packages/ui/src/` and must be exported from `exports` in `packages/ui/package.json`.
- **`@repo/eslint-config`** — `./base`, `./next-js`, `./react-internal`. Apps use `next-js`; the UI package uses `react-internal`.
- **`@repo/typescript-config`** — `base.json`, `nextjs.json`, `react-library.json`. Apps extend `nextjs.json`; UI package extends `react-library.json`; API/worker/utils/types extend `base.json`.

### Database Schema (`apps/api/lib/db/schema.ts`)

Five tables: `users`, `projects`, `videos`, `scenes`, `clip_requests`. All use UUID primary keys. Inferred Drizzle row types (`UserRow`, `VideoRow`, etc.) are exported from the schema file. `drizzle.config.ts` reads `DATABASE_URL` from env.

### Turborepo Task Graph

Tasks are defined in `turbo.json`:
- `build` depends on upstream builds (`^build`); caches `.next/**` outputs.
- `lint` and `check-types` depend on upstream equivalents.
- `dev` is persistent and never cached.
- `.env*` files are included as build inputs.

### Tech Stack

- **Next.js 16** / **React 19** / **TypeScript 5.9**
- **Fastify** (API) + **Drizzle ORM** + **Neon PostgreSQL**
- **Clerk** (auth) · **Stripe** (billing) · **Resend** (email)
- **GCS** signed URLs for all asset storage
- **Claude Sonnet 4.6** · **ElevenLabs Multilingual v3** · **xAI Grok Imagine**
- **Turbo 2.9**, **pnpm 9** (required), Node ≥ 18

### Design System

Defined in `ReelForge_UI_UX_Spec.md`. Key tokens for `globals.css`:
- Background: `--bg-base: #09090b`, `--bg-surface: #111113`, `--bg-elevated: #1a1a1e`
- Accent: `--accent-primary: #f55c2a` (orange CTA), `--accent-secondary: #4a90e2`
- Status: `--accent-success: #34D399`, `--accent-warning: #FBBF24`, `--accent-danger: #F87171`
- Text: `--text-primary: #F4F4F8`, `--text-secondary: #a1a1aa`, `--text-muted: #52525b`
- Font: Inter (UI) + JetBrains Mono (code). Base spacing unit: 4px.
