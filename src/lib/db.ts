import { Pool, types } from "pg";

/**
 * Return Postgres DATE columns (OID 1082) as plain 'YYYY-MM-DD' strings instead
 * of JS Date objects, so they can be rendered directly in React and match our
 * TypeScript types. (Timestamps keep their default Date parsing.)
 */
types.setTypeParser(1082, (val) => val);

/**
 * Single shared Postgres connection pool (Neon). In Next.js dev the module can
 * be re-evaluated on hot reload, so we cache the pool on globalThis to avoid
 * exhausting connections.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

/** Tagged-friendly query helper. Returns the rows array typed as T. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Query expecting a single row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export { pool };
