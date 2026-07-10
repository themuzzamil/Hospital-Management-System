import type { Complexity } from "./complexity";

/**
 * Queue (FIFO) — hand-written using a singly linked chain of nodes so that
 * enqueue and dequeue are both O(1) (no array shifting).
 *
 * Hospital use: the reception waiting line. A patient walks in and is
 * enqueued; the receptionist / doctor serves whoever has waited longest
 * (dequeue from the front). First-come, first-served.
 */

class QNode<T> {
  value: T;
  next: QNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

export class Queue<T> {
  private head: QNode<T> | null = null;
  private tail: QNode<T> | null = null;
  private _size = 0;

  /** Add to the back of the line. O(1). */
  enqueue(value: T): void {
    const node = new QNode(value);
    if (this.tail) {
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = this.tail = node;
    }
    this._size++;
  }

  /** Remove and return the front of the line. O(1). */
  dequeue(): T | undefined {
    if (!this.head) return undefined;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this._size--;
    return value;
  }

  /** Look at the front without removing it. O(1). */
  peek(): T | undefined {
    return this.head?.value;
  }

  get size(): number {
    return this._size;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  /** Snapshot front -> back for visualization. O(n). */
  toArray(): T[] {
    const out: T[] = [];
    let cur = this.head;
    while (cur) {
      out.push(cur.value);
      cur = cur.next;
    }
    return out;
  }

  static readonly complexity: Complexity = {
    name: "Queue (FIFO)",
    usedFor: "Reception waiting line — serve the patient who has waited longest.",
    operations: [
      { name: "enqueue", time: "O(1)", note: "append at tail pointer" },
      { name: "dequeue", time: "O(1)", note: "remove at head pointer" },
      { name: "peek", time: "O(1)" },
      { name: "toArray", time: "O(n)", note: "for visualization only" },
    ],
    space: "O(n)",
  };
}
