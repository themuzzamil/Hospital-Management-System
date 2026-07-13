/**
 * One-off migration: add the `severity` triage column to existing `patients`
 * rows. Safe to run more than once (IF NOT EXISTS).
 *
 *   npx tsx scripts/add-severity.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS severity int NOT NULL DEFAULT 3
      CHECK (severity BETWEEN 1 AND 5)
  `);
  const { rows } = await pool.query(
    `SELECT severity, count(*)::int AS n FROM patients GROUP BY severity ORDER BY severity`,
  );
  console.log("✅ severity column ready. Current distribution:");
  console.table(rows);
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
