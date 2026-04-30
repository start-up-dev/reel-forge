# ReelForge — Feature Enhancement Tasks

**Version:** 2.0  
**Date:** April 29, 2026  
**Depends on:** MVP phases 1–9 + FEATURE_SPEC_v3.md tracks 1–6 complete

One feature track. Self-contained — no dependencies on any v3 track.

---

## Track 7 — Live Clip Generation Progress

### Overview

Right now users submit a video and see nothing until all clips are assembled. This track adds two things: (1) a live progress panel that shows which clips are currently generating and which are done, and (2) each completed clip appears as a preview the moment it lands in GCS — so users watch their video build scene by scene in real time.

The mechanism is **Server-Sent Events (SSE)**. The Fastify API maintains an in-memory subscriber map keyed by `videoId`. The operator routes emit events whenever a clip transitions state (queued → processing → done/failed). The frontend connects to a Clerk-authenticated SSE endpoint and re-renders the progress panel on each event.

No new database tables. No WebSocket infrastructure. No Redis. Single Fastify instance is sufficient for MVP — the in-memory bus works fine.

---

### 7.0 — Add `sceneCount` to Videos

`ClipProgressPanel` needs the total number of scenes to render the full grid (including `queued` cards for scenes not yet claimed). This field does not currently exist.

- [ ] Add `sceneCount` integer column (not null, default `0`) to the `videos` table in `apps/api/lib/db/schema.ts`
- [ ] Generate migration `0011_scene_count.sql` and add to journal
- [ ] Add `sceneCount: number` to the `Video` interface in `packages/types/src/index.ts`
- [ ] In `POST /api/videos/:id/scenes` (the endpoint that creates scene rows), after inserting scenes set `videos.sceneCount = <count of inserted scenes>` in the same transaction
- [ ] `sceneCount` is returned automatically via `SELECT *` on existing video fetch routes — no other API changes needed

---

### 7.1 — Shared Types

- [ ] Add `ClipProgressEvent` discriminated union to `packages/types/src/index.ts`:
  - `{ type: "CLIP_PROCESSING"; videoId: string; sceneIndex: number }`
  - `{ type: "CLIP_DONE"; videoId: string; sceneIndex: number; clipUrl: string }` — `clipUrl` is a signed GCS read URL (1-hour TTL)
  - `{ type: "CLIP_FAILED"; videoId: string; sceneIndex: number; error: string }`
  - `{ type: "HEARTBEAT" }` — keepalive ping sent every 15 s; client ignores it
  - `{ type: "SNAPSHOT"; clips: SnapshotClip[] }` — initial state burst sent on connect so a refreshed page catches up immediately
- [ ] Add `SnapshotClip` interface to `@repo/types`:
  - `{ sceneIndex: number; status: "queued" | "processing" | "done" | "failed"; clipUrl?: string; error?: string }`
- [ ] Add `ClipStatusMap` type alias to `@repo/types`:
  - `Record<number, SnapshotClip>` — keyed by `sceneIndex`; used as the hook's state shape

---

### 7.2 — Backend: In-Memory Event Bus

- [ ] Create `apps/api/lib/clip-events.ts`:
  - Export `type ClipEventSubscriber = (event: ClipProgressEvent) => void`
  - Export singleton `clipEventBus`: `Map<string, Set<ClipEventSubscriber>>` (videoId → subscriber set)
  - Export `subscribeToVideo(videoId: string, cb: ClipEventSubscriber): () => void` — adds `cb` to the set, returns an unsubscribe function that deletes it and cleans up the empty set entry
  - Export `emitClipEvent(event: ClipProgressEvent): void` — fans out to all subscribers for `event.videoId`; no-ops if no subscribers (heartbeat type has no videoId — skip fan-out)
  - No external dependencies — pure in-memory singleton; safe to import anywhere in the API

---

### 7.3 — Backend: SSE Endpoint

