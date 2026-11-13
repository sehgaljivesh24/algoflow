import type { Aux, Cell, CellState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';
import { forestLayout } from './p9/kitA.ts';
import type { Tone } from '../engine/types.ts';

/** Group colours: purple and orange first, because blue / yellow / green / red are the highlight states (active, climbed, root, skip). */
const GROUP_TONES: Tone[] = ['purple', 'orange', 'blue', 'green', 'yellow', 'red'];

/** LeetCode's `isConnected` matrix: isConnected[i][j] = 1 when cities i and j are directly linked (symmetric, 1 on the diagonal). */
interface In { isConnected: number[][] }

const MAX_N = 7;

function parse(raw: string): In {
  const ex = '100010|011010|011010|000110|111110|000001';
  const rows = raw.split(/[|/;\n]/).map((r) => r.trim()).filter(Boolean);
  if (!rows.length) throw new Error(`Write the matrix row by row, rows separated by a bar, e.g. 110|110|001 (or ${ex})`);
  const m = rows.map((r) => {
    const t = r.replace(/[\s,]+/g, '');
    if (!/^[01]+$/.test(t)) throw new Error(`Row "${r}" must contain only 0 and 1, e.g. 110`);
    return [...t].map(Number);
  });
  const n = m.length;
  if (n > MAX_N) throw new Error(`Use at most ${MAX_N} cities (rows)`);
  if (m.some((r) => r.length !== n)) throw new Error(`The matrix must be square: ${n} rows need ${n} columns each`);
  for (let i = 0; i < n; i++) {
    if (m[i][i] !== 1) throw new Error(`A city is connected to itself: isConnected[${i}][${i}] must be 1`);
    for (let j = i + 1; j < n; j++) if (m[i][j] !== m[j][i]) throw new Error(`The matrix must be symmetric: isConnected[${i}][${j}] differs from isConnected[${j}][${i}]`);
  }
  return { isConnected: m };
}

const plural = (k: number, one: string, many = `${one}s`) => (k === 1 ? one : many);

function build({ isConnected: M }: In): Step[] {
  const n = M.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array<number>(n).fill(0);
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (M[i][j] === 1) pairs.push([i, j]);
  const status = new Map<number, 'merged' | 'skipped'>(); // pair index -> outcome
  const steps: Step[] = [];

  let pairIdx = -1;
  let curSt: CellState = 'active';
  let nodeSt: Record<number, CellState> = {};
  let hotEdges: number[] = []; // children whose parent link is highlighted
  let changed: number[] = []; // parent[] entries rewritten by the last event
  let focus = -1; // parent[] entry to underline
  let rankHot = -1; // rank[] entry to underline
  let components = n;
  let unions = 0;
  let finds = 0;

  const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const chainOf = (x: number) => { const out = [x]; while (parent[x] !== x) { x = parent[x]; out.push(x); } return out; };
  const pairText = () => (pairIdx >= 0 ? `(${pairs[pairIdx][0]}, ${pairs[pairIdx][1]})` : '—');

  const grid = () => {
    const cur = pairIdx >= 0 ? pairs[pairIdx] : null;
    const rows: Cell[][] = M.map((row, i) => row.map((v, j): Cell => {
      let state: CellState | undefined;
      if (j <= i || v === 0) state = 'dim';
      else if (cur && cur[0] === i && cur[1] === j) state = curSt;
      else {
        const k = pairs.findIndex(([a, b]) => a === i && b === j);
        const st = status.get(k);
        state = st === 'merged' ? 'found' : st === 'skipped' ? 'error' : undefined;
      }
      return { key: `${i}-${j}`, value: v, state };
    }));
    const heads = Array.from({ length: n }, (_, i) => String(i));
    return { kind: 'grid' as const, rows, rowHeads: heads, colHeads: heads, variant: 'table' as const };
  };
  const forest = () => {
    const lay = forestLayout(parent);
    const minMember = (r: number) => { for (let i = 0; i < n; i++) if (rootOf(i) === r) return i; return r; };
    const size = (r: number) => { let c = 0; for (let i = 0; i < n; i++) if (rootOf(i) === r) c++; return c; };
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, id) => {
      const r = rootOf(id);
      return {
        id, state: nodeSt[id], tone: size(r) > 1 ? GROUP_TONES[minMember(r) % GROUP_TONES.length] : undefined,
        tag: parent[id] === id ? `rank ${rank[id]}` : undefined, x: lay[id].x, y: lay[id].y,
      };
    });
    const edges: GraphEdgeVM[] = [];
    for (let i = 0; i < n; i++) if (parent[i] !== i) edges.push({ from: i, to: parent[i], directed: true, state: hotEdges.includes(i) ? 'active' : 'chosen' });
    return { kind: 'graph' as const, nodes, edges };
  };
  const scene = () => ({ kind: 'split' as const, parts: [grid(), forest()] });
  const aux = (): Aux[] => [
    { title: 'parent[ ]  (i → parent)', kind: 'list', items: parent.map((p, i) => `${i}→${p}`), highlight: focus >= 0 ? focus : undefined, bad: changed.length ? [...changed] : undefined },
    { title: 'rank[ ]  (tree height)', kind: 'list', items: rank.map((r, i) => `${i}: ${r}`), highlight: rankHot >= 0 ? rankHot : undefined },
    {
      title: 'pairs with a 1  (i < j)', kind: 'queue',
      items: pairs.map(([a, b], k) => `${a}-${b}${status.get(k) === 'merged' ? ' ✓' : status.get(k) === 'skipped' ? ' skip' : ''}`),
      highlight: pairIdx >= 0 ? pairIdx : undefined,
      bad: pairs.flatMap((_, k) => (status.get(k) === 'skipped' ? [k] : [])),
    },
  ];
  const say = recorder(steps, () => ({ scene: scene(), aux: aux(), vars: { pair: pairText(), components, unions, finds } }));

  say({
    title: 'Start', desc: `${n} cities start alone: parent[i] = i and rank[i] = 0. Only pairs i < j holding a 1 are examined, ${pairs.length} in all.`,
    logic: 'The matrix is symmetric, so the upper triangle holds every link once. Each link will be fed to union-find.',
    java: [3, 4], py: [2, 3], algo: 0, tag: 'INIT —', note: `parent[i] = i, rank[i] = 0 for i = 0..${n - 1}, provinces = ${n}`,
  });

  /** find with path compression, narrated. Returns the root. */
  const find = (x: number): number => {
    finds++;
    const chain = chainOf(x);
    const root = chain[chain.length - 1];
    const hops = chain.length - 1;
    nodeSt = {};
    for (const c of chain) nodeSt[c] = 'compare';
    nodeSt[x] = 'active';
    nodeSt[root] = 'found';
    hotEdges = chain.slice(0, -1);
    changed = []; focus = x; rankHot = root;
    const deep = hops >= 2;
    say({
      title: `find(${x}) = ${root}`,
      desc: hops === 0
        ? `find(${x}): parent[${x}] = ${x}, so ${x} is its own root, with rank ${rank[x]}.`
        : `find(${x}) climbs ${chain.join(' → ')}: ${hops} ${plural(hops, 'hop')}, root ${root} with rank ${rank[root]}.${deep ? ' That chain is long, so path compression will rewrite it.' : ''}`,
      logic: deep ? 'Climbing a long chain is the expensive part of union-find. Compression pays for it once so later finds are one hop.' : 'A node that is the root, or hangs right under it, needs no rewriting.',
      java: [12, 13], py: [11, 13], algo: 2, tag: 'FIND',
      note: hops === 0 ? `find(${x}) = ${x}, parent[${x}] == ${x}` : `find(${x}) = ${root} via ${chain.join('→')}, ${hops} ${plural(hops, 'hop')}`,
    });
    if (deep) {
      const rewritten = chain.slice(0, -2);
      const olds = rewritten.map((c) => parent[c]);
      rewritten.forEach((c) => { parent[c] = root; });
      hotEdges = [...rewritten];
      changed = [...rewritten];
      nodeSt = { [root]: 'found' };
      rewritten.forEach((c) => { nodeSt[c] = 'active'; });
      const texts = rewritten.map((c, k) => `parent[${c}]: ${olds[k]} → ${root}`);
      say({
        title: `Path compression under ${root}`,
        desc: `Path compression: ${texts.join(', ')}. The walked nodes now hang directly under root ${root}, so the next find on them takes one hop.`,
        logic: 'Every node on the walked path has the same root, so pointing each one straight at it loses nothing and shortens all future climbs.', tone: 'success',
        java: [12], py: [12], algo: 2, tag: 'COMPRESS', note: texts.join(', '),
      });
    }
    return root;
  };

  pairs.forEach(([i, j], k) => {
    pairIdx = k; curSt = 'active'; nodeSt = { [i]: 'active', [j]: 'active' }; hotEdges = []; changed = []; focus = -1; rankHot = -1;
    say({
      title: `Pair (${i}, ${j})`,
      desc: `isConnected[${i}][${j}] = 1, so cities ${i} and ${j} are directly linked. Call union(${i}, ${j}), which starts by finding both roots.`,
      logic: 'A direct link says the two cities are in the same province, so their groups must be merged unless they already are one.',
      java: [7, 6, 5], py: [6, 5, 4], algo: 1, tag: 'PAIR', note: `isConnected[${i}][${j}] == 1, union(${i}, ${j}), pair ${k + 1} of ${pairs.length}`,
    });
    const ra = find(i);
    const rb = find(j);
    if (ra === rb) {
      status.set(k, 'skipped'); curSt = 'error';
      nodeSt = { [i]: 'error', [j]: 'error', [ra]: 'found' }; hotEdges = []; changed = []; focus = -1; rankHot = ra;
      say({
        title: `Same root ${ra}: skip`,
        desc: `find(${i}) = find(${j}) = ${ra}, so ${i} and ${j} already share a province. The link changes nothing and components stay ${components}.`,
        logic: 'Equal roots mean the cities are already connected through earlier links. Merging a group with itself would only waste work.', tone: 'warn',
        java: [18], py: [17, 18], algo: 4, tag: 'SKIP', alert: `Cities ${i} and ${j} are already connected through root ${ra}: this link is redundant.`,
        note: `ra == rb == ${ra}, return false`,
      });
      return;
    }
    const ka = rank[ra];
    const kb = rank[rb];
    let child: number;
    let top: number;
    let desc: string;
    let note: string;
    let java: number[];
    let py: number[];
    if (ka < kb) {
      child = ra; top = rb;
      desc = `rank[${ra}] = ${ka} is less than rank[${rb}] = ${kb}, so the shorter tree goes under the taller: parent[${ra}] = ${rb}. Ranks stay put.`;
      note = `rank[${ra}] ${ka} < rank[${rb}] ${kb}, parent[${ra}] = ${rb}`;
      java = [19]; py = [19, 20];
    } else if (ka > kb) {
      child = rb; top = ra;
      desc = `rank[${ra}] = ${ka} is greater than rank[${rb}] = ${kb}, so the shorter tree goes under the taller: parent[${rb}] = ${ra}. Ranks stay put.`;
      note = `rank[${ra}] ${ka} > rank[${rb}] ${kb}, parent[${rb}] = ${ra}`;
      java = [20]; py = [21, 22];
    } else {
      child = rb; top = ra;
      desc = `rank[${ra}] = rank[${rb}] = ${ka}: equal heights, so parent[${rb}] = ${ra} and the merged tree grows, rank[${ra}] becomes ${ka + 1}.`;
      note = `rank[${ra}] == rank[${rb}] == ${ka}, parent[${rb}] = ${ra}, rank[${ra}] = ${ka + 1}`;
      java = [21]; py = [23, 24, 25];
      rank[ra] = ka + 1;
    }
    parent[child] = top;
    components--; unions++;
    status.set(k, 'merged'); curSt = 'found';
    nodeSt = { [child]: 'active', [top]: 'found' }; hotEdges = [child]; changed = [child]; focus = child; rankHot = top;
    say({
      title: `Union: parent[${child}] = ${top}`, desc,
      logic: 'Attaching the shorter tree under the taller one keeps the height from growing, except when the two heights are equal.', tone: 'success',
      java, py, algo: 3, tag: 'UNION', note: `${note}, components ${components + 1} → ${components}`,
    });
  });

  // final picture
  const all = Array.from({ length: n }, (_, i) => i);
  const rootsList = all.filter((i) => rootOf(i) === i);
  // groups listed by their smallest member, e.g. {0,1,2,3,4} and {5}
  const groups = all.filter((i) => all.find((m) => rootOf(m) === rootOf(i)) === i).map((i) => `{${all.filter((m) => rootOf(m) === rootOf(i)).join(',')}}`);
  pairIdx = -1; hotEdges = []; changed = []; focus = -1; rankHot = -1;
  nodeSt = Object.fromEntries(rootsList.map((r) => [r, 'found' as CellState]));
  say({
    title: 'Done', desc: `All pairs scanned: provinces = ${n} − ${unions} unions = ${components}, namely ${groups.join(' and ')}.`,
    logic: `Each successful union merges two groups, so ${n} groups minus ${unions} merges leaves ${components}: exactly the roots still standing.`, tone: 'success',
    java: [8], py: [8], algo: 5, tag: '✅ Done!', note: `return ${components}, roots ${rootsList.join(', ')}`,
    result: { title: String(components), text: 'Number of provinces' },
  });
  return steps;
}

