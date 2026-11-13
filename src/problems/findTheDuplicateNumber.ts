import type { CellState, ListNodeVM, ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr } from './ssbShared.ts';
import { annotate } from './annotate.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseNums(raw, { minLen: 2, maxLen: 11, lo: 1, hi: 10 });
  const n = nums.length;
  if (nums.some((v) => v > n - 1)) throw new Error(`With ${n} numbers, every value must be between 1 and ${n - 1}`);
  const cnt = new Map<number, number>();
  for (const v of nums) cnt.set(v, (cnt.get(v) ?? 0) + 1);
  if ([...cnt.values()].filter((c) => c > 1).length !== 1) throw new Error('Exactly one value must be repeated (it may repeat more than twice), e.g. 1 3 4 2 2');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let slow = 0;
  let fast = 0;
  let phase = 'phase 1';

  const scene = (mark: Record<number, CellState> = {}) => ({
    kind: 'list' as const,
    nodes: nums.map((v, i): ListNodeVM => ({ key: i, value: i, next: v, state: mark[i] })),
    pointers: [ptr('slow', 'slow', slow, 'blue'), ptr('fast', 'fast', fast, 'orange')],
  });
  const aux = () => [{ title: 'Array: index → value (the "next" pointer)', kind: 'map' as const, items: nums.map((v, i) => `${i} → ${v}`) }];
  const vars = () => ({ phase, slow, fast });

  steps.push({
    title: 'Start: the array is a linked list', desc: `Treat each index i as a node whose next pointer is nums[i]. Values lie in 1..${n - 1}, so nothing points to node 0; the repeated value is a node with two incoming arrows, where a cycle begins.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'No node is ever skipped, and a duplicate value means two nodes point to the same target. That forces a cycle, and the duplicate is its entrance.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  let meet = -1;
  for (let guard = 0; guard < 40; guard++) {
    slow = nums[slow];
    fast = nums[nums[fast]];
    const same = slow === fast;
    steps.push({
      title: same ? `They meet at node ${slow}` : 'Tortoise 1 step, hare 2 steps', desc: same ? `slow and fast are both at node ${slow}: they are inside the cycle.` : `slow → ${slow}, fast → ${fast}.`,
      scene: scene(same ? { [slow]: 'compare' } : {}), aux: aux(), vars: vars(),
      logic: same ? 'The faster pointer lapped the slower one, which can only happen inside a cycle.' : 'The hare gains one node per round on the tortoise.', logicTone: same ? 'success' : 'info',
      javaLines: [3, 4, 5], pyLines: [3, 4, 5, 6], algoStep: 1,
    });
    if (same) { meet = slow; break; }
  }

  slow = 0;
  phase = 'phase 2';
  steps.push({
    title: 'Reset slow to the start', desc: `slow goes back to node 0; fast stays at node ${fast}. From now on both move one step at a time.`,
    scene: scene({ [meet]: 'compare' }), aux: aux(), vars: vars(),
    logic: 'If the tail has length a and the meeting point is c steps past the entrance, then a = (cycle length) − c (mod cycle). So walking from the start and from the meeting point at equal speed makes both reach the entrance together.', logicTone: 'info',
    javaLines: [6], pyLines: [7], algoStep: 2,
  });
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
    steps.push({
      title: slow === fast ? `They meet at node ${slow}` : 'Both move one step', desc: slow === fast ? `slow = fast = ${slow}: the entrance to the cycle.` : `slow → ${slow}, fast → ${fast}.`,
      scene: scene(slow === fast ? { [slow]: 'found' } : {}), aux: aux(), vars: vars(),
      logic: slow === fast ? 'Two different nodes point at this node, so its index is the duplicated value.' : 'Same speed now; keep stepping until they coincide.', logicTone: slow === fast ? 'success' : 'info',
      javaLines: [7, 8, 9], pyLines: [8, 9, 10], algoStep: 2,
    });
  }

  steps.push({
    title: `Duplicate = ${slow}`, desc: `The cycle entrance is node ${slow}, so ${slow} is the repeated number.`,
    scene: scene({ [slow]: 'found' }), aux: aux(), vars: vars(),
    logic: `Check: the value ${slow} occurs at ${nums.map((v, i) => (v === slow ? i : -1)).filter((i) => i >= 0).map((i) => `index ${i}`).join(' and ')}.`, logicTone: 'success', javaLines: [11], pyLines: [11], algoStep: 3,
    result: { title: String(slow), text: `${slow} is the duplicate` },
  });
  return steps;
}

function annotated(input: In): Step[] {
  const { nums } = input;
  return annotate(build(input), (s, i, all) => {
    const { slow, fast, phase } = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'node i points to nums[i]; slow = fast = 0', desc: `Read every index i as a node whose next pointer is nums[i]. A repeated value is a node with two incoming arrows: the start of a cycle.` };
    if (s.title.startsWith('Reset slow')) return { tag: 'PHASE 2 —', note: `slow = 0; fast stays at ${fast}`, desc: `slow goes back to node 0 while fast stays at node ${fast}. From now on both move one step per round.` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return slow = ${slow}`, desc: `The pointers met at node ${slow}, the entrance of the cycle, so ${slow} is the repeated number (it sits at ${nums.map((v, k) => (v === slow ? 'index ' + k : '')).filter(Boolean).join(' and ')}).` };
    if (phase === 'phase 1') {
      const meet = s.title.startsWith('They meet');
      return { tag: meet ? '🔄 MEET —' : 'PHASE 1 —', note: `slow = nums[slow] → ${slow}; fast = nums[nums[fast]] → ${fast}${meet ? ' → equal' : ''}`, desc: meet ? `slow and fast both reach node ${slow}: they are inside the cycle. Phase 1 is over.` : `slow steps to node ${slow}, fast jumps two links to node ${fast}.` };
    }
    const meet = s.title.startsWith('They meet');
    return { tag: meet ? '🎯 ENTRANCE —' : 'PHASE 2 —', note: `slow = nums[slow] → ${slow}; fast = nums[fast] → ${fast}${meet ? ' → equal' : ''}`, desc: meet ? `slow = fast = ${slow}: both arrived at the entrance of the cycle together.` : `Both take one step: slow to node ${slow}, fast to node ${fast}.` };
  });
}

