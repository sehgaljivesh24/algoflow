import type { Aux, CellState, Step } from '../engine/types';
import type { EdgeMark, WEdge } from './mstKit.ts';
import { mstScene } from './mstKit.ts';
import { plural, verb } from './text.ts';

type Lines = { java: number[]; py: number[] };
/** Code-line highlights for the five moments of lazy-heap Prim. */
export interface PrimLines { start: Lines; pop: Lines; stale: Lines; add: Lines; done: Lines }

/**
 * Lazy-heap Prim from node 0 on a connected graph with nodes 0..n-1 (shared by the two Prim animations).
 * Heap entries are (weight, node, edge used). Returns the full step list; the final step carries the result.
 * `name(i)` is how a node is called in prose ("node 3", "house 3", "the well").
 */
export function primSteps(o: {
  n: number; edges: WEdge[]; name: (i: number) => string; label?: (i: number) => string | number | undefined;
  startDesc: string; startLogic: string; lines: PrimLines; resultText: string;
}): Step[] {
  const { n, edges, name } = o;
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  const other = (ei: number, x: number) => (edges[ei].u === x ? edges[ei].v : edges[ei].u);
  const inTree = new Array<boolean>(n).fill(false);
  const marks: EdgeMark[] = edges.map(() => 'todo');
  type Ent = { w: number; v: number; ei: number };
  const heap: Ent[] = [{ w: 0, v: 0, ei: -1 }];
  const sortHeap = () => heap.sort((a, b) => a.w - b.w || a.v - b.v || a.ei - b.ei);
  const steps: Step[] = [];
  let total = 0;
  let taken = 0;
  let cur: number | string = '—';
  let popped: Ent | null = null;

  const states = (): (CellState | undefined)[] =>
    Array.from({ length: n }, (_, i) => {
      if (popped && i === popped.v) return 'active';
      if (inTree[i]) return 'found';
      if (heap.some((h) => h.v === i)) return 'compare';
      return undefined;
    });
  /** Edges accepted into the tree so far, in the order they were added. */
  const mst: string[] = [];
  const isStale = (h: Ent) => h.ei >= 0 && inTree[h.v];
  const aux = (): Aux[] => [
    {
      title: 'priority queue (weight, node) — smallest first; stale entries marked',
      kind: 'queue',
      items: heap.map((h) => `(${h.w}, ${h.v}${h.ei >= 0 ? ` via ${other(h.ei, h.v)}` : ''})${isStale(h) ? ' stale' : ''}`),
      bad: heap.flatMap((h, i) => (isStale(h) ? [i] : [])),
    },
    { title: 'MST edges added', kind: 'list', items: mst.length ? [...mst] : ['none yet'], highlight: mst.length && popped && inTree[popped.v] ? mst.length - 1 : undefined },
    { title: 'in the tree', kind: 'list', items: Array.from({ length: n }, (_, i) => `${i}: ${inTree[i] ? 'yes' : 'no'}`) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) =>
    steps.push({
      ...s,
      scene: mstScene({ n, base: 0, edges, marks, states: states(), tags: Array.from({ length: n }, () => undefined), labels: Array.from({ length: n }, (_, i) => o.label?.(i)) }),
      aux: aux(),
      vars: { popped: cur, 'cost so far': total, 'in tree': `${taken}/${n}` },
    });

  push({
    title: 'Start from node 0', desc: o.startDesc, logic: o.startLogic, logicTone: 'info',
    tag: 'INIT —', note: `heap = [(0, 0)], inTree = none, total = 0`,
    javaLines: o.lines.start.java, pyLines: o.lines.start.py, algoStep: 0,
  });

  while (heap.length && taken < n) {
    sortHeap();
    const top = heap.shift()!;
    popped = top;
    cur = top.ei >= 0 ? `(${top.w}, ${top.v})` : '(0, 0)';
    if (top.ei >= 0) marks[top.ei] = 'cur';
    if (inTree[top.v]) {
      marks[top.ei] = 'dim';
      push({
        title: `Pop (${top.w}, ${top.v}): stale`, desc: `${name(top.v)} joined the tree through a cheaper edge after this entry was queued, so the entry is skipped.`,
        logic: 'A lazy heap keeps old entries instead of decreasing keys; each one is checked when it surfaces.', logicTone: 'warn',
        tag: 'SKIP', alert: `Stale entry (${top.w}, ${top.v}): ${name(top.v)} is already in the tree, so this edge would close a cycle.`, note: `inTree[${top.v}] = true → continue`,
        javaLines: o.lines.stale.java, pyLines: o.lines.stale.py, algoStep: 2,
      });
      popped = null;
      continue;
    }
    push({
      title: `Pop (${top.w}, ${top.v})`, desc: top.ei >= 0 ? `The cheapest way to reach a new node is ${name(top.v)} via ${name(other(top.ei, top.v))} for ${top.w}.` : `${name(0)} enters the tree for free.`,
      logic: 'The smallest entry in the heap is the cheapest edge leaving the current tree.', logicTone: 'info',
      tag: 'POP', note: `poll → w = ${top.w}, node = ${top.v}${top.ei >= 0 ? ` (via ${other(top.ei, top.v)})` : ''}; ${top.v} not in tree yet`,
      javaLines: o.lines.pop.java, pyLines: o.lines.pop.py, algoStep: 1,
    });
    inTree[top.v] = true;
    total += top.w;
    taken++;
    if (top.ei >= 0) marks[top.ei] = 'take';
    if (top.ei >= 0) mst.push(`${other(top.ei, top.v)}–${top.v} (${top.w})`);
    popped = top;
    const pushed: string[] = [];
    for (const ei of adj[top.v]) {
      const to = other(ei, top.v);
      if (inTree[to]) continue;
      heap.push({ w: edges[ei].w, v: to, ei });
      pushed.push(`(${edges[ei].w}, ${to})`);
    }
    sortHeap();
    push({
      title: `Add ${name(top.v)}${top.ei >= 0 ? `: cost ${total}` : ''}`,
      desc: `${name(top.v)} is in the tree${top.ei >= 0 ? ` (edge cost ${top.w}, total ${total})` : ''}. ${pushed.length ? `Its edges to outside nodes enter the heap: ${pushed.join(', ')}.` : 'It has no edges to nodes outside the tree.'}`,
      logic: 'Only edges that lead outside the tree are queued; the new node may offer cheaper links than the ones already waiting.', logicTone: 'success',
      tag: 'ADD', note: `total += ${top.w} → ${total}; pushed ${pushed.length ? pushed.join(' ') : 'nothing'}`,
      javaLines: o.lines.add.java, pyLines: o.lines.add.py, algoStep: 3,
    });
    popped = null;
  }

  cur = '—';
  popped = null;
  const ans = taken === n ? total : -1;
  steps.push({
    title: ans === -1 ? 'Graph is not connected' : `Spanning tree cost ${ans}`,
    desc: ans === -1 ? 'The heap ran dry before every node joined the tree.' : `All ${plural(n, 'node')} ${verb(n, 'is', 'are')} in the tree, joined by ${plural(n - 1, 'edge')} (green) with total weight ${ans}.`,
    scene: mstScene({ n, base: 0, edges, marks, states: states(), tags: Array.from({ length: n }, () => undefined), labels: Array.from({ length: n }, (_, i) => o.label?.(i)) }),
    aux: aux(),
    vars: { popped: cur, 'cost so far': total, 'in tree': `${taken}/${n}` },
    logic: 'Each node was attached by the cheapest edge that crossed the cut between the tree and the rest, which is the cut property of MSTs.', logicTone: 'success',
    tag: ans === -1 ? '⚠ Stuck!' : '✅ Done!', note: ans === -1 ? `taken = ${taken} < n = ${n} → return -1` : `taken = ${n} → return total = ${ans}`,
    alert: ans === -1 ? 'The heap ran dry before every node joined: the graph is not connected.' : undefined,
    javaLines: o.lines.done.java, pyLines: o.lines.done.py, algoStep: 4,
    result: { title: String(ans), text: o.resultText },
  });
  return steps;
}
