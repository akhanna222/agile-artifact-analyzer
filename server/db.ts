import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

pool.query("CREATE EXTENSION IF NOT EXISTS vector").catch((err) => {
  console.warn("pgvector extension setup warning:", err.message);
});
