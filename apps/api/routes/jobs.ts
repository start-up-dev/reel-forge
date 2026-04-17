import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";
import { env } from "../lib/env.js";

// Job endpoints are called by GCP Cloud Scheduler — secured with the same
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
}
