"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markBillPaid,
  applyConcession,
  billLabOrder,
  generateLabReport,
  scheduleOperation,
  rescheduleOperation,
  completeOperation,
  admitPatient,
  dischargePatient,
  scheduleFollowup,
  markRevisited,
} from "@/lib/actions";
import { money } from "@/lib/billing";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Bill, LabOrder, Operation, Patient, Admission } from "@/lib/types";

type FreeBed = { id: number; label: string; ward_name: string };
type Followup = { id: number; scheduled_date: string | null; status: string };

export default function PatientConsole({
  patient,
  bills,
  labs,
  operations,
  admission,
  freeBeds,
  followups,
}: {
  patient: Patient;
  bills: Bill[];
  labs: LabOrder[];
  operations: Operation[];
  admission: Admission | null;
  freeBeds: FreeBed[];
  followups: Followup[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const operationDone = operations.some((o) => o.status === "completed");
  const canDischarge =
    patient.status === "admitted" || (operationDone && patient.status !== "discharged");

  return (
    <div className="space-y-6">
      {/* Bills */}
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Bills</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-muted">No bills.</p>
        ) : (
          <div className="space-y-2">
            {bills.map((b) => (
              <BillRow key={b.id} bill={b} pending={pending} run={run} />
            ))}
          </div>
        )}
      </section>

      {/* Lab orders */}
      {labs.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Lab tests</h2>
          <div className="space-y-2">
            {labs.map((l) => (
              <LabRow key={l.id} lab={l} pending={pending} run={run} />
            ))}
          </div>
        </section>
      )}

      {/* Operations */}
      {operations.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Operations</h2>
          <div className="space-y-2">
            {operations.map((o) => (
              <OperationRow key={o.id} op={o} pending={pending} run={run} />
            ))}
          </div>
        </section>
      )}

      {/* Follow-up visits (reschedule) */}
      {followups.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Follow-up visits</h2>
          <div className="space-y-2">
            {followups.map((f) => (
              <FollowupRow key={f.id} followup={f} pending={pending} run={run} />
            ))}
          </div>
        </section>
      )}

      {/* Admission / discharge */}
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Admission</h2>
        {admission ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">Admitted to bed #{admission.bed_id}.</p>
            <button
              className="btn-outline"
              disabled={pending}
              onClick={() => run(() => dischargePatient(patient.id))}
            >
              Discharge
            </button>
          </div>
        ) : patient.status === "discharged" ? (
          <p className="text-sm text-muted">Patient discharged — record archived.</p>
        ) : (
          <AdmitPanel patientId={patient.id} freeBeds={freeBeds} pending={pending} run={run} />
        )}
        {canDischarge && !admission && operationDone && patient.status !== "discharged" && (
          <button
            className="btn-primary mt-3"
            disabled={pending}
            onClick={() => run(() => dischargePatient(patient.id))}
          >
            Operation done — Discharge patient
          </button>
        )}
      </section>
    </div>
  );
}

