import Link from "next/link";
import { Icon, type IconName } from "./icons";

export function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number | string;
  icon: IconName;
  href?: string;
}) {
  const inner = (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-muted">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="text-2xl font-semibold mt-2 tracking-tight">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const STATUS_BADGE: Record<string, string> = {
  registered: "badge-blue",
  with_doctor: "badge-amber",
  follow_up: "badge-amber",
  checkup_complete: "badge-green",
  admitted: "badge-red",
  discharged: "badge-gray",
  paid: "badge-green",
  pending: "badge-amber",
  active: "badge-green",
  inactive: "badge-gray",
  scheduled: "badge-blue",
  completed: "badge-green",
  rescheduled: "badge-amber",
  recommended: "badge-blue",
  ordered: "badge-blue",
  billed: "badge-amber",
  reported: "badge-green",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "badge-gray";
  return <span className={cls}>{status.replace(/_/g, " ")}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-8 text-center text-muted text-sm">{children}</div>
  );
}
