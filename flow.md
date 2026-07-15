# MediStruct — Complete Project Flow

This document traces **every use case** in the system end-to-end: who does what,
which file handles it, which **data structure** runs, and which **programming
module** (framework feature) carries it.

It is written to be read top-to-bottom: architecture → login → admin → reception
→ doctor → the full patient journey → the DSA/module maps.

> Companion docs: [`README.md`](README.md) (setup), [`DSA.md`](DSA.md) (pseudocode
> + complexity of each structure). This file covers **flow** — how the pieces
> connect.

---

## 1. The three-layer architecture

Every feature in this app follows the same shape. Understanding this one diagram
makes the rest of the document predictable:

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ CLIENT — React Client Components"]
        FORM["Forms & consoles<br/>new-patient-form · patient-console<br/>clinical-console · timeline-viewer"]
    end

    subgraph SERVER["⚙️ SERVER — Next.js App Router (Node runtime)"]
        PROXY["proxy.ts<br/><i>cookie gate</i>"]
        PAGE["Server Components (page.tsx)<br/><i>read data, render</i>"]
        ACTION["Server Actions (lib/actions.ts)<br/><i>'use server' — all writes</i>"]
        SESSION["lib/session.ts<br/>requireRole()"]
    end

    subgraph DSA["🧮 DSA LAYER — src/lib/dsa (hand-written, no libraries)"]
        STRUCT["Queue · MinPriorityQueue · Graph<br/>LinkedList · DoublyLinkedList · quickSort<br/>BST · RedBlackTree · HashMap · DynamicArray"]
    end

    subgraph DB["🗄️ POSTGRES (Neon) — source of truth"]
        TABLES["patients · doctors · bills · beds<br/>lab_orders · operations · appointments<br/>notes · patient_events"]
    end

    FORM -->|"RPC call over HTTP"| ACTION
    PROXY --> PAGE
    PAGE --> SESSION
    ACTION --> SESSION
    PAGE -->|"SELECT rows"| TABLES
    ACTION -->|"INSERT / UPDATE"| TABLES
    PAGE -->|"feed rows through"| STRUCT
    STRUCT -->|"ordered / routed result"| PAGE
    PAGE -->|"HTML"| FORM
    ACTION -.->|"revalidatePath()"| PAGE
```

**The key idea:** Postgres stores, the DSA layer *works*. A request is almost
always:

> **read rows from Postgres → build a data structure → run its algorithm → render**

The database never does the sorting/routing/prioritising — our own code does.
That is what makes this a DSA project rather than a CRUD app.

---

## 2. Login & role routing (all users)

**Files:** `src/app/login/`, `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts`

There is **no public sign-up**. The admin creates every account. Patients are
*records*, not users — they never log in.

```mermaid
flowchart TD
    A["User opens /"] --> B{"Session cookie?"}
    B -->|No| C["/login"]
    B -->|Yes| D["homeForRole(role)"]

    C --> E["LoginForm (client)<br/>signIn.email()"]
    E --> F["Better Auth<br/>/api/auth/[...all]"]
    F --> G{"Password valid?"}
    G -->|No| H["Show error<br/>'Invalid email or password'"]
    G -->|Yes| I["Set session cookie<br/>(7-day expiry)"]
    I --> D

    D --> J{"role"}
    J -->|admin| K["/admin"]
    J -->|doctor| L["/doctor"]
    J -->|receptionist| M["/reception"]

    style C fill:#fee2e2,stroke:#dc2626
    style K fill:#dbeafe,stroke:#2563eb
    style L fill:#dcfce7,stroke:#16a34a
    style M fill:#fef3c7,stroke:#d97706
```

### Two-gate security model

Authorization is checked **twice**, deliberately:

| Gate | File | What it does | Why it isn't enough alone |
|---|---|---|---|
| **1. Optimistic** | `proxy.ts` | Checks a session cookie *exists*; bounces to `/login` if not | Only checks presence, never verifies the cookie or the role |
| **2. Authoritative** | `requireRole()` in every layout/page | Reads the **verified** session, redirects if the role is wrong | This is the real check |

`proxy.ts` is Next.js 16's rename of `middleware.ts`. `getCurrentUser()` is
wrapped in React `cache()` so the layout and page share **one** session lookup
per request instead of two DB hits.

---

## 3. ADMIN use cases

**Route group:** `src/app/(app)/admin/` · **Guard:** `requireRole("admin")`

```mermaid
flowchart LR
    A["👨‍💼 Admin"] --> B["/admin<br/>Dashboard"]
    A --> C["/admin/doctors<br/>Add · Edit · Delete"]
    A --> D["/admin/staff<br/>Add receptionist"]
    A --> E["/admin/wards<br/>👁️ READ-ONLY"]
    A --> F["/dsa<br/>DSA Gallery"]

    style E fill:#fee2e2,stroke:#dc2626,stroke-width:2px
