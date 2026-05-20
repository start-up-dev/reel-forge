import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SnapshotClip } from "@repo/types";
import { db } from "../lib/db/index.js";
import { clipRequests, postSchedules, scenes, videos } from "../lib/db/schema.js";
import {
  ASSET_URL_TTL_MINUTES,
  generateSignedReadUrl,
} from "../lib/storage.js";
import { subscribeToVideo } from "../lib/clip-events.js";

const PAGE_SIZE = 20;

export async function videosRoutes(fastify: FastifyInstance): Promise<void> {
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
    Querystring: { page?: string; search?: string; status?: string };
  }>(
    "/videos",
    async (request, reply) => {
      const user = request.currentUser!;
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const { search, status } = request.query;
      const offset = (page - 1) * PAGE_SIZE;

      const conditions = [eq(videos.userId, user.id), isNull(videos.deletedAt)];
      if (search?.trim()) conditions.push(ilike(videos.title, `%${search.trim()}%`));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (status) conditions.push(eq(videos.status, status as any));

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

      // Attach latest post_schedule per video (one extra query, not N+1)
      const videoIds = rows.map((r) => r.id);
      const scheduleRows = videoIds.length > 0
        ? await db
            .select()
            .from(postSchedules)
            .where(inArray(postSchedules.videoId, videoIds))
            .orderBy(desc(postSchedules.createdAt))
        : [];
      const scheduleMap = new Map<string, typeof scheduleRows[0]>();
      for (const s of scheduleRows) {
        if (!scheduleMap.has(s.videoId)) scheduleMap.set(s.videoId, s);
      }

      return reply.send({
        data: rows.map((r) => ({ ...r, postSchedule: scheduleMap.get(r.id) ?? null })),
        total,
        page,
        pageSize: PAGE_SIZE,
        hasMore: offset + rows.length < total,
      });
    },
  );

  // PATCH /api/videos/:id — update video fields
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
          .enum(["bold_pop", "word_highlight", "minimal", "cinematic", "neon_glow", "oversized_pop", "grouped_bold", "grouped_cinematic", "karaoke"])
          .optional(),
        bgmEnabled: z.boolean().optional(),
        bgmAssetId: z.string().nullable().optional(),
        bgmVolume: z.number().int().min(0).max(100).optional(),
        targetDurationSeconds: z.number().int()
          .refine(v => [15, 30, 45, 60].includes(v))
          .optional(),
        renderStyle: z
          .enum(["mascot", "cartoon", "animation_2d", "motion_graphics", "cinematic", "stock_footage", "whiteboard"])
          .nullable()
          .optional(),
        videoType: z.enum(["talking", "action_reel"]).optional(),
        ugcVisualStyle: z.string().nullable().optional(),
        actionReelStyle: z.string().nullable().optional(),
        voiceSpeed: z.number().min(0.5).max(2.0).optional(),
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

  // PATCH /api/videos/:id/scenes/:index — edit scene prompt or approval
  fastify.patch<{ Params: { id: string; index: string } }>(
    "/videos/:id/scenes/:index",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id, index: indexStr } = request.params;
      const sceneIndex = parseInt(indexStr, 10);

      const patchBody = z.object({
        visualPrompt: z.string().optional(),
        motionPrompt: z.string().optional(),
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
        visualPrompt?: string;
        motionPrompt?: string;
        approved?: boolean;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      if (parsed.data.visualPrompt !== undefined) {
        updateFields.visualPrompt = parsed.data.visualPrompt;
      }
      if (parsed.data.motionPrompt !== undefined) {
        updateFields.motionPrompt = parsed.data.motionPrompt;
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
      const sseOrigin = request.headers.origin;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        ...(sseOrigin ? { "Access-Control-Allow-Origin": sseOrigin, "Access-Control-Allow-Credentials": "true" } : {}),
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

  // GET /api/videos/:id/progress — SSE stream of live clip generation events
  fastify.get<{ Params: { id: string } }>(
    "/videos/:id/progress",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.id, id), eq(videos.userId, user.id), isNull(videos.deletedAt)))
        .limit(1);

      if (!video) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Video not found or access denied." },
        });
      }

      const clipRows = await db
        .select()
        .from(clipRequests)
        .where(eq(clipRequests.videoId, id));

      const snapshotClips: SnapshotClip[] = await Promise.all(
        clipRows.map(async (clip) => {
          const entry: SnapshotClip = {
            sceneIndex: clip.sceneIndex,
            status: clip.status as SnapshotClip["status"],
          };
          if (clip.status === "done" && clip.clipUrl) {
            try {
              entry.clipUrl = await generateSignedReadUrl(clip.clipUrl, ASSET_URL_TTL_MINUTES);
            } catch { /* skip */ }
          }
          if (clip.status === "failed" && clip.error) {
            entry.error = clip.error;
          }
          return entry;
        }),
      );

      const queueResult = await db.execute<{ queue_position: number }>(sql`
        SELECT CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM clip_requests WHERE video_id = ${id} AND status = 'queued'
          ) THEN 0
          ELSE (
            SELECT COUNT(DISTINCT video_id)::int FROM clip_requests
            WHERE status = 'queued'
              AND queued_at < (
                SELECT MIN(queued_at) FROM clip_requests
                WHERE video_id = ${id} AND status = 'queued'
              )
          )
        END AS queue_position
      `);
      const queuePosition = Number(queueResult.rows[0]?.queue_position ?? 0);

      reply.hijack();
      const res = reply.raw;
      const progressOrigin = request.headers.origin;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        ...(progressOrigin ? { "Access-Control-Allow-Origin": progressOrigin, "Access-Control-Allow-Credentials": "true" } : {}),
      });

      res.write(`data: ${JSON.stringify({ type: "SNAPSHOT", clips: snapshotClips, queuePosition })}\n\n`);

      const unsubscribe = subscribeToVideo(id, (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`);
      }, 15_000);

      let ended = false;
      request.raw.on("close", () => {
        if (ended) return;
        ended = true;
        unsubscribe();
        clearInterval(heartbeat);
        res.end();
      });
    },
  );
}
