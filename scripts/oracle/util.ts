import type { Scene, Step } from '../../src/engine/types.ts';

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Random integer in [lo, hi]. */
export const rint = (r: () => number, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
export const rarr = (r: () => number, n: number, lo: number, hi: number): number[] => Array.from({ length: n }, () => rint(r, lo, hi));
export const rstr = (r: () => number, n: number, alphabet = 'abc'): string => Array.from({ length: n }, () => alphabet[rint(r, 0, alphabet.length - 1)]).join('');

/** The step's visual scene(s), flattening a `split` scene; an array-shorthand step becomes one array scene. */
export function scenesOf(step: Step): Scene[] {
  const s: Scene = step.scene ?? ({ kind: 'array', cells: step.cells ?? [], pointers: step.pointers ?? [] } as Scene);
  return s.kind === 'split' ? (s.parts as Scene[]).flatMap((p) => (p.kind === 'split' ? [] : [p])) : [s];
}
/** First scene of a given kind, or undefined. */
export function sceneOfKind<K extends Scene['kind']>(step: Step, kind: K): Extract<Scene, { kind: K }> | undefined {
  return scenesOf(step).find((s) => s.kind === kind) as Extract<Scene, { kind: K }> | undefined;
}
/** Index of the pointer with this id (or lower-cased label) in any scene of the step, or null. */
export function ptr(step: Step, id: string): number | null {
  for (const s of scenesOf(step)) {
    const ps = ((s as { pointers?: { id: string; label: string; index: number }[] }).pointers ?? []) as { id: string; label: string; index: number }[];
    const p = ps.find((q) => q.id === id || q.label.toLowerCase() === id.toLowerCase());
    if (p) return p.index;
  }
  return null;
}
/** Values of the array-scene cells (first array scene), in order. */
export function cellValues(step: Step): (string | number)[] {
  const a = sceneOfKind(step, 'array');
  return (a?.cells ?? []).map((c) => c.value as string | number);
}
/** A numeric variable of the step (vars hold numbers or strings); NaN-safe: returns null if absent or non-numeric. */
export function num(step: Step, key: string): number | null {
  const v = step.vars[key];
  if (v === undefined || v === '—') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** A var as shown ('—' for unset becomes null). */
export function shown(step: Step, key: string): string | number | null {
  const v = step.vars[key];
  return v === undefined || v === '—' ? null : v;
}
