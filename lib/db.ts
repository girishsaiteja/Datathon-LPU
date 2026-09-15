import { Pool } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL is missing from .env");
}

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 8,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export function num(value: unknown, digits?: number) {
  const n = value == null || value === "" ? 0 : Number(value);
  if (Number.isNaN(n)) return 0;
  return digits == null ? n : Number(n.toFixed(digits));
}
