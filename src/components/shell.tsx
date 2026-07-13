"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar — only shown below the md breakpoint. */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="grid place-items-center h-9 w-9 rounded-lg text-muted hover:bg-background hover:text-foreground"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} />
        </button>
      </header>

      {/* Backdrop for the mobile drawer. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80%] border-r border-border bg-surface flex flex-col transition-transform duration-200 md:static md:z-auto md:w-60 md:max-w-none md:shrink-0 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <Logo />
            <p className="text-xs text-muted mt-1.5 ml-0.5">{roleLabel[user.role]}</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden grid place-items-center h-8 w-8 rounded-lg text-muted hover:bg-background hover:text-foreground"
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
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
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
