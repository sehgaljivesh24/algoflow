import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Cities 0..n-1, directed priced flights u>v:price, at most k stops (= k+1 flights). */
interface In { n: number; src: number; dst: number; k: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 5 || toks.slice(0, 4).some((t) => !/^\d+$/.test(t))) {
    throw new Error('Write n, src, dst, k, then priced flights, e.g. 4 0 3 1 0>1:100 1>2:100 2>0:100 1>3:600 2>3:200');
  }
  const [n, src, dst, k] = toks.slice(0, 4).map(Number);
  if (n < 2 || n > 7) throw new Error('Use between 2 and 7 cities');
  if (src >= n || dst >= n) throw new Error(`src and dst must be between 0 and ${n - 1}`);
  if (src === dst) throw new Error('src and dst must be different cities');
  if (k > 4) throw new Error('Use at most 4 stops (k ≤ 4)');
  const edges = parseEdges(toks.slice(4).join(' '), { weighted: true, lo: 0, hi: n - 1, max: 12, example: '0>1:100 1>2:100' });
  if (edges.some((e) => e.u === e.v)) throw new Error('A flight cannot start and end in the same city');
  return { n, src, dst, k, edges };
}

const INF = Infinity;

function build({ n, src, dst, k, edges }: In): Step[] {
  const dist = new Array<number>(n).fill(INF);
  dist[src] = 0;
  let prev = [...dist];
  let path: number[][] = Array.from({ length: n }, () => []); // edge indexes of the best path with <= rounds flights
  let prevPath = path;
  const seen: boolean[] = edges.map(() => false);
  const steps: Step[] = [];
  let round = 0;
  let curEdge = -1;
  let result: number | string = '—';
  let finalPath: number[] = [];

  const dd = (x: number) => (x === INF ? '∞' : String(x));
  const scene = () => {
    const nodes = Array.from({ length: n }, (_, id) => {
      const e = curEdge >= 0 ? edges[curEdge] : null;
      const state: CellState | undefined = e && e.v === id ? 'active' : e && e.u === id ? 'compare' : dist[id] < INF ? 'found' : undefined;
      return { id, state, tag: `$${dd(dist[id])}` };
    });
    const ge = edges.map((e, i): GraphEdgeVM => {
      const st: EdgeState = i === curEdge ? 'active' : finalPath.includes(i) ? 'chosen' : seen[i] ? 'visited' : 'default';
      return { from: e.u, to: e.v, weight: e.w, directed: true, state: st };
    });
    const pointers: Pointer[] = [
      { id: 'src', label: 'src', index: src, tone: 'green' },
      { id: 'dst', label: 'dst', index: dst, tone: 'purple' },
    ];
    return { kind: 'graph' as const, nodes, edges: ge, pointers };
  };
  /** Edge relaxation table of the current round: one row per flight examined. */
  let table: string[] = [];
  const aux = (): Aux[] => [
    { title: `dist[ ] now (round ${round} of ${k + 1})`, kind: 'list', items: dist.map((d, i) => `${i}: ${dd(d)}`) },
    { title: 'prev[ ] — what last round knew', kind: 'list', items: prev.map((d, i) => `${i}: ${dd(d)}`) },
    ...(table.length ? [{ title: 'Edge relaxation table: u→v · price · prev[u]+price · dist[v] before · update?', kind: 'list' as const, items: [...table], highlight: curEdge >= 0 ? table.length - 1 : undefined }] : []),
  ];
  const vars = () => ({ round, flights: curEdge >= 0 ? `${edges[curEdge].u}→${edges[curEdge].v}` : '—', 'dist[dst]': dd(dist[dst]), answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Find the cheapest trip from ${src} to ${dst} using at most ${k} stop${k === 1 ? '' : 's'}, i.e. at most ${k + 1} flight${k === 0 ? '' : 's'}. dist[${src}] = 0, everything else ∞.`,
    logic: 'Bellman-Ford with a twist: round r only allows paths of r flights, so the stop limit becomes a round limit.', logicTone: 'info',
    tag: 'INIT —', note: `dist[${src}] = 0, others ∞; ${plural(k + 1, 'round')} allowed (k = ${k})`,
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
  });

  for (round = 1; round <= k + 1; round++) {
    prev = [...dist];
    prevPath = path.map((p) => [...p]);
    path = path.map((p) => [...p]);
    curEdge = -1;
    table = [];
    push({
      title: `Round ${round}: allow ${round} flight${round === 1 ? '' : 's'}`, desc: `Copy dist into prev: [${prev.map(dd).join(', ')}]. Every flight this round may only start from a city reached in a PREVIOUS round.`,
      logic: 'Reading from prev (not dist) stops a path from chaining two flights inside the same round, which would break the stop limit.', logicTone: 'info',
      tag: `ROUND ${round}`, note: `prev = dist.clone() = [${prev.map(dd).join(', ')}]`,
      javaLines: [4, 5], pyLines: [3, 4], algoStep: 1,
    });
    edges.forEach((e, i) => {
      if (prev[e.u] === INF) return;
      curEdge = i;
      seen[i] = true;
      const cand = prev[e.u] + e.w!;
      if (cand < dist[e.v]) {
        const old = dist[e.v];
        dist[e.v] = cand;
        path[e.v] = [...prevPath[e.u], i];
        table.push(`${e.u}→${e.v} · ${e.w} · ${prev[e.u]}+${e.w}=${cand} · ${dd(old)} · ✓ update`);
        push({
          title: `Flight ${e.u}→${e.v} ($${e.w}): ${prev[e.u]} + ${e.w} = ${cand} < ${dd(old)}`, desc: `Cheaper way to reach ${e.v}: dist[${e.v}] drops from ${dd(old)} to ${cand}.`,
          logic: 'Cost to reach u in an earlier round, plus this ticket, beats the best known cost to v.', logicTone: 'success',
          tag: 'RELAX', note: `${prev[e.u]} + ${e.w} = ${cand} < ${dd(old)} → dist[${e.v}] = ${cand}`,
          javaLines: [6, 7, 9, 10], pyLines: [5, 8, 9], algoStep: 2,
        });
      } else {
        table.push(`${e.u}→${e.v} · ${e.w} · ${prev[e.u]}+${e.w}=${cand} · ${dd(dist[e.v])} · – no change`);
        push({
          title: `Flight ${e.u}→${e.v} ($${e.w}): ${prev[e.u]} + ${e.w} = ${cand} ≥ ${dd(dist[e.v])}`, desc: `${cand} is not cheaper than the ${dd(dist[e.v])} we already have for ${e.v}.`,
          logic: 'No improvement, so dist[v] stays as it was.', logicTone: 'info',
          tag: 'RELAX', alert: `No update: ${cand} does not beat dist[${e.v}] = ${dd(dist[e.v])}.`, note: `${prev[e.u]} + ${e.w} = ${cand} ≥ ${dd(dist[e.v])} → dist[${e.v}] unchanged`,
          javaLines: [6, 7, 9], pyLines: [5, 8], algoStep: 2,
        });
      }
    });
    curEdge = -1;
    push({
      title: `Round ${round} finished`, desc: `After ${round} flight${round === 1 ? '' : 's'} the cheapest known costs are: ${dist.map((d, i) => `${i}:${dd(d)}`).join('  ')}.`,
      logic: 'Cities with ∞ cannot be reached with this few flights.', logicTone: 'info',
      tag: 'ROUND DONE', note: `round ${round}/${k + 1} → dist = [${dist.map(dd).join(', ')}]`,
      javaLines: [12, 13], pyLines: [3], algoStep: 3,
    });
  }
  round = k + 1;
  const ans = dist[dst] === INF ? -1 : dist[dst];
  result = ans;
  if (ans !== -1) finalPath = path[dst];
  steps.push({
    title: ans === -1 ? `No trip within ${k} stops` : `Cheapest trip costs ${ans}`,
    desc: ans === -1 ? `City ${dst} cannot be reached from ${src} using at most ${plural(k + 1, 'flight')}.` : `Best route: ${[src, ...path[dst].map((i) => edges[i].v)].join(' → ')} for $${ans}.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: ans === -1 ? 'After k+1 rounds dst is still ∞, so no valid trip exists.' : 'After k+1 rounds dist[dst] is the cheapest price using at most k stops.', logicTone: ans === -1 ? 'warn' : 'success',
    tag: '✅ Done!', note: ans === -1 ? `dist[${dst}] = ∞ → return -1` : `dist[${dst}] = ${ans} → return ${ans}`,
    alert: ans === -1 ? `City ${dst} is still ∞ after ${plural(k + 1, 'round')}: no trip fits the stop limit.` : undefined,
    javaLines: [14], pyLines: [10], algoStep: 4,
    result: { title: String(ans), text: ans === -1 ? 'No route within the stop limit' : 'Cheapest price' },
  });
  return steps;
}

