import type { Complexity } from "./complexity";

/**
 * Singly Linked List — hand-written. Grows by appending nodes; each node
 * points only forward.
 *
 * Hospital use: a doctor's chronological note log for a patient. Notes are
 * appended in order and read front-to-back. Cheap append, sequential read.
 */

class LNode<T> {
  value: T;
  next: LNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

export class SinglyLinkedList<T> {
  private head: LNode<T> | null = null;
  private tail: LNode<T> | null = null;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  /** Append at the end. O(1) using the tail pointer. */
  append(value: T): void {
    const node = new LNode(value);
    if (this.tail) {
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = this.tail = node;
    }
    this._size++;
  }

  /** Insert at the front. O(1). */
  prepend(value: T): void {
    const node = new LNode(value);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this._size++;
  }

  /** Linear search returning the first matching value. O(n). */
  find(predicate: (v: T) => boolean): T | undefined {
    let cur = this.head;
    while (cur) {
      if (predicate(cur.value)) return cur.value;
      cur = cur.next;
    }
    return undefined;
  }

  /** Remove the first node matching the predicate. O(n). */
  remove(predicate: (v: T) => boolean): boolean {
    let prev: LNode<T> | null = null;
    let cur = this.head;
    while (cur) {
      if (predicate(cur.value)) {
        if (prev) prev.next = cur.next;
        else this.head = cur.next;
        if (cur === this.tail) this.tail = prev;
        this._size--;
        return true;
      }
      prev = cur;
      cur = cur.next;
    }
    return false;
  }

  /** Snapshot head -> tail for visualization. O(n). */
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
    name: "Singly Linked List",
    usedFor: "Doctor's chronological note log for a patient.",
    operations: [
      { name: "append", time: "O(1)", note: "tail pointer" },
      { name: "prepend", time: "O(1)" },
      { name: "find", time: "O(n)", note: "linear scan" },
      { name: "remove", time: "O(n)" },
    ],
    space: "O(n)",
  };
}
