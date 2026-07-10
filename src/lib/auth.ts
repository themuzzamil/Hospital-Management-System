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
