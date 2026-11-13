import type { Cell, CellState, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 20)) throw new Error('Enter whole numbers from 0 to 20, e.g. 2 3 1 1 4');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  let reach = 0;
  for (let i = 0; i < nums.length && i <= reach; i++) reach = Math.max(reach, i + nums[i]);
  if (reach < nums.length - 1) throw new Error('The last index must be reachable (try 2 3 1 1 4)');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let jumps = 0;
  let curEnd = 0;
  let far = 0;

  const cells = (cur: number): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i <= curEnd) state = 'sorted';
      else if (i <= far) state = 'compare';
      else state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = (cur: number) => [
    ...(cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: 'blue' as const }] : []),
    { id: 'end', label: 'curEnd', index: Math.min(curEnd, n - 1), tone: 'orange' as const },
    { id: 'far', label: 'far', index: Math.min(far, n - 1), tone: 'green' as const },
  ];
  const vars = (i: number | string) => ({ i, jumps, curEnd, far });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, cur: number, j: number[], p: number[], a: number, extra: { result?: Step['result']; alert?: string } = {}) =>
    steps.push({ title, tag, desc, note, cells: cells(cur), pointers: ptrs(cur), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, ...extra });

  add('Start', 'INIT', `Reach index ${n - 1} in as few jumps as possible. Each jump is one level of a breadth-first search; level 0 is just index 0.`, 'jumps = 0, curEnd = 0, far = 0',
    'Cells up to curEnd (solid) are reachable with the jumps used so far. Cells up to far (outlined) are reachable with one more jump. The next jump is only needed when we walk past curEnd.', 'info', -1, [1], [1], 0);

  for (let i = 0; i < n - 1; i++) {
    const old = far;
    far = Math.max(far, i + nums[i]);
    add(`At ${i}: can reach ${i + nums[i]}`, far > old ? 'FAR ↑' : 'SCAN',
      far > old ? `From index ${i} you can land on ${i + nums[i]}, so far grows from ${old} to ${far}. Current level ends at curEnd = ${curEnd}.` : `From index ${i} you can land on ${i + nums[i]}, which does not beat far = ${far}. Level still ends at ${curEnd}.`,
      `far = max(${old}, ${i}+${nums[i]}) = ${far}`,
      'While scanning the current level, remember the farthest cell any of its cells can reach.', far > old ? 'success' : 'info', i, [3], [3], 1);
    if (i === curEnd) {
      jumps++;
      curEnd = far;
      add(`End of the level: jump #${jumps}`, `🚀 JUMP #${jumps}`, `i = curEnd = ${i}: this level is used up, so spend jump #${jumps} to land as far as far allows. New level ends at ${curEnd}.`,
        `jumps++ → ${jumps}; curEnd = far = ${curEnd}`,
        'Taking the jump that lands as far as possible is optimal: any other landing spot reaches no farther.', 'warn', i, [4, 5, 6], [4, 5, 6], 2,
        { alert: `🚀 JUMP #${jumps}! Index ${i} was the edge of the level, so one more jump is needed (now reaching up to ${curEnd}).` });
    }
  }

  add('Done', '✅ Done!', `The scan finished: the last index (${n - 1}) is covered after ${jumps} jump${jumps === 1 ? '' : 's'}.`, `return jumps = ${jumps}`, 'Each level of the search cost exactly one jump.', 'success', -1, [9], [7], 3,
    { result: { title: String(jumps), text: 'Minimum number of jumps' } });
  return steps;
}

export const jumpGameII: ProblemDef<In> = {
  slug: '45-jump-game-ii',
  id: '45', title: 'Jump Game II', difficulty: 'Medium', category: 'Greedy', tag: 'greedy BFS',
  emphasis: ['minimum number of jumps', 'maximum jump length'],
  statement: 'You start at index 0 and nums[i] is the maximum jump length from index i. The last index is always reachable. Return the minimum number of jumps needed to reach it.',
  constraints: '1 ≤ n ≤ 10⁴, 0 ≤ nums[i] ≤ 1000 (animation input: at most 12 numbers, each 0-20), the last index is reachable',
  examples: [
    { label: '2 3 1 1 4', input: { nums: [2, 3, 1, 1, 4] }, output: '2' },
    { label: '2 3 0 1 4', input: { nums: [2, 3, 0, 1, 4] }, output: '2' },
    { label: '1 1 1 1', input: { nums: [1, 1, 1, 1] }, output: '3' },
  ],
  inputPlaceholder: 'jump lengths (last index reachable), e.g. 2 3 1 1 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '🔍', label: 'Scan level (far)', tone: 'cyan' },
    { icon: '🚀', label: 'Jump at curEnd', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Current index', state: 'active' }, { label: 'Reachable with current jumps', state: 'sorted' }, { label: 'Reachable with one more jump', state: 'compare' }, { label: 'Not reached yet', state: 'dim' }],
  varLabels: ['i', 'jumps', 'curEnd', 'far'],
  approach: {
    title: 'Greedy BFS by levels',
    text: 'Treat each jump as one BFS level. curEnd is the last index reachable with the jumps used so far and far is the farthest index reachable with one more jump. Scan the cells; when you arrive at curEnd, you must spend a jump and the new boundary becomes far.',
  },
  java: [
    'public int jump(int[] nums) {',
    '    int jumps = 0, curEnd = 0, far = 0;',
    '    for (int i = 0; i < nums.length - 1; i++) {',
    '        far = Math.max(far, i + nums[i]);',
    '        if (i == curEnd) {',
    '            jumps++;',
    '            curEnd = far;',
    '        }',
    '    }',
    '    return jumps;',
    '}',
  ],
  python: [
    'def jump(nums):',
    '    jumps = cur_end = far = 0',
    '    for i in range(len(nums) - 1):',
    '        far = max(far, i + nums[i])',
    '        if i == cur_end:',
    '            jumps += 1',
    '            cur_end = far',
    '    return jumps',
  ],
  algorithm: [
    'Start with jumps = 0, curEnd = 0, far = 0',
    'At each index before the last, update far = max(far, i + nums[i])',
    'When i reaches curEnd, a jump is required: jumps++ and curEnd = far',
    'After the scan, jumps is the minimum',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Cells reachable with j jumps form a prefix of the array, [0, curEnd]. The next prefix ends at the farthest point any of those cells can jump to, which the scan computes as far. We only increment the jump counter when we step beyond the current prefix, so each increment moves to the next BFS level, and BFS levels give the minimum number of jumps.',
};