- [ ] Add `GET /api/videos/:id/progress` route to `apps/api/routes/videos.ts` (Clerk-auth-gated, same auth middleware as other video routes):
  - Verify the requesting user owns the video (existing ownership check pattern); return `403` if not
  - Set response headers on `reply.raw`:
    - `Content-Type: text/event-stream`
    - `Cache-Control: no-cache`
    - `Connection: keep-alive`
    - `X-Accel-Buffering: no` (disables Nginx proxy buffering)
  - Call `reply.hijack()` so Fastify does not auto-close the response
  - **Initial snapshot**: query `clip_requests` for all clips belonging to this video; for `done` clips call `generateSignedReadUrl` (existing helper in `apps/api/lib/storage.ts`); serialize as a single `SNAPSHOT` event and write to `reply.raw`
  - Subscribe via `subscribeToVideo(videoId, cb)` where `cb` serializes each event as `data: <JSON>\n\n` and writes to `reply.raw`
  - Start a `setInterval` heartbeat every 15 s writing `data: {"type":"HEARTBEAT"}\n\n`
  - On `request.raw.on("close", ...)`: call the unsubscribe function, clear the heartbeat interval, end `reply.raw`
- [ ] SSE wire format: each event is written as `data: ${JSON.stringify(event)}\n\n` (standard SSE, no `event:` field needed — client uses `type` inside the JSON)

---

### 7.4 — Backend: Emit on State Changes

All three emission points are in `apps/api/routes/operator.ts`.

- [ ] In `GET /api/operator/queue` (the claim endpoint), after the `UPDATE … RETURNING` CTE runs and clips transition to `processing`:
  - For each claimed clip, call `emitClipEvent({ type: "CLIP_PROCESSING", videoId: row.videoId, sceneIndex: row.sceneIndex })`
- [ ] In `POST /api/operator/clips/:id/complete`:
  - After updating the clip and scene rows, call `generateSignedReadUrl` for the `gcsPath` (1-hour TTL)
  - Call `emitClipEvent({ type: "CLIP_DONE", videoId: clip.videoId, sceneIndex: clip.sceneIndex, clipUrl: signedUrl })`
- [ ] In `POST /api/operator/clips/:id/fail`:
  - Call `emitClipEvent({ type: "CLIP_FAILED", videoId: clip.videoId, sceneIndex: clip.sceneIndex, error: body.error })`
- [ ] Import `emitClipEvent` and `generateSignedReadUrl` at the top of `operator.ts`; no other changes to route logic

---

### 7.5 — Frontend: SSE Hook

- [ ] Create `apps/web/hooks/useClipProgress.ts`:
  - Signature: `useClipProgress(videoId: string | null): { clips: ClipStatusMap; connected: boolean }`
  - Returns empty map and `connected: false` immediately when `videoId` is null (video not yet created)
  - Uses Clerk `useAuth()` to call `getToken()` before opening the stream
  - Opens the stream via `fetch` (not `EventSource`) so the `Authorization: Bearer <token>` header can be sent — `EventSource` does not support custom headers
  - Reads the response body as a `ReadableStream`, splits on `\n\n`, parses `data:` lines as JSON into `ClipProgressEvent`
  - On `SNAPSHOT`: replaces the entire `clips` state with the snapshot array converted to `ClipStatusMap`
  - On `CLIP_PROCESSING`: upserts `{ status: "processing" }` for that `sceneIndex`
  - On `CLIP_DONE`: upserts `{ status: "done", clipUrl }` for that `sceneIndex`
  - On `CLIP_FAILED`: upserts `{ status: "failed", error }` for that `sceneIndex`
  - On `HEARTBEAT`: no state change — only used to keep the TCP connection alive
  - Reconnects automatically on stream error/close with exponential backoff (1 s, 2 s, 4 s, cap 30 s)
  - Stops reconnecting when `videoId` becomes null or component unmounts (cleanup in `useEffect` return)
  - Sets `connected: true` once first byte arrives; `false` on error/disconnect

---

### 7.6 — Frontend: ClipProgressPanel Component

- [ ] Create `apps/web/components/wizard/ClipProgressPanel.tsx`:
  - Props: `{ totalScenes: number; clips: ClipStatusMap; connected: boolean }`
  - **Header bar**: "Generating clips" label + `connected` dot (green pulse when connected, grey when reconnecting) + fraction counter "X / N complete"
  - **Progress bar**: filled width = `doneCount / totalScenes * 100%`; uses `--accent-primary` fill color; animated with CSS transition
  - **Scene grid**: one card per scene index (0 → totalScenes-1), rendered in order:
    - `queued`: muted grey card, scene number, "Queued" badge
    - `processing`: card with animated border pulse (CSS `@keyframes`), "Generating…" badge in `--accent-warning`
    - `done`: card shows `<video src={clipUrl} autoPlay muted loop playsInline>` at thumbnail size (16:9 aspect ratio, `object-fit: cover`); green "Done" badge; no controls
    - `failed`: red border, error message truncated to one line, "Failed" badge in `--accent-danger`
  - Component is purely presentational — no data fetching; all state comes from props
  - Renders nothing (`null`) when `totalScenes === 0`

