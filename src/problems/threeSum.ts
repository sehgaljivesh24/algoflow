import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 3 || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter at least three whole numbers, e.g. -1 0 1 2 -1 -4');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  // Sort while remembering each value's original position, so the cells visibly slide into place.
  const order = nums.map((_, k) => k).sort((a, b) => nums[a] - nums[b] || a - b);
  const s = order.map((k) => nums[k]);
  const triplets: number[][] = [];
  const steps: Step[] = [];

  let i = -1;
  let l = -1;
  let r = -1;
  let hit: number[] = [];

  const sortedCells = (): Cell[] =>
    s.map((value, p) => {
      let state: CellState | undefined;
      if (hit.includes(p)) state = 'found';
      else if (p === i) state = 'active';
      else if (p === l || p === r) state = 'compare';
      else if (i >= 0 && p < i) state = 'dim';
      return { key: order[p], value, state };
    });
  const ptrs = () => {
    const p: { id: string; label: string; index: number; tone: 'blue' | 'orange' | 'purple' }[] = [];
    if (i >= 0) p.push({ id: 'i', label: 'i', index: i, tone: 'purple' });
    if (l >= 0) p.push({ id: 'l', label: 'l', index: l, tone: 'blue' });
    if (r >= 0) p.push({ id: 'r', label: 'r', index: r, tone: 'orange' });
    return p;
  };
  const aux = () => [{ title: 'TRIPLETS FOUND', kind: 'list' as const, items: triplets.map((t) => `[${t.join(', ')}]`), highlight: hit.length ? triplets.length - 1 : undefined }];
  const vars = (sum: number | string = '—') => ({ i: i >= 0 ? i : '—', l: l >= 0 ? l : '—', r: r >= 0 ? r : '—', sum, triplets: triplets.length });
  const push = (st: Omit<Step, 'cells' | 'pointers' | 'aux' | 'vars'> & { sum?: number | string }) => {
    const { sum, ...rest } = st;
    steps.push({ ...rest, cells: sortedCells(), pointers: ptrs(), aux: aux(), vars: vars(sum) });
  };

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Find every set of three numbers in [${nums.join(', ')}] that add up to 0, without listing the same triplet twice.`,
    cells: nums.map((value, k) => ({ key: k, value })), pointers: [], aux: aux(), vars: vars(),
    logic: 'Trying all triples costs O(n³). Sorting first lets us fix one number and find its partners with two pointers.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `n = ${n}, target sum = 0`,
  });
  push({
    title: 'Sort the array', tag: 'SORT —', desc: `Sorted: [${s.join(', ')}]. Equal values now sit next to each other.`,
    logic: 'Sorted order gives two things: a way to decide which pointer to move, and a cheap way to skip duplicates.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, note: `Arrays.sort → [${s.join(', ')}]`,
  });

  for (i = 0; i < n - 2; i++) {
    l = -1;
    r = -1;
    hit = [];
    if (s[i] > 0) {
      push({
        title: `${s[i]} > 0: stop`, tag: 'STOP —', desc: `nums[${i}] = ${s[i]} > 0, and everything after it is larger, so no triplet starting here or later can sum to 0.`,
        alert: `${s[i]} is positive: three numbers that are all positive cannot add up to 0, so the search stops.`,
        logic: 'In sorted order the smallest member of a zero-sum triplet cannot be positive, so no further triplet can exist.', logicTone: 'warn',
        javaLines: [4], pyLines: [4, 5], algoStep: 1, note: `nums[${i}] = ${s[i]} > 0 → break`,
      });
      break;
    }
    if (i > 0 && s[i] === s[i - 1]) {
      push({
        title: `Skip duplicate ${s[i]}`, tag: 'SKIP i —', desc: `nums[${i}] = ${s[i]} equals nums[${i - 1}], which was already used as the first number, so move to i = ${i + 1}.`,
        alert: `Duplicate anchor ${s[i]}: starting from it again would only repeat triplets already recorded.`,
        logic: 'Starting again from the same value would only rediscover the same triplets.', logicTone: 'warn',
        javaLines: [5], pyLines: [6, 7], algoStep: 1, note: `nums[${i}] == nums[${i - 1}] (${s[i]}) → continue`,
      });
      continue;
    }
    l = i + 1;
    r = n - 1;
    push({
      title: `Fix nums[${i}] = ${s[i]}`, tag: 'FIX —', desc: `i = ${i} (${s[i]}): look for two numbers to the right that add up to ${-s[i]}, using l = ${l} and r = ${r}.`,
      logic: 'With i fixed, the problem becomes Two Sum on a sorted range, which two pointers solve in O(n).', logicTone: 'info',
      javaLines: [6], pyLines: [8], algoStep: 1, note: `need nums[l] + nums[r] = ${-s[i]}`,
    });
    while (l < r) {
      const sum = s[i] + s[l] + s[r];
      const t = `${s[i]} + ${s[l]} + ${s[r]} = ${sum}`;
      if (sum < 0) {
        push({
          title: t, sum, tag: 'SCAN —', desc: `${s[i]} + ${s[l]} + ${s[r]} = ${sum} < 0: too small, so l moves from ${l} to ${l + 1}.`,
          logic: 'r already holds the largest value available, so the only way to raise the sum is a bigger l.', logicTone: 'info',
          javaLines: [8, 9], pyLines: [10, 11, 12], algoStep: 2, note: `sum = ${sum} < 0 → l++`,
        });
        l++;
      } else if (sum > 0) {
        push({
          title: t, sum, tag: 'SCAN —', desc: `${s[i]} + ${s[l]} + ${s[r]} = ${sum} > 0: too large, so r moves from ${r} to ${r - 1}.`,
          logic: 'l already holds the smallest value available, so the only way to lower the sum is a smaller r.', logicTone: 'info',
          javaLines: [8, 10], pyLines: [10, 13, 14], algoStep: 2, note: `sum = ${sum} > 0 → r--`,
        });
        r--;
      } else {
        triplets.push([s[i], s[l], s[r]]);
        hit = [i, l, r];
        push({
          title: t, sum, tag: 'FOUND —', desc: `${s[i]} + ${s[l]} + ${s[r]} = 0: triplet [${s[i]}, ${s[l]}, ${s[r]}] recorded (${triplets.length} so far).`,
          logic: 'Record it, then move both pointers inward and skip equal neighbours so it is not recorded again.', logicTone: 'success',
          javaLines: [8, 11, 12], pyLines: [10, 15, 16], algoStep: 3, note: `res.add([${s[i]}, ${s[l]}, ${s[r]}])`,
        });
        let skipped = 0;
        const fromL = l;
        const fromR = r;
        l++;
        r--;
        while (l < r && s[l] === s[l - 1]) { l++; skipped++; }
        while (l < r && s[r] === s[r + 1]) { r--; skipped++; }
        hit = [];
        push({
          title: 'Move inward and skip duplicates', tag: skipped ? 'SKIP L/R —' : 'MOVE IN —',
          desc: skipped
            ? `l ${fromL} → ${l}, r ${fromR} → ${r}: both moved in, then skipped ${skipped} repeated value${skipped === 1 ? '' : 's'}.`
            : `l ${fromL} → ${l}, r ${fromR} → ${r}: both moved inward; no repeated values to skip.`,
          alert: skipped ? `Skipped ${skipped} repeated value${skipped === 1 ? '' : 's'} next to the recorded triplet so it is not reported twice.` : undefined,
          logic: 'Every unseen triplet with this i must use a different l and a different r, so repeated values are safe to skip.', logicTone: 'info',
          javaLines: [13, 14, 15], pyLines: [17, 18, 19, 20, 21, 22], algoStep: 3, note: `l = ${l}, r = ${r}${skipped ? `, skipped ${skipped}` : ''}`,
        });
      }
    }
  }

  i = -1;
  l = -1;
  r = -1;
  hit = [];
  const text = `[${triplets.map((t) => `[${t.join(',')}]`).join(',')}]`;
  push({
    title: 'Done', tag: '✅ Done!',
    desc: triplets.length ? `${triplets.length} unique triplet${triplets.length === 1 ? '' : 's'} found: ${triplets.map((t) => `[${t.join(', ')}]`).join(' ')}.` : 'No triplet adds up to zero.',
    logic: `Result: ${text}`, logicTone: triplets.length ? 'success' : 'warn', javaLines: [19], pyLines: [23], algoStep: 4,
    note: `return res (${triplets.length} triplet${triplets.length === 1 ? '' : 's'})`,
    result: { title: text, text: triplets.length ? 'Unique triplets that sum to 0' : 'No triplet sums to 0' },
  });
  return steps;
}

export const threeSum: ProblemDef<In> = {
  slug: '15-3sum',
  id: '15', title: '3Sum', difficulty: 'Medium', category: 'Arrays', tag: 'sort + two pointers',
  statement: 'Return all unique triplets [a, b, c] from nums (using three different positions) such that a + b + c = 0. The answer must not contain duplicate triplets; their order does not matter.',
  constraints: '3 ≤ n ≤ 3000 · −10⁵ ≤ nums[i] ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[-1,0,1,2,-1,-4]', input: { nums: [-1, 0, 1, 2, -1, -4] }, output: '[[-1,-1,2],[-1,0,1]]' },
    { label: '[0,0,0,0]', input: { nums: [0, 0, 0, 0] }, output: '[[0,0,0]]' },
    { label: '[0,1,1]', input: { nums: [0, 1, 1] }, output: '[]' },
    { label: '[-2,0,0,2,2,-2]', input: { nums: [-2, 0, 0, 2, 2, -2] }, output: '[[-2,0,2]]' },
  ],
  inputPlaceholder: 'e.g. -1 0 1 2 -1 -4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Fixed number i', state: 'active' }, { label: 'Pointers l and r', state: 'compare' }, { label: 'Triplet found', state: 'found' }, { label: 'Finished as i', state: 'dim' }],
  varLabels: ['i', 'l', 'r', 'sum', 'triplets'],
  emphasis: ['unique triplets', 'a + b + c = 0', 'duplicate triplets'],
  phases: [
    { icon: '🔀', label: 'Sort the array', tone: 'blue' },
    { icon: '📌', label: 'Fix nums[i]', tone: 'cyan' },
    { icon: '🔎', label: 'Scan with l and r', tone: 'green' },
    { icon: '🎯', label: 'Found: record + skip duplicates', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Sort, fix one, squeeze two',
    text: 'Sort the array. For each distinct first number nums[i], run two pointers over the part to its right: if the sum is too small move l right, if too big move r left, and when it hits zero record the triplet and skip repeated values. Skipping duplicates for i, l and r is what keeps the answer unique.',
  },
  java: [
    'public List<List<Integer>> threeSum(int[] nums) {',
    '    Arrays.sort(nums);',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    for (int i = 0; i < nums.length - 2; i++) {',
    '        if (nums[i] > 0) break;',
    '        if (i > 0 && nums[i] == nums[i - 1]) continue;',
    '        int l = i + 1, r = nums.length - 1;',
    '        while (l < r) {',
    '            int sum = nums[i] + nums[l] + nums[r];',
    '            if (sum < 0) l++;',
    '            else if (sum > 0) r--;',
    '            else {',
    '                res.add(Arrays.asList(nums[i], nums[l], nums[r]));',
    '                l++; r--;',
    '                while (l < r && nums[l] == nums[l - 1]) l++;',
    '                while (l < r && nums[r] == nums[r + 1]) r--;',
    '            }',
    '        }',
    '    }',
    '    return res;',
    '}',
  ],
  python: [
    'def three_sum(nums):',
    '    nums.sort()',
    '    res = []',
    '    for i in range(len(nums) - 2):',
    '        if nums[i] > 0:',
    '            break',
    '        if i > 0 and nums[i] == nums[i - 1]:',
    '            continue',
    '        l, r = i + 1, len(nums) - 1',
    '        while l < r:',
    '            s = nums[i] + nums[l] + nums[r]',
    '            if s < 0:',
    '                l += 1',
    '            elif s > 0:',
    '                r -= 1',
    '            else:',
    '                res.append([nums[i], nums[l], nums[r]])',
    '                l += 1',
    '                r -= 1',
    '                while l < r and nums[l] == nums[l - 1]:',
    '                    l += 1',
    '                while l < r and nums[r] == nums[r + 1]:',
    '                    r -= 1',
    '    return res',
  ],
  algorithm: [
    'Sort the array so equal values are adjacent and sums can be steered',
    'For each i, skip it if it repeats the previous value (or stop if nums[i] > 0); set l = i + 1, r = n − 1',
    'While l < r: sum too small → l++, sum too large → r−−',
    'Sum is zero → record the triplet, move both pointers, skip repeated values',
    'When every i is processed, return the list of triplets',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1) extra (plus the output)' }],
  why: 'After sorting, for a fixed i the sum nums[i] + nums[l] + nums[r] grows when l moves right and shrinks when r moves left. If the sum is too small, no pair using the current l and any index ≤ r can reach zero, so l is safely discarded; the symmetric argument discards r when the sum is too large. Each pointer move discards one candidate, giving O(n) per i. Skipping equal values for i, l and r ensures every distinct triplet is reported exactly once.',
};
