import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Role } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  doctorId: number | null;
};

/**
 * Read the current session on the server (or null).
 * Wrapped in React `cache()` so that the layout and the page it renders share a
 * single session lookup per request instead of each hitting the auth DB.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as unknown as {
    id: string;
    name: string;
    email: string;
    role?: Role;
    doctorId?: number | null;
  };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role ?? "receptionist") as Role,
    doctorId: u.doctorId ?? null,
  };
});

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles; redirect to the user's own home otherwise. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "doctor":
      return "/doctor";
    case "receptionist":
      return "/reception";
    default:
      return "/login";
  }
}
