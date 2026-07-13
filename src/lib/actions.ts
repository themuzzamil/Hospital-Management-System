"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "./db";
import { getCurrentUser } from "./session";
import { getDoctor, getPatient, logEvent } from "./data";
import { computeBill, type PaymentMethod } from "./billing";
import { routeIssue, type RouteResult } from "./routing";
import { generateLabReport as buildLabReport } from "./catalog";
import { auth } from "./auth";

/** Graph-powered symptom -> specialist routing, callable from the client. */
export async function findSpecialists(issue: string): Promise<RouteResult> {
  return routeIssue(issue);
}

async function actor(): Promise<string> {
  const u = await getCurrentUser();
  return u ? `${u.name} (${u.role})` : "system";
}

// ==========================================================================
//  RECEPTION — patient intake, billing, scheduling
// ==========================================================================

export type RegisterPatientInput = {
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  issue: string | null;
  doctorId: number | null;
  paymentMethod: PaymentMethod;
  insuranceProvider: string | null;
  coveragePercent: number;
  /** Triage severity 1 (critical) … 5 (routine). Defaults to 3 if omitted. */
  severity?: number;
};

/** Create a patient (auto integer id), open a consultation bill, log events. */
export async function registerPatient(input: RegisterPatientInput) {
  const who = await actor();
  // Clamp to the valid 1–5 triage range; default to 3 (urgent) when unset.
  const severity = Math.min(5, Math.max(1, Math.round(input.severity ?? 3)));
  const patient = await queryOne<{ id: number }>(
    `INSERT INTO patients
      (name, age, gender, phone, address, issue, assigned_doctor_id,
       payment_method, insurance_provider, insurance_coverage_percent, severity, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'registered',$12)
     RETURNING id`,
    [
      input.name,
      input.age,
      input.gender,
      input.phone,
      input.address,
      input.issue,
      input.doctorId,
      input.paymentMethod,
      input.insuranceProvider,
      input.coveragePercent,
      severity,
      (await getCurrentUser())?.id ?? null,
    ],
  );
  const patientId = patient!.id;
  await logEvent(
    patientId,
    "registered",
    `Patient registered. Issue: ${input.issue ?? "n/a"} · Triage severity ${severity}.`,
    who,
  );

  // Open the consultation bill from the assigned doctor's fee.
  if (input.doctorId) {
    const doc = await getDoctor(input.doctorId);
    if (doc) {
      const fee = Number(doc.consultation_fee);
      const b = computeBill({
        type: "consultation",
        amount: fee,
        paymentMethod: input.paymentMethod,
        coveragePercent: input.coveragePercent,
      });
      await createBill(patientId, "consultation", `Consultation — ${doc.name}`, b, input.paymentMethod);
      await logEvent(
        patientId,
        "consultation_billed",
        `Consultation fee ${fee} assigned with ${doc.name}.`,
        who,
      );
    }
  }

  revalidatePath("/reception");
  return patientId;
}

/** Shared bill insert used by consultation / lab / operation / admission. */
async function createBill(
  patientId: number,
  type: "consultation" | "lab" | "operation" | "admission",
  description: string,
  b: { amount: number; concessionAmount: number; concession_reason?: string; insuranceCovered: number; patientPayable: number },
  method: PaymentMethod,
  concessionReason: string | null = null,
): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO bills
      (patient_id, type, description, amount, concession_amount, concession_reason,
       payment_method, insurance_covered, patient_payable, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING id`,
    [
      patientId,
      type,
      description,
      b.amount,
      b.concessionAmount,
      concessionReason,
      method,
      b.insuranceCovered,
      b.patientPayable,
    ],
  );
  return row!.id;
}

/** Mark a bill paid; advance patient state where relevant. */
export async function markBillPaid(billId: number) {
  const who = await actor();
  const bill = await queryOne<{ patient_id: number; type: string; patient_payable: string }>(
    `UPDATE bills SET status='paid', paid_at=now() WHERE id=$1 RETURNING patient_id, type, patient_payable`,
    [billId],
  );
  if (!bill) return;
  await logEvent(bill.patient_id, "payment", `${bill.type} bill #${billId} marked paid.`, who);

  // Paying the consultation bill moves the patient into the doctor's care.
  if (bill.type === "consultation") {
    await query(
      `UPDATE patients SET status='with_doctor' WHERE id=$1 AND status='registered'`,
      [bill.patient_id],
    );
  }
  // Paying a lab bill lets the report be produced.
  if (bill.type === "lab") {
    await query(`UPDATE lab_orders SET status='paid' WHERE bill_id=$1`, [billId]);
  }
  // Paying an operation bill schedules it (already has a date).
  if (bill.type === "operation") {
    await query(`UPDATE operations SET status='paid' WHERE bill_id=$1`, [billId]);
  }
  revalidatePath("/reception");
  revalidatePath(`/reception/patients/${bill.patient_id}`);
}

