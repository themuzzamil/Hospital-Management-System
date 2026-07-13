import { requireUser } from "@/lib/session";
import { COMPLEXITY_REGISTRY } from "@/lib/dsa";
import { PageHeader } from "@/components/shell";
import LiveDemos from "./live-demos";

export default async function DsaGallery() {
  await requireUser();
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="DSA Gallery"
        subtitle="Every structure below is hand-written in src/lib/dsa (no libraries) and drives a real feature of this hospital system."
      />
      <LiveDemos />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {COMPLEXITY_REGISTRY.map((c) => (
          <div key={c.name} className="card p-5">
            <h2 className="font-semibold text-lg">{c.name}</h2>
            <p className="text-sm text-primary mt-1">{c.usedFor}</p>
            <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead className="text-muted text-left">
                <tr>
                  <th className="py-1 font-medium">Operation</th>
                  <th className="py-1 font-medium">Time</th>
                  <th className="py-1 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {c.operations.map((op) => (
                  <tr key={op.name} className="border-t border-border">
                    <td className="py-1.5 font-mono">{op.name}</td>
                    <td className="py-1.5">
                      <span className="badge-blue font-mono">{op.time}</span>
                    </td>
                    <td className="py-1.5 text-muted text-xs">{op.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="text-xs text-muted mt-3">
              Space complexity: <span className="font-mono">{c.space}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
