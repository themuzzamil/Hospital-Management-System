-- MediStruct domain schema (Better Auth tables are created separately by the
-- `@better-auth/cli migrate` command). All patient-facing tables live here.

-- Medical specialties (nodes in the symptom -> specialist Graph).
CREATE TABLE IF NOT EXISTS specialties (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

-- Symptom -> specialty routing edges (the Graph the receptionist queries when
-- entering a patient's issue). weight lets Dijkstra prefer a route.
CREATE TABLE IF NOT EXISTS symptom_routes (
  id serial PRIMARY KEY,
  symptom text NOT NULL,
  specialty_id int NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  weight int NOT NULL DEFAULT 1
);

-- Doctors. Approved/created by admin; linked to a Better Auth user row.
CREATE TABLE IF NOT EXISTS doctors (
  id serial PRIMARY KEY,
  user_id text,
  name text NOT NULL,
  specialty_id int REFERENCES specialties(id),
  consultation_fee numeric(10,2) NOT NULL DEFAULT 1000,
  rating numeric(2,1) NOT NULL DEFAULT 4.0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Patients. id is a plain serial => auto integer starting at 1, 2, 3 ...
CREATE TABLE IF NOT EXISTS patients (
  id serial PRIMARY KEY,
  name text NOT NULL,
  age int,
  gender text,
  phone text,
  address text,
  issue text,
  assigned_doctor_id int REFERENCES doctors(id),
  payment_method text NOT NULL DEFAULT 'self' CHECK (payment_method IN ('self','insurance')),
  insurance_provider text,
  insurance_coverage_percent int NOT NULL DEFAULT 0,
  -- Triage severity set by reception: 1 = critical ... 5 = routine.
  -- Drives the doctor's priority queue (most-critical seen first).
  severity int NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered','with_doctor','follow_up','checkup_complete','admitted','discharged')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every chargeable item. Business rule (enforced in app code): a 'consultation'
-- bill may not carry a concession; concession is only for lab/operation/admission.
CREATE TABLE IF NOT EXISTS bills (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('consultation','lab','operation','admission')),
  description text,
  amount numeric(10,2) NOT NULL,                       -- gross amount
  concession_amount numeric(10,2) NOT NULL DEFAULT 0,
  concession_reason text,
  payment_method text NOT NULL DEFAULT 'self' CHECK (payment_method IN ('self','insurance')),
  insurance_covered numeric(10,2) NOT NULL DEFAULT 0,  -- amount insurance pays
  patient_payable numeric(10,2) NOT NULL,              -- owed after concession + insurance
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- Consultation / operation / follow-up dates (indexed by date in the Red-Black tree).
CREATE TABLE IF NOT EXISTS appointments (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int REFERENCES doctors(id),
  type text NOT NULL CHECK (type IN ('consultation','operation','followup')),
  scheduled_date date,  -- nullable: a follow-up is requested before reception assigns a date
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','rescheduled','cancelled')),
  bill_id int REFERENCES bills(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lab tests ordered by a doctor; receptionist bills + uploads the report.
CREATE TABLE IF NOT EXISTS lab_orders (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int REFERENCES doctors(id),
  test_name text NOT NULL,
  bill_id int REFERENCES bills(id),
  report_text text,
  status text NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered','billed','paid','reported')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Operations recommended by a doctor; must be paid before scheduled_date or
-- the receptionist reschedules (patient meets doctor again -> new date).
CREATE TABLE IF NOT EXISTS operations (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int REFERENCES doctors(id),
  procedure text NOT NULL,
  scheduled_date date,
  bill_id int REFERENCES bills(id),
  status text NOT NULL DEFAULT 'recommended'
    CHECK (status IN ('recommended','scheduled','paid','completed','rescheduled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wards and their beds (bed/ward management for admissions).
CREATE TABLE IF NOT EXISTS wards (
  id serial PRIMARY KEY,
  name text NOT NULL,
  ward_type text
);
CREATE TABLE IF NOT EXISTS beds (
  id serial PRIMARY KEY,
  ward_id int NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied')),
  patient_id int REFERENCES patients(id)
);

-- Admissions occupy a bed on admit and free it on discharge.
CREATE TABLE IF NOT EXISTS admissions (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int REFERENCES doctors(id),
  bed_id int REFERENCES beds(id),
  bill_id int REFERENCES bills(id),
  admitted_at timestamptz NOT NULL DEFAULT now(),
  discharged_at timestamptz,
  status text NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted','discharged'))
);

-- Doctor notes for a patient (chronological -> Singly Linked List).
CREATE TABLE IF NOT EXISTS notes (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int REFERENCES doctors(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Immutable audit trail / patient timeline (Doubly Linked List, walkable both
-- directions). Every meaningful action appends one row here.
CREATE TABLE IF NOT EXISTS patient_events (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_events_patient ON patient_events(patient_id, id);
