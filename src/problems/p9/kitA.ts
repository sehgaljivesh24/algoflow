import type { Tone } from '../../engine/types.ts';

/** Shared helpers of fragment a (tries + advanced union-find). No UI code. */

export const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Tiny exact fraction (positive numerator and denominator). */
export interface Frac { n: number; d: number }
export const frac = (n: number, d = 1): Frac => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
export const fmul = (a: Frac, b: Frac): Frac => frac(a.n * b.n, a.d * b.d);
export const fdiv = (a: Frac, b: Frac): Frac => frac(a.n * b.d, a.d * b.n);
export const fnum = (a: Frac): number => a.n / a.d;
export const fstr = (a: Frac): string => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);
/** Decimal text like the judge prints it: up to 5 decimals, trailing zeros removed. */
export const dec = (v: number): string => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(5))));

/**
 * Tidy picture of a union-find forest: roots on top (y = 0), children below, leaves on consecutive columns, a parent
 * above the middle of its children. Returns x / y in the 0..1 unit square for every node (fixed graph coordinates).
 */
export function forestLayout(parent: number[]): { x: number; y: number }[] {
  const n = parent.length;
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) if (parent[i] !== i) kids[parent[i]].push(i);
  const x = new Array<number>(n).fill(0);
  const d = new Array<number>(n).fill(0);
  let col = 0;
  let maxD = 0;
  const walk = (u: number, depth: number): void => {
    d[u] = depth;
    maxD = Math.max(maxD, depth);
    if (!kids[u].length) { x[u] = col++; return; }
    for (const c of kids[u]) walk(c, depth + 1);
    x[u] = (x[kids[u][0]] + x[kids[u][kids[u].length - 1]]) / 2;
  };
  for (let i = 0; i < n; i++) if (parent[i] === i) walk(i, 0);
  return x.map((xv, i) => ({ x: col <= 1 ? 0.5 : xv / (col - 1), y: maxD === 0 ? 0.5 : d[i] / maxD }));
}
