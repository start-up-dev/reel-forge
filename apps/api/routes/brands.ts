import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { brandProfiles } from "../lib/db/schema.js";
import {
  ASSET_URL_TTL_MINUTES,
  generateSignedReadUrl,
  generateSignedUploadUrl,
  uploadBuffer,
} from "../lib/storage.js";
import { buildCharacterSheetPrompt } from "../prompts/character-sheet.js";
import { generateCharacterSheet } from "../services/openai-image.js";

const createBody = z.object({
  name: z.string().min(1).max(200),
  socialAccountId: z.string().uuid().optional(),
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
});

const updateBody = createBody.partial().extend({
  logoGcsPath: z.string().max(500).optional(),
});

const logoUploadBody = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function brandsRoutes(fastify: FastifyInstance) {
  // GET /api/brand-profiles — list all brand profiles for the user
  fastify.get("/brand-profiles", async (request, reply) => {
    const user = request.currentUser!;
    const rows = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.userId, user.id))
      .orderBy(desc(brandProfiles.createdAt));
    return reply.send({ data: rows });
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
        socialAccountId: d.socialAccountId ?? null,
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
        onboardingComplete: false,
      })
      .returning();

    return reply.status(201).send({ data: row });
  });

  // GET /api/brand-profiles/:id — get a single brand profile
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

    let characterSheetUrl: string | null = null;
    if (row.characterSheetGcsPath) {
      characterSheetUrl = await generateSignedReadUrl(
        row.characterSheetGcsPath,
        ASSET_URL_TTL_MINUTES,
      );
    }

    return reply.send({ data: { ...row, characterSheetUrl } });
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
    if (d.socialAccountId !== undefined) patch.socialAccountId = d.socialAccountId;
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

      const prompt = buildCharacterSheetPrompt(row);
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
