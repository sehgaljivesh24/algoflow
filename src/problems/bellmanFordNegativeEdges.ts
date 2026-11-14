import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { plural, verb } from './text.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Directed edges u>v:w (w may be negative), single source. */
interface In { n: number; src: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 3 || !/^\d+$/.test(toks[0]) || !/^\d+$/.test(toks[1])) {
    throw new Error('Write n, the source node, then edges with weights, e.g. 4 0 0>1:4 0>2:5 1>2:-3 2>3:2');
  }
  const n = Number(toks[0]);
  const src = Number(toks[1]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 nodes');
  if (src >= n) throw new Error(`The source must be between 0 and ${n - 1}`);
  const edges = parseEdges(toks.slice(2).join(' '), { weighted: true, lo: 0, hi: n - 1, max: 12, example: '0>1:4 1>2:-3', allowNegativeWeight: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Write each directed edge u>v only once');
  return { n, src, edges };
}

const INF = Infinity;

function build({ n, src, edges }: In): Step[] {
  const dist = new Array<number>(n).fill(INF);
  dist[src] = 0;
  const parentEdge = new Array<number>(n).fill(-1);
  const examined: boolean[] = edges.map(() => false);
  const steps: Step[] = [];
  let round = 0;
  let curEdge = -1;
  let changes = 0;
  let bad = -1; // edge that still relaxes in the verification round
  let finished = false;

  const dd = (x: number) => (x === INF ? '∞' : String(x));
  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const e = curEdge >= 0 ? edges[curEdge] : null;
      const state: CellState | undefined = bad >= 0 && (edges[bad].u === id || edges[bad].v === id) ? 'error' : e && e.v === id ? 'active' : e && e.u === id ? 'compare' : finished && dist[id] < INF ? 'found' : dist[id] < INF ? 'sorted' : undefined;
      return { id, state, tag: `d=${dd(dist[id])}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => {
      const st: EdgeState = i === bad ? 'error' : i === curEdge ? 'active' : parentEdge[e.v] === i ? 'chosen' : examined[i] ? 'visited' : 'default';
      return { from: e.u, to: e.v, weight: e.w, directed: true, state: st };
    }),
    pointers: [{ id: 'src', label: 'src', index: src, tone: 'green' }] as Pointer[],
  });
  /** Edge relaxation table of the current round: u→v, weight, dist[u]+w, dist[v] before, update? */
  let table: string[] = [];
  const aux = (): Aux[] => [
    { title: round > n - 1 ? `dist[ ] (check round ${round}, after the ${plural(n - 1, 'relaxation round')})` : `dist[ ] (round ${round} of ${n - 1})`, kind: 'list', items: dist.map((d, i) => `${i}: ${dd(d)}`) },
    ...(table.length ? [{ title: 'Edge relaxation table: u→v · w · dist[u]+w · dist[v] before · update?', kind: 'list' as const, items: [...table], highlight: curEdge >= 0 ? table.length - 1 : undefined, bad: bad >= 0 ? [table.length - 1] : undefined }] : []),
  ];
  const vars = () => ({ round, edge: curEdge >= 0 ? `${edges[curEdge].u}→${edges[curEdge].v}` : '—', 'updates this round': changes });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Source is ${src}: dist[${src}] = 0, every other distance is ∞ (unknown). Edges may be negative.`,
    logic: 'Dijkstra\'s "finished nodes never improve" idea fails with negative edges, so Bellman-Ford simply relaxes every edge again and again.', logicTone: 'info',
    tag: 'INIT —', note: `dist[${src}] = 0, the other ${plural(n - 1, 'distance')} = ∞, ${plural(edges.length, 'edge')}`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2], algoStep: 0,
  });

  let settledEarly = false;
  for (round = 1; round <= n - 1; round++) {
    changes = 0;
    curEdge = -1;
    table = [];
    examined.fill(false);
    push({
      title: `Round ${round}`, desc: `Relax all ${plural(edges.length, 'edge')} in the given order. After round ${round}, every shortest path that uses at most ${round} edge${round === 1 ? '' : 's'} is correct.`,
      logic: 'A shortest path has at most n − 1 edges, so n − 1 rounds are always enough.', logicTone: 'info',
      tag: `ROUND ${round}`, note: `round ${round} of ${n - 1}, dist = [${dist.map(dd).join(', ')}]`,
      javaLines: [5, 6], pyLines: [3, 4], algoStep: 1,
    });
    edges.forEach((e, i) => {
      curEdge = i;
      examined[i] = true;
      if (dist[e.u] === INF) {
        table.push(`${e.u}→${e.v} · ${e.w} · ∞ · ${dd(dist[e.v])} · – skip (source unreached)`);
        push({
          title: `Edge ${e.u} → ${e.v}: ${e.u} is unreached`, desc: `dist[${e.u}] is still ∞, so there is nothing to extend through this edge yet.`,
          logic: 'An unreached node cannot improve anyone; skipping it also avoids ∞ arithmetic.', logicTone: 'info',
          tag: 'SKIP', alert: `Edge ${e.u}→${e.v} skipped: dist[${e.u}] is still ∞.`, note: `dist[${e.u}] = ∞ → no relaxation`,
          javaLines: [8, 9], pyLines: [5, 6], algoStep: 2,
        });
        return;
      }
      const nd = dist[e.u] + e.w!;
      if (nd < dist[e.v]) {
        const old = dist[e.v];
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dd(old)} · ✓ update`);
        dist[e.v] = nd;
        parentEdge[e.v] = i;
        changes++;
        push({
          title: `Relax ${e.u} → ${e.v}: ${dist[e.u]} + (${e.w}) = ${nd} < ${dd(old)}`, desc: `A shorter way to ${e.v} through ${e.u}: dist[${e.v}] drops from ${dd(old)} to ${nd}.`,
          logic: 'Relaxing means: does going through u beat the best known route to v?', logicTone: 'success',
          tag: 'RELAX', note: `${dist[e.u]} + (${e.w}) = ${nd} < ${dd(old)} → dist[${e.v}] = ${nd}`,
          javaLines: [8, 9, 10, 11], pyLines: [5, 6, 7, 8], algoStep: 2,
        });
      } else {
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dd(dist[e.v])} · – no change`);
        push({
          title: `Relax ${e.u} → ${e.v}: ${dist[e.u]} + (${e.w}) = ${nd} ≥ ${dd(dist[e.v])}`, desc: `No gain: ${nd} is not below dist[${e.v}] = ${dd(dist[e.v])}, so it stays.`,
          logic: 'The known route to v is at least as short.', logicTone: 'info',
          tag: 'RELAX', alert: `No update: ${nd} does not beat dist[${e.v}] = ${dd(dist[e.v])}.`, note: `${dist[e.u]} + (${e.w}) = ${nd} ≥ ${dd(dist[e.v])} → unchanged`,
          javaLines: [8, 9], pyLines: [5, 6], algoStep: 2,
        });
      }
    });
    curEdge = -1;
    if (changes === 0) {
      settledEarly = true;
      push({
        title: `Round ${round}: nothing changed`, desc: `No distance improved during a full round (${edges.length} edges tried), so none ever will again. We can stop early.`,
        logic: 'If a whole round changes nothing, the distances are a fixed point: another round would repeat the same non-improvements.', logicTone: 'success',
        tag: 'SETTLED', note: `changed = false → break after round ${round}`,
        javaLines: [14], pyLines: [9, 10], algoStep: 3,
      });
      break;
    }
  }

  // verification round
  let cycle = false;
  if (!settledEarly) {
    round = n;
    changes = 0;
    table = [];
    examined.fill(false);
    curEdge = -1;
    push({
      title: `Round ${n}: check for a negative cycle`, desc: `All ${plural(n - 1, 'round')} ${verb(n - 1, 'is', 'are')} done. If any edge can still be relaxed, a negative cycle is reachable from the source.`,
      logic: 'Without negative cycles the distances are final after n − 1 rounds, so any further improvement proves a cycle whose total weight is negative.', logicTone: 'info',
      tag: 'CHECK', note: `extra pass over ${plural(edges.length, 'edge')}, dist = [${dist.map(dd).join(', ')}]`,
      javaLines: [16], pyLines: [11], algoStep: 4,
    });
    for (let i = 0; i < edges.length && !cycle; i++) {
      const e = edges[i];
      curEdge = i;
      examined[i] = true;
      if (dist[e.u] !== INF && dist[e.u] + e.w! < dist[e.v]) {
        cycle = true;
        bad = i;
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${dist[e.u] + e.w!} · ${dd(dist[e.v])} · ✗ still improves`);
        push({
          title: `Edge ${e.u} → ${e.v} still improves: ${dist[e.u]} + (${e.w}) < ${dd(dist[e.v])}`, desc: `${dist[e.u]} + (${e.w}) = ${dist[e.u] + e.w!} is below ${dd(dist[e.v])} after n − 1 rounds, so a negative cycle exists. Shortest paths are not defined.`,
          logic: 'Going around a negative cycle makes the route cheaper every lap, so there is no minimum.', logicTone: 'warn',
          tag: 'CYCLE', alert: `Edge ${e.u}→${e.v} still relaxes in round ${n}: a negative cycle is reachable.`, note: `${dist[e.u]} + (${e.w}) = ${dist[e.u] + e.w!} < ${dd(dist[e.v])} → return null`,
          javaLines: [16, 17, 18], pyLines: [11, 12, 13], algoStep: 4,
        });
      } else {
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u] === INF ? '∞' : `${dist[e.u]}+(${e.w})=${dist[e.u] + e.w!}`} · ${dd(dist[e.v])} · – holds`);
        push({
          title: `Check ${e.u} → ${e.v}: no improvement`, desc: dist[e.u] === INF ? `${e.u} is unreached, so nothing to check.` : `${dist[e.u]} + (${e.w}) = ${dist[e.u] + e.w!} is not below dist[${e.v}] = ${dd(dist[e.v])}; this edge cannot be relaxed any more.`,
          logic: 'Every edge must pass this test for the distances to be valid.', logicTone: 'info',
          tag: 'CHECK', note: dist[e.u] === INF ? `dist[${e.u}] = ∞ → skip` : `${dist[e.u]} + (${e.w}) = ${dist[e.u] + e.w!} ≥ ${dd(dist[e.v])} → ok`,
          javaLines: [16, 17], pyLines: [11, 12], algoStep: 4,
        });
      }
    }
    curEdge = -1;
  }

  finished = true;
  const out = `[${dist.map(dd).join(', ')}]`;
  steps.push({
    title: cycle ? 'Negative cycle found' : 'Shortest distances found',
    desc: cycle ? 'The distances keep shrinking forever around a cycle reachable from the source.' : `Final distances from ${src}: ${out}. Highlighted edges form the shortest-path tree.`,
    scene: cycle ? { ...scene(), nodes: scene().nodes.map((v) => ({ ...v, state: v.state === 'error' ? ('error' as const) : undefined })) } : scene(),
    aux: aux(), vars: vars(),
    logic: cycle ? 'No finite answer exists when a negative cycle is reachable.' : 'Each distance is the cost of the cheapest route; ∞ marks nodes that cannot be reached.', logicTone: cycle ? 'warn' : 'success',
    tag: cycle ? '⚠ Cycle!' : '✅ Done!', note: cycle ? 'return null (negative cycle)' : `return dist = ${out}`,
    alert: cycle ? 'A negative cycle is reachable from the source, so no shortest distances exist.' : undefined,
    javaLines: cycle ? [18] : [19], pyLines: cycle ? [13] : [14], algoStep: 5,
    result: cycle ? { title: 'negative cycle', text: 'A negative cycle is reachable, so shortest paths do not exist' } : { title: out, text: 'Shortest distance from the source to each node (∞ = unreachable)' },
  });
  return steps;
}

