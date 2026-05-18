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
import { adminRoutes } from "../routes/admin.js";
import { assetsRoutes } from "../routes/assets.js";
import { billingRoutes } from "../routes/billing.js";
import { brandsRoutes } from "../routes/brands.js";
import { contentPlansRoutes } from "../routes/content-plans.js";
import { jobsRoutes } from "../routes/jobs.js";
import { operatorRoutes } from "../routes/operator.js";
import { socialRoutes } from "../routes/social.js";
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

// Robust CORS handling
const allowedOrigins = [
  env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""), // Configured URL without trailing slash
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://aireelforge.com",
  "https://viralshortai.app",
];

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      cb(null, true);
      return;
    }

    // Allow Chrome extension origins (operator extension)
    if (origin.startsWith("chrome-extension://")) {
      cb(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      cb(null, true);
      return;
    }

    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Operator-Secret"],
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

// Admin — operator-secret-gated, no Clerk JWT required
await app.register(adminRoutes, { prefix: "/api" });

// Operator queue — validated by X-Operator-Secret header (not Clerk JWT)
await app.register(operatorRoutes, { prefix: "/api" });

// Internal cron jobs — also validated by X-Operator-Secret
await app.register(jobsRoutes, { prefix: "/api" });

// ─── Authenticated routes ─────────────────────────────────────────────────────
// All routes below require a valid Clerk JWT + an existing user row in the DB.

await app.register(async (authScope) => {
  // Clerk populates req.auth in a "preHandler" hook (its default hookName).
  // requireAuth must run at the same stage — AFTER Clerk — so it also uses
  // "preHandler". Using "onRequest" here fires before Clerk sets req.auth,
  // which causes the "clerkPlugin should be registered before getAuth" error.
  authScope.addHook("preHandler", requireAuth);

  await authScope.register(videosRoutes, { prefix: "/api" });
  await authScope.register(assetsRoutes, { prefix: "/api" });
  await authScope.register(socialRoutes, { prefix: "/api" });
  await authScope.register(brandsRoutes, { prefix: "/api" });
  await authScope.register(contentPlansRoutes, { prefix: "/api" });
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
