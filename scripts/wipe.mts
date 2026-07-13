/**
 * One-off DB wipe: reset MediStruct to a clean slate that keeps ONLY:
 *   - the admin account (admin@medistruct.com) + its account/session rows
 *   - reference/config data: specialties, symptom_routes, wards, beds
 *
 * Everything else is deleted: all other users (doctors + receptionists) and
 * their auth rows, plus all patients, doctors, bills, appointments, lab orders,
 * operations, admissions, notes and patient_events. ID sequences are reset so
 * the next patient/doctor starts at 1. Runs in a single transaction.
 *
 *   npx tsx scripts/wipe.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

const ADMIN_EMAIL = "admin@medistruct.com";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function counts(label: string) {
  const { rows } = await pool.query(`SELECT
    (SELECT count(*) FROM "user")::int      AS users,
    (SELECT count(*) FROM account)::int     AS accounts,
    (SELECT count(*) FROM session)::int     AS sessions,
    (SELECT count(*) FROM patients)::int    AS patients,
    (SELECT count(*) FROM doctors)::int     AS doctors,
    (SELECT count(*) FROM bills)::int       AS bills,
    (SELECT count(*) FROM specialties)::int AS specialties,
    (SELECT count(*) FROM wards)::int       AS wards,
    (SELECT count(*) FROM beds)::int        AS beds`);
  console.log(`\n${label}:`);
  console.table(rows);
}

async function main() {
  const admin = await pool.query<{ id: string }>(
    `SELECT id FROM "user" WHERE email = $1`,
    [ADMIN_EMAIL],
  );
  if (admin.rows.length !== 1) {
    throw new Error(
      `Expected exactly 1 admin (${ADMIN_EMAIL}); found ${admin.rows.length}. Aborting.`,
    );
  }
  const adminId = admin.rows[0].id;
  console.log(`Admin to KEEP: ${ADMIN_EMAIL} (${adminId})`);

  await counts("BEFORE");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Free beds (kept as reference data) so patients can be deleted (beds
    //    have a non-cascading FK to patients).
    await client.query(`UPDATE beds SET status = 'free', patient_id = NULL`);

    // 2) Delete all operational data (FK-safe order; patients FK is CASCADE but
    //    we delete children explicitly for clarity).
    for (const t of [
      "patient_events",
      "notes",
      "admissions",
      "operations",
      "lab_orders",
      "appointments",
      "bills",
      "patients",
      "doctors",
    ]) {
      await client.query(`DELETE FROM ${t}`);
    }

    // 3) Reset ID sequences so the next insert starts at 1.
    for (const t of [
      "patients",
      "doctors",
      "bills",
      "appointments",
      "lab_orders",
      "operations",
      "admissions",
      "notes",
      "patient_events",
    ]) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), 1, false)`,
        [t],
      );
    }

    // 4) Delete every auth row that is not the admin's (keep admin logged in).
    await client.query(`DELETE FROM session WHERE "userId" <> $1`, [adminId]);
    await client.query(`DELETE FROM account WHERE "userId" <> $1`, [adminId]);
    await client.query(`DELETE FROM "user"  WHERE id     <> $1`, [adminId]);

    await client.query("COMMIT");
    console.log("\n✅ Wipe committed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Rolled back — no changes made:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    client.release();
  }

  await counts("AFTER");
  const remaining = await pool.query(
    `SELECT email, role FROM "user" ORDER BY email`,
  );
  console.log("\nRemaining users:");
  console.table(remaining.rows);

  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
