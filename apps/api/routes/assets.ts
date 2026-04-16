import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import type { FastifyInstance } from "fastify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load static config files at startup (they're small and never change at runtime)
const require = createRequire(import.meta.url);
const bgmTracks = require(path.join(
  __dirname,
  "../config/bgm-tracks.json",
)) as BgmTrack[];
const voicesList = require(path.join(
  __dirname,
  "../config/voices.json",
)) as Voice[];

interface BgmTrack {
  id: string;
  name: string;
  category: string;
  duration: number;
  gcsPath: string;
  previewUrl: string;
}

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  language: string;
  previewUrl: string;
  tags: string[];
}

export async function assetsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/assets/bgm — return available BGM tracks
  fastify.get("/assets/bgm", async (_request, reply) => {
    return reply.send({ data: bgmTracks });
  });

  // GET /api/assets/voices — return curated ElevenLabs voice list
  fastify.get("/assets/voices", async (_request, reply) => {
    return reply.send({ data: voicesList });
  });
}
