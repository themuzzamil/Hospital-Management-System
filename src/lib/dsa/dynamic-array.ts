import type { Complexity } from "./complexity";

/**
 * Dynamic Array — hand-written to expose the mechanics a native array hides:
 * a fixed-capacity backing store that doubles when full (amortized O(1) push),
 * plus O(n) insert/delete-at and O(log n) binary search on sorted data.
 *
 * Hospital use: the bill line-items list and any indexed collection where we
 * want random access. Also powers binary search over a sorted patient-id array
 * as an array-based alternative to the tree lookups.
 */
export class DynamicArray<T> {
  private store: (T | undefined)[];
  private _size = 0;
  private capacity: number;

  constructor(capacity = 4) {
    this.capacity = Math.max(1, capacity);
    this.store = new Array(this.capacity);
  }

  get size(): number {
    return this._size;
  }

  /** Random access by index. O(1). */
  get(i: number): T | undefined {
    if (i < 0 || i >= this._size) return undefined;
    return this.store[i];
  }

  set(i: number, value: T): void {
    if (i < 0 || i >= this._size) throw new RangeError("index out of bounds");
    this.store[i] = value;
  }

  /** Append. Amortized O(1); O(n) on the resize step. */
  push(value: T): void {
    if (this._size === this.capacity) this.grow();
    this.store[this._size++] = value;
  }

  /** Insert at index, shifting the tail right. O(n). */
  insertAt(i: number, value: T): void {
    if (i < 0 || i > this._size) throw new RangeError("index out of bounds");
    if (this._size === this.capacity) this.grow();
    for (let j = this._size; j > i; j--) this.store[j] = this.store[j - 1];
    this.store[i] = value;
    this._size++;
  }

  /** Delete at index, shifting the tail left. O(n). */
  removeAt(i: number): T | undefined {
    if (i < 0 || i >= this._size) return undefined;
    const removed = this.store[i];
    for (let j = i; j < this._size - 1; j++) this.store[j] = this.store[j + 1];
    this.store[--this._size] = undefined;
    return removed as T;
  }

  private grow(): void {
    this.capacity *= 2;
    const bigger = new Array<T | undefined>(this.capacity);
    for (let i = 0; i < this._size; i++) bigger[i] = this.store[i];
    this.store = bigger;
  }

  /** Binary search on a sorted array via a key function. O(log n). */
  binarySearch(target: number, keyOf: (v: T) => number): number {
    let lo = 0;
    let hi = this._size - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const k = keyOf(this.store[mid] as T);
      if (k === target) return mid;
      if (k < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  toArray(): T[] {
    return this.store.slice(0, this._size) as T[];
  }

  static readonly complexity: Complexity = {
    name: "Dynamic Array",
    usedFor: "Bill line-items and binary search over sorted ids.",
    operations: [
      { name: "get/set", time: "O(1)", note: "random access" },
      { name: "push", time: "O(1)", note: "amortized; O(n) on resize" },
      { name: "insertAt/removeAt", time: "O(n)", note: "shift elements" },
      { name: "binarySearch", time: "O(log n)", note: "sorted data only" },
    ],
    space: "O(n)",
  };
}
