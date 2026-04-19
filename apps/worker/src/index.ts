import Fastify from "fastify";
import { eq, or } from "drizzle-orm";
import { env } from "./env.js";
import { db, videos } from "./db.js";
import { assembleVideo } from "./assemble.js";

const app = Fastify({ logger: true });

// ─── Auth middleware ──────────────────────────────────────────────────────────

app.addHook("preHandler", async (request, reply) => {
  if (request.url === "/health") return;
  const secret = request.headers["x-operator-secret"];
  if (secret !== env.OPERATOR_SECRET) {
    reply.code(403).send({ error: "Forbidden" });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", async () => ({ status: "ok" }));

app.post<{ Body: { videoId?: string } }>("/assemble", async (request, reply) => {
  const { videoId } = request.body ?? {};
  if (!videoId || typeof videoId !== "string") {
    return reply.code(400).send({ error: "videoId is required" });
  }

  // Respond 202 immediately; assembly runs in background
  reply.code(202).send({ message: "Assembly started", videoId });

  assembleVideo(videoId).catch((err) => {
    app.log.error({ videoId, err }, "Assembly failed");
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────���

const port = parseInt(env.PORT, 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Worker listening on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Drain any videos left pending from before this worker started.
// ASSEMBLY_PROCESSING videos are reset first — they were interrupted mid-run.
drainPendingVideos().catch((err) =>
  app.log.error({ err }, "[startup] drainPendingVideos failed"),
);

async function drainPendingVideos(): Promise<void> {
  // Reset any videos that were mid-processing when the worker last died
  const interrupted = await db
    .update(videos)
    .set({ status: "ASSEMBLY_PENDING", updatedAt: new Date() })
    .where(eq(videos.status, "ASSEMBLY_PROCESSING"))
    .returning({ id: videos.id });

  if (interrupted.length > 0) {
    app.log.warn(
      `[startup] Reset ${interrupted.length} interrupted ASSEMBLY_PROCESSING video(s) → ASSEMBLY_PENDING`,
    );
  }

  const pending = await db
    .select({ id: videos.id })
    .from(videos)
    .where(or(eq(videos.status, "ASSEMBLY_PENDING")));

  if (pending.length === 0) return;

  app.log.info(`[startup] Dispatching ${pending.length} ASSEMBLY_PENDING video(s)`);
  for (const { id } of pending) {
    assembleVideo(id).catch((err) =>
      app.log.error({ videoId: id, err }, "[startup] Assembly failed"),
    );
  }
}
