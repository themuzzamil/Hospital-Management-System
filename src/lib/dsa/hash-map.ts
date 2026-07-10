import type { Complexity } from "./complexity";

/**
 * Hash Map — hand-written with separate chaining (an array of buckets, each a
 * list of [key, value] pairs). Demonstrates the hashing + collision handling
 * that the language's built-in Map hides.
 *
 * Hospital use: O(1) average lookups the app does constantly — patient-by-ID,
 * insurance-plan-by-id, doctor-by-id — without walking a list every time.
 */

export class HashMap<V> {
  private buckets: [string, V][][];
  private _size = 0;
  private capacity: number;

  constructor(capacity = 16) {
    this.capacity = capacity;
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  get size(): number {
    return this._size;
  }

  /** djb2 string hash -> bucket index. */
  private hash(key: string): number {
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
      h = (h * 33) ^ key.charCodeAt(i);
    }
    return (h >>> 0) % this.capacity;
  }

  /** Insert or update. O(1) average. */
  set(key: string, value: V): void {
    const idx = this.hash(key);
    const bucket = this.buckets[idx];
    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value;
        return;
      }
    }
    bucket.push([key, value]);
    this._size++;
    if (this._size / this.capacity > 0.75) this.resize();
  }

  /** Lookup. O(1) average, O(n) worst if everything collides. */
  get(key: string): V | undefined {
    const bucket = this.buckets[this.hash(key)];
    for (const [k, v] of bucket) if (k === key) return v;
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Grow and re-hash when the load factor gets high. Amortized O(1) per set. */
  private resize(): void {
    const old = this.buckets;
    this.capacity *= 2;
    this.buckets = Array.from({ length: this.capacity }, () => []);
    this._size = 0;
    for (const bucket of old) for (const [k, v] of bucket) this.set(k, v);
  }

  /** Bucket occupancy for visualizing the hash distribution. */
  bucketSizes(): number[] {
    return this.buckets.map((b) => b.length);
  }

  static readonly complexity: Complexity = {
    name: "Hash Map (separate chaining)",
    usedFor: "Constant-time lookups: patient / insurance / doctor by id.",
    operations: [
      { name: "set", time: "O(1)", note: "average; amortized over resizes" },
      { name: "get", time: "O(1)", note: "average; O(n) worst on collisions" },
    ],
    space: "O(n)",
  };
}
