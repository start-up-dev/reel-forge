/**
 * Integration tests for Video routes.
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

const SAMPLE_VIDEO = {
  id: "video-uuid-001",
  userId: MOCK_USER.id,
  title: "My First Video",
  status: "DRAFT",
  idea: null,
  script: null,
  durationSeconds: null,
  subtitleStyle: "bold_pop",
  bgmEnabled: false,
  bgmAssetId: null,
  bgmVolume: 15,
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

  // ── GET /api/videos/:id ──────────────────────────────────────────────────

  describe("GET /api/videos/:id", () => {
    it("returns the video with its scenes and clip requests", async () => {
      mockSelect
        .mockReturnValueOnce(drizzleChain([SAMPLE_VIDEO]))
        .mockReturnValueOnce(drizzleChain([]))
        .mockReturnValueOnce(drizzleChain([]));

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
    it("returns paginated video list for the user", async () => {
      mockSelect
        .mockReturnValueOnce(drizzleChain([SAMPLE_VIDEO]))
        .mockReturnValueOnce(drizzleChain([{ count: 1 }]))
        .mockReturnValueOnce(drizzleChain([])); // post schedules

      const res = await app.inject({ method: "GET", url: "/api/videos" });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });
});
