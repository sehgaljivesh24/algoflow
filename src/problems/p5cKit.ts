import type { Aux, CellState, EdgeState, GraphEdgeVM, GraphNodeVM, GraphScene, Pointer, Step, Tone } from '../engine/types.ts';
import type { Cell } from '../engine/types.ts';
import { tokens } from './graphKit.ts';
import { plural } from './text.ts';

/* ------------------------------------------------------------------ shared input parsing */

export interface FlowEdge { u: number; v: number; cap: number }
export interface FlowNet { n: number; s: number; t: number; edges: FlowEdge[] }

/** "n s t u>v:cap ..." (nodes 0..n-1, capacities 1..99, no self loops, no repeated ordered pair; anti-parallel pairs are fine). */
export function parseFlowNet(raw: string, o: { maxN: number; maxEdges: number }): FlowNet {
  const toks = tokens(raw);
  const usage = 'Write n, the source s, the sink t, then edges u>v:capacity, e.g. 4 0 3 0>1:3 0>2:2 1>3:2 2>3:3';
  if (toks.length < 4 || !/^\d+$/.test(toks[0]) || !/^\d+$/.test(toks[1]) || !/^\d+$/.test(toks[2])) throw new Error(usage);
  const n = Number(toks[0]);
  const s = Number(toks[1]);
  const t = Number(toks[2]);
  if (n < 2 || n > o.maxN) throw new Error(`Use between 2 and ${o.maxN} nodes`);
  if (s >= n || t >= n) throw new Error(`The source and sink must be node numbers from 0 to ${n - 1}`);
  if (s === t) throw new Error('The source and the sink must be different nodes');
  const rest = toks.slice(3);
  if (rest.length > o.maxEdges) throw new Error(`Use at most ${o.maxEdges} edges`);
  const edges = rest.map((tk): FlowEdge => {
    const m = /^(\d+)(?:->|>)(\d+):(\d+)$/.exec(tk);
    if (!m) throw new Error(`"${tk}" is not an edge. Write directed edges with a capacity, like 0>1:3`);
    const u = Number(m[1]);
    const v = Number(m[2]);
    const cap = Number(m[3]);
    if (u >= n || v >= n) throw new Error(`Node numbers must be between 0 and ${n - 1} (saw "${tk}")`);
    if (u === v) throw new Error('An edge cannot connect a node to itself');
    if (cap < 1 || cap > 99) throw new Error('Capacities must be between 1 and 99');
    return { u, v, cap };
  });
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Each ordered pair u>v may appear only once (u>v and v>u together are fine)');
  return { n, s, t, edges };
}

export const fmtFlowNet = (net: FlowNet): string => `${net.n} ${net.s} ${net.t} ${net.edges.map((e) => `${e.u}>${e.v}:${e.cap}`).join(' ')}`;

/** Fixed layer layout for a flow network: source on the left, sink on the right, the rest by BFS depth (0..1 unit square). */
export function flowCoords(n: number, s: number, t: number, edges: { u: number; v: number }[]): Map<number, { x: number; y: number }> {
  const layer = new Array<number>(n).fill(-1);
  layer[s] = 0;
  const q = [s];
  for (let h = 0; h < q.length; h++) {
    for (const e of edges) if (e.u === q[h] && layer[e.v] === -1 && e.v !== t) { layer[e.v] = layer[q[h]] + 1; q.push(e.v); }
  }
  for (let i = 0; i < n; i++) if (layer[i] === -1 && i !== t) layer[i] = 1;
  let top = 0;
  for (let i = 0; i < n; i++) if (i !== t) top = Math.max(top, layer[i]);
  layer[t] = top + 1;
  return layeredCoords(layer);
}

/** Positions from an explicit layer number per node id (index = id). */
export function layeredCoords(layer: number[]): Map<number, { x: number; y: number }> {
  const L = Math.max(...layer) + 1;
  const out = new Map<number, { x: number; y: number }>();
  for (let l = 0; l < L; l++) {
    const col = layer.map((v, i) => (v === l ? i : -1)).filter((i) => i >= 0);
    col.forEach((id, k) => out.set(id, { x: L === 1 ? 0.5 : l / (L - 1), y: (k + 1) / (col.length + 1) }));
  }
  return out;
}

