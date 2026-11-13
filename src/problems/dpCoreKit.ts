/**
 * Helpers shared by the pack-p6 (dp-core) problem files: knapsack input parsing, a growing recursion tree for the
 * memoization demos, and table cell builders. No UI code.
 */
import type { Cell, CellState, Scene, TreeNodeVM } from '../engine/types.ts';

export interface Knap { wt: number[]; val: number[]; cap: number }

/** "w:v w:v ... ; capacity" — e.g. "1:1 3:4 4:5 5:7 ; 7". */
export function parseKnapsack(raw: string, o: { maxItems: number; maxW: number; maxV: number; maxCap: number }): Knap {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: weight:value pairs ; capacity — e.g. 1:1 3:4 4:5 5:7 ; 7');
  const tokens = left.split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > o.maxItems) throw new Error(`Use between 1 and ${o.maxItems} items`);
  const wt: number[] = [];
  const val: number[] = [];
  for (const t of tokens) {
    const m = /^(\d+):(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a weight:value pair — write items like 3:4 (weight 3, value 4)`);
    const w = Number(m[1]);
    const v = Number(m[2]);
    if (w < 1 || w > o.maxW) throw new Error(`Each weight must be between 1 and ${o.maxW}`);
    if (v < 1 || v > o.maxV) throw new Error(`Each value must be between 1 and ${o.maxV}`);
    wt.push(w);
    val.push(v);
  }
  const cap = Number(right.trim());
  if (!Number.isInteger(cap) || cap < 1 || cap > o.maxCap) throw new Error(`The capacity must be a whole number from 1 to ${o.maxCap}`);
  return { wt, val, cap };
}

/** A recursion tree that grows as calls are made (binary: `left` and `right` children). */
export class CallTree {
  nodes: TreeNodeVM[] = [];
  states: Record<number, CellState> = {};
  labels: Record<number, string> = {};

  add(value: string | number, parent: number | null = null, side: 'left' | 'right' = 'left'): number {
    const id = this.nodes.length;
    this.nodes.push({ id, value, left: null, right: null });
    if (parent !== null) this.nodes[parent][side] = id;
    return id;
  }

  scene(): Extract<Scene, { kind: 'tree' }> {
    return {
      kind: 'tree',
      nodes: this.nodes.map((n) => ({ ...n })),
      root: this.nodes.length ? 0 : null,
      states: { ...this.states },
      labels: { ...this.labels },
    };
  }
}

/** One row of plain value cells; null shows as "?" and is dimmed. */
export function rowCells(prefix: string, vals: (number | string | null)[], stateOf: (i: number) => CellState | undefined, toneOf?: (i: number) => Cell['tone']): Cell[] {
  return vals.map((v, i): Cell => {
    const c: Cell = { key: `${prefix}${i}`, value: v === null ? '?' : v, state: stateOf(i) ?? (v === null ? 'dim' : undefined) };
    const t = toneOf?.(i);
    if (t) c.tone = t;
    return c;
  });
}
