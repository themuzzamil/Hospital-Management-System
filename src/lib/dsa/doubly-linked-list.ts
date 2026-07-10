import type { Complexity } from "./complexity";

/**
 * Doubly Linked List — hand-written. Each node points both forward (next)
 * and backward (prev), so we can walk the sequence in either direction.
 *
 * Hospital use: the patient MEDICAL TIMELINE. Every event (registered, saw
 * doctor, lab ordered, operation, admitted, discharged) is a node. The UI
 * lets the user step FORWARD and BACKWARD through the patient's history —
 * that bidirectional walk is exactly what a doubly linked list gives O(1).
 */

class DNode<T> {
  value: T;
  prev: DNode<T> | null = null;
  next: DNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

export class DoublyLinkedList<T> {
  private head: DNode<T> | null = null;
  private tail: DNode<T> | null = null;
  private cursor: DNode<T> | null = null;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  /** Append a new event at the end and move the cursor to it. O(1). */
  append(value: T): void {
    const node = new DNode(value);
    if (this.tail) {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = this.tail = node;
    }
    this.cursor = node;
    this._size++;
  }

  /** Current event under the cursor. */
  current(): T | undefined {
    return this.cursor?.value;
  }

  /** Step the cursor backward through history. O(1). */
  back(): T | undefined {
    if (this.cursor?.prev) this.cursor = this.cursor.prev;
    return this.cursor?.value;
  }

  /** Step the cursor forward through history. O(1). */
  forward(): T | undefined {
    if (this.cursor?.next) this.cursor = this.cursor.next;
    return this.cursor?.value;
  }

  /** Snapshot head -> tail (chronological). O(n). */
  toArray(): T[] {
    const out: T[] = [];
    let cur = this.head;
    while (cur) {
      out.push(cur.value);
      cur = cur.next;
    }
    return out;
  }

  /** Snapshot tail -> head (reverse chronological). O(n). */
  toArrayReverse(): T[] {
    const out: T[] = [];
    let cur = this.tail;
    while (cur) {
      out.push(cur.value);
      cur = cur.prev;
    }
    return out;
  }

  static readonly complexity: Complexity = {
    name: "Doubly Linked List",
    usedFor: "Patient medical timeline — step forward/back through visits.",
    operations: [
      { name: "append", time: "O(1)" },
      { name: "back", time: "O(1)", note: "follow prev pointer" },
      { name: "forward", time: "O(1)", note: "follow next pointer" },
      { name: "toArray", time: "O(n)" },
    ],
    space: "O(n)",
  };
}