/* ------------------------------------------------------------------ residual graph (arc pairs) */

/** Arc 2i is the forward arc of input edge i, arc 2i+1 its backward arc (starts with capacity 0 and holds the flow). */
export class Residual {
  to: number[] = [];
  cap: number[] = [];
  adj: number[][];
  n: number;
  edges: FlowEdge[];
  constructor(n: number, edges: FlowEdge[]) {
    this.n = n;
    this.edges = edges;
    this.adj = Array.from({ length: n }, () => []);
    edges.forEach((e) => {
      this.adj[e.u].push(this.to.length); this.to.push(e.v); this.cap.push(e.cap);
      this.adj[e.v].push(this.to.length); this.to.push(e.u); this.cap.push(0);
    });
  }
  from(a: number): number { return this.to[a ^ 1]; }
  flowOn(i: number): number { return this.cap[2 * i + 1]; }
  /** BFS over arcs with spare capacity; stops as soon as `t` is discovered (t may be -1 to explore everything). */
  bfs(s: number, t: number): { parent: number[]; level: number[]; order: number[] } {
    const parent = new Array<number>(this.n).fill(-1);
    const level = new Array<number>(this.n).fill(-1);
    level[s] = 0;
    const order = [s];
    for (let h = 0; h < order.length; h++) {
      const u = order[h];
      for (const a of this.adj[u]) {
        const v = this.to[a];
        if (this.cap[a] > 0 && level[v] === -1) {
          level[v] = level[u] + 1;
          parent[v] = a;
          order.push(v);
          if (v === t) return { parent, level, order };
        }
      }
    }
    return { parent, level, order };
  }
  pathArcs(parent: number[], s: number, t: number): number[] {
    const out: number[] = [];
    for (let v = t; v !== s; v = this.from(parent[v])) out.unshift(parent[v]);
    return out;
  }
}

/* ------------------------------------------------------------------ the animated Edmonds-Karp loop */

export interface Lines { j: number[]; p: number[]; a: number }
export interface FlowLines { start: Lines; bfs: Lines; none: Lines; found: Lines; push: Lines }

export interface FlowRunOpts {
  label: (i: number) => string;
  coords: Map<number, { x: number; y: number }>;
  /** chips "source" / "sink" above the two terminals */
  terminals: boolean;
  lines: FlowLines;
  unit?: string; // what a unit of flow is called in the text
}

/** Shared engine for the three flow problems: owns the residual graph, builds scenes/aux/vars and runs augmentations. */
export class FlowRun {
  steps: Step[] = [];
  R: Residual;
  flow = 0;
  round = 0;
  level: number[] | null = null;
  pathArcs: number[] = [];
  bottleneck: number | string = '—';
  pathText = '—';
  edgeOverride: (i: number) => EdgeState | undefined = () => undefined;
  nodeOverride: (i: number) => { state?: CellState; tone?: Tone } | undefined = () => undefined;
  net: FlowNet;
  o: FlowRunOpts;
  constructor(net: FlowNet, o: FlowRunOpts) {
    this.net = net;
    this.o = o;
    this.R = new Residual(net.n, net.edges);
  }

  scene(): GraphScene {
    const { net, o, R } = this;
    const onPath = new Set<number>();
    const pathNodes = new Set<number>();
    this.pathArcs.forEach((a) => { onPath.add(a >> 1); pathNodes.add(R.from(a)); pathNodes.add(R.to[a]); });
    const nodes: GraphNodeVM[] = Array.from({ length: net.n }, (_, i): GraphNodeVM => {
      const ov = this.nodeOverride(i);
      let state: CellState | undefined = ov?.state;
      if (!state && pathNodes.has(i)) state = 'active';
      if (!state && this.level && this.level[i] >= 0) state = 'compare';
      const p = o.coords.get(i)!;
      const node: GraphNodeVM = { id: i, label: o.label(i), x: p.x, y: p.y };
      if (state) node.state = state;
      const tone = ov?.tone ?? (i === net.s ? 'green' : i === net.t ? 'red' : undefined);
      if (tone) node.tone = tone;
      if (this.level && this.level[i] >= 0 && onPath.size === 0) node.tag = `lvl ${this.level[i]}`;
      return node;
    });
    const edges: GraphEdgeVM[] = net.edges.map((e, i): GraphEdgeVM => {
      const f = R.flowOn(i);
      const st: EdgeState = this.edgeOverride(i) ?? (onPath.has(i) ? 'active' : f > 0 ? 'visited' : 'default');
      return { from: e.u, to: e.v, weight: `${f}/${e.cap}`, directed: true, state: st };
    });
    const pointers: Pointer[] = o.terminals
      ? [{ id: 'src', label: 'source', index: net.s, tone: 'green' }, { id: 'snk', label: 'sink', index: net.t, tone: 'red' }]
      : [];
    return { kind: 'graph', nodes, edges, pointers };
  }

