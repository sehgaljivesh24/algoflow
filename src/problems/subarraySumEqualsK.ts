import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; k — e.g. 1 2 3 ; 3');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(right.trim());
  if (!nums.length || right.trim() === '' || nums.some((n) => !Number.isInteger(n)) || !Number.isInteger(k)) throw new Error('Use whole numbers (negatives allowed), e.g. 1 2 3 ; 3');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums, k };
}

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const seen = new Map<number, number>([[0, 1]]);
  const mapItems = () => [...seen].map(([p, c]) => `${p} → ${c}`);
  const prefix: number[] = [0]; // prefix[j] = sum of the first j numbers
  let count = 0;

  // columns: 0 is the empty prefix, column j+1 is after nums[j]
  const scene = (i: number, match: number[], stored: boolean) => {
    const top: Cell[] = [{ key: 't-', value: '·', state: 'dim' }, ...nums.map((v, j) => ({ key: `t${j}`, value: v, state: (j === i ? 'active' : undefined) as CellState | undefined }))];
    const bottom: Cell[] = [{ key: 'p0', value: 0, state: (match.includes(0) ? 'found' : 'sorted') as CellState }];
    for (let j = 1; j <= n; j++) {
      let state: CellState | undefined;
      if (match.includes(j)) state = 'found';
      else if (j === i + 1) state = 'active';
      else if (j < i + 1 || (j === i + 1 && stored)) state = 'sorted';
      else state = 'dim';
      bottom.push({ key: `p${j}`, value: j < prefix.length ? prefix[j] : '·', state });
    }
    return { kind: 'grid' as const, rows: [top, bottom], rowHeads: ['nums', 'prefix'], colHeads: ['', ...nums.map((_, j) => String(j))] };
  };
  const vars = (i: number | string, sum: number | string, need: number | string) => ({ i, sum, need, count, k });
  const aux = (highlight?: number) => [{ title: 'prefix sum → times seen', kind: 'map' as const, items: mapItems(), highlight }];

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Count the contiguous subarrays whose sum is exactly ${k}. The empty prefix (sum 0) goes into the map once: {0 → 1}.`,
    scene: scene(-1, [], false), aux: aux(0), vars: vars('—', 0, '—'),
    logic: 'A subarray sum equals prefix[right] − prefix[left]. So at each right end we only need to know how many earlier prefixes equal prefix − k.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0, note: 'seen = {0: 1}, sum = 0, count = 0',
  });

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const before = sum;
    sum += nums[i];
    prefix.push(sum);
    const need = sum - k;
    steps.push({
      title: `Extend to index ${i}: prefix = ${sum}`, tag: 'PREFIX —',
      desc: `add nums[${i}] = ${nums[i]} → prefix = ${before} + ${nums[i]} = ${sum}`,
      scene: scene(i, [], false), aux: aux(), vars: vars(i, sum, '—'),
      logic: 'The running prefix is the sum of everything up to and including index i.', logicTone: 'info',
      javaLines: [5], pyLines: [4], algoStep: 1, note: `sum = ${before} + ${nums[i]} = ${sum}`,
    });
    const c = seen.get(need) ?? 0;
    const match = c ? prefix.map((p, j) => (j <= i && p === need ? j : -1)).filter((j) => j >= 0) : [];
    count += c;
    steps.push({
      title: c ? `Lookup ${need}: seen ${c}×` : `Lookup ${need}: not seen`, tag: c ? 'HIT —' : 'MISS —',
      desc: c
        ? `need = ${sum} − ${k} = ${need}; seen[${need}] = ${c} → ${c} subarray${c > 1 ? 's' : ''} ending at ${i} sum${c > 1 ? '' : 's'} to ${k}, count = ${count}`
        : `need = ${sum} − ${k} = ${need}; seen has no ${need} → no subarray ending at ${i} sums to ${k}, count stays ${count}`,
      scene: scene(i, match, false), aux: aux(c ? [...seen.keys()].indexOf(need) : undefined), vars: vars(i, sum, need),
      logic: c ? 'Every earlier prefix equal to the needed value marks a start point (highlighted): the numbers between it and i add to k.' : 'No earlier prefix matches, so nothing to add here.',
      logicTone: c ? 'success' : 'info',
      javaLines: [6], pyLines: [5], algoStep: 2, note: c ? `count += seen[${need}] = ${c} → ${count}` : `seen.getOrDefault(${need}, 0) = 0`,
    });
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
    steps.push({
      title: `Record prefix ${sum}`, tag: 'RECORD —', desc: `seen[${sum}] is now ${seen.get(sum)}: later indexes can use prefix ${sum} as a start point.`,
      scene: scene(i, [], true), aux: aux([...seen.keys()].indexOf(sum)), vars: vars(i, sum, need),
      logic: 'Insert after the lookup so a subarray is never empty and an index never pairs with itself.', logicTone: 'info',
      javaLines: [7], pyLines: [6], algoStep: 3, note: `seen[${sum}] = ${seen.get(sum)}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `count = ${count}: ${count} subarray${count === 1 ? '' : 's'} add${count === 1 ? 's' : ''} up to ${k}.`,
    scene: scene(n, [], true), aux: aux(), vars: vars('—', sum, '—'),
    logic: 'Each valid subarray is counted exactly once, at its right end.', logicTone: 'success', javaLines: [9], pyLines: [7], algoStep: 4,
    note: `return ${count}`,
    result: { title: String(count), text: `${count} subarray${count === 1 ? '' : 's'} with sum ${k}` },
  });
  return steps;
}

