import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { rng } from './graphKit.ts';
import { recorder } from './stepKit.ts';
import { intIn, intList, semis } from './p4Kit.ts';

interface In { nums: number[]; target: number; seed: number }

const FORMAT = 'numbers ; target ; seed — e.g. 1 2 3 3 3 ; 3 ; 5';

function parse(raw: string): In {
  const p = semis(raw, 3, FORMAT);
  const nums = intList(p[0], { what: 'the array', max: 10, lo: -50, hi: 50, example: '1 2 3 3 3' });
  const target = intIn(p[1], -50, 50, 'target');
  if (!nums.includes(target)) throw new Error('The target must appear in the array at least once');
  return { nums, target, seed: intIn(p[2], 0, 999, 'seed') };
}

/** Deterministic reference: the index pick(target) returns for this seed. */
export function pickIndex(nums: number[], target: number, seed: number): number {
  const rand = rng(seed);
  let chosen = -1;
  let seen = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== target) continue;
    seen++;
    if (Math.floor(rand() * seen) === 0) chosen = i;
  }
  return chosen;
}

function build({ nums, target, seed }: In): Step[] {
  const rand = rng(seed);
  const matches: number[] = [];
  const draws: string[] = [];
  let i = -1;
  let chosen = -1;
  let seen = 0;
  let draw: number | string = '—';
  const steps: Step[] = [];

  const say = recorder(steps, () => ({
    cells: nums.map((v, j): Cell => ({
      key: j, value: v,
      state: j === chosen ? 'found' : j === i ? (v === target ? 'active' : 'compare') : v === target && matches.includes(j) ? 'sorted' : j > i ? undefined : 'dim',
    })),
    pointers: [
      ...(i >= 0 ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : []),
      ...(chosen >= 0 && chosen !== i ? [{ id: 'pick', label: 'pick', index: chosen, tone: 'green' as const }] : []),
    ],
    aux: [
      { title: `draws among matches (seed ${seed})`, kind: 'list' as const, items: [...draws] },
      { title: 'indices equal to the target', kind: 'list' as const, items: matches.map(String) },
    ],
    vars: { i: i >= 0 ? i : '—', 'matches seen': seen, draw, pick: chosen >= 0 ? chosen : '—' },
  }));

  say({
    title: 'Start', desc: `Return a random index j with nums[j] = ${target}, every such index equally likely, without storing the list of matches.`,
    logic: 'Only matching indices take part in the lottery: the k-th match replaces the pick with probability 1/k.', java: [5], py: [4], algo: 0,
    tag: 'READY —', note: `chosen = -1, seen = 0`,
  });
  for (let j = 0; j < nums.length; j++) {
    i = j;
    if (nums[j] !== target) {
      say({
        title: `nums[${j}] = ${nums[j]} ≠ ${target}`, tag: 'SKIP —', note: `nums[${j}] = ${nums[j]} != ${target} → continue (seen stays ${seen})`,
        alert: `${nums[j]} is not the target ${target}: it takes no part in the lottery.`,
        desc: `nums[${j}] = ${nums[j]} is not ${target}: skipped, count and pick unchanged (seen = ${seen}).`,
        logic: 'Non-matching elements must never influence the sample.', java: [7], py: [6, 7], algo: 1,
      });
      continue;
    }
    seen++;
    matches.push(j);
    const r = Math.floor(rand() * seen);
    draw = r;
    const keep = r === 0;
    if (keep) chosen = j;
    draws.push(`match ${seen} (index ${j}): rand(0..${seen - 1}) = ${r} → ${keep ? 'keep' : 'skip'}`);
    say({
      title: `Match #${seen} at index ${j}: draw ${r}`,
      tag: `MATCH #${seen} —`, note: keep ? `seen = ${seen}; rand.nextInt(${seen}) = ${r} == 0 → chosen = ${j}` : `seen = ${seen}; rand.nextInt(${seen}) = ${r} ≠ 0 → chosen stays ${chosen}`,
      desc: keep ? `Draw ${r} is 0 (chance 1/${seen}) → 🎯 index ${j} becomes the pick.` : `Draw ${r} ≠ 0 (chance ${seen - 1}/${seen}) → the pick stays index ${chosen}.`,
      logic: `After ${seen} match${seen === 1 ? '' : 'es'}, each of them is the pick with probability 1/${seen}.`, tone: keep ? 'success' : 'info', java: [8, 9], py: [8, 9, 10], algo: keep ? 3 : 2,
    });
  }
  i = -1;
  say({
    title: 'Done', tag: '✅ Done!', note: `return ${chosen}`, desc: `${seen} index${seen === 1 ? '' : 'es'} matched; the sampled one is index ${chosen} (each had chance 1/${seen}).`,
    logic: 'Each match ends up chosen with probability 1/seen, using O(1) extra memory.', tone: 'success', java: [11], py: [11], algo: 4,
    result: { title: String(chosen), text: `Randomly picked index with value ${target}` },
  });
  return steps;
}

