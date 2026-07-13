import Link from "next/link";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shell";
import { StatusBadge, EmptyState } from "@/components/ui";
import { money } from "@/lib/billing";
import PayButton from "@/components/pay-button";
import type { Bill } from "@/lib/types";

export default async function BillingPage() {
  await requireRole("receptionist");
  const bills = await query<Bill & { patient_name: string }>(
    `SELECT b.*, p.name AS patient_name
       FROM bills b JOIN patients p ON p.id = b.patient_id
      ORDER BY (b.status='pending') DESC, b.id DESC`,
  );
  const pending = bills.filter((b) => b.status === "pending");

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Billing"
        subtitle={`${pending.length} pending · ${money(pending.reduce((s, b) => s + Number(b.patient_payable), 0))} outstanding`}
      />
      {bills.length === 0 ? (
        <EmptyState>No bills yet.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted text-left">
              <tr>
                <th className="px-5 py-2 font-medium">Bill</th>
                <th className="px-5 py-2 font-medium">Patient</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Payable</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-background">
                  <td className="px-5 py-2 font-mono">#{b.id}</td>
                  <td className="px-5 py-2">
                    <Link href={`/reception/patients/${b.patient_id}`} className="text-primary hover:underline">
                      {b.patient_name}
                    </Link>
                  </td>
                  <td className="px-5 py-2 capitalize">{b.type}</td>
                  <td className="px-5 py-2 font-medium">{money(b.patient_payable)}</td>
                  <td className="px-5 py-2"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-2 text-right">
                    {b.status === "pending" && <PayButton billId={b.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
