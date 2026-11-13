import type { CellState, EdgeState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../engine/types.ts';
import { find, gc, parseOne, recorder } from './dpAdvKit.ts';

interface In { n: number }

const java = [
  'public long triangulations(int n) {            // n = number of polygon vertices',
  '    long[] ways = new long[n + 1];             // ways[v] = triangulations of a v-gon',
  '    ways[2] = 1;                               // a lone edge: one way, nothing to cut',
  '    for (int v = 3; v <= n; v++) {',
  '        for (int apex = 1; apex <= v - 2; apex++) {   // third corner of the triangle on edge (0, v-1)',
  '            ways[v] += ways[apex + 1] * ways[v - apex];',
  '        }',
  '    }',
  '    return ways[n];',
  '}',
];
const python = [
  'def triangulations(n):                          # n = number of polygon vertices',
  '    ways = [0] * (n + 1)                        # ways[v] = triangulations of a v-gon',
  '    ways[2] = 1                                 # a lone edge: one way, nothing to cut',
  '    for v in range(3, n + 1):',
  '        for apex in range(1, v - 1):            # third corner of the triangle on edge (0, v-1)',
  '            ways[v] += ways[apex + 1] * ways[v - apex]',
  '    return ways[n]',
];
const J = { def: find(java, 'long[] ways'), base: find(java, 'ways[2] = 1'), outer: find(java, 'for (int v'), term: find(java, 'for (int apex', 'ways[v] +='), ret: find(java, 'return ways[n]') };
const P = { def: find(python, 'ways = [0]'), base: find(python, 'ways[2] = 1'), outer: find(python, 'for v in'), term: find(python, 'for apex', 'ways[v] +='), ret: find(python, 'return ways[n]') };

function build({ n }: In): Step[] {
  const ways: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let v = 0; // size of the sub-polygon being solved (vertices 0..v-1)
  let apex = -1;
  let done = false;
  let terms: string[] = [];
  let lv = -1;
  let rv = -1;
  let sum: number | string = '—';

  const snap = () => {
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, id) => {
      let state: CellState | undefined;
      if (v >= 2 && id < v) state = apex >= 0 && (id === 0 || id === apex || id === v - 1) ? 'active' : 'found';
      else if (v >= 2) state = 'dim';
      return { id, label: id, state };
    });
    const emap = new Map<string, EdgeState>();
    const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      emap.set(key(i, j), v >= 2 && i + 1 < v ? 'visited' : v >= 2 ? 'dim' : 'default');
    }
    if (v >= 3) emap.set(key(0, v - 1), 'chosen');
    if (apex >= 0) {
      emap.set(key(0, apex), 'active');
      emap.set(key(apex, v - 1), 'active');
    }
    const edges: GraphEdgeVM[] = [...emap.entries()].map(([k, state]) => {
      const [a, b] = k.split('-').map(Number);
      return { from: a, to: b, state };
    });
    return {
      scene: {
        kind: 'split' as const,
        parts: [
          { kind: 'graph' as const, nodes, edges, layout: 'circle' as const },
          {
            kind: 'grid' as const, variant: 'table' as const,
            rows: [Array.from({ length: n - 1 }, (_, i) => {
              const sz = i + 2;
              const val = ways[sz];
              let s: CellState | undefined;
              if (sz === v) s = done ? 'found' : 'active';
              else if (sz === lv || sz === rv) s = 'compare';
              else if (val === null) s = 'dim';
              return gc(`w${sz}`, val === null ? '?' : val, s);
            })],
            rowHeads: ['ways'], colHeads: Array.from({ length: n - 1 }, (_, i) => `${i + 2}-gon`),
          },
        ],
      },
      aux: [{ title: v >= 3 ? `${v}-gon: choose the triangle on edge (0, ${v - 1})` : 'triangle choices', kind: 'list' as const, items: [...terms] }],
      vars: { v: v || '—', apex: apex < 0 ? '—' : apex, 'ways[left]': lv < 0 ? '—' : ways[lv]!, 'ways[right]': rv < 0 ? '—' : ways[rv]!, sum },
    };
  };
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `ways[v] = number of ways to cut a convex polygon with v corners into triangles using non-crossing diagonals. We need the ${n}-gon.`,
    logic: 'Fix one edge, say (0, v−1). In any triangulation that edge belongs to exactly one triangle, and its third corner can be any other vertex.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `ways[2..${n}] allocated, goal ways[${n}]`,
  });
  ways[2] = 1;
  v = 2;
  done = true;
  say({
    title: 'Base case ways[2] = 1', desc: 'A "2-gon" is just an edge: nothing to cut, one way. Sub-polygons that shrink to an edge contribute a factor of 1.',
    logic: 'This is what lets a triangle on the very next vertex (apex 1 or v−2) leave a degenerate side.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: 'ways[2] = 1',
  });

  for (let size = 3; size <= n; size++) {
    v = size;
    done = false;
    terms = [];
    ways[size] = 0;
    for (let k = 1; k <= size - 2; k++) {
      apex = k;
      lv = k + 1;
      rv = size - k;
      const t = ways[lv]! * ways[rv]!;
      ways[size] = ways[size]! + t;
      sum = ways[size]!;
      terms.push(`apex ${k}: ways[${lv}]×ways[${rv}] = ${ways[lv]}×${ways[rv]} = ${t}`);
      say({
        title: `${size}-gon, triangle (0, ${k}, ${size - 1})`,
        desc: `The triangle on edge (0, ${size - 1}) with corner ${k} leaves a ${lv}-gon (corners 0..${k}) on one side and a ${rv}-gon (corners ${k}..${size - 1}) on the other: ${ways[lv]} × ${ways[rv]} = ${t}. Running total ${ways[size]}.`,
        logic: 'The two leftover polygons are triangulated independently, so their counts multiply; different apexes give different triangulations, so the totals add.',
        java: J.term, py: P.term, algo: 2,
        tag: `APEX ${k} —`, note: `ways[${size}] += ways[${lv}] × ways[${rv}] = ${ways[lv]} × ${ways[rv]} = ${t} → ${ways[size]}`,
      });
    }
    apex = -1;
    lv = -1;
    rv = -1;
    done = true;
    say({
      title: `ways[${size}] = ${ways[size]}`, desc: `Every apex of the ${size}-gon has been counted: ${ways[size]} triangulations.`,
      logic: 'Stored for the larger polygons that will contain this one as a piece.', tone: 'success', java: J.outer, py: P.outer, algo: 2,
      tag: 'STORE —', note: `ways[${size}] = ${ways[size]}`,
    });
  }

  v = n;
  apex = -1;
  lv = -1;
  rv = -1;
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', note: `return ways[${n}] = ${ways[n]}`, desc: `A convex ${n}-gon has ${ways[n]} triangulations — the Catalan number C(${n - 2}).`,
    logic: 'ways[n] is the answer; the polygon with n corners behaves like n − 2 pairs of brackets.', tone: 'success',
    java: J.ret, py: P.ret, algo: 3, result: { title: String(ways[n]), text: 'Triangulations' },
  });
  return steps;
}

