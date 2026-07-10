import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 renamed `middleware` -> `proxy` (nodejs runtime). This is only an
 * optimistic gate: if there's no session cookie we bounce protected routes to
 * /login. The real role authorization happens in each server layout via
 * requireRole(), which reads the verified session.
 */
const PROTECTED = ["/admin", "/doctor", "/reception", "/dsa"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!needsAuth) return NextResponse.next();

  const cookie = getSessionCookie(request);
  if (!cookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/reception/:path*", "/dsa/:path*"],
};
