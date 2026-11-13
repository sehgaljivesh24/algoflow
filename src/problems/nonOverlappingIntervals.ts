import type { Aux, CellState, IntervalBarVM, ProblemDef, Step } from '../engine/types';
import { parseIntervals } from './graphKit.ts';

interface In { iv: [number, number][] }

const parse = (raw: string): In => ({ iv: parseIntervals(raw, { max: 8, example: '1-2 2-3 3-4 1-3' }) });
const fmt = (a: number, b: number) => `[${a}, ${b}]`;

function build({ iv }: In): Step[] {
  const n = iv.length;
  const order = iv.map((_, i) => i).sort((a, b) => iv[a][1] - iv[b][1] || a - b);
  const axis = { min: Math.min(...iv.map((p) => p[0])), max: Math.max(...iv.map((p) => p[1])) };
  const steps: Step[] = [];
  const state = new Array<CellState | undefined>(n).fill(undefined);
  const kept: number[] = [];
  let removed = 0;
  let lastEnd: number | null = null;
  let cur = -1;
  let sorted = false;
  let decided = false;

  const scene = () => ({
    kind: 'intervals' as const, axis,
    bars: iv.map(([s, e], i): IntervalBarVM => ({ id: i, start: s, end: e, state: i === cur && !decided ? 'active' : state[i] })),
    result: kept.map((i): IntervalBarVM => ({ id: `k${i}`, start: iv[i][0], end: iv[i][1], state: 'found' })),
    resultLabel: 'kept',
    marker: lastEnd === null ? undefined : { at: lastEnd, label: `lastEnd = ${lastEnd}` },
  });
  const aux = (): Aux[] => [
    { title: sorted ? 'sorted by END time' : 'input order', kind: 'list', items: (sorted ? order : iv.map((_, i) => i)).map((i) => fmt(iv[i][0], iv[i][1])), highlight: cur >= 0 && sorted ? order.indexOf(cur) : undefined },
  ];
  const vars = () => ({ current: cur >= 0 ? fmt(iv[cur][0], iv[cur][1]) : '—', lastEnd: lastEnd ?? '−∞', removed });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    tag: 'INIT', title: 'Start', desc: `${n} interval${n === 1 ? '' : 's'}: ${iv.map(([x, y]) => fmt(x, y)).join(', ')}. Remove as few as possible so the rest do not overlap (touching ends are fine).`,
    note: `removed = 0, n = ${n}`,
    logic: 'Same as "keep as many intervals as possible". The greedy choice: always keep the interval that finishes earliest.', logicTone: 'info',
    javaLines: [2], pyLines: [2], algoStep: 0,
  });
  sorted = true;
  push({
    tag: 'SORT', title: 'Sort by end time', desc: `Sort by END time: ${order.map((i) => fmt(iv[i][0], iv[i][1])).join(', ')}. Finishing early leaves the most room.`,
    note: `sorted by a[1] → ends ${order.map((i) => iv[i][1]).join(', ')}; lastEnd = −∞`,
    logic: 'Finishing early leaves the most room for the intervals that follow.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0,
  });

  for (const i of order) {
    cur = i;
    decided = false;
    const [s, e] = iv[i];
    const fits = lastEnd === null || s >= lastEnd;
    push({
      tag: 'COMPARE', title: `Examine ${fmt(s, e)}`, desc: lastEnd === null ? `${fmt(s, e)} ends first, so nothing is kept yet and there is nothing to clash with.` : `${fmt(s, e)} starts at ${s}; the last kept interval ends at ${lastEnd}. Is ${s} ≥ ${lastEnd}? ${fits ? 'Yes.' : 'No, they overlap.'}`,
      note: `cur[0]=${s} >= lastEnd=${lastEnd ?? '−∞'} → ${fits}`,
      logic: 'Compare the start of the next interval with the end of the last one we kept.', logicTone: 'info',
      javaLines: [5], pyLines: [4], algoStep: 1,
    });
    decided = true;
    if (fits) {
      state[i] = 'found';
      kept.push(i);
      const prev = lastEnd;
      lastEnd = e;
      push({
        tag: 'KEEP', title: `${fmt(s, e)}: keep`,
        desc: prev === null ? `Keep ${fmt(s, e)}: it is the earliest-ending interval. lastEnd becomes ${e}.` : `${s} ≥ ${prev}: no overlap, keep ${fmt(s, e)}. lastEnd moves from ${prev} to ${e}.`,
        note: `lastEnd = ${e}; kept = ${kept.length}`,
        logic: 'No clash with what we already kept: keep it and move the end marker.', logicTone: 'success',
        javaLines: [6], pyLines: [5], algoStep: 2,
      });
    } else {
      removed++;
      state[i] = 'error';
      push({
        tag: 'REMOVE', title: `${fmt(s, e)}: ${s} < ${lastEnd}, remove`, desc: `${s} < ${lastEnd}: ${fmt(s, e)} overlaps the kept interval and ends later, so drop it. removed = ${removed}.`,
        note: `removed++ → ${removed}`, alert: `Overlap! ${fmt(s, e)} starts at ${s} before lastEnd ${lastEnd}, so it is removed.`,
        logic: 'Of two overlapping intervals the one ending earlier is already kept, so dropping the later-ending one never hurts.', logicTone: 'warn',
        javaLines: [8], pyLines: [7], algoStep: 3,
      });
    }
  }
  cur = -1;
  push({
    tag: '✅ Done!', title: 'Done', desc: `Removed ${removed} interval${removed === 1 ? '' : 's'}; the ${kept.length} kept ones do not overlap.`,
    note: `return removed → ${removed}`,
    logic: 'Greedy-by-end keeps the maximum number of intervals, so the removals are minimal.', logicTone: 'success',
    javaLines: [11], pyLines: [8], algoStep: 4,
    result: { title: String(removed), text: 'Minimum intervals to remove' },
  });
  return steps;
}

