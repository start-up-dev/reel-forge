import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { clipRequests, projects, scenes, users, videos } from "../lib/db/schema.js";
import { checkQuota } from "../lib/quota.js";
import {
  generateSignedReadUrl,
  generateSignedUploadUrl,
  uploadBuffer,
} from "../lib/storage.js";
import { generateIdeas, generateScript, splitScenes } from "../services/claude.js";
import { generateVoiceover } from "../services/elevenlabs.js";
import { generateImage } from "../services/grok-image.js";

const createVideoBody = z.object({
  title: z.string().min(1).max(200).default("Untitled Video"),
});

const PAGE_SIZE = 20;

// 7-day signed URL TTL — GCS v4 signed URLs max out at 604800 seconds
const ASSET_URL_TTL_MINUTES = 60 * 24 * 7;

// ─── Background: voice generation ────────────────────────────────────────────

async function processVoice(videoId: string, script: string, voiceId: string): Promise<void> {
  try {
    const { audioBuffer, wordTimestamps, durationSeconds } = await generateVoiceover(
      script,
      voiceId,
    );
    const audioPath = `videos/${videoId}/audio.mp3`;
    const timestampsPath = `videos/${videoId}/word_timestamps.json`;

    await uploadBuffer(audioPath, audioBuffer, "audio/mpeg");
    await uploadBuffer(
      timestampsPath,
      Buffer.from(JSON.stringify(wordTimestamps)),
      "application/json",
    );

    const [audioUrl, wordTimestampsUrl] = await Promise.all([
      generateSignedReadUrl(audioPath, ASSET_URL_TTL_MINUTES),
      generateSignedReadUrl(timestampsPath, ASSET_URL_TTL_MINUTES),
    ]);

    await db
      .update(videos)
      .set({ audioUrl, wordTimestampsUrl, durationSeconds, status: "VOICE_READY", updatedAt: new Date() })
      .where(eq(videos.id, videoId));
  } catch (err) {
    console.error("[processVoice] error:", err);
    await db
      .update(videos)
      .set({
        status: "FAILED",
        error: err instanceof Error ? err.message : "Voice generation failed",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));
  }
}

// ─── Background: scene generation ────────────────────────────────────────────

async function processScenes(
  videoId: string,
  script: string,
  durationSeconds: number,
): Promise<void> {
  try {
    const sceneList = await splitScenes(script, durationSeconds);

    // Replace existing scenes (supports idempotent re-generation)
    await db.delete(scenes).where(eq(scenes.videoId, videoId));

    const inserted = await db
      .insert(scenes)
      .values(
        sceneList.map((s) => ({
          videoId,
          sceneIndex: s.sceneIndex,
          textExcerpt: s.textExcerpt,
          visualPrompt: s.visualPrompt,
          durationHintSeconds: s.durationHintSeconds,
        })),
      )
      .returning();

    // Generate base images in parallel — per-scene failures are non-fatal
    await Promise.allSettled(
      inserted.map(async (scene) => {
        try {
          const imageBuffer = await generateImage(scene.visualPrompt);
          const imagePath = `videos/${videoId}/scenes/${scene.sceneIndex}/base_image.jpg`;
          await uploadBuffer(imagePath, imageBuffer, "image/jpeg");
          const imageUrl = await generateSignedReadUrl(imagePath, ASSET_URL_TTL_MINUTES);
          await db
            .update(scenes)
            .set({ baseImageUrl: imageUrl, baseImagePath: imagePath, updatedAt: new Date() })
            .where(eq(scenes.id, scene.id));
        } catch {
          // Scene stays without base image; user can regenerate individually
        }
      }),
    );

    await db
      .update(videos)
      .set({ status: "SCENES_READY", updatedAt: new Date() })
      .where(eq(videos.id, videoId));
  } catch (err) {
    await db
      .update(videos)
      .set({
        status: "FAILED",
        error: err instanceof Error ? err.message : "Scene generation failed",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));
  }
}

