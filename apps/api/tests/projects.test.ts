/**
 * Integration tests for Project CRUD routes.
 *
 * The DB module is mocked — no live database required.
 * All Drizzle query chain methods (select/insert/update/delete) are
 * replaced with vi.fn() stubs that return predictable data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, MOCK_USER } from "./helpers/build-app.js";
import { projectsRoutes } from "../routes/projects.js";

// ─── Mock Drizzle DB ──────────────────────────────────────────────────────────
// vi.hoisted ensures these refs are available when vi.mock factory runs (which
// is hoisted to the top of the file by Vitest).

const { mockSelect, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("../lib/db/index.js", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_PROJECT = {
  id: "proj-uuid-001",
  userId: MOCK_USER.id,
  name: "My TikTok Channel",
  platforms: ["tiktok"],
  niche: "fitness",
  targetAudience: "18-24",
  tone: "energetic",
  voiceId: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// Helper to build a chainable Drizzle-like query mock that resolves `value`.
function drizzleChain(value: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "where", "orderBy", "limit", "offset", "returning", "set",
    "values", "onConflictDoUpdate",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make the chain itself thenable (Drizzle queries are awaitable)
  (chain as unknown as Promise<unknown>)[Symbol.iterator] =
    function* () { yield* (value as Iterable<unknown>); };
  Object.assign(chain, { then: (res: (v: unknown) => unknown) => Promise.resolve(value).then(res) });
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Project routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
    await app.register(projectsRoutes, { prefix: "/api" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ── GET /api/projects ────────────────────────────────────────────────────

  describe("GET /api/projects", () => {
    it("returns a list of projects for the authenticated user", async () => {
      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({ method: "GET", url: "/api/projects" });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: typeof SAMPLE_PROJECT[] }>();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("My TikTok Channel");
    });

    it("returns an empty array when the user has no projects", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({ method: "GET", url: "/api/projects" });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ data: unknown[] }>().data).toHaveLength(0);
    });
  });

  // ── POST /api/projects ───────────────────────────────────────────────────

  describe("POST /api/projects", () => {
    it("creates a project and returns 201", async () => {
      mockInsert.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: {
          name: "My TikTok Channel",
          platforms: ["tiktok"],
          niche: "fitness",
          language: "English",
          targetAudience: "Gym goers",
          videoStyle: "educational",
          tone: "inspirational",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json<{ data: typeof SAMPLE_PROJECT }>().data.id).toBe("proj-uuid-001");
    });

    it("returns 400 when name is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { platforms: ["tiktok"] },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for an invalid platform value", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { name: "Test", platforms: ["twitter"] },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /api/projects/:id ────────────────────────────────────────────────

  describe("GET /api/projects/:id", () => {
    it("returns the project when it belongs to the user", async () => {
      mockSelect.mockReturnValue(drizzleChain([SAMPLE_PROJECT]));

      const res = await app.inject({
        method: "GET",
        url: `/api/projects/${SAMPLE_PROJECT.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ data: typeof SAMPLE_PROJECT }>().data.id).toBe(SAMPLE_PROJECT.id);
    });

    it("returns 404 when the project does not exist", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "GET",
        url: "/api/projects/nonexistent-id",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── PUT /api/projects/:id ────────────────────────────────────────────────

  describe("PUT /api/projects/:id", () => {
    it("updates and returns the project", async () => {
      const updated = { ...SAMPLE_PROJECT, name: "Renamed" };
      // First call: ownership check (returns existing), second: update (returns updated)
      mockSelect
        .mockReturnValueOnce(drizzleChain([{ id: SAMPLE_PROJECT.id }]))
      mockUpdate.mockReturnValue(drizzleChain([updated]));

      const res = await app.inject({
        method: "PUT",
        url: `/api/projects/${SAMPLE_PROJECT.id}`,
        payload: { name: "Renamed" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ data: typeof updated }>().data.name).toBe("Renamed");
    });

    it("returns 404 when project not found or not owned", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "PUT",
        url: "/api/projects/nonexistent-id",
        payload: { name: "Renamed" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/projects/:id ─────────────────────────────────────────────

  describe("DELETE /api/projects/:id", () => {
    it("soft-deletes the project and returns 204", async () => {
      mockSelect.mockReturnValue(drizzleChain([{ id: SAMPLE_PROJECT.id }]));
      mockUpdate.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "DELETE",
        url: `/api/projects/${SAMPLE_PROJECT.id}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 when project not found", async () => {
      mockSelect.mockReturnValue(drizzleChain([]));

      const res = await app.inject({
        method: "DELETE",
        url: "/api/projects/nonexistent-id",
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
