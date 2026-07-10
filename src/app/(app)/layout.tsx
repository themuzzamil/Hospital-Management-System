import { requireUser } from "@/lib/session";
import Shell, { type NavItem } from "@/components/shell";

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/doctors", label: "Doctors", icon: "stethoscope" },
    { href: "/admin/staff", label: "Receptionists", icon: "users" },
    { href: "/admin/wards", label: "Wards & Beds", icon: "bed" },
    { href: "/dsa", label: "DSA Gallery", icon: "structure" },
  ],
  receptionist: [
    { href: "/reception", label: "Dashboard", icon: "dashboard" },
    { href: "/reception/patients/new", label: "New Patient", icon: "userPlus" },
    { href: "/reception/patients", label: "Patients", icon: "users" },
    { href: "/reception/billing", label: "Billing", icon: "receipt" },
    { href: "/reception/queue", label: "Waiting Queue", icon: "clock" },
    { href: "/dsa", label: "DSA Gallery", icon: "structure" },
  ],
  doctor: [
    { href: "/doctor", label: "Dashboard", icon: "dashboard" },
    { href: "/doctor/queue", label: "My Queue", icon: "clock" },
    { href: "/doctor/patients", label: "My Patients", icon: "users" },
    { href: "/dsa", label: "DSA Gallery", icon: "structure" },
  ],
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <Shell user={{ name: user.name, role: user.role }} nav={NAV[user.role] ?? []}>
      {children}
    </Shell>
  );
}
