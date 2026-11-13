import type { CellState, ProblemDef, Step, Tone } from '../../engine/types.ts';
import { cross, fmtPt, fmtPts, parsePoints, planeScene, sortPts } from './kitF.ts';
import type { Pt } from './kitF.ts';

interface In { pts: Pt[] }

const parse = (raw: string): In => ({ pts: parsePoints(raw, { min: 2, max: 10, example: '1,1 2,2 2,0 2,4 3,3 4,2' }) });

function build({ pts }: In): Step[] {
  const order = pts.map((_, i) => i).sort((a, b) => pts[a][0] - pts[b][0] || pts[a][1] - pts[b][1]);
  const hull: number[] = [];
  const steps: Step[] = [];
  let pass = '—';
  let cur: number | null = null;
  let last: string | number = '—';
  let tone: Tone = 'blue';
  let final = false;

  const onHull = () => new Set(hull);
  const push = (s: { title: string; desc: string; logic: string; tone?: Step['logicTone']; java: number[]; py: number[]; algo: number; focus?: Record<number, CellState>; segs?: { from: number; to: number; state?: 'active' | 'visited' | 'error' | 'chosen' | 'dim'; label?: string }[]; result?: Step['result']; tag: string; note?: string; alert?: string }) => {
    const states: Record<number, CellState> = {};
    const tones: Record<number, Tone> = {};
    const hs = onHull();
    pts.forEach((_, i) => {
      if (final) states[i] = hs.has(i) ? 'found' : 'dim';
      else if (hs.has(i)) tones[i] = tone;
    });
    Object.assign(states, s.focus ?? {});
    for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
    const sw = cur !== null ? { at: pts[cur][0], label: `x=${pts[cur][0]}` } : undefined;
    steps.push({
      title: s.title, desc: s.desc, logic: s.logic, logicTone: s.tone ?? 'info', javaLines: s.java, pyLines: s.py, algoStep: s.algo,
      scene: planeScene(pts, {
        states, tones, sweep: final ? undefined : sw,
        polygon: hull.length >= 2 ? { ids: [...hull], closed: final, state: final ? 'found' : tone === 'blue' ? 'active' : 'swap' } : undefined,
        segments: s.segs,
        pointers: cur !== null && !final ? [{ id: 'p', label: 'p', index: cur, tone: 'orange' }] : [],
      }),
      vars: { pass, p: cur === null ? '—' : fmtPt(pts[cur]), 'hull size': hull.length, cross: last },
      tag: s.tag, ...(s.note ? { note: s.note } : {}), ...(s.alert ? { alert: s.alert } : {}),
      ...(s.result ? { result: s.result } : {}),
    });
  };

  push({
    title: 'Start', desc: `${pts.length} trees. Sort them left to right (ties by height); the sweep line will visit them in that order.`,
    logic: 'Sorting by x makes the lowest and the highest boundary two separate chains that can each be built in one sweep.', java: [1], py: [1], algo: 0,
    tag: 'SORT —', note: `order by x: ${order.map((i) => fmtPt(pts[i])).join(' ')}`,
  });

  for (let ps = 0; ps < 2; ps++) {
    pass = ps === 0 ? 'lower' : 'upper';
    tone = ps === 0 ? 'blue' : 'purple';
    const seq = ps === 0 ? order : [...order].reverse();
    const start = hull.length;
    cur = null;
    push({
      title: ps === 0 ? 'Pass 1: the lower chain' : 'Pass 2: the upper chain',
      desc: ps === 0 ? 'Sweep left to right, keeping only points that turn left (counter-clockwise).' : 'Sweep right to left; the same rule now builds the top of the fence.',
      logic: 'Both passes use the identical rule: never keep a point that makes a right turn.', java: [3, 4], py: [3, 4], algo: 1,
      tag: ps === 0 ? 'LOWER CHAIN —' : 'UPPER CHAIN —', note: `pass ${ps + 1}: ${ps === 0 ? `left to right from ${fmtPt(pts[order[0]])}` : `right to left from ${fmtPt(pts[order[order.length - 1]])}`}`,
    });
    for (const id of seq) {
      cur = id;
      push({ title: `Visit ${fmtPt(pts[id])}`, desc: `The sweep line reaches ${fmtPt(pts[id])}. Test it against the last two chain points.`, logic: 'The new point is always added; the test decides which older points it makes useless.', java: [6], py: [6], algo: 2, focus: { [id]: 'active' }, tag: 'VISIT —', note: `p = ${fmtPt(pts[id])}, chain has ${hull.length - start} point${hull.length - start === 1 ? '' : 's'}${hull.length - start < 2 ? ', too few to test' : ''}` });
      while (hull.length - start >= 2) {
        const a = hull[hull.length - 2];
        const b = hull[hull.length - 1];
        const c = cross(pts[a], pts[b], pts[id]);
        last = c;
        const right = c < 0;
        push({
          title: right ? `cross = ${c}: right turn, pop ${fmtPt(pts[b])}` : c === 0 ? `cross = 0: straight, keep ${fmtPt(pts[b])}` : `cross = ${c}: left turn, keep ${fmtPt(pts[b])}`,
          desc: right ? `${fmtPt(pts[a])} to ${fmtPt(pts[b])} to ${fmtPt(pts[id])} bends right, so ${fmtPt(pts[b])} lies inside the fence and is removed.` : c === 0 ? `The three points are collinear. The fence must include boundary points, so the middle one stays.` : `The turn is counter-clockwise, so ${fmtPt(pts[b])} is still a boundary candidate.`,
          logic: right ? 'A right turn means the chain bulges inward there: that point cannot be on the outer fence.' : 'Zero or positive cross product: the point stays (this problem keeps collinear boundary points).',
          tone: right ? 'warn' : 'info', java: [7, 8], py: [7, 8], algo: 3,
          tag: right ? 'POP:' : c === 0 ? 'KEEP (straight):' : 'KEEP (left):',
          note: `cross = (${pts[b][0] - pts[a][0]})(${pts[id][1] - pts[a][1]}) − (${pts[b][1] - pts[a][1]})(${pts[id][0] - pts[a][0]}) = ${c}${right ? ' < 0 → pop' : c === 0 ? ' = 0 → keep' : ' > 0 → keep'}`,
          alert: right ? `Right turn at ${fmtPt(pts[b])}: it lies inside the fence, so it is popped.` : undefined,
          focus: { [id]: 'active', [b]: right ? 'error' : 'compare', [a]: 'compare' },
          segs: [{ from: a, to: b, state: 'visited' }, { from: b, to: id, state: right ? 'error' : 'chosen', label: right ? 'right' : c === 0 ? 'straight' : 'left' }],
        });
        if (!right) break;
        hull.pop();
      }
      hull.push(id);
      push({ title: `Add ${fmtPt(pts[id])}`, desc: `${fmtPt(pts[id])} joins the ${pass} chain (${hull.length - start} points in this pass).`, logic: 'Every chain point has survived all right-turn tests so far.', tone: 'info', java: [9], py: [9], algo: 3, focus: { [id]: 'active' }, tag: 'PUSH —', note: `hull.add${fmtPt(pts[id])} → size ${hull.length}` });
    }
    cur = null;
    const dropped = hull.pop()!;
    push({
      title: `End of pass ${ps + 1}`, desc: `Drop the last point ${fmtPt(pts[dropped])}; it is the first point of the next chain (or of the first chain).`,
      logic: 'The chains meet at the leftmost and rightmost points, so each chain gives away its last point to avoid listing it twice.', java: [11], py: [10], algo: 1,
      tag: 'CHAIN END —', note: `remove ${fmtPt(pts[dropped])} → hull size ${hull.length}`,
    });
  }

  const seen = new Set<number>();
  const uniq = hull.filter((i) => (seen.has(i) ? false : (seen.add(i), true)));
  hull.length = 0;
  hull.push(...uniq);
  final = true;
  const out = sortPts(uniq.map((i) => pts[i]));
  push({
    title: 'Done', desc: `The fence touches ${out.length} trees: ${fmtPts(out)}.`,
    logic: 'Collinear boundary points can show up in both chains, so the final list is de-duplicated.', tone: 'success', java: [13], py: [11], algo: 4,
    tag: '✅ Done!', note: `${hull.length} distinct fence trees after removing duplicates`,
    result: { title: fmtPts(out), text: 'Trees on the fence (sorted)' },
  });
  return steps;
}

