/**
 * Shared types for describing the time / space complexity of a data structure.
 * Every hand-written structure in this folder exports a `complexity` object so
 * the UI can render a live "Big-O" panel next to the visualization.
 */

export type Complexity = {
  /** Human name of the structure. */
  name: string;
  /** One-line description of what it is used for in the hospital system. */
  usedFor: string;
  /** Per-operation Big-O time complexity. */
  operations: {
    name: string;
    time: string;
    /** Optional note explaining the cost. */
    note?: string;
  }[];
  /** Overall auxiliary space complexity. */
  space: string;
};
