import type { Complexity } from "./complexity";

/**
 * Min Priority Queue — hand-written binary min-heap on an array.
 * The element with the SMALLEST priority number comes out first.
 *
 * Hospital use: emergency triage. Each waiting patient carries a severity
 * value (1 = critical ... 5 = routine). The critical patient is always served
 * next regardless of arrival order — a plain FIFO queue cannot do this.
 * Also used for "payments due soonest" (priority = days until deadline).
 */

export type Prioritized<T> = { priority: number; value: T };

export class MinPriorityQueue<T> {
  private heap: Prioritized<T>[] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** Insert with a priority. O(log n) — bubble up. */
  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  /** Remove and return the highest-priority (lowest number) item. O(log n). */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.value;
  }

  /** Peek the highest-priority item. O(1). */
  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].priority >= this.heap[parent].priority) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority)
        smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority)
        smallest = right;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(a: number, b: number): void {
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
  }

  /** Snapshot the heap array (level order) for visualization. O(n). */
  toArray(): Prioritized<T>[] {
    return [...this.heap];
  }

  static readonly complexity: Complexity = {
    name: "Min Priority Queue (Binary Heap)",
    usedFor: "Emergency triage — most-critical patient served first.",
    operations: [
      { name: "enqueue", time: "O(log n)", note: "bubble up the heap" },
      { name: "dequeue", time: "O(log n)", note: "bubble down the heap" },
      { name: "peek", time: "O(1)", note: "root is always the minimum" },
    ],
    space: "O(n)",
  };
}
