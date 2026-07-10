import type { Complexity } from "./complexity";

/**
 * Stack (LIFO) — hand-written on a plain array where the "top" is the last
 * element, giving O(1) push/pop.
 *
 * Hospital use: an action-history / UNDO stack. Every time the receptionist
 * changes a status (e.g. marks a bill "paid"), we push the previous state.
 * "Undo" pops the most recent change. Also used for back-navigation history.
 */
export class Stack<T> {
  private items: T[] = [];

  /** Push onto the top. O(1) amortized. */
  push(value: T): void {
    this.items.push(value);
  }

  /** Pop the top. O(1). */
  pop(): T | undefined {
    return this.items.pop();
  }

  /** Look at the top without removing. O(1). */
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Snapshot bottom -> top for visualization. O(n). */
  toArray(): T[] {
    return [...this.items];
  }

  static readonly complexity: Complexity = {
    name: "Stack (LIFO)",
    usedFor: "Undo history — reverse the most recent status change first.",
    operations: [
      { name: "push", time: "O(1)", note: "amortized (array append)" },
      { name: "pop", time: "O(1)" },
      { name: "peek", time: "O(1)" },
    ],
    space: "O(n)",
  };
}
