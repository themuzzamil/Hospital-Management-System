import type { Complexity } from "./complexity";

/**
 * Graph — hand-written using an adjacency list. Supports weighted directed or
 * undirected edges plus BFS and Dijkstra shortest-path.
 *
 * Hospital use: the SYMPTOM -> SPECIALIST routing network. Nodes are symptoms
 * ("chest pain"), departments ("Cardiology") and doctors. When the
 * receptionist enters a patient's issue, a BFS/shortest-path over this graph
 * routes them to the correct specialist. Also models the department referral
 * map (which department can refer to which).
 */

type Edge = { to: string; weight: number };

export class Graph {
  private adj = new Map<string, Edge[]>();
  private directed: boolean;

  constructor(directed = true) {
    this.directed = directed;
  }

  /** Add a node with no edges. O(1). */
  addNode(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, []);
  }

  /** Add an edge (creates endpoints if missing). O(1). */
  addEdge(from: string, to: string, weight = 1): void {
    this.addNode(from);
    this.addNode(to);
    this.adj.get(from)!.push({ to, weight });
    if (!this.directed) this.adj.get(to)!.push({ to: from, weight });
  }

  neighbors(id: string): Edge[] {
    return this.adj.get(id) ?? [];
  }

  nodes(): string[] {
    return [...this.adj.keys()];
  }

  /** Breadth-first shortest path by hop count. O(V + E). */
  bfsPath(start: string, goal: string): string[] | null {
    if (!this.adj.has(start)) return null;
    const queue: string[] = [start];
    const visited = new Set<string>([start]);
    const parent = new Map<string, string>();
    while (queue.length) {
      const node = queue.shift()!;
      if (node === goal) return this.reconstruct(parent, start, goal);
      for (const { to } of this.neighbors(node)) {
        if (!visited.has(to)) {
          visited.add(to);
          parent.set(to, node);
          queue.push(to);
        }
      }
    }
    return null;
  }

  /**
   * Dijkstra shortest weighted path. O((V + E) log V) with a heap; here a
   * simple linear scan of the frontier keeps it readable at O(V^2).
   * Use case: cheapest / fastest referral route between departments.
   */
  shortestPath(start: string, goal: string): { path: string[]; cost: number } | null {
    if (!this.adj.has(start)) return null;
    const dist = new Map<string, number>();
    const parent = new Map<string, string>();
    const visited = new Set<string>();
    for (const n of this.nodes()) dist.set(n, Infinity);
    dist.set(start, 0);

    while (visited.size < this.adj.size) {
      // pick the unvisited node with the smallest distance
      let u: string | null = null;
      let best = Infinity;
      for (const [node, d] of dist) {
        if (!visited.has(node) && d < best) {
          best = d;
          u = node;
        }
      }
      if (u === null) break;
      visited.add(u);
      if (u === goal) break;
      for (const { to, weight } of this.neighbors(u)) {
        const nd = dist.get(u)! + weight;
        if (nd < (dist.get(to) ?? Infinity)) {
          dist.set(to, nd);
          parent.set(to, u);
        }
      }
    }

    if (!isFinite(dist.get(goal) ?? Infinity)) return null;
    return { path: this.reconstruct(parent, start, goal), cost: dist.get(goal)! };
  }

  private reconstruct(
    parent: Map<string, string>,
    start: string,
    goal: string,
  ): string[] {
    const path = [goal];
    let cur = goal;
    while (cur !== start) {
      const p = parent.get(cur);
      if (p === undefined) break;
      path.unshift(p);
      cur = p;
    }
    return path;
  }

  /** Snapshot as {nodes, edges} for visualization. */
  toGraphData(): { nodes: string[]; edges: { from: string; to: string; weight: number }[] } {
    const edges: { from: string; to: string; weight: number }[] = [];
    for (const [from, list] of this.adj) {
      for (const { to, weight } of list) edges.push({ from, to, weight });
    }
    return { nodes: this.nodes(), edges };
  }

  static readonly complexity: Complexity = {
    name: "Graph (adjacency list)",
    usedFor: "Symptom → specialist routing and department referral map.",
    operations: [
      { name: "addEdge", time: "O(1)" },
      { name: "bfsPath", time: "O(V + E)", note: "fewest hops" },
      { name: "shortestPath", time: "O(V²)", note: "Dijkstra, linear frontier" },
    ],
    space: "O(V + E)",
  };
}
