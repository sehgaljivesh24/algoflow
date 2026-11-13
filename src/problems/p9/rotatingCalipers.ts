import type { CellState, ProblemDef, Step, Tone } from '../../engine/types.ts';
import { andrew, cross, dist2, fmtPt, parsePoints, planeScene } from './kitF.ts';
import type { Pt } from './kitF.ts';

interface In { pts: Pt[] }

const parse = (raw: string): In => ({ pts: parsePoints(raw, { min: 2, max: 10, example: '0,0 4,0 5,3 2,5 0,3 2,2' }) });

const area2 = (a: Pt, b: Pt, c: Pt) => Math.abs(cross(a, b, c));

function build({ pts }: In): Step[] {
  const hullPts = andrew(pts);
  const id = (p: Pt) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
  const h = hullPts.map(id);
  const m = h.length;
  const steps: Step[] = [];
  let bestIds: [number, number] | null = null;
  let best = 0;
  let curI: number | null = null;
  let curJ: number | null = null;
  let last: string | number = '—';
  let final = false;

  const push = (s: { title: string; desc: string; logic: string; tone?: Step['logicTone']; java: number[]; py: number[]; algo: number; segs?: { from: number; to: number; state?: 'active' | 'visited' | 'error' | 'chosen' | 'dim'; label?: string }[]; result?: Step['result']; tag: string; note?: string; alert?: string }) => {
    const states: Record<number, CellState> = {};
    const tones: Record<number, Tone> = {};
    pts.forEach((_, i) => { if (!h.includes(i)) states[i] = 'dim'; else tones[i] = 'blue'; });
    if (curI !== null) { states[h[curI]] = 'compare'; states[h[(curI + 1) % m]] = 'compare'; }
    if (curJ !== null) states[h[curJ]] = 'active';
    if (final && bestIds) { states[bestIds[0]] = 'found'; states[bestIds[1]] = 'found'; }
    for (const k of Object.keys(states)) if (states[+k] !== 'dim') delete tones[+k];
    const segs = [...(s.segs ?? [])];
    if (bestIds && best > 0) segs.push({ from: bestIds[0], to: bestIds[1], state: final ? 'chosen' : 'visited', label: `d²=${best}` });
    steps.push({
      title: s.title, desc: s.desc, logic: s.logic, logicTone: s.tone ?? 'info', javaLines: s.java, pyLines: s.py, algoStep: s.algo,
      scene: planeScene(pts, {
        states, tones, segments: segs, polygon: m >= 3 ? { ids: h, closed: true, state: 'active' } : undefined,
        pointers: curJ !== null && !final ? [{ id: 'j', label: 'j', index: h[curJ], tone: 'orange' }] : [],
      }),
      vars: { edge: curI === null ? '—' : `${fmtPt(pts[h[curI]])}→${fmtPt(pts[h[(curI + 1) % m]])}`, j: curJ === null ? '—' : fmtPt(pts[h[curJ]]), 'best d²': best, area: last },
      tag: s.tag, ...(s.note ? { note: s.note } : {}), ...(s.alert ? { alert: s.alert } : {}),
      ...(s.result ? { result: s.result } : {}),
    });
  };

  push({
    title: 'Hull first', desc: `The farthest pair is always two hull corners, so only the ${m} corner${m === 1 ? '' : 's'} of the hull matter (outline).`,
    logic: 'Interior points can never be an endpoint of the diameter: moving away from the centre only increases the distance.', java: [1], py: [1], algo: 0,
    tag: 'HULL —', note: `h = ${hullPts.map(fmtPt).join(' ')} (${m} corner${m === 1 ? '' : 's'})`,
  });
  if (m <= 2) {
    best = m === 2 ? dist2(pts[h[0]], pts[h[1]]) : 0;
    bestIds = m === 2 ? [h[0], h[1]] : null;
    final = true;
    push({ title: 'Only two corners', desc: `The hull is a segment, so the diameter is its length squared: ${best}.`, logic: 'Rotating calipers needs a polygon with area; a segment is solved directly.', tone: 'success', java: [3, 4], py: [2, 3], algo: 4, tag: '✅ Done!', note: `n = ${m} → dist² = ${best}`, result: { title: String(best), text: 'Squared diameter' } });
    return steps;
  }
  let j = 1;
  for (let i = 0; i < m; i++) {
    const ni = (i + 1) % m;
    curI = i;
    curJ = j;
    last = area2(pts[h[i]], pts[h[ni]], pts[h[j]]);
    push({
      title: `Edge ${fmtPt(pts[h[i]])} → ${fmtPt(pts[h[ni]])}`, desc: `Place a caliper on this edge. The far point j starts at ${fmtPt(pts[h[j]])} (twice the triangle area is ${last}).`,
      logic: 'The point farthest from an edge is the one with the biggest triangle area over that edge; j only ever moves forward as the edge rotates.', java: [6, 7], py: [4, 5], algo: 1,
      tag: 'EDGE —', note: `i=${i}, ni=${ni}, j=${j}: area² = ${last}`,
      segs: [{ from: h[i], to: h[ni], state: 'chosen' }, { from: h[i], to: h[j], state: 'dim' }, { from: h[ni], to: h[j], state: 'dim' }],
    });
    for (;;) {
      const nj = (j + 1) % m;
      const a0 = area2(pts[h[i]], pts[h[ni]], pts[h[j]]);
      const a1 = area2(pts[h[i]], pts[h[ni]], pts[h[nj]]);
      const grow = a1 > a0;
      last = `${a1} vs ${a0}`;
      push({
        title: grow ? `Area ${a1} > ${a0}: advance j` : `Area ${a1} ≤ ${a0}: j stays`,
        desc: grow ? `${fmtPt(pts[h[nj]])} is farther from the edge than ${fmtPt(pts[h[j]])}, so the antipodal point moves on.` : `${fmtPt(pts[h[j]])} is the farthest corner from this edge.`,
        logic: grow ? 'The triangle is still growing: the far point has not been reached.' : 'The triangle stopped growing, so j is antipodal to this edge.', tone: 'info', java: [8, 9], py: [6, 7], algo: 2,
        tag: grow ? 'ADVANCE j:' : 'j STAYS:',
        note: `area(j+1) = ${a1} ${grow ? '>' : '≤'} area(j) = ${a0}${grow ? ` → j = ${nj}` : ` → antipodal j = ${j}`}`,
        segs: [{ from: h[i], to: h[ni], state: 'chosen' }, { from: h[i], to: h[j], state: 'active' }, { from: h[ni], to: h[nj], state: grow ? 'active' : 'dim' }],
      });
      if (!grow) break;
      j = nj;
      curJ = j;
    }
    const d1 = dist2(pts[h[i]], pts[h[j]]);
    const d2 = dist2(pts[h[ni]], pts[h[j]]);
    const pick: [number, number] = d1 >= d2 ? [h[i], h[j]] : [h[ni], h[j]];
    const dm = Math.max(d1, d2);
    const improved = dm > best;
    if (improved) { best = dm; bestIds = pick; }
    push({
      title: `Distances ${d1} and ${d2}`, desc: `Compare ${fmtPt(pts[h[i]])}–${fmtPt(pts[h[j]])} (${d1}) and ${fmtPt(pts[h[ni]])}–${fmtPt(pts[h[j]])} (${d2}). ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
      logic: 'Only the two endpoints of the caliper edge need to be paired with the antipodal point j.', tone: improved ? 'success' : 'info', java: [10], py: [8], algo: 3,
      tag: improved ? 'NEW BEST —' : 'COMPARE —',
      note: `max(${d1}, ${d2}) = ${dm}${improved ? ` > old best → best = ${best}` : ` ≤ best ${best}`}`,
      segs: [{ from: h[i], to: h[j], state: 'active' }, { from: h[ni], to: h[j], state: 'active' }],
    });
  }
  curI = null;
  curJ = null;
  final = true;
  push({
    title: 'Done', desc: `The farthest pair is ${fmtPt(pts[bestIds![0]])} and ${fmtPt(pts[bestIds![1]])}; the squared distance is ${best}.`,
    logic: 'The caliper edge went once around the polygon and j moved around once too, so the scan is linear in the hull size.', tone: 'success', java: [12], py: [9], algo: 4,
    tag: '✅ Done!', note: `one lap over ${m} edges → best = ${best}`,
    result: { title: String(best), text: 'Squared diameter (largest squared distance between two points)' },
  });
  return steps;
}

const P = (s: string): In => ({ pts: s.split(' ').map((t) => t.split(',').map(Number) as Pt) });

export const rotatingCalipers: ProblemDef<In> = {
  slug: 'cp-rotating-calipers-polygon-diameter',
  id: 'CP', title: 'Rotating Calipers: Polygon Diameter', difficulty: 'Hard', category: 'Computational Geometry', tag: 'rotating calipers',
  statement: 'Given points in the plane, return the square of the largest distance between any two of them (the diameter squared). Build the convex hull first, then sweep a pair of parallel calipers once around it instead of comparing every pair.',
  constraints: '2 ≤ n ≤ 10, 0 ≤ x, y ≤ 12, all points distinct (written x,y)',
  examples: [
    { label: '0,0 4,0 5,3 2,5 0,3 2,2', input: P('0,0 4,0 5,3 2,5 0,3 2,2'), output: '34' },
    { label: '0,0 6,0 6,2 0,2', input: P('0,0 6,0 6,2 0,2'), output: '40' },
    { label: '1,1 5,0 9,3 6,8 2,6 5,4', input: P('1,1 5,0 9,3 6,8 2,6 5,4'), output: '74' },
  ],
  inputPlaceholder: 'e.g. 0,0 4,0 5,3 2,5 0,3 2,2   (points x,y)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Plane', vizCaption: 'blue outline = hull, orange j = the point antipodal to the current edge',
  legend: [{ label: 'Antipodal point j', state: 'active' }, { label: 'Caliper edge endpoints', state: 'compare' }, { label: 'Farthest pair', state: 'found' }, { label: 'Interior point', state: 'dim' }],
  emphasis: ['largest distance', 'convex hull', 'calipers'],
  phases: [
    { icon: '📐', label: 'Build the hull', tone: 'blue' },
    { icon: '📏', label: 'Caliper on edge', tone: 'cyan' },
    { icon: '🔄', label: 'Advance far point j', tone: 'orange' },
    { icon: '🏆', label: 'Compare distances', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['edge', 'j', 'best d²', 'area'],
  approach: {
    title: 'Hull, then rotate the calipers',
    text: 'The farthest pair of a point set are two corners of its convex hull. Walk around the hull edge by edge; for each edge keep a pointer j at the corner farthest from it, which is the corner where the triangle area over the edge stops growing. j only moves forward, so one lap is enough. Pair j with both ends of the edge and keep the largest squared distance.',
  },
  java: [
    'public int diameterSquared(int[][] pts) {',
    '    int[][] h = convexHull(pts);                     // counter-clockwise, no collinear points',
    '    int n = h.length, best = 0;',
    '    if (n == 1) return 0;',
    '    if (n == 2) return dist2(h[0], h[1]);',
    '    int j = 1;',
    '    for (int i = 0; i < n; i++) {',
    '        int ni = (i + 1) % n;',
    '        while (area(h[i], h[ni], h[(j + 1) % n]) > area(h[i], h[ni], h[j]))',
    '            j = (j + 1) % n;                         // far point moves on while the triangle grows',
    '        best = Math.max(best, Math.max(dist2(h[i], h[j]), dist2(h[ni], h[j])));',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def diameter_squared(pts):',
    '    h = convex_hull(pts)                             # counter-clockwise, no collinear points',
    '    n, best = len(h), 0',
    '    if n <= 2:',
    '        return dist2(h[0], h[-1])',
    '    j = 1',
    '    for i in range(n):',
    '        ni = (i + 1) % n',
    '        while area(h[i], h[ni], h[(j + 1) % n]) > area(h[i], h[ni], h[j]):',
    '            j = (j + 1) % n                          # far point moves on while the triangle grows',
    '        best = max(best, dist2(h[i], h[j]), dist2(h[ni], h[j]))',
    '    return best',
  ],
  algorithm: [
    'Compute the convex hull; the farthest pair is two of its corners',
    'For each hull edge (i, i+1) place a caliper on it',
    'Advance j while the triangle (i, i+1, j+1) has a larger area than (i, i+1, j)',
    'Compare dist²(i, j) and dist²(i+1, j) with the best so far',
    'After one lap the best value is the squared diameter',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n) hull + O(h) sweep' }, { label: 'Space', value: 'O(h)' }],
  why: 'The distance from a hull edge to the corners around the polygon rises and then falls (the polygon is convex), so the corner of maximum area over each edge can be found by walking j forward until the area stops growing. As the edge rotates counter-clockwise, its antipodal corner rotates the same way and never moves back, so j goes around only once. Every diametral pair is antipodal for some edge, so checking j against the edge ends finds it.',
  naive: 'Comparing every pair of the n points is O(n²) pairs; on large inputs the hull plus calipers brings the second phase down to linear in the hull size.',
};