```

### 3.1 Admin adds a DOCTOR

This is the one flow that writes to **two systems at once** — the domain table
and the auth table — and then links them together.

```mermaid
flowchart TD
    A["Admin clicks 'Add doctor'"] --> B["NewDoctorForm<br/>name · email · password<br/>specialty · fee · rating"]
    B --> C{"Client validation<br/>name && email && password ≥ 6"}
    C -->|fail| B
    C -->|pass| D["createDoctor() — Server Action"]

    D --> E["1️⃣ INSERT INTO doctors<br/>(name, specialty_id, fee, rating, 'active')<br/>RETURNING id"]
    E --> F["2️⃣ auth.api.signUpEmail()<br/>hashes password<br/>creates 'user' row"]
    F --> G["3️⃣ Link both ways:<br/>user.doctorId = doctors.id<br/>doctors.user_id = user.id"]
    G --> H["revalidatePath('/admin/doctors')"]
    H --> I["router.refresh() → table re-renders"]

    E -.->|"feeds"| J["💰 Consultation fee<br/>→ every future bill"]
    E -.->|"feeds"| K["⭐ Rating<br/>→ quickSort doctor ranking"]
    E -.->|"feeds"| L["🏥 specialty_id<br/>→ Graph routing target"]

    style D fill:#dbeafe,stroke:#2563eb
    style G fill:#fef3c7,stroke:#d97706
```

**Why the two-way link matters:** when Dr. Sara logs in, `session.doctorId` tells
the app *which doctor row she is*, so `/doctor/queue` can filter to her patients
only. Without it she would see everyone's queue.

The three fields the admin types here are not cosmetic — they are the **inputs to
two different algorithms**:
- `rating` + `consultation_fee` → the **quickSort comparator** that ranks doctors
- `specialty_id` → the **Graph node** that symptom routing targets

**Delete** (`deleteDoctor`) removes the doctor row *and* their login row, so a
deleted doctor cannot sign in.

### 3.2 Admin adds a RECEPTIONIST

Simpler — a receptionist has no domain row, only a login:

```mermaid
flowchart LR
    A["Add receptionist form"] --> B["createReceptionist()"]
    B --> C["auth.api.signUpEmail()<br/>role: 'receptionist'"]
    C --> D["UPDATE user SET role='receptionist'"]
    D --> E["revalidatePath('/admin/staff')"]
```

The explicit `UPDATE ... SET role` after signup is a **defensive belt-and-braces**
step: it guarantees the role persisted even if the Better Auth `additionalFields`
config didn't apply it.

### 3.3 Admin and BEDS — ⚠️ important correction

**The admin cannot add beds through the UI.** This is worth stating plainly
because it's the one place where the running system differs from what you might
expect from the nav menu.

```mermaid
flowchart TD
    subgraph SEED["🌱 scripts/seed.mts — the ONLY bed creator"]
        A["npm run seed"] --> B["INSERT INTO wards<br/>General Ward · ICU · Private Rooms"]
        B --> C["INSERT INTO beds<br/>G1–G6 · I1–I4 · P1–P4<br/>= 14 beds, all status='free'"]
    end

    subgraph UI["🖥️ /admin/wards — read-only viewer"]
        D["getWardsWithBeds()"] --> E["Render grid<br/>🟢 free / 🔴 occupied"]
    end

    C --> D

    subgraph LIFECYCLE["♻️ Beds change status ONLY via reception"]
        F["admitPatient()<br/>→ status='occupied'"]
        G["dischargePatient()<br/>→ status='free'"]
    end

    E -.->|"reflects"| F
    E -.->|"reflects"| G

    style UI fill:#fee2e2,stroke:#dc2626
    style SEED fill:#dcfce7,stroke:#16a34a
```

**Evidence:** `INSERT INTO beds` / `INSERT INTO wards` appear **only** in
`scripts/seed.mts:90` and `scripts/seed.mts:95`. There is no `createBed` or
`createWard` server action anywhere in `src/lib/actions.ts`, and
`src/app/(app)/admin/wards/page.tsx` renders a grid with **no buttons or forms**.

So the accurate statement is: **the admin *provisions* bed capacity by seeding,
and *monitors* it at `/admin/wards`. The receptionist is the only role that
changes a bed's state** (by admitting/discharging). If bed CRUD is a requirement,
it is a genuine gap — see §10.

---

## 4. RECEPTIONIST use cases

**Route group:** `src/app/(app)/reception/` · **Guard:** `requireRole("receptionist")`

The receptionist is the **busiest role** — they own intake, all money, scheduling,
beds, and discharge.

```mermaid
flowchart LR
    A["👩‍💼 Receptionist"] --> B["/reception<br/>Dashboard + stats"]
    A --> C["/reception/patients/new<br/>🎯 Register + route"]
    A --> D["/reception/patients<br/>Search list"]
    A --> E["/reception/patients/[id]<br/>🎛️ Full console"]
    A --> F["/reception/billing<br/>All bills"]
    A --> G["/reception/queue<br/>📥 FIFO Queue"]

    style C fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style E fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

### 4.1 Registering a patient — the flagship flow

This is the **most algorithmically interesting flow in the project**. It runs a
**Graph + Dijkstra** *and* a **quickSort** before the patient row even exists.

