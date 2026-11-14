import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Currencies 0..n-1; edge u>v:w is an exchange with cost w (a negative cost is a profit). */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Start with the number of currencies, then exchange costs, e.g. 3 0>1:2 1>2:-5 2>0:2');
  const n = Number(toks[0]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 currencies');
  const edges = parseEdges(toks.slice(1).join(' '), { weighted: true, lo: 0, hi: n - 1, max: 12, example: '0>1:2 1>2:-5 2>0:2', allowNegativeWeight: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An exchange needs two different currencies');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Write each directed exchange u>v only once');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const dist = new Array<number>(n).fill(0);
  const parent = new Array<number>(n).fill(-1);
  const parentEdge = new Array<number>(n).fill(-1);
  const examined: boolean[] = edges.map(() => false);
  const steps: Step[] = [];
  let round = 0;
  let curEdge = -1;
  let changes = 0;
  let last = -1;
  let walker = -1;
  let cycleNodes: number[] = [];
  let cycleEdges: number[] = [];
  let end = false;

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const e = curEdge >= 0 ? edges[curEdge] : null;
      const state: CellState | undefined = cycleNodes.includes(id) ? 'error' : id === walker ? 'swap' : e && e.v === id ? 'active' : e && e.u === id ? 'compare' : undefined;
      return { id, state, tag: `d=${dist[id]}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => {
      const st: EdgeState = end && cycleEdges.length ? (cycleEdges.includes(i) ? 'chosen' : 'dim')
        : i === curEdge ? 'active' : parentEdge[e.v] === i ? 'chosen' : examined[i] ? 'visited' : 'default';
      return { from: e.u, to: e.v, weight: e.w, directed: true, state: st };
    }),
  });
  /** Edge relaxation table of the current round: u→v, cost, dist[u]+w, dist[v] before, update? */
  let table: string[] = [];
  const aux = (): Aux[] => [
    { title: `dist[ ] (round ${round} of ${n})`, kind: 'list', items: dist.map((d, i) => `${i}: ${d}`) },
    { title: 'parent[ ]', kind: 'list', items: parent.map((p, i) => `${i}: ${p < 0 ? '—' : p}`) },
    ...(table.length && !end ? [{ title: 'Edge relaxation table: u→v · cost · dist[u]+w · dist[v] before · update?', kind: 'list' as const, items: [...table], highlight: curEdge >= 0 ? table.length - 1 : undefined, bad: round === n ? table.flatMap((t, i) => (t.endsWith('✓ update') ? [i] : [])) : undefined }] : []),
  ];
  const vars = () => ({ round, edge: curEdge >= 0 ? `${edges[curEdge].u}→${edges[curEdge].v}` : '—', 'last updated': last < 0 ? '—' : last });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} currencies, ${edges.length} exchanges. An edge cost is a conversion's cost; a negative cost is a gain. Every dist starts at 0: as if a free virtual source reached every currency.`,
    logic: 'A trade loop that makes money is a cycle with negative total cost. Starting every node at 0 lets one run find a negative cycle anywhere, not just from one start.', logicTone: 'info',
    tag: 'INIT —', note: `dist[0..${n - 1}] = 0, parent[] = −1, ${edges.length} exchanges`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3], algoStep: 0,
  });

  let cycle = false;
  for (round = 1; round <= n; round++) {
    changes = 0;
    last = -1;
    curEdge = -1;
    table = [];
    examined.fill(false);
    push({
      title: `Round ${round}${round === n ? ' (the check round)' : ''}`,
      desc: round === n ? `Rounds 1 to ${n - 1} would settle everything if no negative cycle existed. Any update in this round proves one.` : `Relax all ${plural(edges.length, 'edge')} in order.`,
      logic: round === n ? 'With no negative cycle, distances stop changing after n − 1 rounds. An update in round n therefore points at a cycle.' : 'Each round extends the cheapest routes by one more edge.', logicTone: 'info',
      tag: `ROUND ${round}`, note: `round ${round} of ${n}${round === n ? ' = check round' : ''}, dist = [${dist.join(', ')}]`,
      javaLines: [5, 6], pyLines: [4, 5], algoStep: 1,
    });
    edges.forEach((e, i) => {
      curEdge = i;
      examined[i] = true;
      const nd = dist[e.u] + e.w!;
      if (nd < dist[e.v]) {
        const old = dist[e.v];
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${old} · ✓ update`);
        dist[e.v] = nd;
        parent[e.v] = e.u;
        parentEdge[e.v] = i;
        changes++;
        last = e.v;
        push({
          title: `Relax ${e.u} → ${e.v}: ${dist[e.u]} + (${e.w}) = ${nd} < ${old}`, desc: `Cheaper route into ${e.v} via ${e.u}: dist[${e.v}] drops from ${old} to ${nd}, parent[${e.v}] = ${e.u}.`,
          logic: 'The parent pointer remembers which edge produced the improvement; we will follow these pointers to read off a cycle.', logicTone: round === n ? 'warn' : 'success',
          tag: 'RELAX', note: `${dist[e.u]} + (${e.w}) = ${nd} < ${old} → dist[${e.v}] = ${nd}, parent[${e.v}] = ${e.u}`,
          alert: round === n ? `Round ${n} still updates dist[${e.v}]: a negative cycle is reachable.` : undefined,
          javaLines: [8, 9, 10, 11, 12], pyLines: [6, 7, 8, 9, 10], algoStep: 2,
        });
      } else {
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dist[e.v]} · – no change`);
        push({
          title: `Relax ${e.u} → ${e.v}: ${dist[e.u]} + (${e.w}) = ${nd} ≥ ${dist[e.v]}`, desc: `No gain: ${nd} is not below dist[${e.v}] = ${dist[e.v]}, so it stays.`,
          logic: 'This exchange does not improve anything right now.', logicTone: 'info',
          tag: 'RELAX', alert: `No update: ${nd} does not beat dist[${e.v}] = ${dist[e.v]}.`, note: `${dist[e.u]} + (${e.w}) = ${nd} ≥ ${dist[e.v]} → unchanged`,
          javaLines: [8, 9], pyLines: [6, 7], algoStep: 2,
        });
      }
    });
    curEdge = -1;
    if (changes === 0) {
      push({
        title: `Round ${round}: nothing changed`, desc: `No distance improved in round ${round}, so none ever will: there is no negative cycle.`,
        logic: 'A round without updates means every edge already satisfies dist[u] + w ≥ dist[v]. A negative cycle would break that inequality somewhere.', logicTone: 'success',
        tag: 'SETTLED', note: `last == −1 → return [] after round ${round}`,
        javaLines: [15], pyLines: [11, 12], algoStep: 3,
      });
      break;
    }
    if (round === n) cycle = true;
  }

  if (cycle) {
    round = n; // the for-loop left round = n + 1; the check round is round n
    push({
      title: `Round ${n} still updated: a cycle exists`, desc: `The last updated node is ${last}. It is reachable from a negative cycle, but may sit on a tail leading away from it, so we cannot read the cycle off yet.`,
      logic: 'Distances kept falling after n − 1 rounds, which is only possible around a negative cycle.', logicTone: 'warn',
      tag: 'CYCLE', alert: `Round ${n} changed something, so a negative cycle exists. Node ${last} may be on a tail, not on the cycle.`, note: `last = ${last}, x = last, step back ${n} times`,
      javaLines: [17], pyLines: [13], algoStep: 4,
    });
    let x = last;
    for (let i = 0; i < n; i++) {
      walker = x;
      push({
        title: `Walk back ${i + 1} of ${n}: at ${x}`, desc: `Follow parent[ ]: ${x} ← ${parent[x]}.`,
        logic: 'The parent chain from an updated node eventually enters the cycle; walking n steps back guarantees we are inside it.', logicTone: 'info',
        tag: 'WALK', note: `x = parent[${x}] = ${parent[x]} (step ${i + 1}/${n})`,
        javaLines: [18], pyLines: [14, 15], algoStep: 4,
      });
      x = parent[x];
    }
    walker = -1;
    const cyc: number[] = [x];
    for (let y = parent[x]; y !== x; y = parent[y]) cyc.push(y);
    cyc.reverse(); // now cyc[i] -> cyc[i+1] -> ... -> cyc[0]
    cycleNodes = [...cyc];
    cycleEdges = cyc.map((v) => parentEdge[v]);
    const total = cycleEdges.reduce((a, ei) => a + edges[ei].w!, 0);
    const path = [...cyc, cyc[0]].join(' → ');
    end = true;
    steps.push({
      title: `Cycle: ${path}`, desc: `Starting at ${x} and following parent pointers closes a loop: ${path}. Its total cost is ${total}, below zero.`,
      scene: scene(), aux: aux(), vars: vars(),
      logic: 'Going around this loop again and again lowers the cost forever: that is the arbitrage.', logicTone: 'warn',
      tag: '✅ Done!', alert: `Profit loop found: ${path} costs ${total} per lap.`, note: `cycle = [${[...cyc].join(', ')}], total = ${total} < 0`,
      javaLines: [19, 20, 21, 22, 23, 24, 25], pyLines: [16, 17, 18, 19], algoStep: 5,
      result: { title: 'true', text: `Negative cycle: ${path} (total ${total})` },
    });
  } else {
    end = true;
    steps.push({
      title: 'No negative cycle', desc: 'The distances settled, so no sequence of exchanges makes a profit.',
      scene: scene(), aux: aux(), vars: vars(),
      logic: 'Settling within n rounds is only possible when no cycle has negative total cost.', logicTone: 'success',
      tag: '✅ Done!', note: 'return [] (no negative cycle)',
      javaLines: [15], pyLines: [11, 12], algoStep: 5,
      result: { title: 'false', text: 'No negative cycle: no arbitrage' },
    });
  }
  return steps;
}

