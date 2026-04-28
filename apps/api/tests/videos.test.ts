/**
 * Integration tests for Video CRUD routes.
 *
 * The DB module is mocked — no live database required.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, MOCK_USER } from "./helpers/build-app.js";
import { videosRoutes } from "../routes/videos.js";

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("../lib/db/index.js", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_PROJECT = {
  id: "proj-uuid-001",
  userId: MOCK_USER.id,
  deletedAt: null,
};

const SAMPLE_VIDEO = {
  id: "video-uuid-001",
  userId: MOCK_USER.id,
  projectId: SAMPLE_PROJECT.id,
  title: "My First Video",
  status: "DRAFT",
  idea: null,
  script: null,
  audioUrl: null,
  wordTimestampsUrl: null,
  durationSeconds: null,
  subtitleStyle: "bold_pop",
  bgmEnabled: false,
  bgmAssetId: null,
  bgmVolume: 0.3,
  outputUrl: null,
  error: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function drizzleChain(value: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "where", "orderBy", "limit", "offset", "returning", "set",
    "values", "onConflictDoUpdate",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(value).then(res),
  });
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Video routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
    await app.register(videosRoutes, { prefix: "/api" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ── GET /api/projects/:id/videos ─────────────────────────────────────────

  describe("GET /api/projects/:id/videos", () => {
    it("returns paginated video list for a valid project", async () => {
      mockSelect
        .mockReturnValueOnce(drizzleChain([SAMPLE_PROJECT]))  // project ownership check
        .mockReturnValueOnce(drizzleChain([SAMPLE_VIDEO]))    // video rows
        .mockReturnValueOnce(drizzleChain([{ count: 1 }]));   // total count

      const res = await app.inject({
        method: "GET",
        url: `/api/projects/${SAMPLE_PROJECT.id}/videos`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: typeof SAMPLE_VIDEO[];
        total: number;
        hasMore: boolean;
      }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.hasMore).toBe(false);
    });

    it("returns 404 when the project is not found or not owned", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "GET",
        url: "/api/projects/nonexistent/videos",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /api/projects/:id/videos ────────────────────────────────────────

  describe("POST /api/projects/:id/videos", () => {
    it("returns 402 when the user has not paid the trial fee", async () => {
      // MOCK_USER has trialPaid: false and plan: "none" → quota check fails
      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({
        method: "POST",
        url: `/api/projects/${SAMPLE_PROJECT.id}/videos`,
        payload: { title: "My Video" },
      });

      expect(res.statusCode).toBe(402);
      const body = res.json<{ error: { redirect: string } }>();
      expect(body.error.redirect).toBe("trial_checkout");
    });

    it("creates a video when the user has a paid trial", async () => {
      // Override user to have trialPaid: true, trialVideoRemaining: 1
      await app.close();
      app = await buildTestApp({ trialPaid: true, trialVideoRemaining: 1 });
      await app.register(videosRoutes, { prefix: "/api" });
      await app.ready();

      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));
      mockInsert.mockReturnValue(drizzleChain([SAMPLE_VIDEO]));

      const res = await app.inject({
        method: "POST",
        url: `/api/projects/${SAMPLE_PROJECT.id}/videos`,
        payload: { title: "My First Video" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json<{ data: typeof SAMPLE_VIDEO }>().data.title).toBe("My First Video");
    });

    it("returns 402 when trial video has been used up", async () => {
      await app.close();
      app = await buildTestApp({ trialPaid: true, trialVideoRemaining: 0 });
      await app.register(videosRoutes, { prefix: "/api" });
      await app.ready();

      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({
        method: "POST",
        url: `/api/projects/${SAMPLE_PROJECT.id}/videos`,
        payload: { title: "Another Video" },
      });

      expect(res.statusCode).toBe(402);
      const body = res.json<{ error: { redirect: string } }>();
      expect(body.error.redirect).toBe("billing");
    });

    it("returns 400 when title is missing", async () => {
      await app.close();
      app = await buildTestApp({ trialPaid: true, trialVideoRemaining: 1 });
      await app.register(videosRoutes, { prefix: "/api" });
      await app.ready();

      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({
        method: "POST",
        url: `/api/projects/${SAMPLE_PROJECT.id}/videos`,
        payload: { title: "" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /api/videos/:id ──────────────────────────────────────────────────

  describe("GET /api/videos/:id", () => {
    it("returns the video with its scenes and clip requests", async () => {
      mockSelect
        .mockReturnValueOnce(drizzleChain([SAMPLE_VIDEO])) // video
        .mockReturnValueOnce(drizzleChain([]))              // scenes
        .mockReturnValueOnce(drizzleChain([]));             // clipRequests

      const res = await app.inject({
        method: "GET",
        url: `/api/videos/${SAMPLE_VIDEO.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: typeof SAMPLE_VIDEO & { scenes: unknown[] } }>();
      expect(body.data.id).toBe(SAMPLE_VIDEO.id);
      expect(body.data.scenes).toEqual([]);
    });

    it("returns 404 for a video not owned by the user", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "GET",
        url: "/api/videos/nonexistent",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/videos/:id ───────────────────────────────────────────────

  describe("DELETE /api/videos/:id", () => {
    it("soft-deletes the video and returns 204", async () => {
      mockSelect.mockReturnValue(drizzleChain([{ id: SAMPLE_VIDEO.id }]));
      mockUpdate.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "DELETE",
        url: `/api/videos/${SAMPLE_VIDEO.id}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 when video does not exist", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "DELETE",
        url: "/api/videos/nonexistent",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /api/videos (library) ────────────────────────────────────────────

  describe("GET /api/videos", () => {
    it("returns all videos for the user across projects", async () => {
      mockSelect
        .mockReturnValueOnce(drizzleChain([SAMPLE_VIDEO]))
        .mockReturnValueOnce(drizzleChain([{ count: 1 }]));

      const res = await app.inject({ method: "GET", url: "/api/videos" });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });
});
