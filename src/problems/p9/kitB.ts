/**
 * Shared helpers for the segment-tree and Fenwick-tree problems (pack p9, fragment b): structure builders, scene
 * builders (tree + array row stacked in a split scene) and friendly parsers. No UI code.
 */
import type { Cell, CellState, Pointer, Scene } from '../../engine/types.ts';

/* ----------------------------------------------------------------- parsing */

export interface ParsedOps {
  nums: number[];
  ops: { name: string; args: number[] }[];
}

/**
 * Parses "1 3 5 7 | sum 0 2 | update 1 2": the numbers first, then operations separated by "|".
 * `spec` maps an operation name to its number of integer arguments. `check` validates one operation against n.
 */
export function parseOps(
  raw: string,
  o: { spec: Record<string, number>; example: string; maxN: number; maxOps: number; lo: number; hi: number; check: (name: string, args: number[], n: number) => string | null },
): ParsedOps {
  const parts = raw.split('|').map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length < 2) throw new Error(`Write the numbers, then at least one operation separated by "|", e.g. ${o.example}`);
  const nums = parts[0].split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 2 || nums.some((x) => !Number.isInteger(x))) throw new Error(`Start with at least 2 whole numbers, e.g. ${o.example}`);
  if (nums.length > o.maxN) throw new Error(`Use at most ${o.maxN} numbers so the tree stays readable`);
  if (nums.some((x) => x < o.lo || x > o.hi)) throw new Error(`Numbers must be between ${o.lo} and ${o.hi}`);
  const ops = parts.slice(1).map((p) => {
    const t = p.split(/\s+/);
    const name = t[0].toLowerCase();
    if (!(name in o.spec)) throw new Error(`"${t[0]}" is not an operation. Use ${Object.keys(o.spec).join(', ')}, e.g. ${o.example}`);
    const args = t.slice(1).map(Number);
    if (args.length !== o.spec[name] || args.some((x) => !Number.isInteger(x))) throw new Error(`"${p}" needs ${o.spec[name]} whole number${o.spec[name] === 1 ? '' : 's'} after "${name}"`);
    const bad = o.check(name, args, nums.length);
    if (bad) throw new Error(`In "${p}": ${bad}`);
    return { name, args };
  });
  if (ops.length > o.maxOps) throw new Error(`Use at most ${o.maxOps} operations`);
  return { nums, ops };
}

export const fmtOps = (p: ParsedOps): string => `${p.nums.join(' ')} | ${p.ops.map((x) => `${x.name} ${x.args.join(' ')}`).join(' | ')}`;

/* ------------------------------------------------------------ segment tree */

export interface SegNode { id: number; l: number; r: number; kids: number[] }

/** Heap-numbered nodes (root 1, children 2i and 2i+1) of the recursive halving of [0, n-1], in pre-order. */
export function segStructure(n: number): SegNode[] {
  const out: SegNode[] = [];
  const go = (id: number, l: number, r: number) => {
    const node: SegNode = { id, l, r, kids: [] };
    out.push(node);
    if (l < r) {
      const m = (l + r) >> 1;
      node.kids = [2 * id, 2 * id + 1];
      go(2 * id, l, m);
      go(2 * id + 1, m + 1, r);
    }
  };
  go(1, 0, n - 1);
  return out;
}

export const rangeText = (l: number, r: number): string => (l === r ? `[${l}]` : `[${l},${r}]`);

export const cellsOf = (a: number[], st: (i: number) => CellState | undefined): Cell[] =>
  a.map((v, i) => { const c: Cell = { key: i, value: v }; const s = st(i); if (s) c.state = s; return c; });

/** A segment tree (boxes: value over range) stacked above the array row. */
export function segScene(
  shape: SegNode[],
  value: (id: number) => string,
  st: Record<number, CellState>,
  tags: Record<number, string>,
  here: number | null,
  a: number[],
  cellSt: (i: number) => CellState | undefined,
  ptrs: Pointer[] = [],
): Scene {
  const tree: Scene = {
    kind: 'ntree', shape: 'box', root: 1,
    nodes: shape.map((s) => ({ id: s.id, label: value(s.id), sub: rangeText(s.l, s.r), children: s.kids, state: st[s.id], tag: tags[s.id] })),
    pointers: here === null ? [] : [{ id: 'here', label: 'here', index: shape.findIndex((s) => s.id === here), tone: 'blue' }],
  };
  return { kind: 'split', stack: true, parts: [tree, { kind: 'array', cells: cellsOf(a, cellSt), pointers: ptrs }] };
}

/* ------------------------------------------------------------ Fenwick tree */

export const lowbit = (i: number): number => i & -i;
export const bin = (i: number, width = 4): string => i.toString(2).padStart(width, '0');

export interface BitShape { ids: number[]; kids: Map<number, number[]>; root: number; virtual: boolean }

/** Parent of i is i + lowbit(i). Several tops (n not a power of two) get a virtual root 0 labelled "end". */
export function bitStructure(n: number): BitShape {
  const kids = new Map<number, number[]>();
  const tops: number[] = [];
  for (let i = 1; i <= n; i++) {
    const p = i + lowbit(i);
    if (p <= n) kids.set(p, [...(kids.get(p) ?? []), i]);
    else tops.push(i);
  }
  const virtual = tops.length > 1;
  if (virtual) kids.set(0, tops);
  const ids = [...(virtual ? [0] : []), ...Array.from({ length: n }, (_, i) => i + 1)];
  return { ids, kids, root: virtual ? 0 : tops[0], virtual };
}

/**
 * Fenwick tree drawn as the "update" tree (edge i -> i + lowbit(i)), stacked above a bottom array scene.
 * `path` are node ids parent-first whose edges light up; `jumps` draw dashed arrows (the "subtract lowbit" hops of a query).
 */
export function bitScene(
  n: number,
  _tree: number[],
  label: (i: number) => string,
  st: Record<number, CellState>,
  path: number[],
  jumps: { from: number; to: number; label?: string }[],
  bottom: Scene,
  here: number | null = null,
): Scene {
  const shape = bitStructure(n);
  const nodes = shape.ids.map((i) => {
    if (i === 0) return { id: 0, label: 'end', children: shape.kids.get(0) ?? [], state: 'dim' as CellState };
    const lb = lowbit(i);
    return { id: i, label: label(i), sub: `#${i} ${lb === 1 ? `[${i}]` : `[${i - lb + 1},${i}]`}`, children: shape.kids.get(i) ?? [], state: st[i] };
  });
  const ntree: Scene = {
    kind: 'ntree', shape: 'box', root: shape.root, nodes, path, extraEdges: jumps.map((j) => ({ ...j, tone: 'blue' as const })),
    pointers: here === null ? [] : [{ id: 'here', label: 'i', index: nodes.findIndex((x) => x.id === here), tone: 'orange' }],
  };
  return { kind: 'split', stack: true, parts: [ntree, bottom] };
}

/** Builds the Fenwick array in O(n) the way the code does. Returns tree[1..n] (index 0 unused). */
export function bitBuild(a: number[]): number[] {
  const n = a.length;
  const t = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    t[i] += a[i - 1];
    const j = i + lowbit(i);
    if (j <= n) t[j] += t[i];
  }
  return t;
}