const mk = (n: number, src: number, s: string): In => ({
  n, src,
  edges: s.split(' ').map((t) => { const m = /^(\d+)>(\d+):(-?\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }),
});

export const bellmanFordNegativeEdges: ProblemDef<In> = {
  slug: 'alg-bellman-ford-shortest-paths-negative-edges',
  id: 'ALG', title: 'Bellman-Ford Shortest Paths (Negative Edges)', difficulty: 'Medium', category: 'Graph', tag: 'Bellman-Ford rounds',
  statement: 'A directed graph has weighted edges, and some weights are negative. Compute the shortest distance from a source node to every other node, or report that a negative cycle is reachable (in which case distances are not defined).',
  constraints: 'V ≤ 1000, E ≤ 10⁴ (animation input: 2–8 nodes, ≤ 12 edges, |w| ≤ 99; write "n src" then edges like 0>1:4 1>2:-3)',
  examples: [
    { label: '5 0 | 0>1:6 0>2:7 1>2:8 1>3:5 1>4:-4 2>3:-3 2>4:9 3>1:-2 4>3:7', input: mk(5, 0, '0>1:6 0>2:7 1>2:8 1>3:5 1>4:-4 2>3:-3 2>4:9 3>1:-2 4>3:7'), output: '[0, 2, 7, 4, -2]' },
    { label: '4 0 | 2>3:2 1>2:-3 0>1:4 0>2:5', input: mk(4, 0, '2>3:2 1>2:-3 0>1:4 0>2:5'), output: '[0, 4, 1, 3]' },
    { label: '4 0 | 0>1:1 1>2:-2 2>1:-1 2>3:5', input: mk(4, 0, '0>1:1 1>2:-2 2>1:-1 2>3:5'), output: 'negative cycle' },
  ],
  inputPlaceholder: 'e.g. 4 0 0>1:4 0>2:5 1>2:-3 2>3:2   (n, source, edges u>v:w)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Edge target being updated', state: 'active' }, { label: 'Edge source', state: 'compare' }, { label: 'Reached', state: 'sorted' }, { label: 'Final distance', state: 'found' }, { label: 'On a negative cycle', state: 'error' }],
  varLabels: ['round', 'edge', 'updates this round'],
  approach: {
    title: 'Relax every edge, n − 1 times',
    text: 'Start with dist[src] = 0 and ∞ elsewhere. In each round try every edge u→v and set dist[v] = dist[u] + w whenever that is smaller. After round r all shortest paths with at most r edges are right, so n − 1 rounds suffice (stop early if a round changes nothing). One more pass that still finds an improvement proves a negative cycle.',
  },
  java: [
    'public int[] bellmanFord(int n, int[][] edges, int src) {',
    '    final int INF = Integer.MAX_VALUE / 2;',
    '    int[] dist = new int[n];',
    '    Arrays.fill(dist, INF);',
    '    dist[src] = 0;',
    '    for (int round = 1; round <= n - 1; round++) {',
    '        boolean changed = false;',
    '        for (int[] e : edges) {',
    '            int u = e[0], v = e[1], w = e[2];',
    '            if (dist[u] != INF && dist[u] + w < dist[v]) {',
    '                dist[v] = dist[u] + w;',
    '                changed = true;',
    '            }',
    '        }',
    '        if (!changed) break;                          // settled early',
    '    }',
    '    for (int[] e : edges)',
    '        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]])',
    '            return null;                              // negative cycle',
    '    return dist;',
    '}',
  ],
  python: [
    'def bellman_ford(n, edges, src):',
    "    dist = [float('inf')] * n",
    '    dist[src] = 0',
    '    for _ in range(n - 1):',
    '        changed = False',
    '        for u, v, w in edges:',
    "            if dist[u] != float('inf') and dist[u] + w < dist[v]:",
    '                dist[v] = dist[u] + w',
    '                changed = True',
    '        if not changed:',
    '            break                                     # settled early',
    '    for u, v, w in edges:',
    "        if dist[u] != float('inf') and dist[u] + w < dist[v]:",
    '            return None                               # negative cycle',
    '    return dist',
  ],
  algorithm: [
    'Set dist[src] = 0 and every other distance to ∞',
    'Start a round: go through every edge u→v once',
    'If dist[u] + w < dist[v], update dist[v] (relax); skip edges whose source is still ∞',
    'Stop early after a round with no update, otherwise repeat for up to n − 1 rounds',
    'Run one more pass: any edge that still relaxes means a negative cycle',
    'Return dist[] (or report the negative cycle)',
  ],
  phases: [
    { icon: '🚀', label: 'Init: dist[src] = 0', tone: 'blue' },
    { icon: '🔄', label: 'New round', tone: 'cyan' },
    { icon: '🔧', label: 'Relax edge', tone: 'green' },
    { icon: '🛑', label: 'Settled early', tone: 'gold' },
    { icon: '🔍', label: 'Negative-cycle check', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['negative', 'shortest distance', 'negative cycle'],
  complexity: [{ label: 'Time', value: 'O(V · E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'By induction on r: after round r, dist[v] is at most the cost of the cheapest path to v that uses at most r edges, because the last edge of such a path is relaxed from a node whose (r−1)-edge distance was already correct. A shortest path without a cycle has at most n − 1 edges, so n − 1 rounds fix every distance. If an edge can still relax in round n, some path with n edges beats every shorter one, which forces a repeated node: a cycle with negative total weight.',
};
