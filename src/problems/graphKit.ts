import type { Tone } from '../engine/types';

/** Shared helpers for the graph / intervals / trie problems (parsing + small utilities). */

export interface EdgeIn {
  u: number;
  v: number;
  w?: number;
}

export const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

export function tokens(raw: string): string[] {
  return raw.split(/[\s,;]+/).filter(Boolean);
}

/**
 * Parses edge lists such as "0-1 1-2 2-3" (undirected), "0>1 1>2" (directed) or "0-1:4" (weighted).
 * Endpoints must be whole numbers in [lo, hi].
 */
export function parseEdges(
  raw: string,
  o: { weighted?: boolean; lo: number; hi: number; max: number; example: string; allowNegativeWeight?: boolean; allowEmpty?: boolean },
): EdgeIn[] {
  const toks = tokens(raw);
  if (!toks.length && o.allowEmpty) return [];
  if (!toks.length) throw new Error(`Enter edges like ${o.example}`);
  if (toks.length > o.max) throw new Error(`Use at most ${o.max} edges`);
  return toks.map((t) => {
    const m = /^(\d+)(?:->|-|>)(\d+)(?::(-?\d+))?$/.exec(t);
    if (!m) throw new Error(`"${t}" is not an edge. Write edges like ${o.example}`);
    const u = Number(m[1]);
    const v = Number(m[2]);
    if (u < o.lo || u > o.hi || v < o.lo || v > o.hi) throw new Error(`Node numbers must be between ${o.lo} and ${o.hi} (saw "${t}")`);
    if (o.weighted) {
      if (m[3] === undefined) throw new Error(`Give "${t}" a weight, like ${t}:3`);
      const w = Number(m[3]);
      if (w < 0 && !o.allowNegativeWeight) throw new Error('Weights must be zero or positive');
      if (Math.abs(w) > 99) throw new Error('Keep weights within 99');
      return { u, v, w };
    }
    if (m[3] !== undefined) throw new Error('This problem has no edge weights; write edges like ' + o.example);
    return { u, v };
  });
}

export const fmtEdges = (edges: EdgeIn[], dir = false): string =>
  edges.map((e) => `${e.u}${dir ? '>' : '-'}${e.v}${e.w !== undefined ? `:${e.w}` : ''}`).join(' ');

/** Deterministic small PRNG for fuzz scripts and examples. */
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

/** Parses intervals written as "1-3 2-6 8-10" (whole numbers 0..30). */
export function parseIntervals(raw: string, o: { max?: number; example?: string; allowPoint?: boolean } = {}): [number, number][] {
  const toks = tokens(raw);
  const ex = o.example ?? '1-3 2-6 8-10 15-18';
  const max = o.max ?? 8;
  if (!toks.length) throw new Error(`Enter intervals like ${ex}`);
  if (toks.length > max) throw new Error(`Use at most ${max} intervals`);
  return toks.map((t) => {
    const m = /^(\d+)-(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not an interval. Write start-end, like ${ex}`);
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 30 || b > 30) throw new Error('Keep interval ends at 30 or below');
    if (a > b || (a === b && !o.allowPoint)) throw new Error(`In "${t}" the start must be smaller than the end`);
    return [a, b] as [number, number];
  });
}
