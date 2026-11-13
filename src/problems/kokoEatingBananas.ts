import type { Aux, Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInt1, parseNums, parseParts, ptr } from './ssbShared.ts';

interface In { piles: number[]; h: number }

function parse(raw: string): In {
  const [a, b] = parseParts(raw, 2, 'piles ; hours — e.g. 3 6 7 11 ; 8');
  const piles = parseNums(a, { maxLen: 8, lo: 1, hi: 16, what: 'piles' });
  const h = parseInt1(b, 1, 100, 'Hours h');
  if (h < piles.length) throw new Error(`h must be at least the number of piles (${piles.length}); Koko eats from one pile per hour`);
  return { piles, h };
}

const hoursAt = (piles: number[], k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);

function build({ piles, h }: In): Step[] {
  const maxPile = Math.max(...piles);
  const steps: Step[] = [];
  let lo = 1;
  let hi = maxPile;
  let iter = 0;
  let hoursShown: number | string = '—';

  // Candidate speeds 1..maxPile are the cells; cell for speed k has key k.
  const cells = (mark: Record<number, 'compare' | 'found' | 'error'> = {}): Cell[] =>
    Array.from({ length: maxPile }, (_, i) => {
      const k = i + 1;
      return { key: k, value: k, state: mark[k] ?? (k < lo || k > hi ? ('dim' as const) : ('active' as const)) };
    });
  const ptrs = (mid?: number) => [
    ptr('lo', 'lo', lo - 1, 'blue'),
    ...(mid !== undefined ? [ptr('mid', 'mid', mid - 1, 'orange')] : []),
    ptr('hi', 'hi', hi - 1, 'purple'),
  ];
  const vars = (mid: number | string) => ({ lo, mid, hi, hours: hoursShown, h });
  const range = (mid?: number): Aux => ({
    title: 'Speed range still possible', kind: 'list',
    items: [`lo = ${lo}`, ...(mid !== undefined ? [`mid = ${mid}`] : []), `hi = ${hi}`, `${hi - lo + 1} candidate${hi === lo ? '' : 's'}`],
    highlight: mid !== undefined ? 1 : undefined,
  });

  steps.push({
    title: 'Start: search over the speed k', tag: 'BOUND —',
    desc: `${piles.length} piles [${piles.join(', ')}], ${h} hours. Candidate speeds are 1..${maxPile}; the cells below ARE the candidate answers.`,
    cells: cells(), pointers: ptrs(), vars: vars('—'), aux: [range()],
    logic: 'Speed is monotone: if Koko can finish at speed k she can also finish at any faster speed. So the feasible speeds form a suffix of 1..max, and we binary search for where it starts.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `lo = 1, hi = max(piles) = ${maxPile}`,
  });

  while (lo < hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    hoursShown = '—';
    steps.push({
      title: `Try speed mid = ${mid}`, tag: `ROUND ${iter} · GUESS —`, desc: `Range is [${lo}, ${hi}], so the middle guess is k = ${lo} + (${hi} − ${lo}) / 2 = ${mid}.`,
      cells: cells({ [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid), aux: [range(mid)],
      logic: 'We ask one yes/no question: "is this speed fast enough?"', logicTone: 'info', javaLines: [3], pyLines: [3], algoStep: 1,
      note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    const per = piles.map((p) => Math.ceil(p / mid));
    const hours = per.reduce((s, x) => s + x, 0);
    hoursShown = hours;
    const ok = hours <= h;
    steps.push({
      title: `Feasibility check at k = ${mid}`, tag: ok ? 'TEST · FEASIBLE —' : 'TEST · TOO SLOW —',
      desc: `Each pile takes ceil(pile / ${mid}) hours: ${per.join(' + ')} = ${hours}. ${hours} ${ok ? '≤' : '>'} ${h}, so k = ${mid} is ${ok ? 'fast enough' : 'too slow'}.`,
      cells: cells({ [mid]: ok ? 'found' : 'error' }), pointers: ptrs(mid), vars: vars(mid),
      aux: [
        { title: `Hours per pile at speed ${mid}`, kind: 'list', items: piles.map((p, i) => `${p} → ${per[i]}h`) },
        { title: 'Total vs limit', kind: 'map', items: [`total = ${hours}`, `limit h = ${h}`, ok ? 'feasible' : 'not feasible'], highlight: 2, bad: ok ? [] : [0, 2] },
      ],
      alert: ok ? undefined : `Speed ${mid} needs ${hours} hours, over the limit of ${h}: too slow.`,
      logic: ok ? 'Feasible: this speed works, and a slower one might too, so keep mid inside the window.' : 'Infeasible: any speed ≤ mid is slower still, so everything up to mid is ruled out.', logicTone: ok ? 'success' : 'warn',
      javaLines: [4, 11], pyLines: [4], algoStep: 2, note: `hours = ${per.join(' + ')} = ${hours} ${ok ? '≤' : '>'} ${h}`,
    });
    if (ok) hi = mid;
    else lo = mid + 1;
    steps.push({
      title: ok ? `Feasible: hi = ${mid}` : `Too slow: lo = ${mid + 1}`, tag: ok ? 'FEASIBLE → hi = mid —' : 'TOO SLOW → lo = mid + 1 —',
      desc: ok ? `k = ${mid} works, so slower speeds may too: hi = ${mid}. Range is now [${lo}, ${hi}].` : `k = ${mid} fails, so speeds ≤ ${mid} are ruled out: lo = ${mid + 1}. Range is now [${lo}, ${hi}].`,
      cells: cells(), pointers: ptrs(), vars: vars(mid), aux: [range()],
      logic: 'The window of candidate speeds shrinks by about half.', logicTone: ok ? 'info' : 'warn',
      javaLines: ok ? [4] : [5], pyLines: ok ? [5, 6] : [7, 8], algoStep: 3,
      note: ok ? `hi = mid = ${mid}` : `lo = mid + 1 = ${lo}`,
    });
  }

  steps.push({
    title: `Minimum speed = ${lo}`, tag: '✅ Done!', desc: `lo = hi = ${lo}: the smallest speed that finishes within ${h} hours (${hoursAt(piles, lo)} hours needed).`,
    cells: cells({ [lo]: 'found' }), pointers: [ptr('k', 'k', lo - 1, 'green')], vars: vars('—'), aux: [range()],
    logic: `${lo} is feasible, and ${lo - 1 >= 1 ? `${lo - 1} was ruled out` : 'nothing below it exists'}.`, logicTone: 'success', javaLines: [7], pyLines: [9], algoStep: 4,
    note: `lo == hi → return ${lo}`,
    result: { title: String(lo), text: `Koko must eat at least ${lo} banana${lo === 1 ? '' : 's'} per hour` },
  });
  return steps;
}

export const kokoEatingBananas: ProblemDef<In> = {
  slug: '875-koko-eating-bananas', id: '875', title: 'Koko Eating Bananas', difficulty: 'Medium', category: 'Binary Search', tag: 'search on answer',
  statement: 'Koko has piles of bananas and h hours. Each hour she picks one pile and eats up to k bananas from it (finishing early if it has fewer). Find the smallest integer speed k that lets her finish all piles within h hours.',
  constraints: 'piles.length ≤ h ≤ 10⁹ · 1 ≤ piles[i] ≤ 10⁹ (animation input: at most 8 piles of size 1–16, h ≤ 100)',
  examples: [
    { label: '[3,6,7,11], h=8', input: { piles: [3, 6, 7, 11], h: 8 }, output: '4' },
    { label: '[16,11,13,4,15], h=5', input: { piles: [16, 11, 13, 4, 15], h: 5 }, output: '16' },
    { label: '[16,11,13,4,15], h=6', input: { piles: [16, 11, 13, 4, 15], h: 6 }, output: '15' },
  ],
  inputPlaceholder: 'e.g. 3 6 7 11 ; 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Speeds still possible', state: 'active' }, { label: 'Candidate being tested', state: 'compare' }, { label: 'Feasible / answer', state: 'found' }, { label: 'Too slow', state: 'error' }, { label: 'Ruled out', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'hours', 'h'],
  approach: {
    title: 'Binary search on the answer',
    text: 'The answer is a speed between 1 and the largest pile. For a candidate speed, compute the hours needed (a simple loop). Fast enough → try slower; too slow → try faster. The feasibility test is monotone, so binary search applies.',
  },
  java: [
    'public int minEatingSpeed(int[] piles, int h) {',
    '    int lo = 1, hi = Arrays.stream(piles).max().getAsInt();',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (hoursNeeded(piles, mid) <= h) hi = mid;',
    '        else lo = mid + 1;',
    '    }',
    '    return lo;',
    '}',
    'private long hoursNeeded(int[] piles, int speed) {',
    '    long hours = 0;',
    '    for (int p : piles) hours += (p + speed - 1) / speed;',
    '    return hours;',
    '}',
  ],
  python: [
    'def min_eating_speed(piles, h):',
    '    lo, hi = 1, max(piles)',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        hours = sum(-(-p // mid) for p in piles)',
    '        if hours <= h:',
    '            hi = mid',
    '        else:',
    '            lo = mid + 1',
    '    return lo',
  ],
  algorithm: [
    'Search space: speeds lo = 1 … hi = max(piles)',
    'Pick mid = lo + (hi − lo) / 2 as the candidate speed',
    'Feasibility check: hours = Σ ceil(pile / mid); is hours ≤ h?',
    'Feasible → hi = mid; not feasible → lo = mid + 1',
    'When lo == hi, return lo',
  ],
  phases: [
    { icon: '📐', label: 'Bound the speeds', tone: 'blue' },
    { icon: '🎯', label: 'Guess mid', tone: 'cyan' },
    { icon: '🧪', label: 'Feasibility test', tone: 'gold' },
    { icon: '✂️', label: 'Narrow the range', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['smallest integer speed', 'h hours', 'piles'],
  complexity: [{ label: 'Time', value: 'O(n log max(piles))' }, { label: 'Space', value: 'O(1)' }],
  why: 'Hours needed never increases as the speed grows, so "feasible" is false for small speeds and true for all larger ones. Binary search finds the boundary. The answer is never above max(piles) because that speed already takes exactly one hour per pile, and h ≥ number of piles.',
};
