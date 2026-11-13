import type { Aux, CellState, IntervalBarVM, ProblemDef, Step } from '../engine/types';
import { parseIntervals } from './graphKit.ts';

interface In { iv: [number, number][] }

const parse = (raw: string): In => ({ iv: parseIntervals(raw, { max: 8, example: '10-16 2-8 1-6 7-12' }) });
const fmt = (a: number, b: number) => `[${a}, ${b}]`;

function build({ iv }: In): Step[] {
  const n = iv.length;
  const order = iv.map((_, i) => i).sort((a, b) => iv[a][1] - iv[b][1] || a - b);
  const axis = { min: Math.min(...iv.map((p) => p[0])), max: Math.max(...iv.map((p) => p[1])) };
  const steps: Step[] = [];
  const state = new Array<CellState | undefined>(n).fill(undefined);
  const arrows: number[] = [];
  let pos: number | null = null;
  let cur = -1;
  let sorted = false;
  let result = '—';

  const scene = () => ({
    kind: 'intervals' as const, axis,
    bars: iv.map(([s, e], i): IntervalBarVM => ({ id: i, start: s, end: e, state: i === cur ? 'active' : state[i] })),
    result: arrows.map((x, k): IntervalBarVM => ({ id: `a${k}`, start: x, end: x, tone: 'orange', label: '' })),
    resultLabel: 'arrows',
    marker: pos === null ? undefined : { at: pos, label: `arrow at ${pos}` },
  });
  const aux = (): Aux[] => [
    { title: sorted ? 'balloons sorted by END' : 'balloons (input order)', kind: 'list', items: (sorted ? order : iv.map((_, i) => i)).map((i) => fmt(iv[i][0], iv[i][1])), highlight: cur >= 0 && sorted ? order.indexOf(cur) : undefined },
    { title: 'arrows shot (x position)', kind: 'list', items: arrows.map(String) },
  ];
  const vars = () => ({ balloon: cur >= 0 ? fmt(iv[cur][0], iv[cur][1]) : '—', 'arrow x': pos ?? '—', arrows: arrows.length, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} balloon${n === 1 ? '' : 's'}, each covering a horizontal range. An arrow shot straight up at x pops every balloon whose range contains x.`,
    logic: 'We want the fewest vertical lines so that every range is crossed by at least one line.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });
  sorted = true;
  push({
    title: 'Sort by right end', desc: `Order: ${order.map((i) => fmt(iv[i][0], iv[i][1])).join(', ')}.`,
    logic: 'Shooting at the right end of the earliest-ending balloon pops it and reaches as far right as possible.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 1,
  });

  order.forEach((i, k) => {
    cur = i;
    const [s, e] = iv[i];
    if (k === 0) {
      pos = e;
      arrows.push(e);
      state[i] = 'found';
      push({
        title: `Shoot the first arrow at x = ${e}`, desc: `The first balloon ${fmt(s, e)} ends earliest; an arrow at its right end (${e}) pops it.`,
        logic: 'Any arrow must hit this balloon, and the rightmost spot inside it is the best place to catch others.', logicTone: 'success',
        javaLines: [2, 3], pyLines: [2], algoStep: 2,
      });
    } else if (s <= (pos as number)) {
      state[i] = 'found';
      push({
        title: `${fmt(s, e)} contains x = ${pos}: popped`, desc: `${s} ≤ ${pos} (and the balloon extends to ${e} ≥ ${pos}), so the current arrow already pops it.`,
        logic: 'Balloons are sorted by end, so every later balloon ends at or after the arrow; starting at or before it means it is crossed.', logicTone: 'info',
        javaLines: [4, 5], pyLines: [3, 4], algoStep: 3,
      });
    } else {
      pos = e;
      arrows.push(e);
      state[i] = 'found';
      push({
        title: `${fmt(s, e)} starts after x: new arrow at ${e}`, desc: `${s} > ${arrows[arrows.length - 2]}, so the last arrow misses it. Shoot a new arrow at its right end ${e}.`,
        logic: 'A balloon the current arrow cannot reach forces one more arrow.', logicTone: 'warn',
        javaLines: [5, 6, 7], pyLines: [4, 5, 6], algoStep: 2,
      });
    }
  });
  cur = -1;
  result = String(arrows.length);
  push({
    title: 'Done', desc: `${arrows.length} arrow${arrows.length === 1 ? '' : 's'} pop all ${n} balloons.`,
    logic: 'Each arrow is placed as late as possible, so no arrow could have covered more.', logicTone: 'success',
    javaLines: [10], pyLines: [7], algoStep: 3,
    result: { title: result, text: 'Minimum arrows' },
  });
  return steps;
}

const P = (s: string): In => ({ iv: s.split(' ').map((t) => t.split('-').map(Number) as [number, number]) });

export const minimumArrows: ProblemDef<In> = {
  slug: '452-minimum-arrows-to-burst-balloons',
  id: '452', title: 'Minimum Arrows to Burst Balloons', difficulty: 'Medium', category: 'Intervals', tag: 'greedy sort',
  statement: 'Each balloon is a horizontal range [xstart, xend]. An arrow shot vertically at position x bursts every balloon whose range contains x (ends included). Return the minimum number of arrows needed to burst all balloons.',
  constraints: '1 ≤ balloons ≤ 10⁵ (animation input: ≤ 8 balloons with positions ≤ 30, written like 10-16 2-8 1-6 7-12)',
  examples: [
    { label: '10-16 2-8 1-6 7-12', input: P('10-16 2-8 1-6 7-12'), output: '2' },
    { label: '1-2 3-4 5-6 7-8', input: P('1-2 3-4 5-6 7-8'), output: '4' },
    { label: '1-2 2-3 3-4 4-5', input: P('1-2 2-3 3-4 4-5'), output: '2' },
  ],
  inputPlaceholder: 'e.g. 10-16 2-8 1-6 7-12   (start-end pairs)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Balloon being checked', state: 'active' }, { label: 'Popped', state: 'found' }],
  varLabels: ['balloon', 'arrow x', 'arrows', 'answer'],
  approach: {
    title: 'Greedy: shoot at the earliest right end',
    text: 'Sort balloons by right end. Shoot the first arrow at the right end of the first balloon. Every following balloon that starts at or before that x is popped by the same arrow. When one starts after x, shoot a new arrow at its right end.',
  },
  java: [
    'public int findMinArrowShots(int[][] points) {',
    '    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));',
    '    int arrows = 1;',
    '    int pos = points[0][1];',
    '    for (int[] b : points) {',
    '        if (b[0] > pos) {              // missed by the current arrow',
    '            arrows++;',
    '            pos = b[1];',
    '        }',
    '    }',
    '    return arrows;',
    '}',
  ],
  python: [
    'def find_min_arrow_shots(points):',
    '    points.sort(key=lambda x: x[1])',
    '    arrows, pos = 1, points[0][1]',
    '    for s, e in points:',
    '        if s > pos:                    # missed by the current arrow',
    '            arrows += 1',
    '            pos = e',
    '    return arrows',
  ],
  algorithm: [
    'Read the balloons',
    'Sort by right end',
    'Shoot an arrow at the right end of the first balloon',
    'A balloon starting ≤ x is popped; one starting after x needs a new arrow at its right end',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(1) extra' }],
  why: 'The balloon with the smallest right end must be hit by some arrow, and moving that arrow right up to this end can only add balloons it pops (all other balloons end no earlier). So an optimal solution can shoot there first. Everything it pops is discarded, and the remaining balloons form the same problem, which the sorted sweep solves one arrow at a time.',
};
