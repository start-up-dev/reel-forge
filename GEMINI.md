# ReelForge — Gemini Instructional Context

ReelForge is an AI-powered short-form video generation platform (TikTok/Reels/Shorts) that orchestrates a multi-AI pipeline involving script generation, voiceover, image/video generation, and automated assembly.

## 📄 Core Project Documentation

The following files are foundational to the project. Read them before making significant architectural or design decisions:

| File | Purpose |
|------|---------|
| `PRD_ReelForge.md` | **Product Requirements:** Architecture, tech stack, API contracts, data models, FFmpeg pipeline, and monetization. |
| `ReelForge_UI_UX_Spec.md` | **Design Specification:** Color palette, typography, spacing, component specs, and page-by-page UI/UX behavior. |
| `ReelForge_MVP_Tasks.md` | **Task Tracking:** Phase-by-phase task list. **MUST** be updated immediately upon task completion. |
| `FEATURE_SPEC_v2.md` | **Latest Spec:** Implementation details for recent UI/UX and API updates (Video length pills, voice selection on Step 1, etc.). |

---

## 🏗️ System Architecture & Tech Stack

### High-Level Architecture
- **Backend (`apps/api`):** Node.js / Fastify. Handles REST API, SSE status streams, and job dispatching.
- **Frontend (`apps/web`):** Next.js 16.1 (App Router) / React 19. User-facing dashboard and creation wizard.
- **Worker (`apps/worker`):** FFmpeg-based video assembler running on GCP Cloud Run.
- **Extension (`apps/extension`):** Chrome Manifest V3. Automates Grok Imagine UI for cost-free video clip generation.
- **Database:** Neon PostgreSQL + Drizzle ORM (Relational model).
- **Auth:** Clerk (Social + Email/Password).
- **Storage:** GCP Cloud Storage (GCS) using signed URLs for security.
- **Job Queue:** GCP Cloud Tasks for reliable async processing.

### AI Pipeline Stages
1.  **Script:** Anthropic Claude Sonnet 4.6 (routed via Skills API).
2.  **Voiceover:** ElevenLabs Multilingual v3 (generating word-level timestamps for subtitles).
3.  **Images:** xAI Grok Imagine Image API (generates high-quality base images).
4.  **Clips:** Grok Imagine Video (automated via the operator browser extension).
5.  **Assembly:** FFmpeg (normalizing clips, mixing BGM with ducking, burning ASS subtitles).

---

## 🛠️ Building and Running

### Prerequisites
- Node.js >= 18
- pnpm 9.x
- Docker (for worker/api local testing)

### Key Commands
- **Install:** `pnpm install`
- **Development:** `pnpm dev` (Runs all workspaces via Turbo)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint` (Zero warnings allowed)
- **Check Types:** `pnpm check-types`
- **Test:** `pnpm --filter @repo/api test` (Vitest integration suite)

### Database (Drizzle)
- **Generate:** `pnpm --filter @repo/api db:generate`
- **Migrate:** `pnpm --filter @repo/api db:migrate`
- **Studio:** `pnpm --filter @repo/api db:studio`

---

## 🎨 Design System (ReelForge UI/UX Spec)

Follow these CSS tokens (defined in `globals.css`) for all UI work:

- **Backgrounds:** `--bg-base: #09090b`, `--bg-surface: #111113`, `--bg-elevated: #1a1a1e`
- **Accents:** `--accent-primary: #f55c2a` (Orange CTA), `--accent-secondary: #4a90e2`
- **Status:** `--accent-success: #34D399`, `--accent-warning: #FBBF24`, `--accent-danger: #F87171`
- **Text:** `--text-primary: #F4F4F8`, `--text-secondary: #a1a1aa`, `--text-muted: #52525b`
- **Typography:** Inter (UI), JetBrains Mono (Code). Base spacing: 4px.

---

## 🚦 Development Conventions

### Task Tracking Rule
**MANDATORY:** After completing any task or sub-task from `ReelForge_MVP_Tasks.md`, immediately update that file by changing `- [ ]` to `- [x]`. This is the project's single source of truth.

### Coding Standards
- **TypeScript:** Strict typing is required. Shared interfaces and enums live in `packages/types`.
- **API Layers:** Routes -> Services -> Lib/DB. Use Zod for all request/response validation.
- **Next.js Patterns:** Prefer Server Components for data fetching. Use Client Components ('use client') for interactivity. Use `shadcn/ui` components from `@repo/ui`.
- **SSE Status:** Real-time video updates are delivered via `/api/videos/:id/status-stream`.

### Asset Management
- All media assets are stored in GCS under `videos/{videoId}/...`
- Access via short-lived (15 min) or long-lived (7 day) signed URLs.
- Intermediate assets are purged after successful assembly.

### Video Status State Machine
`DRAFT` -> `BRAINSTORM_PENDING` -> `SCRIPT_READY` -> `VOICE_READY` -> `SCENES_READY` -> `CLIPS_QUEUED` -> `CLIPS_PROCESSING` -> `ASSEMBLY_PENDING` -> `ASSEMBLY_PROCESSING` -> `COMPLETE` | `FAILED`.

### Operator Queue Logic
The browser extension claims clip requests using `FOR UPDATE SKIP LOCKED` for atomic, race-condition-free processing. Stuck processing rows are reset after 10 minutes.
