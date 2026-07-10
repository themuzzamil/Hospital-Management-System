"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReceptionist } from "@/lib/actions";

export default function StaffManager({
  staff,
}: {
  staff: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShow((s) => !s)}>{show ? "Close" : "Add receptionist"}</button>
      </div>
      {show && (
        <div className="card p-5">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">Password</label><input className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          </div>
          <button
            className="btn-primary mt-4"
            disabled={pending || !name || !email || password.length < 6}
            onClick={() => start(async () => { await createReceptionist({ name, email, password }); setName(""); setEmail(""); setPassword(""); setShow(false); router.refresh(); })}
          >
            Create receptionist
          </button>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-muted text-left">
            <tr><th className="px-5 py-2 font-medium">Name</th><th className="px-5 py-2 font-medium">Email</th></tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-5 py-2 font-medium">{s.name}</td>
                <td className="px-5 py-2 text-muted">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
