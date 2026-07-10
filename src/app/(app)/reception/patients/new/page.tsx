import { requireRole } from "@/lib/session";
import { getDoctors, getSymptomRoutes } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import NewPatientForm from "./new-patient-form";

export default async function NewPatientPage() {
  await requireRole("receptionist");
  const [doctors, routes] = await Promise.all([getDoctors(true), getSymptomRoutes()]);
  // Distinct issue options (from the seeded symptom → specialist graph).
  const issues = [...new Set(routes.map((r) => r.symptom))].sort();
  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="Register New Patient"
        subtitle="A patient ID is auto-generated. Choose the issue to route them to the right specialist (Graph shortest-path)."
      />
      <NewPatientForm
        issues={issues}
        doctors={doctors.map((d) => ({
          id: d.id,
          name: d.name,
          specialty: d.specialty ?? "",
          fee: Number(d.consultation_fee),
          rating: Number(d.rating),
        }))}
      />
    </div>
  );
}
