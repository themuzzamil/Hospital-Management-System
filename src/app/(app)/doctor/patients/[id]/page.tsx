import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import {
  getPatient,
  getPatientNotes,
  getPatientLabOrders,
  getPatientOperations,
  getPatientEvents,
  getDoctor,
} from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import TimelineViewer from "@/components/timeline-viewer";
import ClinicalConsole from "./clinical-console";

export default async function DoctorPatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("doctor");
  const { id } = await params;
  const patientId = Number(id);
  const patient = await getPatient(patientId);
  if (!patient) notFound();
  // A doctor may only open patients assigned to them.
  if (patient.assigned_doctor_id !== user.doctorId) notFound();

  const [notes, labs, operations, events, doctor] = await Promise.all([
    getPatientNotes(patientId),
    getPatientLabOrders(patientId),
    getPatientOperations(patientId),
    getPatientEvents(patientId),
    patient.assigned_doctor_id ? getDoctor(patient.assigned_doctor_id) : Promise.resolve(null),
  ]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title={`#${patient.id} · ${patient.name}`}
        subtitle={`${patient.age ?? "—"} yrs · ${patient.gender ?? "—"} · ${patient.issue ?? "no issue noted"}`}
        action={<Link href="/doctor/patients" className="btn-outline"><Icon name="back" size={16} /> My patients</Link>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 flex items-center gap-4 text-sm">
            <StatusBadge status={patient.status} />
            <span className="text-muted">Specialty:</span> {doctor?.specialty ?? "—"}
          </div>
          <ClinicalConsole patientId={patient.id} patientStatus={patient.status} notes={notes} labs={labs} operations={operations} />
        </div>
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <h2 className="font-semibold mb-1">Patient timeline</h2>
            <p className="text-xs text-muted mb-4">Doubly linked list — O(1) forward/back.</p>
            <TimelineViewer events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
