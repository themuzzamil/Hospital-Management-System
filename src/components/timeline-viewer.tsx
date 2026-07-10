"use client";

import { useMemo, useState } from "react";
import { DoublyLinkedList } from "@/lib/dsa";
import { Icon } from "@/components/icons";
import type { PatientEvent } from "@/lib/types";

/**
 * Patient timeline rendered from a hand-written Doubly Linked List. The cursor
 * walks forward/back in O(1) — the exact operation the structure exists for.
 */
export default function TimelineViewer({ events }: { events: PatientEvent[] }) {
  const list = useMemo(() => {
    const dll = new DoublyLinkedList<PatientEvent>();
    events.forEach((e) => dll.append(e));
    return dll;
  }, [events]);

  const [idx, setIdx] = useState(events.length - 1);
  if (events.length === 0)
    return <p className="text-sm text-muted">No history yet.</p>;

  const clamped = Math.max(0, Math.min(idx, events.length - 1));
  const current = events[clamped];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          className="btn-outline px-3 py-1 text-xs"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={clamped === 0}
        >
          <Icon name="chevronLeft" size={14} /> Prev
        </button>
        <span className="text-xs text-muted font-mono">
          node {clamped + 1} / {events.length}
        </span>
        <button
          className="btn-outline px-3 py-1 text-xs"
          onClick={() => setIdx((i) => Math.min(events.length - 1, i + 1))}
          disabled={clamped === events.length - 1}
        >
          Next <Icon name="chevronRight" size={14} />
        </button>
      </div>

      {/* Chain visualization */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
        {events.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setIdx(i)}
            title={e.type}
            className={`shrink-0 h-3 w-8 rounded-full transition-colors ${
              i === clamped ? "bg-primary" : "bg-slate-200 hover:bg-slate-300"
            }`}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <span className="badge-blue">{current.type.replace(/_/g, " ")}</span>
          <span className="text-xs text-muted">
            {new Date(current.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm mt-2">{current.description}</p>
        {current.actor && (
          <p className="text-xs text-muted mt-1">by {current.actor}</p>
        )}
      </div>
    </div>
  );
}
