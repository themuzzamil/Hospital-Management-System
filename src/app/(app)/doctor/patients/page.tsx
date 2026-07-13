import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatusBadge, EmptyState } from "@/components/ui";

export default async function DoctorPatients() {
  const user = await requireRole("doctor");
  const patients = user.doctorId ? await getPatients({ doctorId: user.doctorId }) : [];
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader title="My Patients" subtitle="Everyone assigned to you." />
      {patients.length === 0 ? (
        <EmptyState>No patients assigned yet.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted text-left">
              <tr>
                <th className="px-5 py-2 font-medium">ID</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Age</th>
                <th className="px-5 py-2 font-medium">Issue</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background">
                  <td className="px-5 py-2 font-mono">#{p.id}</td>
                  <td className="px-5 py-2">
                    <Link href={`/doctor/patients/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                  </td>
                  <td className="px-5 py-2">{p.age ?? "—"}</td>
                  <td className="px-5 py-2 text-muted">{p.issue ?? "—"}</td>
                  <td className="px-5 py-2"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
