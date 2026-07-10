"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findSpecialists, registerPatient } from "@/lib/actions";
import type { RouteResult } from "@/lib/routing";

type DoctorOpt = { id: number; name: string; specialty: string; fee: number; rating: number };

export default function NewPatientForm({ doctors, issues }: { doctors: DoctorOpt[]; issues: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [issue, setIssue] = useState("");
  const [doctorId, setDoctorId] = useState<number | "">("");
  const [method, setMethod] = useState<"self" | "insurance">("self");
  const [provider, setProvider] = useState("");
  const [coverage, setCoverage] = useState("80");

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selecting an issue immediately routes to the right department + doctors.
  async function onIssueChange(value: string) {
    setIssue(value);
    setRoute(null);
    setDoctorId("");
    if (!value) return;
    setRouting(true);
    const r = await findSpecialists(value);
    setRoute(r);
    setRouting(false);
    if (r.doctors[0]) setDoctorId(r.doctors[0].id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Patient name is required.");
    startTransition(async () => {
      try {
        const id = await registerPatient({
          name: name.trim(),
          age: age ? Number(age) : null,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
          issue: issue || null,
          doctorId: doctorId === "" ? null : Number(doctorId),
          paymentMethod: method,
          insuranceProvider: method === "insurance" ? provider || null : null,
          coveragePercent: method === "insurance" ? Number(coverage) || 0 : 0,
        });
        router.push(`/reception/patients/${id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const selectedDoc = doctors.find((d) => d.id === doctorId);

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic info */}
      <section className="card p-5">
        <h2 className="font-semibold mb-4">Patient details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Age</label>
            <input className="input" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select…</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Issue + routing */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Issue &amp; specialist routing</h2>
        <p className="text-xs text-muted mb-4">
          Select the patient&apos;s issue — the system routes to the right department automatically.
        </p>
        <label className="label">Issue</label>
        <select className="input" value={issue} onChange={(e) => onIssueChange(e.target.value)}>
          <option value="">Select the patient&apos;s issue…</option>
          {issues.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {routing && <p className="text-xs text-muted mt-2">Routing…</p>}

        {route && (
          <div className="mt-4 rounded-lg bg-background border border-border p-3 text-sm">
            {route.specialty ? (
              <>
                <p>
                  <span className="text-muted">Graph route:</span>{" "}
                  <span className="font-mono">{route.path.join("  →  ")}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted">Department:</span>{" "}
                  <span className="badge-blue">{route.specialty}</span>{" "}
                  <span className="text-muted">· doctors ranked by rating (quickSort)</span>
                </p>
              </>
            ) : (
              <p className="text-warning">
                No matching symptom found — pick a doctor manually below.
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <label className="label">Assign doctor</label>
          <select
            className="input"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Select a doctor…</option>
            {(route?.doctors.length ? route.doctors.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty ?? "", fee: Number(d.consultation_fee), rating: Number(d.rating) })) : doctors).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.specialty} · Rating {d.rating} · Fee Rs {d.fee}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Payment */}
      <section className="card p-5">
        <h2 className="font-semibold mb-4">Consultation payment</h2>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={method === "self"} onChange={() => setMethod("self")} /> Self-pay
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={method === "insurance"} onChange={() => setMethod("insurance")} /> Insurance
          </label>
        </div>
        {method === "insurance" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Insurance provider</label>
              <input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. State Life" />
            </div>
            <div>
              <label className="label">Coverage %</label>
              <input className="input" type="number" min="0" max="100" value={coverage} onChange={(e) => setCoverage(e.target.value)} />
            </div>
          </div>
        )}
        {selectedDoc && (
          <p className="text-sm text-muted mt-3">
            Consultation fee: <span className="font-medium text-foreground">Rs {selectedDoc.fee}</span>
            {method === "insurance" && (
              <> · Insurance covers {coverage}% · Patient pays <span className="font-medium text-foreground">Rs {Math.max(0, Math.round(selectedDoc.fee * (1 - Number(coverage) / 100)))}</span></>
            )}
          </p>
        )}
      </section>

      {error && (
        <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Registering…" : "Register patient"}
        </button>
        <button type="button" className="btn-outline" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
