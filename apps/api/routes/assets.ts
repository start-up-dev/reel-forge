import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import type { FastifyInstance } from "fastify";
import { getVoicesByLanguage } from "../services/elevenlabs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load static config files at startup (they're small and never change at runtime)
const require = createRequire(import.meta.url);
const bgmTracks = require(path.join(
  __dirname,
  "../config/bgm-tracks.json",
)) as BgmTrack[];

interface BgmTrack {
  id: string;
  name: string;
  category: string;
  duration: number;
  gcsPath: string;
  previewUrl: string;
}

export async function assetsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/assets/bgm — return available BGM tracks
  fastify.get("/assets/bgm", async (_request, reply) => {
    return reply.send({ data: bgmTracks });
  });

  // GET /api/assets/voices — return ElevenLabs voices, optionally filtered by language
  fastify.get<{ Querystring: { language?: string } }>(
    "/assets/voices",
    async (request, reply) => {
      const { language } = request.query;
      const voices = await getVoicesByLanguage(language);
      return reply.send({ data: voices });
    }
  );
}
