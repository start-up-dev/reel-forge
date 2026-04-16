import { getAuth } from "@clerk/fastify";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "./db/index.js";
import { type UserRow, users } from "./db/schema.js";

// Augment FastifyRequest so route handlers can access `request.currentUser`
declare module "fastify" {
  interface FastifyRequest {
    currentUser?: UserRow;
  }
}

/**
 * Fastify preHandler hook that verifies the Clerk JWT and attaches the
 * corresponding database user to `request.currentUser`.
 *
 * Apply this hook to any route or scope that requires authentication.
 * Routes that must remain public (e.g. /health, /api/billing/webhook)
 * should be registered outside the scoped plugin that uses this hook.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { userId: clerkId } = getAuth(request);

  if (!clerkId) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
  }

  // users.id IS the Clerk user ID (text PK — no separate clerkId column)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, clerkId))
    .limit(1);

  if (!user) {
    return reply.status(401).send({
      error: {
        code: "USER_NOT_FOUND",
        message: "User record not found. Please complete sign-up.",
      },
    });
  }

  request.currentUser = user;
}
