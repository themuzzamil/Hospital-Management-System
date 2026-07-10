import { query, queryOne } from "./db";
import type {
  Admission,
  Bed,
  Bill,
  Doctor,
  LabOrder,
  Note,
  Operation,
  Patient,
  PatientEvent,
} from "./types";

// ---- Doctors & specialties ------------------------------------------------
export function getDoctors(activeOnly = false): Promise<Doctor[]> {
  return query<Doctor>(
    `SELECT d.*, s.name AS specialty
       FROM doctors d LEFT JOIN specialties s ON s.id = d.specialty_id
      ${activeOnly ? "WHERE d.status = 'active'" : ""}
      ORDER BY d.id`,
  );
}

export function getDoctor(id: number): Promise<Doctor | null> {
  return queryOne<Doctor>(
    `SELECT d.*, s.name AS specialty
       FROM doctors d LEFT JOIN specialties s ON s.id = d.specialty_id
      WHERE d.id = $1`,
    [id],
  );
}

export function getSpecialties(): Promise<{ id: number; name: string }[]> {
  return query(`SELECT id, name FROM specialties ORDER BY name`);
}

export function getSymptomRoutes(): Promise<
  { symptom: string; specialty: string; specialty_id: number; weight: number }[]
> {
  return query(
    `SELECT r.symptom, r.weight, r.specialty_id, s.name AS specialty
       FROM symptom_routes r JOIN specialties s ON s.id = r.specialty_id
      ORDER BY r.symptom`,
  );
}

// ---- Patients -------------------------------------------------------------
export function getPatient(id: number): Promise<Patient | null> {
  return queryOne<Patient>(`SELECT * FROM patients WHERE id = $1`, [id]);
}

export function getPatients(opts?: {
  status?: string;
  doctorId?: number;
  search?: string;
}): Promise<(Patient & { doctor_name: string | null })[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts?.status) {
    params.push(opts.status);
    where.push(`p.status = $${params.length}`);
  }
  if (opts?.doctorId) {
    params.push(opts.doctorId);
    where.push(`p.assigned_doctor_id = $${params.length}`);
  }
  if (opts?.search) {
    params.push(`%${opts.search}%`);
    where.push(`(p.name ILIKE $${params.length} OR CAST(p.id AS TEXT) = '${opts.search.replace(/'/g, "")}')`);
  }
  return query(
    `SELECT p.*, d.name AS doctor_name
       FROM patients p LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.id DESC`,
    params,
  );
}

export function getPatientBills(patientId: number): Promise<Bill[]> {
  return query<Bill>(
    `SELECT * FROM bills WHERE patient_id = $1 ORDER BY id`,
    [patientId],
  );
}

export function getPatientEvents(patientId: number): Promise<PatientEvent[]> {
  return query<PatientEvent>(
    `SELECT * FROM patient_events WHERE patient_id = $1 ORDER BY id`,
    [patientId],
  );
}

export function getPatientNotes(patientId: number): Promise<Note[]> {
  return query<Note>(
    `SELECT * FROM notes WHERE patient_id = $1 ORDER BY id`,
    [patientId],
  );
}

export function getPatientLabOrders(patientId: number): Promise<LabOrder[]> {
  return query<LabOrder>(
    `SELECT * FROM lab_orders WHERE patient_id = $1 ORDER BY id`,
    [patientId],
  );
}

export function getPatientOperations(patientId: number): Promise<Operation[]> {
  return query<Operation>(
    `SELECT * FROM operations WHERE patient_id = $1 ORDER BY id`,
    [patientId],
  );
}

export function getPatientFollowups(patientId: number): Promise<
  { id: number; scheduled_date: string | null; status: string }[]
> {
  return query(
    `SELECT id, scheduled_date, status FROM appointments
      WHERE patient_id=$1 AND type='followup' ORDER BY id DESC`,
    [patientId],
  );
}

export function getPatientAdmission(patientId: number): Promise<Admission | null> {
  return queryOne<Admission>(
    `SELECT * FROM admissions WHERE patient_id = $1 AND status = 'admitted' ORDER BY id DESC LIMIT 1`,
    [patientId],
  );
}

// ---- Wards & beds ---------------------------------------------------------
export function getWardsWithBeds(): Promise<
  { id: number; name: string; ward_type: string; beds: Bed[] }[]
> {
  return query(
    `SELECT w.id, w.name, w.ward_type,
            COALESCE(json_agg(json_build_object(
              'id', b.id, 'ward_id', b.ward_id, 'label', b.label,
              'status', b.status, 'patient_id', b.patient_id
            ) ORDER BY b.label) FILTER (WHERE b.id IS NOT NULL), '[]') AS beds
       FROM wards w LEFT JOIN beds b ON b.ward_id = w.id
      GROUP BY w.id ORDER BY w.id`,
  );
}

export function getFreeBeds(): Promise<(Bed & { ward_name: string })[]> {
  return query(
    `SELECT b.*, w.name AS ward_name
       FROM beds b JOIN wards w ON w.id = b.ward_id
      WHERE b.status = 'free' ORDER BY w.name, b.label`,
  );
}

// ---- Audit trail helper (source of the Doubly Linked List timeline) -------
export async function logEvent(
  patientId: number,
  type: string,
  description: string,
  actor: string,
): Promise<void> {
  await query(
    `INSERT INTO patient_events(patient_id, type, description, actor)
     VALUES ($1,$2,$3,$4)`,
    [patientId, type, description, actor],
  );
}

// ---- Dashboard counts -----------------------------------------------------
export async function getReceptionStats() {
  const row = await queryOne<{
    waiting: string;
    registered: string;
    pending_bills: string;
    admitted: string;
  }>(
    `SELECT
      (SELECT count(*) FROM patients WHERE status IN ('registered','with_doctor')) AS waiting,
      (SELECT count(*) FROM patients WHERE status = 'registered') AS registered,
      (SELECT count(*) FROM bills WHERE status = 'pending') AS pending_bills,
      (SELECT count(*) FROM patients WHERE status = 'admitted') AS admitted`,
  );
  return {
    waiting: Number(row?.waiting ?? 0),
    registered: Number(row?.registered ?? 0),
    pendingBills: Number(row?.pending_bills ?? 0),
    admitted: Number(row?.admitted ?? 0),
  };
}
