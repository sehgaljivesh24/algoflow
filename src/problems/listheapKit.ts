/**
 * Shared helpers for the linked-list / design / heap problems (owned by the listheap agent).
 * Pure functions only: scene builders, input parsing, a step emitter and a narrated binary heap.
 * NOTE: no TypeScript-only runtime syntax (parameter properties, enums) — files run under node type-stripping.
 */
import type { Aux, CellState, LogicTone, Scene, Step, Tone } from '../engine/types.ts';

export type Nxt = (number | null)[];
export type Vars = Record<string, string | number>;

/* ------------------------------------------------------------------ parsing */

export function parseInts(raw: string, o: { min?: number; max: number; lo?: number; hi?: number; hint: string; sorted?: boolean }): number[] {
  const toks = raw.split(/[\s,]+/).filter(Boolean);
  const vals = toks.map(Number);
  const lo = o.lo ?? -99;
  const hi = o.hi ?? 99;
  if (vals.length < (o.min ?? 1) || toks.some((t) => !/^-?\d+$/.test(t))) throw new Error(`Enter whole numbers, e.g. ${o.hint}`);
  if (vals.length > o.max) throw new Error(`Use ${o.max} numbers or fewer`);
  if (vals.some((v) => v < lo || v > hi)) throw new Error(`Keep every value between ${lo} and ${hi}`);
  if (o.sorted && vals.some((v, i) => i > 0 && v < vals[i - 1])) throw new Error('The list must be sorted in non-decreasing order');
  return vals;
}

export function parts(raw: string, count: number, hint: string): string[] {
  const p = raw.split(';');
  if (p.length !== count) throw new Error(`Format: ${hint}`);
  return p;
}

export function parseOne(raw: string, lo: number, hi: number, what: string): number {
  const t = raw.trim();
  if (!/^-?\d+$/.test(t) || +t < lo || +t > hi) throw new Error(`${what} must be a whole number from ${lo} to ${hi}`);
  return +t;
}

/** "3 2 0 -4 ; 1" -> values and the index the tail points back to (-1 = no cycle). */
export function parseCycle(raw: string): { vals: number[]; pos: number } {
  const [a, b] = parts(raw, 2, 'values ; pos — e.g. 3 2 0 -4 ; 1  (pos = index the tail links back to, or -1)');
  const vals = parseInts(a, { max: 10, hint: '3 2 0 -4 ; 1' });
  const pos = parseOne(b, -1, vals.length - 1, 'pos');
  return { vals, pos };
}

/* ------------------------------------------------------------------ list scenes */

export interface Ptr { id: string; label: string; at: number | null | undefined; tone: Tone }

/** Nodes are drawn in `order` (node keys); pointers refer to node keys and are mapped to positions. */
export function listScene(
  vals: (number | string)[], next: Nxt, ptrs: Ptr[] = [], states: Record<number, CellState> = {}, order?: number[],
): Scene {
  const ord = order ?? vals.map((_, i) => i);
  const pos = new Map(ord.map((k, i) => [k, i]));
  return {
    kind: 'list',
    nodes: ord.map((k) => ({ key: k, value: vals[k], next: next[k], state: states[k] })),
    pointers: ptrs.filter((p) => p.at !== null && p.at !== undefined && pos.has(p.at)).map((p) => ({ id: p.id, label: p.label, index: pos.get(p.at!)!, tone: p.tone })),
  };
}

/** A plain forward chain of values (keys 0..n-1). */
export function plainList(values: (number | string)[], ptrs: Ptr[] = [], states: Record<number, CellState> = {}): Scene {
  return listScene(values, values.map((_, i) => (i + 1 < values.length ? i + 1 : null)), ptrs, states);
}

/** Order that follows each head's chain in turn, then any nodes not yet reached (ascending key). */
export function chainOrder(next: Nxt, heads: (number | null | undefined)[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const h of heads) {
    let c = h ?? null;
    while (c !== null && !seen.has(c)) {
      seen.add(c);
      out.push(c);
      c = next[c];
    }
  }
  for (let i = 0; i < next.length; i++) if (!seen.has(i)) out.push(i);
  return out;
}

/** Node keys reachable from `head` along next (stops on a repeat). */
export function chainKeys(next: Nxt, head: number | null): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  let c = head;
  while (c !== null && !seen.has(c)) {
    seen.add(c);
    out.push(c);
    c = next[c];
  }
  return out;
}

