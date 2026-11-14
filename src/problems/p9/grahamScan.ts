import type { CellState, ProblemDef, Step, Tone } from '../../engine/types.ts';
import { cross, dist2, fmtPt, fmtPts, parsePoints, planeScene } from './kitF.ts';
import type { Pt } from './kitF.ts';

interface In { pts: Pt[] }

const parse = (raw: string): In => ({ pts: parsePoints(raw, { min: 2, max: 10, example: '2,0 6,1 8,5 4,8 0,5 4,4 3,2' }) });

function build({ pts }: In): Step[] {
  const n = pts.length;
  let pivot = 0;
  for (let i = 1; i < n; i++) if (pts[i][1] < pts[pivot][1] || (pts[i][1] === pts[pivot][1] && pts[i][0] < pts[pivot][0])) pivot = i;
  const order = pts.map((_, i) => i).sort((a, b) => {
    const c = cross(pts[pivot], pts[a], pts[b]);
    return c !== 0 ? (c > 0 ? -1 : 1) : dist2(pts[pivot], pts[a]) - dist2(pts[pivot], pts[b]);
  });
  const rank: Record<number, string> = {};
  order.forEach((id, k) => { rank[id] = `${k}:${pts[id][0]},${pts[id][1]}`; });

  const st: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let last: string | number = '—';
  let sorted = false;
  let final = false;

  const push = (s: { title: string; desc: string; logic: string; tone?: Step['logicTone']; java: number[]; py: number[]; algo: number; focus?: Record<number, CellState>; segs?: { from: number; to: number; state?: 'active' | 'visited' | 'error' | 'chosen' | 'dim'; label?: string }[]; result?: Step['result']; tag: string; note?: string; alert?: string }) => {
    const states: Record<number, CellState> = {};
    const tones: Record<number, Tone> = {};
    const inSt = new Set(st);
    pts.forEach((_, i) => {
      if (final) states[i] = inSt.has(i) ? 'found' : 'dim';
      else if (i === pivot) states[i] = 'compare';
      else if (inSt.has(i)) tones[i] = 'blue';
    });
    Object.assign(states, s.focus ?? {});
    for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
    const rays = sorted && !final && s.segs === undefined && cur === null ? order.filter((i) => i !== pivot).map((i) => ({ from: pivot, to: i, state: 'dim' as const })) : s.segs;
    steps.push({
      title: s.title, desc: s.desc, logic: s.logic, logicTone: s.tone ?? 'info', javaLines: s.java, pyLines: s.py, algoStep: s.algo,
      scene: planeScene(pts, {
        states, tones, labels: sorted ? rank : undefined, segments: rays,
        polygon: st.length >= 2 ? { ids: [...st], closed: final, state: final ? 'found' : 'active' } : undefined,
        pointers: cur !== null && !final ? [{ id: 'p', label: 'p', index: cur, tone: 'orange' }] : [],
      }),
      aux: sorted ? [{ title: 'stack (bottom → top)', kind: 'list', items: st.map((i) => fmtPt(pts[i])), highlight: st.length - 1 }] : undefined,
      vars: { pivot: fmtPt(pts[pivot]), p: cur === null ? '—' : fmtPt(pts[cur]), 'stack size': st.length, cross: last },
      tag: s.tag, ...(s.note ? { note: s.note } : {}), ...(s.alert ? { alert: s.alert } : {}),
      ...(s.result ? { result: s.result } : {}),
    });
  };

  push({
    title: 'Find the pivot', desc: `${fmtPt(pts[pivot])} is the lowest point (leftmost if tied), so it must be a corner of the hull.`,
    logic: 'The bottom-most point can never be inside the hull: nothing lies below it. Everything else is seen from here.', java: [1], py: [1], algo: 0,
    tag: 'PIVOT —', note: `lowest y = ${pts[pivot][1]}, leftmost on ties → pivot = ${fmtPt(pts[pivot])}`,
  });
  sorted = true;
  push({
    title: 'Sort by angle around the pivot', desc: 'Points are numbered by the angle of the ray from the pivot, counter-clockwise; on the same ray the nearer point comes first.',
    logic: 'Visiting in angular order means the boundary can be traced in one counter-clockwise lap, like a rope swung around the pivot.', java: [2, 3, 4, 5, 6], py: [2], algo: 1,
    tag: 'SORT BY ANGLE —', note: `angular order: ${order.map((i) => fmtPt(pts[i])).join(' ')}`,
  });
  for (const id of order) {
    cur = id;
    if (st.length < 2) {
      st.push(id);
      push({ title: `Push ${fmtPt(pts[id])}`, desc: `The stack holds fewer than two points, so there is nothing to test yet: push it.`, logic: 'The first two points always start the stack.', tone: 'info', java: [8, 11], py: [4, 7], algo: 2, focus: { [id]: 'active' }, segs: [], tag: 'PUSH —', note: `stack size ${st.length - 1} < 2, so st.add${fmtPt(pts[id])} → size ${st.length}` });
      continue;
    }
    while (st.length >= 2) {
      const a = st[st.length - 2];
      const b = st[st.length - 1];
      const c = cross(pts[a], pts[b], pts[id]);
      last = c;
      const pop = c <= 0;
      push({
        title: pop ? `cross = ${c}: not a left turn, pop ${fmtPt(pts[b])}` : `cross = ${c}: left turn, keep ${fmtPt(pts[b])}`,
        desc: pop ? `${fmtPt(pts[a])} to ${fmtPt(pts[b])} to ${fmtPt(pts[id])} goes ${c === 0 ? 'straight' : 'clockwise'}, so ${fmtPt(pts[b])} is not a corner.` : `The path keeps turning counter-clockwise at ${fmtPt(pts[b])}, so it stays on the stack.`,
        logic: pop ? 'A hull corner always turns left. A right turn or a straight line means the top point is inside or on an edge: remove it.' : 'A left turn is consistent with a convex counter-clockwise boundary, so stop popping.',
        tone: pop ? 'warn' : 'info', java: pop ? [9, 10] : [9], py: pop ? [5, 6] : [5], algo: 3,
        tag: pop ? 'POP:' : 'KEEP (left):',
        note: `cross = (${pts[b][0] - pts[a][0]})(${pts[id][1] - pts[a][1]}) − (${pts[b][1] - pts[a][1]})(${pts[id][0] - pts[a][0]}) = ${c}${pop ? (c === 0 ? ' = 0 → pop' : ' < 0 → pop') : ' > 0 → keep'}`,
        alert: pop ? `${c === 0 ? 'Straight' : 'Clockwise'} turn at ${fmtPt(pts[b])}: not a hull corner, popped.` : undefined,
        focus: { [id]: 'active', [b]: pop ? 'error' : 'compare', [a]: 'compare' },
        segs: [{ from: a, to: b, state: 'visited' }, { from: b, to: id, state: pop ? 'error' : 'chosen', label: pop ? (c === 0 ? 'straight' : 'right') : 'left' }],
      });
      if (!pop) break;
      st.pop();
    }
    st.push(id);
    push({ title: `Push ${fmtPt(pts[id])}`, desc: `${fmtPt(pts[id])} is pushed; the stack now traces the hull so far.`, logic: 'After the pops, the new point always turns left with respect to the two below it.', tone: 'info', java: [11], py: [7], algo: 3, focus: { [id]: 'active' }, segs: [], tag: 'PUSH —', note: `st.add${fmtPt(pts[id])} → stack size ${st.length}` });
  }
  cur = null;
  final = true;
  const out = st.map((i) => pts[i]);
  push({
    title: 'Done', desc: `${out.length} hull corners, counter-clockwise from the pivot: ${fmtPts(out)}.`,
    logic: 'Each point was pushed once and popped at most once, so the scan itself is linear; the sort dominates.', tone: 'success', java: [13], py: [8], algo: 4, segs: [], tag: '✅ Done!', note: `return stack: ${out.length} corners, first = pivot ${fmtPt(pts[pivot])}`,
    result: { title: fmtPts(out), text: 'Hull corners, counter-clockwise from the pivot' },
  });
  return steps;
}