export const subarraySumEqualsK: ProblemDef<In> = {
  slug: '560-subarray-sum-equals-k',
  id: '560', title: 'Subarray Sum Equals K', difficulty: 'Medium', category: 'Arrays', tag: 'prefix sum + hash map',
  statement: 'Given an integer array and a target k, return how many contiguous, non-empty subarrays add up to k. Numbers may be negative, so a sliding window will not work.',
  constraints: '1 ≤ n ≤ 2·10⁴, values may be negative (animation input is limited to 12 numbers)',
  emphasis: ['contiguous', 'add up to k', 'negative'],
  examples: [
    { label: '[1,1,1], k=2', input: { nums: [1, 1, 1], k: 2 }, output: '2' },
    { label: '[1,2,3], k=3', input: { nums: [1, 2, 3], k: 3 }, output: '2' },
    { label: '[1,-1,0], k=0', input: { nums: [1, -1, 0], k: 0 }, output: '3' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current element / prefix', state: 'active' }, { label: 'Matching earlier prefix', state: 'found' }, { label: 'Prefix recorded', state: 'sorted' }, { label: 'Not reached yet', state: 'dim' }],
  varLabels: ['i', 'sum', 'need', 'count', 'k'],
  phases: [
    { icon: '🗂️', label: 'Setup: seen = {0: 1}', tone: 'blue' },
    { icon: '➕', label: 'Extend: sum += nums[i]', tone: 'cyan' },
    { icon: '🔍', label: 'Lookup: seen[sum − k]', tone: 'gold' },
    { icon: '📝', label: 'Record: seen[sum]++', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Prefix sums plus a frequency map',
    text: 'Keep a running prefix sum. A subarray ending here sums to k exactly when an earlier prefix equals (current prefix − k), so add how many times that value has been seen, then record the current prefix.',
  },
  java: [
    'public int subarraySum(int[] nums, int k) {',
    '    Map<Integer, Integer> seen = new HashMap<>();',
    '    seen.put(0, 1);',
    '    int sum = 0, count = 0;',
    '    for (int x : nums) {',
    '        sum += x;',
    '        count += seen.getOrDefault(sum - k, 0);',
    '        seen.merge(sum, 1, Integer::sum);',
    '    }',
    '    return count;',
    '}',
  ],
  python: [
    'def subarray_sum(nums, k):',
    '    seen = {0: 1}',
    '    total = count = 0',
    '    for x in nums:',
    '        total += x',
    '        count += seen.get(total - k, 0)',
    '        seen[total] = seen.get(total, 0) + 1',
    '    return count',
  ],
  algorithm: [
    'Create a map of prefix sum → count, starting with {0: 1}',
    'Add nums[i] to the running prefix sum',
    'Add seen[prefix − k] (if present) to the answer',
    'Increment seen[prefix] and move to the next index',
    'Return the total count',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The sum of nums[l..r] equals prefix[r+1] − prefix[l]. Fixing r, the valid l values are exactly the earlier prefixes equal to prefix[r+1] − k, and the map knows how many there are. Seeding the map with {0: 1} accounts for subarrays that start at index 0. Negative numbers break sliding windows (the sum is no longer monotonic) but not this method.',
};