/** Apply a concession (lab/operation/admission only) and recompute payable. */
export async function applyConcession(billId: number, concession: number, reason: string) {
  const who = await actor();
  const bill = await queryOne<{
    patient_id: number;
    type: string;
    amount: string;
    payment_method: PaymentMethod;
  }>(`SELECT patient_id, type, amount, payment_method FROM bills WHERE id=$1`, [billId]);
  if (!bill) return;
  if (bill.type === "consultation") {
    throw new Error("Concession is not allowed on the consultation fee.");
  }
  const patient = await getPatient(bill.patient_id);
  const b = computeBill({
    type: bill.type as "lab" | "operation" | "admission",
    amount: Number(bill.amount),
    concessionAmount: concession,
    paymentMethod: bill.payment_method,
    coveragePercent: patient?.insurance_coverage_percent ?? 0,
  });
  await query(
    `UPDATE bills SET concession_amount=$1, concession_reason=$2,
        insurance_covered=$3, patient_payable=$4 WHERE id=$5`,
    [b.concessionAmount, reason, b.insuranceCovered, b.patientPayable, billId],
  );
  await logEvent(
    bill.patient_id,
    "concession",
    `Concession ${b.concessionAmount} on ${bill.type} bill #${billId}. Reason: ${reason}`,
    who,
  );
  revalidatePath(`/reception/patients/${bill.patient_id}`);
  revalidatePath("/reception/billing");
}

/** Bill a lab test the doctor ordered. */
export async function billLabOrder(labOrderId: number, amount: number) {
  const who = await actor();
  const lab = await queryOne<{ patient_id: number; test_name: string }>(
    `SELECT patient_id, test_name FROM lab_orders WHERE id=$1`,
    [labOrderId],
  );
  if (!lab) return;
  const patient = await getPatient(lab.patient_id);
  const method = patient?.payment_method ?? "self";
  const b = computeBill({
    type: "lab",
    amount,
    paymentMethod: method,
    coveragePercent: patient?.insurance_coverage_percent ?? 0,
  });
  const billId = await createBill(lab.patient_id, "lab", `Lab test — ${lab.test_name}`, b, method);
  await query(`UPDATE lab_orders SET status='billed', bill_id=$1 WHERE id=$2`, [billId, labOrderId]);
  await logEvent(lab.patient_id, "lab_billed", `Lab "${lab.test_name}" billed (${amount}).`, who);
  revalidatePath(`/reception/patients/${lab.patient_id}`);
}

/**
 * Auto-generate a lab report once the lab bill is paid. The receptionist just
 * clicks "Generate report"; a plausible dummy report is produced from the test
 * catalog and attached, ready to hand (download) to the patient.
 */
export async function generateLabReport(labOrderId: number) {
  const who = await actor();
  const lab = await queryOne<{ patient_id: number; test_name: string; status: string }>(
    `SELECT patient_id, test_name, status FROM lab_orders WHERE id=$1`,
    [labOrderId],
  );
  if (!lab) return;
  if (lab.status !== "paid") {
    throw new Error("The lab bill must be paid before a report can be generated.");
  }
  const patient = await getPatient(lab.patient_id);
  const report = buildLabReport(lab.test_name, patient?.name ?? "Patient");
  await query(`UPDATE lab_orders SET report_text=$1, status='reported' WHERE id=$2`, [
    report,
    labOrderId,
  ]);
  await logEvent(lab.patient_id, "lab_reported", `Report generated for "${lab.test_name}".`, who);
  revalidatePath(`/reception/patients/${lab.patient_id}`);
}

