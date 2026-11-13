import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; target — e.g. 2 7 11 15 ; 9');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const target = Number(right.trim());
  if (nums.length < 2 || nums.some((n) => !Number.isInteger(n)) || !Number.isInteger(target)) {
    throw new Error('Use at least two whole numbers, e.g. 2 7 11 15 ; 9');
  }
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums, target };
}

/** 1 setup + 2 steps per element that is not the answer (CHECK, then ADD) + CHECK and FOUND at the end: [3,8,5,9,6,4] ; 10 gives 13. */
function build({ nums, target }: In): Step[] {
  const steps: Step[] = [];
  const seen = new Map<number, number>();
  const mapItems = () => [...seen].map(([v, i]) => `${v} → ${i}`);

  const cells = (cur: number, pair?: [number, number]): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (pair && (i === pair[0] || i === pair[1])) state = 'found';
      else if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const vars = (i: number | string, x: number | string, need: number | string, found: string = '—') => ({ i, x, need, found });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];
  const mapAux = (highlight?: number) => ({ title: 'Map seen (value → index)', kind: 'map' as const, items: mapItems(), highlight });
  const lookup = (need: number, hit: boolean, at?: number) => ({
    title: 'Lookup',
    kind: 'list' as const,
    items: [`need = ${target} − x = ${need}`, hit ? `${need} in map → index ${at} ✓` : `${need} in map? no ✗`],
    highlight: 1,
  });

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Look for two numbers that add up to ${target}. The map seen starts empty; it will remember value → index.`,
    cells: cells(-1), pointers: [], aux: [mapAux()], vars: vars('—', '—', '—'),
    logic: 'Instead of checking every pair, remember each number we have passed. For each new number we only ask: have I already seen its partner?',
    logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: 'seen = {}',
  });

  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const need = target - x;
    const j = seen.get(need);
    steps.push({
      title: `Check nums[${i}] = ${x}`, tag: 'CHECK —',
      desc: `x = ${x}, need = ${target} − ${x} = ${need}. Is ${need} already in the map?`,
      cells: cells(i), pointers: ptr(i), aux: [mapAux(j !== undefined ? [...seen.keys()].indexOf(need) : undefined), lookup(need, j !== undefined, j)],
      vars: vars(i, x, need),
      logic: 'Compute the complement, then look it up in the map before inserting x.', logicTone: 'info',
      javaLines: [3, 4], pyLines: [3, 4], algoStep: 1,
      note: `need = ${target} − ${x} = ${need}; seen has ${seen.size} entr${seen.size === 1 ? 'y' : 'ies'}`,
    });
    if (j !== undefined) {
      steps.push({
        title: 'Found the pair!', tag: '✅ Found!',
        desc: `${need} was stored at index ${j}, so nums[${j}] + nums[${i}] = ${need} + ${x} = ${target}. Answer [${j}, ${i}].`,
        cells: cells(i, [j, i]), pointers: [{ id: 'j', label: 'j', index: j, tone: 'green' }, ...ptr(i)],
        aux: [mapAux([...seen.keys()].indexOf(need)), lookup(need, true, j)], vars: vars(i, x, need, `[${j}, ${i}]`),
        logic: `Return [${j}, ${i}].`, logicTone: 'success', javaLines: [5], pyLines: [5], algoStep: 3,
        note: `return [${j}, ${i}]`,
        result: { title: `[${j}, ${i}]`, text: `${nums[j]} + ${nums[i]} = ${target}` },
      });
      return steps;
    }
    seen.set(x, i);
    steps.push({
      title: `${need} not seen yet`, tag: 'ADD —',
      desc: `${need} is not in the map, so no partner yet: store ${x} → index ${i} for later numbers.`,
      cells: cells(i), pointers: ptr(i), aux: [mapAux(seen.size - 1)], vars: vars(i, x, need),
      logic: 'No partner yet. Store the current number so a later one can find it.', logicTone: 'info',
      javaLines: [6], pyLines: [6], algoStep: 2, note: `seen.put(${x}, ${i}); size = ${seen.size}`,
    });
  }

  steps.push({
    title: 'No pair exists', tag: 'No pair —', desc: `Every number was checked and none had its partner in the map: no two numbers add up to ${target}.`,
    cells: cells(nums.length), pointers: [], aux: [mapAux()], vars: vars('—', '—', '—', 'none'),
    alert: `No pair adds up to ${target}.`,
    logic: 'We scanned the whole array without finding a partner.', logicTone: 'warn', javaLines: [8], pyLines: [7], algoStep: 3,
    note: 'return new int[]{}',
    result: { title: 'No answer', text: 'Returned an empty array' },
  });
  return steps;
}

export const twoSum: ProblemDef<In> = {
  slug: '1-two-sum',
  id: '1', title: 'Two Sum', difficulty: 'Easy', category: 'Arrays', tag: 'hash map',
  statement:
    'Given an array of integers and a target, return the indexes of the two numbers that add up to the target. Each input has exactly one solution and you may not use the same element twice.',
  constraints: '2 ≤ n ≤ 10⁴ (animation input is limited to 12 numbers)',
  emphasis: ['two numbers', 'add up to the target', 'indexes', 'same element twice'],
  examples: [
    { label: '[3,8,5,9,6,4], 10', input: { nums: [3, 8, 5, 9, 6, 4], target: 10 }, output: '[4,5]', answer: '[4, 5] (6 + 4 = 10)' },
    { label: '[2,7,11,15], 9', input: { nums: [2, 7, 11, 15], target: 9 }, output: '[0,1]' },
    { label: '[3,2,4], 6', input: { nums: [3, 2, 4], target: 6 }, output: '[1,2]' },
    { label: '[3,3], 6', input: { nums: [3, 3], target: 6 }, output: '[0,1]' },
  ],
  inputPlaceholder: 'e.g. 3 8 5 9 6 4 ; 10',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current x = nums[i]', state: 'active' }, { label: 'Already seen (in map)', state: 'sorted' }, { label: 'Answer pair', state: 'found' }],
  varLabels: ['i', 'x', 'need', 'found'],
  phases: [
    { icon: '🗂️', label: 'Setup: empty map', tone: 'blue' },
    { icon: '🔍', label: 'Check: need = target − x', tone: 'cyan' },
    { icon: '➕', label: 'Add: seen[x] = i', tone: 'gold' },
    { icon: '✅', label: 'Found', tone: 'green' },
  ],
  approach: {
    title: 'Remember what you have seen',
    text: 'Walk the array once. For each number x, the partner is target − x. If the partner is already in the map, you are done; otherwise store x and its index.',
  },
  java: [
    'public int[] twoSum(int[] nums, int target) {',
    '    Map<Integer, Integer> seen = new HashMap<>();',
    '    for (int i = 0; i < nums.length; i++) {',
    '        int need = target - nums[i];',
    '        if (seen.containsKey(need))',
    '            return new int[]{seen.get(need), i};',
    '        seen.put(nums[i], i);',
    '    }',
    '    return new int[]{};',
    '}',
  ],
  python: [
    'def two_sum(nums, target):',
    '    seen = {}',
    '    for i, x in enumerate(nums):',
    '        need = target - x',
    '        if need in seen:',
    '            return [seen[need], i]',
    '        seen[x] = i',
    '    return []',
  ],
  algorithm: [
    'Create an empty map from value to index',
    'For each nums[i], compute need = target − nums[i] and look it up',
    'If need is missing, store nums[i] → i and move on',
    'If need is in the map, return its index and i',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Checking every pair costs O(n²). A hash map answers "have I seen this value?" in O(1), so one pass is enough. Inserting after the lookup guarantees we never pair an element with itself.',
};
