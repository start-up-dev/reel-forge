import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { clipRequests, projects, scenes, users, videos } from "../lib/db/schema.js";
import { checkQuota } from "../lib/quota.js";

const createVideoBody = z.object({
  title: z.string().min(1).max(200),
});

const PAGE_SIZE = 20;

export async function videosRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/projects/:id/videos — paginated list of non-deleted videos in a project
  fastify.get<{ Params: { id: string }; Querystring: { page?: string } }>(
    "/projects/:id/videos",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: projectId } = request.params;
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.userId, user.id),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      const offset = (page - 1) * PAGE_SIZE;

      const rows = await db
        .select()
        .from(videos)
        .where(
          and(
            eq(videos.projectId, projectId),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        )
        .orderBy(videos.updatedAt)
        .limit(PAGE_SIZE)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(
          and(
            eq(videos.projectId, projectId),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        );
      const total = countResult[0]?.count ?? 0;

      return reply.send({
        data: rows,
        total,
        page,
        pageSize: PAGE_SIZE,
        hasMore: offset + rows.length < total,
      });
    },
  );

  // POST /api/projects/:id/videos — create a new video (DRAFT), quota-gated
  fastify.post<{ Params: { id: string } }>(
    "/projects/:id/videos",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: projectId } = request.params;

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.userId, user.id),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      const quota = checkQuota(user);
      if (!quota.allowed) {
        return reply.status(402).send({
          error: {
            code: "QUOTA_EXCEEDED",
            message: quota.reason,
            redirect: quota.redirect,
          },
        });
      }

      const parsed = createVideoBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      const [video] = await db
        .insert(videos)
        .values({
          userId: user.id,
          projectId,
          title: parsed.data.title,
          status: "DRAFT",
        })
        .returning();

      return reply.status(201).send({ data: video });
    },
  );

  // GET /api/videos/:id — get a single video with its scenes and clip_request statuses
  fastify.get<{ Params: { id: string } }>(
    "/videos/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [video] = await db
        .select()
        .from(videos)
        .where(
          and(
            eq(videos.id, id),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      // Fetch scenes ordered by sceneIndex
      const sceneRows = await db
        .select()
        .from(scenes)
        .where(eq(scenes.videoId, id))
        .orderBy(asc(scenes.sceneIndex));

      const clipRows = await db
        .select()
        .from(clipRequests)
        .where(eq(clipRequests.videoId, id));

      // Attach clip request info to each scene via videoId + sceneIndex
      const scenesWithClips = sceneRows.map((scene) => ({
        ...scene,
        clipRequest:
          clipRows.find((c) => c.sceneIndex === scene.sceneIndex) ?? null,
      }));

      return reply.send({ data: { ...video, scenes: scenesWithClips } });
    },
  );

  // DELETE /api/videos/:id — soft delete; GCS cleanup is async (Phase 13)
  fastify.delete<{ Params: { id: string } }>(
    "/videos/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [existing] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(
            eq(videos.id, id),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      await db
        .update(videos)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(videos.id, id));

      return reply.status(204).send();
    },
  );

  // GET /api/videos — all videos for the authenticated user across projects (Library)
  fastify.get<{ Querystring: { page?: string } }>(
    "/videos",
    async (request, reply) => {
      const user = request.currentUser!;
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const offset = (page - 1) * PAGE_SIZE;

      const rows = await db
        .select()
        .from(videos)
        .where(and(eq(videos.userId, user.id), isNull(videos.deletedAt)))
        .orderBy(videos.updatedAt)
        .limit(PAGE_SIZE)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(and(eq(videos.userId, user.id), isNull(videos.deletedAt)));
      const total = countResult[0]?.count ?? 0;

      return reply.send({
        data: rows,
        total,
        page,
        pageSize: PAGE_SIZE,
        hasMore: offset + rows.length < total,
      });
    },
  );

  // PATCH /api/videos/:id — update draft video fields (title, subtitle style, BGM, etc.)
  fastify.patch<{ Params: { id: string } }>(
    "/videos/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const patchBody = z.object({
        title: z.string().min(1).max(200).optional(),
        idea: z.string().optional(),
        script: z.string().optional(),
        subtitleStyle: z
          .enum(["bold_pop", "word_highlight", "minimal", "cinematic"])
          .optional(),
        bgmEnabled: z.boolean().optional(),
        bgmAssetId: z.string().nullable().optional(),
        bgmVolume: z.number().int().min(0).max(100).optional(), // Fixed: integer 0–100
      });

      const parsed = patchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      const [existing] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(
            eq(videos.id, id),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      const [updated] = await db
        .update(videos)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(videos.id, id))
        .returning();

      return reply.send({ data: updated });
    },
  );

  // POST /api/videos/:id/submit — submit video for clip processing
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/submit",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const quota = checkQuota(user);
      if (!quota.allowed) {
        return reply.status(402).send({
          error: {
            code: "QUOTA_EXCEEDED",
            message: quota.reason,
            redirect: quota.redirect,
          },
        });
      }

      const [video] = await db
        .select()
        .from(videos)
        .where(
          and(
            eq(videos.id, id),
            eq(videos.userId, user.id),
            isNull(videos.deletedAt),
          ),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      if (video.status !== "SCENES_READY") {
        return reply.status(409).send({
          error: {
            code: "INVALID_STATE",
            message: `Video must be in SCENES_READY state to submit (currently: ${video.status}).`,
          },
        });
      }

      // Fetch approved scenes ordered by sceneIndex
      const approvedScenes = await db
        .select()
        .from(scenes)
        .where(and(eq(scenes.videoId, id), eq(scenes.approved, true)))
        .orderBy(asc(scenes.sceneIndex));

      if (approvedScenes.length === 0) {
        return reply.status(409).send({
          error: {
            code: "NO_APPROVED_SCENES",
            message: "Approve at least one scene before submitting.",
          },
        });
      }

      // Validate all approved scenes have base images before queueing
      const missingImages = approvedScenes.filter((s) => !s.baseImageUrl);
      if (missingImages.length > 0) {
        return reply.status(409).send({
          error: {
            code: "MISSING_BASE_IMAGES",
            message: `${missingImages.length} scene(s) are missing base images.`,
          },
        });
      }

      // Create clip_requests — denormalise visualPrompt and baseImageUrl from scenes
      // so the extension can get everything it needs in a single queue-claim query.
      const clipValues = approvedScenes.map((scene) => ({
        videoId: id,
        userId: user.id,
        sceneIndex: scene.sceneIndex,
        visualPrompt: scene.visualPrompt,
        baseImageUrl: scene.baseImageUrl!, // validated above
        status: "queued" as const,
        queuedAt: new Date(),
      }));

      await db.insert(clipRequests).values(clipValues);

      await db
        .update(videos)
        .set({ status: "CLIPS_QUEUED", updatedAt: new Date() })
        .where(eq(videos.id, id));

      // Atomically increment usage counters
      await db
        .update(users)
        .set({
          videosToday: sql`${users.videosToday} + 1`,
          videosThisMonth: sql`${users.videosThisMonth} + 1`,
          trialVideoRemaining: sql`GREATEST(${users.trialVideoRemaining} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return reply.send({ data: { videoId: id, status: "CLIPS_QUEUED" } });
    },
  );
}