---

### 7.7 — Frontend: Wire into Wizard

- [ ] In the Step 4 (clip queue / review) page component in `apps/web/app/(wizard)/`:
  - Import `useClipProgress` and `ClipProgressPanel`
  - Call `useClipProgress(video.id)` when `video.status` is `CLIPS_QUEUED` or `CLIPS_PROCESSING`; pass `null` otherwise (hook stays idle, no open connections)
  - Render `<ClipProgressPanel totalScenes={video.sceneCount} clips={clips} connected={connected} />` in place of (or above) the current static "Processing…" placeholder — `video.sceneCount` is the value added in task 7.0
  - When all clips reach `done` status in the local `ClipStatusMap`, show a "All clips ready — assembling…" banner and stop rendering the panel grid (replace with a single assembly spinner)
  - Disconnect from SSE automatically when `video.status` advances past `CLIPS_PROCESSING` (pass `null` to the hook)

---

### 7.8 — CORS for SSE

The frontend calls the Fastify API directly at `NEXT_PUBLIC_API_URL` (there is no Next.js → Fastify proxy layer — `proxy.ts` is Clerk middleware, not a reverse proxy). Because the browser opens a long-lived `fetch` stream to a different origin, Fastify's CORS config must explicitly allow it.

- [ ] In `apps/api/server.ts`, verify the `@fastify/cors` `origin` config includes the web app origin (e.g. `http://localhost:3000` in dev, the production domain in prod)
- [ ] Ensure `@fastify/cors` does **not** set `Access-Control-Allow-Origin: *` — credentialed requests (Authorization header) require a specific origin, not wildcard
- [ ] Verify `Access-Control-Expose-Headers` is not restricting `Content-Type` — SSE relies on the browser reading `Content-Type: text/event-stream` from the response
- [ ] No timeout changes needed — browser `fetch` streams have no built-in timeout; the server heartbeat (every 15 s) keeps the TCP connection alive through idle-connection-killing proxies or CDNs

---

## Track 8 — Robust Clip Retry

### Overview

Two bugs exist in the current retry flow. First, when the extension's manual "Retry" button is clicked, the clip is already in `failed` state in the DB (auto-retries are exhausted before the button appears). The extension opens a new tab but the `upload-url` and `complete` endpoints both require `status = 'processing'` — they return 404 and the retry immediately fails again. Second, when all clips for a video have failed, the video is hard-set to `FAILED` and visible to the user as broken. Users should never see a hard failure — all recovery is handled by the operator (admin), not surfaced as an error state.

---

### 8.1 — New VideoStatus: CLIPS_NEEDS_REVIEW

- [ ] Add `ClipsNeedsReview = "CLIPS_NEEDS_REVIEW"` to the `VideoStatus` enum in `packages/types/src/index.ts`
- [ ] Add `"CLIPS_NEEDS_REVIEW"` to the `status` column check constraint (or enum type) in `apps/api/lib/db/schema.ts`
- [ ] Generate migration `0012_clips_needs_review.sql` and add to the Drizzle journal — note: `0010` and `0011` are already taken (`0010_expanded_enums.sql`, `0011_scene_count.sql` from task 7.0)
- [ ] In `POST /api/operator/clips/:id/fail` (operator.ts): change the `pending === 0` branch so the video transitions to `"CLIPS_NEEDS_REVIEW"` instead of `"FAILED"`. The exact `NOT IN` guard stays the same to avoid overwriting `COMPLETE` / `ASSEMBLY_PENDING` / `ASSEMBLY_PROCESSING`.
- [ ] `"FAILED"` is no longer set automatically anywhere — it can only be set by the admin confirmation endpoint (8.2 below)

---

### 8.2 — Admin: Confirm Failure Endpoint

- [ ] Add `POST /api/admin/videos/:id/confirm-fail` to a new `apps/api/routes/admin.ts` (operator-secret-gated):
  - Accepts videos in `CLIPS_NEEDS_REVIEW` state only; returns `400` for any other state
  - Sets `status = 'FAILED'` and optionally accepts a `{ reason: string }` body to store in `videos.error`
  - This is the **only** code path that sets `FAILED` going forward
- [ ] Register `adminRoutes` in `apps/api/server.ts` (same pattern as other route registrations)

---

### 8.3 — New Retry Endpoint

