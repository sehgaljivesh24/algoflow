import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { parseInts } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'the stream', example: '2 2 1 1 1 2 2', minLen: 1, maxLen: 12, lo: 0, hi: 99 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let candidate = -1;
  let votes = 0;
  let count = 0;
  let phase: 1 | 2 = 1;

  // pass 1: green = matches the candidate, orange = differs, blue = adopted; pass 2: the current cell is blue, copies turn gold
  const cells = (cur: number, final = false, kind: 'adopt' | 'match' | 'differ' = 'adopt'): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (final) state = value === candidate && count > n / 2 ? 'found' : 'dim';
      else if (phase === 2) state = i === cur ? 'active' : i < cur ? (value === candidate ? 'found' : 'dim') : undefined;
      else if (i === cur) state = kind === 'match' ? 'compare' : kind === 'differ' ? 'swap' : 'active';
      else state = i < cur ? 'sorted' : undefined;
      return { key: i, value, state };
    });
  const aux = (bad?: number[]) => [{
    title: phase === 1 ? 'Pass 1: votes' : 'Pass 2: verification (count vs n/2)',
    kind: 'map' as const,
    items: phase === 1 ? [`candidate → ${candidate < 0 ? '—' : candidate}`, `votes → ${votes}`] : [`candidate → ${candidate}`, `copies seen → ${count}`, `needed → more than ${n / 2}`],
    bad,
  }];
  const vars = (i: number | string) => ({ i, candidate: candidate < 0 ? '—' : candidate, votes, count });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', tag: 'START —', desc: `n = ${n}, so a majority needs more than ${plural(n / 2, 'copy', 'copies')}. Nothing guarantees one exists, so pass 1 only picks a suspect.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'Nothing guarantees a majority exists. Boyer-Moore always ends with a candidate, but that candidate is only a suspect. It needs a second pass to be confirmed.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'candidate = none, votes = 0',
  });

  for (let i = 0; i < n; i++) {
    const x = nums[i];
    const before = votes;
    const p = ptr(i);
    if (votes === 0) {
      candidate = x; votes = 1;
      steps.push({
        title: `No votes left: ${x} becomes the candidate`, tag: 'NEW CANDIDATE:',
        desc: `nums[${i}] = ${x} arrives with votes = 0, so ${x} is adopted as the candidate with 1 vote`,
        cells: cells(i), pointers: p, aux: aux(), vars: vars(i),
        logic: 'Pair each differing number with a candidate copy and cancel the pair. Only the unpaired leftovers can still be a majority.', logicTone: 'success',
        javaLines: [3, 4], pyLines: [3, 4, 5], algoStep: 1, note: `votes was 0 → candidate = ${x}, votes = 1`,
      });
    } else if (x === candidate) {
      votes++;
      steps.push({
        title: `${x} equals the candidate: votes = ${votes}`, tag: 'VOTE +1:',
        desc: `nums[${i}] = ${x} equals candidate ${candidate} → votes go ${before} → ${votes}`,
        cells: cells(i, false, 'match'), pointers: p, aux: aux(), vars: vars(i),
        logic: 'Equal numbers reinforce the candidate.', logicTone: 'info',
        javaLines: [4], pyLines: [5], algoStep: 2, note: `${x} == ${candidate} → votes ${before} + 1 = ${votes}`,
      });
    } else {
      votes--;
      steps.push({
        title: `${x} differs from ${candidate}: votes = ${votes}`, tag: 'VOTE −1:',
        desc: `nums[${i}] = ${x} ≠ candidate ${candidate}: the pair cancels out → votes go ${before} → ${votes}`,
        cells: cells(i, false, 'differ'), pointers: p, aux: aux(votes === 0 ? [1] : undefined), vars: vars(i),
        logic: 'Pair each differing number with a candidate copy and cancel the pair. Only the unpaired leftovers can still be a majority.', logicTone: 'warn',
        javaLines: [4], pyLines: [5], algoStep: 2, note: `${x} != ${candidate} → votes ${before} − 1 = ${votes}`,
      });
    }
  }

  phase = 2;
  steps.push({
    title: `Pass 1 ends with candidate ${candidate}`, tag: 'PASS 1 DONE —',
    desc: `The survivor is ${candidate}${votes === 0 ? ', although its votes dropped to 0 (it is just the last value adopted)' : ` with ${votes} spare vote${votes === 1 ? '' : 's'}`}. It is only a suspect: count its copies.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The survivor of a vote with no guarantee can be any value. Never return it without verifying.', logicTone: 'warn',
    javaLines: [6], pyLines: [6], algoStep: 3, note: `suspect = ${candidate}, count = 0`,
  });
  for (let i = 0; i < n; i++) {
    const copy = nums[i] === candidate;
    if (copy) count++;
    steps.push({
      title: copy ? `nums[${i}] = ${nums[i]} is a copy: count = ${count}` : `nums[${i}] = ${nums[i]} is a different value`,
      tag: 'VERIFY:',
      desc: copy ? `nums[${i}] = ${nums[i]} is a copy of ${candidate} → count = ${count} of the first ${plural(i + 1, 'number')}` : `nums[${i}] = ${nums[i]} is not ${candidate} → count stays ${count} after ${plural(i + 1, 'number')}`,
      cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(i),
      logic: 'A plain counting scan, no cleverness needed.', logicTone: copy ? 'success' : 'info',
      javaLines: [8], pyLines: [6], algoStep: 3, note: copy ? `${nums[i]} == ${candidate} → count = ${count}` : `${nums[i]} != ${candidate} → count = ${count}`,
    });
  }

  const ok = count > n / 2;
  const ans = ok ? candidate : -1;
  steps.push({
    title: ok ? `Verified: ${candidate} is the majority` : 'Rejected: no majority exists', tag: ok ? '✅ Done!' : '❌ Rejected!',
    desc: ok ? `${count} > ${n / 2}, so ${candidate} appears more than half the time: return ${candidate}.` : `${count} ≤ ${n / 2}, so the suspect ${candidate} is not a majority: return −1.`,
    cells: cells(-1, true), pointers: [], aux: aux(ok ? undefined : [1]), vars: vars('—'),
    logic: ok ? 'Both passes agree.' : 'This is the case the verification pass exists for.', logicTone: ok ? 'success' : 'warn',
    javaLines: [9], pyLines: [7], algoStep: 4, note: ok ? `${count} > ${n / 2} → return ${candidate}` : `${count} <= ${n / 2} → return -1`,
    alert: ok ? undefined : `Suspect ${candidate} has only ${count} of ${n} copies, not more than ${n / 2}: no majority.`,
    result: { title: String(ans), text: ok ? `${candidate} appears ${count} of ${n} times` : 'No value appears more than n/2 times' },
  });
  return steps;
}

export const majorityWithVerification: ProblemDef<In> = {
  slug: 'cp-majority-element-with-verification',
  id: 'CP', title: 'Majority Element with Verification', difficulty: 'Medium', category: 'Arrays', tag: 'Boyer-Moore: candidate then verify',
  statement: 'Given a list of non-negative values, return the value that appears strictly more than n/2 times, or −1 if no value does. Use O(1) extra space: one pass to pick a candidate, a second pass to confirm it.',
  constraints: '1 ≤ n, values ≥ 0; a majority is NOT guaranteed (animation input is limited to 12 values from 0 to 99)',
  examples: [
    { label: '2 2 1 1 1 2 2 (majority exists)', input: { nums: [2, 2, 1, 1, 1, 2, 2] }, output: '2' },
    { label: '1 2 3 1 2 3 (no majority)', input: { nums: [1, 2, 3, 1, 2, 3] }, output: '-1' },
    { label: '5 5 5 1 2 3 4 (wrong suspect)', input: { nums: [5, 5, 5, 1, 2, 3, 4] }, output: '-1' },
  ],
  inputPlaceholder: 'e.g. 2 2 1 1 1 2 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current / new candidate', state: 'active' }, { label: 'Matches candidate (+1)', state: 'compare' }, { label: 'Differs (−1)', state: 'swap' }, { label: 'Read in pass 1', state: 'sorted' }, { label: 'Copy of the candidate', state: 'found' }],
  emphasis: ['more than n/2', 'or −1', 'O(1) extra space'],
  phases: [
    { icon: '🗳️', label: 'Start: no candidate', tone: 'blue' },
    { icon: '🆕', label: 'Pass 1: adopt (votes = 0)', tone: 'gold' },
    { icon: '⚖️', label: 'Pass 1: vote +1 / −1', tone: 'cyan' },
    { icon: '🔎', label: 'Pass 2: verify the suspect', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['i', 'candidate', 'votes', 'count'],
  approach: {
    title: 'Vote first, then prove it',
    text: 'Pass 1 is classic Boyer-Moore: adopt the current number when the votes are zero, add a vote for a match, remove one otherwise. Without a guarantee the survivor may be nonsense, so pass 2 counts its copies and returns it only if it beats n/2.',
  },
  java: [
    'public int majority(int[] nums) {',
    '    int candidate = -1, votes = 0;',
    '    for (int x : nums) {                    // pass 1: find a suspect',
    '        if (votes == 0) candidate = x;',
    '        votes += (x == candidate) ? 1 : -1;',
    '    }',
    '    int count = 0;',
    '    for (int x : nums)                      // pass 2: verify',
    '        if (x == candidate) count++;',
    '    return count > nums.length / 2 ? candidate : -1;',
    '}',
  ],
  python: [
    'def majority(nums):',
    '    candidate, votes = -1, 0',
    '    for x in nums:',
    '        if votes == 0:',
    '            candidate = x',
    '        votes += 1 if x == candidate else -1',
    '    count = sum(1 for x in nums if x == candidate)',
    '    return candidate if count > len(nums) // 2 else -1',
  ],
  algorithm: [
    'Start with no candidate and 0 votes',
    'Pass 1: when votes are 0 adopt the current number as the candidate',
    'Pass 1: add a vote for a match, remove a vote for any other number',
    'Pass 2: count the candidate\'s copies and compare the count with n/2',
    'Return the candidate if the count exceeds n/2, otherwise −1',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'If a majority exists, cancelling pairs of different numbers can never remove all of its copies, so it is exactly the survivor. The converse is false: when no majority exists the survivor is arbitrary. The verification pass turns the one-directional guarantee ("a majority must be the survivor") into an exact answer.',
};