/** Schedule an operation date + open its bill. */
export async function scheduleOperation(operationId: number, date: string, amount: number) {
  const who = await actor();
  const op = await queryOne<{ patient_id: number; procedure: string }>(
    `SELECT patient_id, procedure FROM operations WHERE id=$1`,
    [operationId],
  );
  if (!op) return;
  const patient = await getPatient(op.patient_id);
  const method = patient?.payment_method ?? "self";
  const b = computeBill({
    type: "operation",
    amount,
    paymentMethod: method,
    coveragePercent: patient?.insurance_coverage_percent ?? 0,
  });
  const billId = await createBill(op.patient_id, "operation", `Operation — ${op.procedure}`, b, method);
  await query(
    `UPDATE operations SET scheduled_date=$1, bill_id=$2, status='scheduled' WHERE id=$3`,
    [date, billId, operationId],
  );
  await query(
    `INSERT INTO appointments(patient_id, doctor_id, type, scheduled_date, bill_id, status)
     SELECT patient_id, doctor_id, 'operation', $1, $2, 'scheduled' FROM operations WHERE id=$3`,
    [date, billId, operationId],
  );
  await logEvent(
    op.patient_id,
    "operation_scheduled",
    `Operation "${op.procedure}" scheduled for ${date} (fee ${amount}).`,
    who,
  );
  revalidatePath(`/reception/patients/${op.patient_id}`);
}

/** Reschedule an operation: patient meets the doctor again, new date later. */
export async function rescheduleOperation(operationId: number) {
  const who = await actor();
  const op = await queryOne<{ patient_id: number; procedure: string }>(
    `UPDATE operations SET status='rescheduled', scheduled_date=NULL WHERE id=$1
     RETURNING patient_id, procedure`,
    [operationId],
  );
  if (!op) return;
  await query(
    `UPDATE appointments SET status='rescheduled' WHERE patient_id=$1 AND type='operation' AND status='scheduled'`,
    [op.patient_id],
  );
  await logEvent(
    op.patient_id,
    "operation_rescheduled",
    `Operation "${op.procedure}" rescheduled — patient to meet doctor again.`,
    who,
  );
  revalidatePath(`/reception/patients/${op.patient_id}`);
}

export async function completeOperation(operationId: number) {
  const who = await actor();
  const op = await queryOne<{ patient_id: number; procedure: string }>(
    `UPDATE operations SET status='completed' WHERE id=$1 RETURNING patient_id, procedure`,
    [operationId],
  );
  if (!op) return;
  await logEvent(op.patient_id, "operation_completed", `Operation "${op.procedure}" completed successfully.`, who);
  revalidatePath(`/reception/patients/${op.patient_id}`);
}

/** Admit a patient to a free bed (opens an admission bill). */
export async function admitPatient(patientId: number, bedId: number, dailyRate: number) {
  const who = await actor();
  const patient = await getPatient(patientId);
  if (!patient) return;
  const method = patient.payment_method;
  const b = computeBill({
    type: "admission",
    amount: dailyRate,
    paymentMethod: method,
    coveragePercent: patient.insurance_coverage_percent,
  });
  const billId = await createBill(patientId, "admission", "Admission (per-day charge)", b, method);
  const admDoctor = patient.assigned_doctor_id;
  await query(
    `INSERT INTO admissions(patient_id, doctor_id, bed_id, bill_id, status)
     VALUES ($1,$2,$3,$4,'admitted')`,
    [patientId, admDoctor, bedId, billId],
  );
  await query(`UPDATE beds SET status='occupied', patient_id=$1 WHERE id=$2`, [patientId, bedId]);
  await query(`UPDATE patients SET status='admitted' WHERE id=$1`, [patientId]);
  await logEvent(patientId, "admitted", `Admitted to bed #${bedId}.`, who);
  revalidatePath(`/reception/patients/${patientId}`);
  revalidatePath("/admin/wards");
}