- [ ] Add `POST /api/operator/clips/:id/retry` to `apps/api/routes/operator.ts` (operator-secret-gated):
  - Fetches the clip; returns `404` if not found, `409` if status is not `failed`
  - Atomically resets the clip row: `status → 'processing'`, `error → null`, `claimed_at → NOW()`, `processed_at → null`, `clip_url → null`
  - Sets clip to `processing` (not `queued`) because the extension opens a tab immediately — this avoids a race where the normal queue worker also claims the same clip
  - Resets the parent video status:
    - If video is currently `FAILED` or `CLIPS_NEEDS_REVIEW`: set to `CLIPS_PROCESSING`
    - If video is `CLIPS_PROCESSING` (other clips still in flight): leave unchanged
    - If video is `CLIPS_QUEUED`: set to `CLIPS_PROCESSING`
    - If video is `COMPLETE` / `ASSEMBLY_PENDING` / `ASSEMBLY_PROCESSING`: leave unchanged (should not retry in these states)
  - Returns `{ data: { ok: true, sceneIndex: number, videoId: string } }`

---

### 8.4 — Extension: API Client

- [ ] Add `retryClip(clipId: string): Promise<{ sceneIndex: number; videoId: string }>` to `apps/extension/src/lib/api-client.ts`:
  - `POST /api/operator/clips/${clipId}/retry` via the shared `request()` helper
  - Throws on non-2xx (the caller handles the error)

---

### 8.5 — Extension: RETRY_CLIP Handler

- [ ] In `apps/extension/src/background/index.ts`, rewrite the `RETRY_CLIP` case:
  1. Find the entry in `failedClips` (same as before)
  2. If not found, log and no-op
  3. **Before** opening a tab: call `retryClip(entry.clipId)` and `await` it
  4. If `retryClip` throws: push the entry back into `failedClips` with the new error message (`"Backend retry reset failed: <err>"`) and call `broadcastState()` — do not open a tab
  5. If `retryClip` succeeds: splice entry from `failedClips`, reset `clipRetryCount`, call `openClipTab` as before
- [ ] Import `retryClip` from `api-client.ts`
- [ ] The `sendResponse({ ok: true })` call moves to after the async work completes so the popup can detect failure. Because `chrome.runtime.onMessage` requires a synchronous `return true` to keep the channel open for async response, restructure with `return true` at the bottom and call `sendResponse` inside the async chain.

---

### 8.6 — Frontend: CLIPS_NEEDS_REVIEW Display

- [ ] In the wizard and dashboard, map `VideoStatus.ClipsNeedsReview` to a **yellow "Under Review"** badge — not red, not an error state
- [ ] Tooltip text: "A few clips need attention — we're on it. No action needed from you."
- [ ] Do not show a "retry" or "contact support" CTA — this status is fully operator-managed
- [ ] The `ClipProgressPanel` (Track 7) continues to display with the per-clip failed cards visible so the operator (who is also watching the SSE stream in the popup) can see exactly which scenes failed

---

## Track 9 — Extension Clip Status Board & Persistent State

### Overview

The extension's `failedClips` array and session counters live entirely in service-worker memory. Chrome terminates the service worker after ~30 seconds of inactivity, wiping all state. After a restart the operator has no visibility into which clips succeeded or failed across the current batch. This track adds (1) a backend endpoint that returns authoritative clip status for all active videos, (2) persistence of that state to `chrome.storage.local` so it survives restarts, and (3) a **Clip Status Board** section in the extension popup that shows every clip grouped by video — with inline retry buttons — so the operator never has to touch the database.

---

### 9.0 — Add `videoTitle` to Operator Queue Response

`StoredClipStatus` (9.2) needs `videoTitle` to label clips by video in the popup. The extension only knows the title at claim time — it is not available on real-time events. This must be added to the queue response so it can be cached when the clip is first claimed.

- [ ] In `GET /api/operator/queue` (operator.ts): extend the CTE `SELECT` to include `v.title AS "videoTitle"` from the already-joined `videos` table
- [ ] Add `videoTitle: string` to the `ClaimedClip` interface in `apps/extension/src/lib/api-client.ts`
- [ ] Add `videoTitle: string` to `TabEntry` and `FailedClipEntry` in `apps/extension/src/lib/messages.ts` so the value survives through the tab lifecycle and retry paths
- [ ] In `sendClipToTab` and the retry path in `background/index.ts`: propagate `videoTitle` alongside the other clip fields

---

