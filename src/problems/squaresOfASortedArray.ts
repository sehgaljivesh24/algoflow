import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers in sorted order, e.g. -4 -1 0 3 10');
  if (nums.some((v, i) => i > 0 && nums[i - 1] > v)) throw new Error('The numbers must be sorted in non-decreasing order');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const res: (number | null)[] = Array(n).fill(null);
  const steps: Step[] = [];
  let l = 0;
  let r = n - 1;
  let k = n - 1;

  const cells = (placed?: number): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === placed) state = 'found';
      else if (i < l || i > r) state = 'dim';
      else if (i === l || i === r) state = 'active';
      return { key: i, value, state };
    });
  const ptrs = () => [{ id: 'l', label: 'l', index: l, tone: 'blue' as const }, { id: 'r', label: 'r', index: r, tone: 'orange' as const }];
  const aux = (hl?: number) => [{ title: 'result (filled from the right)', kind: 'list' as const, items: res.map((v) => (v === null ? '?' : String(v))), highlight: hl }];
  const vars = () => ({ l, r, k });

  steps.push({
    title: 'Start', tag: 'START —', desc: `the input is sorted, but squares of negatives are large, so the biggest square is at l = 0 (${nums[0]}) or r = ${n - 1} (${nums[n - 1]}); result is empty and k = ${n - 1}.`,
    cells: cells(), pointers: ptrs(), aux: aux(), vars: vars(),
    logic: 'Squaring turns "far from zero" into "large". The numbers farthest from zero are always at the two ends of a sorted array.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0, note: `l = 0, r = ${n - 1}, k = ${n - 1}`,
  });

  while (l <= r) {
    const left = nums[l] * nums[l];
    const right = nums[r] * nums[r];
    const takeLeft = left > right;
    const idx = takeLeft ? l : r;
    const sq = takeLeft ? left : right;
    res[k] = sq;
    steps.push({
      title: `${takeLeft ? nums[l] : nums[r]}² = ${sq} goes to result[${k}]`, tag: 'PLACE:',
      desc: `left ${nums[l]}² = ${left}, right ${nums[r]}² = ${right}: ${takeLeft ? `${left} > ${right}` : `${right} ≥ ${left}`}, so the ${takeLeft ? 'left' : 'right'} end supplies the biggest remaining square and ${sq} fills result[${k}].`,
      cells: cells(idx), pointers: ptrs(), aux: aux(k), vars: vars(),
      logic: 'The larger square is placed in the last empty slot, so the result is built from largest to smallest.', logicTone: 'success',
      javaLines: takeLeft ? [5, 6] : [7, 8], pyLines: takeLeft ? [5, 6] : [7, 8], algoStep: 1,
      note: `${left} ${takeLeft ? '>' : '≤'} ${right} → res[${k}] = ${sq}`,
    });
    const used = takeLeft ? l : r;
    if (takeLeft) l++;
    else r--;
    k--;
    if (l <= r) {
      steps.push({
        title: `Move the ${takeLeft ? 'left' : 'right'} pointer`, tag: 'MOVE:', desc: `nums[${used}] = ${nums[used]} is used up, so ${takeLeft ? 'l' : 'r'} moves inward to ${takeLeft ? l : r}; ${k + 1} slot${k === 0 ? '' : 's'} remain${k === 0 ? 's' : ''} (k = ${k}).`,
        cells: cells(), pointers: ptrs(), aux: aux(), vars: vars(),
        logic: 'Everything outside [l, r] is already placed.', logicTone: 'info', javaLines: takeLeft ? [6] : [8], pyLines: takeLeft ? [6] : [8], algoStep: 2,
        note: takeLeft ? `l = ${l}, k = ${k}` : `r = ${r}, k = ${k}`,
      });
    }
  }

  const out = res.map(Number);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `every slot is filled, so the squares are in sorted order: [${out.join(', ')}].`, note: `return [${out.join(', ')}]`,
    cells: nums.map((value, i) => ({ key: i, value, state: 'dim' as const })), pointers: [], aux: [{ title: 'result', kind: 'list', items: out.map(String) }], vars: vars(),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [11], pyLines: [9], algoStep: 3,
    result: { title: `[${out.join(', ')}]`, text: 'Squares in non-decreasing order' },
  });
  return steps;
}

export const squaresOfASortedArray: ProblemDef<In> = {
  slug: '977-squares-of-a-sorted-array',
  id: '977', title: 'Squares of a Sorted Array', difficulty: 'Easy', category: 'Arrays', tag: 'two pointers',
  statement: 'Given an integer array sorted in non-decreasing order, return an array of the squares of each number, also sorted in non-decreasing order. Aim for better than squaring and re-sorting.',
  constraints: '1 ≤ n ≤ 10⁴ · −10⁴ ≤ nums[i] ≤ 10⁴ · nums sorted (animation input is limited to 12 numbers)',
  examples: [
    { label: '[-4,-1,0,3,10]', input: { nums: [-4, -1, 0, 3, 10] }, output: '[0,1,9,16,100]' },
    { label: '[-7,-3,2,3,11]', input: { nums: [-7, -3, 2, 3, 11] }, output: '[4,9,9,49,121]' },
    { label: '[-5,-4,-3]', input: { nums: [-5, -4, -3] }, output: '[9,16,25]' },
  ],
  inputPlaceholder: 'sorted, e.g. -4 -1 0 3 10',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pointer positions', state: 'active' }, { label: 'Just squared', state: 'found' }, { label: 'Already used', state: 'dim' }],
  varLabels: ['l', 'r', 'k'],
  approach: {
    title: 'Biggest square is at an end',
    text: 'Put one pointer at each end. The larger of the two squares is the largest remaining one, so drop it into the last free slot of the result and move that pointer inward. Repeat until the pointers cross.',
  },
  java: [
    'public int[] sortedSquares(int[] nums) {',
    '    int n = nums.length;',
    '    int[] res = new int[n];',
    '    int l = 0, r = n - 1;',
    '    for (int k = n - 1; k >= 0; k--) {',
    '        if (nums[l] * nums[l] > nums[r] * nums[r]) {',
    '            res[k] = nums[l] * nums[l]; l++;',
    '        } else {',
    '            res[k] = nums[r] * nums[r]; r--;',
    '        }',
    '    }',
    '    return res;',
    '}',
  ],
  python: [
    'def sorted_squares(nums):',
    '    n = len(nums)',
    '    res = [0] * n',
    '    l, r = 0, n - 1',
    '    for k in range(n - 1, -1, -1):',
    '        if nums[l] ** 2 > nums[r] ** 2:',
    '            res[k] = nums[l] ** 2; l += 1',
    '        else:',
    '            res[k] = nums[r] ** 2; r -= 1',
    '    return res',
  ],
  phases: [
    { icon: '🧰', label: 'Set l, r, k', tone: 'blue' },
    { icon: '⚖️', label: 'Compare squares, place larger', tone: 'gold' },
    { icon: '➡️', label: 'Move used pointer', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['sorted in non-decreasing order', 'squares of each number'],
  algorithm: [
    'Create result of size n; l = 0, r = n − 1, fill index k from n − 1 down',
    'Compare nums[l]² with nums[r]² and put the larger at result[k]',
    'Move the pointer whose square was used, then decrease k',
    'Done: return result once every slot is filled',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n) for the output' }],
  why: 'In a sorted array the values with the largest absolute value are at the ends (the most negative on the left, the most positive on the right). So the maximum square among unplaced elements is always at l or r. Taking it each time yields squares in descending order, which we write from the back.',
};