function BillRow({ bill, pending, run }: { bill: Bill; pending: boolean; run: (f: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("");
  const canConcession = bill.type !== "consultation" && bill.status === "pending";

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{bill.description}</p>
          <p className="text-xs text-muted">
            {money(bill.amount)}
            {Number(bill.concession_amount) > 0 && <> · concession −{money(bill.concession_amount)}</>}
            {Number(bill.insurance_covered) > 0 && <> · insurance −{money(bill.insurance_covered)}</>}
            {" · "}payable <span className="font-semibold text-foreground">{money(bill.patient_payable)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={bill.status} />
          {bill.status === "pending" && (
            <button className="btn-primary px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => markBillPaid(bill.id))}>
              Mark paid
            </button>
          )}
          {canConcession && (
            <button className="btn-outline px-3 py-1 text-xs" onClick={() => setOpen((o) => !o)}>
              Concession
            </button>
          )}
        </div>
      </div>
      {open && canConcession && (
        <div className="flex gap-2 mt-3">
          <input className="input" placeholder="Amount" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            className="btn-outline whitespace-nowrap"
            disabled={pending || !amt || !reason}
            onClick={() => run(async () => { await applyConcession(bill.id, Number(amt), reason); setOpen(false); })}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function LabRow({ lab, pending, run }: { lab: LabOrder; pending: boolean; run: (f: () => Promise<void>) => void }) {
  const [amt, setAmt] = useState("");

  function downloadReport() {
    if (!lab.report_text) return;
    const blob = new Blob([lab.report_text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-report-${lab.id}-${lab.test_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{lab.test_name}</p>
        <StatusBadge status={lab.status} />
      </div>
      {lab.status === "ordered" && (
        <div className="flex gap-2 mt-2">
          <input className="input" type="number" placeholder="Bill amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button className="btn-outline whitespace-nowrap" disabled={pending || !amt} onClick={() => run(() => billLabOrder(lab.id, Number(amt)))}>
            Generate bill
          </button>
        </div>
      )}
      {lab.status === "billed" && (
        <p className="text-xs text-muted mt-2">Waiting for the lab bill to be paid before the report can be generated.</p>
      )}
      {lab.status === "paid" && (
        <div className="mt-2">
          <button className="btn-outline" disabled={pending} onClick={() => run(() => generateLabReport(lab.id))}>
            <Icon name="file" size={16} /> Generate report
          </button>
        </div>
      )}
      {lab.status === "reported" && lab.report_text && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Report ready</span>
            <button className="btn-outline px-3 py-1 text-xs" onClick={downloadReport}>
              <Icon name="download" size={14} /> Download
            </button>
          </div>
          <pre className="text-xs bg-background rounded p-3 whitespace-pre-wrap font-mono leading-relaxed border border-border">{lab.report_text}</pre>
        </div>
      )}
    </div>
  );
}

function FollowupRow({ followup, pending, run }: { followup: Followup; pending: boolean; run: (f: () => Promise<void>) => void }) {
  const [date, setDate] = useState(followup.scheduled_date ?? "");
  const needsDate = !followup.scheduled_date || followup.status === "rescheduled";
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {followup.scheduled_date ? `Revisit on ${followup.scheduled_date}` : "Follow-up requested — assign a date"}
        </p>
        <StatusBadge status={followup.status} />
      </div>
      <div className="flex gap-2 mt-2">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button
          className="btn-outline whitespace-nowrap"
          disabled={pending || !date}
          onClick={() => run(() => scheduleFollowup(followup.id, date))}
        >
          {needsDate ? "Assign date" : "Reschedule"}
        </button>
        {followup.status === "scheduled" && (
          <button className="btn-primary whitespace-nowrap" disabled={pending} onClick={() => run(() => markRevisited(followup.id))}>
            Patient revisited
          </button>
        )}
      </div>
    </div>
  );
}

function OperationRow({ op, pending, run }: { op: Operation; pending: boolean; run: (f: () => Promise<void>) => void }) {
  const [date, setDate] = useState("");
  const [amt, setAmt] = useState("");
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{op.procedure}</p>
          {op.scheduled_date && <p className="text-xs text-muted">Scheduled: {op.scheduled_date}</p>}
        </div>
        <StatusBadge status={op.status} />
      </div>
      {(op.status === "recommended" || op.status === "rescheduled") && (
        <div className="flex gap-2 mt-2">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" type="number" placeholder="Fee" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button className="btn-outline whitespace-nowrap" disabled={pending || !date || !amt} onClick={() => run(() => scheduleOperation(op.id, date, Number(amt)))}>
            Schedule
          </button>
        </div>
      )}
      {op.status === "scheduled" && (
        <p className="text-xs text-warning mt-2">Awaiting payment before {op.scheduled_date}. If unpaid, reschedule.</p>
      )}
      {(op.status === "scheduled" || op.status === "paid") && (
        <div className="flex gap-2 mt-2">
          {op.status === "paid" && (
            <button className="btn-primary px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => completeOperation(op.id))}>
              Mark completed
            </button>
          )}
          <button className="btn-outline px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => rescheduleOperation(op.id))}>
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

function AdmitPanel({ patientId, freeBeds, pending, run }: { patientId: number; freeBeds: FreeBed[]; pending: boolean; run: (f: () => Promise<void>) => void }) {
  const [bedId, setBedId] = useState<number | "">("");
  const [rate, setRate] = useState("5000");
  if (freeBeds.length === 0) return <p className="text-sm text-warning">No free beds available.</p>;
  return (
    <div className="flex gap-2">
      <select className="input" value={bedId} onChange={(e) => setBedId(e.target.value === "" ? "" : Number(e.target.value))}>
        <option value="">Select free bed…</option>
        {freeBeds.map((b) => (
          <option key={b.id} value={b.id}>{b.ward_name} · {b.label}</option>
        ))}
      </select>
      <input className="input max-w-[140px]" type="number" placeholder="Daily rate" value={rate} onChange={(e) => setRate(e.target.value)} />
      <button className="btn-outline whitespace-nowrap" disabled={pending || bedId === ""} onClick={() => run(() => admitPatient(patientId, Number(bedId), Number(rate)))}>
        Admit
      </button>
    </div>
  );
}
