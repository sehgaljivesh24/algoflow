import type { Aux, IntervalBarVM, ProblemDef, Step } from '../engine/types';
import { parseIntervals } from './graphKit.ts';

interface In { iv: [number, number][]; add: [number, number] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Write the sorted intervals, a "|", then the new interval, e.g. 1-3 6-9 | 2-5');
  const iv = parts[0].trim() ? parseIntervals(parts[0], { max: 7 }) : [];
  const add = parseIntervals(parts[1], { max: 1, example: '2-5', allowPoint: true })[0];
  for (let i = 1; i < iv.length; i++) {
    if (iv[i][0] <= iv[i - 1][1]) throw new Error('The existing intervals must be sorted and must not overlap each other (each start must be greater than the previous end)');
  }
  return { iv, add };
}

const fmt = (a: number, b: number) => `[${a}, ${b}]`;

function build({ iv, add }: In): Step[] {
  const n = iv.length;
  const axis = { min: Math.min(add[0], ...iv.map((p) => p[0])), max: Math.max(add[1], ...iv.map((p) => p[1])) };
  const steps: Step[] = [];
  const res: [number, number][] = [];
  const st: ('found' | 'active' | 'dim' | undefined)[] = new Array(n).fill(undefined);
  const nw: [number, number] = [add[0], add[1]];
  let placed = false;
  let result = '—';
  let i = 0;

  const scene = () => {
    const bars: IntervalBarVM[] = iv.map(([s, e], k) => ({ id: k, start: s, end: e, state: st[k] }));
    bars.push({ id: 'new', start: nw[0], end: nw[1], tone: 'orange', label: `new ${nw[0]}–${nw[1]}` });
    const out: IntervalBarVM[] = res.map(([s, e], k) => ({ id: `r${k}`, start: s, end: e, state: 'found' }));
    return { kind: 'intervals' as const, bars, result: out, resultLabel: 'result', axis, marker: placed ? undefined : { at: nw[1], label: `new.end = ${nw[1]}` } };
  };
  const aux = (): Aux[] => [{ title: 'result so far', kind: 'list', items: res.map(([a, b]) => fmt(a, b)) }];
  const vars = () => ({ i, new: fmt(nw[0], nw[1]), 'result size': res.length, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    tag: 'INIT', title: 'Start', desc: `${n} sorted interval${n === 1 ? '' : 's'} and a new one ${fmt(add[0], add[1])} (orange) to insert. They split into: before it, overlapping it, after it.`,
    note: `res = [], i = 0, new = ${fmt(add[0], add[1])}`,
    logic: 'Because the list is already sorted, the intervals split into three groups: entirely before the new one, overlapping it, entirely after it.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1], algoStep: 0,
  });

  while (i < n && iv[i][1] < nw[0]) {
    st[i] = 'found';
    res.push(iv[i]);
    push({
      tag: 'COPY LEFT', title: `${fmt(iv[i][0], iv[i][1])} ends before ${nw[0]}: keep as is`, desc: `${fmt(iv[i][0], iv[i][1])}: ${iv[i][1]} < ${nw[0]}, so it lies completely left of the new interval. Copy it to the result.`,
      note: `${iv[i][1]} < ${nw[0]} → res.add(${fmt(iv[i][0], iv[i][1])}); i = ${i + 1}`,
      logic: 'No overlap and nothing later on the left can overlap either, so copy it straight to the result.', logicTone: 'info',
      javaLines: [3, 4], pyLines: [2, 3], algoStep: 1,
    });
    i++;
  }
  while (i < n && iv[i][0] <= nw[1]) {
    const oldStart = nw[0];
    const oldEnd = nw[1];
    nw[0] = Math.min(nw[0], iv[i][0]);
    nw[1] = Math.max(nw[1], iv[i][1]);
    st[i] = 'dim';
    push({
      tag: 'ABSORB', title: `${fmt(iv[i][0], iv[i][1])} overlaps: absorb it`, desc: `${fmt(iv[i][0], iv[i][1])} starts at ${iv[i][0]} ≤ ${oldEnd}, so it overlaps. The new interval grows to ${fmt(nw[0], nw[1])}.`,
      note: `new = [min(${oldStart},${iv[i][0]}), max(${oldEnd},${iv[i][1]})] = ${fmt(nw[0], nw[1])}`,
      logic: 'Overlapping intervals are folded into the new one: start = min of starts, end = max of ends.', logicTone: 'success',
      javaLines: [6, 7], pyLines: [5, 6], algoStep: 2,
    });
    i++;
  }
  res.push([nw[0], nw[1]]);
  placed = true;
  push({
    tag: 'PLACE', title: `Place the merged interval ${fmt(nw[0], nw[1])}`, desc: `${i < n ? `The next interval starts at ${iv[i][0]}, past ${nw[1]}` : 'No intervals are left'}, so the grown interval ${fmt(nw[0], nw[1])} goes into the result now.`,
    note: `res.add(${fmt(nw[0], nw[1])}) → size ${res.length}`,
    logic: 'Everything to its left is already copied; everything to its right comes next, in order.', logicTone: 'success',
    javaLines: [10], pyLines: [8], algoStep: 3,
  });
  while (i < n) {
    st[i] = 'found';
    res.push(iv[i]);
    push({
      tag: 'COPY RIGHT', title: `${fmt(iv[i][0], iv[i][1])} is to the right: copy`, desc: `${fmt(iv[i][0], iv[i][1])} starts after ${nw[1]}, so it is untouched. Copy it as it is.`,
      note: `res.add(${fmt(iv[i][0], iv[i][1])}); i = ${i + 1}`,
      logic: 'The rest of the list is already sorted and disjoint from the new interval.', logicTone: 'info',
      javaLines: [12], pyLines: [9], algoStep: 4,
    });
    i++;
  }
  result = res.map(([a, b]) => fmt(a, b)).join(' ');
  push({
    tag: '✅ Done!', title: 'Done', desc: `One pass, no sorting. Result: ${result}.`,
    note: `return res → ${res.length} intervals`,
    logic: 'One pass, no sorting needed: O(n).', logicTone: 'success',
    javaLines: [13], pyLines: [10], algoStep: 5,
    result: { title: result, text: 'Intervals after insertion' },
  });
  return steps;
}

