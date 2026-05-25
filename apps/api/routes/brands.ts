import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { brandProfiles, socialAccounts } from "../lib/db/schema.js";
import {
  ASSET_URL_TTL_MINUTES,
  generateSignedReadUrl,
  generateSignedUploadUrl,
  uploadBuffer,
} from "../lib/storage.js";
import { buildCharacterSheetPrompt } from "../prompts/character-sheet.js";
import { generateCharacterSheet } from "../services/openai-image.js";
import { extractWebsiteContext, suggestBrandProfile } from "../services/claude.js";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

const ingestWebsiteBody = z.object({
  websiteUrl: z.string().url().max(500),
});

const createBody = z.object({
  name: z.string().min(1).max(200),
  niche: z.string().min(1).max(200),
  nicheDescription: z.string().max(1000).optional(),
  targetAudienceAge: z.enum(["gen_z", "millennial", "gen_x", "all"]).optional(),
  targetAudienceVibe: z.enum(["entertainment", "education", "inspiration", "humor"]).optional(),
  tone: z.string().min(1),
  visualStyle: z.string().min(1),
  characterType: z.enum(["human", "mascot", "abstract", "none"]),
  characterDescription: z.string().max(2000).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  referenceVideoUrl: z.string().url().max(500).optional(),
  subtitleStyle: z.enum(["bold_pop", "word_highlight", "minimal", "cinematic", "neon_glow", "oversized_pop", "grouped_bold", "grouped_cinematic", "karaoke"]).optional(),
});

const updateBody = createBody.partial().extend({
  logoGcsPath: z.string().max(500).optional(),
  websiteUrl: z.string().url().max(500).nullable().optional(),
});

