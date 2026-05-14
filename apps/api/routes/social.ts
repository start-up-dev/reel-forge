import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { postSchedules, socialAccounts, videos } from "../lib/db/schema.js";
import { generateSignedReadUrl } from "../lib/storage.js";
import { uploadReelToFacebook } from "../services/facebook.js";
import { env } from "../lib/env.js";

const connectBody = z.object({
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  pageAvatarUrl: z.string().url().optional(),
  accessToken: z.string().min(1),
});

const postVideoBody = z.object({
  socialAccountId: z.string().uuid(),
  postType: z.enum(["draft", "scheduled", "manual"]),
  scheduledAt: z.string().datetime().optional(),
});

export async function socialRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/auth/facebook/authorize
  fastify.get("/auth/facebook/authorize", async (request, reply) => {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_REDIRECT_URI) {
      return reply.status(503).send({ error: "Facebook OAuth not configured" });
    }
    const user = request.currentUser!;
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = `${user.id}:${nonce}`;

    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: env.FACEBOOK_REDIRECT_URI,
      scope: "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata",
      state,
      response_type: "code",
    });

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    return reply.send({ data: { authUrl } });
  });

  // GET /api/auth/facebook/callback
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/auth/facebook/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code || !state) {
        return reply.status(400).send({ error: "OAuth error or missing parameters" });
      }

      if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET || !env.FACEBOOK_REDIRECT_URI) {
        return reply.status(503).send({ error: "Facebook OAuth not configured" });
      }

      // Validate state format: userId:nonce
      const colonIdx = state.indexOf(":");
      if (colonIdx < 0) {
        return reply.status(400).send({ error: "Invalid state parameter" });
      }
      const userId = state.slice(0, colonIdx);
      const user = request.currentUser!;
      if (userId !== user.id) {
        return reply.status(400).send({ error: "State mismatch" });
      }

      // Exchange code for user access token
      const tokenParams = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        redirect_uri: env.FACEBOOK_REDIRECT_URI,
        code,
      });
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`
      );
      if (!tokenRes.ok) {
        return reply.status(502).send({ error: "Failed to exchange code for token" });
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Fetch user's pages — include access_token so the client can store the page token
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,picture,access_token&access_token=${tokenData.access_token}`
      );
      if (!pagesRes.ok) {
        return reply.status(502).send({ error: "Failed to fetch Facebook pages" });
      }
      const pagesData = (await pagesRes.json()) as {
        data: Array<{ id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }>;
      };

      const pages = pagesData.data.map((p) => ({
        id: p.id,
        name: p.name,
        pictureUrl: p.picture?.data?.url ?? null,
        accessToken: p.access_token,
      }));

      return reply.send({ data: { pages } });
    }
  );

  // POST /api/social/facebook/connect
  fastify.post("/social/facebook/connect", async (request, reply) => {
    const parsed = connectBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { pageId, pageName, pageAvatarUrl, accessToken } = parsed.data;
    const user = request.currentUser!;

    // Upsert social account
    const [account] = await db
      .insert(socialAccounts)
      .values({
        userId: user.id,
        platform: "facebook",
        pageId,
        pageName,
        pageAvatarUrl: pageAvatarUrl ?? null,
        accessToken,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.platform, socialAccounts.pageId],
        set: {
          pageName,
          pageAvatarUrl: pageAvatarUrl ?? null,
          accessToken,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!account) {
      return reply.status(500).send({ error: "Failed to save social account" });
    }
    return reply.status(201).send({
      data: {
        id: account.id,
        userId: account.userId,
        platform: account.platform,
        pageId: account.pageId,
        pageName: account.pageName,
        pageAvatarUrl: account.pageAvatarUrl,
        tokenExpiresAt: account.tokenExpiresAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });
  });

  // GET /api/social/accounts
  fastify.get("/social/accounts", async (request, reply) => {
    const user = request.currentUser!;
    const rows = await db
      .select({
        id: socialAccounts.id,
        userId: socialAccounts.userId,
        platform: socialAccounts.platform,
        pageId: socialAccounts.pageId,
        pageName: socialAccounts.pageName,
        pageAvatarUrl: socialAccounts.pageAvatarUrl,
        tokenExpiresAt: socialAccounts.tokenExpiresAt,
        createdAt: socialAccounts.createdAt,
        updatedAt: socialAccounts.updatedAt,
      })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));

    return reply.send({ data: rows });
  });

  // DELETE /api/social/accounts/:id
  fastify.delete<{ Params: { id: string } }>(
    "/social/accounts/:id",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const deleted = await db
        .delete(socialAccounts)
        .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, user.id)))
        .returning({ id: socialAccounts.id });

      if (deleted.length === 0) {
        return reply.status(404).send({ error: "Account not found" });
      }
      return reply.send({ data: { ok: true } });
    }
  );

  // POST /api/videos/:id/post — upload video to Facebook
  fastify.post<{ Params: { id: string } }>(
    "/videos/:id/post",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: videoId } = request.params;

      const parsed = postVideoBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const { socialAccountId, postType, scheduledAt } = parsed.data;

      const [video] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
        .limit(1);

      if (!video) {
        return reply.status(404).send({ error: "Video not found" });
      }
      if (video.status !== "COMPLETE") {
        return reply.status(400).send({ error: "Video must be complete before posting" });
      }
      if (!video.outputUrl) {
        return reply.status(400).send({ error: "Video has no output URL" });
      }

      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.id, socialAccountId), eq(socialAccounts.userId, user.id)))
        .limit(1);

      if (!account) {
        return reply.status(404).send({ error: "Social account not found" });
      }

      // Resolve signed URL if needed
      let videoUrl = video.outputUrl;
      if (!videoUrl.startsWith("http")) {
        videoUrl = await generateSignedReadUrl(videoUrl, 30);
      }

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        return reply.status(502).send({ error: "Failed to download video for posting" });
      }
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

      let platformPostId: string | null = null;
      let postError: string | null = null;

      try {
        platformPostId = await uploadReelToFacebook(
          account.pageId,
          account.accessToken,
          videoBuffer,
          video.title,
          {
            draft: postType === "draft",
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          },
        );
      } catch (err) {
        postError = err instanceof Error ? err.message : "Facebook upload failed";
      }

      const [schedule] = await db
        .insert(postSchedules)
        .values({
          videoId,
          socialAccountId,
          postType,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          platformPostId,
          status: postError ? "failed" : "posted",
          errorMessage: postError,
          updatedAt: new Date(),
        })
        .returning();

      if (postError) {
        return reply.status(502).send({ error: postError, data: { postSchedule: schedule } });
      }

      return reply.status(201).send({ data: { postSchedule: schedule } });
    },
  );

  // GET /api/videos/:id/post-status — return all post schedules for a video
  fastify.get<{ Params: { id: string } }>(
    "/videos/:id/post-status",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: videoId } = request.params;

      const [video] = await db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
        .limit(1);

      if (!video) {
        return reply.status(404).send({ error: "Video not found" });
      }

      const schedules = await db
        .select()
        .from(postSchedules)
        .where(eq(postSchedules.videoId, videoId))
        .orderBy(desc(postSchedules.createdAt));

      return reply.send({ data: schedules });
    },
  );
}