const mk = (s: string): EdgeIn[] => s.split(' ').map((t) => { const m = /^(\d+)>(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; });

export const cheapestFlights: ProblemDef<In> = {
  slug: '787-cheapest-flights-within-k-stops',
  id: '787', title: 'Cheapest Flights Within K Stops', difficulty: 'Medium', category: 'Graph', tag: 'Bellman-Ford',
  statement: 'There are n cities and a list of one-way flights [from, to, price]. Return the cheapest price to get from src to dst with at most k stops in between, or -1 if there is no such trip.',
  constraints: '1 ≤ n ≤ 100, 0 ≤ k < n (animation input: ≤ 7 cities, k ≤ 4, ≤ 12 flights; write "n src dst k" then flights like 0>1:100)',
  examples: [
    { label: '4 0 3 1 | 0>1:100 1>2:100 2>0:100 1>3:600 2>3:200', input: { n: 4, src: 0, dst: 3, k: 1, edges: mk('0>1:100 1>2:100 2>0:100 1>3:600 2>3:200') }, output: '700' },
    { label: '3 0 2 1 | 0>1:100 1>2:100 0>2:500', input: { n: 3, src: 0, dst: 2, k: 1, edges: mk('0>1:100 1>2:100 0>2:500') }, output: '200' },
    { label: '3 0 2 0 | 0>1:100 1>2:100 0>2:500', input: { n: 3, src: 0, dst: 2, k: 0, edges: mk('0>1:100 1>2:100 0>2:500') }, output: '500' },
  ],
  inputPlaceholder: 'e.g. 4 0 3 1 0>1:100 1>2:100 2>0:100 1>3:600 2>3:200',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Flight target', state: 'active' }, { label: 'Flight origin', state: 'compare' }, { label: 'Reached', state: 'found' }],
  varLabels: ['round', 'flights', 'dist[dst]', 'answer'],
  approach: {
    title: 'Bellman-Ford limited to k+1 rounds',
    text: 'In each round, try every flight once, relaxing dist[v] with prev[u] + price where prev is a copy of last round’s distances. After r rounds, dist holds the cheapest cost using at most r flights. Run k+1 rounds (k stops means k+1 flights) and read dist[dst].',
  },
  java: [
    'public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {',
    '    int[] dist = new int[n];',
    '    Arrays.fill(dist, Integer.MAX_VALUE);',
    '    dist[src] = 0;',
    '    for (int round = 0; round <= k; round++) {',
    '        int[] prev = dist.clone();            // last round only',
    '        for (int[] f : flights) {',
    '            int u = f[0], v = f[1], price = f[2];',
    '            if (prev[u] == Integer.MAX_VALUE) continue;',
    '            if (prev[u] + price < dist[v]) {',
    '                dist[v] = prev[u] + price;',
    '            }',
    '        }',
    '    }',
    '    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];',
    '}',
  ],
  python: [
    'def find_cheapest_price(n, flights, src, dst, k):',
    "    dist = [float('inf')] * n",
    '    dist[src] = 0',
    '    for _ in range(k + 1):',
    '        prev = dist[:]                    # last round only',
    '        for u, v, price in flights:',
    "            if prev[u] == float('inf'):",
    '                continue',
    '            if prev[u] + price < dist[v]:',
    '                dist[v] = prev[u] + price',
    "    return -1 if dist[dst] == float('inf') else dist[dst]",
  ],
  phases: [
    { icon: '🚀', label: 'Init: dist[src] = 0', tone: 'blue' },
    { icon: '🔄', label: 'New round: copy prev', tone: 'cyan' },
    { icon: '🔧', label: 'Relax a flight', tone: 'green' },
    { icon: '🏁', label: 'Round finished', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['cheapest price', 'at most k stops', '-1'],
  algorithm: [
    'Set dist[src] = 0 and every other city to ∞',
    'Start a round: copy dist into prev',
    'For each flight u→v, relax dist[v] = min(dist[v], prev[u] + price)',
    'Repeat for k + 1 rounds in total',
    'Return dist[dst], or −1 if it is still ∞',
  ],
  complexity: [{ label: 'Time', value: 'O(k · E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'By induction, after round r the array dist holds the cheapest price over all itineraries with at most r flights: a best r-flight itinerary ends with one flight whose origin was reached in at most r−1 flights, which prev still remembers. Using prev instead of the live array guarantees no round extends a path by more than one flight, so the stop limit is respected exactly.',
};
