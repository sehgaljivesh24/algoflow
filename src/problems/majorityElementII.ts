import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { fmtArr } from './pack1Kit.ts';
import { parseInts } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'the numbers', example: '1 1 1 3 3 2 2 2', minLen: 1, maxLen: 12, lo: -99, hi: 99 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const need = Math.floor(n / 3);
  const steps: Step[] = [];
  let c1: number | null = null;
  let c2: number | null = null;
  let n1 = 0;
  let n2 = 0;

  // current cell: green = matches a candidate, orange = matches neither (cancels), blue = takes a free slot
  const cells = (cur: number, mark?: number | null, done = false, kind: 'adopt' | 'match' | 'cancel' = 'adopt'): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (mark !== undefined && mark !== null) state = value === mark ? 'found' : 'dim';
      else if (done) state = undefined;
      else if (i === cur) state = kind === 'match' ? 'compare' : kind === 'cancel' ? 'swap' : 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (extra: string[] = [], bad?: number[]) => [
    { title: `Votes (answer needs more than ${plural(need, 'copy', 'copies')})`, kind: 'map' as const, items: [`candidate 1 → ${c1 ?? '—'} (votes ${n1})`, `candidate 2 → ${c2 ?? '—'} (votes ${n2})`, ...extra], bad },
  ];
  const vars = (i: number | string, x: number | string) => ({ i, x, c1: c1 ?? '—', n1, c2: c2 ?? '—', n2 });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', tag: 'START —', desc: `n = ${n}, so an answer needs more than ⌊${n}/3⌋ = ${plural(need, 'copy', 'copies')}. At most two values can qualify, so two slots.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'More than n/3 copies means at most two values qualify, so we keep two candidates with two vote counters. A number that matches neither candidate cancels one vote from BOTH (three different numbers cancel each other out).', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `c1 = c2 = none, n1 = n2 = 0, need > ${need}`,
  });

  for (let i = 0; i < n; i++) {
    const x = nums[i];
    let title: string;
    let tag: string;
    let desc: string;
    let note: string;
    let jl: number[];
    let pl: number[];
    let tone: 'info' | 'warn' | 'success' = 'info';
    let algo = 1;
    let kind: 'adopt' | 'match' | 'cancel' = 'match';
    let bad: number[] | undefined;
    if (n1 > 0 && x === c1) {
      n1++;
      title = `${x} matches candidate 1`; tag = 'VOTE +1 (c1):'; desc = `nums[${i}] = ${x} equals candidate 1 → its votes go ${n1 - 1} → ${n1}`; note = `${x} == c1 → n1 = ${n1}`; jl = [3]; pl = [3, 4];
    } else if (n2 > 0 && x === c2) {
      n2++;
      title = `${x} matches candidate 2`; tag = 'VOTE +1 (c2):'; desc = `nums[${i}] = ${x} equals candidate 2 → its votes go ${n2 - 1} → ${n2}`; note = `${x} == c2 → n2 = ${n2}`; jl = [4]; pl = [5, 6];
    } else if (n1 === 0) {
      c1 = x; n1 = 1; kind = 'adopt';
      title = `Slot 1 is free: ${x} becomes candidate 1`; tag = 'NEW CANDIDATE 1:'; desc = `nums[${i}] = ${x} meets an empty slot 1, so candidate 1 = ${x} with 1 vote`; note = `n1 was 0 → c1 = ${x}, n1 = 1`; jl = [5]; pl = [7, 8]; tone = 'success';
    } else if (n2 === 0) {
      c2 = x; n2 = 1; kind = 'adopt';
      title = `Slot 2 is free: ${x} becomes candidate 2`; tag = 'NEW CANDIDATE 2:'; desc = `nums[${i}] = ${x} meets an empty slot 2, so candidate 2 = ${x} with 1 vote`; note = `n2 was 0 → c2 = ${x}, n2 = 1`; jl = [6]; pl = [9, 10]; tone = 'success';
    } else {
      n1--; n2--; kind = 'cancel'; bad = [0, 1];
      title = `${x} matches neither: both lose a vote`; tag = 'CANCEL −1 / −1:'; desc = `nums[${i}] = ${x} matches neither ${c1} nor ${c2}: votes drop to ${n1} and ${n2}, three different numbers cancel`; note = `${x} ∉ {${c1}, ${c2}} → n1 = ${n1}, n2 = ${n2}`; jl = [7]; pl = [11, 12, 13]; tone = 'warn'; algo = 2;
    }
    steps.push({
      title, tag, note, desc, cells: cells(i, undefined, false, kind), pointers: ptr(i), aux: aux([], bad), vars: vars(i, x),
      logic: tone === 'warn' ? 'Removing one copy of three distinct values cannot remove a value that has more than n/3 copies from the pool entirely.' : 'Candidates only change hands when a slot has no votes left.', logicTone: tone,
      javaLines: jl, pyLines: pl, algoStep: algo,
    });
  }

  const found: number[] = [];
  const verify: [string, number | null][] = [['candidate 1', c1], ['candidate 2', c2 !== c1 ? c2 : null]];
  const todo = verify.filter(([, c]) => c !== null);
  steps.push({
    title: 'Pass 1 ends: two suspects', tag: 'PASS 1 DONE —',
    desc: todo.length ? `Survivors: ${todo.map(([l, c]) => `${l} = ${c}`).join(' and ')}. They are only suspects, so count their copies next.` : 'No candidate survived, so nothing needs counting.',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'Cancelling keeps every value with more than n/3 copies among the survivors, but it also keeps values that are not frequent enough.', logicTone: 'warn',
    javaLines: [9], pyLines: [14], algoStep: 3, note: `suspects: c1 = ${c1 ?? 'none'}, c2 = ${c2 ?? 'none'}`,
  });
  for (const [label, c] of verify) {
    if (c === null) continue;
    const cnt = nums.filter((v) => v === c).length;
    const ok = cnt > need;
    if (ok) found.push(c);
    steps.push({
      title: `Verify ${label} = ${c}`, tag: 'VERIFY:', desc: `${c} appears ${cnt} time${cnt === 1 ? '' : 's'} in ${plural(n, 'number')}; ${ok ? `${cnt} > ${need}, so it is an answer` : `${cnt} ≤ ${need}, so it is rejected`}`,
      cells: cells(-1, c), pointers: [], aux: aux([`count of ${c} → ${cnt}`], ok ? undefined : [2]), vars: vars('—', '—'),
      logic: 'Survivors are only candidates. Unlike the n/2 problem there is no guarantee, so a second pass must count them.', logicTone: ok ? 'success' : 'warn',
      javaLines: label === 'candidate 1' ? [15] : [16], pyLines: [14, 15], algoStep: 3,
      note: `count(${c}) = ${cnt} ${ok ? '>' : '≤'} ${need}${ok ? ' → keep' : ' → drop'}`,
      alert: ok ? undefined : `${c} appears only ${cnt} time${cnt === 1 ? '' : 's'}, not more than ${need}: rejected.`,
    });
  }

  const sorted = [...found].sort((a, b) => a - b);
  steps.push({
    title: 'Done', tag: '✅ Done!', note: `return ${fmtArr(sorted)}`,
    desc: sorted.length ? `Values appearing more than ${need} times: ${fmtArr(sorted)}.` : `No value appears more than ${need} times, so the answer is empty.`,
    cells: cells(-1, undefined, true).map((c) => ({ ...c, state: sorted.includes(c.value as number) ? ('found' as CellState) : ('dim' as CellState) })),
    pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'One pass to find at most two candidates, one pass to confirm them: O(n) time, O(1) space.', logicTone: 'success', javaLines: [17], pyLines: [16], algoStep: 4,
    result: { title: fmtArr(sorted), text: sorted.length ? 'Majority elements (> n/3)' : 'No element appears more than n/3 times' },
  });
  return steps;
}