```mermaid
flowchart TD
    A["Receptionist opens /reception/patients/new"] --> B["Type name, age, gender, phone, address"]
    B --> C["Select ISSUE from dropdown<br/>e.g. 'chest pain'"]

    C --> D["🔴 onIssueChange fires immediately<br/>(before submit!)"]
    D --> E["findSpecialists(issue)<br/>Server Action"]

    subgraph ROUTE["🧮 routeIssue() — lib/routing.ts"]
        E --> F["getSymptomRoutes()<br/>SELECT from symptom_routes"]
        F --> G["Build Graph (directed)<br/>addEdge(sym:X → spec:Y, weight)"]
        G --> H["Fuzzy-match free text → symptom node<br/>exact → substring → null"]
        H --> I{"Matched?"}
        I -->|No| J["Return empty<br/>'Pick a doctor manually'"]
        I -->|Yes| K["🎯 Dijkstra shortestPath()<br/>to EVERY specialty<br/>keep lowest cost"]
        K --> L["getDoctors(activeOnly=true)<br/>filter to that specialty"]
        L --> M["🎯 quickSort(doctors)<br/>rating DESC, then fee ASC"]
    end

    M --> N["UI shows:<br/>'chest pain → Cardiology'<br/>+ ranked doctor list"]
    N --> O["Best doctor auto-selected<br/>setDoctorId(r.doctors[0].id)"]

    O --> P["Set TRIAGE SEVERITY 1–5<br/>(default 3 = Urgent)"]
    P --> Q["Choose Self-pay or Insurance %"]
    Q --> R["Submit → registerPatient()"]

    subgraph REG["⚙️ registerPatient() — lib/actions.ts"]
        R --> S["Clamp severity to 1–5<br/>Math.min(5, Math.max(1, ...))"]
        S --> T["INSERT INTO patients<br/>status='registered'<br/>id = serial → 1, 2, 3…"]
        T --> U["logEvent('registered')"]
        U --> V{"Doctor assigned?"}
        V -->|Yes| W["computeBill(consultation, fee)<br/>⚠️ NO concession allowed"]
        W --> X["INSERT INTO bills<br/>status='pending'"]
        X --> Y["logEvent('consultation_billed')"]
        V -->|No| Z["skip billing"]
    end

    Y --> AA["redirect → /reception/patients/[id]"]
    Z --> AA

    style ROUTE fill:#eff6ff,stroke:#2563eb
    style REG fill:#fefce8,stroke:#d97706
    style K fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style M fill:#dbeafe,stroke:#2563eb,stroke-width:2px
```

**Two DSA structures run before submit.** The routing happens on *dropdown change*,
not on submit — so the receptionist sees `chest pain → Cardiology` and a
rating-ranked doctor list *while still filling the form*. That is the Graph and
the quickSort doing visible, real work.

**Why severity is set here:** the receptionist is the first human to see the
patient, so they are the only one who can triage. This single integer is what
later lets a critical patient **jump the doctor's queue** (§5.1).

#### The routing graph (seeded, 18 edges → 8 specialties)

```mermaid
flowchart LR
    A1["chest pain"] -->|1| C1["Cardiology"]
    A2["palpitations"] -->|1| C1
    A3["shortness of breath"] -->|2| C1
    B1["fracture"] -->|1| C2["Orthopedics"]
    B2["joint pain"] -->|1| C2
    B3["back pain"] -->|2| C2
    D1["headache"] -->|1| C3["Neurology"]
    D2["seizure"] -->|1| C3
    D3["dizziness"] -->|2| C3
    E1["fever"] -->|1| C4["General Medicine"]
    E2["cough"] -->|1| C4
    F1["rash"] -->|1| C5["Dermatology"]
    G1["ear pain"] -->|1| C6["ENT"]

    style C1 fill:#fecaca
    style C2 fill:#fed7aa
    style C3 fill:#ddd6fe
    style C4 fill:#bbf7d0
```

Lower weight = stronger match. `shortness of breath` has weight 2 to Cardiology
because it's a *weaker* signal than `chest pain` — Dijkstra prefers the cheaper
edge when several could apply.

### 4.2 The reception waiting queue — FIFO

```mermaid
flowchart TD
    A["/reception/queue"] --> B["SELECT patients<br/>WHERE status IN ('registered','with_doctor')<br/>ORDER BY created_at ASC"]
    B --> C["🧮 new Queue()<br/>waiting.forEach(p => q.enqueue(p))"]
    C --> D["q.toArray()"]
    D --> E["Render numbered list<br/>#1 = 'front / dequeue next'"]

    style C fill:#dbeafe,stroke:#2563eb,stroke-width:2px
```

**Why FIFO here but not for the doctor?** The waiting *room* is fair — whoever
walked in first is served first. The **doctor's** queue is different: a critical
patient must jump ahead. Same patients, two different orderings, two different
structures. This contrast is the clearest DSA story in the project.

### 4.3 The reception patient console — the control panel

Everything the receptionist can do to one patient lives at
`/reception/patients/[id]`:

