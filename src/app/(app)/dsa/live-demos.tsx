"use client";

import { useState } from "react";
import { MinPriorityQueue, SORTS, type Metrics } from "@/lib/dsa";

/**
 * Two interactive demos that run the hand-written structures live in the
 * browser, so the complexity numbers on this page are not just theory.
 */
export default function LiveDemos() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
      <TriageDemo />
      <SortRaceDemo />
    </div>
  );
}

// ---- Emergency triage: Min Priority Queue --------------------------------
type TriagePatient = { name: string; severity: number };
const SAMPLE = [
  { name: "Ali (routine)", severity: 5 },
  { name: "Sara (critical)", severity: 1 },
  { name: "Bilal (urgent)", severity: 3 },
  { name: "Hina (moderate)", severity: 4 },
  { name: "Omar (emergency)", severity: 2 },
];

function TriageDemo() {
  const [pool, setPool] = useState<TriagePatient[]>(SAMPLE);
  const [served, setServed] = useState<TriagePatient[]>([]);

  function serveNext() {
    const pq = new MinPriorityQueue<TriagePatient>();
    pool.forEach((p) => pq.enqueue(p, p.severity));
    const next = pq.dequeue();
    if (!next) return;
    setServed((s) => [...s, next]);
    setPool((p) => {
      const i = p.findIndex((x) => x.name === next.name);
      return p.filter((_, idx) => idx !== i);
    });
  }

  function reset() {
    setPool(SAMPLE);
    setServed([]);
  }

  const sevBadge = (s: number) =>
    s <= 1 ? "badge-red" : s <= 2 ? "badge-amber" : s <= 3 ? "badge-blue" : "badge-gray";

  return (
    <div className="card p-5">
      <h3 className="font-semibold">Emergency triage — Priority Queue</h3>
      <p className="text-xs text-muted mt-1 mb-3">
        This is now a <span className="font-medium text-foreground">live feature</span>:
        reception sets each patient&apos;s severity, and the doctor&apos;s queue serves
        the most-critical patient (lowest severity number) next — regardless of
        arrival order, with ties broken by who has waited longest. Heap dequeue is O(log n).
      </p>
      <div className="flex gap-2 mb-3">
        <button className="btn-primary px-3 py-1 text-sm" onClick={serveNext} disabled={pool.length === 0}>
          Serve next
        </button>
        <button className="btn-outline px-3 py-1 text-sm" onClick={reset}>Reset</button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted text-xs mb-1">Waiting ({pool.length})</p>
          <ul className="space-y-1">
            {pool.map((p) => (
              <li key={p.name} className="flex justify-between items-center rounded border border-border px-2 py-1">
                <span>{p.name}</span>
                <span className={sevBadge(p.severity)}>sev {p.severity}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-muted text-xs mb-1">Served order</p>
          <ol className="space-y-1 list-decimal list-inside">
            {served.map((p, i) => (
              <li key={i} className="rounded bg-background px-2 py-1">{p.name}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ---- Sort race: compare our hand-written sorts ---------------------------
function SortRaceDemo() {
  const [input, setInput] = useState("8, 3, 7, 1, 9, 2, 5, 4, 6");
  const [results, setResults] = useState<{ name: string; metrics: Metrics; sorted: number[] }[]>([]);

  function race() {
    const arr = input
      .split(/[, ]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const cmp = (a: number, b: number) => a - b;
    const out = (Object.keys(SORTS) as (keyof typeof SORTS)[]).map((name) => {
      const r = SORTS[name](arr, cmp);
      return { name, metrics: r.metrics, sorted: r.sorted };
    });
    out.sort((a, b) => a.metrics.comparisons - b.metrics.comparisons);
    setResults(out);
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold">Sort race — compare algorithms</h3>
      <p className="text-xs text-muted mt-1 mb-3">
        Runs all five hand-written sorts on your numbers and counts real
        comparisons &amp; swaps. Ranked by comparisons (fewest first).
      </p>
      <div className="flex gap-2 mb-3">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary px-3 py-1 text-sm whitespace-nowrap" onClick={race}>Run</button>
      </div>
      {results.length > 0 && (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left">
            <tr>
              <th className="py-1 font-medium">Algorithm</th>
              <th className="py-1 font-medium">Compares</th>
              <th className="py-1 font-medium">Swaps</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.name} className="border-t border-border">
                <td className="py-1.5 capitalize">
                  {i === 0 ? <span className="font-medium text-primary">{r.name} (fewest)</span> : r.name}
                </td>
                <td className="py-1.5 font-mono">{r.metrics.comparisons}</td>
                <td className="py-1.5 font-mono">{r.metrics.swaps}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
