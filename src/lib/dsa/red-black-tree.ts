import type { Complexity } from "./complexity";

/**
 * Red-Black Tree — hand-written, self-balancing binary search tree
 * (CLRS-style with a shared NIL sentinel). Insertions re-color and rotate so
 * the tree height stays O(log n) even if keys arrive in sorted order — fixing
 * the worst-case weakness of the plain BST in this folder.
 *
 * Hospital use: the appointment index keyed by date (as an integer, e.g.
 * YYYYMMDD). Appointments are booked in roughly increasing date order, which
 * would make a plain BST degenerate into a linked list; the Red-Black tree
 * guarantees O(log n) insert and range lookup so "today's schedule" stays fast.
 */

type Color = "RED" | "BLACK";

class RBNode<T> {
  key: number;
  value: T;
  color: Color = "RED";
  left: RBNode<T>;
  right: RBNode<T>;
  parent: RBNode<T>;
  constructor(key: number, value: T, nil?: RBNode<T>) {
    this.key = key;
    this.value = value;
    // The sentinel points its own links at itself until real nodes are linked.
    this.left = nil ?? this;
    this.right = nil ?? this;
    this.parent = nil ?? this;
  }
}

export class RedBlackTree<T> {
  private readonly nil: RBNode<T>;
  private root: RBNode<T>;
  private _size = 0;

  constructor() {
    // Sentinel leaf, always BLACK.
    this.nil = new RBNode<T>(NaN, undefined as unknown as T);
    this.nil.color = "BLACK";
    this.nil.left = this.nil.right = this.nil.parent = this.nil;
    this.root = this.nil;
  }

  get size(): number {
    return this._size;
  }

  private leftRotate(x: RBNode<T>): void {
    const y = x.right;
    x.right = y.left;
    if (y.left !== this.nil) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === this.nil) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rightRotate(x: RBNode<T>): void {
    const y = x.left;
    x.left = y.right;
    if (y.right !== this.nil) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent === this.nil) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  /** Insert or update a key. O(log n). */
  insert(key: number, value: T): void {
    // Update if the key already exists.
    let cur = this.root;
    while (cur !== this.nil) {
      if (key === cur.key) {
        cur.value = value;
        return;
      }
      cur = key < cur.key ? cur.left : cur.right;
    }

    const z = new RBNode(key, value, this.nil);
    let y = this.nil;
    let x = this.root;
    while (x !== this.nil) {
      y = x;
      x = z.key < x.key ? x.left : x.right;
    }
    z.parent = y;
    if (y === this.nil) this.root = z;
    else if (z.key < y.key) y.left = z;
    else y.right = z;
    z.left = this.nil;
    z.right = this.nil;
    z.color = "RED";
    this._size++;
    this.insertFixup(z);
  }

  private insertFixup(z: RBNode<T>): void {
    while (z.parent.color === "RED") {
      if (z.parent === z.parent.parent.left) {
        const y = z.parent.parent.right; // uncle
        if (y.color === "RED") {
          z.parent.color = "BLACK";
          y.color = "BLACK";
          z.parent.parent.color = "RED";
          z = z.parent.parent;
        } else {
          if (z === z.parent.right) {
            z = z.parent;
            this.leftRotate(z);
          }
          z.parent.color = "BLACK";
          z.parent.parent.color = "RED";
          this.rightRotate(z.parent.parent);
        }
      } else {
        const y = z.parent.parent.left; // uncle
        if (y.color === "RED") {
          z.parent.color = "BLACK";
          y.color = "BLACK";
          z.parent.parent.color = "RED";
          z = z.parent.parent;
        } else {
          if (z === z.parent.left) {
            z = z.parent;
            this.rightRotate(z);
          }
          z.parent.color = "BLACK";
          z.parent.parent.color = "RED";
          this.leftRotate(z.parent.parent);
        }
      }
    }
    this.root.color = "BLACK";
  }

  /** Search by key. O(log n). */
  search(key: number): T | undefined {
    let cur = this.root;
    while (cur !== this.nil) {
      if (key === cur.key) return cur.value;
      cur = key < cur.key ? cur.left : cur.right;
    }
    return undefined;
  }

  /** In-order traversal (ascending keys). O(n). */
  inOrder(): { key: number; value: T; color: Color }[] {
    const out: { key: number; value: T; color: Color }[] = [];
    const walk = (node: RBNode<T>) => {
      if (node === this.nil) return;
      walk(node.left);
      out.push({ key: node.key, value: node.value, color: node.color });
      walk(node.right);
    };
    walk(this.root);
    return out;
  }

  /** Keys within [lo, hi] inclusive — e.g. appointments in a date range. O(k + log n). */
  range(lo: number, hi: number): { key: number; value: T }[] {
    const out: { key: number; value: T }[] = [];
    const walk = (node: RBNode<T>) => {
      if (node === this.nil) return;
      if (lo < node.key) walk(node.left);
      if (lo <= node.key && node.key <= hi)
        out.push({ key: node.key, value: node.value });
      if (node.key < hi) walk(node.right);
    };
    walk(this.root);
    return out;
  }

  height(): number {
    const h = (node: RBNode<T>): number =>
      node === this.nil ? 0 : 1 + Math.max(h(node.left), h(node.right));
    return h(this.root);
  }

  static readonly complexity: Complexity = {
    name: "Red-Black Tree (self-balancing BST)",
    usedFor: "Appointment index by date — stays balanced despite sorted inserts.",
    operations: [
      { name: "insert", time: "O(log n)", note: "recolor + ≤2 rotations" },
      { name: "search", time: "O(log n)", note: "guaranteed, not just average" },
      { name: "range", time: "O(k + log n)", note: "k = results in range" },
      { name: "inOrder", time: "O(n)" },
    ],
    space: "O(n)",
  };
}
