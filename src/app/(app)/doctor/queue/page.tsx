import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients } from "@/lib/data";
import { MinPriorityQueue } from "@/lib/dsa";
import { PageHeader } from "@/components/shell";
import { EmptyState, SeverityBadge } from "@/components/ui";

export default async function DoctorQueue() {
  const user = await requireRole("doctor");
  const patients = user.doctorId
    ? await getPatients({ doctorId: user.doctorId, status: "with_doctor" })
    : [];

  // Sort by arrival time first so that, within the SAME severity, the patient
  // who has waited longest wins the tie (fair FIFO fallback).
  const byArrival = [...patients].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Feed everyone through the hand-written Min Priority Queue. Composite
  // priority = severity as the primary key, arrival index as the tiebreaker
  // (arrivalIndex < 1e6 so it can never override a difference in severity).
  const pq = new MinPriorityQueue<(typeof byArrival)[number]>();
  byArrival.forEach((p, i) => pq.enqueue(p, p.severity * 1_000_000 + i));

  // Dequeue everyone into triage order (most-critical, then longest-waiting).
  const ordered: typeof byArrival = [];
  while (!pq.isEmpty()) ordered.push(pq.dequeue()!);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="My Queue"
        subtitle="Triage order — most-critical patient first (hand-written Min Priority Queue). Ties broken by who has waited longest (FIFO)."
      />
      {ordered.length === 0 ? (
        <EmptyState>No one is waiting.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {ordered.map((p, i) => (
            <li key={p.id} className="card p-4 flex items-center gap-4">
              <span className={`shrink-0 h-8 w-8 rounded-full grid place-items-center text-sm font-semibold ${i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link href={`/doctor/patients/${p.id}`} className="font-medium text-primary hover:underline">#{p.id} · {p.name}</Link>
                <p className="text-xs text-muted">{p.issue ?? "—"}</p>
              </div>
              <SeverityBadge level={p.severity} />
              {i === 0 && <span className="badge-green">see next</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
