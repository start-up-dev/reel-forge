import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, ne, notExists, sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { contentPlans, postSchedules, users, videos } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { postSingleVideoToFacebook } from "../services/batch-generator.js";

// Job endpoints are called by a cron scheduler — secured with the same
// operator secret to avoid a second env var.
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

export async function jobsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /api/jobs/cleanup-stale-clips ────────────────────────────────────
  // Resets clip_requests that have been stuck in 'processing' for > 10 minutes
  // back to 'queued' so the operator can reclaim them.
  // Cloud Scheduler: every 5 minutes.
  fastify.post(
    "/jobs/cleanup-stale-clips",
    { preHandler: validateSecret },
    async (_request, reply) => {
      const result = await db.execute(sql`
        UPDATE clip_requests
        SET status = 'queued', claimed_at = NULL
        WHERE status = 'processing'
          AND claimed_at < NOW() - INTERVAL '10 minutes'
      `);

      const reset = (result as { rowCount?: number }).rowCount ?? 0;
      return reply.send({ data: { reset } });
    },
  );

  // ── POST /api/jobs/reset-daily-quota ──────────────────────────────────────
  // Resets videos_today to 0 for all users.
  // Cloud Scheduler: every day at UTC midnight.
  fastify.post(
    "/jobs/reset-daily-quota",
    { preHandler: validateSecret },
    async (_request, reply) => {
      await db.update(users).set({ videosToday: 0 });
      return reply.send({ data: { ok: true } });
    },
  );

  // ── POST /api/jobs/reset-monthly-quota ────────────────────────────────────
  // Resets videos_this_month to 0 for all users.
  // Cloud Scheduler: 1st of every month at UTC midnight.
  fastify.post(
    "/jobs/reset-monthly-quota",
    { preHandler: validateSecret },
    async (_request, reply) => {
      await db.update(users).set({ videosThisMonth: 0 });
      return reply.send({ data: { ok: true } });
    },
  );

  // ── POST /api/jobs/post-unscheduled-videos ────────────────────────────────
  // Catch-up layer: finds COMPLETE videos from non-manual plans (last 7 days)
  // that have no successful postSchedules row and retries posting them.
  // Cloud Scheduler: every 15 minutes.
  fastify.post(
    "/jobs/post-unscheduled-videos",
    { preHandler: validateSecret },
    async (_request, reply) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const unposted = await db
        .select({ id: videos.id, contentPlanId: videos.contentPlanId })
        .from(videos)
        .innerJoin(contentPlans, eq(contentPlans.id, videos.contentPlanId))
        .where(
          and(
            eq(videos.status, "COMPLETE"),
            ne(contentPlans.postType, "manual"),
            gt(videos.createdAt, sevenDaysAgo),
            notExists(
              db
                .select({ id: postSchedules.id })
                .from(postSchedules)
                .where(and(eq(postSchedules.videoId, videos.id), eq(postSchedules.status, "posted"))),
            ),
          ),
        )
        .limit(50);

      let attempted = 0;
      for (const v of unposted) {
        if (!v.contentPlanId) continue;
        await postSingleVideoToFacebook(v.contentPlanId, v.id);
        attempted++;
      }

      return reply.send({ data: { found: unposted.length, attempted } });
    },
  );
}
