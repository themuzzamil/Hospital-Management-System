"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { Icon, type IconName } from "./icons";

export type NavItem = { href: string; label: string; icon: IconName };

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  receptionist: "Receptionist",
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-fg">
        <Icon name="cross" size={16} fill="currentColor" stroke="none" />
      </span>
      <span className="font-semibold text-[15px] tracking-tight text-foreground">
        MediStruct
      </span>
    </div>
  );
}

export default function Shell({
  user,
  nav,
  children,
}: {
  user: { name: string; role: string };
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <Logo />
          <p className="text-xs text-muted mt-1.5 ml-0.5">{roleLabel[user.role]}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary-soft text-primary font-medium"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted">{roleLabel[user.role]}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-outline w-full mt-1 text-sm justify-start"
          >
            <Icon name="logout" size={16} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}

/** Page header used across dashboards. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
