import Link from "next/link";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { Queue } from "@/lib/dsa";
import { PageHeader } from "@/components/shell";
import { StatusBadge, EmptyState } from "@/components/ui";
import type { Patient } from "@/lib/types";

export default async function QueuePage() {
  await requireRole("receptionist");
  const waiting = await query<Patient & { doctor_name: string | null }>(
    `SELECT p.*, d.name AS doctor_name
       FROM patients p LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
      WHERE p.status IN ('registered','with_doctor')
      ORDER BY p.created_at ASC`,
  );

  // Feed the real waiting list through the hand-written FIFO Queue.
  const q = new Queue<Patient & { doctor_name: string | null }>();
  waiting.forEach((p) => q.enqueue(p));
  const ordered = q.toArray();

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Waiting Queue"
        subtitle="First-come, first-served — modelled by the hand-written Queue (FIFO). Front of the line is served next."
      />
      {ordered.length === 0 ? (
        <EmptyState>The waiting room is empty.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {ordered.map((p, i) => (
            <li key={p.id} className="card p-4 flex items-center gap-4">
              <span className={`shrink-0 h-8 w-8 rounded-full grid place-items-center text-sm font-semibold ${i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
                {i + 1}
              </span>
              <div className="flex-1">
                <Link href={`/reception/patients/${p.id}`} className="font-medium text-primary hover:underline">
                  #{p.id} · {p.name}
                </Link>
                <p className="text-xs text-muted">{p.issue ?? "—"} · {p.doctor_name ?? "unassigned"}</p>
              </div>
              {i === 0 && <span className="badge-green">front / dequeue next</span>}
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
