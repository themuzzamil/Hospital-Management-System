import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getPatients } from "@/lib/data";
import { Queue } from "@/lib/dsa";
import { PageHeader } from "@/components/shell";
import { EmptyState } from "@/components/ui";

export default async function DoctorQueue() {
  const user = await requireRole("doctor");
  const patients = user.doctorId ? await getPatients({ doctorId: user.doctorId, status: "with_doctor" }) : [];
  const q = new Queue<(typeof patients)[number]>();
  patients.forEach((p) => q.enqueue(p));
  const ordered = q.toArray();

  return (
    <div className="p-8">
      <PageHeader title="My Queue" subtitle="Patients who paid the consultation and are waiting to be seen (FIFO Queue)." />
      {ordered.length === 0 ? (
        <EmptyState>No one is waiting.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {ordered.map((p, i) => (
            <li key={p.id} className="card p-4 flex items-center gap-4">
              <span className={`shrink-0 h-8 w-8 rounded-full grid place-items-center text-sm font-semibold ${i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
              <div className="flex-1">
                <Link href={`/doctor/patients/${p.id}`} className="font-medium text-primary hover:underline">#{p.id} · {p.name}</Link>
                <p className="text-xs text-muted">{p.issue ?? "—"}</p>
              </div>
              {i === 0 && <span className="badge-green">see next</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