### 9.1 — New Endpoint: Active Clip Statuses

- [ ] Add `GET /api/operator/clips/statuses` to `apps/api/routes/operator.ts` (operator-secret-gated):
  - Joins `clip_requests` → `videos` → `scenes` (for `textExcerpt`) for all videos NOT in `COMPLETE`, `DRAFT`, `FAILED` states
  - Returns:
    ```
    {
      data: {
        videoId: string;
        videoTitle: string;        // videos.title
        sceneIndex: number;
        clipId: string;
        status: "queued" | "processing" | "done" | "failed";
        motionPrompt: string;
        error: string | null;
        processedAt: string | null; // ISO timestamp
      }[]
    }
    ```
  - Ordered by `videoId ASC, sceneIndex ASC`
  - No pagination needed for MVP (operator works one video at a time)

---

### 9.2 — Extension: Persistent Clip Status Storage

- [ ] Define `StoredClipStatus` interface in `apps/extension/src/lib/messages.ts`:
  ```
  {
    clipId: string;
    videoId: string;
    videoTitle: string;
    sceneIndex: number;
    motionPrompt: string;
    status: "queued" | "processing" | "done" | "failed";
    error: string | null;
    updatedAt: number; // Date.now()
  }
  ```
- [ ] Define `StoredClipStatusMap = Record<clipId, StoredClipStatus>` type alias
- [ ] Add `clipStatuses: StoredClipStatusMap` to `WorkerState` so the popup always has the latest snapshot

**In `apps/extension/src/background/index.ts`:**

- [ ] Add module-level `const clipStatuses: StoredClipStatusMap = {}` — loaded from storage on init
- [ ] On service-worker startup (module top-level): call `chrome.storage.local.get("clipStatuses")` and populate the in-memory map from the stored value; then broadcast state
- [ ] Add helper `saveClipStatus(entry: StoredClipStatus): void` — updates in-memory map AND calls `chrome.storage.local.set({ clipStatuses })` (fire-and-forget)
- [ ] In the `CLIP_DONE` handler: call `saveClipStatus` with `status: "done"`
- [ ] In the `CLIP_FAILED` / `handleTabError` path (when `failClip` is called): call `saveClipStatus` with `status: "failed"` and the error string
- [ ] In `openClipTab` (when a tab entry is created): call `saveClipStatus` with `status: "processing"` — this covers both fresh claims and retried clips
- [ ] In `RETRY_CLIP` handler (after successful `retryClip` API call): call `saveClipStatus` with `status: "processing"` and `error: null` before opening the tab
- [ ] On `CLIP_DONE` in the content-script message handler: additionally call `saveClipStatus` with `status: "done"`
- [ ] Stale entry pruning: add `pruneOldClipStatuses()` called once on startup — removes entries where `updatedAt` is older than 7 days to prevent `chrome.storage.local` bloat

**Fetching from API on startup:**

- [ ] After health check succeeds in `start()`: call `GET /api/operator/clips/statuses` and merge results into `clipStatuses` (API is authoritative; local entry wins only if `updatedAt` is newer than `processedAt` from the API — handles offline edits)
- [ ] Add `fetchClipStatuses(): Promise<void>` to `api-client.ts` that calls the new endpoint
- [ ] On merge: for each API entry, upsert into `clipStatuses` map and persist to storage

---

### 9.3 — Extension Popup: Clip Status Board

- [ ] Add a **"Clips"** tab (or collapsible section below the session stats) to the popup UI in `apps/extension/src/popup/`:
  - Reads `workerState.clipStatuses` (available via `GET_STATE` / `STATE_UPDATE`)
  - Groups entries by `videoId` → `videoTitle` as section headers
  - Within each video: renders a table row per clip:
    - Column 1: Scene # (1-indexed for display: `sceneIndex + 1`)
    - Column 2: Motion prompt truncated to 40 chars
    - Column 3: Status badge (`queued` grey, `processing` yellow pulse, `done` green, `failed` red)
    - Column 4: Error snippet (one line, only visible when `status === "failed"`)
    - Column 5: "Retry" button — only shown when `status === "failed"`; clicking sends `RETRY_CLIP` message to SW
  - Empty state: "No active clips" when map is empty
  - Section is scrollable if many clips (max-height + overflow-y scroll)