export const show = (v: number | null | undefined, vals: (number | string)[]): string | number => (v === null || v === undefined ? 'null' : vals[v]);
export const arrow = (xs: (number | string)[]): string => (xs.length ? xs.join(' → ') : '(empty)');

/** next[] for a chain 0..n-1 whose tail points at `pos` (or null when pos < 0). */
export function cycleNext(n: number, pos: number): Nxt {
  return Array.from({ length: n }, (_, i) => (i + 1 < n ? i + 1 : pos >= 0 ? pos : null));
}

/* ------------------------------------------------------------------ steps */

export type Snap = () => { scene?: Scene; cells?: Step['cells']; pointers?: Step['pointers']; vars: Vars; aux?: Aux[] };

/** Returns emit(title, desc, logic, tone, javaLines, pyLines, algoStep, result?) that snapshots the caller's state. */
export function emitter(steps: Step[], snap: Snap) {
  return (title: string, desc: string, logic: string, tone: LogicTone, java: number[], py: number[], algoStep: number, result?: { title: string; text: string }, extra?: { tag?: string; note?: string; alert?: string }): void => {
    const s = snap();
    steps.push({ title, desc, logic, logicTone: tone, javaLines: java, pyLines: py, algoStep, ...s, ...(result ? { result } : {}), ...(extra?.tag ? { tag: extra.tag } : {}), ...(extra?.note ? { note: extra.note } : {}), ...(extra?.alert ? { alert: extra.alert } : {}) });
  };
}

/* ------------------------------------------------------------------ heap */

export interface HeapEvent { title: string; desc: string; logic: string; tone: LogicTone; hot: Record<number, CellState>; tag?: string; note?: string; alert?: string }
export type HeapCb = (e: HeapEvent) => void;
/** The pattern-page fields of a heap event, ready to pass as the `extra` argument of `emitter`'s emit. */
export const heapExtra = (e: HeapEvent): { tag?: string; note?: string; alert?: string } => ({ tag: e.tag, note: e.note, alert: e.alert });

/** A real binary heap that narrates every sift. `before(x, y)` is true when x belongs above y. */
export class Heap<T> {
  a: T[] = [];
  kind: 'min' | 'max';
  verbose: boolean;
  before: (x: T, y: T) => boolean;
  fmt: (x: T) => string | number;
  lab?: (x: T) => string;
  /** Text of the tag on the root node (default: the heap kind, "min" or "max"). */
  rootLabel?: string;
  constructor(kind: 'min' | 'max', before: (x: T, y: T) => boolean, fmt: (x: T) => string | number, lab?: (x: T) => string, verbose = true) {
    this.kind = kind;
    this.before = before;
    this.fmt = fmt;
    this.lab = lab;
    this.verbose = verbose;
  }

  get size(): number { return this.a.length; }
  peek(): T { return this.a[0]; }
  private swap(i: number, j: number): void { const t = this.a[i]; this.a[i] = this.a[j]; this.a[j] = t; }
  private s(x: T): string { return String(this.fmt(x)); }
  private get word(): string { return this.kind === 'min' ? 'smaller' : 'larger'; }

  scene(hot: Record<number, CellState> = {}): Scene {
    const n = this.a.length;
    const labels: Record<number, string> = {};
    if (this.lab) this.a.forEach((x, i) => { labels[i] = this.lab!(x); });
    if (n) {
      const rl = this.rootLabel ?? this.kind;
      labels[0] = labels[0] ? `${rl} ${labels[0]}` : rl;
    }
    return {
      kind: 'tree',
      nodes: this.a.map((x, i) => ({ id: i, value: this.fmt(x), left: 2 * i + 1 < n ? 2 * i + 1 : null, right: 2 * i + 2 < n ? 2 * i + 2 : null })),
      root: n ? 0 : null,
      states: { ...hot },
      labels,
    };
  }

  /** Array form of the heap (index i has children 2i+1 and 2i+2). */
  aux(title = 'heap as array', highlight?: number): Aux {
    return { title, kind: 'list', items: this.a.map((x) => this.s(x)), highlight };
  }

  /** Insert without narration (used to set up an initial heap). */
  load(xs: T[]): void { for (const x of xs) this.push(x, () => {}, true); }

