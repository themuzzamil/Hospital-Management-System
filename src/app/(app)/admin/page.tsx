import { requireRole } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { PageHeader } from "@/components/shell";
import { StatCard } from "@/components/ui";

export default async function AdminDashboard() {
  await requireRole("admin");
  const row = await queryOne<{
    doctors: string;
    receptionists: string;
    patients: string;
    beds: string;
    occupied: string;
  }>(
    `SELECT
      (SELECT count(*) FROM doctors WHERE status='active') AS doctors,
      (SELECT count(*) FROM "user" WHERE role='receptionist') AS receptionists,
      (SELECT count(*) FROM patients) AS patients,
      (SELECT count(*) FROM beds) AS beds,
      (SELECT count(*) FROM beds WHERE status='occupied') AS occupied`,
  );

  return (
    <div className="p-8">
      <PageHeader title="Administration" subtitle="Manage staff, doctors and hospital capacity." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active doctors" value={Number(row?.doctors ?? 0)} icon="stethoscope" href="/admin/doctors" />
        <StatCard label="Receptionists" value={Number(row?.receptionists ?? 0)} icon="users" href="/admin/staff" />
        <StatCard label="Total patients" value={Number(row?.patients ?? 0)} icon="users" />
        <StatCard label="Beds occupied" value={`${row?.occupied ?? 0} / ${row?.beds ?? 0}`} icon="bed" href="/admin/wards" />
      </div>
    </div>
  );
}