const P = (s: string): In => ({ pts: s.split(' ').map((t) => t.split(',').map(Number) as Pt) });

export const grahamScan: ProblemDef<In> = {
  slug: 'cp-graham-scan-convex-hull',
  id: 'CP', title: 'Graham Scan Convex Hull', difficulty: 'Medium', category: 'Computational Geometry', tag: 'convex hull (angular sort)',
  statement: 'Given points in the plane, list the corners of their convex hull in counter-clockwise order, starting at the lowest point (leftmost if tied). Points that lie on a hull edge but are not corners are left out.',
  constraints: '2 ≤ n ≤ 10, 0 ≤ x, y ≤ 12, all points distinct (written x,y)',
  examples: [
    { label: '2,0 6,1 8,5 4,8 0,5 4,4 3,2', input: P('2,0 6,1 8,5 4,8 0,5 4,4 3,2'), output: '[[2,0],[6,1],[8,5],[4,8],[0,5]]' },
    { label: '0,0 2,0 4,0 4,3 2,3 0,3 2,1', input: P('0,0 2,0 4,0 4,3 2,3 0,3 2,1'), output: '[[0,0],[4,0],[4,3],[0,3]]' },
    { label: '1,1 3,0 5,2 4,5 2,4 3,3 3,2 1,3', input: P('1,1 3,0 5,2 4,5 2,4 3,3 3,2 1,3'), output: '[[3,0],[5,2],[4,5],[2,4],[1,3],[1,1]]' },
  ],
  inputPlaceholder: 'e.g. 2,0 6,1 8,5 4,8 0,5 4,4 3,2   (points x,y)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Plane', vizCaption: 'points numbered by angle around the pivot (rank:x,y)',
  legend: [{ label: 'Point being added', state: 'active' }, { label: 'Pivot / last two on stack', state: 'compare' }, { label: 'Popped', state: 'error' }, { label: 'Hull corner', state: 'found' }, { label: 'Inside', state: 'dim' }],
  emphasis: ['convex hull', 'counter-clockwise', 'lowest point'],
  phases: [
    { icon: '📌', label: 'Pick the pivot', tone: 'blue' },
    { icon: '🔢', label: 'Sort by angle', tone: 'blue' },
    { icon: '👁️', label: 'Scan points', tone: 'cyan' },
    { icon: '✂️', label: 'Pop non-left turns / push', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['pivot', 'p', 'stack size', 'cross'],
  approach: {
    title: 'Pivot, angular sort, left-turn stack',
    text: 'Take the lowest point as the pivot and sort the others by the angle they make with it. Walk through them keeping a stack; whenever the new point makes a clockwise or straight turn with the top two stack entries, pop the top. What remains is the hull in counter-clockwise order.',
  },
  java: [
    'public List<int[]> grahamScan(int[][] pts) {',
    '    int[] pivot = lowestLeftmost(pts);                    // bottom-most, then left-most',
    '    Arrays.sort(pts, (a, b) -> {                          // by angle around the pivot',
    '        int c = cross(pivot, a, b);',
    '        if (c != 0) return c > 0 ? -1 : 1;                // a is more counter-clockwise',
    '        return Integer.compare(dist2(pivot, a), dist2(pivot, b)); // same ray: nearer first',
    '    });',
    '    List<int[]> st = new ArrayList<>();',
    '    for (int[] p : pts) {',
    '        while (st.size() >= 2 && cross(st.get(st.size() - 2), st.get(st.size() - 1), p) <= 0)',
    '            st.remove(st.size() - 1);                     // not a left turn: drop the top',
    '        st.add(p);',
    '    }',
    '    return st;                                            // counter-clockwise, starting at the pivot',
    '}',
    '',
    'private int[] lowestLeftmost(int[][] pts) {',
    '    int[] best = pts[0];',
    '    for (int[] p : pts) if (p[1] < best[1] || (p[1] == best[1] && p[0] < best[0])) best = p;',
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
    'def graham_scan(pts):',
    '    pivot = min(pts, key=lambda p: (p[1], p[0]))          # bottom-most, then left-most',
    '    pts.sort(key=cmp_to_key(lambda a, b: -1 if cross(pivot, a, b) > 0 else 1 if cross(pivot, a, b) < 0 else dist2(pivot, a) - dist2(pivot, b)))',
    '    st = []',
    '    for p in pts:',
    '        while len(st) >= 2 and cross(st[-2], st[-1], p) <= 0:',
    '            st.pop()                                      # not a left turn: drop the top',
    '        st.append(p)',
    '    return st                                             # counter-clockwise, starting at the pivot',
    '',
    'def cross(o, a, b):',
    '    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])',
    '',
    'def dist2(a, b):',
    '    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2',
  ],
  algorithm: [
    'Pick the lowest (then leftmost) point as the pivot',
    'Sort the other points by angle around the pivot, nearer first on ties',
    'Scan the sorted points, pushing each onto a stack',
    'Before pushing p, pop the top while the top two entries and p do not turn left',
    'The stack is the convex hull in counter-clockwise order',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The pivot is on the hull, and in angular order the hull corners appear in the same order they occur along the boundary. A stack entry survives only if every later point is to its left, i.e. if the turn it makes is counter-clockwise; a clockwise or straight turn proves the top lies inside the triangle or on an edge. Pushes and pops are bounded by n, so after the sort the scan is linear.',
  naive: 'Checking every triple of points to decide whether one lies inside the triangle of the others takes O(n⁴) overall; testing every pair as a hull edge takes O(n³).',
};
