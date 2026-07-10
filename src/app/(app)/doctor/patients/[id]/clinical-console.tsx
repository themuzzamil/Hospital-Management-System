"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addNote,
  orderLab,
  recommendOperation,
  recommendAdmission,
  completeCheckup,
  requestFollowup,
} from "@/lib/actions";
import { LAB_TESTS, PROCEDURES } from "@/lib/catalog";
import { SinglyLinkedList } from "@/lib/dsa";
import { StatusBadge } from "@/components/ui";
import type { Note, LabOrder, Operation } from "@/lib/types";

export default function ClinicalConsole({
  patientId,
  patientStatus,
  notes,
  labs,
  operations,
}: {
  patientId: number;
  patientStatus: string;
  notes: Note[];
  labs: LabOrder[];
  operations: Operation[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const [note, setNote] = useState("");
  const [test, setTest] = useState("");
  const [proc, setProc] = useState("");

  // Doctor notes are appended to a hand-written Singly Linked List, then read
  // front-to-back — the chronological log the structure is built for.
  const noteList = new SinglyLinkedList<Note>();
  notes.forEach((n) => noteList.append(n));
  const orderedNotes = noteList.toArray();

  return (
    <div className="space-y-6">
      {/* Notes */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Notes</h2>
        <p className="text-xs text-muted mb-3">Appended to a singly linked list (chronological log).</p>
        <div className="flex gap-2 mb-4">
          <input className="input" placeholder="Write a clinical note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary whitespace-nowrap" disabled={pending || !note.trim()} onClick={() => run(async () => { await addNote(patientId, note.trim()); setNote(""); })}>Add note</button>
        </div>
        {orderedNotes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {orderedNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                <p>{n.body}</p>
                <p className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Clinical orders */}
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Clinical actions</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Order a lab test</label>
            <div className="flex gap-2">
              <select className="input" value={test} onChange={(e) => setTest(e.target.value)}>
                <option value="">Select a lab test…</option>
                {LAB_TESTS.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              <button className="btn-outline whitespace-nowrap" disabled={pending || !test} onClick={() => run(async () => { await orderLab(patientId, test); setTest(""); })}>Order lab</button>
            </div>
          </div>
          <div>
            <label className="label">Recommend an operation</label>
            <div className="flex gap-2">
              <select className="input" value={proc} onChange={(e) => setProc(e.target.value)}>
                <option value="">Select a procedure…</option>
                {PROCEDURES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button className="btn-outline whitespace-nowrap" disabled={pending || !proc} onClick={() => run(async () => { await recommendOperation(patientId, proc); setProc(""); })}>Recommend</button>
            </div>
          </div>
          <div>
            <span className="label">Admission</span>
            <button className="btn-outline" disabled={pending} onClick={() => run(() => recommendAdmission(patientId))}>Recommend admission</button>
          </div>
        </div>
      </section>

      {/* Visit outcome — every patient ends here; the orders above are optional */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Visit outcome</h2>
        <p className="text-xs text-muted mb-3">
          Close the visit, or ask the patient to return — the receptionist assigns the follow-up date.
        </p>
        {patientStatus === "checkup_complete" ? (
          <p className="text-sm text-success">This checkup is marked complete.</p>
        ) : patientStatus === "follow_up" ? (
          <p className="text-sm text-warning">Follow-up requested — awaiting a date from reception.</p>
        ) : patientStatus === "with_doctor" ? (
          <div className="flex gap-2">
            <button className="btn-primary" disabled={pending} onClick={() => run(() => completeCheckup(patientId))}>
              Complete checkup
            </button>
            <button className="btn-outline" disabled={pending} onClick={() => run(() => requestFollowup(patientId))}>
              Request follow-up
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            The patient must pay the consultation and be in your queue before the visit can be closed.
          </p>
        )}
      </section>

      {/* Existing orders (read-only for doctor) */}
      {(labs.length > 0 || operations.length > 0) && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Order status</h2>
          <div className="space-y-2 text-sm">
            {labs.map((l) => (
              <div key={l.id} className="flex justify-between items-center rounded-lg border border-border p-2">
                <span>{l.test_name}</span><StatusBadge status={l.status} />
              </div>
            ))}
            {operations.map((o) => (
              <div key={o.id} className="flex justify-between items-center rounded-lg border border-border p-2">
                <span>{o.procedure}{o.scheduled_date ? ` · ${o.scheduled_date}` : ""}</span><StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
