import type { Complexity } from "./complexity";

/**
 * Binary Search Tree — hand-written. Keys ordered so that for any node,
 * everything on the left is smaller and everything on the right is larger.
 *
 * Hospital use: fast patient lookup by their auto-generated integer ID.
 * Searching a sorted tree is O(log n) on average versus O(n) for scanning a
 * list. (Worst case O(n) if inserted in sorted order — which is exactly why
 * the Red-Black tree in this folder exists: it stays balanced.)
 */

export class BSTNode<T> {
  key: number;
  value: T;
  left: BSTNode<T> | null = null;
  right: BSTNode<T> | null = null;
  constructor(key: number, value: T) {
    this.key = key;
    this.value = value;
  }
}

export class BinarySearchTree<T> {
  private root: BSTNode<T> | null = null;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  /** Insert or overwrite a key. O(h) — h = height (log n if balanced). */
  insert(key: number, value: T): void {
    if (!this.root) {
      this.root = new BSTNode(key, value);
      this._size++;
      return;
    }
    let cur = this.root;
    while (true) {
      if (key === cur.key) {
        cur.value = value; // update existing
        return;
      }
      if (key < cur.key) {
        if (!cur.left) {
          cur.left = new BSTNode(key, value);
          this._size++;
          return;
        }
        cur = cur.left;
      } else {
        if (!cur.right) {
          cur.right = new BSTNode(key, value);
          this._size++;
          return;
        }
        cur = cur.right;
      }
    }
  }

  /** Search by key. O(h). */
  search(key: number): T | undefined {
    let cur = this.root;
    while (cur) {
      if (key === cur.key) return cur.value;
      cur = key < cur.key ? cur.left : cur.right;
    }
    return undefined;
  }

  /** In-order traversal yields keys in ascending order. O(n). */
  inOrder(): { key: number; value: T }[] {
    const out: { key: number; value: T }[] = [];
    const walk = (node: BSTNode<T> | null) => {
      if (!node) return;
      walk(node.left);
      out.push({ key: node.key, value: node.value });
      walk(node.right);
    };
    walk(this.root);
    return out;
  }

  /** Height of the tree (for visualization / demonstrating imbalance). */
  height(): number {
    const h = (node: BSTNode<T> | null): number =>
      node ? 1 + Math.max(h(node.left), h(node.right)) : 0;
    return h(this.root);
  }

  getRoot(): BSTNode<T> | null {
    return this.root;
  }

  static readonly complexity: Complexity = {
    name: "Binary Search Tree",
    usedFor: "Patient lookup by auto-generated ID.",
    operations: [
      { name: "insert", time: "O(h)", note: "h = tree height" },
      { name: "search", time: "O(log n)", note: "average; O(n) worst case" },
      { name: "inOrder", time: "O(n)", note: "sorted traversal" },
    ],
    space: "O(n)",
  };
}
