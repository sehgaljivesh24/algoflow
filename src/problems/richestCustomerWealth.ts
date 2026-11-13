import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { accounts: number[][] }

function parse(raw: string): In {
  const accounts = raw.split(';').map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number)).filter((r) => r.length);
  if (!accounts.length) throw new Error('Rows separated by ";", e.g. 1 2 3 ; 3 2 1');
  if (accounts.some((r) => r.some((n) => !Number.isInteger(n) || n < 0))) throw new Error('Use non-negative whole numbers');
  if (accounts.some((r) => r.length !== accounts[0].length)) throw new Error('Every customer needs the same number of banks');
  if (accounts.length > 6 || accounts[0].length > 8) throw new Error('Use at most 6 customers and 8 banks');
  return { accounts };
}

function build({ accounts }: In): Step[] {
  const R = accounts.length;
  const C = accounts[0].length;
  const wealth: (number | null)[] = Array(R).fill(null);
  const steps: Step[] = [];
  let best = 0;
  let bestRow = -1;

  const scene = (cur: number, finished: boolean) => ({
    kind: 'grid' as const,
    rows: accounts.map((row, r): Cell[] =>
      row.map((value, c) => {
        let state: CellState | undefined;
        if (r === bestRow && (r !== cur || finished)) state = 'found';
        else if (r === cur) state = 'active';
        else if (wealth[r] !== null) state = 'dim';
        return { key: `${r},${c}`, value, state, tone: state === 'found' ? ('green' as const) : state === 'active' ? ('blue' as const) : undefined };
      }),
    ),
    rowHeads: accounts.map((_, r) => `cust ${r}`),
    colHeads: accounts[0].map((_, c) => `bank ${c}`),
  });
  const aux = () => [{ title: 'wealth per customer', kind: 'list' as const, items: wealth.map((w) => (w === null ? '?' : String(w))), highlight: bestRow >= 0 ? bestRow : undefined }];
  const vars = (row: number | string, sum: number | string) => ({ customer: row, sum, best });

  steps.push({
    title: 'Start', desc: `${R} customers × ${C} banks. A customer's wealth is the sum of their row.`,
    scene: scene(-1, false), aux: aux(), vars: vars('—', '—'),
    logic: 'Rows are customers and columns are banks, so "wealth" is a row sum. We need the largest row sum.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let r = 0; r < R; r++) {
    const sum = accounts[r].reduce((a, b) => a + b, 0);
    wealth[r] = sum;
    steps.push({
      title: `Add up customer ${r}`, desc: `${accounts[r].join(' + ')} = ${sum}`,
      scene: scene(r, false), aux: aux(), vars: vars(r, sum),
      logic: 'Walk across the row once, adding every bank balance.', logicTone: 'info', javaLines: [2, 3, 4, 5], pyLines: [2, 3], algoStep: 1,
    });
    const improved = sum > best;
    if (improved) {
      best = sum;
      bestRow = r;
    }
    steps.push({
      title: improved ? `New richest: customer ${r}` : `Customer ${r} is not richer`,
      desc: improved ? `${sum} beats the previous best, so best = ${sum}.` : `${sum} ≤ ${best}, so best stays ${best}.`,
      scene: scene(r, false), aux: aux(), vars: vars(r, sum),
      logic: improved ? 'Remember only the largest total; we never need the others again.' : 'A smaller (or equal) total cannot change the maximum.', logicTone: improved ? 'success' : 'warn',
      javaLines: [6], pyLines: [4], algoStep: 2,
    });
  }

  steps.push({
    title: 'Done', desc: `Customer ${bestRow} is the richest with ${best}.`,
    scene: scene(-1, true), aux: aux(), vars: vars('—', '—'),
    logic: `The maximum row sum is ${best}.`, logicTone: 'success', javaLines: [8], pyLines: [5],
    algoStep: 3, result: { title: String(best), text: `Customer ${bestRow} holds the most` },
  });
  return steps;
}

export const richestCustomerWealth: ProblemDef<In> = {
  slug: '1672-richest-customer-wealth',
  id: '1672', title: 'Richest Customer Wealth', difficulty: 'Easy', category: 'Arrays', tag: '2D array',
  statement: "accounts[i][j] is the money customer i holds in bank j. A customer's wealth is the total across all their banks. Return the largest wealth of any customer.",
  constraints: '1 ≤ m, n ≤ 50 · 1 ≤ accounts[i][j] ≤ 100 (animation input is limited to 6 × 8; zeros are allowed here)',
  examples: [
    { label: '[[1,2,3],[3,2,1]]', input: { accounts: [[1, 2, 3], [3, 2, 1]] }, output: '6' },
    { label: '[[1,5],[7,3],[3,5]]', input: { accounts: [[1, 5], [7, 3], [3, 5]] }, output: '10' },
    { label: '[[2,8,7],[7,1,3],[1,9,5]]', input: { accounts: [[2, 8, 7], [7, 1, 3], [1, 9, 5]] }, output: '17' },
  ],
  inputPlaceholder: 'rows separated by ;  e.g. 1 5 ; 7 3 ; 3 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Customer being summed', state: 'active' }, { label: 'Richest so far', state: 'found' }, { label: 'Already checked', state: 'dim' }],
  varLabels: ['customer', 'sum', 'best'],
  approach: {
    title: 'Row sum, then maximum',
    text: 'Treat each row as one customer. Sum the row, compare it with the best total seen so far, and keep the larger one. One pass over every cell.',
  },
  java: [
    'public int maximumWealth(int[][] accounts) {',
    '    int best = 0;',
    '    for (int[] customer : accounts) {',
    '        int sum = 0;',
    '        for (int money : customer)',
    '            sum += money;',
    '        best = Math.max(best, sum);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def maximum_wealth(accounts):',
    '    best = 0',
    '    for customer in accounts:',
    '        total = sum(customer)',
    '        best = max(best, total)',
    '    return best',
  ],
  algorithm: [
    'Start with best = 0',
    'For each customer, add up the whole row',
    'If the row sum beats best, update best',
    'Return best after the last row',
  ],
  complexity: [{ label: 'Time', value: 'O(m × n)' }, { label: 'Space', value: 'O(1)' }],
  why: "Every cell belongs to exactly one row, so each balance is added exactly once to its own customer's total. The running maximum after row r equals the maximum over rows 0..r, so after the last row it is the answer.",
};
