/** Shared helpers of fragment f (convex hull / computational geometry on the `plane` scene). No UI code. */
import type { CellState, EdgeState, PlaneScene, Pointer, Tone } from '../../engine/types.ts';

export type Pt = [number, number];

/** Cross product of (a - o) and (b - o): > 0 means o -> a -> b turns left (counter-clockwise), 0 collinear, < 0 right. */
export const cross = (o: Pt, a: Pt, b: Pt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
export const dist2 = (a: Pt, b: Pt): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
export const fmtPt = (p: Pt): string => `(${p[0]},${p[1]})`;
export const fmtPts = (ps: Pt[]): string => `[${ps.map((p) => `[${p[0]},${p[1]}]`).join(',')}]`;
export const sortPts = (ps: Pt[]): Pt[] => [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

export function parsePoints(raw: string, o: { min: number; max: number; example: string }): Pt[] {
  const toks = raw.split(/[\s;]+/).filter(Boolean);
  if (toks.length < o.min) throw new Error(`Enter at least ${o.min} points written x,y and separated by spaces, e.g. ${o.example}`);
  if (toks.length > o.max) throw new Error(`Use at most ${o.max} points`);
  const pts = toks.map((t): Pt => {
    const m = /^(\d{1,2}),(\d{1,2})$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a point. Write each point as x,y with whole numbers, e.g. ${o.example}`);
    const p: Pt = [Number(m[1]), Number(m[2])];
    if (p[0] > 12 || p[1] > 12) throw new Error('Keep every coordinate between 0 and 12');
    return p;
  });
  if (new Set(pts.map((p) => `${p[0]},${p[1]}`)).size !== pts.length) throw new Error('All points must be different');
  return pts;
}

/** Andrew's monotone chain used silently (counter-clockwise vertices, collinear points dropped unless `keep`). */
export function andrew(points: Pt[], keep = false): Pt[] {
  const ps = sortPts(points);
  if (ps.length <= 2) return ps;
  const bad = (c: number) => (keep ? c < 0 : c <= 0);
  const build = (seq: Pt[]): Pt[] => {
    const st: Pt[] = [];
    for (const p of seq) {
      while (st.length >= 2 && bad(cross(st[st.length - 2], st[st.length - 1], p))) st.pop();
      st.push(p);
    }
    return st;
  };
  const lo = build(ps);
  const up = build([...ps].reverse());
  const all = [...lo.slice(0, -1), ...up.slice(0, -1)];
  const seen = new Set<string>();
  const out = all.filter((p) => { const k = `${p[0]},${p[1]}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return keep ? sortPts(out.length ? out : ps) : out;
}

export interface PlaneOpts {
  /** per point index: state */
  states?: Record<number, CellState>;
  tones?: Record<number, Tone>;
  /** per point index: label override (default: the coordinates) */
  labels?: Record<number, string>;
  polygon?: { ids: number[]; closed?: boolean; state?: CellState };
  segments?: { from: number; to: number; state?: EdgeState; label?: string; arrow?: boolean }[];
  sweep?: { at: number; axis?: 'x' | 'y'; label?: string };
  pointers?: Pointer[];
}

/** A plane scene over the input points; point ids are their input indexes and labels are their coordinates. */
export function planeScene(pts: Pt[], o: PlaneOpts = {}): PlaneScene {
  return {
    kind: 'plane',
    points: pts.map((p, i) => ({ id: i, x: p[0], y: p[1], label: o.labels?.[i] ?? `${p[0]},${p[1]}`, state: o.states?.[i], tone: o.tones?.[i] })),
    segments: o.segments?.map((s) => ({ ...s })),
    polygon: o.polygon ? { ...o.polygon, ids: [...o.polygon.ids] } : undefined,
    sweep: o.sweep,
    pointers: o.pointers,
  };
}