const P = (s: string, a: string): In => ({ iv: s ? s.split(' ').map((t) => t.split('-').map(Number) as [number, number]) : [], add: a.split('-').map(Number) as [number, number] });

export const insertInterval: ProblemDef<In> = {
  slug: '57-insert-interval',
  id: '57', title: 'Insert Interval', difficulty: 'Medium', category: 'Intervals', tag: 'merge insert',
  emphasis: ['sorted list of non-overlapping intervals', 'merging', 'non-overlapping list'],
  statement: 'You get a sorted list of non-overlapping intervals and one new interval. Insert the new interval, merging anything it overlaps, and return the resulting sorted, non-overlapping list.',
  constraints: '0 ≤ intervals ≤ 10⁴ (animation input: ≤ 7 intervals with ends ≤ 30; write "existing | new", like 1-3 6-9 | 2-5)',
  examples: [
    { label: '1-3 6-9 | 2-5', input: P('1-3 6-9', '2-5'), output: '[1, 5] [6, 9]' },
    { label: '1-2 3-5 6-7 8-10 12-16 | 4-8', input: P('1-2 3-5 6-7 8-10 12-16', '4-8'), output: '[1, 2] [3, 10] [12, 16]' },
    { label: '1-2 8-9 | 4-5', input: P('1-2 8-9', '4-5'), output: '[1, 2] [4, 5] [8, 9]' },
  ],
  inputPlaceholder: 'e.g. 1-3 6-9 | 2-5   (sorted intervals, then the new one)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '⬅️', label: 'Copy left', tone: 'cyan' },
    { icon: '🔗', label: 'Absorb overlaps', tone: 'green' },
    { icon: '📍', label: 'Place new', tone: 'gold' },
    { icon: '➡️', label: 'Copy right', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Kept / copied', state: 'found' }, { label: 'Absorbed into the new one', state: 'dim' }],
  varLabels: ['i', 'new', 'result size', 'answer'],
  approach: {
    title: 'Three phases over a sorted list',
    text: 'Copy every interval that ends before the new one starts. Then, while intervals still start at or before the new end, absorb them by widening the new interval. Add the widened interval, then copy the remaining intervals untouched.',
  },
  java: [
    'public int[][] insert(int[][] intervals, int[] newInterval) {',
    '    List<int[]> res = new ArrayList<>();',
    '    int i = 0, n = intervals.length;',
    '    while (i < n && intervals[i][1] < newInterval[0])        // entirely before',
    '        res.add(intervals[i++]);',
    '    while (i < n && intervals[i][0] <= newInterval[1]) {     // overlapping',
    '        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);',
    '        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);',
    '        i++;',
    '    }',
    '    res.add(newInterval);',
    '    while (i < n)                                            // entirely after',
    '        res.add(intervals[i++]);',
    '    return res.toArray(new int[0][]);',
    '}',
  ],
  python: [
    'def insert(intervals, new):',
    '    res, i, n = [], 0, len(intervals)',
    '    while i < n and intervals[i][1] < new[0]:      # entirely before',
    '        res.append(intervals[i]); i += 1',
    '    while i < n and intervals[i][0] <= new[1]:     # overlapping',
    '        new[0] = min(new[0], intervals[i][0])',
    '        new[1] = max(new[1], intervals[i][1])',
    '        i += 1',
    '    res.append(new)',
    '    res.extend(intervals[i:])                      # entirely after',
    '    return res',
  ],
  algorithm: [
    'Start with an empty result and index i = 0',
    'Copy intervals whose end is before new.start',
    'While an interval starts ≤ new.end, widen new to cover it (min start, max end)',
    'Append the widened interval to the result',
    'Copy all remaining intervals untouched',
    'Return the result',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The input is sorted and disjoint, so the intervals that overlap the new one form one contiguous run. Everything before the run ends before new.start; everything after starts after the (widened) end. Merging the run into the new interval and keeping the two sides in order yields a sorted, disjoint list in a single pass.',
};
