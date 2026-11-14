import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { MAX_N, childrenOf, depthsOf, heavyChildren, hldOf, parList, parseParents, parsePairs, posRow, refPathMax, splitParts, toneMap } from './hldKit.ts';

interface In { par: number[]; vals: number[]; queries: [number, number][] }

const USAGE = '0 0 1 1 2 | 5 3 8 1 9 4 | 3:5 4:2   (parents of nodes 1,2,... | value of every node | u:v queries)';

function parse(raw: string): In {
  const [t, vs, q] = splitParts(raw, 3, USAGE);
  const par = parseParents(t);
  const n = par.length;
  const vals = vs.split(/[\s,]+/).filter(Boolean).map(Number);
  if (vals.length !== n || vals.some((x) => !Number.isInteger(x))) throw new Error(`Give exactly ${n} whole-number node values (one per node 0..${n - 1}) between the two bars`);
  if (vals.some((x) => x < -99 || x > 99)) throw new Error('Keep node values between -99 and 99');
  const queries = parsePairs(q, {
    max: 3, example: '3:5 4:2',
    check: (u, v, tok) => { if (u >= n || v >= n) throw new Error(`In "${tok}" both nodes must be between 0 and ${n - 1}`); },
  });
  return { par, vals, queries };
}

function build({ par, vals, queries }: In): Step[] {
  const n = par.length;
  const h = hldOf(par);
  const depth = depthsOf(par);
  const ch = childrenOf(par);
  const heavySet = heavyChildren(h);
  const tones = toneMap(h, par.map((_, v) => v));
  const tags: Record<number, string> = {};
  vals.forEach((x, v) => { tags[v] = `${x}`; });
  const steps: Step[] = [];
  const answers: string[] = [];
  let vq: string | number = '—';
  let vu: string | number = '—';
  let vv: string | number = '—';
  let vbest: string | number = '—';

  const aux = (): Aux[] => [{ title: 'answers so far', kind: 'list', items: [...answers] }];
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...s, aux: aux(), vars: { query: vq, u: vu, v: vv, 'best so far': vbest } });
  const scene = (states: Record<number, CellState>, range: [number, number] | null, covered: Set<number>, extra: { from: number; to: number; label?: string }[] = []) => ({
    kind: 'split' as const, stack: true,
    parts: [
      {
        kind: 'ntree' as const, root: 0, extraEdges: extra.length ? extra : undefined,
        nodes: par.map((_, v) => ({ id: v, children: ch[v], tag: tags[v], state: states[v] ?? (covered.has(v) ? 'compare' : undefined), tone: tones[v], heavy: heavySet.has(v) || undefined })),
      },
      posRow(h, n, (v) => vals[v], (p) => (range && p >= range[0] && p <= range[1] ? 'found' : covered.has(h.order[p]) ? 'compare' : undefined)),
    ],
  });
  const rangeMax = (a: number, b: number) => Math.max(...h.order.slice(a, b + 1).map((v) => vals[v]));

  push({
    title: 'Start', desc: `The tree is already split into chains (one colour each, heavy edges thick). The array below lists node values by position, so each chain piece is a consecutive range. Node values are the numbers under the nodes.`,
    scene: scene({}, null, new Set()),
    logic: 'A path query will be cut into chain pieces; each piece is a range maximum on the position array.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
    tag: 'INIT —', note: `${n} nodes, head[] and pos[] already built, values ${vals.join(' ')}`,
  });

  queries.forEach(([u0, v0], qi) => {
    vq = `${qi + 1} of ${queries.length}`;
    vu = u0; vv = v0; vbest = '−∞';
    let u = u0;
    let v = v0;
    let best = -Infinity;
    const covered = new Set<number>();
    push({
      title: `Query max on the path ${u0} … ${v0}`, desc: `Start with best = −∞. While u and v are on different chains, cut off the piece of the chain whose head is deeper.`,
      scene: scene({ [u]: 'active', [v]: 'swap' }, null, covered),
      logic: 'Climbing from the deeper chain head can never skip past the meeting point.', logicTone: 'info',
      javaLines: [1, 2], pyLines: [1, 2], algoStep: 1,
      tag: `QUERY ${qi + 1}`, note: `pathMax(${u0}, ${v0}): best = −∞, head[${u0}] = ${h.head[u0]}, head[${v0}] = ${h.head[v0]}`,
    });
    while (h.head[u] !== h.head[v]) {
      const swap = depth[h.head[u]] < depth[h.head[v]];
      if (swap) [u, v] = [v, u];
      vu = u; vv = v;
      push({
        title: `Heads ${h.head[u]} and ${h.head[v]} differ`, desc: `depth[head[u]] = ${depth[h.head[u]]}, depth[head[v]] = ${depth[h.head[v]]}${swap ? ', so swap: the node with the deeper head becomes u' : '; u already has the deeper head'}. Cut the piece of u's chain from its head ${h.head[u]} down to ${u}.`,
        scene: scene({ [u]: 'active', [v]: 'swap' }, null, covered),
        logic: 'Always shorten the chain whose head is deeper; the other chain may still contain the meeting point.', logicTone: 'info',
        javaLines: [2, 3], pyLines: [2, 3, 4], algoStep: 1,
        tag: 'HEADS', note: `head[u] = ${h.head[u]} ≠ head[v] = ${h.head[v]}; depth ${depth[h.head[u]]} vs ${depth[h.head[v]]}`,
      });
      const lo = h.pos[h.head[u]];
      const hi = h.pos[u];
      const m = rangeMax(lo, hi);
      best = Math.max(best, m);
      vbest = best;
      const piece = h.order.slice(lo, hi + 1);
      piece.forEach((x) => covered.add(x));
      push({
        title: `Range max over positions ${lo}..${hi} = ${m}`, desc: `The chain piece ${piece.join(' → ')} is one consecutive range, so a single range-maximum query (a segment tree or sparse table) gives ${m}. best = ${best}.`,
        scene: scene({ [u]: 'active', [v]: 'swap' }, [lo, hi], covered),
        logic: 'A whole chain piece costs one range query instead of one step per node.', logicTone: 'success',
        javaLines: [4], pyLines: [5], algoStep: 2,
        tag: 'RANGE', note: `rangeMax(${lo}, ${hi}) = ${m}, best = max → ${best}`,
      });
      const nu = par[h.head[u]];
      push({
        title: `Hop over a light edge: u = parent[head[u]] = ${nu}`, desc: `Leave the chain through its head and continue from the parent ${nu} of head ${h.head[u]}.`,
        scene: scene({ [nu]: 'active', [v]: 'swap' }, null, covered, [{ from: u, to: nu }]),
        logic: 'Each hop crosses one light edge, and there are at most log n of them on a root path.', logicTone: 'info',
        javaLines: [5], pyLines: [6], algoStep: 3,
        tag: 'HOP', note: `u = parent[head[u]] = parent[${h.head[u]}] = ${nu}`,
      });
      u = nu;
      vu = u;
    }
    if (depth[u] > depth[v]) [u, v] = [v, u];
    vu = u; vv = v;
    const lo = h.pos[u];
    const hi = h.pos[v];
    const m = rangeMax(lo, hi);
    best = Math.max(best, m);
    vbest = best;
    const piece = h.order.slice(lo, hi + 1);
    piece.forEach((x) => covered.add(x));
    push({
      title: `Same chain: range max over positions ${lo}..${hi} = ${m}`, desc: `u = ${u} and v = ${v} share the chain headed by ${h.head[u]}. The shallower one, ${u}, is the LCA; the stretch ${piece.join(' → ')} is one last range. best = ${best}.`,
      scene: scene({ [u]: 'found', [v]: 'swap' }, [lo, hi], covered),
      logic: 'On a shared chain the path is exactly the positions between the two nodes.', logicTone: 'success',
      javaLines: [7, 8], pyLines: [7, 8, 9], algoStep: 4,
      tag: 'SAME CHAIN', note: `head[${u}] == head[${v}] → rangeMax(${lo}, ${hi}) = ${m}, best = ${best}`,
    });
    answers.push(String(best));
    push({
      title: `Answer: ${best}`, desc: `The largest node value on the path from ${u0} to ${v0} is ${best}.`,
      scene: scene({ [u0]: 'active', [v0]: 'swap' }, null, covered),
      logic: 'Each chain piece contributed its maximum; the overall maximum is the best of them.', logicTone: 'success',
      javaLines: [9], pyLines: [10], algoStep: 4,
      tag: qi === queries.length - 1 ? '✅ Done!' : 'ANSWER', note: `return best = ${best}`,
    });
  });

  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Path maxima in query order' };
  return steps;
}