  push(x: T, ev: HeapCb, quiet = false): void {
    this.a.push(x);
    let i = this.a.length - 1;
    if (!quiet) ev({ title: `Add ${this.s(x)}`, desc: `Put ${this.s(x)} in the next free slot (index ${i}) so the tree stays complete.`, logic: 'A new value always enters at the bottom; then it climbs while it beats its parent.', tone: 'info', hot: { [i]: 'active' }, tag: 'ADD', note: `a[${i}] = ${this.s(x)}, size ${this.a.length}` });
    let moved = false;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.before(this.a[i], this.a[p])) {
        const [cv, pv] = [this.s(this.a[i]), this.s(this.a[p])];
        this.swap(i, p);
        if (!quiet) ev({ title: `Sift up: swap ${cv} with ${pv}`, desc: `${cv} is ${this.word} than its parent ${pv}, so they trade places.`, logic: `In a ${this.kind}-heap every parent must be ${this.kind === 'min' ? 'at most' : 'at least'} its children.`, tone: 'warn', hot: { [i]: 'swap', [p]: 'swap' }, tag: 'SIFT UP', note: `${cv} ${this.kind === 'min' ? '<' : '>'} parent ${pv}: swap a[${i}], a[${p}]` });
        i = p;
        moved = true;
      } else {
        if (!quiet && (this.verbose || moved)) ev({ title: moved ? `${this.s(this.a[i])} settles` : `${this.s(this.a[i])} stays put`, desc: `${this.s(this.a[i])} is not ${this.word} than its parent ${this.s(this.a[p])}.`, logic: 'Heap order holds again, so the climb stops.', tone: 'success', hot: { [i]: 'found' }, tag: 'SETTLE', note: `${this.s(this.a[i])} vs parent ${this.s(this.a[p])}: order holds` });
        return;
      }
    }
    if (!quiet && (this.verbose || moved)) ev({ title: `${this.s(this.a[0])} is the new root`, desc: 'It reached the top of the heap.', logic: `The root is always the ${this.kind === 'min' ? 'smallest' : 'largest'} value.`, tone: 'success', hot: { 0: 'found' }, tag: 'NEW ROOT', note: `root = ${this.s(this.a[0])}` });
  }

  pop(ev: HeapCb, quiet = false): T {
    const top = this.a[0];
    if (!quiet) ev({ title: `Remove the root ${this.s(top)}`, desc: `The root is the ${this.kind === 'min' ? 'smallest' : 'largest'} value, so it is the one that leaves.`, logic: 'Pop always takes index 0; the hole is then filled from the end of the array.', tone: 'info', hot: { 0: 'found' }, tag: 'POP ROOT', note: `remove a[0] = ${this.s(top)}, size ${this.a.length - 1}` });
    const last = this.a.pop() as T;
    if (this.a.length === 0) return top;
    this.a[0] = last;
    if (!quiet) ev({ title: `Move ${this.s(last)} to the root`, desc: `The last element ${this.s(last)} fills the hole at index 0, then sinks to its place.`, logic: 'Moving the last leaf keeps the tree complete, but it may now violate heap order.', tone: 'info', hot: { 0: 'active' }, tag: 'FILL ROOT', note: `a[0] = ${this.s(last)} (the old last leaf)` });
    let i = 0;
    let moved = false;
    for (;;) {
      const n = this.a.length;
      const l = 2 * i + 1;
      const r = l + 1;
      let c = i;
      if (l < n && this.before(this.a[l], this.a[c])) c = l;
      if (r < n && this.before(this.a[r], this.a[c])) c = r;
      if (c === i) {
        if (!quiet && (this.verbose || moved)) ev({ title: `${this.s(this.a[i])} settles`, desc: l < n ? `Neither child is ${this.word} than ${this.s(this.a[i])}.` : `${this.s(this.a[i])} is a leaf now.`, logic: 'Heap order holds again.', tone: 'success', hot: { [i]: 'found' }, tag: 'SETTLE', note: l < n ? `${this.s(this.a[i])} vs children: order holds` : `${this.s(this.a[i])} is a leaf` });
        return top;
      }
      const [iv, cv] = [this.s(this.a[i]), this.s(this.a[c])];
      this.swap(i, c);
      if (!quiet) ev({ title: `Sift down: swap ${iv} with ${cv}`, desc: `The ${this.word} child ${cv} beats ${iv}, so ${iv} sinks one level.`, logic: 'Always swap with the child that should be higher, otherwise the other child would violate the order.', tone: 'warn', hot: { [i]: 'swap', [c]: 'swap' }, tag: 'SIFT DOWN', note: `${iv} vs ${this.word} child ${cv}: swap a[${i}], a[${c}]` });
      i = c;
      moved = true;
    }
  }
}