const P = (s: string): In => ({ pts: s.split(' ').map((t) => t.split(',').map(Number) as Pt) });

export const erectTheFence: ProblemDef<In> = {
  slug: '587-erect-the-fence',
  id: '587', title: 'Erect the Fence', difficulty: 'Hard', category: 'Computational Geometry', tag: 'convex hull (monotone chain)',
  statement: 'Trees are planted at integer points of a garden. Fence them in with the shortest rope: return every tree that lies on the fence, including trees that sit on a straight stretch of it (the boundary of the convex hull).',
  constraints: '1 ≤ trees ≤ 3000, 0 ≤ x, y ≤ 100, all points distinct (animation: 2 to 10 points, coordinates 0 to 12, written x,y)',
  examples: [
    { label: '1,1 2,2 2,0 2,4 3,3 4,2', input: P('1,1 2,2 2,0 2,4 3,3 4,2'), output: '[[1,1],[2,0],[2,4],[3,3],[4,2]]' },
    { label: '1,2 2,2 4,2', input: P('1,2 2,2 4,2'), output: '[[1,2],[2,2],[4,2]]' },
    { label: '0,0 4,0 4,4 0,4 2,0 2,2 4,2 1,3', input: P('0,0 4,0 4,4 0,4 2,0 2,2 4,2 1,3'), output: '[[0,0],[0,4],[2,0],[4,0],[4,2],[4,4]]' },
  ],
  inputPlaceholder: 'e.g. 1,1 2,2 2,0 2,4 3,3 4,2   (points x,y)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Garden', vizCaption: 'points (x,y) — the outline is the fence being built',
  legend: [{ label: 'Point being visited', state: 'active' }, { label: 'Last two chain points', state: 'compare' }, { label: 'Right turn: removed', state: 'error' }, { label: 'On the fence', state: 'found' }, { label: 'Inside', state: 'dim' }],
  emphasis: ['shortest rope', 'every tree that lies on the fence', 'convex hull'],
  phases: [
    { icon: '🔢', label: 'Sort by x', tone: 'blue' },
    { icon: '➡️', label: 'Sweep a chain', tone: 'cyan' },
    { icon: '👁️', label: 'Visit point p', tone: 'cyan' },
    { icon: '✂️', label: 'Pop right turns / push', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['pass', 'p', 'hull size', 'cross'],
  approach: {
    title: 'Andrew’s monotone chain: sort, then two sweeps',
    text: 'Sort the points by x. Sweep left to right keeping a chain in which every three consecutive points turn left; a right turn means the middle point is inside, so pop it. That gives the lower fence. Sweep right to left for the upper fence. Keep points that are exactly straight, because the fence must include them, and remove duplicates at the end.',
  },
  java: [
    'public int[][] outerTrees(int[][] trees) {',
    '    Arrays.sort(trees, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);',
    '    List<int[]> hull = new ArrayList<>();',
    '    for (int pass = 0; pass < 2; pass++) {          // 0: lower chain, 1: upper chain',
    '        int start = hull.size();',
    '        for (int i = 0; i < trees.length; i++) {',
    '            int[] p = trees[pass == 0 ? i : trees.length - 1 - i];',
    '            while (hull.size() - start >= 2 && cross(hull.get(hull.size() - 2), hull.get(hull.size() - 1), p) < 0)',
    '                hull.remove(hull.size() - 1);       // right turn: last point is inside',
    '            hull.add(p);',
    '        }',
    '        hull.remove(hull.size() - 1);                // chain end starts the next chain',
    '    }',
    '    return hull.stream().distinct().toArray(int[][]::new);   // straight points can appear twice',
    '}',
    '',
    'private int cross(int[] o, int[] a, int[] b) {',
    '    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);',
    '}',
  ],
  python: [
    'def outer_trees(trees):',
    '    trees.sort()',
    '    hull = []',
    '    for pass_no in range(2):                     # 0: lower chain, 1: upper chain',
    '        start = len(hull)',
    '        seq = trees if pass_no == 0 else trees[::-1]',
    '        for p in seq:',
    '            while len(hull) - start >= 2 and cross(hull[-2], hull[-1], p) < 0:',
    '                hull.pop()                       # right turn: last point is inside',
    '            hull.append(p)',
    '        hull.pop()                               # chain end starts the next chain',
    '    return [list(t) for t in {tuple(t) for t in hull}]',
    '',
    'def cross(o, a, b):',
    '    return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])',
  ],
  algorithm: [
    'Sort the trees by x, then by y',
    'Sweep left to right for the lower chain, then right to left for the upper chain',
    'For each new point p, look at the last two chain points a and b',
    'If a, b, p turn right (cross < 0) pop b; otherwise keep it and push p',
    'Merge the chains and remove duplicate points',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'A point strictly inside the hull always has a right turn at it when the points around it are visited in sorted order, so the pop rule removes exactly the points that are not on the lower (or upper) boundary. Each point is pushed once and popped at most once per pass, so the sweeps are linear after the sort. Using "< 0" instead of "<= 0" keeps straight points, which this problem wants on the fence.',
  naive: 'Testing every pair of trees as a possible fence edge and checking that all other trees lie on one side costs O(n³), which is far too slow for 3000 trees.',
};
