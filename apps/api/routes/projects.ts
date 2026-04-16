import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { projects } from "../lib/db/schema.js";

const createProjectBody = z.object({
  name: z.string().min(1).max(120),
  platform: z.enum(["tiktok", "instagram", "youtube_shorts", "facebook_reels"]),
  niche: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(),
  tone: z
    .enum(["energetic", "calm", "motivational", "humorous", "professional"])
    .optional(),
  voiceId: z.string().optional(),
});

const updateProjectBody = createProjectBody.partial();

export async function projectsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/projects — list all non-deleted projects for the authenticated user
  fastify.get("/projects", async (request, reply) => {
    const user = request.currentUser!;

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, user.id), isNull(projects.deletedAt)))
      .orderBy(projects.updatedAt);

    return reply.send({ data: rows });
  });

  // POST /api/projects — create a new project
  fastify.post("/projects", async (request, reply) => {
    const user = request.currentUser!;

    const parsed = createProjectBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }

    const { name, platform, niche, targetAudience, tone, voiceId } =
      parsed.data;

    const [project] = await db
      .insert(projects)
      .values({ userId: user.id, name, platform, niche, targetAudience, tone, voiceId })
      .returning();

    return reply.status(201).send({ data: project });
  });

  // GET /api/projects/:id — get a single project (ownership enforced)
  fastify.get<{ Params: { id: string } }>(
    "/projects/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
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

      return reply.send({ data: project });
    },
  );

  // PUT /api/projects/:id — update project settings (ownership enforced)
  fastify.put<{ Params: { id: string } }>(
    "/projects/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const parsed = updateProjectBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: parsed.error.message },
        });
      }

      // Verify ownership before updating
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, user.id),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      const [updated] = await db
        .update(projects)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      return reply.send({ data: updated });
    },
  );

  // DELETE /api/projects/:id — soft delete (sets deleted_at)
  fastify.delete<{ Params: { id: string } }>(
    "/projects/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, user.id),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found." },
        });
      }

      await db
        .update(projects)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, id));

      return reply.status(204).send();
    },
  );
}