export const majorityElementII: ProblemDef<In> = {
  slug: '229-majority-element-ii',
  id: '229', title: 'Majority Element II', difficulty: 'Medium', category: 'Arrays', tag: 'Boyer-Moore, two candidates',
  statement: 'Return every value that appears more than ⌊n/3⌋ times in the array. Do it in O(n) time and O(1) extra space. Unlike the classic problem, there may be zero, one or two such values.',
  constraints: '1 ≤ n ≤ 5·10⁴, −10⁹ ≤ nums[i] ≤ 10⁹ (animation input is limited to 12 numbers from −99 to 99)',
  examples: [
    { label: '[3,2,3]', input: { nums: [3, 2, 3] }, output: '[3]' },
    { label: '[1,1,1,3,3,2,2,2]', input: { nums: [1, 1, 1, 3, 3, 2, 2, 2] }, output: '[1,2]' },
    { label: '[1,2,3,4,5,6]', input: { nums: [1, 2, 3, 4, 5, 6] }, output: '[]' },
  ],
  inputPlaceholder: 'e.g. 1 1 1 3 3 2 2 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Takes a free slot', state: 'active' }, { label: 'Matches a candidate (+1)', state: 'compare' }, { label: 'Matches neither (−1 / −1)', state: 'swap' }, { label: 'Processed', state: 'sorted' }, { label: 'Counted / accepted value', state: 'found' }],
  emphasis: ['more than ⌊n/3⌋', 'O(n) time', 'O(1) extra space'],
  phases: [
    { icon: '🗳️', label: 'Start: two empty slots', tone: 'blue' },
    { icon: '➕', label: 'Match or take a slot', tone: 'green' },
    { icon: '✂️', label: 'Cancel: both lose a vote', tone: 'orange' },
    { icon: '🔎', label: 'Verify the two suspects', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['i', 'x', 'c1', 'n1', 'c2', 'n2'],
  approach: {
    title: 'Boyer-Moore with two candidates, then verify',
    text: 'Track two candidates with two vote counters. A number equal to a live candidate adds a vote. Otherwise it fills a free slot, or — if both slots are busy — removes one vote from each. Whatever survives is only a suspect, so count both of them in a second pass.',
  },
  java: [
    'public List<Integer> majorityElement(int[] nums) {',
    '    int c1 = 0, c2 = 0, n1 = 0, n2 = 0;',
    '    for (int x : nums) {',
    '        if (n1 > 0 && x == c1) n1++;',
    '        else if (n2 > 0 && x == c2) n2++;',
    '        else if (n1 == 0) { c1 = x; n1 = 1; }',
    '        else if (n2 == 0) { c2 = x; n2 = 1; }',
    '        else { n1--; n2--; }',
    '    }',
    '    int cnt1 = 0, cnt2 = 0;',
    '    for (int x : nums) {',
    '        if (x == c1) cnt1++;',
    '        else if (x == c2) cnt2++;',
    '    }',
    '    List<Integer> res = new ArrayList<>();',
    '    if (cnt1 > nums.length / 3) res.add(c1);',
    '    if (cnt2 > nums.length / 3) res.add(c2);',
    '    return res;',
    '}',
  ],
  python: [
    'def majority_element(nums):',
    '    c1 = c2 = n1 = n2 = 0',
    '    for x in nums:',
    '        if n1 and x == c1:',
    '            n1 += 1',
    '        elif n2 and x == c2:',
    '            n2 += 1',
    '        elif n1 == 0:',
    '            c1, n1 = x, 1',
    '        elif n2 == 0:',
    '            c2, n2 = x, 1',
    '        else:',
    '            n1 -= 1',
    '            n2 -= 1',
    '    cnt1 = nums.count(c1)',
    '    cnt2 = nums.count(c2) if c2 != c1 else 0',
    '    return [c for c, k in ((c1, cnt1), (c2, cnt2)) if k > len(nums) // 3]',
  ],
  algorithm: [
    'Keep two candidates and two vote counters, all starting empty',
    'A number equal to a live candidate adds a vote; otherwise it takes a free slot',
    'If no slot is free, the number removes one vote from both candidates',
    'Count both survivors in a second pass and keep those with more than ⌊n/3⌋ copies',
    'Return the survivors that passed the count (possibly none)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Each cancellation removes one copy of three different numbers. If a value had more than n/3 copies and every one of them were cancelled, that would consume more than 2n/3 other numbers as well, i.e. more than n numbers in total: impossible. So at least one copy of every qualifying value survives as a candidate. Survivors are only suspects (they may be rare), which is why the counting pass is mandatory.',
};
