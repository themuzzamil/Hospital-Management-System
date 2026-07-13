import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients, getReceptionStats } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatCard, StatusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function ReceptionDashboard() {
  await requireRole("receptionist");
  const [stats, patients] = await Promise.all([
    getReceptionStats(),
    getPatients(),
  ]);
  const recent = patients.slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Reception Desk"
        subtitle="Register patients, route them to specialists, and manage billing."
        action={
          <Link href="/reception/patients/new" className="btn-primary">
            <Icon name="plus" size={16} /> New Patient
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Waiting" value={stats.waiting} icon="clock" href="/reception/queue" />
        <StatCard label="Newly registered" value={stats.registered} icon="userPlus" />
        <StatCard label="Pending bills" value={stats.pendingBills} icon="receipt" href="/reception/billing" />
        <StatCard label="Admitted" value={stats.admitted} icon="bed" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">
          Recent patients
        </div>
        {recent.length === 0 ? (
          <EmptyState>
            No patients yet.{" "}
            <Link href="/reception/patients/new" className="text-primary underline">
              Register the first one
            </Link>
            .
          </EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background text-muted text-left">
              <tr>
                <th className="px-5 py-2 font-medium">ID</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Issue</th>
                <th className="px-5 py-2 font-medium">Doctor</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background">
                  <td className="px-5 py-2 font-mono">#{p.id}</td>
                  <td className="px-5 py-2">
                    <Link href={`/reception/patients/${p.id}`} className="text-primary hover:underline font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-muted">{p.issue ?? "—"}</td>
                  <td className="px-5 py-2">{p.doctor_name ?? "—"}</td>
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
