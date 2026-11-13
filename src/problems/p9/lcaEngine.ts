/**
 * Shared animation engine for "LCA via binary lifting" and "Distance between two nodes": both run the same lifting
 * algorithm; the distance problem adds one more step (depth[u] + depth[v] - 2 * depth[lca]). The first 29 lines of the
 * Java / Python listings are identical for both problems so the highlighted line numbers are shared.
 */
import type { Aux, CellState, Step } from '../../engine/types.ts';
import { bitLen, depthsOf, lcaEvents, liftGrid, liftTable, ntScene, parList, parseParents, parsePairs, splitParts } from './kitE.ts';

export interface LcaIn { par: number[]; queries: [number, number][] }

export const LCA_USAGE = '0 0 1 1 2 | 3:4 5:2   (parents of nodes 1,2,3,... | u:v queries)';

export function parseLca(raw: string): LcaIn {
  const [t, q] = splitParts(raw, 2, LCA_USAGE);
  const par = parseParents(t);
  const n = par.length;
  const queries = parsePairs(q, {
    max: 3, example: '3:4 5:2',
    check: (u, v, tok) => { if (u >= n || v >= n) throw new Error(`In "${tok}" both nodes must be between 0 and ${n - 1}`); },
  });
  return { par, queries };
}

/** Plain reference solutions (used by the examples and the fuzz script). */
export function refLca(par: number[], u: number, v: number): number {
  const anc = new Set<number>();
  for (let x = u; x >= 0; x = par[x]) anc.add(x);
  let y = v;
  while (!anc.has(y)) y = par[y];
  return y;
}
export function refDist(par: number[], u: number, v: number): number {
  const d = depthsOf(par);
  return d[u] + d[v] - 2 * d[refLca(par, u, v)];
}

export const lcaExample = (par: number[], queries: [number, number][], dist: boolean): { label: string; input: LcaIn; output: string } => ({
  label: `${parList(par)} | ${queries.map(([a, b]) => `${a}:${b}`).join(' ')}`,
  input: { par, queries },
  output: `[${queries.map(([a, b]) => (dist ? refDist(par, a, b) : refLca(par, a, b))).join(', ')}]`,
});

export function lcaCode(dist: boolean): { java: string[]; python: string[] } {
  const java = [
    'class LcaLifting {',
    '    private final int[][] up;      // up[j][v] = 2^j-th ancestor, the root points to itself',
    '    private final int[] depth;',
    '    private final int log;',
    '',
    '    public LcaLifting(int n, int[] parent) {',
    '        log = 32 - Integer.numberOfLeadingZeros(n);',
    '        up = new int[log][n];',
    '        depth = new int[n];',
    '        for (int v = 1; v < n; v++) depth[v] = depth[parent[v]] + 1;   // parents come first',
    '        up[0] = parent.clone(); up[0][0] = 0;',
    '        for (int j = 1; j < log; j++)',
    '            for (int v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];',
    '    }',
    '',
    '    public int lca(int u, int v) {',
    '        if (depth[u] < depth[v]) { int t = u; u = v; v = t; }   // u is the deeper one',
    '        int diff = depth[u] - depth[v];',
    '        for (int j = 0; j < log; j++)',
    '            if (((diff >> j) & 1) == 1) u = up[j][u];            // lift u to v\'s depth',
    '        if (u == v) return u;',
    '        for (int j = log - 1; j >= 0; j--) {',
    '            if (up[j][u] != up[j][v]) {                          // jump only while they differ',
    '                u = up[j][u];',
    '                v = up[j][v];',
    '            }',
    '        }',
    '        return up[0][u];                                         // their common parent',
    '    }',
    ...(dist
      ? ['', '    public int distance(int u, int v) {', '        int w = lca(u, v);', '        return depth[u] + depth[v] - 2 * depth[w];', '    }', '}']
      : ['}']),
  ];
  const python = [
    'class Lca:',
    '    def __init__(self, n, parent):',
    '        self.log = n.bit_length()',
    '        self.depth = [0] * n',
    '        for v in range(1, n):',
    '            self.depth[v] = self.depth[parent[v]] + 1',
    '        self.up = [parent[:]]',
    '        self.up[0][0] = 0                      # the root points to itself',
    '        for j in range(1, self.log):',
    '            prev = self.up[-1]',
    '            self.up.append([prev[m] for m in prev])',
    '',
    '    def lca(self, u, v):',
    '        if self.depth[u] < self.depth[v]:',
    '            u, v = v, u',
    '        diff = self.depth[u] - self.depth[v]',
    '        for j in range(self.log):',
    '            if (diff >> j) & 1:',
    '                u = self.up[j][u]',
    '        if u == v:',
    '            return u',
    '        for j in reversed(range(self.log)):',
    '            if self.up[j][u] != self.up[j][v]:',
    '                u, v = self.up[j][u], self.up[j][v]',
    '        return self.up[0][u]',
    ...(dist
      ? ['', '    def distance(self, u, v):', '        w = self.lca(u, v)', '        return self.depth[u] + self.depth[v] - 2 * self.depth[w]']
      : []),
  ];
  return { java, python };
}