  aux(): Aux[] {
    const { R, o } = this;
    const items: string[] = [];
    R.cap.forEach((c, a) => { if (c > 0) items.push(`${o.label(R.from(a))} → ${o.label(R.to[a])}: ${c}${a & 1 ? '  (undo)' : ''}`); });
    return [{ title: 'residual capacities (arcs with room left)', kind: 'list', items }];
  }

  vars() {
    return { round: this.round, bottleneck: this.bottleneck, 'flow so far': this.flow, path: this.pathText };
  }

  push(s: Omit<Step, 'vars' | 'aux' | 'scene'>) {
    this.steps.push({ ...s, scene: this.scene(), aux: this.aux(), vars: this.vars() });
  }

  describePath(): string {
    const { R, o } = this;
    const parts = [o.label(R.from(this.pathArcs[0]))];
    this.pathArcs.forEach((a) => parts.push(o.label(R.to[a]) + (a & 1 ? '*' : '')));
    return parts.join(' → ');
  }

  pushStart(extraDesc = '') {
    const L = this.o.lines.start;
    this.push({
      title: 'Start with zero flow',
      desc: `Every edge shows flow/capacity and begins at 0. Each edge also has a hidden backward arc that will let us undo flow later.${extraDesc}`,
      logic: 'A flow is legal when no edge carries more than its capacity and every inner node passes on exactly what it receives. Zero flow is trivially legal.',
      logicTone: 'info', javaLines: L.j, pyLines: L.p, algoStep: L.a,
      tag: 'INIT —', note: `flow = 0, ${plural(this.net.edges.length, 'edge')} each get a backward arc of capacity 0`,
    });
  }