```mermaid
flowchart TD
    A["Patient console"] --> B["💵 Bills"]
    A --> C["🧪 Lab tests"]
    A --> D["🔪 Operations"]
    A --> E["📅 Follow-ups"]
    A --> F["🛏️ Admission"]

    B --> B1["Mark paid → markBillPaid()"]
    B --> B2["Apply concession<br/>⛔ blocked on consultation"]

    C --> C1["Generate bill → billLabOrder()"]
    C --> C2["Generate report → generateLabReport()<br/>⛔ requires status='paid'"]
    C --> C3["Download .txt (Blob)"]

    D --> D1["Schedule + fee → scheduleOperation()"]
    D --> D2["Reschedule → rescheduleOperation()"]
    D --> D3["Mark completed → completeOperation()"]

    E --> E1["Assign date → scheduleFollowup()"]
    E --> E2["Patient revisited → markRevisited()"]

    F --> F1["Admit to free bed → admitPatient()"]
    F --> F2["Discharge → dischargePatient()"]

    style B2 fill:#fee2e2,stroke:#dc2626
    style C2 fill:#fee2e2,stroke:#dc2626
```

---

## 5. DOCTOR use cases

**Route group:** `src/app/(app)/doctor/` · **Guard:** `requireRole("doctor")`

Doctors are **read-only on money** — they never touch a bill. They only do
clinical work. That separation is enforced by which server actions each console
imports.

### 5.1 The doctor's queue — Min Priority Queue (emergency triage)

This is the **most important algorithmic feature for grading**, because it shows
*why* a heap beats a plain queue.

```mermaid
flowchart TD
    A["/doctor/queue"] --> B["getPatients({doctorId, status:'with_doctor'})<br/>⚠️ only THIS doctor's patients"]

    B --> C["Step 1: sort by arrival<br/>created_at ASC"]
    C --> D["Step 2: build composite priority<br/><b>severity × 1,000,000 + arrivalIndex</b>"]

    D --> E["🧮 MinPriorityQueue (binary min-heap)<br/>enqueue → bubbleUp O(log n)"]
    E --> F["while(!pq.isEmpty())<br/>pq.dequeue() → bubbleDown O(log n)"]
    F --> G["Triage order:<br/>most-critical first,<br/>ties → longest-waiting first"]
    G --> H["#1 badge: 'see next'"]

    style E fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style D fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

**The composite-priority trick — why it works:**

```
priority = severity × 1,000,000 + arrivalIndex
```

Because `arrivalIndex` can never reach 1,000,000, **severity always dominates**
and arrival order can only ever break a tie. One integer encodes a two-level sort,
so the heap stays a simple min-heap with no custom comparator.

Worked example — arrival order vs. triage order:

| Arrived | Patient | Severity | Priority | 👉 Seen |
|:---:|---|:---:|---:|:---:|
| 1st | Ali | 5 (Routine) | 5,000,000 | **4th** |
| 2nd | Bilal | 1 (Critical) | 1,000,001 | **1st** |
| 3rd | Chand | 3 (Urgent) | 3,000,002 | **2nd** |
| 4th | Dawood | 3 (Urgent) | 3,000,003 | **3rd** |

Bilal arrived 2nd but is seen **1st** — a plain FIFO queue physically cannot do
this. Chand and Dawood tie on severity 3, so arrival order breaks the tie fairly.

### 5.2 Clinical console — notes & orders

```mermaid
flowchart TD
    A["/doctor/patients/[id]"] --> B{"assigned_doctor_id === session.doctorId?"}
    B -->|No| C["404 notFound()<br/>🔒 can't open other doctors' patients"]
    B -->|Yes| D["ClinicalConsole"]

    D --> E["📝 Notes"]
    E --> E1["🧮 new SinglyLinkedList()<br/>notes.forEach(append) → toArray()"]
    E1 --> E2["Render chronologically head→tail"]
    E --> E3["Add note → addNote()"]

    D --> F["🧪 orderLab(testName)<br/>from LAB_TESTS catalog"]
    D --> G["🔪 recommendOperation(procedure)<br/>from PROCEDURES catalog"]
    D --> H["🛏️ recommendAdmission()<br/>⚠️ logs event only — no state change"]

    D --> I{"Visit outcome<br/>(status must be 'with_doctor')"}
    I --> J["✅ completeCheckup()<br/>→ status='checkup_complete' (terminal)"]
    I --> K["🔁 requestFollowup()<br/>→ status='follow_up'<br/>reception assigns the date"]

    style E1 fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style C fill:#fee2e2,stroke:#dc2626