export function lcaSteps({ par, queries }: LcaIn, dist: boolean): Step[] {
  const n = par.length;
  const LOG = bitLen(n);
  const up = liftTable(par, LOG, true);
  const depth = depthsOf(par);
  const tags: Record<number, string> = {};
  depth.forEach((d, v) => { tags[v] = `d=${d}`; });
  const steps: Step[] = [];
  const answers: string[] = [];
  let vq: string | number = '—';
  let vu: string | number = '—';
  let vv: string | number = '—';
  let vj: string | number = '—';

  const aux = (): Aux[] => [{ title: dist ? 'distances so far' : 'answers so far', kind: 'list', items: [...answers] }];
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...s, aux: aux(), vars: { query: vq, u: vu, v: vv, 'level j': vj, answer: answers.length ? answers[answers.length - 1] : '—' } });
  const scene = (states: Record<number, CellState>, extra: { from: number; to: number; label?: string; tone?: 'orange' | 'green' | 'red' | 'blue' }[] = [], hot: Record<string, CellState> = {}) => ({
    kind: 'split' as const, stack: true, parts: [ntScene({ par, states, tags, extra }), liftGrid(up, hot)],
  });

  push({
    title: 'Precompute depths and the ancestor table', desc: `Every node gets its depth (shown as d=…) and row j of the table holds its 2^j-th ancestor. The root points to itself, so a jump past the top just stays at the root.`,
    scene: scene({ 0: 'found' }),
    logic: 'The table costs O(n log n) once; each query afterwards needs only O(log n) lookups.', logicTone: 'info',
    javaLines: [9, 10, 11, 12], pyLines: [3, 4, 5, 6, 7, 8, 9, 10], algoStep: 0,
    tag: 'BUILD —', note: `depth[] = [${depth.join(', ')}], ${LOG} rows of up[j][v], up[0][0] = 0`,
  });

  queries.forEach(([u0, v0], qi) => {
    vq = `${qi + 1} of ${queries.length}`;
    vu = u0; vv = v0; vj = '—';
    push({
      title: `Query lca(${u0}, ${v0})`, desc: `Depths are ${depth[u0]} and ${depth[v0]}. First make both nodes sit at the same depth, then climb together.`,
      scene: scene({ [u0]: 'active', [v0]: 'swap' }),
      logic: 'Two nodes at the same depth have the same ancestor at every distance, so we can compare table entries directly.', logicTone: 'info',
      javaLines: [15], pyLines: [12], algoStep: 1,
      tag: `QUERY ${qi + 1}`, note: `lca(${u0}, ${v0}): depth[${u0}] = ${depth[u0]}, depth[${v0}] = ${depth[v0]}`,
    });
    const { events, lca } = lcaEvents(up, depth, u0, v0);
    let lastSame = false;
    for (const ev of events) {
      if (ev.t === 'order') {
        vu = ev.u; vv = ev.v;
        push({
          title: ev.swapped ? `Swap: ${ev.u} is the deeper node` : `${ev.u} is already the deeper node`,
          desc: ev.diff === 0 ? `Both nodes are at depth ${depth[ev.u]}; nothing to lift.` : `depth difference = ${depth[ev.u]} − ${depth[ev.v]} = ${ev.diff}, binary ${ev.diff.toString(2)}: ${ev.u} must be lifted by ${ev.diff} level${ev.diff > 1 ? 's' : ''}.`,
          scene: scene({ [ev.u]: 'active', [ev.v]: 'swap' }),
          logic: 'Keeping the deeper node in u means we only ever lift u.', logicTone: 'info',
          javaLines: [16, 17], pyLines: [13, 14, 15], algoStep: 1,
          tag: 'EQUALISE', note: `diff = depth[${ev.u}] − depth[${ev.v}] = ${ev.diff}`,
        });
      } else if (ev.t === 'lift') {
        vj = ev.j; vu = ev.to;
        push({
          title: `Lift u by 2^${ev.j}: ${ev.from} → ${ev.to}`, desc: `Bit ${ev.j} of the depth difference is set, so u = up[${ev.j}][${ev.from}] = ${ev.to}.`,
          scene: scene({ [ev.to]: 'active', [vv as number]: 'swap' }, [{ from: ev.from, to: ev.to, label: `2^${ev.j}` }], { [`${ev.j},${ev.from}`]: 'active' }),
          logic: 'One lookup climbs 2^j levels at once.', logicTone: 'info',
          javaLines: [18, 19], pyLines: [16, 17, 18], algoStep: 1,
          tag: 'LIFT', note: `bit ${ev.j} set → u = up[${ev.j}][${ev.from}] = ${ev.to}`,
        });
      } else if (ev.t === 'same') {
        lastSame = true;
        push({
          title: `u == v == ${ev.node}`, desc: `After lifting, u has reached v itself, so v was an ancestor of u and is the answer.`,
          scene: scene({ [ev.node]: 'found' }),
          logic: 'If one node is an ancestor of the other, equalising depths already lands on it.', logicTone: 'success',
          javaLines: [20], pyLines: [19, 20], algoStep: 2,
          tag: 'MET', note: `u == v == ${ev.node} → return ${ev.node}`,
        });
      } else if (ev.t === 'cmp') {
        vj = ev.j;
        const hot = { [`${ev.j},${ev.u}`]: 'compare' as CellState, [`${ev.j},${ev.v}`]: 'compare' as CellState };
        if (ev.jump) {
          vu = ev.a; vv = ev.b;
          push({
            title: `j=${ev.j}: ${ev.a} ≠ ${ev.b}, jump both`, desc: `up[${ev.j}][${ev.u}] = ${ev.a} and up[${ev.j}][${ev.v}] = ${ev.b} differ, so the meeting point is still above them: move u to ${ev.a} and v to ${ev.b}.`,
            scene: scene({ [ev.a]: 'active', [ev.b]: 'swap' }, [{ from: ev.u, to: ev.a, label: `2^${ev.j}` }, { from: ev.v, to: ev.b, label: `2^${ev.j}`, tone: 'green' }], hot),
            logic: 'Different ancestors at 2^j means the LCA is more than 2^j levels up, so this jump is safe.', logicTone: 'info',
            javaLines: [21, 22, 23, 24], pyLines: [21, 22, 23], algoStep: 3,
            tag: 'JUMP', note: `up[${ev.j}][${ev.u}] = ${ev.a} ≠ up[${ev.j}][${ev.v}] = ${ev.b} → u = ${ev.a}, v = ${ev.b}`,
          });
        } else {
          push({
            title: `j=${ev.j}: both reach ${ev.a}, skip`, desc: `up[${ev.j}][${ev.u}] and up[${ev.j}][${ev.v}] are both ${ev.a}. That could be the LCA or something above it, so we do not jump.`,
            scene: scene({ [ev.u]: 'active', [ev.v]: 'swap', [ev.a]: 'compare' }, [{ from: ev.u, to: ev.a, label: 'same', tone: 'red' }, { from: ev.v, to: ev.a, tone: 'red' }], hot),
            logic: 'Equal ancestors might overshoot the LCA, so we keep u and v where they are and try a smaller jump.', logicTone: 'warn',
            javaLines: [21, 22], pyLines: [21, 22], algoStep: 3,
            tag: 'SKIP', alert: `up[${ev.j}] of both is ${ev.a}: jumping could overshoot the LCA, so no jump at this level.`, note: `up[${ev.j}][${ev.u}] == up[${ev.j}][${ev.v}] == ${ev.a} → no jump`,
          });
        }
      } else {
        vu = ev.u; vv = ev.v; vj = '—';
        push({
          title: `u=${ev.u} and v=${ev.v} are children of ${ev.lca}`, desc: `No jump can go further without meeting, so the two nodes sit just below the LCA: up[0] of either is ${ev.lca}.`,
          scene: scene({ [ev.u]: 'active', [ev.v]: 'swap', [ev.lca]: 'found' }, [{ from: ev.u, to: ev.lca, tone: 'green' }, { from: ev.v, to: ev.lca, tone: 'green' }], { [`0,${ev.u}`]: 'found' }),
          logic: 'The largest jumps that keep u and v apart bring them to the last distinct pair; one more step meets.', logicTone: 'success',
          javaLines: [27], pyLines: [24], algoStep: 4,
          tag: 'PARENT', note: `return up[0][${ev.u}] = ${ev.lca}`,
        });
      }
    }
    const [a, b] = [u0, v0];
    const lastQ = qi === queries.length - 1;
    if (dist) {
      push({
        title: `lca(${a}, ${b}) = ${lca}`, desc: `The binary-lifting search found node ${lca} as the lowest common ancestor.`,
        scene: scene({ [a]: 'active', [b]: 'swap', [lca]: 'found' }),
        logic: 'The LCA is the point where the two root paths merge.', logicTone: 'success',
        javaLines: lastSame ? [20] : [27], pyLines: lastSame ? [19, 20] : [24], algoStep: lastSame ? 2 : 4,
        tag: 'LCA', note: `lca(${a}, ${b}) = ${lca}`,
      });
      const d = depth[a] + depth[b] - 2 * depth[lca];
      answers.push(String(d));
      push({
        title: `distance = ${depth[a]} + ${depth[b]} − 2·${depth[lca]} = ${d}`, desc: `Edges from ${a} up to ${lca} plus from ${b} up to ${lca}: depth[${a}] − depth[${lca}] and depth[${b}] − depth[${lca}] added together.`,
        scene: scene({ [a]: 'active', [b]: 'swap', [lca]: 'found' }),
        logic: 'The shared part of the two root paths is counted twice, so subtract it twice.', logicTone: 'success',
        javaLines: [31, 32], pyLines: [27, 28], algoStep: lastQ ? 5 : 4,
        tag: lastQ ? '✅ Done!' : 'DISTANCE', note: `${depth[a]} + ${depth[b]} − 2·${depth[lca]} = ${d}`,
      });
    } else {
      answers.push(String(lca));
      push({
        title: `Answer: lca(${a}, ${b}) = ${lca}`, desc: `The lowest common ancestor of ${a} and ${b} is ${lca}.`,
        scene: scene({ [a]: 'active', [b]: 'swap', [lca]: 'found' }),
        logic: 'The LCA is the deepest node that lies on both root paths.', logicTone: 'success',
        javaLines: lastSame ? [20] : [27], pyLines: lastSame ? [19, 20] : [24], algoStep: lastQ ? 4 : lastSame ? 2 : 4,
        tag: lastQ ? '✅ Done!' : 'ANSWER', note: `lca(${a}, ${b}) = ${lca}`,
      });
    }
  });

  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: dist ? 'Distances for the queries in order' : 'LCAs of the queries in order' };
  return steps;
}