export const findTheDuplicateNumber: ProblemDef<In> = {
  slug: '287-find-the-duplicate-number', id: '287', title: 'Find the Duplicate Number', difficulty: 'Medium', category: 'Bit Manipulation', tag: "Floyd's cycle",
  statement: 'An array of n + 1 integers holds values in the range 1..n, with exactly one value repeated (possibly more than twice). Find it without modifying the array and using only constant extra space.',
  constraints: '2 ≤ n + 1 · values in [1, n] · exactly one repeated value (animation input: at most 11 numbers)',
  examples: [
    { label: '[1,3,4,2,2]', input: { nums: [1, 3, 4, 2, 2] }, output: '2' },
    { label: '[3,1,3,4,2]', input: { nums: [3, 1, 3, 4, 2] }, output: '3' },
    { label: '[2,5,9,6,9,3,8,9,7,1]', input: { nums: [2, 5, 9, 6, 9, 3, 8, 9, 7, 1] }, output: '9' },
  ],
  inputPlaceholder: 'e.g. 1 3 4 2 2',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Meeting point inside the cycle', state: 'compare' }, { label: 'Cycle entrance = duplicate', state: 'found' }],
  varLabels: ['phase', 'slow', 'fast'],
  emphasis: ['repeated', 'without modifying the array', 'constant extra space'],
  phases: [
    { icon: '🔗', label: 'Array as a linked list', tone: 'blue' },
    { icon: '🐢', label: 'Phase 1: meet inside the cycle', tone: 'cyan' },
    { icon: '🎯', label: 'Phase 2: find the entrance', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: "Floyd's tortoise and hare on i → nums[i]",
    text: 'Follow the pointers i → nums[i]. Because of the duplicate, the path eventually loops. Run a slow and a fast pointer until they meet in the loop, then restart one from index 0 and move both one step at a time: they meet at the loop entrance, which is the duplicate.',
  },
  java: [
    'public int findDuplicate(int[] nums) {',
    '    int slow = 0, fast = 0;',
    '    do {',
    '        slow = nums[slow];',
    '        fast = nums[nums[fast]];',
    '    } while (slow != fast);',
    '    slow = 0;',
    '    while (slow != fast) {',
    '        slow = nums[slow];',
    '        fast = nums[fast];',
    '    }',
    '    return slow;',
    '}',
  ],
  python: [
    'def find_duplicate(nums):',
    '    slow = fast = 0',
    '    while True:',
    '        slow = nums[slow]',
    '        fast = nums[nums[fast]]',
    '        if slow == fast:',
    '            break',
    '    slow = 0',
    '    while slow != fast:',
    '        slow = nums[slow]',
    '        fast = nums[fast]',
    '    return slow',
  ],
  algorithm: [
    'View index i as a node pointing to nums[i]; the duplicate value is where the path enters a cycle',
    'Phase 1: slow moves 1 step, fast moves 2 steps until they meet',
    'Phase 2: reset slow to 0; move both 1 step until they meet',
    'The meeting node is the duplicate',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Values lie in 1..n, so node 0 has no incoming edge and every walk from 0 stays inside the array. With n + 1 nodes and only n possible targets, two nodes share a target, creating a cycle whose entrance is that shared target. If the tail has length a and the pointers meet c steps into the cycle of length L, then 2(a + c) = a + c + kL, so a = kL − c: the walks from the start and from the meeting point reach the entrance in the same number of steps.',
};