```

**Note the ownership check** (`page.tsx:29`): a doctor opening another doctor's
patient gets a 404. Authorization is at the **row level**, not just the route.

**`recommendAdmission` is advisory only** — it writes a timeline event and nothing
else. The receptionist still has to actually pick a bed. Same for
`recommendOperation`: it creates an operation row with status `'recommended'`, but
only reception can attach a date and a fee.

---

## 6. THE FULL PATIENT JOURNEY — every state transition

This is the master flowchart. It shows the whole lifecycle and, crucially, the
**handoffs between roles**.

```mermaid
flowchart TD
    START(["🚶 Patient walks in"]) --> R1["👩‍💼 REGISTER<br/>Graph routes issue → specialist<br/>quickSort ranks doctors<br/>Triage severity set"]
    R1 --> S1["status = <b>registered</b><br/>💵 consultation bill: pending"]

    S1 --> P1{"💵 Consultation paid?"}
    P1 -->|No| WAIT["⏳ Stays in FIFO waiting queue"]
    WAIT --> P1
    P1 -->|"Yes — markBillPaid()"| S2["status = <b>with_doctor</b><br/>🔓 unlocks the doctor"]

    S2 --> PQ["🧮 Enters doctor's<br/>MIN PRIORITY QUEUE<br/>(critical jumps ahead)"]
    PQ --> DOC["👨‍⚕️ DOCTOR sees patient<br/>writes notes (LinkedList)"]

    DOC --> DEC{"Doctor's decision"}

    DEC -->|"Nothing needed"| CC["✅ completeCheckup()<br/>status = <b>checkup_complete</b>"]
    CC --> END1(["🏁 Visit closed"])

    DEC -->|"Come back later"| FU["🔁 requestFollowup()<br/>status = <b>follow_up</b>"]
    FU --> FU2["👩‍💼 scheduleFollowup(date)"]
    FU2 --> FU3["👩‍💼 markRevisited()<br/>→ status = <b>with_doctor</b>"]
    FU3 --> PQ

    DEC -->|"Needs a test"| LAB["🧪 orderLab()<br/>lab: <b>ordered</b>"]
    DEC -->|"Needs surgery"| OP["🔪 recommendOperation()<br/>op: <b>recommended</b>"]
    DEC -->|"Needs a bed"| ADM["🛏️ recommendAdmission()<br/>(advisory event only)"]

    LAB --> LAB1["👩‍💼 billLabOrder() → <b>billed</b>"]
    LAB1 --> LAB2["👩‍💼 markBillPaid() → <b>paid</b>"]
    LAB2 --> LAB3["👩‍💼 generateLabReport()<br/>→ <b>reported</b> + downloadable"]
    LAB3 --> DEC

    OP --> OPLOOP

    ADM --> ADM1["👩‍💼 admitPatient(bedId, rate)<br/>bed → <b>occupied</b><br/>status = <b>admitted</b>"]
    ADM1 --> DIS

    subgraph OPLOOP["🔄 THE OPERATION LOOP"]
        O1["👩‍💼 scheduleOperation(date, fee)<br/>op: <b>scheduled</b> + bill"]
        O1 --> O2{"💵 Paid before the date?"}
        O2 -->|"❌ No"| O3["👩‍💼 rescheduleOperation()<br/>op: <b>rescheduled</b><br/>scheduled_date = NULL"]
        O3 --> O4["🔙 Patient meets doctor again"]
        O4 --> O1
        O2 -->|"✅ Yes"| O5["op: <b>paid</b>"]
        O5 --> O6["👩‍💼 completeOperation()<br/>op: <b>completed</b>"]
    end

    O6 --> DIS

    DIS["👩‍💼 dischargePatient()"] --> DIS1["🛏️ Bed → <b>free</b> automatically<br/>admission → discharged<br/>status = <b>discharged</b>"]
    DIS1 --> END2(["🏁 Record archived"])

    style R1 fill:#fef3c7,stroke:#d97706
    style PQ fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style DOC fill:#dcfce7,stroke:#16a34a
    style OPLOOP fill:#fef2f2,stroke:#dc2626
    style DIS1 fill:#f0fdf4,stroke:#16a34a
```

### The patient state machine (strict)

```mermaid
stateDiagram-v2
    [*] --> registered: registerPatient()
    registered --> with_doctor: markBillPaid(consultation)
    with_doctor --> checkup_complete: completeCheckup()
    with_doctor --> follow_up: requestFollowup()
    follow_up --> with_doctor: markRevisited()
    with_doctor --> admitted: admitPatient()
    follow_up --> admitted: admitPatient()
    checkup_complete --> admitted: admitPatient()
    admitted --> discharged: dischargePatient()
    checkup_complete --> discharged: dischargePatient()
    discharged --> [*]

    note right of with_doctor
        The gate: ONLY reached by
        PAYING the consultation bill.
        No payment = no doctor.
    end note
```

**The money gate is the spine of the whole app.** `registered → with_doctor`
happens *only* inside `markBillPaid()` when `bill.type === 'consultation'`. Until
the patient pays, they cannot appear in any doctor's priority queue. Notice the
guard is `WHERE id=$1 AND status='registered'` — so paying a *second* consultation
bill can't drag an already-admitted patient backwards.

---

## 7. Billing — the money rules

**File:** `src/lib/billing.ts` — all bill maths lives in one pure function,
`computeBill()`.

```mermaid
flowchart TD
    A["computeBill({type, amount,<br/>concession, method, coverage%})"] --> B{"type === 'consultation'?"}

    B -->|"Yes"| C["🔒 concession = 0<br/>ALWAYS — rule 1"]
    B -->|"No (lab/operation/admission)"| D["concession = clamp(value, 0, amount)"]

    C --> E["afterConcession = amount − concession"]
    D --> E

    E --> F{"method === 'insurance'?"}
    F -->|"No (self-pay)"| G["pct = 0"]
    F -->|"Yes"| H["pct = clamp(coverage, 0, 100)"]

    G --> I["insuranceCovered = afterConcession × pct ÷ 100"]
    H --> I
    I --> J["<b>patientPayable = afterConcession − insuranceCovered</b>"]

    style C fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style J fill:#dcfce7,stroke:#16a34a,stroke-width:2px
