import type { CellState, ProblemDef, Step, Tone } from '../../engine/types.ts';
import { cross, dist2, fmtPt, fmtPts, parsePoints, planeScene } from './kitF.ts';
import type { Pt } from './kitF.ts';

interface In { pts: Pt[] }

const parse = (raw: string): In => ({ pts: parsePoints(raw, { min: 2, max: 10, example: '0,1 3,0 6,2 5,6 2,5 3,3 2,2' }) });

function build({ pts }: In): Step[] {
  const n = pts.length;
  let start = 0;
  for (let i = 1; i < n; i++) if (pts[i][0] < pts[start][0] || (pts[i][0] === pts[start][0] && pts[i][1] < pts[start][1])) start = i;
  const hull: number[] = [];
  const steps: Step[] = [];
  let cur: number = start;
  let next: number | null = null;
  let cand: number | null = null;
  let last: string | number = '—';
  let final = false;

  const push = (s: { title: string; desc: string; logic: string; tone?: Step['logicTone']; java: number[]; py: number[]; algo: number; focus?: Record<number, CellState>; segs?: { from: number; to: number; state?: 'active' | 'visited' | 'error' | 'chosen' | 'dim'; label?: string }[]; result?: Step['result']; tag: string; note?: string; alert?: string }) => {
    const states: Record<number, CellState> = {};
    const tones: Record<number, Tone> = {};
    const hs = new Set(hull);
    pts.forEach((_, i) => {
      if (final) states[i] = hs.has(i) ? 'found' : 'dim';
      else if (hs.has(i)) tones[i] = 'green';
    });
    Object.assign(states, s.focus ?? {});
    for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
    steps.push({
      title: s.title, desc: s.desc, logic: s.logic, logicTone: s.tone ?? 'info', javaLines: s.java, pyLines: s.py, algoStep: s.algo,
      scene: planeScene(pts, {
        states, tones, segments: s.segs,
        polygon: hull.length >= 2 ? { ids: [...hull], closed: final, state: 'found' } : undefined,
        pointers: final ? [] : [{ id: 'cur', label: 'cur', index: cur, tone: 'green' }, ...(cand !== null ? [{ id: 'cand', label: 'i', index: cand, tone: 'orange' as const }] : [])],
      }),
      vars: { cur: fmtPt(pts[cur]), next: next === null ? '—' : fmtPt(pts[next]), 'hull size': hull.length, cross: last },
      tag: s.tag, ...(s.note ? { note: s.note } : {}), ...(s.alert ? { alert: s.alert } : {}),
      ...(s.result ? { result: s.result } : {}),
    });
  };

  push({
    title: 'Start at the leftmost point', desc: `${fmtPt(pts[start])} is the leftmost point (lowest if tied), so it is certainly a hull corner. From a corner we will find the next corner, and repeat until we return.`,
    logic: 'Gift wrapping needs one guaranteed hull vertex to start from; the extreme point in any direction always is one.', java: [1], py: [1], algo: 0, focus: { [start]: 'compare' },
    tag: 'START —', note: `smallest x = ${pts[start][0]} → start = ${fmtPt(pts[start])}`,
  });
  let guard = 0;
  do {
    hull.push(cur);
    next = (cur + 1) % n;
    cand = null;
    last = '—';
    push({
      title: `Corner ${fmtPt(pts[cur])}: find the next corner`, desc: `Start with ${fmtPt(pts[next])} as the provisional next point, then test every point: whenever one lies to the right of cur → next, it is more clockwise and replaces it.`,
      logic: 'The true next corner is the point such that every other point is on its left side.', java: [5, 6], py: [4, 5, 6], algo: 1,
      focus: { [cur]: 'compare', [next]: 'swap' }, segs: [{ from: cur, to: next, state: 'visited' }],
      tag: 'CORNER —', note: `hull.add${fmtPt(pts[cur])} (corner ${hull.length}), next = ${fmtPt(pts[next])} for now`,
    });
    for (let i = 0; i < n; i++) {
      if (i === cur || i === next) continue;
      cand = i;
      const c = cross(pts[cur], pts[next], pts[i]);
      last = c;
      const farther = c === 0 && dist2(pts[cur], pts[i]) > dist2(pts[cur], pts[next]);
      const better = c < 0 || farther;
      push({
        title: better ? `${fmtPt(pts[i])} beats ${fmtPt(pts[next])}` : `${fmtPt(pts[i])} is not better`,
        desc: c < 0 ? `cross = ${c}: ${fmtPt(pts[i])} is to the right of ${fmtPt(pts[cur])} → ${fmtPt(pts[next])}, so it is the new candidate.` : c === 0 ? (farther ? `cross = 0: same direction but farther, and the hull needs the farthest of collinear points.` : `cross = 0: same direction but nearer, so keep the farther one.`) : `cross = ${c}: it is to the left, so the current candidate still wraps it.`,
        logic: 'Only a point on the right (or a farther collinear point) can invalidate the current candidate.', tone: better ? 'warn' : 'info', java: [7, 8, 9, 10], py: [7, 8, 9, 10], algo: 2,
        tag: better ? 'REPLACE:' : 'TEST:',
        note: `cross(${fmtPt(pts[cur])}, ${fmtPt(pts[next])}, ${fmtPt(pts[i])}) = ${c}${c < 0 ? ' < 0 → next = ' + fmtPt(pts[i]) : c === 0 ? (farther ? ' = 0 and farther → next = ' + fmtPt(pts[i]) : ' = 0 and nearer → keep') : ' > 0 → keep'}`,
        alert: better ? `${fmtPt(pts[i])} is ${c < 0 ? 'to the right of' : 'farther along'} ${fmtPt(pts[cur])} → ${fmtPt(pts[next])}: the candidate is replaced.` : undefined,
        focus: { [cur]: 'compare', [next]: 'swap', [i]: better ? 'active' : 'dim' },
        segs: [{ from: cur, to: next, state: 'visited' }, { from: cur, to: i, state: better ? 'active' : 'dim', label: c < 0 ? 'right' : c === 0 ? 'straight' : 'left' }],
      });
      if (better) next = i;
    }
    cand = null;
    push({
      title: `Next corner: ${fmtPt(pts[next])}`, desc: `Every point is on the left of ${fmtPt(pts[cur])} → ${fmtPt(pts[next])}, so that edge is on the hull.`,
      logic: 'An edge with all points on one side is a supporting line: it belongs to the hull.', tone: 'info', java: [12], py: [11], algo: 3,
      tag: 'EDGE FOUND —', note: `cur = ${fmtPt(pts[next])}; ${hull.length} corner${hull.length === 1 ? '' : 's'} so far`,
      focus: { [cur]: 'compare', [next]: 'found' }, segs: [{ from: cur, to: next, state: 'chosen' }],
    });
    cur = next;
  } while (cur !== start && ++guard < 40);
  final = true;
  const out = hull.map((i) => pts[i]);
  push({
    title: 'Back at the start: done', desc: `The wrap closed after ${out.length} corners: ${fmtPts(out)}.`,
    logic: 'Each of the h corners cost one pass over all n points, so the total is O(n·h).', tone: 'success', java: [13, 14], py: [12], algo: 4, segs: [], tag: '✅ Done!', note: `cur == start ${fmtPt(pts[start])} → ${out.length} corners, about ${out.length}·${n} = ${out.length * n} cross tests`,
    result: { title: fmtPts(out), text: 'Hull corners, counter-clockwise from the leftmost point' },
  });
  return steps;
}