const logoUploadBody = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function brandsRoutes(fastify: FastifyInstance) {
  // GET /api/brand-profiles — list all brand profiles for the user, with connected channels
  fastify.get("/brand-profiles", async (request, reply) => {
    const user = request.currentUser!;
    const rows = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.userId, user.id))
      .orderBy(desc(brandProfiles.createdAt));

    const channels = await db
      .select({
        id: socialAccounts.id,
        userId: socialAccounts.userId,
        brandProfileId: socialAccounts.brandProfileId,
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

    const channelsByBrand = channels.reduce<Record<string, typeof channels>>((acc, ch) => {
      if (ch.brandProfileId) {
        (acc[ch.brandProfileId] ??= []).push(ch);
      }
      return acc;
    }, {});

    return reply.send({ data: rows.map((r) => ({ ...r, channels: channelsByBrand[r.id] ?? [] })) });
  });

  // POST /api/brand-profiles — create a new brand profile
  fastify.post("/brand-profiles", async (request, reply) => {
    const user = request.currentUser!;
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { message: parsed.error.message } });
    }
    const d = parsed.data;

    const [row] = await db
      .insert(brandProfiles)
      .values({
        userId: user.id,
        name: d.name,
        niche: d.niche,
        nicheDescription: d.nicheDescription ?? null,
        targetAudienceAge: d.targetAudienceAge ?? null,
        targetAudienceVibe: d.targetAudienceVibe ?? null,
        tone: d.tone,
        visualStyle: d.visualStyle,
        characterType: d.characterType,
        characterDescription: d.characterDescription ?? null,
        primaryColor: d.primaryColor ?? null,
        secondaryColor: d.secondaryColor ?? null,
        referenceVideoUrl: d.referenceVideoUrl ?? null,
        subtitleStyle: d.subtitleStyle ?? "bold_pop",
        onboardingComplete: false,
      })
      .returning();

    return reply.status(201).send({ data: row });
  });

  // GET /api/brand-profiles/:id — get a single brand profile with connected channels
  fastify.get<{ Params: { id: string } }>("/brand-profiles/:id", async (request, reply) => {
    const user = request.currentUser!;
    const { id } = request.params;

    const [row] = await db
      .select()
      .from(brandProfiles)
      .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ error: { message: "Brand profile not found." } });
    }

    const [channels, characterSheetUrl] = await Promise.all([
      db
        .select({
          id: socialAccounts.id,
          userId: socialAccounts.userId,
          brandProfileId: socialAccounts.brandProfileId,
          platform: socialAccounts.platform,
          pageId: socialAccounts.pageId,
          pageName: socialAccounts.pageName,
          pageAvatarUrl: socialAccounts.pageAvatarUrl,
          tokenExpiresAt: socialAccounts.tokenExpiresAt,
          createdAt: socialAccounts.createdAt,
          updatedAt: socialAccounts.updatedAt,
        })
        .from(socialAccounts)
        .where(and(eq(socialAccounts.brandProfileId, id), eq(socialAccounts.userId, user.id))),
      row.characterSheetGcsPath
        ? generateSignedReadUrl(row.characterSheetGcsPath, ASSET_URL_TTL_MINUTES)
        : Promise.resolve(null),
    ]);

    return reply.send({ data: { ...row, channels, characterSheetUrl } });
  });

  // PATCH /api/brand-profiles/:id — partial update
  fastify.patch<{ Params: { id: string } }>("/brand-profiles/:id", async (request, reply) => {
    const user = request.currentUser!;
    const { id } = request.params;

    const parsed = updateBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { message: parsed.error.message } });
    }

    const [existing] = await db
      .select({ id: brandProfiles.id })
      .from(brandProfiles)
      .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: { message: "Brand profile not found." } });
    }

    const d = parsed.data;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (d.name !== undefined) patch.name = d.name;
    if (d.niche !== undefined) patch.niche = d.niche;
    if (d.nicheDescription !== undefined) patch.nicheDescription = d.nicheDescription;
    if (d.targetAudienceAge !== undefined) patch.targetAudienceAge = d.targetAudienceAge;
    if (d.targetAudienceVibe !== undefined) patch.targetAudienceVibe = d.targetAudienceVibe;
    if (d.tone !== undefined) patch.tone = d.tone;
    if (d.visualStyle !== undefined) patch.visualStyle = d.visualStyle;
    if (d.characterType !== undefined) patch.characterType = d.characterType;
    if (d.characterDescription !== undefined) patch.characterDescription = d.characterDescription;
    if (d.primaryColor !== undefined) patch.primaryColor = d.primaryColor;
    if (d.secondaryColor !== undefined) patch.secondaryColor = d.secondaryColor;
    if (d.referenceVideoUrl !== undefined) patch.referenceVideoUrl = d.referenceVideoUrl;
    if (d.logoGcsPath !== undefined) patch.logoGcsPath = d.logoGcsPath;
    if (d.websiteUrl !== undefined) patch.websiteUrl = d.websiteUrl;
    if (d.subtitleStyle !== undefined) patch.subtitleStyle = d.subtitleStyle;

    const [updated] = await db
      .update(brandProfiles)
      .set(patch)
      .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
      .returning();

    return reply.send({ data: updated });
  });

  // DELETE /api/brand-profiles/:id
  fastify.delete<{ Params: { id: string } }>("/brand-profiles/:id", async (request, reply) => {
    const user = request.currentUser!;
    const { id } = request.params;

    const [existing] = await db
      .select({ id: brandProfiles.id })
      .from(brandProfiles)
      .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: { message: "Brand profile not found." } });
    }

    await db
      .delete(brandProfiles)
      .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)));

    return reply.send({ data: { ok: true } });
  });

  // POST /api/brand-profiles/:id/suggest — Claude analyses connected channels and suggests brand profile
  fastify.post<{ Params: { id: string } }>(
    "/brand-profiles/:id/suggest",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const { feedback } = (request.body as { feedback?: string }) ?? {};

      const [row] = await db
        .select()
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);
      if (!row) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      // Use the first connected channel for analysis
      const [channel] = await db
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.brandProfileId, id), eq(socialAccounts.userId, user.id)))
        .limit(1);

      const suggestion = await suggestBrandProfile({
        pageName: channel?.pageName ?? row.name,
        platform: channel?.platform ?? "facebook",
        pageAvatarUrl: channel?.pageAvatarUrl,
        websiteContext: row.websiteContext ?? undefined,
        feedback: feedback ?? undefined,
      });

      return reply.send({ data: suggestion });
    },
  );

  // POST /api/brand-profiles/:id/ingest-website — fetch & analyse a brand website
  fastify.post<{ Params: { id: string } }>(
    "/brand-profiles/:id/ingest-website",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const parsed = ingestWebsiteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { message: parsed.error.message } });
      }

      const [row] = await db
        .select({ id: brandProfiles.id })
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);
      if (!row) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      const { websiteUrl } = parsed.data;

      let pageText: string;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(websiteUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ReelForge/1.0; +https://aireelforge.com)" },
        });
        clearTimeout(timer);
        if (!res.ok) {
          return reply.status(422).send({ error: { message: `Website returned ${res.status}. Check the URL and try again.` } });
        }
        const html = await res.text();
        pageText = stripHtml(html);
      } catch {
        return reply.status(422).send({ error: { message: "Could not reach the website. Check the URL and try again." } });
      }

      if (pageText.length < 50) {
        return reply.status(422).send({ error: { message: "Not enough content found on the page. Try a different URL (e.g. your homepage or about page)." } });
      }

      const websiteContext = await extractWebsiteContext(websiteUrl, pageText);

      await db
        .update(brandProfiles)
        .set({ websiteUrl, websiteContext, updatedAt: new Date() })
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)));

      return reply.send({ data: { websiteContext } });
    },
  );

  // POST /api/brand-profiles/:id/logo-upload-url
  fastify.post<{ Params: { id: string } }>(
    "/brand-profiles/:id/logo-upload-url",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const parsed = logoUploadBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { message: parsed.error.message } });
      }

      const [existing] = await db
        .select({ id: brandProfiles.id })
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[parsed.data.contentType] ?? "jpg";
      const gcsPath = `brands/${id}/logo.${ext}`;
      const uploadUrl = await generateSignedUploadUrl(gcsPath, parsed.data.contentType, 15);

      return reply.send({ data: { uploadUrl, gcsPath } });
    },
  );

  // POST /api/brand-profiles/:id/complete-onboarding
  fastify.post<{ Params: { id: string } }>(
    "/brand-profiles/:id/complete-onboarding",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [row] = await db
        .select()
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      if (row.characterType !== "none" && !row.characterSheetGcsPath) {
        return reply.status(400).send({
          error: { message: "Character sheet must be generated before completing onboarding." },
        });
      }

      await db
        .update(brandProfiles)
        .set({ onboardingComplete: true, updatedAt: new Date() })
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)));

      return reply.send({ data: { ok: true } });
    },
  );

  // POST /api/brand-profiles/:id/generate-character-sheet
  fastify.post<{ Params: { id: string } }>(
    "/brand-profiles/:id/generate-character-sheet",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [row] = await db
        .select()
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      if (row.characterType === "none") {
        return reply.status(400).send({
          error: { message: "Character type is 'none' — no character sheet to generate." },
        });
      }

      if ((row.characterType === "human" || row.characterType === "mascot") && !row.characterDescription) {
        return reply.status(400).send({
          error: { message: "Character description is required for human and mascot types." },
        });
      }

      if (row.characterSheetGenerationCount >= 10) {
        return reply.status(429).send({
          error: { message: "Maximum character sheet generations (10) reached for this brand profile." },
        });
      }

      const feedbackParsed = z.object({ feedback: z.string().max(500).optional() }).safeParse(request.body);
      const prompt = buildCharacterSheetPrompt(row, feedbackParsed.data?.feedback);
      const imageBuffer = await generateCharacterSheet(prompt);

      const gcsPath = `brands/${id}/character-sheet.png`;
      await uploadBuffer(gcsPath, imageBuffer, "image/png");

      await db
        .update(brandProfiles)
        .set({
          characterSheetGcsPath: gcsPath,
          characterSheetGenerationCount: sql`${brandProfiles.characterSheetGenerationCount} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)));

      const characterSheetUrl = await generateSignedReadUrl(gcsPath, ASSET_URL_TTL_MINUTES);
      return reply.send({ data: { characterSheetUrl } });
    },
  );

  // GET /api/brand-profiles/:id/character-sheet-url
  fastify.get<{ Params: { id: string } }>(
    "/brand-profiles/:id/character-sheet-url",
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = request.params;

      const [row] = await db
        .select({
          characterSheetGcsPath: brandProfiles.characterSheetGcsPath,
          characterSheetGenerationCount: brandProfiles.characterSheetGenerationCount,
        })
        .from(brandProfiles)
        .where(and(eq(brandProfiles.id, id), eq(brandProfiles.userId, user.id)))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: { message: "Brand profile not found." } });
      }

      if (!row.characterSheetGcsPath) {
        return reply.send({ data: { url: null, generationCount: row.characterSheetGenerationCount } });
      }

      const url = await generateSignedReadUrl(row.characterSheetGcsPath, ASSET_URL_TTL_MINUTES);
      return reply.send({ data: { url, generationCount: row.characterSheetGenerationCount } });
    },
  );
}