// ─── Route plugin ─────────────────────────────────────────────────────────────

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
          error: { code: "QUOTA_EXCEEDED", message: quota.reason, redirect: quota.redirect },
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
        .values({ userId: user.id, projectId, title: parsed.data.title, status: "DRAFT" })
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
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      const sceneRows = await db
        .select()
        .from(scenes)
        .where(eq(scenes.videoId, id))
        .orderBy(asc(scenes.sceneIndex));

      const clipRows = await db
        .select()
        .from(clipRequests)
        .where(eq(clipRequests.videoId, id));

      const scenesWithClips = sceneRows.map((scene) => ({
        ...scene,
        clipRequest: clipRows.find((c) => c.sceneIndex === scene.sceneIndex) ?? null,
      }));

      return reply.send({ data: { ...video, scenes: scenesWithClips } });
    },
  );

  // DELETE /api/videos/:id — soft delete
  fastify.delete<{ Params: { id: string } }>(
    "/videos/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [existing] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
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

  // GET /api/videos — all videos for the authenticated user (Library)
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

  // PATCH /api/videos/:id — update draft video fields
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
        bgmVolume: z.number().int().min(0).max(100).optional(),
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
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
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
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
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

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      await db
        .update(videos)
        .set({ status: "BRAINSTORM_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      try {
        const ideas = await generateIdeas(project, parsed.data.topic);
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

  // POST /api/videos/:id/script — generate script via Claude
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
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
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

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      await db
        .update(videos)
        .set({ idea: parsed.data.idea, status: "SCRIPT_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      try {
        const script = await generateScript(project, parsed.data.idea);
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

  // POST /api/videos/:id/voice — generate voiceover via ElevenLabs (async)
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/voice",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [video] = await db
        .select()
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }
      const voiceAllowedStates = ["SCRIPT_READY", "VOICE_READY", "FAILED"];
      if (!voiceAllowedStates.includes(video.status)) {
        return reply.status(409).send({
          error: {
            code: "INVALID_STATE",
            message: `Video must be in SCRIPT_READY, VOICE_READY, or FAILED state to generate voice (currently: ${video.status}).`,
          },
        });
      }
      if (!video.script) {
        return reply.status(409).send({
          error: { code: "NO_SCRIPT", message: "Video has no script." },
        });
      }

      const [project] = await db
        .select({ voiceId: projects.voiceId })
        .from(projects)
        .where(eq(projects.id, video.projectId))
        .limit(1);

      if (!project?.voiceId) {
        return reply.status(409).send({
          error: { code: "NO_VOICE", message: "Project has no voice configured." },
        });
      }

      await db
        .update(videos)
        .set({ status: "VOICE_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      // Fire and forget — client polls status via SSE
      void processVoice(id, video.script, project.voiceId);

      return reply.status(202).send({ data: { videoId: id, status: "VOICE_PENDING" } });
    },
  );

  // POST /api/videos/:id/scenes — split script into scenes and generate base images (async)
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/scenes",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [video] = await db
        .select()
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }
      if (video.status !== "VOICE_READY") {
        return reply.status(409).send({
          error: {
            code: "INVALID_STATE",
            message: `Video must be in VOICE_READY state to generate scenes (currently: ${video.status}).`,
          },
        });
      }
      if (!video.script) {
        return reply.status(409).send({
          error: { code: "NO_SCRIPT", message: "Video has no script." },
        });
      }
      if (!video.durationSeconds) {
        return reply.status(409).send({
          error: { code: "NO_DURATION", message: "Video duration not yet set — voice must complete first." },
        });
      }

      await db
        .update(videos)
        .set({ status: "SCENES_PENDING", updatedAt: new Date() })
        .where(eq(videos.id, id));

      // Fire and forget — client polls status via SSE
      void processScenes(id, video.script, video.durationSeconds);

      return reply.status(202).send({ data: { videoId: id, status: "SCENES_PENDING" } });
    },
  );

  // POST /api/videos/:id/scenes/:index/regenerate — regenerate a single scene's base image
  fastify.post<{ Params: { id: string; index: string } }>(
    "/videos/:id/scenes/:index/regenerate",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id, index: indexStr } = request.params;
      const sceneIndex = parseInt(indexStr, 10);

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      const [scene] = await db
        .select()
        .from(scenes)
        .where(and(eq(scenes.videoId, id), eq(scenes.sceneIndex, sceneIndex)))
        .limit(1);

      if (!scene) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Scene not found." },
        });
      }

      try {
        const imageBuffer = await generateImage(scene.visualPrompt);
        const imagePath = `videos/${id}/scenes/${sceneIndex}/base_image.jpg`;
        await uploadBuffer(imagePath, imageBuffer, "image/jpeg");
        const imageUrl = await generateSignedReadUrl(imagePath, ASSET_URL_TTL_MINUTES);

        const [updated] = await db
          .update(scenes)
          .set({ baseImageUrl: imageUrl, baseImagePath: imagePath, updatedAt: new Date() })
          .where(eq(scenes.id, scene.id))
          .returning();

        return reply.send({ data: updated });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image regeneration failed";
        return reply.status(500).send({ error: { code: "GENERATION_ERROR", message } });
      }
    },
  );

  // POST /api/videos/:id/scenes/:index/upload-url — signed GCS URL for user-supplied base image
  fastify.post<{ Params: { id: string; index: string } }>(
    "/videos/:id/scenes/:index/upload-url",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id, index: indexStr } = request.params;
      const sceneIndex = parseInt(indexStr, 10);

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      const [scene] = await db
        .select({ id: scenes.id })
        .from(scenes)
        .where(and(eq(scenes.videoId, id), eq(scenes.sceneIndex, sceneIndex)))
        .limit(1);

      if (!scene) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Scene not found." },
        });
      }

      const gcsPath = `videos/${id}/scenes/${sceneIndex}/base_image.jpg`;
      const uploadUrl = await generateSignedUploadUrl(gcsPath, "image/jpeg", 15);

      return reply.send({ data: { uploadUrl, gcsPath } });
    },
  );

  // PATCH /api/videos/:id/scenes/:index — confirm base image after user upload, or edit prompt/approval
  fastify.patch<{ Params: { id: string; index: string } }>(
    "/videos/:id/scenes/:index",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id, index: indexStr } = request.params;
      const sceneIndex = parseInt(indexStr, 10);

      const patchBody = z.object({
        baseImagePath: z.string().optional(),
        visualPrompt: z.string().optional(),
        approved: z.boolean().optional(),
      });

      const parsed = patchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      const [scene] = await db
        .select()
        .from(scenes)
        .where(and(eq(scenes.videoId, id), eq(scenes.sceneIndex, sceneIndex)))
        .limit(1);

      if (!scene) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Scene not found." },
        });
      }

      const updateFields: {
        baseImageUrl?: string;
        baseImagePath?: string;
        visualPrompt?: string;
        approved?: boolean;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      if (parsed.data.baseImagePath !== undefined) {
        updateFields.baseImageUrl = await generateSignedReadUrl(
          parsed.data.baseImagePath,
          ASSET_URL_TTL_MINUTES,
        );
        updateFields.baseImagePath = parsed.data.baseImagePath;
      }
      if (parsed.data.visualPrompt !== undefined) {
        updateFields.visualPrompt = parsed.data.visualPrompt;
      }
      if (parsed.data.approved !== undefined) {
        updateFields.approved = parsed.data.approved;
      }

      const [updated] = await db
        .update(scenes)
        .set(updateFields)
        .where(eq(scenes.id, scene.id))
        .returning();

      return reply.send({ data: updated });
    },
  );

  // GET /api/videos/:id/status-stream — SSE stream for video status polling
  fastify.get<{ Params: { id: string } }>(
    "/videos/:id/status-stream",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
        )
        .limit(1);

      if (!video) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Video not found." },
        });
      }

      reply.hijack();
      const res = reply.raw;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      let intervalId: ReturnType<typeof setInterval> | null = null;
      let active = true;

      const end = () => {
        if (!active) return;
        active = false;
        if (intervalId) clearInterval(intervalId);
        res.end();
      };

      request.raw.on("close", end);

      const emit = (payload: Record<string, unknown>) => {
        if (!active) return;
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const poll = async () => {
        if (!active) return;

        const [cur] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
        if (!cur) { end(); return; }

        let queuePosition = 0;
        let clipsDone = 0;
        let clipsTotal = 0;

        if (cur.status === "CLIPS_QUEUED" || cur.status === "CLIPS_PROCESSING") {
          const allClips = await db
            .select({ status: clipRequests.status, queuedAt: clipRequests.queuedAt })
            .from(clipRequests)
            .where(eq(clipRequests.videoId, id));

          clipsTotal = allClips.length;
          clipsDone = allClips.filter((c) => c.status === "done").length;

          if (allClips.length > 0) {
            const minQueuedAt = allClips.reduce(
              (min, c) => (c.queuedAt < min ? c.queuedAt : min),
              allClips[0]!.queuedAt,
            );

            const [countRow] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(clipRequests)
              .where(
                and(
                  eq(clipRequests.status, "queued"),
                  sql`${clipRequests.queuedAt} < ${minQueuedAt}`,
                ),
              );
            queuePosition = countRow?.count ?? 0;
          }
        }

        emit({
          type: "status_update",
          data: {
            status: cur.status,
            ...(clipsTotal > 0 ? { clipsDone, clipsTotal } : {}),
            ...(queuePosition > 0
              ? { queuePosition, estimatedWaitSeconds: queuePosition * 30 }
              : {}),
          },
        });

        if (cur.status === "COMPLETE" || cur.status === "FAILED") {
          setTimeout(end, 200);
        }
      };

      await poll();
      intervalId = setInterval(() => { void poll(); }, 2000);
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
          error: { code: "QUOTA_EXCEEDED", message: quota.reason, redirect: quota.redirect },
        });
      }

      const [video] = await db
        .select()
        .from(videos)
        .where(
          and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)),
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

      const approvedScenes = await db
        .select()
        .from(scenes)
        .where(and(eq(scenes.videoId, id), eq(scenes.approved, true)))
        .orderBy(asc(scenes.sceneIndex));

      if (approvedScenes.length === 0) {
        return reply.status(409).send({
          error: { code: "NO_APPROVED_SCENES", message: "Approve at least one scene before submitting." },
        });
      }

      const missingImages = approvedScenes.filter((s) => !s.baseImageUrl);
      if (missingImages.length > 0) {
        return reply.status(409).send({
          error: {
            code: "MISSING_BASE_IMAGES",
            message: `${missingImages.length} scene(s) are missing base images.`,
          },
        });
      }

      const clipValues = approvedScenes.map((scene) => ({
        videoId: id,
        userId: user.id,
        sceneIndex: scene.sceneIndex,
        visualPrompt: scene.visualPrompt,
        baseImageUrl: scene.baseImageUrl!,
        status: "queued" as const,
        queuedAt: new Date(),
      }));

      await db.insert(clipRequests).values(clipValues);

      await db
        .update(videos)
        .set({ status: "CLIPS_QUEUED", updatedAt: new Date() })
        .where(eq(videos.id, id));

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
