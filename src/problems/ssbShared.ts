/**
 * Small helpers shared by the binary-search / sorting / bit-manipulation problem files
 * (parsing, cell builders, bit formatting). Not a problem itself.
 */
import type { Cell, CellState, Pointer, Tone } from '../engine/types.ts';

export const ptr = (id: string, label: string, index: number, tone: Tone): Pointer => ({ id, label, index, tone });

export interface NumOpts { minLen?: number; maxLen?: number; lo?: number; hi?: number; what?: string }

/** Parse a list of whole numbers (commas / spaces / brackets allowed). */
export function parseNums(raw: string, o: NumOpts = {}): number[] {
  const { minLen = 1, maxLen = 12, lo = -1000, hi = 1000, what = 'numbers' } = o;
  const toks = raw.split(/[\s,\[\]]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (toks.length < minLen) throw new Error(`Enter at least ${minLen} ${what}, e.g. 1 3 5 7`);
  if (nums.some((n) => !Number.isInteger(n))) throw new Error(`Use whole numbers only for the ${what}`);
  if (toks.length > maxLen) throw new Error(`Use ${maxLen} ${what} or fewer so the animation stays readable`);
  if (nums.some((n) => n < lo || n > hi)) throw new Error(`Each value must be between ${lo} and ${hi}`);
  return nums;
}

/** Split "a ; b ; c" into exactly `count` trimmed parts. */
export function parseParts(raw: string, count: number, hint: string): string[] {
  const parts = raw.split(';').map((s) => s.trim());
  if (parts.length !== count) throw new Error(`Format: ${hint}`);
  return parts;
}

export function parseInt1(raw: string, lo: number, hi: number, what: string): number {
  const t = raw.trim();
  const n = Number(t);
  if (!t || !Number.isInteger(n)) throw new Error(`${what} must be a whole number`);
  if (n < lo || n > hi) throw new Error(`${what} must be between ${lo} and ${hi}`);
  return n;
}

export const isSortedAsc = (a: number[], strict = false) => a.every((v, i) => i === 0 || (strict ? a[i - 1] < v : a[i - 1] <= v));

/** Array cells with the cells outside [lo, hi] dimmed; `marks` override by index. */
export function windowCells(nums: number[], lo: number, hi: number, marks: Record<number, CellState> = {}): Cell[] {
  return nums.map((value, i) => ({ key: i, value, state: marks[i] ?? (i < lo || i > hi ? 'dim' : undefined) }));
}

export const showArr = (a: (number | string)[]) => `[${a.join(', ')}]`;

/** Two's-complement bit string of n, w bits wide (MSB first). */
export const bitStr = (n: number, w: number) => (n & ((1 << w) - 1)).toString(2).padStart(w, '0');

/** One grid row of bit cells for n (MSB first). `stateAt` / `toneAt` optionally style each column (column 0 = MSB). */
export function bitRow(n: number, w: number, base?: CellState, stateAt?: (col: number) => CellState | undefined, toneAt?: Tone): Cell[] {
  const s = bitStr(n, w);
  return [...s].map((ch, c) => ({ key: c, value: ch, state: stateAt?.(c) ?? base, tone: toneAt }));
}

/** Column headers "b5 … b0" for a w-bit number. */
export const bitHeads = (w: number) => Array.from({ length: w }, (_, c) => `b${w - 1 - c}`);

/** Column index (0 = MSB) of bit position p in a w-bit grid. */
export const colOf = (p: number, w: number) => w - 1 - p;

export const TONES: Tone[] = ['blue', 'orange', 'green', 'purple', 'yellow', 'red'];
