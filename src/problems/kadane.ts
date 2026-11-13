import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. -2 1 -3 4 -1 2 1 -5 4');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let cur = nums[0];
  let best = nums[0];
  let start = 0;
  let bestL = 0;
  let bestR = 0;

  const cells = (curL: number, curR: number, bl: number, br: number, at?: number): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === at) state = 'compare';
      else if (i >= curL && i <= curR) state = 'active';
      else if (i >= bl && i <= br) state = 'found';
      return { key: i, value, state };
    });
  const vars = (i: number | string) => ({ i, cur, best, run: i === '—' ? `[${bestL}..${bestR}]` : `[${start}..${i}]` });
  const aux = (items: string[], highlight?: number) => [{ title: 'Candidates for cur', kind: 'list' as const, items, highlight }];

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Take the first number: cur = best = nums[0] = ${nums[0]}. cur is the best subarray sum ending at index 0.`,
    cells: cells(0, 0, 0, 0), pointers: [{ id: 'i', label: 'i', index: 0, tone: 'blue' }], vars: vars(0),
    logic: 'cur is the best sum of a subarray that ends exactly at the current index.', logicTone: 'info', javaLines: [1], pyLines: [1], algoStep: 0,
    note: `cur = best = ${nums[0]}`,
  });

  for (let i = 1; i < n; i++) {
    const before = cur;
    const extend = cur + nums[i];
    const restart = nums[i];
    const willRestart = restart > extend;
    steps.push({
      title: `Extend or restart at nums[${i}] = ${nums[i]}?`, tag: 'CHOOSE —',
      desc: `extend: cur + nums[${i}] = ${before} + ${nums[i]} = ${extend} · restart: ${restart} → ${willRestart ? 'restart wins' : 'extend wins'}`,
      cells: cells(start, i - 1, bestL, bestR, i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], vars: { ...vars(i), run: `[${start}..${i - 1}]` },
      aux: aux([`extend = ${before} + ${nums[i]} = ${extend}`, `restart = ${restart}`], willRestart ? 1 : 0),
      logic: 'If the running sum is negative it only drags the next number down — better to start fresh.', logicTone: 'info', javaLines: [3], pyLines: [3], algoStep: 1,
      note: `max(${restart}, ${before} + ${nums[i]}) = ${Math.max(restart, extend)}`,
    });
    if (willRestart) {
      cur = restart;
      start = i;
    } else {
      cur = extend;
    }
    const old = best;
    const improved = cur > best;
    if (improved) {
      best = cur;
      bestL = start;
      bestR = i;
    }
    steps.push({
      title: willRestart ? `Restart: cur = ${cur}` : `Extend: cur = ${cur}`, tag: willRestart ? 'RESTART —' : 'EXTEND —',
      desc: `${willRestart ? `drop the old run (${before}), start fresh at index ${i}` : `keep the run [${start}..${i}]`} → cur = ${cur} · ${improved ? `🏆 NEW BEST! best = ${best} (indexes ${bestL}..${bestR})` : `best stays ${best}`}`,
      cells: cells(start, i, bestL, bestR), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], vars: vars(i),
      aux: aux([`cur = ${cur}`, `best = max(${old}, ${cur}) = ${best}`], 1),
      alert: willRestart ? `Running sum ${before} only drags nums[${i}] = ${nums[i]} down: abandon it and restart here.` : undefined,
      logic: improved ? 'This subarray beats every earlier one.' : 'Not better than the best so far.', logicTone: improved ? 'success' : willRestart ? 'warn' : 'info', javaLines: [3, 4], pyLines: [3, 4], algoStep: 2,
      note: `cur = ${cur}; best = max(${old}, ${cur}) = ${best}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `Maximum subarray sum = ${best}, the subarray at indexes ${bestL}..${bestR} = [${nums.slice(bestL, bestR + 1).join(', ')}].`,
    cells: cells(1, 0, bestL, bestR), pointers: [], vars: vars('—'), note: `return ${best}`,
    logic: 'Green cells are the best subarray.', logicTone: 'success', javaLines: [6], pyLines: [5], algoStep: 3,
    result: { title: String(best), text: `Subarray [${bestL}..${bestR}]` },
  });
  return steps;
}

export const kadane: ProblemDef<In> = {
  slug: '53-maximum-subarray',
  id: '53', title: 'Maximum Subarray', difficulty: 'Medium', category: 'Arrays', tag: "Kadane's algorithm",
  statement: 'Given an integer array, find the contiguous subarray with the largest sum and return that sum.',
  constraints: '1 ≤ n ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[−2,1,−3,4,−1,2,1,−5,4]', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, output: '6' },
    { label: '[1]', input: { nums: [1] }, output: '1' },
    { label: '[−3,−1,−2]', input: { nums: [-3, -1, -2] }, output: '−1' },
  ],
  inputPlaceholder: 'e.g. -2 1 -3 4 -1 2 1 -5 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current run', state: 'active' }, { label: 'Best so far', state: 'found' }, { label: 'Considering', state: 'compare' }],
  varLabels: ['i', 'cur', 'best', 'run'],
  emphasis: ['contiguous subarray', 'largest sum'],
  phases: [
    { icon: '🏁', label: 'Setup: cur = best = nums[0]', tone: 'blue' },
    { icon: '⚖️', label: 'Choose: extend or restart', tone: 'cyan' },
    { icon: '★', label: 'Update: cur, then best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Extend the run, or start over',
    text: 'At each number decide: is it better to continue the running subarray (cur + x) or to begin a new one at x? Track the best value ever reached.',
  },
  java: [
    'public int maxSubArray(int[] nums) {',
    '    int cur = nums[0], best = nums[0];',
    '    for (int i = 1; i < nums.length; i++) {',
    '        cur = Math.max(nums[i], cur + nums[i]);',
    '        best = Math.max(best, cur);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def max_sub_array(nums):',
    '    cur = best = nums[0]',
    '    for x in nums[1:]:',
    '        cur = max(x, cur + x)',
    '        best = max(best, cur)',
    '    return best',
  ],
  algorithm: [
    'Set cur = best = nums[0]',
    'For each next x: cur = max(x, cur + x)',
    'Update best = max(best, cur)',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Any best subarray ending at i either is just nums[i] or extends the best subarray ending at i − 1. A negative running sum can never help a later number, so discarding it is always safe.',
};
