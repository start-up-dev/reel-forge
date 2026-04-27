import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
}
