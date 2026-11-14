import type { Aux, CellState, IntervalBarVM, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { parseIntervals } from './graphKit.ts';

interface In { iv: [number, number][] }

const parse = (raw: string): In => ({ iv: parseIntervals(raw, { allowPoint: true }) });
const fmt = (a: number, b: number) => `[${a}, ${b}]`;

function build({ iv }: In): Step[] {
  const n = iv.length;
  const order = iv.map((_, i) => i).sort((a, b) => iv[a][0] - iv[b][0] || iv[a][1] - iv[b][1] || a - b);
  const axis = { min: Math.min(...iv.map((p) => p[0])), max: Math.max(...iv.map((p) => p[1])) };
  const steps: Step[] = [];
  const state = new Array<CellState | undefined>(n).fill(undefined);
  let merged: [number, number][] = [];
  let cur: [number, number] | null = null;
  let probe = -1; // interval being compared
  let sorted = false;
  let result: string = '—';

  const scene = () => {
    const bars: IntervalBarVM[] = iv.map(([s, e], i) => ({ id: i, start: s, end: e, state: state[i] }));
    const res: IntervalBarVM[] = merged.map(([s, e], i) => ({ id: `m${i}`, start: s, end: e, state: 'found' }));
    if (cur) res.push({ id: 'cur', start: cur[0], end: cur[1], state: 'active' });
    return {
      kind: 'intervals' as const, bars, result: res, resultLabel: 'merged', axis,
      marker: cur ? { at: cur[1], label: `cur.end = ${cur[1]}` } : undefined,
    };
  };
  const aux = (): Aux[] => [
    { title: sorted ? 'sorted by start' : 'input order', kind: 'list', items: (sorted ? order : iv.map((_, i) => i)).map((i) => fmt(iv[i][0], iv[i][1])), highlight: probe >= 0 ? (sorted ? order : iv.map((_, i) => i)).indexOf(probe) : undefined },
    { title: 'merged so far', kind: 'list', items: [...merged, ...(cur ? [cur] : [])].map(([a, b]) => fmt(a, b)) },
  ];
  const vars = () => ({ current: cur ? fmt(cur[0], cur[1]) : '—', next: probe >= 0 ? fmt(iv[probe][0], iv[probe][1]) : '—', merged: merged.length + (cur ? 1 : 0), answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    tag: 'INIT', title: 'Start', desc: `${n} interval${n === 1 ? '' : 's'} on a timeline: ${iv.map(([x, y]) => fmt(x, y)).join(', ')}. Overlapping bars must become one.`,
    note: `intervals.length = ${n}`,
    logic: 'Two intervals overlap when one starts before the other ends. Sorting by start time makes every overlap a neighbour-to-neighbour question.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });
  sorted = true;
  push({
    tag: 'SORT', title: 'Sort by start', desc: `Sort by start time: ${order.map((i) => fmt(iv[i][0], iv[i][1])).join(', ')}. Overlaps now sit next to each other.`,
    note: `sorted by a[0] → ${order.map((i) => iv[i][0]).join(', ')}`,
    logic: 'After sorting, if the next interval does not overlap the current merged one, no later interval can either.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0,
  });

  cur = [...iv[order[0]]];
  state[order[0]] = 'active';
  push({
    tag: 'TAKE FIRST', title: `Take ${fmt(cur[0], cur[1])} as the current interval`, desc: `${fmt(cur[0], cur[1])} starts the first merged block; the marker shows where it ends now (${cur[1]}).`,
    note: `cur = ${fmt(cur[0], cur[1])}`,
    logic: 'cur is the merged interval we are still extending.', logicTone: 'info',
    javaLines: [3], pyLines: [3], algoStep: 1,
  });

  for (let k = 1; k < n; k++) {
    state.forEach((v, j) => { if (v === 'active') state[j] = 'found'; });
    const i = order[k];
    probe = i;
    const [s, e] = iv[i];
    const overlap = s <= cur[1];
    state[i] = 'compare';
    push({
      tag: 'COMPARE', title: `Compare ${fmt(s, e)} with the current interval`, desc: `next = ${fmt(s, e)} starts at ${s}; cur ends at ${cur[1]}. Is ${s} ≤ ${cur[1]}? ${overlap ? 'Yes, they overlap.' : 'No, there is a gap.'}`,
      note: `next[0]=${s} <= cur[1]=${cur[1]} → ${overlap}`,
      logic: 'The only question after sorting: does the next start fall inside the block we are building?', logicTone: 'info',
      javaLines: [6], pyLines: [5], algoStep: 2,
    });
    if (overlap) {
      const newEnd = Math.max(cur[1], e);
      state[i] = 'found';
      const prevEnd = cur[1];
      cur = [cur[0], newEnd];
      push({
        tag: 'MERGE', title: `${fmt(s, e)} starts at ${s} ≤ ${prevEnd}: merge`,
        desc: `Overlap, so extend: cur = ${fmt(cur[0], cur[1])} because the new end is max(${prevEnd}, ${e}) = ${newEnd}.`,
        note: `cur[1] = max(${prevEnd}, ${e}) = ${newEnd}`,
        logic: 'Touching intervals (start equals end) also merge.', logicTone: 'success',
        javaLines: [7], pyLines: [6], algoStep: 3,
      });
    } else {
      merged.push(cur);
      const closed = fmt(cur[0], cur[1]);
      cur = [s, e];
      state[i] = 'active';
      push({
        tag: 'GAP', title: `${fmt(s, e)} starts after the end: new block`, desc: `${s} > ${merged[merged.length - 1][1]}: ${closed} is finished and saved. ${fmt(s, e)} becomes the current interval.`,
        note: `merged.add(${closed}); cur = ${fmt(s, e)}`,
        logic: 'A gap means nothing later can reach back, so the finished interval is final.', logicTone: 'warn',
        javaLines: [9, 10], pyLines: [8, 9], algoStep: 4,
      });
    }
  }

  merged.push(cur);
  state.forEach((v, j) => { if (v === 'active') state[j] = 'found'; });
  cur = null;
  probe = -1;
  result = merged.map(([a, b]) => fmt(a, b)).join(' ');
  push({
    tag: '✅ Done!', title: 'Done', desc: `Save the last block. ${merged.length} merged interval${merged.length === 1 ? '' : 's'}: ${result}.`,
    note: `merged.add(cur) → ${plural(merged.length, 'interval')}`,
    logic: 'Each merged block covers exactly the union of the intervals folded into it.', logicTone: 'success',
    javaLines: [13, 14], pyLines: [10, 11], algoStep: 5,
    result: { title: result, text: 'Merged intervals' },
  });
  return steps;
}

const P = (s: string): In => ({ iv: s.split(' ').map((t) => t.split('-').map(Number) as [number, number]) });

export const mergeIntervals: ProblemDef<In> = {
  slug: '56-merge-intervals',
  id: '56', title: 'Merge Intervals', difficulty: 'Medium', category: 'Intervals', tag: 'sort + merge',
  emphasis: ['merge all overlapping intervals', 'non-overlapping'],
  statement: 'Given a list of intervals [start, end], merge all overlapping intervals and return the non-overlapping intervals that cover exactly the same ranges.',
  constraints: '1 ≤ intervals ≤ 10⁴, 0 ≤ start ≤ end ≤ 10⁴ (animation input: ≤ 8 intervals with ends ≤ 30, written like 1-3 2-6 8-10)',
  examples: [
    { label: '1-3 2-6 8-10 15-18', input: P('1-3 2-6 8-10 15-18'), output: '[1, 6] [8, 10] [15, 18]' },
    { label: '1-4 4-5', input: P('1-4 4-5'), output: '[1, 5]' },
    { label: '8-10 1-3 2-4 6-7 9-12', input: P('8-10 1-3 2-4 6-7 9-12'), output: '[1, 4] [6, 7] [8, 12]' },
  ],
  inputPlaceholder: 'e.g. 1-3 2-6 8-10 15-18   (start-end pairs)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '📅', label: 'Sort by start', tone: 'blue' },
    { icon: '📌', label: 'Take first', tone: 'blue' },
    { icon: '🔍', label: 'Compare', tone: 'cyan' },
    { icon: '🔗', label: 'Overlap: merge', tone: 'green' },
    { icon: '✂️', label: 'Gap: new block', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Current merged interval', state: 'active' }, { label: 'Being compared', state: 'compare' }, { label: 'Folded in / finished', state: 'found' }],
  varLabels: ['current', 'next', 'merged', 'answer'],
  approach: {
    title: 'Sort by start, then sweep and extend',
    text: 'Sort by start time. Keep a current interval. For each next interval: if it starts at or before the current end, extend the current end to the larger of the two ends; otherwise the current interval is finished, so save it and start a new one.',
  },
  java: [
    'public int[][] merge(int[][] intervals) {',
    '    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);',
    '    List<int[]> merged = new ArrayList<>();',
    '    int[] cur = intervals[0];',
    '    for (int i = 1; i < intervals.length; i++) {',
    '        int[] next = intervals[i];',
    '        if (next[0] <= cur[1]) {              // overlap',
    '            cur[1] = Math.max(cur[1], next[1]);',
    '        } else {                              // gap',
    '            merged.add(cur);',
    '            cur = next;',
    '        }',
    '    }',
    '    merged.add(cur);',
    '    return merged.toArray(new int[0][]);',
    '}',
  ],
  python: [
    'def merge(intervals):',
    '    intervals.sort(key=lambda x: x[0])',
    '    merged = []',
    '    cur = intervals[0]',
    '    for nxt in intervals[1:]:',
    '        if nxt[0] <= cur[1]:               # overlap',
    '            cur[1] = max(cur[1], nxt[1])',
    '        else:                              # gap',
    '            merged.append(cur)',
    '            cur = nxt',
    '    merged.append(cur)',
    '    return merged',
  ],
  algorithm: [
    'Sort the intervals by start time',
    'Take the first interval as the current one',
    'Compare the next interval: does next.start ≤ cur.end?',
    'Overlap: extend cur.end to the larger of the two ends',
    'Gap: save cur and let the next interval become current',
    'After the loop, save the last current interval',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'After sorting by start, every interval that overlaps the current block starts no later than the block’s current end, and any interval that starts after it starts after everything seen so far ends (the end only grows). So the first gap permanently closes the block. The sweep touches each interval once; the sort dominates the cost.',
};
