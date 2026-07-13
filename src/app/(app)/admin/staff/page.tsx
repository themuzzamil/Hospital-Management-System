import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shell";
import StaffManager from "./staff-manager";

export default async function AdminStaff() {
  await requireRole("admin");
  const staff = await query<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM "user" WHERE role='receptionist' ORDER BY name`,
  );
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader title="Receptionists" subtitle="Create front-desk accounts." />
      <StaffManager staff={staff} />
    </div>
  );
}
