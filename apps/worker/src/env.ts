import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(currentDir, "..");
const workspaceRoot = resolve(workerRoot, "..", "..");

for (const envPath of [resolve(workerRoot, ".env"), resolve(workspaceRoot, ".env")]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("8080"),

  DATABASE_URL: z.string().min(1),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),

  OPERATOR_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),

  APP_URL: z.string().url().default("http://localhost:3000"),

  // Required only for talking video assembly (Whisper transcription)
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
