import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import {
  getPatient,
  getPatientBills,
  getPatientEvents,
  getPatientLabOrders,
  getPatientOperations,
  getPatientAdmission,
  getPatientFollowups,
  getFreeBeds,
  getDoctor,
} from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import TimelineViewer from "@/components/timeline-viewer";
import PatientConsole from "./patient-console";

export default async function PatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("receptionist");
  const { id } = await params;
  const patientId = Number(id);
  const patient = await getPatient(patientId);
  if (!patient) notFound();

  const [bills, labs, operations, admission, followups, events, freeBeds, doctor] =
    await Promise.all([
      getPatientBills(patientId),
      getPatientLabOrders(patientId),
      getPatientOperations(patientId),
      getPatientAdmission(patientId),
      getPatientFollowups(patientId),
      getPatientEvents(patientId),
      getFreeBeds(),
      patient.assigned_doctor_id ? getDoctor(patient.assigned_doctor_id) : Promise.resolve(null),
    ]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title={`#${patient.id} · ${patient.name}`}
        subtitle={`${patient.age ?? "—"} yrs · ${patient.gender ?? "—"} · ${patient.phone ?? "no phone"}`}
        action={<Link href="/reception/patients" className="btn-outline"><Icon name="back" size={16} /> All patients</Link>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <Info label="Status"><StatusBadge status={patient.status} /></Info>
              <Info label="Doctor">{doctor?.name ?? "—"}</Info>
              <Info label="Issue">{patient.issue ?? "—"}</Info>
              <Info label="Specialty">{doctor?.specialty ?? "—"}</Info>
              <Info label="Payment">
                {patient.payment_method === "insurance"
                  ? `Insurance · ${patient.insurance_provider ?? ""} · ${patient.insurance_coverage_percent}%`
                  : "Self-pay"}
              </Info>
              <Info label="Address">{patient.address ?? "—"}</Info>
            </div>
          </div>

          <PatientConsole
            patient={patient}
            bills={bills}
            labs={labs}
            operations={operations}
            admission={admission}
            freeBeds={freeBeds.map((b) => ({ id: b.id, label: b.label, ward_name: b.ward_name }))}
            followups={followups}
          />
        </div>

        {/* Timeline (doubly linked list) */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <h2 className="font-semibold mb-1">Patient timeline</h2>
            <p className="text-xs text-muted mb-4">
              Doubly linked list — walk forward/back in O(1).
            </p>
            <TimelineViewer events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-muted">{label}</span>
      <span className="font-medium">{children}</span>
    </>
  );
}
