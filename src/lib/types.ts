import type { BillType, PaymentMethod } from "./billing";

export type PatientStatus =
  | "registered"
  | "with_doctor"
  | "admitted"
  | "discharged";

export interface Patient {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  issue: string | null;
  assigned_doctor_id: number | null;
  payment_method: PaymentMethod;
  insurance_provider: string | null;
  insurance_coverage_percent: number;
  /** Triage severity: 1 = critical … 5 = routine. Drives the doctor priority queue. */
  severity: number;
  status: PatientStatus;
  created_by: string | null;
  created_at: string;
}

export interface Doctor {
  id: number;
  user_id: string | null;
  name: string;
  specialty_id: number | null;
  specialty?: string;
  consultation_fee: string;
  rating: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Bill {
  id: number;
  patient_id: number;
  type: BillType;
  description: string | null;
  amount: string;
  concession_amount: string;
  concession_reason: string | null;
  payment_method: PaymentMethod;
  insurance_covered: string;
  patient_payable: string;
  status: "pending" | "paid";
  created_at: string;
  paid_at: string | null;
}

export interface LabOrder {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  test_name: string;
  bill_id: number | null;
  report_text: string | null;
  status: "ordered" | "billed" | "paid" | "reported";
  created_at: string;
}

export interface Operation {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  procedure: string;
  scheduled_date: string | null;
  bill_id: number | null;
  status: "recommended" | "scheduled" | "paid" | "completed" | "rescheduled";
  created_at: string;
}

export interface Admission {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  bed_id: number | null;
  bill_id: number | null;
  admitted_at: string;
  discharged_at: string | null;
  status: "admitted" | "discharged";
}

export interface Bed {
  id: number;
  ward_id: number;
  label: string;
  status: "free" | "occupied";
  patient_id: number | null;
}

export interface PatientEvent {
  id: number;
  patient_id: number;
  type: string;
  description: string | null;
  actor: string | null;
  created_at: string;
}

export interface Note {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  body: string;
  created_at: string;
}