```

**Order of operations: concession FIRST, then insurance.** This matters — it is
strictly better for the *insurer* and worse for the patient than the reverse
order, so it must be deliberate:

> Bill Rs 10,000 · concession Rs 2,000 · insurance 80%
> - **This system:** (10,000 − 2,000) × 20% = **Rs 1,600 payable**
> - If reversed: (10,000 × 20%) − 2,000 = Rs 0 payable
>
> The concession is shared with the insurer rather than given entirely to the
> patient.

**The consultation rule is enforced twice** — defence in depth:
1. In `computeBill()` — `type === 'consultation'` forces `concession = 0`
2. In `applyConcession()` — **throws** `"Concession is not allowed on the consultation fee."`
3. And a third time in the UI — the Concession button doesn't even render
   (`canConcession = bill.type !== "consultation"`)

### What paying each bill type unlocks

```mermaid
flowchart LR
    A["markBillPaid(billId)"] --> B["bills.status = 'paid'<br/>paid_at = now()"]
    B --> C{"bill.type"}
    C -->|consultation| D["patients.status<br/>→ 'with_doctor'<br/>🔓 unlocks doctor"]
    C -->|lab| E["lab_orders.status<br/>→ 'paid'<br/>🔓 unlocks report"]
    C -->|operation| F["operations.status<br/>→ 'paid'<br/>🔓 unlocks completion"]
    C -->|admission| G["(no unlock — bed<br/>already occupied)"]

    style D fill:#dcfce7,stroke:#16a34a
    style E fill:#dcfce7,stroke:#16a34a
    style F fill:#dcfce7,stroke:#16a34a
```

Every payment is a **state unlock**. This one function is the hinge of the entire
workflow.

---

## 8. The audit trail — how the timeline is built

**Every** meaningful action calls `logEvent()`, which appends one immutable row to
`patient_events`. Nothing ever updates or deletes them.

```mermaid
flowchart LR
    subgraph WRITE["✍️ Every action appends"]
        A1["registerPatient"] --> L["logEvent(patientId,<br/>type, description, actor)"]
        A2["markBillPaid"] --> L
        A3["applyConcession"] --> L
        A4["billLabOrder"] --> L
        A5["generateLabReport"] --> L
        A6["scheduleOperation"] --> L
        A7["rescheduleOperation"] --> L
        A8["completeOperation"] --> L
        A9["admitPatient"] --> L
        A10["dischargePatient"] --> L
        A11["addNote / orderLab"] --> L
        A12["completeCheckup / requestFollowup"] --> L
    end

    L --> DB[("patient_events<br/>id · type · description<br/>actor · created_at")]

    DB --> READ["getPatientEvents()<br/>ORDER BY id"]
    READ --> TV["🧮 TimelineViewer<br/>DoublyLinkedList"]
    TV --> UI["◀ Prev / Next ▶<br/>walk the chain"]

    style L fill:#fef3c7,stroke:#d97706
```

The `actor` string comes from `actor()` → `"Name (role)"`, so the timeline records
**who** did each thing, not just what happened. This append-only log is what makes
the doubly linked list the natural fit: the events are inherently a **chain**, and
the UI walks it in both directions.

---

## 9. DSA MAP — where every structure runs

### 9.1 Structures wired into live workflows (7)

| # | Structure | File | Runs in | Triggered by | Complexity |
|:---:|---|---|---|---|---|
| 1 | **Graph + Dijkstra** | `dsa/graph.ts` | `lib/routing.ts` | Reception picks an issue | `O(V²)` |
| 2 | **quickSort** | `dsa/sorting.ts` | `lib/routing.ts` | Same request — ranks doctors | `O(n log n)` avg |
| 3 | **Queue (FIFO)** | `dsa/queue.ts` | `reception/queue` | Page load | `O(1)` enq/deq |
| 4 | **MinPriorityQueue** | `dsa/priority-queue.ts` | `doctor/queue` | Page load | `O(log n)` |
| 5 | **SinglyLinkedList** | `dsa/linked-list.ts` | `clinical-console` | Doctor opens a patient | `O(1)` append |
| 6 | **DoublyLinkedList** | `dsa/doubly-linked-list.ts` | `timeline-viewer` | Any patient detail page | `O(1)` back/forward |
| 7 | **Sorting (5 algos)** | `dsa/sorting.ts` | `/dsa` sort-race | Gallery demo | see `DSA.md` |

### 9.2 Structures implemented + demonstrated in the gallery (4)

These are fully implemented and unit-tested, and appear on `/dsa` with live
complexity tables, but no production page feeds real rows through them:

| Structure | File | Models |
|---|---|---|
| **Stack (LIFO)** | `dsa/stack.ts` | Undo / action history |
| **BST** | `dsa/bst.ts` | Patient lookup by ID |
| **Red-Black Tree** | `dsa/red-black-tree.ts` | Appointment index by date (stays `O(log n)` on sorted inserts — height 17 for 1,000) |
| **HashMap** | `dsa/hash-map.ts` | O(1) patient / doctor lookup (djb2 + chaining) |
| **DynamicArray** | `dsa/dynamic-array.ts` | Bill line-items + binary search |

Be precise about this distinction if you're asked in a viva: **7 structures do
real work; 4 are demonstrated.** `DSA.md`'s own table already marks the second
group as *"Implemented + gallery"* rather than *"Yes — wired"*, so this document
agrees with it.

### 9.3 The one place the code and the docs disagree

⚠️ **`src/components/timeline-viewer.tsx` builds the DoublyLinkedList but never
reads it.**

```js
const list = useMemo(() => {         // ← built…
  const dll = new DoublyLinkedList<PatientEvent>();
  events.forEach((e) => dll.append(e));
  return dll;
}, [events]);