const P = (s: string): In => ({ iv: s.split(' ').map((t) => t.split('-').map(Number) as [number, number]) });

export const nonOverlappingIntervals: ProblemDef<In> = {
  slug: '435-non-overlapping-intervals',
  id: '435', title: 'Non-Overlapping Intervals', difficulty: 'Medium', category: 'Intervals', tag: 'greedy sort',
  emphasis: ['minimum number of intervals', 'do not overlap'],
  statement: 'Given a list of intervals, return the minimum number of intervals you must remove so that the rest do not overlap. Intervals that merely touch (one ends where the next starts) do not overlap.',
  constraints: '1 ≤ intervals ≤ 10⁵ (animation input: ≤ 8 intervals with ends ≤ 30, written like 1-2 2-3 3-4 1-3)',
  examples: [
    { label: '1-2 2-3 3-4 1-3', input: P('1-2 2-3 3-4 1-3'), output: '1' },
    { label: '1-2 1-2 1-2', input: P('1-2 1-2 1-2'), output: '2' },
    { label: '1-5 2-3 4-6 5-8 7-9', input: P('1-5 2-3 4-6 5-8 7-9'), output: '2' },
  ],
  inputPlaceholder: 'e.g. 1-2 2-3 3-4 1-3   (start-end pairs)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '📅', label: 'Sort by end', tone: 'blue' },
    { icon: '🔍', label: 'Compare start vs lastEnd', tone: 'cyan' },
    { icon: '✅', label: 'Keep', tone: 'green' },
    { icon: '✂️', label: 'Remove (overlap)', tone: 'orange' },
    { icon: '🏁', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Being examined', state: 'active' }, { label: 'Kept', state: 'found' }, { label: 'Removed', state: 'error' }],
  varLabels: ['current', 'lastEnd', 'removed'],
  approach: {
    title: 'Greedy: sort by end, keep what fits',
    text: 'Sort by end time. Walk through the intervals keeping track of the end of the last kept one. If the next interval starts at or after that end, keep it and update the end; otherwise it overlaps, so count it as a removal.',
  },
  java: [
    'public int eraseOverlapIntervals(int[][] intervals) {',
    '    Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));',
    '    int removed = 0;',
    '    int lastEnd = Integer.MIN_VALUE;',
    '    for (int[] cur : intervals) {',
    '        if (cur[0] >= lastEnd) {',
    '            lastEnd = cur[1];                 // keep it',
    '        } else {',
    '            removed++;                        // overlap -> drop it',
    '        }',
    '    }',
    '    return removed;',
    '}',
  ],
  python: [
    'def erase_overlap_intervals(intervals):',
    '    intervals.sort(key=lambda x: x[1])',
    "    removed, last_end = 0, float('-inf')",
    '    for s, e in intervals:',
    '        if s >= last_end:',
    '            last_end = e                      # keep it',
    '        else:',
    '            removed += 1                      # overlap -> drop it',
    '    return removed',
  ],
  algorithm: [
    'Sort by end time and set lastEnd = −∞',
    'Take the next interval and compare its start with lastEnd',
    'If start ≥ lastEnd: keep it and set lastEnd = its end',
    'Otherwise it overlaps: remove it (removed++)',
    'After the last interval, removed is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(1) extra' }],
  why: 'Exchange argument: in any optimal set of kept intervals, replacing the first one by the interval with the earliest end cannot create an overlap, because the earliest end is no later than the one it replaces. So some optimal solution contains the earliest-ending interval; the rest of the problem is the same question on the intervals starting at or after its end. Repeating this is exactly the sorted sweep.',
};
