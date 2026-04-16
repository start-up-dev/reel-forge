import { clerkClient, getAuth } from "@clerk/fastify";
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
    // User authenticated via Clerk but has no DB row yet — this happens in dev
    // when the Clerk webhook can't reach localhost. Auto-create from Clerk data.
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      );
      if (!primaryEmail) {
        return reply.status(401).send({
          error: { code: "USER_NOT_FOUND", message: "No primary email on Clerk user." },
        });
      }
      const [created] = await db
        .insert(users)
        .values({
          id: clerkId,
          email: primaryEmail.emailAddress,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: primaryEmail.emailAddress,
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
      request.currentUser = created;
      return;
    } catch {
      return reply.status(401).send({
        error: { code: "USER_NOT_FOUND", message: "User record not found. Please complete sign-up." },
      });
    }
  }

  request.currentUser = user;
}