/** Discharge: free the bed, close the admission, mark patient discharged. */
export async function dischargePatient(patientId: number) {
  const who = await actor();
  const adm = await queryOne<{ id: number; bed_id: number }>(
    `SELECT id, bed_id FROM admissions WHERE patient_id=$1 AND status='admitted' ORDER BY id DESC LIMIT 1`,
    [patientId],
  );
  if (adm) {
    await query(
      `UPDATE admissions SET status='discharged', discharged_at=now() WHERE id=$1`,
      [adm.id],
    );
    if (adm.bed_id)
      await query(`UPDATE beds SET status='free', patient_id=NULL WHERE id=$1`, [adm.bed_id]);
  }
  await query(`UPDATE patients SET status='discharged' WHERE id=$1`, [patientId]);
  await logEvent(patientId, "discharged", `Patient discharged. Record archived.`, who);
  revalidatePath(`/reception/patients/${patientId}`);
  revalidatePath("/admin/wards");
}

// ==========================================================================
//  DOCTOR — notes and clinical orders
// ==========================================================================

export async function addNote(patientId: number, body: string) {
  const u = await getCurrentUser();
  await query(`INSERT INTO notes(patient_id, doctor_id, body) VALUES ($1,$2,$3)`, [
    patientId,
    u?.doctorId ?? null,
    body,
  ]);
  await logEvent(patientId, "note", `Doctor added a note.`, await actor());
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function orderLab(patientId: number, testName: string) {
  const u = await getCurrentUser();
  await query(`INSERT INTO lab_orders(patient_id, doctor_id, test_name) VALUES ($1,$2,$3)`, [
    patientId,
    u?.doctorId ?? null,
    testName,
  ]);
  await logEvent(patientId, "lab_ordered", `Doctor ordered lab test "${testName}".`, await actor());
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function recommendOperation(patientId: number, procedure: string) {
  const u = await getCurrentUser();
  await query(
    `INSERT INTO operations(patient_id, doctor_id, procedure, status) VALUES ($1,$2,$3,'recommended')`,
    [patientId, u?.doctorId ?? null, procedure],
  );
  await logEvent(patientId, "operation_recommended", `Doctor recommended operation "${procedure}".`, await actor());
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function recommendAdmission(patientId: number) {
  await logEvent(patientId, "admission_recommended", `Doctor recommended admission.`, await actor());
  revalidatePath(`/doctor/patients/${patientId}`);
}

/**
 * Doctor marks the checkup complete — the normal end of an outpatient visit
 * when no admission/operation is needed. Terminal state for that patient.
 */
export async function completeCheckup(patientId: number) {
  const who = await actor();
  await query(
    `UPDATE patients SET status='checkup_complete' WHERE id=$1 AND status='with_doctor'`,
    [patientId],
  );
  await query(
    `UPDATE appointments SET status='completed'
      WHERE patient_id=$1 AND type='consultation' AND status='scheduled'`,
    [patientId],
  );
  await logEvent(patientId, "checkup_complete", `Checkup complete — no further action needed.`, who);
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath(`/reception/patients/${patientId}`);
}

/**
 * Doctor asks the patient to come back for a follow-up. This creates a pending
 * follow-up appointment; the RECEPTIONIST assigns the actual date.
 */
export async function requestFollowup(patientId: number) {
  const u = await getCurrentUser();
  const who = await actor();
  // Avoid duplicate open follow-ups.
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM appointments WHERE patient_id=$1 AND type='followup' AND status IN ('scheduled','rescheduled') LIMIT 1`,
    [patientId],
  );
  if (!existing) {
    await query(
      `INSERT INTO appointments(patient_id, doctor_id, type, scheduled_date, status)
       VALUES ($1,$2,'followup', NULL, 'rescheduled')`,
      [patientId, u?.doctorId ?? null],
    );
  }
  await query(`UPDATE patients SET status='follow_up' WHERE id=$1`, [patientId]);
  await logEvent(patientId, "followup_requested", `Follow-up requested — receptionist to assign a date.`, who);
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath(`/reception/patients/${patientId}`);
}

/** Receptionist assigns (or changes) the follow-up revisit date. */
export async function scheduleFollowup(appointmentId: number, date: string) {
  const who = await actor();
  const appt = await queryOne<{ patient_id: number }>(
    `UPDATE appointments SET scheduled_date=$1, status='scheduled'
      WHERE id=$2 AND type='followup' RETURNING patient_id`,
    [date, appointmentId],
  );
  if (!appt) return;
  await query(`UPDATE patients SET status='follow_up' WHERE id=$1 AND status NOT IN ('admitted','discharged')`, [appt.patient_id]);
  await logEvent(appt.patient_id, "followup_scheduled", `Follow-up visit scheduled for ${date}.`, who);
  revalidatePath(`/reception/patients/${appt.patient_id}`);
}

/**
 * Receptionist marks that the patient returned for their follow-up: the visit
 * completes and the patient goes back into the doctor's queue.
 */
export async function markRevisited(appointmentId: number) {
  const who = await actor();
  const appt = await queryOne<{ patient_id: number }>(
    `UPDATE appointments SET status='completed'
      WHERE id=$1 AND type='followup' RETURNING patient_id`,
    [appointmentId],
  );
  if (!appt) return;
  await query(`UPDATE patients SET status='with_doctor' WHERE id=$1`, [appt.patient_id]);
  await logEvent(appt.patient_id, "followup_revisit", `Patient returned for follow-up — back in doctor's queue.`, who);
  revalidatePath(`/reception/patients/${appt.patient_id}`);
  revalidatePath(`/doctor/queue`);
}

// ==========================================================================
//  ADMIN — manage doctors & receptionists
// ==========================================================================

export async function createDoctor(input: {
  name: string;
  email: string;
  password: string;
  specialtyId: number;
  fee: number;
  rating: number;
}) {
  const doc = await queryOne<{ id: number }>(
    `INSERT INTO doctors(name, specialty_id, consultation_fee, rating, status)
     VALUES ($1,$2,$3,$4,'active') RETURNING id`,
    [input.name, input.specialtyId, input.fee, input.rating],
  );
  const res = await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      role: "doctor",
      doctorId: doc!.id,
    },
  });
  const uid = (res as { user?: { id?: string } })?.user?.id;
  if (uid) {
    await query(`UPDATE "user" SET role='doctor', "doctorId"=$1 WHERE id=$2`, [doc!.id, uid]);
    await query(`UPDATE doctors SET user_id=$1 WHERE id=$2`, [uid, doc!.id]);
  }
  revalidatePath("/admin/doctors");
}

export async function updateDoctor(input: {
  id: number;
  name: string;
  specialtyId: number;
  fee: number;
  rating: number;
  status: "active" | "inactive";
}) {
  await query(
    `UPDATE doctors SET name=$1, specialty_id=$2, consultation_fee=$3, rating=$4, status=$5 WHERE id=$6`,
    [input.name, input.specialtyId, input.fee, input.rating, input.status, input.id],
  );
  revalidatePath("/admin/doctors");
}

export async function deleteDoctor(id: number) {
  const doc = await queryOne<{ user_id: string | null }>(
    `SELECT user_id FROM doctors WHERE id=$1`,
    [id],
  );
  await query(`DELETE FROM doctors WHERE id=$1`, [id]);
  if (doc?.user_id) await query(`DELETE FROM "user" WHERE id=$1`, [doc.user_id]);
  revalidatePath("/admin/doctors");
}

export async function createReceptionist(input: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await auth.api.signUpEmail({
    body: { email: input.email, password: input.password, name: input.name, role: "receptionist" },
  });
  const uid = (res as { user?: { id?: string } })?.user?.id;
  if (uid) await query(`UPDATE "user" SET role='receptionist' WHERE id=$1`, [uid]);
  revalidatePath("/admin/staff");
}
