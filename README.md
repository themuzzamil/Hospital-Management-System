# 🏥 MediStruct — Hospital Management System (DSA Project)

A Hospital Management System where **every workflow is powered by a hand-written
data structure**. Built with Next.js 16 (App Router), TypeScript, Tailwind v4,
Better Auth, and Neon Postgres.

Three roles — **Admin**, **Doctor**, **Receptionist** — walk a patient through
the full journey: registration → specialist routing → consultation → labs →
operation → admission → **discharge**, with a complete audit trail.

## Where each data structure is used

All structures are hand-written from scratch in [`src/lib/dsa/`](src/lib/dsa)
(no libraries). Each exports a `complexity` descriptor shown live on the **DSA
Gallery** page (`/dsa`).

> **For the full DSA write-up — where each structure is used, how it is
> implemented, pseudocode, and complexity — see [DSA.md](DSA.md).**

| Structure | File | Real feature |
|---|---|---|
| **Dynamic Array** | `dynamic-array.ts` | Bill line-items; binary search over sorted IDs |
| **Queue (FIFO)** | `queue.ts` | Reception & doctor **waiting queues** |
| **Priority Queue (min-heap)** | `priority-queue.ts` | **Emergency triage** (live demo on `/dsa`) |
| **Stack (LIFO)** | `stack.ts` | Undo / action history |
| **Singly Linked List** | `linked-list.ts` | Doctor's chronological **notes log** |
| **Doubly Linked List** | `doubly-linked-list.ts` | **Patient timeline** — walk forward/back (O(1)) |
| **Binary Search Tree** | `bst.ts` | Patient lookup by ID |
| **Red-Black Tree** | `red-black-tree.ts` | Balanced **appointment index by date** |
| **Graph (adjacency list)** | `graph.ts` | **Symptom → specialist routing** (BFS / Dijkstra) |
| **Hash Map (chaining)** | `hash-map.ts` | O(1) patient / insurance / doctor lookups |
| **Sorting (5 algorithms)** | `sorting.ts` | Rank doctors, bills, appointments (live race on `/dsa`) |

## Workflow highlights

- **Auto patient ID** — Postgres `serial`, integer starting at 1 (collision-safe).
- **Insurance** — percentage coverage; concession (lab/operation/admission only,
  never the consultation) applied first, then insurance %, then patient pays the rest.
- **Operation loop** — schedule → must pay before the date → else **reschedule**
  (patient meets doctor again → new date) → pay → complete → **discharge**.
- **Beds** — admitting occupies a bed; **discharge frees it automatically**.
- **Audit trail** — every action appends a `patient_events` row = the timeline.

## Getting started

```bash
npm install
npm run seed      # creates schema + demo data + login accounts
npm run dev       # http://localhost:3000
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@medistruct.com | admin123 |
| Doctor | sara@medistruct.com | doctor123 |
| Receptionist | reception@medistruct.com | reception123 |

## Tests

```bash
npm run dsa:test                # 20 unit assertions on the data structures
npx tsx scripts/flow-test.mts   # full patient-journey write-path integration test
```

## Security note

The Neon `DATABASE_URL` lives in `.env.local` (gitignored). **Rotate the
password in the Neon console before making this repo public or submitting.**
Also change `BETTER_AUTH_SECRET`.
