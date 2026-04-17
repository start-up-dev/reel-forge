import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, "..");
const workspaceRoot = resolve(apiRoot, "..", "..");

for (const envPath of [resolve(apiRoot, ".env"), resolve(workspaceRoot, ".env")]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000"),

  // Database
  DATABASE_URL: z.string().min(1),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_STARTER_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
  STRIPE_TRIAL_PRICE_ID: z.string().min(1),

  // GCP / GCS
  GCP_PROJECT_ID: z.string().min(1),
  GCS_BUCKET_NAME: z.string().min(1),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Operator
  OPERATOR_SECRET: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),

  // Claude / Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
