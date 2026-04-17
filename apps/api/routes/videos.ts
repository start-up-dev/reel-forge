import Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { clipRequests, projects, scenes, users, videos } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { checkQuota } from "../lib/quota.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const createVideoBody = z.object({
  title: z.string().min(1).max(200).default("Untitled Video"),
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
        .orderBy(desc(videos.updatedAt))
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

      const parsed = createVideoBody.safeParse(request.body ?? {});
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
  fastify.get<{
    Querystring: { page?: string; search?: string; status?: string; projectId?: string };
  }>(
    "/videos",
    async (request, reply) => {
      const user = request.currentUser!;
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const { search, status, projectId } = request.query;
      const offset = (page - 1) * PAGE_SIZE;

      const conditions = [eq(videos.userId, user.id), isNull(videos.deletedAt)];
      if (search?.trim()) conditions.push(ilike(videos.title, `%${search.trim()}%`));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (status) conditions.push(eq(videos.status, status as any));
      if (projectId) conditions.push(eq(videos.projectId, projectId));

      const rows = await db
        .select()
        .from(videos)
        .where(and(...conditions))
        .orderBy(desc(videos.updatedAt))
        .limit(PAGE_SIZE)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(and(...conditions));
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

  // POST /api/videos/:id/brainstorm — generate 3 idea cards via Claude
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/brainstorm",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const bodySchema = z.object({ topic: z.string().min(1).max(500) });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      const [video] = await db
        .select({ id: videos.id, projectId: videos.projectId })
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

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, video.projectId))
        .limit(1);

      await db
        .update(videos)
        .set({ status: "BRAINSTORM_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      const systemPrompt = `You are a viral short-form video content strategist.
Platform: ${project?.platform ?? "tiktok"}
Niche: ${project?.niche ?? "general"}
Target audience: ${project?.targetAudience ?? "general audience"}
Video style: ${project?.videoStyle ?? "educational"}
Tone: ${project?.tone ?? "casual"}
Language: ${project?.language ?? "English"}

Generate exactly 3 distinct video ideas for the given topic. Each idea must be punchy, specific, and scroll-stopping.
Return ONLY a JSON array with this exact shape, no markdown, no explanation:
[{"title":"...", "body":"..."}, {"title":"...", "body":"..."}, {"title":"...", "body":"..."}]
title: 5–8 words, hooks the viewer instantly
body: 2–3 sentence description of the video angle and key points`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: "user", content: `Topic: ${parsed.data.topic}` }],
        });

        const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
        let ideas: Array<{ title: string; body: string }> = [];
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        ideas = JSON.parse(jsonMatch?.[0] ?? "[]");

        await db
          .update(videos)
          .set({ status: "DRAFT", updatedAt: new Date() })
          .where(eq(videos.id, id));

        return reply.send({ data: { ideas } });
      } catch (err) {
        await db
          .update(videos)
          .set({ status: "DRAFT", updatedAt: new Date() })
          .where(eq(videos.id, id));
        const message = err instanceof Error ? err.message : "Failed to generate ideas";
        return reply.status(500).send({ error: { code: "GENERATION_ERROR", message } });
      }
    },
  );

  // POST /api/videos/:id/script — generate script via Claude and save to video
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/script",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const bodySchema = z.object({ idea: z.string().min(1).max(2000) });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      const [video] = await db
        .select({ id: videos.id, projectId: videos.projectId })
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

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, video.projectId))
        .limit(1);

      await db
        .update(videos)
        .set({ idea: parsed.data.idea, status: "SCRIPT_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      const systemPrompt = `You are a viral short-form video scriptwriter.

Project context:
- Platform: ${project?.platform ?? "tiktok"}
- Niche: ${project?.niche ?? "general"}
- Target audience: ${project?.targetAudience ?? "general audience"}
- Video style: ${project?.videoStyle ?? "educational"}
- Tone: ${project?.tone ?? "casual"}
- Language: ${project?.language ?? "English"}${project?.claudeSystemPrompt ? `\n- Additional instructions: ${project.claudeSystemPrompt}` : ""}

Rules:
- Script must be 80-150 words (30-60 seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in ${project?.language ?? "English"}
- Return ONLY the script text, no titles, no labels, no markdown

User's idea: ${parsed.data.idea}

Write the script now.`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: systemPrompt }],
        });

        const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

        if (!script) {
          await db
            .update(videos)
            .set({ status: "DRAFT", updatedAt: new Date() })
            .where(eq(videos.id, id));
          return reply.status(500).send({
            error: { code: "GENERATION_ERROR", message: "Script generation returned empty." },
          });
        }

        const [updated] = await db
          .update(videos)
          .set({ script, status: "SCRIPT_READY", updatedAt: new Date() })
          .where(eq(videos.id, id))
          .returning();

        return reply.send({ data: updated });
      } catch (err) {
        await db
          .update(videos)
          .set({ status: "DRAFT", updatedAt: new Date() })
          .where(eq(videos.id, id));
        const message = err instanceof Error ? err.message : "Failed to generate script";
        return reply.status(500).send({ error: { code: "GENERATION_ERROR", message } });
      }
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