const mk = (n: number, s: string): In => ({
  n,
  edges: s.split(' ').map((t) => { const m = /^(\d+)>(\d+):(-?\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }),
});

export const negativeCycleArbitrage: ProblemDef<In> = {
  slug: 'cp-negative-cycle-detection-currency-arbitrage',
  id: 'CP', title: 'Negative Cycle Detection (Currency Arbitrage)', difficulty: 'Medium', category: 'Graph', tag: 'Bellman-Ford, extra round',
  statement: 'Currencies are nodes and each directed edge u>v is an exchange with a cost (the negative logarithm of the exchange rate, scaled to an integer; a negative cost means you end up with more). Decide whether a sequence of exchanges can start and end in the same currency with a profit, i.e. whether the graph has a negative-cost cycle, and show one if it does.',
  constraints: '2 ≤ n ≤ 8 currencies, ≤ 12 directed exchanges, costs −99..99, at most one exchange per ordered pair',
  examples: [
    { label: '3 | 0>1:2 1>2:-5 2>0:2', input: mk(3, '0>1:2 1>2:-5 2>0:2'), output: 'true (1 → 2 → 0 → 1, total −1)' },
    { label: '4 | 0>1:3 1>2:-1 2>3:2 3>1:-1 0>3:5', input: mk(4, '0>1:3 1>2:-1 2>3:2 3>1:-1 0>3:5'), output: 'false' },
    { label: '5 | 0>1:4 1>2:3 2>3:-2 3>4:1 4>2:-3 3>0:6', input: mk(5, '0>1:4 1>2:3 2>3:-2 3>4:1 4>2:-3 3>0:6'), output: 'true (3 → 4 → 2 → 3, total −4)' },
  ],
  inputPlaceholder: 'e.g. 3 0>1:2 1>2:-5 2>0:2   (n currencies, exchanges u>v:cost)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Exchange target', state: 'active' }, { label: 'Exchange source', state: 'compare' }, { label: 'Walking back', state: 'swap' }, { label: 'On the cycle', state: 'error' }],
  varLabels: ['round', 'edge', 'last updated'],
  vizTitle: 'Currency graph (edge = exchange cost)',
  approach: {
    title: 'Bellman-Ford with a check round and parent pointers',
    text: 'Set every distance to 0 (a virtual source linked to all currencies) and remember a parent for each node. Relax all edges for up to n rounds. If a round changes nothing, there is no negative cycle. If round n still changes something, take the node updated last, step back along parent pointers n times to be sure to stand on the cycle, then keep following parents until you return to that node: that loop is a negative cycle.',
  },
  java: [
    'public List<Integer> findArbitrage(int n, int[][] edges) {   // edges = {u, v, cost}',
    '    int[] dist = new int[n];                // all 0: virtual source',
    '    int[] parent = new int[n];',
    '    Arrays.fill(parent, -1);',
    '    int last = -1;',
    '    for (int round = 1; round <= n; round++) {',
    '        last = -1;',
    '        for (int[] e : edges) {',
    '            int u = e[0], v = e[1], w = e[2];',
    '            if (dist[u] + w < dist[v]) {',
    '                dist[v] = dist[u] + w;',
    '                parent[v] = u;',
    '                last = v;',
    '            }',
    '        }',
    '        if (last == -1) return List.of();    // settled: no negative cycle',
    '    }',
    '    int x = last;',
    '    for (int i = 0; i < n; i++) x = parent[x];   // step back into the cycle',
    '    List<Integer> cycle = new ArrayList<>();',
    '    for (int v = x; ; v = parent[v]) {',
    '        cycle.add(v);',
    '        if (parent[v] == x) break;',
    '    }',
    '    Collections.reverse(cycle);',
    '    return cycle;',
    '}',
  ],
  python: [
    'def find_arbitrage(n, edges):                     # edges = (u, v, cost)',
    '    dist = [0] * n                              # all 0: virtual source',
    '    parent = [-1] * n',
    '    last = -1',
    '    for _ in range(n):',
    '        last = -1',
    '        for u, v, w in edges:',
    '            if dist[u] + w < dist[v]:',
    '                dist[v] = dist[u] + w',
    '                parent[v] = u',
    '                last = v',
    '        if last == -1:',
    '            return []                           # settled: no negative cycle',
    '    x = last',
    '    for _ in range(n):',
    '        x = parent[x]                           # step back into the cycle',
    '    cycle, v = [x], parent[x]',
    '    while v != x:',
    '        cycle.append(v); v = parent[v]',
    '    return cycle[::-1]',
  ],
  algorithm: [
    'Set every dist to 0 and every parent to −1',
    'Run a round: try to relax every edge u→v; on success record parent[v] = u and remember v as last',
    'Relax edge: if dist[u] + w < dist[v], update dist[v] and parent[v]',
    'If a round updates nothing, stop: there is no negative cycle',
    'If round n still updates, walk back n steps from last via parent, then collect the cycle by following parent until it closes',
    'Return the cycle (or an empty list when there is none)',
  ],
  phases: [
    { icon: '🚀', label: 'Init: dist = 0', tone: 'blue' },
    { icon: '🔄', label: 'New round', tone: 'cyan' },
    { icon: '🔧', label: 'Relax exchange', tone: 'green' },
    { icon: '🛑', label: 'Settled: no cycle', tone: 'gold' },
    { icon: '🔁', label: 'Walk back, read cycle', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['negative-cost cycle', 'profit', 'cycle'],
  complexity: [{ label: 'Time', value: 'O(V · E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'With every distance starting at 0 it is as if a zero-cost source led to every node, so the usual Bellman-Ford bound applies: without a negative cycle, n − 1 further rounds fix all distances and round n cannot change anything. An update in round n therefore proves that a negative cycle exists. Following parent pointers from the updated node must eventually revisit a node (finite graph), and the loop it closes is a cycle whose edges all satisfied dist[v] > dist[u] + w when they were set, which sums to a negative total.',
};
