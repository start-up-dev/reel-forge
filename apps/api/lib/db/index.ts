import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

// DATABASE_URL must be set before this module is imported.
// env.ts validates this and exits the process if missing.
const pool = new Pool({ connectionString: process.env["DATABASE_URL"]! });

export const db = drizzle({ client: pool });