const P = (s: string): In => ({ pts: s.split(' ').map((t) => t.split(',').map(Number) as Pt) });

export const jarvisMarch: ProblemDef<In> = {
  slug: 'cp-jarvis-march-gift-wrapping',
  id: 'CP', title: 'Jarvis March (Gift Wrapping)', difficulty: 'Medium', category: 'Computational Geometry', tag: 'convex hull (gift wrapping)',
  statement: 'Given points in the plane, find the corners of their convex hull by gift wrapping: start at the leftmost point and repeatedly pick the point that has every other point on its left. List the corners counter-clockwise from the leftmost (lowest if tied) point; points lying on an edge are not corners.',
  constraints: '2 ≤ n ≤ 10, 0 ≤ x, y ≤ 12, all points distinct (written x,y)',
  examples: [
    { label: '0,1 3,0 6,2 5,6 2,5 3,3 2,2', input: P('0,1 3,0 6,2 5,6 2,5 3,3 2,2'), output: '[[0,1],[3,0],[6,2],[5,6],[2,5]]' },
    { label: '0,0 2,0 4,0 4,4 0,4 2,2', input: P('0,0 2,0 4,0 4,4 0,4 2,2'), output: '[[0,0],[4,0],[4,4],[0,4]]' },
    { label: '1,3 4,1 7,3 4,7 4,4 2,5', input: P('1,3 4,1 7,3 4,7 4,4 2,5'), output: '[[1,3],[4,1],[7,3],[4,7],[2,5]]' },
  ],
  inputPlaceholder: 'e.g. 0,1 3,0 6,2 5,6 2,5 3,3 2,2   (points x,y)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Plane', vizCaption: 'points (x,y) — the green outline is the hull found so far',
  legend: [{ label: 'Candidate being tested', state: 'active' }, { label: 'Current corner', state: 'compare' }, { label: 'Best next point so far', state: 'swap' }, { label: 'Hull corner', state: 'found' }, { label: 'Inside', state: 'dim' }],
  emphasis: ['gift wrapping', 'convex hull', 'every other point on its left'],
  phases: [
    { icon: '📍', label: 'Start at leftmost', tone: 'blue' },
    { icon: '🎯', label: 'Provisional next', tone: 'blue' },
    { icon: '🔍', label: 'Scan all points', tone: 'cyan' },
    { icon: '➡️', label: 'Move to next corner', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['cur', 'next', 'hull size', 'cross'],
  approach: {
    title: 'Wrap the set like a ribbon',
    text: 'The leftmost point is surely on the hull. From the current corner, scan every point and keep the one that is most clockwise (the farthest one if several are in the same direction). That point is the next corner. Repeat until the walk returns to the start. The cost is one scan per corner, so it is output-sensitive.',
  },
  java: [
    'public List<int[]> jarvisMarch(int[][] pts) {',
    '    int start = leftmostLowest(pts);                 // a point that is surely on the hull',
    '    List<int[]> hull = new ArrayList<>();',
    '    int cur = start;',
    '    do {',
    '        hull.add(pts[cur]);',
    '        int next = (cur + 1) % pts.length;           // any candidate to begin with',
    '        for (int i = 0; i < pts.length; i++) {',
    '            int c = cross(pts[cur], pts[next], pts[i]);',
    '            if (c < 0 || (c == 0 && dist2(pts[cur], pts[i]) > dist2(pts[cur], pts[next])))',
    '                next = i;                            // i is more clockwise (or farther on a tie)',
    '        }',
    '        cur = next;                                  // every point is left of cur -> next',
    '    } while (cur != start);',
    '    return hull;',
    '}',
    '',
    'private int leftmostLowest(int[][] pts) {',
    '    int best = 0;',
    '    for (int i = 1; i < pts.length; i++)',
    '        if (pts[i][0] < pts[best][0] || (pts[i][0] == pts[best][0] && pts[i][1] < pts[best][1])) best = i;',
    '    return best;',
    '}',
    'private int cross(int[] o, int[] a, int[] b) {',
    '    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);',
    '}',
    'private int dist2(int[] a, int[] b) {',
    '    int dx = a[0] - b[0], dy = a[1] - b[1];',
    '    return dx * dx + dy * dy;',
    '}',
  ],
  python: [
    'def jarvis_march(pts):',
    '    start = min(range(len(pts)), key=lambda i: pts[i])      # leftmost, then lowest',
    '    hull = []',
    '    cur = start',
    '    while True:',
    '        hull.append(pts[cur])',
    '        nxt = (cur + 1) % len(pts)                           # any candidate to begin with',
    '        for i in range(len(pts)):',
    '            c = cross(pts[cur], pts[nxt], pts[i])',
    '            if c < 0 or (c == 0 and dist2(pts[cur], pts[i]) > dist2(pts[cur], pts[nxt])):',
    '                nxt = i                                      # more clockwise, or farther on a tie',
    '        cur = nxt',
    '        if cur == start:',
    '            return hull',
    '',
    'def cross(o, a, b):',
    '    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])',
    '',
    'def dist2(a, b):',
    '    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2',
  ],
  algorithm: [
    'Start at the leftmost point, which is certainly on the hull',
    'Take any other point as the provisional next corner',
    'Scan all points: if one is to the right of cur → next (or farther on a tie), it replaces next',
    'After the scan, next is the following hull corner; move there',
    'Stop when the walk returns to the start point',
  ],
  complexity: [{ label: 'Time', value: 'O(n·h), h = hull corners' }, { label: 'Space', value: 'O(h)' }],
  why: 'If no point lies to the right of the directed line cur → next, then the whole set is on one side of it, so that segment is an edge of the hull and next is a corner. Choosing the farthest point on ties makes sure that straight stretches are skipped. Each of the h corners costs one O(n) scan; for small hulls this beats an O(n log n) sort-based method.',
  naive: 'Without the "most clockwise" scan you would have to test every pair of points against all others (O(n³)) to discover which pairs form hull edges.',
};
