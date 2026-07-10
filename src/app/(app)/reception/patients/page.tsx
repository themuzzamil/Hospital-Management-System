import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients } from "@/lib/data";
import { PageHeader } from "@/components/shell";
import { StatusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("receptionist");
  const { q, status } = await searchParams;
  const patients = await getPatients({ search: q, status });

  return (
    <div className="p-8">
      <PageHeader
        title="Patients"
        subtitle="Search by name or ID (hash-map / BST lookup). Click a patient to open their record."
        action={
          <Link href="/reception/patients/new" className="btn-primary">
            <Icon name="plus" size={16} /> New Patient
          </Link>
        }
      />

      <form className="flex gap-2 mb-4" action="/reception/patients">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search name or #ID…" />
        <select name="status" defaultValue={status} className="input max-w-[180px]">
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="with_doctor">With doctor</option>
          <option value="follow_up">Follow-up</option>
          <option value="checkup_complete">Checkup complete</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
        </select>
        <button className="btn-outline">Search</button>
      </form>

      {patients.length === 0 ? (
        <EmptyState>No patients match.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted text-left">
              <tr>
                <th className="px-5 py-2 font-medium">ID</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Age</th>
                <th className="px-5 py-2 font-medium">Phone</th>
                <th className="px-5 py-2 font-medium">Issue</th>
                <th className="px-5 py-2 font-medium">Doctor</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background">
                  <td className="px-5 py-2 font-mono">#{p.id}</td>
                  <td className="px-5 py-2">
                    <Link href={`/reception/patients/${p.id}`} className="text-primary hover:underline font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2">{p.age ?? "—"}</td>
                  <td className="px-5 py-2">{p.phone ?? "—"}</td>
                  <td className="px-5 py-2 text-muted">{p.issue ?? "—"}</td>
                  <td className="px-5 py-2">{p.doctor_name ?? "—"}</td>
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