export const randomPickIndex: ProblemDef<In> = {
  slug: '398-random-pick-index',
  id: '398', title: 'Random Pick Index', difficulty: 'Medium', category: 'Randomized & Streaming', tag: 'reservoir sampling over matches',
  statement: 'Given an integer array that may contain duplicates, pick(target) must return a random index i with nums[i] == target, each such index equally likely. The target is guaranteed to exist.',
  constraints: '1 ≤ n ≤ 2 × 10⁴ (animation: ≤ 10 numbers in −50..50; the seed fixes the pseudo-random draws; write numbers ; target ; seed)',
  examples: [
    { label: '1 2 3 3 3 ; target 3 ; seed 5', input: { nums: [1, 2, 3, 3, 3], target: 3, seed: 5 }, output: String(pickIndex([1, 2, 3, 3, 3], 3, 5)) },
    { label: '4 1 4 2 4 4 ; target 4 ; seed 12', input: { nums: [4, 1, 4, 2, 4, 4], target: 4, seed: 12 }, output: String(pickIndex([4, 1, 4, 2, 4, 4], 4, 12)) },
    { label: '9 8 7 ; target 8 ; seed 1', input: { nums: [9, 8, 7], target: 8, seed: 1 }, output: '1' },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Index being checked (a match)', state: 'active' }, { label: 'Checked, not a match', state: 'compare' }, { label: 'Earlier match', state: 'sorted' }, { label: 'Current pick', state: 'found' }],
  varLabels: ['i', 'matches seen', 'draw', 'pick'],
  emphasis: ['random index', 'equally likely', 'duplicates'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start (no pick)', tone: 'blue' },
    { icon: '⏭', label: 'Phase 2: Skip non-matches', tone: 'orange' },
    { icon: '🎲', label: 'Phase 3: Draw rand(0..seen−1)', tone: 'cyan' },
    { icon: '🎯', label: 'Phase 4: Draw 0 → replace pick', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Reservoir sampling restricted to matching indices',
    text: 'Scan the array once. Count how many elements equal the target so far; the k-th match replaces the current pick when a random integer in [0, k) is 0. Non-matches are ignored. Every matching index finishes as the pick with probability 1/(number of matches), and nothing but a counter and the pick is stored.',
  },
  java: [
    'class Solution {',
    '    private final int[] nums;',
    '    private final Random rand = new Random();',
    '    public Solution(int[] nums) { this.nums = nums; }',
    '    public int pick(int target) {',
    '        int chosen = -1, seen = 0;',
    '        for (int i = 0; i < nums.length; i++) {',
    '            if (nums[i] != target) continue;',
    '            seen++;                                   // seen-th matching index',
    '            if (rand.nextInt(seen) == 0) chosen = i;',
    '        }',
    '        return chosen;',
    '    }',
    '}',
  ],
  python: [
    'class Solution:',
    '    def __init__(self, nums):',
    '        self.nums = nums',
    '    def pick(self, target):',
    '        chosen, seen = -1, 0',
    '        for i, x in enumerate(self.nums):',
    '            if x != target:',
    '                continue',
    '            seen += 1                           # seen-th matching index',
    '            if random.randrange(seen) == 0:',
    '                chosen = i',
    '        return chosen',
  ],
  algorithm: [
    'Start with no pick and a match counter of 0',
    'Skip every index whose value is not the target',
    'For the seen-th match, draw a random integer in [0, seen)',
    'If it is 0, replace the pick with this index',
    'Return the pick after the scan',
  ],
  complexity: [{ label: 'Time', value: 'O(n) per pick' }, { label: 'Space', value: 'O(1)' }],
  why: 'Among the matches only, this is exactly one-slot reservoir sampling: after m matches each of them holds the pick with probability 1/m, because the (m + 1)-th match takes over with probability 1/(m + 1) and each earlier holder survives with probability m/(m + 1). Non-matching elements never touch the counter or the pick, so they cannot bias the result. The price is a full scan per call; the alternative of storing index lists per value trades memory for speed.',
};
