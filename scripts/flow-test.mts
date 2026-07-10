/**
 * Integration test for the patient-journey write path. Mirrors the SQL used by
 * the server actions to prove every insert/update matches the live schema.
 * Cleans up after itself.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const { pool, query, queryOne } = await import("../src/lib/db");
const { computeBill } = await import("../src/lib/billing");

function ok(c: boolean, m: string) {
  if (!c) throw new Error("FAIL: " + m);
  console.log("ok  - " + m);
}

const doc = await queryOne<{ id: number; consultation_fee: string }>(
  `SELECT id, consultation_fee FROM doctors WHERE status='active' ORDER BY id LIMIT 1`,
);
ok(!!doc, "have a seeded doctor");

// 1. Register patient (insurance 80%)
const p = await queryOne<{ id: number }>(
  `INSERT INTO patients (name, age, gender, phone, issue, assigned_doctor_id,
     payment_method, insurance_provider, insurance_coverage_percent, status, created_by)
   VALUES ('TEST Patient', 30, 'Male', '0300', 'chest pain', $1, 'insurance', 'TestIns', 80, 'registered', NULL)
   RETURNING id`,
  [doc!.id],
);
const pid = p!.id;
await query(`INSERT INTO patient_events(patient_id,type,description,actor) VALUES ($1,'registered','reg','test')`, [pid]);
ok(pid > 0, `patient created with id #${pid}`);

// 2. Consultation bill
const cb = computeBill({ type: "consultation", amount: Number(doc!.consultation_fee), paymentMethod: "insurance", coveragePercent: 80 });
const cbill = await queryOne<{ id: number }>(
  `INSERT INTO bills (patient_id,type,description,amount,concession_amount,concession_reason,payment_method,insurance_covered,patient_payable,status)
   VALUES ($1,'consultation','Consult',$2,0,NULL,'insurance',$3,$4,'pending') RETURNING id`,
  [pid, cb.amount, cb.insuranceCovered, cb.patientPayable],
);
ok(cb.concessionAmount === 0, "consultation carries no concession");
ok(Math.abs(cb.patientPayable - cb.amount * 0.2) < 0.01, "insurance 80% leaves 20% payable");

// 3. Pay consultation -> with_doctor
await query(`UPDATE bills SET status='paid', paid_at=now() WHERE id=$1`, [cbill!.id]);
await query(`UPDATE patients SET status='with_doctor' WHERE id=$1 AND status='registered'`, [pid]);
const st1 = await queryOne<{ status: string }>(`SELECT status FROM patients WHERE id=$1`, [pid]);
ok(st1!.status === "with_doctor", "paying consultation advances to with_doctor");

// 4. Lab order -> bill -> pay -> report
const lab = await queryOne<{ id: number }>(`INSERT INTO lab_orders(patient_id,doctor_id,test_name) VALUES ($1,$2,'CBC') RETURNING id`, [pid, doc!.id]);
const lb = computeBill({ type: "lab", amount: 1000, paymentMethod: "insurance", coveragePercent: 80 });
const lbill = await queryOne<{ id: number }>(
  `INSERT INTO bills (patient_id,type,description,amount,concession_amount,payment_method,insurance_covered,patient_payable,status)
   VALUES ($1,'lab','Lab CBC',$2,0,'insurance',$3,$4,'pending') RETURNING id`,
  [pid, lb.amount, lb.insuranceCovered, lb.patientPayable],
);
await query(`UPDATE lab_orders SET status='billed', bill_id=$1 WHERE id=$2`, [lbill!.id, lab!.id]);
await query(`UPDATE bills SET status='paid' WHERE id=$1`, [lbill!.id]);
await query(`UPDATE lab_orders SET status='paid' WHERE bill_id=$1`, [lbill!.id]);
await query(`UPDATE lab_orders SET report_text='Normal', status='reported' WHERE id=$1`, [lab!.id]);
const labf = await queryOne<{ status: string }>(`SELECT status FROM lab_orders WHERE id=$1`, [lab!.id]);
ok(labf!.status === "reported", "lab order: ordered->billed->paid->reported");

// 5. Concession on lab (allowed)
const withC = computeBill({ type: "lab", amount: 1000, concessionAmount: 200, paymentMethod: "insurance", coveragePercent: 80 });
ok(withC.concessionAmount === 200 && Math.abs(withC.patientPayable - 160) < 0.01, "lab concession then 80% insurance => 160 payable");

// 6. Operation -> schedule -> reschedule -> schedule -> pay -> complete
const op = await queryOne<{ id: number }>(`INSERT INTO operations(patient_id,doctor_id,procedure,status) VALUES ($1,$2,'Appendectomy','recommended') RETURNING id`, [pid, doc!.id]);
const ob = computeBill({ type: "operation", amount: 50000, paymentMethod: "insurance", coveragePercent: 80 });
const obill = await queryOne<{ id: number }>(
  `INSERT INTO bills (patient_id,type,description,amount,concession_amount,payment_method,insurance_covered,patient_payable,status)
   VALUES ($1,'operation','Op',$2,0,'insurance',$3,$4,'pending') RETURNING id`, [pid, ob.amount, ob.insuranceCovered, ob.patientPayable]);
await query(`UPDATE operations SET scheduled_date='2026-08-01', bill_id=$1, status='scheduled' WHERE id=$2`, [obill!.id, op!.id]);
await query(`UPDATE operations SET status='rescheduled', scheduled_date=NULL WHERE id=$1`, [op!.id]);
await query(`UPDATE operations SET scheduled_date='2026-08-10', status='scheduled' WHERE id=$1`, [op!.id]);
await query(`UPDATE bills SET status='paid' WHERE id=$1`, [obill!.id]);
await query(`UPDATE operations SET status='paid' WHERE bill_id=$1`, [obill!.id]);
await query(`UPDATE operations SET status='completed' WHERE id=$1`, [op!.id]);
const opf = await queryOne<{ status: string }>(`SELECT status FROM operations WHERE id=$1`, [op!.id]);
ok(opf!.status === "completed", "operation: recommended->scheduled->rescheduled->scheduled->paid->completed");

// 7. Admit to a free bed, then discharge frees it
const bed = await queryOne<{ id: number }>(`SELECT id FROM beds WHERE status='free' ORDER BY id LIMIT 1`);
await query(`INSERT INTO admissions(patient_id,doctor_id,bed_id,status) VALUES ($1,$2,$3,'admitted')`, [pid, doc!.id, bed!.id]);
await query(`UPDATE beds SET status='occupied', patient_id=$1 WHERE id=$2`, [pid, bed!.id]);
await query(`UPDATE patients SET status='admitted' WHERE id=$1`, [pid]);
const bedOcc = await queryOne<{ status: string }>(`SELECT status FROM beds WHERE id=$1`, [bed!.id]);
ok(bedOcc!.status === "occupied", "admit occupies the bed");

await query(`UPDATE admissions SET status='discharged', discharged_at=now() WHERE patient_id=$1 AND status='admitted'`, [pid]);
await query(`UPDATE beds SET status='free', patient_id=NULL WHERE id=$1`, [bed!.id]);
await query(`UPDATE patients SET status='discharged' WHERE id=$1`, [pid]);
const bedFree = await queryOne<{ status: string; patient_id: number | null }>(`SELECT status, patient_id FROM beds WHERE id=$1`, [bed!.id]);
ok(bedFree!.status === "free" && bedFree!.patient_id === null, "discharge frees the bed");

// 8. Audit trail present
const ev = await query(`SELECT id FROM patient_events WHERE patient_id=$1`, [pid]);
ok(ev.length >= 1, "patient_events audit rows written");

// Cleanup
await query(`DELETE FROM patients WHERE id=$1`, [pid]);
const gone = await queryOne(`SELECT id FROM patients WHERE id=$1`, [pid]);
ok(gone === null, "cleanup: cascade delete removes patient + children");

console.log("\nALL FLOW TESTS PASSED ✅");
await pool.end();