const [idx, setIdx] = useState(events.length - 1);
const current = events[clamped];      // ← …but rendering uses ARRAY INDEXING
```

`list` is assigned and never used again. Prev/Next call `setIdx(i ± 1)` and read
`events[clamped]` — the array — instead of the list's `back()` / `forward()`
cursor. So the rendered timeline is correct, but the DLL is currently
**decorative**, which contradicts the claim in `DSA.md §5` and the
"walk forward/back in O(1)" caption on both patient detail pages.

**Fix:** drive the cursor from the list — call `list.back()` / `list.forward()`
in the buttons and render the returned value. That is a small change and it would
make the caption true. Worth doing before submission, since a viva question like
*"show me the doubly linked list actually running"* would land right here.

### 9.4 Which DSA runs on which route

```mermaid
flowchart LR
    subgraph RECEPTION["👩‍💼 Reception"]
        R1["/patients/new"] -.-> G["🔷 Graph + Dijkstra"]
        R1 -.-> QS["🔷 quickSort"]
        R2["/queue"] -.-> Q["🔷 Queue FIFO"]
        R3["/patients/[id]"] -.-> DLL["🔷 DoublyLinkedList"]
    end

    subgraph DOCTOR["👨‍⚕️ Doctor"]
        D1["/queue"] -.-> PQ["🔷 MinPriorityQueue"]
        D2["/patients/[id]"] -.-> SLL["🔷 SinglyLinkedList"]
        D2 -.-> DLL
    end

    subgraph ADMIN["👨‍💼 Admin"]
        A1["/doctors"] -.-> NONE["— plain SQL —"]
        A2["/wards"] -.-> NONE
    end

    subgraph GALLERY["📚 /dsa — all roles"]
        GA["Gallery"] -.-> ALL["🔶 Stack · BST · RBTree<br/>HashMap · DynamicArray<br/>+ 5-way sort race"]
    end

    style G fill:#dbeafe
    style QS fill:#dbeafe
    style Q fill:#dbeafe
    style PQ fill:#dbeafe
    style SLL fill:#dbeafe
    style DLL fill:#dbeafe
    style ALL fill:#fed7aa
