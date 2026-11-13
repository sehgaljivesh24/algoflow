/**
 * Small helpers shared by the pack-p8 problem files (bits / math / strings / techniques).
 * Not a problem itself: step recorder, parsing helpers and a few cell builders.
 */
import type { Aux, Cell, CellState, LogicTone, Pointer, Scene, Step, Tone } from '../engine/types.ts';

export const ptr = (id: string, label: string, index: number, tone: Tone): Pointer => ({ id, label, index, tone });

/** Compact step description used by `Rec.push`. */
export interface P {
  /** title */ t: string;
  /** description */ d: string;
  /** scene (or use cells + pointers shorthand) */ scene?: Scene;
  cells?: Cell[];
  pointers?: Pointer[];
  aux?: Aux[];
  /** variables panel */ v: Record<string, string | number>;
  /** logic ("why") */ why: string;
  tone?: LogicTone;
  /** java lines */ j: number[];
  /** python lines */ p: number[];
  /** algorithm step */ a: number;
  result?: { title: string; text: string };
  /** pattern pages: uppercase narration prefix (tag), values appended to the code line (note), warning banner (alert) */
  tag?: string;
  note?: string;
  alert?: string;
}

/** Step recorder: `rec.push({...})` appends one fully-formed Step. */
export class Rec {
  steps: Step[] = [];
  push(o: P): void {
    this.steps.push({
      title: o.t, desc: o.d, scene: o.scene, cells: o.cells, pointers: o.pointers, aux: o.aux, vars: o.v,
      logic: o.why, logicTone: o.tone ?? 'info', javaLines: o.j, pyLines: o.p, algoStep: o.a, result: o.result,
      tag: o.tag, note: o.note, alert: o.alert,
    });
  }
}

/** Parse whole numbers separated by spaces / commas / brackets. */
export function nums(raw: string, o: { min?: number; max?: number; lo?: number; hi?: number; what?: string } = {}): number[] {
  const { min = 1, max = 10, lo = -1000, hi = 1000, what = 'numbers' } = o;
  const toks = raw.split(/[\s,\[\]]+/).filter(Boolean);
  const out = toks.map(Number);
  if (toks.length < min) throw new Error(`Enter at least ${min} ${what}, e.g. 3 1 4`);
  if (out.some((n) => !Number.isInteger(n))) throw new Error(`Use whole numbers only for the ${what}`);
  if (toks.length > max) throw new Error(`Use ${max} ${what} or fewer so the animation stays readable`);
  if (out.some((n) => n < lo || n > hi)) throw new Error(`Each of the ${what} must be between ${lo} and ${hi}`);
  return out;
}

/** Split "a ; b ; c" into exactly `count` trimmed parts. */
export function parts(raw: string, count: number, hint: string): string[] {
  const ps = raw.split(';').map((s) => s.trim());
  if (ps.length !== count) throw new Error(`Format: ${hint}`);
  return ps;
}

export function int(raw: string, lo: number, hi: number, what: string): number {
  const t = raw.trim();
  const n = Number(t);
  if (!t || !Number.isInteger(n)) throw new Error(`${what} must be a whole number`);
  if (n < lo || n > hi) throw new Error(`${what} must be between ${lo} and ${hi}`);
  return n;
}

/** A lowercase (or custom alphabet) word of bounded length. */
export function word(raw: string, o: { min?: number; max: number; re?: RegExp; what: string; hint?: string }): string {
  const s = raw.trim();
  const { min = 1, max, re = /^[a-z]+$/, what, hint = 'lowercase letters only' } = o;
  if (s.length < min) throw new Error(`The ${what} needs at least ${min} character${min > 1 ? 's' : ''}`);
  if (s.length > max) throw new Error(`Use at most ${max} characters for the ${what} so the animation stays readable`);
  if (!re.test(s)) throw new Error(`The ${what} must use ${hint}`);
  return s;
}

export const arr = (a: (number | string)[]) => `[${a.join(',')}]`;
export const quote = (s: string) => `"${s}"`;
export const strs = (a: string[]) => `[${a.map(quote).join(',')}]`;

/** Array cells with optional state per index; `keys` default to indices. */
export function row(values: (number | string)[], st: Record<number, CellState> = {}, base?: CellState, tone?: Record<number, Tone>): Cell[] {
  return values.map((value, i) => ({ key: i, value, state: st[i] ?? base, tone: tone?.[i] }));
}

/** Range of integers lo..hi (inclusive). */
export const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

/** Index strings "0", "1", … for column headers. */
export const idx = (n: number, from = 0) => Array.from({ length: n }, (_, i) => String(i + from));

/** Blank cell for padding grids. */
export const blank = (key: string | number): Cell => ({ key, value: '' });

/** Add `n` blank cells in front of `cells` (used to draw a pattern shifted under a text). */
export function shifted(cells: Cell[], lead: number, total: number, tag: string): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < total; i++) {
    const k = i - lead;
    out.push(k >= 0 && k < cells.length ? { ...cells[k], key: `${tag}${i}` } : blank(`${tag}${i}`));
  }
  return out;
}
