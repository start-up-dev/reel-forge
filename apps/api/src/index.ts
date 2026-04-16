// Validate environment variables before importing anything else.
// env.ts calls process.exit(1) if any required var is missing.
import "../lib/env.js";

import { clerkPlugin } from "@clerk/fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { env } from "../lib/env.js";
import { requireAuth } from "../lib/auth.js";
import { assetsRoutes } from "../routes/assets.js";
import { billingRoutes } from "../routes/billing.js";
import { projectsRoutes } from "../routes/projects.js";
import { usersRoutes } from "../routes/users.js";
import { videosRoutes } from "../routes/videos.js";

const app = Fastify({
  logger:
    env.NODE_ENV === "production"
      ? true
      : { transport: { target: "pino-pretty" } },
});

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(helmet, { global: true });
await app.register(cors, {
  origin: [env.NEXT_PUBLIC_APP_URL],
  credentials: true,
});
await app.register(sensible);
// Accept multipart uploads up to 50 MB (image uploads in scene review)
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
// Clerk plugin enables getAuth(request) in route handlers and hooks
await app.register(clerkPlugin, {
  publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

// ─── Public routes ────────────────────────────────────────────────────────────

// Health check — used by Cloud Run liveness probes and uptime monitors
app.get("/health", async () => ({
  status: "ok",
  ts: new Date().toISOString(),
}));

// Billing routes: webhook is public (Stripe-signed); portal/checkout are auth-gated
// via `preHandler: requireAuth` defined inside the plugin.
await app.register(billingRoutes, { prefix: "/api/billing" });

// User sync webhook (Clerk) + /me routes (auth via preHandler inside plugin)
await app.register(usersRoutes, { prefix: "/api/users" });

// ─── Authenticated routes ─────────────────────────────────────────────────────
// All routes below require a valid Clerk JWT + an existing user row in the DB.

await app.register(async (authScope) => {
  // Clerk populates req.auth in a "preHandler" hook (its default hookName).
  // requireAuth must run at the same stage — AFTER Clerk — so it also uses
  // "preHandler". Using "onRequest" here fires before Clerk sets req.auth,
  // which causes the "clerkPlugin should be registered before getAuth" error.
  authScope.addHook("preHandler", requireAuth);

  await authScope.register(projectsRoutes, { prefix: "/api" });
  await authScope.register(videosRoutes, { prefix: "/api" });
  await authScope.register(assetsRoutes, { prefix: "/api" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const shutdown = async () => {
  app.log.info("Shutting down gracefully…");
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: parseInt(env.PORT, 10), host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
