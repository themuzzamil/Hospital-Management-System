import type { Complexity } from "./complexity";

/**
 * Sorting algorithms — hand-written, generic over a comparator. Each returns a
 * new sorted array plus a metrics object (comparisons / swaps) so the UI can
 * compare their real cost side by side.
 *
 * Hospital use: sort doctors by rating, bills by amount, appointments by date,
 * patients by name. Different screens pick different algorithms so the project
 * can demonstrate the trade-offs (stable vs in-place vs worst case).
 */

export type Metrics = { comparisons: number; swaps: number };
export type SortResult<T> = { sorted: T[]; metrics: Metrics };
type Comparator<T> = (a: T, b: T) => number;

export function bubbleSort<T>(input: T[], cmp: Comparator<T>): SortResult<T> {
  const a = [...input];
  const metrics: Metrics = { comparisons: 0, swaps: 0 };
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - 1 - i; j++) {
      metrics.comparisons++;
      if (cmp(a[j], a[j + 1]) > 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        metrics.swaps++;
        swapped = true;
      }
    }
    if (!swapped) break; // already sorted -> best case O(n)
  }
  return { sorted: a, metrics };
}

export function insertionSort<T>(input: T[], cmp: Comparator<T>): SortResult<T> {
  const a = [...input];
  const metrics: Metrics = { comparisons: 0, swaps: 0 };
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      metrics.comparisons++;
      if (cmp(a[j], key) > 0) {
        a[j + 1] = a[j];
        metrics.swaps++;
        j--;
      } else break;
    }
    a[j + 1] = key;
  }
  return { sorted: a, metrics };
}

export function selectionSort<T>(input: T[], cmp: Comparator<T>): SortResult<T> {
  const a = [...input];
  const metrics: Metrics = { comparisons: 0, swaps: 0 };
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      metrics.comparisons++;
      if (cmp(a[j], a[min]) < 0) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      metrics.swaps++;
    }
  }
  return { sorted: a, metrics };
}

export function mergeSort<T>(input: T[], cmp: Comparator<T>): SortResult<T> {
  const metrics: Metrics = { comparisons: 0, swaps: 0 };
  const merge = (left: T[], right: T[]): T[] => {
    const out: T[] = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
      metrics.comparisons++;
      if (cmp(left[i], right[j]) <= 0) out.push(left[i++]);
      else {
        out.push(right[j++]);
        metrics.swaps++; // count an inversion moved
      }
    }
    while (i < left.length) out.push(left[i++]);
    while (j < right.length) out.push(right[j++]);
    return out;
  };
  const sort = (arr: T[]): T[] => {
    if (arr.length <= 1) return arr;
    const mid = arr.length >> 1;
    return merge(sort(arr.slice(0, mid)), sort(arr.slice(mid)));
  };
  return { sorted: sort([...input]), metrics };
}

export function quickSort<T>(input: T[], cmp: Comparator<T>): SortResult<T> {
  const a = [...input];
  const metrics: Metrics = { comparisons: 0, swaps: 0 };
  const swap = (i: number, j: number) => {
    if (i !== j) {
      [a[i], a[j]] = [a[j], a[i]];
      metrics.swaps++;
    }
  };
  const partition = (lo: number, hi: number): number => {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      metrics.comparisons++;
      if (cmp(a[j], pivot) < 0) swap(i++, j);
    }
    swap(i, hi);
    return i;
  };
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const p = partition(lo, hi);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };
  sort(0, a.length - 1);
  return { sorted: a, metrics };
}

export const SORTS = {
  bubble: bubbleSort,
  insertion: insertionSort,
  selection: selectionSort,
  merge: mergeSort,
  quick: quickSort,
} as const;

export const sortingComplexity: Complexity = {
  name: "Sorting Algorithms",
  usedFor: "Order doctors by rating, bills by amount, appointments by date.",
  operations: [
    { name: "bubble", time: "O(n²)", note: "best O(n) if already sorted; stable" },
    { name: "insertion", time: "O(n²)", note: "best O(n); great for near-sorted" },
    { name: "selection", time: "O(n²)", note: "always n² compares; min swaps" },
    { name: "merge", time: "O(n log n)", note: "stable; O(n) extra space" },
    { name: "quick", time: "O(n log n)", note: "avg; O(n²) worst; in-place" },
  ],
  space: "merge O(n), others O(1)/O(log n)",
};