const mk = (par: number[], vals: number[], queries: [number, number][]) => ({
  label: `${parList(par)} | ${vals.join(' ')} | ${queries.map(([a, b]) => `${a}:${b}`).join(' ')}`,
  input: { par, vals, queries },
  output: `[${queries.map(([a, b]) => refPathMax(par, vals, a, b)).join(', ')}]`,
});
void MAX_N;

export const hldPathMax: ProblemDef<In> = {
  slug: 'cp-hld-path-maximum-query',
  id: 'CP', title: 'HLD Path Maximum Query', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'heavy-light decomposition',
  statement: 'Every node of a rooted tree holds a value. Answer queries "largest value on the path from u to v". Decompose the tree into heavy chains so that each query becomes O(log n) range-maximum queries over a position array.',
  constraints: 'n ≤ 10⁵ nodes, values fit in 32 bits (animation: parents of nodes 1..n-1 | one value per node | queries u:v, at most 11 nodes and 3 queries)',
  examples: [
    mk([-1, 0, 0, 1, 1, 2, 3, 3, 4], [5, 3, 8, 1, 9, 4, 2, 7, 6], [[6, 8], [7, 5], [4, 4]]),
    mk([-1, 0, 1, 2, 0, 4, 5, 4, 3], [2, 9, 4, 6, 1, 7, 3, 8, 5], [[3, 6], [8, 7], [2, 5]]),
    mk([-1, 0, 0, 0, 1, 1, 2, 2, 2, 8], [4, 6, 2, 9, 1, 8, 5, 3, 7, 10], [[9, 5], [7, 3], [6, 9]]),
  ],
  inputPlaceholder: `e.g. ${USAGE}`,
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Tree and position array', vizCaption: 'number under a node = its value; colours = chains; thick green = heavy edge',
  legend: [{ label: 'u (current climber)', state: 'active' }, { label: 'v', state: 'swap' }, { label: 'LCA / range being queried', state: 'found' }, { label: 'Already counted', state: 'compare' }],
  varLabels: ['query', 'u', 'v', 'best so far'],
  approach: {
    title: 'Cut the path into chain pieces',
    text: 'While u and v are on different chains, take the piece of the chain whose head is deeper (head to u) as one range-maximum query, then hop to the parent of that head. When both are on the same chain, one last range between them finishes the path.',
  },
  java: [
    'int pathMax(int u, int v) {',
    '    int best = Integer.MIN_VALUE;',
    '    while (head[u] != head[v]) {',
    '        if (depth[head[u]] < depth[head[v]]) { int t = u; u = v; v = t; }   // deeper chain head moves',
    '        best = Math.max(best, rangeMax(pos[head[u]], pos[u]));              // one whole chain piece',
    '        u = parent[head[u]];                                                 // hop over a light edge',
    '    }',
    '    if (depth[u] > depth[v]) { int t = u; u = v; v = t; }',
    '    best = Math.max(best, rangeMax(pos[u], pos[v]));                         // same chain: one range',
    '    return best;',
    '}',
    '',
    'int[] parent, depth, head, pos, base;       // base[pos[v]] = value of node v',
    'int rangeMax(int l, int r) {                // a segment tree or sparse table does this in O(log n) / O(1)',
    '    int m = Integer.MIN_VALUE;',
    '    for (int i = l; i <= r; i++) m = Math.max(m, base[i]);',
    '    return m;',
    '}',
  ],
  python: [
    'def path_max(u, v):',
    '    best = -INF',
    '    while head[u] != head[v]:',
    '        if depth[head[u]] < depth[head[v]]:',
    '            u, v = v, u',
    '        best = max(best, range_max(pos[head[u]], pos[u]))',
    '        u = parent[head[u]]',
    '    if depth[u] > depth[v]:',
    '        u, v = v, u',
    '    best = max(best, range_max(pos[u], pos[v]))',
    '    return best',
    '',
    'INF = float(\'inf\')',
    'parent, depth, head, pos, base = [], [], [], [], []   # filled by the decomposition; base[pos[v]] = value of node v',
    'def range_max(l, r):                  # a segment tree or sparse table does this in O(log n) / O(1)',
    '    return max(base[l:r + 1])',
  ],
  phases: [
    { icon: '🚀', label: 'Start: best = −∞', tone: 'blue' },
    { icon: '⚖', label: 'Compare chain heads', tone: 'cyan' },
    { icon: '📊', label: 'Range max of a piece', tone: 'gold' },
    { icon: '🦘', label: 'Hop over a light edge', tone: 'green' },
    { icon: '✅', label: 'Same chain: Done', tone: 'green' },
  ],
  emphasis: ['largest value', 'path', 'range-maximum'],
  algorithm: [
    'Start with best = −∞ and the two query nodes u and v',
    'While head[u] != head[v], make u the node whose chain head is deeper',
    'Take the range maximum over positions pos[head[u]]..pos[u] and update best',
    'Hop: u = parent[head[u]] (one light edge)',
    'When both are on one chain, take the range between them; best is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(log n) chain pieces × O(log n) per range = O(log² n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Moving the node whose chain head is deeper can never jump over the LCA, because the head of the other chain is not below it. Each hop crosses a light edge, so at most O(log n) pieces are cut, and every piece is a contiguous block of positions thanks to the numbering. The pieces together cover every node on the path exactly once.',
  naive: 'Walking the path node by node costs O(path length) per query, up to O(n) on a long chain.',
};
