import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// DATABASE_URL must be set before this module is imported.
// env.ts validates this and exits the process if missing.
const sql = neon(process.env["DATABASE_URL"]!);

export const db = drizzle({ client: sql });
