/** Tiny helpers shared by the pack-p1 problem files (windows / pointers / hashing / array techniques). No UI code. */
import type { Cell, CellState, Pointer, Tone } from '../engine/types.ts';
import { parseInts } from './stepKit.ts';

export const ptr = (id: string, label: string, index: number, tone: Tone = 'blue'): Pointer => ({ id, label, index, tone });

/** Parses "numbers | k" style input: the part before the bar is an int list, the part after is one whole number. */
export function parseNumsAndK(raw: string, o: { example: string; what: string; minLen?: number; maxLen?: number; lo?: number; hi?: number; kName: string; kMin: number; kMax: (n: number) => number }): { nums: number[]; k: number } {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error(`Format: numbers | ${o.kName}, e.g. ${o.example}`);
  const nums = parseInts(parts[0], { what: o.what, example: o.example.split('|')[0].trim(), minLen: o.minLen ?? 1, maxLen: o.maxLen ?? 12, lo: o.lo, hi: o.hi });
  const k = Number(parts[1].trim());
  const max = o.kMax(nums.length);
  if (parts[1].trim() === '' || !Number.isInteger(k) || k < o.kMin || k > max) throw new Error(`${o.kName} must be a whole number from ${o.kMin} to ${max}`);
  return { nums, k };
}

/** Two-row table scene: `top` and `bottom` rows share column headers. Null in `bottom` means "not computed yet". */
export function twoRows(
  topName: string,
  top: (string | number)[],
  topStates: (CellState | undefined)[],
  bottomName: string,
  bottom: (number | null)[],
  bottomStates: (CellState | undefined)[],
  heads?: string[],
) {
  const rowA: Cell[] = top.map((v, i) => ({ key: `a${i}`, value: v, state: topStates[i] }));
  const rowB: Cell[] = bottom.map((v, i) => ({ key: `b${i}`, value: v === null ? '?' : v, state: v === null ? 'dim' : bottomStates[i] }));
  return {
    kind: 'grid' as const,
    variant: 'table' as const,
    rows: [rowA, rowB],
    rowHeads: [topName, bottomName],
    colHeads: heads ?? top.map((_, i) => String(i)),
  };
}

export const fmtArr = (a: (number | string)[]): string => `[${a.join(',')}]`;