  /**
   * One round: BFS for a shortest augmenting path in the residual graph, then push the bottleneck along it.
   * compact = a single step per round. Returns false when t is unreachable (the BFS step showing this is pushed;
   * the caller adds its own closing step).
   */
  augment(compact: boolean): boolean {
    const { net, R, o } = this;
    const { s, t } = net;
    const ln = o.lines;
    this.round++;
    this.pathArcs = [];
    this.bottleneck = '—';
    this.pathText = '—';
    const r = R.bfs(s, t);
    this.level = r.level;
    const reach = r.level[t] >= 0;
    const reached = r.order.filter((i) => i !== s).map(o.label);
    if (!compact || !reach) {
      this.push({
        title: reach ? `Round ${this.round}: BFS reaches the sink` : `Round ${this.round}: BFS cannot reach the sink`,
        desc: reach
          ? `Breadth-first search over arcs that still have room reaches ${o.label(t)} in ${r.level[t]} step${r.level[t] === 1 ? '' : 's'}. Nodes are tagged with their BFS level.`
          : `Starting from ${o.label(s)}, search only reaches ${reached.length ? reached.join(', ') : 'nothing else'}; every arc leaving that region is full.`,
        logic: reach ? 'BFS always finds a path with the fewest edges, which is what bounds Edmonds-Karp to O(V·E) rounds.' : 'No path with spare capacity from source to sink means the current flow cannot be increased: it is maximum.',
        logicTone: reach ? 'info' : 'success', javaLines: ln.bfs.j, pyLines: ln.bfs.p, algoStep: ln.bfs.a,
        tag: `ROUND ${this.round} · BFS`,
        note: reach ? `level[${o.label(t)}] = ${r.level[t]}, parentArc[${o.label(t)}] ≠ −1` : `parentArc[${o.label(t)}] == −1 after visiting ${r.order.length} node${r.order.length === 1 ? '' : 's'}`,
        alert: reach ? undefined : `No augmenting path from ${o.label(s)} to ${o.label(t)}: every arc leaving the searched region is full.`,
      });
    }
    if (!reach) return false;
    this.pathArcs = R.pathArcs(r.parent, s, t);
    const b = Math.min(...this.pathArcs.map((a) => R.cap[a]));
    this.bottleneck = b;
    this.pathText = this.describePath();
    const hasUndo = this.pathArcs.some((a) => a & 1);
    if (!compact) {
      this.push({
        title: `Augmenting path ${this.pathText}, bottleneck ${b}`,
        desc: `The path ${this.pathText} can carry ${b} more ${o.unit ?? 'unit'}${b === 1 ? '' : 's'}: the smallest spare capacity on it is ${b}.${hasUndo ? ' A starred hop (*) travels a backward arc, i.e. it cancels flow that was sent the other way.' : ''}`,
        logic: 'The bottleneck is the most we can push without overfilling an arc, and it is always at least 1 because we only walk arcs with room.', logicTone: 'info',
        javaLines: ln.found.j, pyLines: ln.found.p, algoStep: ln.found.a,
        tag: 'PATH', note: `push = min(${this.pathArcs.map((a) => R.cap[a]).join(', ')}) = ${b}`,
      });
    }
    for (const a of this.pathArcs) { R.cap[a] -= b; R.cap[a ^ 1] += b; }
    this.flow += b;
    this.level = null;
    this.push({
      title: `Push ${b} along ${this.pathText}: flow = ${this.flow}`,
      desc: compact
        ? `Round ${this.round}: BFS finds ${this.pathText} with bottleneck ${b}; pushing it raises the flow to ${this.flow}.${hasUndo ? ' A starred hop cancels earlier flow.' : ''}`
        : `Every forward arc on the path loses ${b} of spare capacity and its backward arc gains ${b} (the undo room). Total flow is now ${this.flow}.`,
      logic: 'Reducing the forward arc and growing the backward arc keeps the flow legal and records exactly how much could be taken back.', logicTone: 'success',
      javaLines: ln.push.j, pyLines: ln.push.p, algoStep: ln.push.a,
      tag: compact ? `ROUND ${this.round} · PUSH` : 'PUSH', note: `flow += ${b} → ${this.flow}${hasUndo ? ' (cancels some earlier flow)' : ''}`,
    });
    this.pathArcs = [];
    return true;
  }
}

/** Shift a list of 0-based line numbers by k (when a wrapper is placed above the shared code). */
export const shiftLines = (l: Lines, k: number): Lines => ({ j: l.j.map((x) => x + k), p: l.p.map((x) => x + k), a: l.a });

/** Reference max flow by brute force over all source-side vertex sets (min cut). Used by the fuzz scripts. */
export function bruteMinCut(net: FlowNet): { value: number; side: boolean[] } {
  const { n, s, t, edges } = net;
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== s && i !== t);
  let best = Infinity;
  let bestSide: boolean[] = [];
  for (let mask = 0; mask < 1 << others.length; mask++) {
    const side = new Array<boolean>(n).fill(false);
    side[s] = true;
    others.forEach((o, k) => { if (mask >> k & 1) side[o] = true; });
    const c = edges.reduce((acc, e) => acc + (side[e.u] && !side[e.v] ? e.cap : 0), 0);
    if (c < best) { best = c; bestSide = side; }
  }
  return { value: best, side: bestSide };
}

/* ------------------------------------------------------------------ shared Java / Python for the flow core */