```

Note the admin panel uses **no data structure** — it's straight CRUD over SQL.
That's honest and correct: there's nothing to order or route there.

---

## 10. PROGRAMMING MODULE MAP

Which framework/language feature carries which responsibility:

| Module / Feature | Where | Why it was chosen |
|---|---|---|
| **Next.js App Router** | `src/app/**` | File-system routing; `(app)` groups shared layout without a URL segment |
| **React Server Components** | every `page.tsx` | Query Postgres directly in the component — no API layer needed |
| **Client Components** (`"use client"`) | forms, consoles, timeline | Needed for `useState` / event handlers |
| **Server Actions** (`"use server"`) | `lib/actions.ts` | **Every write.** Type-safe RPC from client → server with no REST endpoints |
| **`proxy.ts`** | root | Next.js 16's renamed `middleware.ts` — optimistic cookie gate |
| **`revalidatePath()`** | after every write | Busts the Server Component cache so pages show fresh data |
| **`useTransition()`** | every console | Non-blocking pending state; drives all `disabled={pending}` |
| **`useMemo()`** | `timeline-viewer` | Rebuild the list only when events change |
| **React `cache()`** | `session.ts` | One session lookup per request instead of layout + page both hitting the DB |
| **Dynamic routes** | `patients/[id]` | `params` is a **Promise** in Next.js 16 — must be `await`ed |
| **`Promise.all()`** | detail pages | Fires 6–8 queries in parallel instead of sequentially |
| **Better Auth** | `lib/auth.ts` | Email/password + role & doctorId via `additionalFields` |
| **`pg` Pool** | `lib/db.ts` | Cached on `globalThis` so hot-reload doesn't exhaust connections |
| **Parameterised SQL** (`$1, $2`) | everywhere | SQL-injection safety |
| **TypeScript** | whole repo | `lib/types.ts` mirrors every table row |
| **Tailwind v4** | `globals.css` | `@theme` tokens + `.card` / `.btn-primary` utilities |
| **Postgres `serial`** | `patients.id` | Auto integer IDs 1,2,3… — collision-safe without app logic |
| **Postgres `CHECK`** | `schema.sql` | DB refuses invalid status/severity even if app code has a bug |
| **`ON DELETE CASCADE`** | FKs | Deleting a patient cleans up bills/notes/events automatically |
| **`Blob` + `URL.createObjectURL`** | `patient-console` | Client-side lab-report download with no server round-trip |

### Request lifecycle — a write, end to end

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as Client Component
    participant P as proxy.ts
    participant A as Server Action
    participant S as session.ts
    participant D as 🧮 DSA
    participant DB as 🗄️ Postgres

    U->>C: Click "Mark paid"
    C->>C: startTransition() → pending=true
    C->>A: markBillPaid(billId)
    A->>S: getCurrentUser()
    S-->>A: {name, role, doctorId}
    A->>DB: UPDATE bills SET status='paid'
    DB-->>A: {patient_id, type}
    A->>DB: UPDATE patients SET status='with_doctor'
    A->>DB: INSERT INTO patient_events
    A->>A: revalidatePath()
    A-->>C: void
    C->>C: router.refresh()
    C->>P: GET /reception/patients/1
    P->>P: cookie present ✓
    P->>DB: SELECT rows
    DB-->>D: rows
    D->>D: build structure, run algorithm
    D-->>C: ordered result → HTML
    C-->>U: Fresh page
```

---

## 11. Known gaps & inconsistencies

Found while tracing the code. Listed newest-reader-first so you can decide what to
fix before submitting:

| # | Issue | Where | Impact |
|:---:|---|---|---|
| 1 | **DoublyLinkedList built but never read** — timeline renders via array indexing | `timeline-viewer.tsx:13–24` | Docs claim O(1) cursor walking; the structure is currently decorative. **Highest-value fix.** |
| 2 | **No bed/ward CRUD** — beds exist only via `npm run seed` | no action exists; `admin/wards/page.tsx` | Admin can't add a ward/bed without re-seeding |
| 3 | **`PatientStatus` type is out of date** — missing `follow_up` and `checkup_complete` | `lib/types.ts:3–7` | Type lies about reality; schema has 6 statuses, the type lists 4 |
| 4 | **Search interpolates a raw string into SQL** | `lib/data.ts:69` | Only strips quotes rather than parameterising, unlike every other query here |
| 5 | **`recommendAdmission` changes no state** | `actions.ts:392` | Logs an event only; reception must notice it in the timeline |
| 6 | **Operation payment deadline isn't enforced** | `actions.ts` | "Must pay before the date" is a manual check — nothing auto-reschedules an overdue op |

None of these break the demo flow. #1 and #3 are the ones a grader is most likely
to notice, and both are small fixes.

---

## 12. Quick reference

### Role → capability matrix

| Capability | 👨‍💼 Admin | 👩‍💼 Reception | 👨‍⚕️ Doctor |
|---|:---:|:---:|:---:|
| Create doctor / receptionist | ✅ | ❌ | ❌ |
| View wards & beds | ✅ (read-only) | ✅ (admit) | ❌ |
| **Add** a bed | ❌ *(seed only)* | ❌ | ❌ |
| Register patient | ❌ | ✅ | ❌ |
| Set triage severity | ❌ | ✅ | ❌ |
| Bills / concessions / payments | ❌ | ✅ | ❌ |
| Write notes, order labs/ops | ❌ | ❌ | ✅ |
| Close visit / request follow-up | ❌ | ❌ | ✅ |
| Schedule ops & follow-up dates | ❌ | ✅ | ❌ |
| Admit / discharge | ❌ | ✅ | ❌ |
| DSA Gallery | ✅ | ✅ | ✅ |

### File → responsibility

```
src/
├── proxy.ts                    Cookie gate (Next.js 16 middleware)
├── app/
│   ├── page.tsx                Redirect → role home
│   ├── login/                  Better Auth sign-in
│   └── (app)/
│       ├── layout.tsx          requireUser() + role-based nav
│       ├── admin/              Doctors CRUD · staff · wards (read-only)
│       ├── reception/          Intake · billing · FIFO queue · console
│       ├── doctor/             Priority queue · clinical console
│       └── dsa/                Gallery + live demos
├── components/
│   ├── shell.tsx               Sidebar + page chrome
│   ├── ui.tsx                  StatCard · StatusBadge · SEVERITY_LEVELS
│   └── timeline-viewer.tsx     DoublyLinkedList timeline  ⚠️ see §9.3
└── lib/
    ├── actions.ts              🔥 ALL writes (server actions)
    ├── data.ts                 All reads (queries)
    ├── routing.ts              🧮 Graph + Dijkstra + quickSort
    ├── billing.ts              💵 computeBill() — all money maths
    ├── auth.ts / session.ts    Better Auth + requireRole()
    ├── db.ts                   Postgres pool
    ├── catalog.ts              LAB_TESTS · PROCEDURES · report generator
    └── dsa/                    🧮 11 hand-written structures
```

### Demo script (5 minutes, hits every structure)

1. **Login as admin** → `/admin/doctors` → add a Cardiology doctor, rating 4.9
2. **Login as reception** → New Patient → issue **"chest pain"** →
   👀 *watch the Graph route to Cardiology and quickSort rank your new doctor first*
3. Set severity **1 (Critical)** → register → **Mark consultation paid**
4. Register a second patient, severity **5 (Routine)** → pay
5. **Login as doctor** → `/doctor/queue` →
   👀 *the critical patient is #1 even though they registered first — the min-heap at work*
6. Open the patient → add two notes (SinglyLinkedList) → order a lab test
7. **Back to reception** → bill the lab → pay → generate report → download
8. Admit to a bed → `/admin/wards` shows it 🔴 occupied → discharge → 🟢 free again
9. Walk the **timeline** Prev/Next on the patient detail page
10. **`/dsa`** → run the sort race and the triage demo

---

*Generated by reading every file in `src/`, `scripts/`, and `schema.sql`.*
