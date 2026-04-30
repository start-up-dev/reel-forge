import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { videos } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { PROMPT_REGISTRY } from "../prompts/index.js";

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

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", validateSecret);

  // Lists all registered prompt families — name, description, and source file.
  // Use this to audit what prompts exist and where to edit them.
  app.get("/admin/prompts", async () => ({ prompts: PROMPT_REGISTRY }));

  // ── POST /api/admin/videos/:id/confirm-fail ───────────────────────────────
  // Moves a video from CLIPS_NEEDS_REVIEW → FAILED. The only code path that
  // sets FAILED — used by the operator after reviewing unrecoverable clips.
  app.post<{ Params: { id: string } }>(
    "/admin/videos/:id/confirm-fail",
    async (request, reply) => {
      const { id } = request.params;
      const body = z
        .object({ reason: z.string().optional() })
        .parse(request.body ?? {});

      const [video] = await db
        .select({ id: videos.id, status: videos.status })
        .from(videos)
        .where(eq(videos.id, id))
        .limit(1);

      if (!video) {
        return reply.code(404).send({ error: "Video not found" });
      }
      if (video.status !== "CLIPS_NEEDS_REVIEW") {
        return reply.code(400).send({
          error: `Video must be in CLIPS_NEEDS_REVIEW state (currently: ${video.status})`,
        });
      }

      await db
        .update(videos)
        .set({
          status: "FAILED",
          ...(body.reason ? { error: body.reason } : {}),
          updatedAt: new Date(),
        })
        .where(eq(videos.id, id));

      return reply.send({ data: { ok: true } });
    },
  );
}
