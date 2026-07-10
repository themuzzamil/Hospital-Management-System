"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDoctor, updateDoctor, deleteDoctor } from "@/lib/actions";
import { StatusBadge } from "@/components/ui";
import { money } from "@/lib/billing";
import type { Doctor } from "@/lib/types";

type Spec = { id: number; name: string };

export default function DoctorsManager({
  doctors,
  specialties,
}: {
  doctors: Doctor[];
  specialties: Spec[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          {showNew ? "Close" : "Add doctor"}
        </button>
      </div>

      {showNew && (
        <NewDoctorForm
          specialties={specialties}
          pending={pending}
          onSubmit={(v) => run(async () => { await createDoctor(v); setShowNew(false); })}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-muted text-left">
            <tr>
              <th className="px-5 py-2 font-medium">ID</th>
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Specialty</th>
              <th className="px-5 py-2 font-medium">Fee</th>
              <th className="px-5 py-2 font-medium">Rating</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) =>
              editId === d.id ? (
                <EditDoctorRow
                  key={d.id}
                  doctor={d}
                  specialties={specialties}
                  pending={pending}
                  onCancel={() => setEditId(null)}
                  onSave={(v) => run(async () => { await updateDoctor(v); setEditId(null); })}
                />
              ) : (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-5 py-2 font-mono">#{d.id}</td>
                  <td className="px-5 py-2 font-medium">{d.name}</td>
                  <td className="px-5 py-2">{d.specialty ?? "—"}</td>
                  <td className="px-5 py-2">{money(d.consultation_fee)}</td>
                  <td className="px-5 py-2">{d.rating}</td>
                  <td className="px-5 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-2 text-right whitespace-nowrap">
                    <button className="btn-outline px-2 py-1 text-xs mr-1" onClick={() => setEditId(d.id)}>Edit</button>
                    <button
                      className="btn-danger px-2 py-1 text-xs"
                      disabled={pending}
                      onClick={() => { if (confirm(`Delete ${d.name}? This removes their login too.`)) run(() => deleteDoctor(d.id)); }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewDoctorForm({
  specialties,
  pending,
  onSubmit,
}: {
  specialties: Spec[];
  pending: boolean;
  onSubmit: (v: { name: string; email: string; password: string; specialtyId: number; fee: number; rating: number }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialtyId, setSpecialtyId] = useState(specialties[0]?.id ?? 0);
  const [fee, setFee] = useState("1500");
  const [rating, setRating] = useState("4.5");

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3">New doctor</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Email (login)</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div>
          <label className="label">Specialty</label>
          <select className="input" value={specialtyId} onChange={(e) => setSpecialtyId(Number(e.target.value))}>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><label className="label">Consultation fee</label><input className="input" type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
        <div><label className="label">Rating</label><input className="input" type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} /></div>
      </div>
      <button
        className="btn-primary mt-4"
        disabled={pending || !name || !email || password.length < 6}
        onClick={() => onSubmit({ name, email, password, specialtyId, fee: Number(fee), rating: Number(rating) })}
      >
        Create doctor
      </button>
      {password.length > 0 && password.length < 6 && <p className="text-xs text-danger mt-1">Password must be at least 6 characters.</p>}
    </div>
  );
}

function EditDoctorRow({
  doctor,
  specialties,
  pending,
  onCancel,
  onSave,
}: {
  doctor: Doctor;
  specialties: Spec[];
  pending: boolean;
  onCancel: () => void;
  onSave: (v: { id: number; name: string; specialtyId: number; fee: number; rating: number; status: "active" | "inactive" }) => void;
}) {
  const [name, setName] = useState(doctor.name);
  const [specialtyId, setSpecialtyId] = useState(doctor.specialty_id ?? specialties[0]?.id ?? 0);
  const [fee, setFee] = useState(doctor.consultation_fee);
  const [rating, setRating] = useState(doctor.rating);
  const [status, setStatus] = useState<"active" | "inactive">(doctor.status);

  return (
    <tr className="border-t border-border bg-background">
      <td className="px-5 py-2 font-mono">#{doctor.id}</td>
      <td className="px-3 py-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td className="px-3 py-2">
        <select className="input" value={specialtyId} onChange={(e) => setSpecialtyId(Number(e.target.value))}>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input className="input" type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></td>
      <td className="px-3 py-2"><input className="input" type="number" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} /></td>
      <td className="px-3 py-2">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button className="btn-primary px-2 py-1 text-xs mr-1" disabled={pending} onClick={() => onSave({ id: doctor.id, name, specialtyId, fee: Number(fee), rating: Number(rating), status })}>Save</button>
        <button className="btn-outline px-2 py-1 text-xs" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  );
}
