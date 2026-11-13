/**
 * Small helpers shared by the backtracking / DP problem files (no UI code).
 * - recorder(): builds Step objects from a "say" description plus a snapshot function.
 * - parseInts()/capSteps(): friendly input validation.
 */
import type { Cell, LogicTone, Step } from '../engine/types.ts';

export type Snap = Pick<Step, 'cells' | 'pointers' | 'scene' | 'aux' | 'vars'>;

export interface Say {
  title: string;
  desc: string;
  logic: string;
  tone?: LogicTone;
  java: number[];
  py: number[];
  algo: number;
  result?: { title: string; text: string };
  /** Pattern pages: uppercase narration prefix, code-line comment with concrete values, warning banner (see Step). */
  tag?: string;
  note?: string;
  alert?: string;
}

/** `snap` must return fresh arrays/objects every call so earlier steps are never mutated. */
export function recorder(steps: Step[], snap: () => Snap): (s: Say) => void {
  return (s) => {
    steps.push({
      title: s.title,
      desc: s.desc,
      logic: s.logic,
      logicTone: s.tone ?? 'info',
      javaLines: s.java,
      pyLines: s.py,
      algoStep: s.algo,
      ...snap(),
      ...(s.result ? { result: s.result } : {}),
      ...(s.tag ? { tag: s.tag } : {}),
      ...(s.note ? { note: s.note } : {}),
      ...(s.alert ? { alert: s.alert } : {}),
    });
  };
}

export interface IntsOpts {
  what: string;
  example: string;
  minLen: number;
  maxLen: number;
  lo?: number;
  hi?: number;
  distinct?: boolean;
}

export function parseInts(raw: string, o: IntsOpts): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.length < o.minLen || nums.some((n) => !Number.isInteger(n))) {
    throw new Error(`Enter ${o.minLen === 1 ? 'at least one' : `at least ${o.minLen}`} whole number${o.minLen === 1 ? '' : 's'} for ${o.what}, e.g. ${o.example}`);
  }
  if (nums.length > o.maxLen) throw new Error(`Use ${o.maxLen} ${o.what} or fewer`);
  const lo = o.lo ?? -99;
  const hi = o.hi ?? 99;
  if (nums.some((n) => n < lo || n > hi)) throw new Error(`Each value in ${o.what} must be between ${lo} and ${hi}`);
  if (o.distinct && new Set(nums).size !== nums.length) throw new Error(`The values in ${o.what} must all be different`);
  return nums;
}

/** Rejects inputs whose animation would exceed the 400-step limit. */
export function capSteps<I>(build: (i: I) => Step[], input: I): I {
  if (build(input).length > 400) throw new Error('That input needs more than 400 animation steps. Try a smaller input.');
  return input;
}

export const num = (v: number | null | undefined, blank = '?'): string | number => (v === null || v === undefined ? blank : v);

export const cellOf = (key: string | number, value: string | number, state?: Cell['state'], tone?: Cell['tone']): Cell => {
  const c: Cell = { key, value };
  if (state) c.state = state;
  if (tone) c.tone = tone;
  return c;
};

export const fmtList = (a: (number | string)[]): string => `[${a.join(',')}]`;

/** Grid-scene rows for a DP table; null means "not computed yet" (shown as ? and dimmed). */
export function tableRows(
  t: (number | string | null)[][],
  stateOf: (r: number, c: number) => Cell['state'] | undefined,
): Cell[][] {
  return t.map((row, r) =>
    row.map((v, c): Cell => ({ key: `${r},${c}`, value: v === null ? '?' : v, state: stateOf(r, c) ?? (v === null ? 'dim' : undefined) })),
  );
}

export const heads = (n: number, f: (i: number) => string = (i) => String(i)): string[] => Array.from({ length: n }, (_, i) => f(i));
export const at = (p: [number, number] | null, r: number, c: number): boolean => !!p && p[0] === r && p[1] === c;
export const inList = (l: [number, number][], r: number, c: number): boolean => l.some(([a, b]) => a === r && b === c);