const M = (...rows: string[]): In => ({ isConnected: rows.map((r) => [...r].map(Number)) });

export const unionFindProvinces: ProblemDef<In> = {
  slug: 'alg-union-find-number-of-provinces-union-by-rank-path-compression',
  id: 'ALG', title: 'Union-Find: Number of Provinces (Union by Rank + Path Compression)', difficulty: 'Medium', category: 'Graph', tag: 'union by rank, path compression',
  statement: 'There are n cities and a symmetric matrix isConnected where isConnected[i][j] = 1 means cities i and j are directly linked. A province is a group of cities linked directly or through other cities. Count the provinces with a union-find that merges by rank and compresses paths.',
  constraints: 'isConnected is n × n, symmetric, with 1 on the diagonal (animation input: 1 to 7 cities, rows written like 110|110|001)',
  examples: [
    {
      label: 'isConnected = 100010 | 011010 | 011010 | 000110 | 111110 | 000001',
      input: M('100010', '011010', '011010', '000110', '111110', '000001'),
      output: '2', answer: '2 (provinces {0,1,2,3,4} and {5})',
    },
    { label: 'isConnected = 110 | 110 | 001', input: M('110', '110', '001'), output: '2', answer: '2 (provinces {0,1} and {2})' },
    { label: 'isConnected = 111000 | 111000 | 111000 | 000110 | 000110 | 000001', input: M('111000', '111000', '111000', '000110', '000110', '000001'), output: '3', answer: '3 (provinces {0,1,2}, {3,4} and {5})' },
  ],
  inputPlaceholder: 'e.g. 110|110|001   (rows of the isConnected matrix)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'isConnected matrix (left) and the union-find forest (right, arrow = parent)',
  legend: [
    { label: 'Pair / node being examined', state: 'active' },
    { label: 'Parents climbed by find', state: 'compare' },
    { label: 'Root found, group merged', state: 'found' },
    { label: 'Already connected (skip)', state: 'error' },
  ],
  varLabels: ['pair', 'components', 'unions', 'finds'],
  approach: {
    title: 'Union-find with union by rank and path compression',
    text: 'Give every city a parent pointer and a rank (tree height). find walks up to the root and points every node it passed straight at it. union finds both roots; equal roots mean the cities already share a province, otherwise the root with the smaller rank goes under the other, and only a tie raises a rank. Every successful union removes one group, so the answer is n minus the number of successful unions.',
  },
  java: [
    'public int findCircleNum(int[][] isConnected) {',
    '    int n = isConnected.length;',
    '    int[] parent = new int[n], rank = new int[n];',
    '    for (int i = 0; i < n; i++) parent[i] = i;          // every city is its own group, rank 0',
    '    int provinces = n;',
    '    for (int i = 0; i < n; i++)',
    '        for (int j = i + 1; j < n; j++)',
    '            if (isConnected[i][j] == 1 && union(parent, rank, i, j)) provinces--;',
    '    return provinces;',
    '}',
    '',
    'private int find(int[] parent, int x) {',
    '    if (parent[x] != x) parent[x] = find(parent, parent[x]);   // path compression',
    '    return parent[x];',
    '}',
    '',
    'private boolean union(int[] parent, int[] rank, int a, int b) {',
    '    int ra = find(parent, a), rb = find(parent, b);',
    '    if (ra == rb) return false;                         // already the same province',
    '    if (rank[ra] < rank[rb]) parent[ra] = rb;           // shorter tree under the taller one',
    '    else if (rank[ra] > rank[rb]) parent[rb] = ra;',
    '    else { parent[rb] = ra; rank[ra]++; }               // equal heights: the tree grows by one',
    '    return true;',
    '}',
  ],
  python: [
    'def find_circle_num(is_connected):',
    '    n = len(is_connected)',
    '    parent, rank = list(range(n)), [0] * n              # every city alone, rank 0',
    '    provinces = n',
    '    for i in range(n):',
    '        for j in range(i + 1, n):',
    '            if is_connected[i][j] == 1 and union(parent, rank, i, j):',
    '                provinces -= 1',
    '    return provinces',
    '',
    'def find(parent, x):',
    '    if parent[x] != x:',
    '        parent[x] = find(parent, parent[x])             # path compression',
    '    return parent[x]',
    '',
    'def union(parent, rank, a, b):',
    '    ra, rb = find(parent, a), find(parent, b)',
    '    if ra == rb:',
    '        return False                                    # already the same province',
    '    if rank[ra] < rank[rb]:',
    '        parent[ra] = rb                                 # shorter tree under the taller one',
    '    elif rank[ra] > rank[rb]:',
    '        parent[rb] = ra',
    '    else:',
    '        parent[rb] = ra',
    '        rank[ra] += 1                                   # equal heights: the tree grows by one',
    '    return True',
  ],
  algorithm: [
    'Start with every city as its own group: parent[i] = i, rank[i] = 0',
    'Scan the pairs i < j and take each one with isConnected[i][j] = 1',
    'find(i) and find(j): climb to the roots and point every node on the way straight at its root (path compression)',
    'Different roots: hang the root with the smaller rank under the other; on a tie pick one and raise its rank by 1',
    'Same root: the cities are already in one province, so skip the link',
    'Return n minus the number of successful unions: the roots left are the provinces',
  ],
  phases: [
    { icon: '🌱', label: 'Init: every city alone', tone: 'blue' },
    { icon: '🔍', label: 'Next linked pair', tone: 'cyan' },
    { icon: '🧗', label: 'find + path compression', tone: 'gold' },
    { icon: '🔗', label: 'Union by rank', tone: 'green' },
    { icon: '⚠', label: 'Already connected', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['province', 'union-find', 'rank', 'compresses paths'],
  naive: 'Without union by rank a path of links can build a tree as tall as n, and without path compression every find would climb it again. A DFS per query also works for a single count, but union-find answers connectivity after every new link in near-constant time.',
  complexity: [{ label: 'Time', value: 'O(n² + n²·α(n)): scan the matrix, each union near-constant' }, { label: 'Space', value: 'O(n)' }],
  why: 'Rank is an upper bound on a tree height, and a root only gains rank when two trees of equal rank merge, so a tree of rank r holds at least 2^r nodes and no tree is taller than log₂ n. Path compression only re-points nodes at the root they already had, so the groups never change, and together the two tricks make find cost inverse-Ackermann time. Each union that succeeds joins two different groups, so provinces = n minus successful unions.',
};
