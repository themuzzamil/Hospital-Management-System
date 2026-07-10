/**
 * Hand-written Data Structures & Algorithms library for MediStruct.
 *
 * Nothing here uses a third-party library — every structure is implemented
 * from scratch so the project can demonstrate the mechanics and complexity of
 * each one. See each file's header for the exact hospital workflow it powers.
 */

export { Queue } from "./queue";
export { Stack } from "./stack";
export { MinPriorityQueue } from "./priority-queue";
export type { Prioritized } from "./priority-queue";
export { SinglyLinkedList } from "./linked-list";
export { DoublyLinkedList } from "./doubly-linked-list";
export { BinarySearchTree, BSTNode } from "./bst";
export { RedBlackTree } from "./red-black-tree";
export { Graph } from "./graph";
export { HashMap } from "./hash-map";
export { DynamicArray } from "./dynamic-array";
export {
  bubbleSort,
  insertionSort,
  selectionSort,
  mergeSort,
  quickSort,
  SORTS,
  sortingComplexity,
} from "./sorting";
export type { Metrics, SortResult } from "./sorting";
export type { Complexity } from "./complexity";

import { Queue } from "./queue";
import { Stack } from "./stack";
import { MinPriorityQueue } from "./priority-queue";
import { SinglyLinkedList } from "./linked-list";
import { DoublyLinkedList } from "./doubly-linked-list";
import { BinarySearchTree } from "./bst";
import { RedBlackTree } from "./red-black-tree";
import { Graph } from "./graph";
import { HashMap } from "./hash-map";
import { DynamicArray } from "./dynamic-array";
import { sortingComplexity } from "./sorting";
import type { Complexity } from "./complexity";

/** Registry of every structure's complexity descriptor, for the DSA gallery. */
export const COMPLEXITY_REGISTRY: Complexity[] = [
  DynamicArray.complexity,
  Queue.complexity,
  Stack.complexity,
  MinPriorityQueue.complexity,
  SinglyLinkedList.complexity,
  DoublyLinkedList.complexity,
  BinarySearchTree.complexity,
  RedBlackTree.complexity,
  Graph.complexity,
  HashMap.complexity,
  sortingComplexity,
];
