import { betterAuth } from "better-auth";
import { pool } from "./db";

/**
 * Better Auth configuration.
 *
 * Roles: "admin" | "doctor" | "receptionist". Accounts are NOT self-service —
 * the admin creates every doctor / receptionist from the admin panel (which
 * calls auth.api.signUpEmail server-side). Patients are records, not users.
 */
export const auth = betterAuth({
  database: pool,
  // Origins allowed to call the auth API. Better Auth rejects any request
  // whose Origin header isn't listed here ("Invalid origin"). We trust the
  // configured base URL plus Vercel's per-deployment URL (which differs on
  // every preview deploy) and any *.vercel.app preview domain.
  trustedOrigins: [
    "https://hospital-management-system-jade-two.vercel.app",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    "https://*.vercel.app",
  ],
  emailAndPassword: {
    enabled: true,
    // Admin-created accounts; no public email verification step for this project.
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "receptionist",
        input: true,
      },
      // For doctor accounts: links to the doctors table row.
      doctorId: {
        type: "number",
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type Role = "admin" | "doctor" | "receptionist";
