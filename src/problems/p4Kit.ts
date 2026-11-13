/**
 * Small helpers shared by the pack-p4 problems (grids, seeded randomness, parsing).
 * NOTE: no TypeScript-only runtime syntax (enums, parameter properties) — files run under node type-stripping.
 */
import type { Cell, Scene, SplitScene } from '../engine/types.ts';

/** Narrows a scene to a split-part type (heap / grid / array scenes are never nested splits). */
export const leaf = (s: Scene): Exclude<Scene, SplitScene> => s as Exclude<Scene, SplitScene>;

/** Rows such as "0110 1001" (whitespace / comma / semicolon separated) made of the characters in `alphabet`. */
export function parseCharRows(raw: string, o: { alphabet: string; example: string; what: string; maxR?: number; maxC?: number }): string[] {
  const rows = raw.split(/[\s,;/]+/).filter(Boolean);
  const bad = new RegExp(`[^${o.alphabet}]`);
  if (!rows.length || rows.some((r) => bad.test(r))) throw new Error(`Write ${o.what} as rows of ${[...o.alphabet].join(' / ')} separated by spaces, e.g. ${o.example}`);
  if (rows.some((r) => r.length !== rows[0].length)) throw new Error('Every row must have the same length');
  const maxR = o.maxR ?? 6;
  const maxC = o.maxC ?? 8;
  if (rows.length > maxR || rows[0].length > maxC) throw new Error(`Use at most ${maxR} rows and ${maxC} columns`);
  return rows;
}

/** Rows of whole numbers separated by "/" (or ";" / newline), e.g. "1 5 9 / 10 11 13". */
export function parseNumRows(raw: string, o: { example: string; maxR: number; maxC: number; lo?: number; hi?: number }): number[][] {
  const m = raw.split(/[/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error(`Rows of whole numbers separated by "/", e.g. ${o.example}`);
  if (m.some((r) => r.length !== m[0].length)) throw new Error('Every row must have the same number of columns');
  if (m.length > o.maxR || m[0].length > o.maxC) throw new Error(`Use at most ${o.maxR} rows and ${o.maxC} columns`);
  const lo = o.lo ?? -99;
  const hi = o.hi ?? 99;
  if (m.some((r) => r.some((n) => n < lo || n > hi))) throw new Error(`Keep every value between ${lo} and ${hi}`);
  return m;
}

/** A grid scene from a matrix of cells, with row / column headers. */
export function gridScene(rows: Cell[][]): Scene {
  return { kind: 'grid', rows, rowHeads: rows.map((_, r) => String(r)), colHeads: rows[0].map((_, c) => String(c)) };
}

export const DIRS4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][n % 10]}`;

/** Whole number in [lo, hi] parsed from one `;`-separated part. */
export function intIn(raw: string | undefined, lo: number, hi: number, what: string): number {
  const t = (raw ?? '').trim();
  if (!/^-?\d+$/.test(t) || +t < lo || +t > hi) throw new Error(`${what} must be a whole number from ${lo} to ${hi}`);
  return +t;
}

/** Whole numbers from one part. */
export function intList(raw: string | undefined, o: { what: string; min?: number; max: number; lo: number; hi: number; example: string }): number[] {
  const toks = (raw ?? '').split(/[\s,]+/).filter(Boolean);
  if (toks.length < (o.min ?? 1) || toks.some((t) => !/^-?\d+$/.test(t))) throw new Error(`Enter whole numbers for ${o.what}, e.g. ${o.example}`);
  if (toks.length > o.max) throw new Error(`Use ${o.max} values or fewer for ${o.what}`);
  const v = toks.map(Number);
  if (v.some((x) => x < o.lo || x > o.hi)) throw new Error(`Keep every value in ${o.what} between ${o.lo} and ${o.hi}`);
  return v;
}

export function semis(raw: string, count: number, format: string): string[] {
  const p = raw.split(';');
  if (p.length !== count) throw new Error(`Format: ${format}`);
  return p;
}
