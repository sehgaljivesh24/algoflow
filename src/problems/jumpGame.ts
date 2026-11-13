import type { Cell, CellState, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 20)) throw new Error('Enter whole numbers from 0 to 20, e.g. 2 3 1 1 4');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let reach = 0;

  const cells = (cur: number, stuck = false): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (stuck && i === cur) state = 'error';
      else if (i === cur) state = 'active';
      else if (i <= reach) state = 'sorted';
      else state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = (cur: number) => [
    ...(cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: 'blue' as const }] : []),
    { id: 'reach', label: reach >= n - 1 ? 'reach ≥ end' : 'reach', index: Math.min(reach, n - 1), tone: 'green' as const },
  ];
  const vars = (i: number | string) => ({ i, reach, 'last index': n - 1 });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, cur: number, stuck: boolean, j: number[], p: number[], a: number, extra: { result?: Step['result']; alert?: string } = {}) =>
    steps.push({ title, tag, note, desc, cells: cells(cur, stuck), pointers: ptrs(cur), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, ...extra });

  add('Start', 'INIT', `You stand on index 0 (jump power ${nums[0]}). Can you reach the last index, ${n - 1}? Track only reach, starting at 0.`, 'int reach = 0',
    'Do not search paths. Just track reach: the farthest index known to be reachable so far. Everything up to reach is reachable, because you can stop on any cell on the way.', 'info', -1, false, [1], [1], 0);

  for (let i = 0; i < n; i++) {
    if (i > reach) {
      add(`Stuck at index ${i}`, 'BLOCKED', `Index ${i} is beyond reach (${reach}): no earlier jump can land on it or past it, so the end is out of reach.`, `${i} > ${reach} → return false`,
        'A gap that no cell can jump across: everything after it is unreachable.', 'warn', i, true, [3], [3, 4], 3,
        { result: { title: 'false', text: `Index ${i} is unreachable` }, alert: `Index ${i} > reach ${reach}: every jump before it falls short. Stuck!` });
      return steps;
    }
    add(`Scan index ${i}`, 'SCAN', `Index ${i} (power ${nums[i]}) is inside reach ${reach}, so you can stand here and jump up to ${nums[i]} further.`, `i=${i} ≤ reach=${reach}, so continue`,
      'An index inside reach can be landed on, so its jump power is available.', 'info', i, false, [3], [3], 1);
    const old = reach;
    reach = Math.max(reach, i + nums[i]);
    add(`At ${i}: jump power ${nums[i]}`, reach > old ? 'REACH ↑' : 'NO GAIN',
      reach > old ? `${i} + ${nums[i]} = ${i + nums[i]} beats ${old}, so reach grows from ${old} to ${reach}.` : `${i} + ${nums[i]} = ${i + nums[i]} does not beat reach ${old}; it stays ${reach}.`,
      `reach = max(${old}, ${i}+${nums[i]}) = ${reach}`,
      reach > old ? 'This cell pushes the frontier forward.' : 'This cell adds nothing new; reach stays.', reach > old ? 'success' : 'info', i, false, [4], [5], 2);
    if (reach >= n - 1) {
      add('The last index is within reach', '✅ Reached!', `reach = ${reach} ≥ ${n - 1}: the last index is reachable, so there is no need to look further.`, `${reach} ≥ ${n - 1} → return true`,
        'Once the frontier touches the last index we are done.', 'success', i, false, [5], [6, 7], 3, { result: { title: 'true', text: 'The last index is reachable' } });
      return steps;
    }
  }

  add('Done', '🚫 Not reached.', `The scan ended with reach = ${reach} < ${n - 1}.`, `return false`, 'Not reachable.', 'warn', -1, false, [7], [8], 3, { result: { title: 'false', text: 'The last index is not reachable' } });
  return steps;
}

export const jumpGame: ProblemDef<In> = {
  slug: '55-jump-game',
  id: '55', title: 'Jump Game', difficulty: 'Medium', category: 'Greedy', tag: 'greedy reach',
  emphasis: ['maximum jump length', 'last index'],
  statement: 'You start on index 0 of an array. nums[i] is the maximum jump length from index i. Decide whether you can reach the last index.',
  constraints: '1 ≤ n ≤ 10⁴, 0 ≤ nums[i] ≤ 10⁵ (animation input: at most 12 numbers, each 0-20)',
  examples: [
    { label: '2 3 1 1 4', input: { nums: [2, 3, 1, 1, 4] }, output: 'true', answer: 'true (reach grows 2 → 4 and touches index 4)' },
    { label: '3 2 1 0 4', input: { nums: [3, 2, 1, 0, 4] }, output: 'false', answer: 'false (reach is stuck at 3, index 4 is unreachable)' },
    { label: '0', input: { nums: [0] }, output: 'true' },
  ],
  inputPlaceholder: 'jump lengths, e.g. 2 3 1 1 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init reach = 0', tone: 'blue' },
    { icon: '🔍', label: 'Scan i ≤ reach', tone: 'cyan' },
    { icon: '🏃', label: 'Extend reach', tone: 'green' },
    { icon: '🏁', label: 'Reached / blocked', tone: 'gold' },
  ],
  legend: [{ label: 'Current index', state: 'active' }, { label: 'Reachable', state: 'sorted' }, { label: 'Not reachable (yet)', state: 'dim' }, { label: 'Unreachable index', state: 'error' }],
  varLabels: ['i', 'reach', 'last index'],
  approach: {
    title: 'Track the farthest reachable index',
    text: 'Walk left to right keeping reach, the farthest index you can get to. If the index you are on is beyond reach, you are stuck. Otherwise update reach = max(reach, i + nums[i]). If reach touches the last index, the answer is true.',
  },
  java: [
    'public boolean canJump(int[] nums) {',
    '    int reach = 0;',
    '    for (int i = 0; i < nums.length; i++) {',
    '        if (i > reach) return false;',
    '        reach = Math.max(reach, i + nums[i]);',
    '        if (reach >= nums.length - 1) return true;',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def can_jump(nums):',
    '    reach = 0',
    '    for i, x in enumerate(nums):',
    '        if i > reach:',
    '            return False',
    '        reach = max(reach, i + x)',
    '        if reach >= len(nums) - 1:',
    '            return True',
    '    return False',
  ],
  algorithm: [
    'Start with reach = 0 (index 0 is reachable)',
    'Scan index i: if i > reach you are stuck, return false',
    'Otherwise set reach = max(reach, i + nums[i])',
    'If reach touches the last index return true (or return false when stuck)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: every index up to reach can be landed on, since a jump of any length from 0 to nums[j] is allowed and the cells before reach can be visited in order. Raising reach with i + nums[i] never loses an option, and if i ever exceeds reach, no earlier cell can jump over i, so nothing beyond it is reachable either.',
};
