import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatCard, StatusBadge, EmptyState } from "@/components/ui";

export default async function DoctorDashboard() {
  const user = await requireRole("doctor");
  const patients = user.doctorId ? await getPatients({ doctorId: user.doctorId }) : [];
  const waiting = patients.filter((p) => p.status === "with_doctor");
  const admitted = patients.filter((p) => p.status === "admitted");

  return (
    <div className="p-8">
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your patients and clinical actions." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="In your queue" value={waiting.length} icon="clock" href="/doctor/queue" />
        <StatCard label="Total patients" value={patients.length} icon="users" href="/doctor/patients" />
        <StatCard label="Admitted" value={admitted.length} icon="bed" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">Waiting for you</div>
        {waiting.length === 0 ? (
          <EmptyState>No patients waiting.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background text-muted text-left">
              <tr>
                <th className="px-5 py-2 font-medium">ID</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Issue</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background">
                  <td className="px-5 py-2 font-mono">#{p.id}</td>
                  <td className="px-5 py-2">
                    <Link href={`/doctor/patients/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                  </td>
                  <td className="px-5 py-2 text-muted">{p.issue ?? "—"}</td>
                  <td className="px-5 py-2"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
