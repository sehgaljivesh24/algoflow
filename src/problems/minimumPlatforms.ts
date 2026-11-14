import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { arr: number[]; dep: number[] }

const validTime = (t: number) => Number.isInteger(t) && t >= 0 && t <= 2359 && t % 100 < 60;
const fmt = (t: number) => String(t).padStart(4, '0');

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: arrivals | departures (HHMM times), e.g. 900 940 950 1100 | 910 1200 1120 1130');
  const toNums = (s: string) => s.split(/[\s,]+/).filter(Boolean).map(Number);
  const arr = toNums(parts[0]);
  const dep = toNums(parts[1]);
  if (!arr.length) throw new Error('Enter at least one train');
  if (arr.length !== dep.length) throw new Error('Arrivals and departures must have the same count');
  if (arr.length > 9) throw new Error('Use 9 trains or fewer');
  if ([...arr, ...dep].some((t) => !validTime(t))) throw new Error('Times must be HHMM between 0000 and 2359, e.g. 930 or 1415');
  if (arr.some((a, i) => dep[i] < a)) throw new Error('Every train must depart at or after its arrival time');
  return { arr, dep };
}

function build({ arr: a0, dep: d0 }: In): Step[] {
  const arr = [...a0].sort((x, y) => x - y);
  const dep = [...d0].sort((x, y) => x - y);
  const n = arr.length;
  let i = 0;
  let j = 0;
  let plat = 0;
  let best = 0;
  const steps: Step[] = [];

  const scene = (hotI: number, hotJ: number) => {
    const row = (vals: number[], p: number, hot: number, kind: string): Cell[] =>
      vals.map((v, k) => ({ key: `${kind}${k}`, value: fmt(v), state: k === hot ? 'active' : k < p ? 'sorted' : undefined }));
    return { kind: 'grid' as const, rows: [row(arr, i, hotI, 'a'), row(dep, j, hotJ, 'd')], rowHeads: ['arrivals (sorted)', 'departures (sorted)'], colHeads: arr.map((_, k) => String(k)) };
  };
  const vars = () => ({ i, j, 'platforms now': plat, 'max platforms': best });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, hotI: number, hotJ: number, jl: number[], pl: number[], a: number, extra: { result?: Step['result']; alert?: string } = {}) =>
    steps.push({
      title, tag, note, desc, scene: scene(hotI, hotJ), vars: vars(), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: a, result: extra.result, alert: extra.alert,
      aux: [{ title: 'platforms in use', kind: 'map', items: [`right now → ${plat}`, `peak so far → ${best}`] }],
    });

  add('Start', 'START —', `${n} trains: plat = 0 and best = 0; next the arrival and departure times are sorted separately.`, `n = ${n}, plat = 0, best = 0`,
    'We do not need to know which departure belongs to which arrival. At any moment, platforms needed = arrivals so far − departures so far.', 'info', -1, -1, [0, 3], [0, 2], 0);
  add('Sort both lists', 'SORT:', `arrivals sorted to [${arr.map(fmt).join(', ')}] and departures to [${dep.map(fmt).join(', ')}], ready for a two-pointer sweep over time.`,
    `sort(arr), sort(dep)`,
    'Sorting both lists independently gives the events in time order, which is all the count depends on.', 'info', -1, -1, [1, 2], [1], 0);

  while (i < n) {
    if (arr[i] <= dep[j]) {
      plat++;
      const oldBest = best;
      best = Math.max(best, plat);
      add(`${fmt(arr[i])} arrives before (or when) ${fmt(dep[j])} leaves`, 'ARRIVE:', `arrival ${fmt(arr[i])} ≤ earliest departure ${fmt(dep[j])}, so one more platform is occupied: ${plat} in use${best > oldBest ? ` and a new peak of ${best}` : ''}.`,
        `${fmt(arr[i])} ≤ ${fmt(dep[j])} → plat = ${plat}, best = ${best}`,
        'An arrival at the same minute as a departure still needs its own platform.', best > oldBest ? 'warn' : 'info', i, j, [5, 6, 10], [4, 5, 8], 1);
      i++;
    } else {
      plat--;
      add(`${fmt(dep[j])} leaves before ${fmt(arr[i])} arrives`, 'DEPART:', `departure ${fmt(dep[j])} < next arrival ${fmt(arr[i])}, so that train has left and a platform is freed: ${plat} in use.`,
        `${fmt(dep[j])} < ${fmt(arr[i])} → plat = ${plat}, best = ${best}`,
        'Free the platform first, then look at the next arrival.', 'success', i, j, [7, 8, 10], [6, 7, 8], 2);
      j++;
    }
  }

  add('Done', '✅ Done!', `all ${n} arrivals are processed, and the most platforms ever in use at once was ${best}.`, `return best = ${best}`, 'The peak of (arrivals − departures) over time is the number of platforms needed.', 'success', -1, -1, [12], [9], 3,
    { result: { title: String(best), text: 'Minimum platforms required' } });
  return steps;
}

