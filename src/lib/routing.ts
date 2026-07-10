import { Graph, quickSort } from "./dsa";
import { getSymptomRoutes, getDoctors } from "./data";
import type { Doctor } from "./types";

/**
 * Symptom -> specialist routing, built on the hand-written Graph + a sort.
 *
 * We assemble a directed graph:  symptom --w--> specialty
 * then run a shortest-path/BFS from the matched symptom node to every
 * specialty to pick the best-matching department. The doctors of that
 * department are then ranked with our own quickSort (by rating, then fee).
 */

export type RouteResult = {
  matchedSymptom: string | null;
  specialty: string | null;
  path: string[];
  doctors: Doctor[];
};

export async function routeIssue(issue: string): Promise<RouteResult> {
  const routes = await getSymptomRoutes();
  const graph = new Graph(true);
  for (const r of routes) {
    graph.addEdge(sym(r.symptom), spec(r.specialty), r.weight);
  }

  // Fuzzy-match the free-text issue to a known symptom node.
  const q = issue.trim().toLowerCase();
  let matched: string | null = null;
  if (q) {
    const exact = routes.find((r) => r.symptom.toLowerCase() === q);
    const partial =
      exact ??
      routes.find(
        (r) =>
          q.includes(r.symptom.toLowerCase()) ||
          r.symptom.toLowerCase().includes(q),
      );
    matched = partial ? partial.symptom : null;
  }

  if (!matched) {
    return { matchedSymptom: null, specialty: null, path: [], doctors: [] };
  }

  // Find the specialty this symptom routes to (shortest weighted path).
  const specialties = [...new Set(routes.map((r) => r.specialty))];
  let best: { specialty: string; path: string[]; cost: number } | null = null;
  for (const s of specialties) {
    const sp = graph.shortestPath(sym(matched), spec(s));
    if (sp && (best === null || sp.cost < best.cost)) {
      best = { specialty: s, path: sp.path, cost: sp.cost };
    }
  }

  if (!best) {
    return { matchedSymptom: matched, specialty: null, path: [], doctors: [] };
  }

  // Rank the matching department's active doctors with our own quickSort.
  const allDoctors = await getDoctors(true);
  const inDept = allDoctors.filter((d) => d.specialty === best!.specialty);
  const ranked = quickSort(inDept, (a, b) => {
    const byRating = Number(b.rating) - Number(a.rating);
    if (byRating !== 0) return byRating;
    return Number(a.consultation_fee) - Number(b.consultation_fee);
  }).sorted;

  return {
    matchedSymptom: matched,
    specialty: best.specialty,
    // Strip the "sym:" / "spec:" prefixes for display.
    path: best.path.map((n) => n.replace(/^(sym|spec):/, "")),
    doctors: ranked,
  };
}

const sym = (s: string) => "sym:" + s.toLowerCase();
const spec = (s: string) => "spec:" + s;
