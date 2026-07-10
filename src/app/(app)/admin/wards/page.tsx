import { requireRole } from "@/lib/session";
import { getWardsWithBeds } from "@/lib/data";
import { PageHeader } from "@/components/shell";

export default async function AdminWards() {
  await requireRole("admin");
  const wards = await getWardsWithBeds();

  return (
    <div className="p-8">
      <PageHeader title="Wards & Beds" subtitle="Live bed occupancy. Beds free up automatically on discharge." />
      <div className="space-y-6">
        {wards.map((w) => {
          const occupied = w.beds.filter((b) => b.status === "occupied").length;
          return (
            <div key={w.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{w.name}</h2>
                <span className="text-sm text-muted">{occupied} / {w.beds.length} occupied</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {w.beds.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3 text-center ${
                      b.status === "occupied"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <div className="font-semibold text-sm">{b.label}</div>
                    <div className="text-xs">
                      {b.status === "occupied" ? `Patient #${b.patient_id}` : "Free"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