export const minimumPlatforms: ProblemDef<In> = {
  slug: 'gfg-minimum-platforms',
  id: 'GFG', title: 'Minimum Platforms', difficulty: 'Medium', category: 'Greedy', tag: 'sort + two pointers',
  statement: 'Given arrival and departure times of trains at a station, find the minimum number of platforms needed so that no train waits. A train arriving at the same time another departs needs a separate platform.',
  constraints: '1 ≤ n ≤ 5·10⁴, times in HHMM format, arrival ≤ departure (animation input: at most 9 trains)',
  examples: [
    { label: '900 940 950 1100 1500 1800 | 910 1200 1120 1130 1900 2000', input: { arr: [900, 940, 950, 1100, 1500, 1800], dep: [910, 1200, 1120, 1130, 1900, 2000] }, output: '3' },
    { label: '900 1100 1235 | 1000 1200 1240', input: { arr: [900, 1100, 1235], dep: [1000, 1200, 1240] }, output: '1' },
    { label: '1000 1000 1000 | 1010 1020 1030', input: { arr: [1000, 1000, 1000], dep: [1010, 1020, 1030] }, output: '3' },
  ],
  inputPlaceholder: 'arrivals | departures, e.g. 900 940 950 1100 | 910 1200 1120 1130',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pointer position (next event)', state: 'active' }, { label: 'Already processed', state: 'sorted' }],
  varLabels: ['i', 'j', 'platforms now', 'max platforms'],
  approach: {
    title: 'Sort both lists, sweep with two pointers',
    text: 'Sort arrivals and departures independently. Compare the next arrival with the earliest unprocessed departure: if the arrival is not later, a new platform is needed; otherwise a platform is freed. The highest platform count seen is the answer.',
  },
  java: [
    'public int findPlatform(int[] arr, int[] dep) {',
    '    Arrays.sort(arr);',
    '    Arrays.sort(dep);',
    '    int n = arr.length, i = 0, j = 0, plat = 0, best = 0;',
    '    while (i < n) {',
    '        if (arr[i] <= dep[j]) {',
    '            plat++; i++;',
    '        } else {',
    '            plat--; j++;',
    '        }',
    '        best = Math.max(best, plat);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def find_platform(arr, dep):',
    '    arr.sort(); dep.sort()',
    '    n, i, j, plat, best = len(arr), 0, 0, 0, 0',
    '    while i < n:',
    '        if arr[i] <= dep[j]:',
    '            plat += 1; i += 1',
    '        else:',
    '            plat -= 1; j += 1',
    '        best = max(best, plat)',
    '    return best',
  ],
  phases: [
    { icon: '🔃', label: 'Sort both lists', tone: 'blue' },
    { icon: '🚆', label: 'Arrival: plat++ and track peak', tone: 'green' },
    { icon: '🚉', label: 'Departure: plat--', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum number of platforms', 'no train waits', 'same time'],
  algorithm: [
    'Sort arrival times and departure times separately',
    'Compare the next arrival with the earliest remaining departure; if arrival ≤ departure take a platform (plat++) and update the peak',
    'Otherwise a train has left: free a platform (plat--)',
    'Done: return the highest value of plat',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(1) extra' }],
  why: 'The number of trains present at any instant equals the number of arrivals so far minus the number of departures so far, regardless of which departure belongs to which arrival. Processing the events in time order with two sorted lists traces that count exactly, so its maximum is the minimum number of platforms. Ties are resolved arrival-first because a simultaneous arrival and departure overlap.',
};
