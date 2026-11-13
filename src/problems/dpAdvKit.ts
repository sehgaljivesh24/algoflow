/**
 * Small helpers shared by the pack-p7 (advanced DP) problem files. No UI code.
 * Re-exports `recorder`, `parseInts`, `tableRows` from stepKit and `find` from treeKit so each problem imports one place.
 */
import type { Cell, CellState, Pointer, Tone } from '../engine/types.ts';

export { recorder, parseInts, tableRows, heads } from './stepKit.ts';
export { find } from './treeKit.ts';

/** Parse a single whole number in [lo, hi] with a friendly message. */
export function parseOne(raw: string, what: string, lo: number, hi: number, example: string): number {
  const t = raw.trim();
  const v = Number(t);
  if (!t || !Number.isInteger(v)) throw new Error(`Enter ${what} as a whole number, e.g. ${example}`);
  if (v < lo || v > hi) throw new Error(`${what[0].toUpperCase()}${what.slice(1)} must be between ${lo} and ${hi}`);
  return v;
}

/** Split "a ; b ; c" into exactly `n` trimmed non-empty parts. */
export function splitParts(raw: string, n: number, format: string): string[] {
  const parts = raw.split(';').map((s) => s.trim());
  if (parts.length !== n || parts.some((p) => !p)) throw new Error(`Format: ${format}`);
  return parts;
}

export const ptr = (id: string, label: string, index: number, tone: Tone): Pointer => ({ id, label, index, tone });

export const bin = (mask: number, bits: number): string => mask.toString(2).padStart(Math.max(1, bits), '0');

export const popcount = (m: number): number => {
  let c = 0;
  for (let x = m; x > 0; x >>= 1) c += x & 1;
  return c;
};

/** A row of array cells (keys `${prefix}${i}`) with optional per-index state / tone. */
export function arr(
  vals: (string | number)[],
  stateOf?: (i: number) => CellState | undefined,
  toneOf?: (i: number) => Tone | undefined,
  prefix = 'a',
): Cell[] {
  return vals.map((v, i) => {
    const c: Cell = { key: `${prefix}${i}`, value: v };
    const s = stateOf?.(i);
    const t = toneOf?.(i);
    if (s) c.state = s;
    if (t) c.tone = t;
    return c;
  });
}

/** One grid cell. */
export const gc = (key: string, value: string | number, state?: CellState, tone?: Tone): Cell => {
  const c: Cell = { key, value };
  if (state) c.state = state;
  if (tone) c.tone = tone;
  return c;
};

/** Random-access reference helpers used by the fuzz script and by problems (keeps one copy of the maths). */
export const perm = (n: number, k: number): number => {
  let r = 1;
  for (let i = 0; i < k; i++) r *= n - i;
  return r;
};