- [ ] The "Retry" button in the popup calls `chrome.runtime.sendMessage({ type: "RETRY_CLIP", clipId })` and immediately shows a spinner on that row until the next `STATE_UPDATE` arrives
- [ ] `failedClips` array in `WorkerState` (the old session-scoped list) is kept as-is for backward compatibility but the Clip Status Board replaces it as the primary UI surface — the old "Failed clips" section in the popup can be removed or collapsed

---

## Implementation Order

```
Day 1
  7.0 — sceneCount schema + migration 0011 (unblocks 7.6, 7.7)
  7.1 — Shared types (unblocks SSE hook and panel)
  7.2 — Event bus (pure lib, no routes)
  8.1 — CLIPS_NEEDS_REVIEW schema + migration 0012 + types

Day 2
  7.3 — SSE endpoint
  7.4 — Emit on state changes in operator routes
  7.8 — CORS verification (quick check, do alongside 7.3)
  8.3 — Retry endpoint
  8.2 — Admin confirm-fail endpoint

Day 3
  7.5 — Frontend SSE hook
  7.6 — ClipProgressPanel component
  8.4 + 8.5 — Extension: retryClip API client + RETRY_CLIP handler fix
  8.6 — Frontend: CLIPS_NEEDS_REVIEW display

Day 4
  9.0 — videoTitle in queue response + ClaimedClip + TabEntry (unblocks 9.2)
  9.1 — GET /api/operator/clips/statuses endpoint
  9.2 — Extension: persistent clip status storage

Day 5
  9.3 — Extension popup: Clip Status Board
  7.7 — Wire SSE into wizard step
  End-to-end: run extension, cause a clip to fail, verify retry works, verify user sees "Under Review" not "Failed"
```

---

## Acceptance Criteria

| Task | Done when |
|------|-----------|
| 7.0 sceneCount | `videos.scene_count` column exists in DB; `Video.sceneCount` in types; `POST /videos/:id/scenes` writes the correct count |
| 7.1 Types | `ClipProgressEvent`, `SnapshotClip`, `ClipStatusMap` exported from `@repo/types`; `pnpm check-types` passes |
| 7.2 Event bus | `subscribeToVideo` / `emitClipEvent` importable; subscribing then emitting calls the callback synchronously |
| 7.3 SSE endpoint | `curl -N -H "Authorization: Bearer <token>" /api/videos/:id/progress` streams events; heartbeat appears every 15 s; closing the curl kills the subscription cleanly |
| 7.4 Emit | Completing a clip via `POST /api/operator/clips/:id/complete` triggers a `CLIP_DONE` event on any open SSE stream for that video within 100 ms |
| 7.5 Hook | On page refresh during active generation, the hook receives the SNAPSHOT and immediately renders current state without waiting for the next event |
| 7.6 Panel | `done` cards show an autoplaying looping video preview; `processing` cards pulse; progress bar advances in real time |
| 7.7 Wizard | Panel is visible during `CLIPS_PROCESSING`; disappears and shows assembly spinner once all clips are done; no SSE connection open when video is in any other status |
| 7.8 Proxy | Long-running SSE connections survive through the Next.js dev proxy without being cut at 30 s |
| 8.1 Schema | `pnpm --filter @repo/api db:migrate` runs cleanly; `VideoStatus.ClipsNeedsReview` usable in TypeScript |
| 8.2 Admin endpoint | `POST /api/admin/videos/:id/confirm-fail` moves video from `CLIPS_NEEDS_REVIEW` → `FAILED`; returns `400` for any other current status |
| 8.3 Retry endpoint | `POST /api/operator/clips/:id/retry` on a `failed` clip resets it to `processing` and resets the video to `CLIPS_PROCESSING`; returns `409` if clip is not in `failed` state |
| 8.4–8.5 Extension retry | Clicking Retry in the popup on a failed clip calls the backend reset, then opens a new Grok tab; the clip completes and is marked `done` without touching the DB manually |
| 8.6 Frontend | `CLIPS_NEEDS_REVIEW` status renders as yellow "Under Review" badge in wizard and dashboard; no error CTA shown to user |
| 9.0 videoTitle | `GET /api/operator/queue` response includes `videoTitle`; `ClaimedClip` and `TabEntry` carry it through the full lifecycle |
| 9.1 Statuses endpoint | `GET /api/operator/clips/statuses` returns correct status for all clips across all active videos |
| 9.2 Persistence | After Chrome closes and reopens, the extension popup shows the correct last-known status for every clip without needing the API |
| 9.3 Status Board | Popup shows clips grouped by video; failed clips have a working Retry button; the board reflects fresh API data within 5 s of opening the popup |
