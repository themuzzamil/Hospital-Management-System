/**
 * Seed script: run the domain schema, load reference data, and create the
 * initial login accounts (admin / doctors / receptionist) through Better Auth
 * so passwords are hashed exactly the way the login route expects.
 *
 *   npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import after env is loaded so the pool sees DATABASE_URL.
const { pool, query, queryOne } = await import("../src/lib/db");
const { auth } = await import("../src/lib/auth");

async function run() {
  console.log("→ Applying domain schema…");
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  console.log("→ Clearing existing domain data…");
  await pool.query(`TRUNCATE
    patient_events, notes, admissions, operations, lab_orders, appointments,
    bills, beds, wards, patients, symptom_routes, doctors, specialties
    RESTART IDENTITY CASCADE;`);

  // ---- Specialties -------------------------------------------------------
  const specialties = [
    "Cardiology",
    "Orthopedics",
    "Neurology",
    "General Medicine",
    "Pediatrics",
    "Dermatology",
    "ENT",
    "Gynecology",
  ];
  const specialtyId: Record<string, number> = {};
  for (const name of specialties) {
    const row = await queryOne<{ id: number }>(
      `INSERT INTO specialties(name) VALUES ($1) RETURNING id`,
      [name],
    );
    specialtyId[name] = row!.id;
  }
  console.log(`  seeded ${specialties.length} specialties`);

  // ---- Symptom -> specialty routing (Graph edges) ------------------------
  const routes: [string, string, number][] = [
    ["chest pain", "Cardiology", 1],
    ["palpitations", "Cardiology", 1],
    ["shortness of breath", "Cardiology", 2],
    ["fracture", "Orthopedics", 1],
    ["joint pain", "Orthopedics", 1],
    ["back pain", "Orthopedics", 2],
    ["headache", "Neurology", 1],
    ["seizure", "Neurology", 1],
    ["dizziness", "Neurology", 2],
    ["fever", "General Medicine", 1],
    ["cough", "General Medicine", 1],
    ["fatigue", "General Medicine", 2],
    ["child fever", "Pediatrics", 1],
    ["rash", "Dermatology", 1],
    ["skin allergy", "Dermatology", 1],
    ["ear pain", "ENT", 1],
    ["sore throat", "ENT", 2],
    ["pregnancy checkup", "Gynecology", 1],
  ];
  for (const [symptom, spec, weight] of routes) {
    await query(
      `INSERT INTO symptom_routes(symptom, specialty_id, weight) VALUES ($1,$2,$3)`,
      [symptom, specialtyId[spec], weight],
    );
  }
  console.log(`  seeded ${routes.length} symptom routes`);

  // ---- Wards & beds ------------------------------------------------------
  const wards: [string, string, number][] = [
    ["General Ward", "general", 6],
    ["ICU", "icu", 4],
    ["Private Rooms", "private", 4],
  ];
  for (const [name, type, count] of wards) {
    const w = await queryOne<{ id: number }>(
      `INSERT INTO wards(name, ward_type) VALUES ($1,$2) RETURNING id`,
      [name, type],
    );
    const prefix = name[0];
    for (let i = 1; i <= count; i++) {
      await query(`INSERT INTO beds(ward_id, label) VALUES ($1,$2)`, [
        w!.id,
        `${prefix}${i}`,
      ]);
    }
  }
  console.log(`  seeded ${wards.length} wards with beds`);

  // ---- Accounts via Better Auth -----------------------------------------
  async function createUser(
    email: string,
    password: string,
    name: string,
    role: string,
    doctorId?: number,
  ): Promise<string | null> {
    try {
      const res = await auth.api.signUpEmail({
        body: { email, password, name, role, doctorId },
      });
      // Ensure the role/doctorId actually persisted (some fields need input:true).
      const uid = (res as { user?: { id?: string } })?.user?.id ?? null;
      if (uid) {
        await query(`UPDATE "user" SET role=$1, "doctorId"=$2 WHERE id=$3`, [
          role,
          doctorId ?? null,
          uid,
        ]);
      }
      return uid;
    } catch (e) {
      console.warn(`  ! could not create ${email}:`, (e as Error).message);
      // Fall back to fetching an existing user id.
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "user" WHERE email=$1`,
        [email],
      );
      return existing?.id ?? null;
    }
  }

  console.log("→ Creating accounts…");
  await createUser("admin@medistruct.com", "admin123", "System Admin", "admin");
  await createUser(
    "reception@medistruct.com",
    "reception123",
    "Front Desk",
    "receptionist",
  );

  const doctorSeed: [string, string, string, number, number][] = [
    // name, email, specialty, fee, rating
    ["Dr. Sara Khan", "sara@medistruct.com", "Cardiology", 2500, 4.8],
    ["Dr. Bilal Ahmed", "bilal@medistruct.com", "Orthopedics", 2000, 4.5],
    ["Dr. Ayesha Malik", "ayesha@medistruct.com", "Neurology", 3000, 4.9],
    ["Dr. Omar Farooq", "omar@medistruct.com", "General Medicine", 1500, 4.3],
    ["Dr. Hina Raza", "hina@medistruct.com", "Pediatrics", 1800, 4.6],
  ];
  for (const [name, email, spec, fee, rating] of doctorSeed) {
    const doc = await queryOne<{ id: number }>(
      `INSERT INTO doctors(name, specialty_id, consultation_fee, rating, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING id`,
      [name, specialtyId[spec], fee, rating],
    );
    const uid = await createUser(
      email,
      "doctor123",
      name,
      "doctor",
      doc!.id,
    );
    if (uid) await query(`UPDATE doctors SET user_id=$1 WHERE id=$2`, [uid, doc!.id]);
  }
  console.log(`  created ${doctorSeed.length} doctors`);

  console.log("\n✅ Seed complete.\n");
  console.log("Login credentials:");
  console.log("  Admin:        admin@medistruct.com / admin123");
  console.log("  Receptionist: reception@medistruct.com / reception123");
  console.log("  Doctor:       sara@medistruct.com / doctor123 (and others)");

  await pool.end();
}

run().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
