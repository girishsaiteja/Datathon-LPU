import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is missing from the environment");
  }

  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      // Vercel serverless: keep this small so we do not exhaust the pooler.
      max: process.env.VERCEL ? 3 : 8,
    });
  }

  return globalForDb.pgPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver);
    return typeof value === "function" ? value.bind(getPool()) : value;
  },
});

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export function num(value: unknown, digits?: number) {
  const n = value == null || value === "" ? 0 : Number(value);
  if (Number.isNaN(n)) return 0;
  return digits == null ? n : Number(n.toFixed(digits));
}