export const triangulateConvexPolygon: ProblemDef<In> = {
  slug: 'cp-triangulate-a-convex-polygon',
  id: 'CP', title: 'Triangulate a Convex Polygon', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'Catalan convolution',
  statement: 'Count the ways to split a convex polygon with n corners into n − 2 triangles by drawing non-crossing diagonals between its corners.',
  constraints: '3 ≤ n ≤ 20 for 64-bit answers (animation input: 3 ≤ n ≤ 9)',
  examples: [
    { label: 'hexagon (n = 6)', input: { n: 6 }, output: '14' },
    { label: 'square (n = 4)', input: { n: 4 }, output: '2' },
    { label: 'octagon (n = 8)', input: { n: 8 }, output: '132' },
  ],
  inputPlaceholder: 'corners n, e.g. 6',
  parseInput: (raw) => ({ n: parseOne(raw, 'the number of corners', 3, 9, '6') }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Triangle corners / size being solved', state: 'active' }, { label: 'Sub-polygon already priced', state: 'compare' }, { label: 'Finished size', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['v', 'apex', 'ways[left]', 'ways[right]', 'sum'],
  emphasis: ['convex polygon', 'non-crossing diagonals'],
  phases: [
    { icon: '🧱', label: 'Define ways[v]', tone: 'blue' },
    { icon: '🌱', label: 'Base: ways[2] = 1', tone: 'blue' },
    { icon: '🔺', label: 'Try each apex, multiply the pieces', tone: 'cyan' },
    { icon: '✅', label: 'Done: Catalan number', tone: 'green' },
  ],
  approach: {
    title: 'Fix an edge, choose its triangle',
    text: 'Look at the edge between corner 0 and corner v−1 of a v-gon. It lies in exactly one triangle whose third corner k splits the rest into a (k+1)-gon and a (v−k)-gon. So ways[v] = Σ ways[k+1] · ways[v−k] over k = 1..v−2, with ways[2] = 1.',
  },
  java, python,
  algorithm: [
    'ways[v] = triangulations of a convex v-gon',
    'Base: ways[2] = 1 (a bare edge)',
    'For each v, try every third corner k of the triangle on edge (0, v−1)',
    'Add ways[k+1] × ways[v−k] to ways[v]; return ways[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Each triangulation uses the edge (0, v−1) in exactly one triangle, so classifying triangulations by that triangle’s third corner puts each one in exactly one class. Within a class the two remaining polygons are cut independently, which is a product. This is the Catalan recurrence with C(m) = Σ C(i)·C(m−1−i) after shifting by two, the same one that counts BSTs and bracket strings.',
};