/** The Edmonds-Karp core, identical line numbers for both variants. `fields` turns g/to/cap into static fields. */
export function flowJava(fields: boolean): string[] {
  return [
    'static int maxFlow(int n, int[][] edges, int s, int t) {',
    fields ? '    g = new List[n];' : '    List<Integer>[] g = new List[n];',
    '    for (int i = 0; i < n; i++) g[i] = new ArrayList<>();',
    '    int m = edges.length * 2;',
    fields ? '    to = new int[m]; cap = new int[m];' : '    int[] to = new int[m], cap = new int[m];',
    '    for (int i = 0; i < edges.length; i++) {',
    '        int u = edges[i][0], v = edges[i][1], c = edges[i][2];',
    '        to[2 * i] = v;     cap[2 * i] = c;     g[u].add(2 * i);       // forward arc',
    '        to[2 * i + 1] = u; cap[2 * i + 1] = 0; g[v].add(2 * i + 1);   // backward arc (undo room)',
    '    }',
    '    int flow = 0;',
    '    while (true) {',
    '        int[] parentArc = new int[n];',
    '        Arrays.fill(parentArc, -1);',
    '        Deque<Integer> queue = new ArrayDeque<>();',
    '        queue.add(s);',
    '        while (!queue.isEmpty() && parentArc[t] == -1) {      // BFS in the residual graph',
    '            int u = queue.poll();',
    '            for (int a : g[u]) {',
    '                if (cap[a] > 0 && parentArc[to[a]] == -1 && to[a] != s) {',
    '                    parentArc[to[a]] = a;',
    '                    queue.add(to[a]);',
    '                }',
    '            }',
    '        }',
    '        if (parentArc[t] == -1) break;                        // no augmenting path left',
    '        int push = Integer.MAX_VALUE;',
    '        for (int v = t; v != s; v = to[parentArc[v] ^ 1])',
    '            push = Math.min(push, cap[parentArc[v]]);         // bottleneck',
    '        for (int v = t; v != s; v = to[parentArc[v] ^ 1]) {',
    '            cap[parentArc[v]] -= push;',
    '            cap[parentArc[v] ^ 1] += push;',
    '        }',
    '        flow += push;',
    '    }',
    '    return flow;',
    '}',
  ];
}

export function flowPython(retCaps: boolean): string[] {
  return [
    'def max_flow(n, edges, s, t):',
    '    g = [[] for _ in range(n)]',
    '    to, cap = [], []',
    '    for u, v, c in edges:',
    '        g[u].append(len(to)); to.append(v); cap.append(c)   # forward arc',
    '        g[v].append(len(to)); to.append(u); cap.append(0)   # backward arc (undo room)',
    '    flow = 0',
    '    while True:',
    '        parent = [-1] * n',
    '        queue = deque([s])',
    '        while queue and parent[t] == -1:                    # BFS in the residual graph',
    '            u = queue.popleft()',
    '            for a in g[u]:',
    '                if cap[a] > 0 and parent[to[a]] == -1 and to[a] != s:',
    '                    parent[to[a]] = a',
    '                    queue.append(to[a])',
    '        if parent[t] == -1:                                 # no augmenting path left',
    '            break',
    "        push, v = float('inf'), t",
    '        while v != s:',
    '            push = min(push, cap[parent[v]])                # bottleneck',
    '            v = to[parent[v] ^ 1]',
    '        v = t',
    '        while v != s:',
    '            cap[parent[v]] -= push',
    '            cap[parent[v] ^ 1] += push',
    '            v = to[parent[v] ^ 1]',
    '        flow += push',
    retCaps ? '    return flow, g, to, cap' : '    return flow',
  ];
}

/** Line indexes inside flowJava / flowPython for each phase. */
export const CORE: FlowLines = {
  start: { j: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], p: [0, 1, 2, 3, 4, 5, 6], a: 0 },
  bfs: { j: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21], p: [8, 9, 10, 11, 12, 13, 14, 15], a: 1 },
  none: { j: [25], p: [16, 17], a: 4 },
  found: { j: [26, 27, 28], p: [18, 19, 20, 21], a: 2 },
  push: { j: [29, 30, 31, 33], p: [22, 23, 24, 25, 26, 27], a: 3 },
};
export const CORE_RETURN = { j: [35], p: [28] };

/* ------------------------------------------------------------------ matrices (Floyd-Warshall family) */

export const INF = Infinity;
export const fmtD = (d: number): string => (d === INF ? '∞' : String(d));

/** Grid-scene rows for an n×n distance matrix; `look` supplies each cell's state / tone. */
export function matrixRows(d: number[][], look: (i: number, j: number) => { state?: CellState; tone?: Tone }): Cell[][] {
  return d.map((row, i) => row.map((v, j): Cell => {
    const { state, tone } = look(i, j);
    const c: Cell = { key: `${i},${j}`, value: fmtD(v) };
    if (state) c.state = state;
    if (tone) c.tone = tone;
    return c;
  }));
}
