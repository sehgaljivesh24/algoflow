import type { IntervalBarVM, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';

interface In { b: [number, number, number][] }

function parse(raw: string): In {
  const toks = raw.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length || toks.length > 6) throw new Error('Give 1 to 6 buildings written left-right-height, e.g. 2-9-10 3-7-15 5-12-12');
  const b = toks.map((t): [number, number, number] => {
    const m = /^(\d+)-(\d+)-(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a building. Write left-right-height, e.g. 2-9-10`);
    const [l, r, h] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (l >= r || r > 30) throw new Error(`"${t}": the right edge must be larger than the left edge and at most 30`);
    if (h < 1 || h > 20) throw new Error('Heights must be between 1 and 20');
    return [l, r, h];
  });
  return { b };
}

interface Ev { x: number; s: number; id: number } // s < 0: building starts (−height); s > 0: building ends (+height)

function build({ b }: In): Step[] {
  const events: Ev[] = [];
  b.forEach(([l, r, h], i) => { events.push({ x: l, s: -h, id: i }); events.push({ x: r, s: h, id: i }); });
  const sorted = [...events].sort((p, q) => p.x - q.x || p.s - q.s || p.id - q.id);
  const axis = { min: Math.min(...b.map((t) => t[0])), max: Math.max(...b.map((t) => t[1])) };
  const active: number[] = [0]; // sorted multiset of heights
  const live = new Set<number>();
  const finished = new Set<number>();
  const keys: [number, number][] = [];
  let prev = 0;
  let at = -1;
  let phase = 0;
  const steps: Step[] = [];

  const evText = (e: Ev) => `x=${e.x} ${e.s < 0 ? 'start' : 'end'} ${Math.abs(e.s)}`;
  const segments = (): IntervalBarVM[] => {
    const out: IntervalBarVM[] = [];
    for (let i = 0; i + 1 < keys.length; i++) {
      if (keys[i][1] > 0) out.push({ id: `s${i}`, start: keys[i][0], end: keys[i + 1][0], label: `h=${keys[i][1]}`, tone: 'orange' });
    }
    return out;
  };
  const say = recorder(steps, () => ({
    scene: {
      kind: 'intervals' as const, axis,
      bars: b.map(([l, r, h], i): IntervalBarVM => ({ id: i, start: l, end: r, label: `h=${h}`, state: live.has(i) ? 'active' : finished.has(i) ? 'dim' : undefined })),
      result: segments().length ? segments() : undefined,
      resultLabel: 'skyline so far',
      marker: at >= 0 ? { at: sorted[at].x, label: `x = ${sorted[at].x}` } : undefined,
    },
    aux: [
      { title: phase ? 'events sorted (start = −h, end = +h)' : 'events', kind: 'list' as const, items: (phase ? sorted : events).map(evText), highlight: phase && at >= 0 ? at : undefined },
      { title: 'active heights (multiset, tallest first)', kind: 'list' as const, items: [...active].reverse().map(String), highlight: 0 },
      { title: 'key points', kind: 'list' as const, items: keys.map(([x, h]) => `[${x},${h}]`) },
    ],
    vars: { x: at >= 0 ? sorted[at].x : '—', 'tallest now': active[active.length - 1], 'previous height': prev, 'key points': keys.length },
  }));

  say({
    tag: 'INIT', title: 'Start', desc: `${b.length} building${b.length === 1 ? '' : 's'}, each a rectangle (left, right, height). The skyline is the outline of their union, written as key points where the height changes.`,
    note: `buildings.length = ${b.length}`,
    logic: 'The outline can only change where a building starts or ends, so sweep over those x positions.', java: [0], py: [0], algo: 0,
  });
  phase = 1;
  say({
    tag: 'EVENTS', title: 'Create and sort the events', desc: `Starts are stored as −height, ends as +height. Sorted: ${sorted.map((e) => `${e.x}${e.s < 0 ? '↑' : '↓'}${Math.abs(e.s)}`).join('  ')}.`,
    note: `${events.length} events sorted by x, then signed height`,
    logic: 'At one x, starts come first (tallest first) and ends after (shortest first), so a touching pair of buildings never makes a false dip.', java: [6], py: [5], algo: 1,
  });

  sorted.forEach((e, i) => {
    at = i;
    const h = Math.abs(e.s);
    if (e.s < 0) {
      active.push(h);
      active.sort((p, q) => p - q);
      live.add(e.id);
    } else {
      active.splice(active.indexOf(h), 1);
      live.delete(e.id);
      finished.add(e.id);
    }
    const top = active[active.length - 1];
    const changed = top !== prev;
    if (changed) keys.push([e.x, top]);
    const was = prev;
    if (changed) prev = top;
    say({
      tag: changed ? 'KEY POINT' : e.s < 0 ? 'HIDDEN' : 'STILL COVERED',
      title: `x = ${e.x}: building ${e.s < 0 ? 'starts' : 'ends'} (h=${h})`,
      desc: changed ? `x=${e.x}: ${e.s < 0 ? 'add' : 'remove'} ${h} ${e.s < 0 ? 'to' : 'from'} the active heights. The tallest changes ${was} → ${top}, so [${e.x}, ${top}] is a key point.` : `x=${e.x}: ${e.s < 0 ? 'add' : 'remove'} ${h} ${e.s < 0 ? 'to' : 'from'} the active heights. The tallest stays ${top}, so the outline does not change and nothing is recorded.`,
      note: changed ? `top = ${top} ≠ prev = ${was} → out.add([${e.x},${top}])` : `top = ${top} = prev → no key point`,
      ...(changed ? {} : { alert: e.s < 0 ? `Height ${h} is hidden behind the taller ${top}: no new key point.` : `Building ${h} ends but a taller one (${top}) still covers x = ${e.x}: skipped.` }),
      logic: 'Only a change of the tallest active building alters the outline; hidden or duplicate heights are ignored.', tone: changed ? 'success' : 'info',
      java: changed ? [15] : e.s < 0 ? [12, 14] : [13, 14], py: changed ? [13, 14, 15, 16] : e.s < 0 ? [9, 10, 13] : [11, 12, 13], algo: changed ? 3 : 2,
    });
  });

  at = -1;
  const out = `[${keys.map(([x, h]) => `[${x},${h}]`).join(',')}]`;
  say({
    tag: '✅ Done!', title: 'Done', desc: `The skyline has ${keys.length} key point${keys.length === 1 ? '' : 's'}: ${out}. The last one always drops to height 0.`,
    note: `return out → ${keys.length} key points`,
    logic: 'Each event costs one multiset update, so the sweep is O(n log n).', tone: 'success', java: [17], py: [17], algo: 4,
    result: { title: out, text: 'Skyline key points [x, height]' },
  });
  return steps;
}

const B = (s: string): In => ({ b: s.split(' ').map((t) => t.split('-').map(Number) as [number, number, number]) });

export const theSkylineProblem: ProblemDef<In> = {
  slug: '218-the-skyline-problem',
  id: '218', title: 'The Skyline Problem', difficulty: 'Hard', category: 'Intervals', tag: 'line sweep + multiset',
  emphasis: ['skyline', 'key points'],
  statement: 'Each building is given as [left, right, height], standing on flat ground. Return the skyline: the outline of all buildings as a list of key points [x, height], each the left end of a horizontal segment, sorted by x, ending with a point at height 0.',
  constraints: '1 ≤ buildings ≤ 10⁴, 0 ≤ left < right ≤ 2³¹ − 1, 1 ≤ height ≤ 2³¹ − 1 (animation input: ≤ 6 buildings, x ≤ 30, height ≤ 20; write left-right-height)',
  examples: [
    { label: '2-9-10 3-7-15 5-12-12 15-20-10 19-24-8', input: B('2-9-10 3-7-15 5-12-12 15-20-10 19-24-8'), output: '[[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]' },
    { label: '0-2-3 2-5-3', input: B('0-2-3 2-5-3'), output: '[[0,3],[5,0]]' },
    { label: '1-10-4 2-6-8 3-5-6', input: B('1-10-4 2-6-8 3-5-6'), output: '[[1,4],[2,8],[6,4],[10,0]]' },
  ],
  inputPlaceholder: 'e.g. 2-9-10 3-7-15 5-12-12   (left-right-height)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '🏙️', label: 'Init', tone: 'blue' },
    { icon: '📅', label: 'Events + sort', tone: 'blue' },
    { icon: '🧹', label: 'Sweep: update heights', tone: 'cyan' },
    { icon: '📍', label: 'Record key point', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Building under the sweep line', state: 'active' }, { label: 'Building already passed', state: 'dim' }],
  varLabels: ['x', 'tallest now', 'previous height', 'key points'],
  approach: {
    title: 'Sweep the x axis and track the tallest active building',
    text: 'Turn each building into a start event (stored as −height) and an end event (+height) and sort them by x. Keep a multiset of the heights of the buildings currently under the sweep line, starting with a ground level of 0. After each event, look at the tallest height; if it differs from the previous tallest, record the key point [x, tallest].',
  },
  java: [
    'public List<List<Integer>> getSkyline(int[][] buildings) {',
    '    List<int[]> events = new ArrayList<>();                  // {x, signed height}',
    '    for (int[] b : buildings) {',
    '        events.add(new int[]{b[0], -b[2]});                  // start: negative height',
    '        events.add(new int[]{b[1], b[2]});                   // end: positive height',
    '    }',
    '    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);',
    '    TreeMap<Integer, Integer> active = new TreeMap<>();      // height -> how many buildings',
    '    active.put(0, 1);',
    '    int prev = 0;',
    '    List<List<Integer>> out = new ArrayList<>();',
    '    for (int[] e : events) {',
    '        if (e[1] < 0) active.merge(-e[1], 1, Integer::sum);',
    '        else if (active.merge(e[1], -1, Integer::sum) == 0) active.remove(e[1]);',
    '        int top = active.lastKey();',
    '        if (top != prev) { out.add(List.of(e[0], top)); prev = top; }',
    '    }',
    '    return out;',
    '}',
  ],
  python: [
    'def get_skyline(buildings):',
    '    events = []                                   # (x, signed height)',
    '    for left, right, h in buildings:',
    '        events.append((left, -h))                 # start: negative height',
    '        events.append((right, h))                 # end: positive height',
    '    events.sort()',
    '    active = [0]                                  # sorted multiset of heights',
    '    prev, out = 0, []',
    '    for x, h in events:',
    '        if h < 0:',
    '            bisect.insort(active, -h)',
    '        else:',
    '            active.remove(h)',
    '        top = active[-1]',
    '        if top != prev:',
    '            out.append([x, top])',
    '            prev = top',
    '    return out',
  ],
  algorithm: [
    'Read the buildings as rectangles on the ground',
    'Create start (−h) and end (+h) events and sort them by x',
    'Sweep: add the height on a start, remove it on an end; nothing changes if the tallest stays',
    'When the tallest active height changes, record the key point [x, tallest]',
    'Return the key points',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Between two consecutive event positions the set of buildings covering the x axis does not change, so the outline is flat there. The outline height at any x is the tallest building covering it, i.e. the maximum of the multiset, and it can only change at an event. Sorting starts before ends at the same x (tallest start first, shortest end first) prevents spurious dips when buildings touch, and a key point is emitted only when the maximum actually changes.',
};
