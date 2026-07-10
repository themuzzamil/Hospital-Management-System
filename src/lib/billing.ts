/**
 * Bill maths, in one place.
 *
 * Order of operations (per the project spec):
 *   1. Consultation fee is ALWAYS charged in full — no concession allowed.
 *   2. For lab / operation / admission a concession (discount) may be applied
 *      first, with a reason.
 *   3. Insurance then covers a PERCENTAGE of what remains; the patient pays the
 *      rest ("self-pay" leaves the full remainder to the patient).
 */

export type BillType = "consultation" | "lab" | "operation" | "admission";
export type PaymentMethod = "self" | "insurance";

export type BillInput = {
  type: BillType;
  amount: number;
  concessionAmount?: number;
  paymentMethod: PaymentMethod;
  coveragePercent?: number; // patient's insurance plan coverage %
};

export type BillBreakdown = {
  amount: number;
  concessionAmount: number;
  afterConcession: number;
  insuranceCovered: number;
  patientPayable: number;
};

export function computeBill(input: BillInput): BillBreakdown {
  const amount = round2(input.amount);

  // Rule 1: consultation cannot carry a concession.
  const concessionAmount =
    input.type === "consultation" ? 0 : clamp(round2(input.concessionAmount ?? 0), 0, amount);

  const afterConcession = round2(amount - concessionAmount);

  const pct =
    input.paymentMethod === "insurance"
      ? clamp(input.coveragePercent ?? 0, 0, 100)
      : 0;
  const insuranceCovered = round2((afterConcession * pct) / 100);
  const patientPayable = round2(afterConcession - insuranceCovered);

  return {
    amount,
    concessionAmount,
    afterConcession,
    insuranceCovered,
    patientPayable,
  };
}

/**
 * Does the patient's insurance fully clear the bill? If not, the receptionist
 * must ask them to upgrade the plan or self-pay the remainder (per the spec).
 */
export function insuranceClears(input: BillInput): boolean {
  return computeBill(input).patientPayable <= 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function money(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return "Rs " + (v ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}
