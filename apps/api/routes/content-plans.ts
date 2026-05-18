import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { brandProfiles, contentPlans, videos } from "../lib/db/schema.js";
import { subscribeToPlan } from "../lib/plan-event-bus.js";
import { startBatchGeneration } from "../services/batch-generator.js";
import { generateWeekPlan } from "../services/claude.js";
import type { TopicEntry } from "../services/claude.js";

function getNextMonday(fromDate = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysUntilMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

function mapFormatToVideoType(format: string): string {
  if (format === "tutorial") return "generated";
  if (format === "ugc") return "talking";
  return "generated";
}

const createBody = z.object({
  brandProfileId: z.string().uuid(),
  postsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]),
});

const overrideBody = z.object({
  title: z.string().min(1).max(300).optional(),
  hook: z.string().min(1).max(500).optional(),
  format: z.enum(["ugc", "montage", "tutorial", "story"]).optional(),
  angle: z.string().max(300).optional(),
  scriptOutline: z.string().max(2000).optional(),
});

export async function contentPlansRoutes(fastify: FastifyInstance) {
  // POST /api/content-plans — create plan with Claude generation
  fastify.post("/content-plans", async (request, reply) => {
    const user = request.currentUser!;

    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { message: parsed.error.message } });
    }
    const { brandProfileId, postsPerDay } = parsed.data;

    const [brand] = await db
      .select()
      .from(brandProfiles)
      .where(and(eq(brandProfiles.id, brandProfileId), eq(brandProfiles.userId, user.id)))
      .limit(1);

    if (!brand) {
      return reply.status(404).send({ error: { message: "Brand profile not found." } });
    }

    if (!brand.onboardingComplete) {
      return reply.status(400).send({
        error: { message: "Brand onboarding must be complete before generating a content plan." },
      });
    }

    const weekStartDate = getNextMonday();

    let topics: TopicEntry[];
    try {
      topics = await generateWeekPlan(brand, postsPerDay, weekStartDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Week plan generation failed.";
      return reply.status(500).send({ error: { message: msg } });
    }

    const [plan] = await db
      .insert(contentPlans)
      .values({
        brandProfileId,
        userId: user.id,
        weekStartDate,
        postsPerDay,
        status: "draft",
        topics,
      })
      .returning();

    return reply.status(201).send({ data: plan });
  });

  // GET /api/content-plans/:id — get single plan with nested videos
  fastify.get<{ Params: { id: string } }>("/content-plans/:id", async (request, reply) => {
    const user = request.currentUser!;
    const { id } = request.params;

    const [plan] = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
      .limit(1);

    if (!plan) {
      return reply.status(404).send({ error: { message: "Content plan not found." } });
    }

    const planVideos = await db
      .select({
        id: videos.id,
        title: videos.title,
        status: videos.status,
        outputUrl: videos.outputUrl,
        contentPlanId: videos.contentPlanId,
      })
      .from(videos)
      .where(eq(videos.contentPlanId, id))
      .orderBy(desc(videos.createdAt));

    return reply.send({ data: { ...plan, videos: planVideos } });
  });

  // PATCH /api/content-plans/:id/topics/:index — override a single topic
  fastify.patch<{ Params: { id: string; index: string } }>(
    "/content-plans/:id/topics/:index",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id, index } = request.params;
      const topicIndex = parseInt(index, 10);

      if (isNaN(topicIndex) || topicIndex < 0) {
        return reply.status(400).send({ error: { message: "Invalid topic index." } });
      }

      const parsed = overrideBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { message: parsed.error.message } });
      }

      const [plan] = await db
        .select()
        .from(contentPlans)
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .limit(1);

      if (!plan) {
        return reply.status(404).send({ error: { message: "Content plan not found." } });
      }

      const topics = Array.isArray(plan.topics) ? [...(plan.topics as TopicEntry[])] : [];
      if (topicIndex >= topics.length) {
        return reply.status(400).send({ error: { message: "Topic index out of range." } });
      }

      const existing = topics[topicIndex] as TopicEntry;
      const override = parsed.data;
      topics[topicIndex] = {
        ...existing,
        ...(override.title !== undefined && { title: override.title }),
        ...(override.hook !== undefined && { hook: override.hook }),
        ...(override.format !== undefined && { format: override.format }),
        ...(override.angle !== undefined && { angle: override.angle }),
        ...(override.scriptOutline !== undefined && { scriptOutline: override.scriptOutline }),
        overridden: true,
      };

      const [updated] = await db
        .update(contentPlans)
        .set({ topics, updatedAt: new Date() })
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .returning();

      return reply.send({ data: updated });
    },
  );

  // POST /api/content-plans/:id/regenerate — regenerate non-overridden topics
  fastify.post<{ Params: { id: string } }>(
    "/content-plans/:id/regenerate",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [plan] = await db
        .select()
        .from(contentPlans)
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .limit(1);

      if (!plan) {
        return reply.status(404).send({ error: { message: "Content plan not found." } });
      }

      const [brand] = await db
        .select()
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, plan.brandProfileId), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!brand) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      let freshTopics: TopicEntry[];
      try {
        freshTopics = await generateWeekPlan(brand, plan.postsPerDay, plan.weekStartDate);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Week plan regeneration failed.";
        return reply.status(500).send({ error: { message: msg } });
      }

      const existingTopics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
      const overriddenByIndex = new Map<number, TopicEntry>(
        existingTopics.filter((t) => t.overridden).map((t) => [t.index, t]),
      );

      const mergedTopics = freshTopics.map((t) => overriddenByIndex.get(t.index) ?? t);

      const [updated] = await db
        .update(contentPlans)
        .set({ topics: mergedTopics, updatedAt: new Date() })
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .returning();

      return reply.send({ data: updated });
    },
  );

  // POST /api/content-plans/:id/approve — approve plan and create video rows
  fastify.post<{ Params: { id: string } }>(
    "/content-plans/:id/approve",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const approveBody = z.object({
        postType: z.enum(["draft", "scheduled", "manual"]).default("draft"),
      });
      const bodyParsed = approveBody.safeParse(request.body ?? {});
      const postType = bodyParsed.success ? bodyParsed.data.postType : "draft";

      // Pre-flight: verify plan exists and is owned by user
      const [plan] = await db
        .select()
        .from(contentPlans)
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .limit(1);

      if (!plan) {
        return reply.status(404).send({ error: { message: "Content plan not found." } });
      }

      if (plan.status !== "draft") {
        return reply.status(400).send({
          error: { message: "Only draft plans can be approved." },
        });
      }

      const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
      if (topics.length === 0) {
        return reply.status(400).send({ error: { message: "Plan has no topics to approve." } });
      }

      // Flip status draft→approved. The conditional WHERE prevents double-approval.
      let videoIds: string[];
      try {
        const [updated] = await db
          .update(contentPlans)
          .set({ status: "approved", postType, updatedAt: new Date() })
          .where(
            and(
              eq(contentPlans.id, id),
              eq(contentPlans.userId, user.id),
              eq(contentPlans.status, "draft"),
            ),
          )
          .returning({ id: contentPlans.id });

        if (!updated) {
          throw new Error("Plan was already approved.");
        }

        const inserted = await db
          .insert(videos)
          .values(
            topics.map((topic) => ({
              userId: user.id,
              contentPlanId: plan.id,
              brandProfileId: plan.brandProfileId,
              title: topic.title,
              videoType: mapFormatToVideoType(topic.format) as "generated" | "talking" | "action_reel",
              status: "DRAFT" as const,
              idea: `${topic.hook}\n\n${topic.scriptOutline}`,
            })),
          )
          .returning({ id: videos.id });

        videoIds = inserted.map((v) => v.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to approve plan.";
        if (msg === "Plan was already approved.") {
          return reply.status(409).send({ error: { message: msg } });
        }
        return reply.status(500).send({ error: { message: msg } });
      }

      // Fire-and-forget: kick off the agentic pipeline
      void startBatchGeneration(id, user.id);

      return reply.send({ data: { ok: true, videoIds } });
    },
  );

  // DELETE /api/content-plans/:id
  fastify.delete<{ Params: { id: string } }>("/content-plans/:id", async (request, reply) => {
    const user = request.currentUser!;
    const { id } = request.params;

    const [existing] = await db
      .select({ id: contentPlans.id })
      .from(contentPlans)
      .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: { message: "Content plan not found." } });
    }

    await db
      .delete(contentPlans)
      .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)));

    return reply.send({ data: { ok: true } });
  });

  // GET /api/content-plans/:id/progress — SSE stream of batch generation events
  fastify.get<{ Params: { id: string } }>(
    "/content-plans/:id/progress",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [plan] = await db
        .select({ id: contentPlans.id })
        .from(contentPlans)
        .where(and(eq(contentPlans.id, id), eq(contentPlans.userId, user.id)))
        .limit(1);

      if (!plan) {
        return reply.status(404).send({ error: { message: "Content plan not found." } });
      }

      reply.hijack();
      const res = reply.raw;
      const sseOrigin = request.headers.origin;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        ...(sseOrigin
          ? { "Access-Control-Allow-Origin": sseOrigin, "Access-Control-Allow-Credentials": "true" }
          : {}),
      });

      let active = true;
      let heartbeatId: ReturnType<typeof setInterval> | null = null;

      const end = () => {
        if (!active) return;
        active = false;
        if (heartbeatId) clearInterval(heartbeatId);
        res.end();
      };

      request.raw.on("close", end);

      const emit = (payload: Record<string, unknown>) => {
        if (!active) return;
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const unsubscribe = subscribeToPlan(id, (event) => {
        emit(event as unknown as Record<string, unknown>);
        if (event.type === "BATCH_COMPLETE") {
          setTimeout(end, 200);
        }
      });

      request.raw.on("close", unsubscribe);

      heartbeatId = setInterval(() => {
        if (active) res.write("event: ping\ndata: {}\n\n");
      }, 15_000);

      // Send initial snapshot of current plan status
      const [currentPlan] = await db
        .select({ status: contentPlans.status })
        .from(contentPlans)
        .where(eq(contentPlans.id, id))
        .limit(1);

      if (currentPlan) {
        emit({ type: "SNAPSHOT", planStatus: currentPlan.status });
        if (currentPlan.status === "complete" || currentPlan.status === "draft") {
          setTimeout(end, 200);
        }
      }
    },
  );

  // GET /api/brand-profiles/:brandId/content-plans — list plans for a brand
  fastify.get<{ Params: { brandId: string } }>(
    "/brand-profiles/:brandId/content-plans",
    async (request, reply) => {
      const user = request.currentUser!;
      const { brandId } = request.params;

      const [brand] = await db
        .select({ id: brandProfiles.id })
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, brandId), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!brand) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      const plans = await db
        .select()
        .from(contentPlans)
        .where(
          and(eq(contentPlans.brandProfileId, brandId), eq(contentPlans.userId, user.id)),
        )
        .orderBy(desc(contentPlans.createdAt));

      return reply.send({ data: plans });
    },
  );
}
