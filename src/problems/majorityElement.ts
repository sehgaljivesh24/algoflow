import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces, e.g. 2 2 1 1 1 2 2');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  const tally = new Map<number, number>();
  for (const x of nums) tally.set(x, (tally.get(x) ?? 0) + 1);
  if (![...tally.values()].some((c) => c > nums.length / 2)) throw new Error('A majority element must appear more than n/2 times — try 2 2 1 1 1 2 2');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let candidate: number | null = null;
  let count = 0;
  // current cell: green when it matches the candidate, orange when it differs, blue when it is adopted
  const cells = (cur: number, kind: 'adopt' | 'match' | 'differ' = 'adopt'): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = kind === 'match' ? 'compare' : kind === 'differ' ? 'swap' : 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (cancelled = false) => [{
    title: 'Votes (candidate → count)',
    kind: 'map' as const,
    items: [`candidate → ${candidate ?? '—'}`, `votes → ${count}`],
    bad: cancelled ? [1] : undefined,
  }];
  const vars = (i: number | string, x: number | string) => ({ i, x, candidate: candidate ?? '—', count });

  steps.push({
    title: 'Start', tag: 'START —', desc: `n = ${n}, so the majority must appear more than ${n / 2} times. No candidate yet, votes = 0.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'Think of a vote: the candidate gains a vote from each copy of itself and loses one to every different number. The true majority has more votes than all other values combined, so it cannot be cancelled out.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'candidate = none, count = 0',
  });

  for (let i = 0; i < n; i++) {
    const x = nums[i];
    const before = count;
    if (count === 0) {
      candidate = x;
      count = 1;
      steps.push({
        title: `Votes were 0: new candidate ${x}`, tag: 'NEW CANDIDATE:',
        desc: `nums[${i}] = ${x} arrives with count = ${before}, so ${x} takes over as candidate with 1 vote`,
        cells: cells(i, 'adopt'), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(), vars: vars(i, x),
        logic: 'With no votes left, whatever earlier numbers cancelled out are gone, so the current number starts a fresh candidacy.', logicTone: 'success',
        javaLines: [4, 5], pyLines: [4, 5], algoStep: 1, note: `count was 0 → candidate = ${x}, count = 1`,
      });
    } else if (x === candidate) {
      count++;
      steps.push({
        title: `${x} matches the candidate`, tag: 'VOTE +1:',
        desc: `nums[${i}] = ${x} equals candidate ${candidate} → votes go ${before} → ${count}`,
        cells: cells(i, 'match'), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(), vars: vars(i, x),
        logic: 'Equal numbers reinforce the candidate.', logicTone: 'info',
        javaLines: [5], pyLines: [5], algoStep: 2, note: `${x} == ${candidate} → count ${before} + 1 = ${count}`,
      });
    } else {
      count--;
      steps.push({
        title: `${x} differs from ${candidate}`, tag: 'VOTE −1:',
        desc: `nums[${i}] = ${x} ≠ candidate ${candidate}: the pair cancels out → votes go ${before} → ${count}${count === 0 ? ', next number picks a new candidate' : ''}`,
        cells: cells(i, 'differ'), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(count === 0), vars: vars(i, x),
        logic: count === 0 ? 'A pair of different numbers cancelled out. Neither can be the majority just because of this pair.' : 'Different numbers cancel one vote each.', logicTone: 'warn',
        javaLines: [5], pyLines: [5], algoStep: 2, note: `${x} != ${candidate} → count ${before} − 1 = ${count}`,
      });
    }
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `The surviving candidate is ${candidate}, which fills ${nums.filter((v) => v === candidate).length} of the ${n} cells: the majority element.`,
    cells: nums.map((value, i) => ({ key: i, value, state: (value === candidate ? 'found' : 'dim') as CellState })), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'Because a majority is guaranteed, the survivor must be it. (Without that guarantee you would run a second pass to verify.)', logicTone: 'success',
    javaLines: [7], pyLines: [6], algoStep: 3, note: `return ${candidate}`,
    result: { title: String(candidate), text: `${candidate} is the majority element` },
  });
  return steps;
}

export const majorityElement: ProblemDef<In> = {
  slug: '169-majority-element',
  id: '169', title: 'Majority Element', difficulty: 'Easy', category: 'Arrays', tag: 'Boyer-Moore voting',
  statement: 'Return the value that appears more than n/2 times in the array. You may assume such a value always exists. Aim for O(n) time and O(1) extra space.',
  constraints: '1 ≤ n ≤ 5·10⁴; a majority element always exists (animation input is limited to 12 numbers)',
  examples: [
    { label: '[3,2,3]', input: { nums: [3, 2, 3] }, output: '3' },
    { label: '[2,2,1,1,1,2,2]', input: { nums: [2, 2, 1, 1, 1, 2, 2] }, output: '2' },
    { label: '[1,2,1,3,1,4,1]', input: { nums: [1, 2, 1, 3, 1, 4, 1] }, output: '1' },
  ],
  inputPlaceholder: 'e.g. 2 2 1 1 1 2 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'New candidate', state: 'active' }, { label: 'Matches candidate (+1)', state: 'compare' }, { label: 'Differs (−1)', state: 'swap' }, { label: 'Processed', state: 'sorted' }, { label: 'Majority element', state: 'found' }],
  emphasis: ['more than n/2', 'O(n)', 'O(1) extra space'],
  phases: [
    { icon: '🗳️', label: 'Start: no candidate', tone: 'blue' },
    { icon: '🆕', label: 'Adopt candidate (count = 0)', tone: 'gold' },
    { icon: '⚖️', label: 'Vote: +1 match / −1 differ', tone: 'cyan' },
    { icon: '✅', label: 'Done: survivor', tone: 'green' },
  ],
  varLabels: ['i', 'x', 'candidate', 'count'],
  approach: {
    title: 'Boyer-Moore voting',
    text: 'Keep one candidate and a vote counter. When the counter is zero, adopt the current number. Equal numbers add a vote, different numbers remove one. The majority element survives.',
  },
  java: [
    'public int majorityElement(int[] nums) {',
    '    int candidate = 0, count = 0;',
    '    for (int x : nums) {',
    '        if (count == 0)',
    '            candidate = x;',
    '        count += (x == candidate) ? 1 : -1;',
    '    }',
    '    return candidate;',
    '}',
  ],
  python: [
    'def majority_element(nums):',
    '    candidate, count = None, 0',
    '    for x in nums:',
    '        if count == 0:',
    '            candidate = x',
    '        count += 1 if x == candidate else -1',
    '    return candidate',
  ],
  algorithm: [
    'Start with no candidate and a vote count of 0',
    'If the count is 0, make the current number the candidate',
    'Add 1 vote if the number equals the candidate, otherwise remove 1',
    'After the last number, the candidate is the majority element',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Pair every non-candidate number with a candidate number and cancel them out. The majority element appears more than all other values put together, so at least one copy of it is left unpaired no matter how the pairing goes — and that unpaired copy is what the counter ends on.',
};
