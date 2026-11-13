import type { Cell, CellState, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: numbers | k, e.g. 1 3 -1 -3 5 3 6 7 | 3');
  const nums = parts[0].split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(parts[1].trim());
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers before the "|"');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  if (!Number.isInteger(k) || k < 1 || k > nums.length) throw new Error(`k must be a whole number from 1 to ${nums.length}`);
  return { nums, k };
}

/**
 * One step per event: start, then for every index the pops from the back (one step each), the push, an optional expiry at
 * the front, and (once the first window is full) one step that records the maximum. Finally the result.
 */
function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const dq: number[] = []; // indexes with strictly decreasing values from front to back
  const ans: number[] = [];
  const steps: Step[] = [];

  const cells = (cur: number, gone = -1): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === gone) state = 'error';
      else if (i === cur) state = 'active';
      else if (dq.length && i === dq[0]) state = 'found';
      else if (dq.includes(i)) state = 'sorted';
      else if (cur >= 0 && i > cur - k && i <= cur) state = 'compare';
      return { key: i, value, state };
    });
  const aux = () => [
    { title: 'deque of candidates (index:value, front = window max)', kind: 'queue' as const, items: dq.map((i) => `${i}:${nums[i]}`), highlight: dq.length ? 0 : undefined },
    { title: 'window maximums so far', kind: 'list' as const, items: ans.map(String) },
  ];
  const dqText = () => `[${dq.map((x) => nums[x]).join(', ')}]`;
  const vars = (i: number | string) => ({
    i,
    window: typeof i === 'number' ? `[${Math.max(0, i - k + 1)}..${i}]` : '—',
    deque: dq.length ? dqText() : '[]',
    'window max': dq.length && typeof i === 'number' && i >= k - 1 ? nums[dq[0]] : '—',
  });
  const ptr = (i: number) => [{ id: 'r', label: 'R', index: i, tone: 'orange' as const }, ...(i - k + 1 >= 0 ? [{ id: 'l', label: 'L', index: i - k + 1, tone: 'blue' as const }] : [])];
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, cur: number, gone: number, j: number[], p: number[], a: number, alert?: string) =>
    steps.push({ title, tag, desc, note, alert, cells: cells(cur, gone), pointers: cur >= 0 ? ptr(cur) : [], aux: aux(), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a });

  add('Start', 'READY —', `Find the maximum of every window of size ${k}. The deque is empty; ${n - k + 1} window${n - k + 1 === 1 ? '' : 's'} will be reported.`,
    `dq = [], ${n - k + 1} windows of size ${k}`,
    'The deque stores indexes of numbers that could still become a window maximum. Values decrease from front to back, so the front is always the maximum.', 'info', -1, -1, [1, 2, 3], [1], 0);

  for (let i = 0; i < n; i++) {
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) {
      const j = dq.pop()!;
      add(`Drop ${nums[j]} from the back`, 'POP BACK:', `nums[${i}]=${nums[i]} ≥ nums[${j}]=${nums[j]} and is newer, so index ${j} can never be a maximum. Deque is now ${dqText()}.`,
        `${nums[j]} ≤ ${nums[i]} → pollLast(${j})`,
        'Pop from the back while the last candidate is not bigger than the new number: the newer, bigger one outlives it.', 'warn', i, j, [5, 6], [3, 4], 0,
        `${nums[j]} is dominated by ${nums[i]}: it can never be a window maximum again.`);
    }
    const back = dq.length ? nums[dq[dq.length - 1]] : null;
    dq.push(i);
    add(`Add index ${i}`, 'PUSH:', back === null
      ? `nums[${i}]=${nums[i]} goes into the empty deque. It reads ${dqText()}.`
      : `nums[${i}]=${nums[i]} < back ${back}, so keep both. Deque reads ${dqText()}, decreasing.`,
    `addLast(${i}) → deque ${dqText()}`,
    'Every index in the deque is still inside, or about to enter, the window.', 'info', i, -1, [7], [5], 1);
    if (dq[0] <= i - k) {
      const j = dq.shift()!;
      add(`Index ${j} left the window`, 'EXPIRE:', `window is [${i - k + 1}..${i}], so index ${j} (${nums[j]}) slid out. Remove it from the front; deque ${dqText()}.`,
        `${j} ≤ ${i} − ${k} = ${i - k} → pollFirst()`,
        'The front is the oldest candidate; once it slides out of the window it must go.', 'warn', i, j, [8], [6, 7], 2,
        `Index ${j} is no longer inside the window [${i - k + 1}..${i}].`);
    }
    if (i >= k - 1) {
      ans.push(nums[dq[0]]);
      add(`Window [${i - k + 1}, ${i}] max = ${nums[dq[0]]}`, 'RECORD:', `window [${i - k + 1}..${i}] → front index ${dq[0]} holds ${nums[dq[0]]}, so ans gets ${nums[dq[0]]} (${ans.length} of ${n - k + 1})`,
        `ans[${i - k + 1}] = nums[${dq[0]}] = ${nums[dq[0]]}`,
        'Reading the front is O(1).', 'success', i, -1, [9], [8, 9], 3);
    }
  }

  const text = JSON.stringify(ans);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `${ans.length} windows, one maximum for each: ${text}`, note: `return ${text}`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Result: ${text}`, logicTone: 'success', javaLines: [11], pyLines: [10], algoStep: 4, result: { title: text, text: 'Maximum of each sliding window' },
  });
  return steps;
}

export const slidingWindowMaximum: ProblemDef<In> = {
  slug: '239-sliding-window-maximum',
  id: '239', title: 'Sliding Window Maximum', difficulty: 'Hard', category: 'Queue', tag: 'monotonic deque',
  statement: 'Given an array and a window size k, slide the window from left to right one step at a time and return the maximum of every window. A monotonic deque of indexes keeps the candidates: the front is always the maximum.',
  emphasis: ['maximum of every window', 'monotonic deque'],
  constraints: '1 ≤ k ≤ n ≤ 10⁵ (animation input is limited to 12 numbers), −10⁴ ≤ nums[i] ≤ 10⁴',
  examples: [
    { label: '1 3 -1 -3 5 3 6 7 | k = 3', input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 }, output: '[3,3,5,5,6,7]', answer: '[3, 3, 5, 5, 6, 7] (one maximum per window)' },
    { label: '1 | k = 1', input: { nums: [1], k: 1 }, output: '[1]' },
    { label: '9 8 7 6 5 | k = 2', input: { nums: [9, 8, 7, 6, 5], k: 2 }, output: '[9,8,7,6]' },
  ],
  inputPlaceholder: 'numbers | k, e.g. 1 3 -1 -3 5 3 6 7 | 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current number (R)', state: 'active' }, { label: 'Window maximum (deque front)', state: 'found' }, { label: 'Other candidate in deque', state: 'sorted' }, { label: 'In window', state: 'compare' }, { label: 'Just removed', state: 'error' }],
  varLabels: ['i', 'window', 'deque', 'window max'],
  phases: [
    { icon: '🧹', label: 'POP BACK (dominated)', tone: 'orange' },
    { icon: '⬇', label: 'PUSH index', tone: 'blue' },
    { icon: '⌛', label: 'EXPIRE front', tone: 'orange' },
    { icon: '★', label: 'RECORD max', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A monotonic deque of candidates',
    text: 'Keep indexes in a deque whose values decrease from front to back. For each new number, drop smaller numbers from the back (they can never win again), push the new index, and drop the front if it slid out of the window. The front is the current window maximum.',
  },
  java: [
    'public int[] maxSlidingWindow(int[] nums, int k) {',
    '    int n = nums.length;',
    '    int[] ans = new int[n - k + 1];',
    '    Deque<Integer> dq = new ArrayDeque<>();',
    '    for (int i = 0; i < n; i++) {',
    '        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i])',
    '            dq.pollLast();',
    '        dq.addLast(i);',
    '        if (dq.peekFirst() <= i - k) dq.pollFirst();',
    '        if (i >= k - 1) ans[i - k + 1] = nums[dq.peekFirst()];',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def max_sliding_window(nums, k):',
    '    dq, ans = deque(), []',
    '    for i, x in enumerate(nums):',
    '        while dq and nums[dq[-1]] <= x:',
    '            dq.pop()',
    '        dq.append(i)',
    '        if dq[0] <= i - k:',
    '            dq.popleft()',
    '        if i >= k - 1:',
    '            ans.append(nums[dq[0]])',
    '    return ans',
  ],
  algorithm: [
    'Pop smaller (or equal) numbers off the back of the deque',
    'Push the new index at the back',
    'Pop the front if its index is outside the window',
    'Once the first window is complete, record the front of the deque as the maximum',
    'Return the recorded maximums',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(k)' }],
  why: 'An element that is smaller than a newer element can never be the maximum of any window containing both, and the newer one also leaves the window later, so it is safe to discard. What remains is decreasing, so the front is the maximum, and expiry only ever happens at the front (the oldest). Each index enters and leaves the deque once.',
};
