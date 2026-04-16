import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/users/sync
   *
   * Called by the Clerk `user.created` webhook. No JWT auth required —
   * Clerk signs the request but we accept based on matching the payload shape.
   * (Full svix signature verification can be layered in if needed.)
   */
  fastify.post("/sync", async (request, reply) => {
    const bodySchema = z.object({
      type: z.string(),
      data: z.object({
        id: z.string(),
        email_addresses: z.array(
          z.object({ email_address: z.string(), id: z.string() }),
        ),
        primary_email_address_id: z.string(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
      }),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }

    const { type, data } = parsed.data;

    if (type !== "user.created") {
      return reply.send({ received: true });
    }

    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );

    if (!primaryEmail) {
      return reply.status(400).send({
        error: { code: "NO_EMAIL", message: "No primary email found." },
      });
    }

    await db
      .insert(users)
      .values({
        clerkId: data.id,
        email: primaryEmail.email_address,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: primaryEmail.email_address,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          updatedAt: new Date(),
        },
      });

    return reply.status(201).send({ received: true });
  });

  /**
   * GET /api/users/me — return authenticated user's profile.
   */
  fastify.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    return reply.send({ data: request.currentUser });
  });

  /**
   * PATCH /api/users/me — update mutable profile fields.
   */
  fastify.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.currentUser!;

    const patchSchema = z.object({
      onboardingComplete: z.boolean().optional(),
      firstName: z.string().max(100).optional(),
      lastName: z.string().max(100).optional(),
    });

    const parsed = patchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return reply.send({ data: updated });
  });
}
