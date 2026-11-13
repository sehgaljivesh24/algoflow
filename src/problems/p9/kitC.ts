import type { Cell, CellState, NTreeScene, Pointer, Scene, Step, Tone } from '../../engine/types.ts';

/** Shared helpers of fragment c (sqrt decomposition + persistent structures). No UI code. */

export const ceilSqrt = (n: number): number => Math.max(1, Math.ceil(Math.sqrt(n)));

/** Splits "arr | ops" at the bar. */
export function splitBar(raw: string, example: string): [string, string[]] {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error(`Write the array, a bar, then the operations, e.g. ${example}`);
  return [parts[0], parts[1].split(/[\s,;]+/).filter(Boolean)];
}

export function parseNums(s: string, o: { what: string; min: number; max: number; lo: number; hi: number; example: string }): number[] {
  const parts = s.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (parts.length < o.min || nums.some((n) => !Number.isInteger(n))) throw new Error(`Enter at least ${o.min} whole number${o.min === 1 ? '' : 's'} for ${o.what}, e.g. ${o.example}`);
  if (nums.length > o.max) throw new Error(`Use ${o.max} ${o.what} or fewer`);
  if (nums.some((n) => n < o.lo || n > o.hi)) throw new Error(`Each value in ${o.what} must be between ${o.lo} and ${o.hi}`);
  return nums;
}

const BLOCK_TONES: Tone[] = ['blue', 'purple'];

/**
 * Array drawn as blocks: one grid row per block, columns are the offsets inside the block. The last block is padded with
 * dots. `head(b)` is the row heading (block sum / lazy tag). Alternate blocks get alternate tones so the boundaries show.
 */
export function blockGrid(vals: (number | string)[], B: number, stateOf: (i: number) => CellState | undefined, head: (b: number) => string, valueOf?: (i: number) => number | string): Scene {
  const nb = Math.ceil(vals.length / B);
  const rows: Cell[][] = [];
  for (let b = 0; b < nb; b++) {
    const row: Cell[] = [];
    for (let j = 0; j < B; j++) {
      const i = b * B + j;
      if (i < vals.length) {
        const c: Cell = { key: i, value: valueOf ? valueOf(i) : vals[i] };
        const st = stateOf(i);
        // a tone would hide the state colour, so alternate-block tones are only used while a cell has no state
        if (st) c.state = st; else c.tone = BLOCK_TONES[b % 2];
        row.push(c);
      } else row.push({ key: `pad${b}-${j}`, value: '·', state: 'dim' });
    }
    rows.push(row);
  }
  return {
    kind: 'grid', rows, variant: 'matrix',
    rowHeads: Array.from({ length: nb }, (_, b) => head(b)),
    colHeads: Array.from({ length: B }, (_, j) => `+${j}`),
  };
}

/** Deterministic PRNG for fuzz scripts. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StepPush = (s: Omit<Step, 'vars' | 'aux'> & { aux?: Step['aux'] }) => void;

/** Index of the first code line containing `needle` (so highlighted lines never drift from the listing). */
export function lineOf(code: string[], needle: string, from = 0): number {
  const i = code.findIndex((l, k) => k >= from && l.includes(needle));
  if (i < 0) throw new Error(`code line not found: ${needle}`);
  return i;
}

/* ------------------------------------------------------- persistent trees (shared-node DAG) */

export interface PNode {
  id: number;
  lo: number;
  hi: number;
  depth: number;
  /** Segment-tree children; they may belong to older versions (shared nodes). */
  left: number | null;
  right: number | null;
  /** Stored number: a sum or a count. */
  val: number;
  /** Version that created the node. */
  ver: number;
  /** Leaves are laid out left to right sorted by this key (position, creation order). */
  key: [number, number];
}

export interface DagLayout { x: Map<number, number>; depth: number; cols: number }

/** Compact layout: leaf instances take consecutive columns in key order, a parent sits above its children, collisions are nudged apart. */
export function layoutDag(nodes: PNode[]): DagLayout {
  const leaves = nodes.filter((n) => n.left === null && n.right === null).sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1]);
  const x = new Map<number, number>();
  leaves.forEach((n, i) => x.set(n.id, i));
  const maxDepth = Math.max(...nodes.map((n) => n.depth), 0);
  for (let d = maxDepth; d >= 0; d--) {
    const level = nodes.filter((n) => n.depth === d && !x.has(n.id));
    const want = level.map((n) => {
      const ks = [n.left, n.right].filter((c): c is number => c !== null).map((c) => x.get(c) ?? 0);
      return { n, x: ks.length ? ks.reduce((a, b) => a + b, 0) / ks.length : 0 };
    });
    want.sort((a, b) => a.x - b.x || a.n.id - b.n.id);
    const fixedHere = nodes.filter((n) => n.depth === d && x.has(n.id)).map((n) => x.get(n.id)!);
    let last = -Infinity;
    for (const w of want) {
      let px = Math.max(w.x, last + 0.8);
      while (fixedHere.some((f) => Math.abs(f - px) < 0.8)) px += 0.8;
      x.set(w.n.id, px);
      last = px;
    }
  }
  const mx = Math.max(...[...x.values()], 1);
  return { x, depth: maxDepth, cols: Math.ceil(mx) + 1 };
}

/** Version 0 stays neutral grey; later versions use these colours (kept clear of the blue 'active' state). */
const VER_TONES: Tone[] = ['orange', 'purple', 'red', 'yellow', 'green'];

/**
 * The shared-node picture: node colour = version that created it, so shared nodes keep an older colour. A virtual top node
 * "versions" (id -1) points at every version root with an edge labelled v0, v1, ...
 */
export function dagScene(
  nodes: PNode[],
  roots: number[],
  lay: DagLayout | null,
  st: Record<number, CellState>,
  sub: (n: PNode) => string,
  tag: (n: PNode) => string | undefined,
  ptrs: { label: string; node: number; tone: Tone }[],
): NTreeScene {
  const mx = Math.max(1, (lay?.cols ?? 2) - 1);
  const md = Math.max(1, (lay?.depth ?? 1) + 1);
  const rootX = roots.map((r) => lay?.x.get(r) ?? 0);
  const topX = rootX.length ? rootX.reduce((a, b) => a + b, 0) / rootX.length : 0;
  const rootIdx = new Map(roots.map((r, k) => [r, k] as const));
  const all = [
    { id: -1, label: 'vers', children: [...roots], x: Math.min(1, topX / mx), y: 0, state: 'dim' as CellState } as NTreeScene['nodes'][number],
    ...nodes.map((n) => ({
      id: n.id, label: String(n.val), sub: sub(n), tag: tag(n),
      children: [n.left, n.right].filter((c): c is number => c !== null),
      state: st[n.id], tone: n.ver === 0 ? undefined : VER_TONES[(n.ver - 1) % VER_TONES.length],
      edgeLabel: rootIdx.has(n.id) ? `v${rootIdx.get(n.id)}` : undefined,
      x: Math.min(1, (lay?.x.get(n.id) ?? 0) / mx), y: (n.depth + 1) / md,
    })),
  ];
  const pointers: Pointer[] = ptrs
    .map((p, i) => ({ id: `p${i}-${p.label}`, label: p.label, index: all.findIndex((n) => n.id === p.node), tone: p.tone }))
    .filter((p) => p.index >= 0);
  return { kind: 'ntree', shape: 'box', root: -1, cols: lay?.cols, nodes: all, pointers };
}
