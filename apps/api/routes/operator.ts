import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { clipRequests, scenes, videos } from "../lib/db/schema.js";
import { generateSignedUploadUrl } from "../lib/storage.js";
import { dispatchAssemblyTask } from "../lib/cloud-tasks.js";
import { env } from "../lib/env.js";

function validateSecret(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
) {
  if (request.headers["x-operator-secret"] !== env.OPERATOR_SECRET) {
    reply.code(403).send({ error: "Forbidden" });
    return;
  }
  done();
}

export async function operatorRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/operator/queue/count ─────────────────────────────────────────
  // Returns the number of queued clips without claiming any.
  fastify.get(
    "/operator/queue/count",
    { preHandler: validateSecret },
    async (_request, reply) => {
      const rows = await db
        .select({ count: count() })
        .from(clipRequests)
        .where(eq(clipRequests.status, "queued"));
      return reply.send({ data: { count: Number(rows[0]?.count ?? 0) } });
    },
  );

  // ── GET /api/operator/queue ────────────────────────────────────────────────
  // Atomically claims up to `batch_size` queued clips (FOR UPDATE SKIP LOCKED)
  // and returns the fields the extension needs to generate each clip.
  fastify.get(
    "/operator/queue",
    { preHandler: validateSecret },
    async (request, reply) => {
      const query = request.query as { batch_size?: string };
      const batchSize = Math.min(
        Math.max(1, parseInt(query.batch_size ?? "30", 10) || 30),
        50,
      );

      const result = await db.execute(sql`
        UPDATE clip_requests
        SET status = 'processing', claimed_at = NOW()
        WHERE id IN (
          SELECT id FROM clip_requests
          WHERE status = 'queued'
          ORDER BY queued_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING
          id,
          video_id   AS "videoId",
          scene_index AS "sceneIndex",
          visual_prompt AS "visualPrompt",
          base_image_url AS "baseImageUrl"
      `);

      const claimed = result.rows as {
        id: string;
        videoId: string;
        sceneIndex: number;
        visualPrompt: string;
        baseImageUrl: string;
      }[];

      // Transition videos from CLIPS_QUEUED → CLIPS_PROCESSING on first claim.
      if (claimed.length > 0) {
        const videoIds = [...new Set(claimed.map((r) => r.videoId))];
        for (const videoId of videoIds) {
          await db
            .update(videos)
            .set({ status: "CLIPS_PROCESSING", updatedAt: new Date() })
            .where(and(eq(videos.id, videoId), eq(videos.status, "CLIPS_QUEUED")));
        }
      }

      return reply.send({ data: claimed });
    },
  );

  // ── POST /api/operator/clips/:id/upload-url ────────────────────────────────
  // Returns a 30-minute signed GCS PUT URL for the generated clip video.
  fastify.post(
    "/operator/clips/:id/upload-url",
    { preHandler: validateSecret },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [clip] = await db
        .select()
        .from(clipRequests)
        .where(
          and(eq(clipRequests.id, id), eq(clipRequests.status, "processing")),
        );

      if (!clip) {
        return reply
          .code(404)
          .send({ error: "Clip not found or not in processing state" });
      }

      const gcsPath = `videos/${clip.videoId}/scenes/${clip.sceneIndex}/clip.mp4`;
      const uploadUrl = await generateSignedUploadUrl(gcsPath, "video/mp4", 30);

      return reply.send({ data: { uploadUrl, gcsPath } });
    },
  );

  // ── POST /api/operator/clips/:id/complete ─────────────────────────────────
  // Marks a clip done, updates the parent scene, and dispatches FFmpeg assembly
  // once every clip for the video has been processed.
  fastify.post(
    "/operator/clips/:id/complete",
    { preHandler: validateSecret },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({ gcsPath: z.string().min(1) })
        .parse(request.body);

      const [clip] = await db
        .select()
        .from(clipRequests)
        .where(
          and(eq(clipRequests.id, id), eq(clipRequests.status, "processing")),
        );

      if (!clip) {
        return reply
          .code(404)
          .send({ error: "Clip not found or not in processing state" });
      }

      // Mark this clip done.
      await db
        .update(clipRequests)
        .set({ status: "done", processedAt: new Date(), clipUrl: body.gcsPath })
        .where(eq(clipRequests.id, id));

      // Propagate clip URL to the parent scene row.
      await db
        .update(scenes)
        .set({ clipUrl: body.gcsPath, clipPath: body.gcsPath, updatedAt: new Date() })
        .where(
          and(
            eq(scenes.videoId, clip.videoId),
            eq(scenes.sceneIndex, clip.sceneIndex),
          ),
        );

      // Check whether every clip for this video is now done.
      const remainingRows = await db
        .select({ remaining: count() })
        .from(clipRequests)
        .where(
          and(
            eq(clipRequests.videoId, clip.videoId),
            sql`${clipRequests.status} != 'done'`,
          ),
        );
      const remaining = Number(remainingRows[0]?.remaining ?? 1);

      if (remaining === 0) {
        await db
          .update(videos)
          .set({ status: "ASSEMBLY_PENDING", updatedAt: new Date() })
          .where(eq(videos.id, clip.videoId));

        // Fire-and-forget — if dispatch fails we log but don't fail the request.
        dispatchAssemblyTask(clip.videoId).catch((err: unknown) => {
          console.error(
            `[operator] Failed to dispatch assembly for video ${clip.videoId}:`,
            err,
          );
        });
      }

      return reply.send({ data: { ok: true } });
    },
  );

  // ── POST /api/operator/clips/:id/fail ─────────────────────────────────────
  // Marks a clip failed. If no clips remain queued or processing, the video is
  // also marked FAILED.
  fastify.post(
    "/operator/clips/:id/fail",
    { preHandler: validateSecret },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({ error: z.string().min(1) })
        .parse(request.body);

      const [clip] = await db
        .select()
        .from(clipRequests)
        .where(eq(clipRequests.id, id));

      if (!clip) {
        return reply.code(404).send({ error: "Clip not found" });
      }

      await db
        .update(clipRequests)
        .set({ status: "failed", error: body.error })
        .where(eq(clipRequests.id, id));

      // If nothing is still in-flight, the video can't recover — mark it failed.
      const pendingRows = await db
        .select({ pending: count() })
        .from(clipRequests)
        .where(
          and(
            eq(clipRequests.videoId, clip.videoId),
            sql`${clipRequests.status} IN ('queued', 'processing')`,
          ),
        );
      const pending = Number(pendingRows[0]?.pending ?? 0);

      if (pending === 0) {
        await db
          .update(videos)
          .set({
            status: "FAILED",
            error: `Clip ${clip.sceneIndex} failed: ${body.error}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(videos.id, clip.videoId),
              sql`${videos.status} NOT IN ('COMPLETE', 'ASSEMBLY_PENDING', 'ASSEMBLY_PROCESSING')`,
            ),
          );
      }

      return reply.send({ data: { ok: true } });
    },
  );
}
