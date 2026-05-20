import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { brandProfiles, contentPlans, postSchedules, videos } from "../lib/db/schema.js";
import { subscribeToPlan } from "../lib/plan-event-bus.js";
import { postSingleVideoToFacebook, startBatchGeneration } from "../services/batch-generator.js";
import { generateWeekPlan } from "../services/claude.js";
import type { TopicEntry } from "../services/claude.js";

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapFormatToVideoType(format: string): "talking" | "action_reel" {
  if (format === "ugc" || format === "tutorial" || format === "montage" || format === "story") return "talking";
  return "talking";
}

const createBody = z.object({
  brandProfileId: z.string().uuid(),
  postsPerDay: z.union([z.literal(1), z.literal(3)]),
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

    // Plan gate: check user's subscription allows creating a plan
    const userPlan = user.plan;
    const { trialPaid, trialVideoRemaining } = user;
    if (userPlan === "none" && !trialPaid) {
      return reply.status(403).send({
        error: { code: "NO_PLAN", message: "Upgrade required to create a content plan.", redirect: "billing" },
      });
    }
    if (trialPaid && userPlan !== "starter" && userPlan !== "pro") {
      // Trial: only 1/day, must have enough credits
      if (postsPerDay !== 1) {
        return reply.status(403).send({
          error: { code: "PLAN_LIMIT", message: "Trial plan only supports 1 video per day. Upgrade to Pro for 3/day." },
        });
      }
      if ((trialVideoRemaining ?? 0) < 7) {
        return reply.status(403).send({
          error: { code: "INSUFFICIENT_CREDITS", message: "Not enough trial credits for a full week plan (needs 7). Upgrade to continue.", redirect: "billing" },
        });
      }
    }
    if (userPlan === "starter" && postsPerDay !== 1) {
      return reply.status(403).send({
        error: { code: "PLAN_LIMIT", message: "Starter plan supports 1 video per day. Upgrade to Pro for 3/day." },
      });
    }

    const weekStartDate = getTodayDateString();

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

    // Enrich with post schedule info so the calendar can show correct posting status
    const videoIds = planVideos.map((v) => v.id);
    const schedules =
      videoIds.length > 0
        ? await db
            .select({
              videoId: postSchedules.videoId,
              scheduledAt: postSchedules.scheduledAt,
              postType: postSchedules.postType,
              status: postSchedules.status,
            })
            .from(postSchedules)
            .where(inArray(postSchedules.videoId, videoIds))
            .orderBy(asc(postSchedules.updatedAt))
        : [];

    const scheduleByVideoId = new Map(schedules.map((s) => [s.videoId, s]));

    const enrichedVideos = planVideos.map((v) => ({
      ...v,
      postSchedule: scheduleByVideoId.get(v.id) ?? null,
    }));

    return reply.send({ data: { ...plan, videos: enrichedVideos } });
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

      // Approve + create videos atomically so we never leave the plan as "approved"
      // with zero videos (which permanently blocks re-approval and stalls generation).
      let videoIds: string[];
      try {
        videoIds = await db.transaction(async (tx) => {
          const [updated] = await tx
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

          const inserted = await tx
            .insert(videos)
            .values(
              topics.map((topic) => ({
                userId: user.id,
                contentPlanId: plan.id,
                brandProfileId: plan.brandProfileId,
                title: topic.title,
                videoType: mapFormatToVideoType(topic.format),
                status: "DRAFT" as const,
                idea: `${topic.hook}\n\n${topic.scriptOutline}`,
              })),
            )
            .returning({ id: videos.id });

          return inserted.map((v) => v.id);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to approve plan.";
        console.error("[approve] failed:", msg, err);
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

  // POST /api/content-plans/:id/retry-generation — re-trigger for stuck approved plans
  fastify.post<{ Params: { id: string } }>(
    "/content-plans/:id/retry-generation",
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

      if (plan.status === "draft") {
        return reply.status(400).send({ error: { message: "Plan must be approved before retrying." } });
      }

      void startBatchGeneration(id, user.id);
      return reply.send({ data: { ok: true } });
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

      // Send initial snapshot: plan status + all current video statuses
      // so clients that connect mid-generation (or on reload) immediately see state.
      const [currentPlan] = await db
        .select({ status: contentPlans.status })
        .from(contentPlans)
        .where(eq(contentPlans.id, id))
        .limit(1);

      if (currentPlan) {
        const currentVideos = await db
          .select({ id: videos.id, title: videos.title, status: videos.status })
          .from(videos)
          .where(eq(videos.contentPlanId, id));

        emit({
          type: "SNAPSHOT",
          planStatus: currentPlan.status,
          videos: currentVideos,
        } as Record<string, unknown>);

        if (currentPlan.status === "complete" || currentPlan.status === "draft") {
          setTimeout(end, 200);
        }
      }
    },
  );

  // POST /api/content-plans/:id/videos/:videoId/post — post a specific video using the plan's channel
  // Used by the "Post to Facebook" per-video retry button on the plan calendar.
  fastify.post<{ Params: { id: string; videoId: string } }>(
    "/content-plans/:id/videos/:videoId/post",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: planId, videoId } = request.params;

      const [plan] = await db
        .select()
        .from(contentPlans)
        .where(and(eq(contentPlans.id, planId), eq(contentPlans.userId, user.id)))
        .limit(1);

      if (!plan) return reply.status(404).send({ error: { message: "Plan not found." } });
      if (plan.postType === "manual") {
        return reply.status(400).send({ error: { message: "Plan is set to manual (download only) mode." } });
      }

      const [video] = await db
        .select({ id: videos.id, userId: videos.userId, contentPlanId: videos.contentPlanId })
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.userId, user.id), eq(videos.contentPlanId, planId)))
        .limit(1);

      if (!video) return reply.status(404).send({ error: { message: "Video not found in this plan." } });

      const [fullVideo] = await db
        .select({ status: videos.status })
        .from(videos)
        .where(eq(videos.id, videoId))
        .limit(1);

      if (fullVideo?.status !== "COMPLETE") {
        return reply.status(400).send({ error: { message: "Video is not complete yet." } });
      }

      await postSingleVideoToFacebook(planId, videoId);

      const [schedule] = await db
        .select()
        .from(postSchedules)
        .where(eq(postSchedules.videoId, videoId))
        .orderBy(desc(postSchedules.updatedAt))
        .limit(1);

      if (schedule?.status === "failed") {
        return reply.status(502).send({
          error: { message: schedule.errorMessage ?? "Facebook posting failed." },
          data: { postSchedule: schedule },
        });
      }

      return reply.send({ data: { postSchedule: schedule ?? null } });
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
