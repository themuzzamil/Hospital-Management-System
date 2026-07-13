import { requireRole } from "@/lib/session";
import { getDoctors, getSpecialties } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import DoctorsManager from "./doctors-manager";

export default async function AdminDoctors() {
  await requireRole("admin");
  const [doctors, specialties] = await Promise.all([getDoctors(), getSpecialties()]);
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader title="Doctors" subtitle="Create, edit, activate/deactivate or remove doctors." />
      <DoctorsManager doctors={doctors} specialties={specialties} />
    </div>
  );
}
