/** Shared geometry for the dashed "link" arrows of the n-ary tree and trie scenes (failure links, jumps to an ancestor). */

export interface Pt { x: number; y: number }

/** Clip distance from a node centre along unit vector (ux, uy): a circle of radius r, or a box of half sizes hw x hh. */
export function clipDist(ux: number, uy: number, hw: number, hh: number, circle: boolean): number {
  if (circle) return hw;
  const tx = Math.abs(ux) < 1e-6 ? Infinity : hw / Math.abs(ux);
  const ty = Math.abs(uy) < 1e-6 ? Infinity : hh / Math.abs(uy);
  return Math.min(tx, ty);
}

/**
 * A quadratic arc from a to b that bows sideways (to the right of the travel direction when `side` is 1, left when -1),
 * trimmed so it starts / ends at the node outlines. Returns the path, the bulge point (for a label) and the end tangent.
 */
export function linkArc(a: Pt, b: Pt, hw: number, hh: number, circle: boolean, side: 1 | -1, extra = 0): { d: string; mx: number; my: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // a self-contained control point: midpoint pushed along the normal
  const bend = (16 + Math.min(70, len * 0.22) + extra) * side;
  const cx = (a.x + b.x) / 2 + -uy * bend;
  const cy = (a.y + b.y) / 2 + ux * bend;
  const t0x = cx - a.x;
  const t0y = cy - a.y;
  const l0 = Math.hypot(t0x, t0y) || 1;
  const t1x = b.x - cx;
  const t1y = b.y - cy;
  const l1 = Math.hypot(t1x, t1y) || 1;
  const s0 = clipDist(t0x / l0, t0y / l0, hw, hh, circle);
  const s1 = clipDist(t1x / l1, t1y / l1, hw, hh, circle) + 3;
  const sx = a.x + (t0x / l0) * s0;
  const sy = a.y + (t0y / l0) * s0;
  const ex = b.x - (t1x / l1) * s1;
  const ey = b.y - (t1y / l1) * s1;
  const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
  const my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, mx, my };
}
