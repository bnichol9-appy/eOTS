import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __eotsDb: Promise<Db> | undefined;
}

async function create(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    return drizzleNeon(neon(process.env.DATABASE_URL), { schema });
  }
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add the Neon integration to this Vercel project.");
  }
  // Local fallback: embedded Postgres (PGlite) in ./.pglite, migrated on first use.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite("./.pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[eots] Using embedded PGlite database at ./.pglite (set DATABASE_URL to use Neon)");
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__eotsDb) globalThis.__eotsDb = create();
  return globalThis.__eotsDb;
}

export { schema };
