import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, heads, recorder } from './stepKit.ts';
import { CallTree } from './dpCoreKit.ts';

interface In { rows: number; cols: number }

function parse(raw: string): In {
  const m = /^\s*(\d+)\s*[x×,; ]\s*(\d+)\s*$/i.exec(raw);
  if (!m) throw new Error('Format: rows x cols — e.g. 3 x 4');
  const rows = Number(m[1]);
  const cols = Number(m[2]);
  if (rows < 2 || rows > 4 || cols < 2 || cols > 4) throw new Error('Rows and columns must each be from 2 to 4');
  return capSteps(build, { rows, cols });
}

/** Calls plain recursion would make (same base cases as the animation). */
const naive = (r: number, c: number, R: number, C: number): number => (r === R - 1 || c === C - 1 ? 1 : 1 + naive(r + 1, c, R, C) + naive(r, c + 1, R, C));

function build({ rows: R, cols: C }: In): Step[] {
  const steps: Step[] = [];
  const tree = new CallTree();
  const memo: (number | null)[][] = Array.from({ length: R }, () => Array(C).fill(null));
  const mapItems: string[] = [];
  let cur: [number, number] | null = null;
  let calls = 0;
  let hits = 0;
  let hitCell: [number, number] | null = null;
  const plain = naive(0, 0, R, C);

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        tree.scene(),
        {
          kind: 'grid' as const,
          variant: 'table' as const,
          rows: memo.map((row, r) => row.map((v, c): Cell => {
            const here = !!cur && cur[0] === r && cur[1] === c;
            const hit = !!hitCell && hitCell[0] === r && hitCell[1] === c;
            return { key: `${r},${c}`, value: v === null ? '?' : v, state: hit ? 'compare' : here ? 'active' : v === null ? 'dim' : 'found' };
          })),
          rowHeads: heads(R, (r) => `r${r}`),
          colHeads: heads(C, (c) => `c${c}`),
        },
      ],
    },
    aux: [{ title: 'memo ((r,c) → paths)', kind: 'map' as const, items: [...mapItems] }],
    vars: { cell: cur ? `(${cur[0]},${cur[1]})` : '—', calls, 'cache hits': hits, 'plain calls': plain },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Plain recursion makes many repeats', desc: `paths(r, c) = paths(r+1, c) + paths(r, c+1) counts routes from (r, c) to the bottom-right corner. On a ${R}×${C} grid plain recursion would make ${plain} calls, but only ${(R - 1) * (C - 1)} cells ever need the formula; the others are straight lines of 1 path.`,
    logic: 'Different move orders reach the same cell, so the same (r, c) is asked for repeatedly. The state is the pair (r, c) — two numbers instead of one.', tone: 'warn', java: [0, 1, 3, 4], py: [0, 5], algo: 0,
    tag: 'STATE (r, c) —', note: `plain recursion = ${plain} calls on a ${R}×${C} grid`,
    alert: `Plain recursion would make ${plain} calls, but only ${(R - 1) * (C - 1)} cells need the formula: most calls repeat.`,
  });

  const waiting: number[] = [];
  const run = (r: number, c: number, parent: number | null, side: 'left' | 'right'): number => {
    const id = tree.add(`${r},${c}`, parent, side);
    calls++;
    cur = [r, c];
    hitCell = null;
    if (parent !== null) tree.states[parent] = 'sorted';
    tree.states[id] = 'active';
    if (r === R - 1 || c === C - 1) {
      tree.states[id] = 'found';
      tree.labels[id] = '=1';
      memo[r][c] = 1;
      say({
        title: `(${r},${c}) is on the last ${r === R - 1 ? 'row' : 'column'}`, desc: `(${r},${c}) is on the last ${r === R - 1 ? 'row' : 'column'}: only one straight path remains to the corner, so the answer is 1.`, logic: 'Base case: no choice left to make.', java: [1], py: [1, 2], algo: 1,
        tag: 'BASE CASE —', note: `r = ${R - 1} or c = ${C - 1} → return 1`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return 1;
    }
    if (memo[r][c] !== null) {
      hits++;
      hitCell = [r, c];
      tree.states[id] = 'compare';
      tree.labels[id] = `hit ${memo[r][c]}`;
      say({
        title: `(${r},${c}) — cache hit`, desc: `paths(${r},${c}) = ${memo[r][c]} is already stored, so the whole sub-tree below this call is skipped.`,
        logic: 'A hit costs one lookup instead of an entire sub-tree of calls.', tone: 'success', java: [2], py: [3, 4], algo: 2,
        tag: 'CACHE HIT —', note: `memo[${r}][${c}] = ${memo[r][c]} → return at once`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return memo[r][c]!;
    }
    say({
      title: `Call paths(${r},${c})`, desc: `Not in the memo: try both moves, down to (${r + 1},${c}) and right to (${r},${c + 1}).`,
      logic: 'First time this cell is asked for: compute it from its two neighbours.', java: [3, 4], py: [5], algo: 2,
      tag: 'CALL —', note: `memo miss → paths(${r + 1},${c}) + paths(${r},${c + 1})`,
    });
    waiting.push(id);
    const down = run(r + 1, c, id, 'left');
    tree.states[id] = 'active';
    cur = [r, c];
    const right = run(r, c + 1, id, 'right');
    waiting.pop();
    const v = down + right;
    memo[r][c] = v;
    mapItems.push(`(${r},${c}) → ${v}`);
    cur = [r, c];
    hitCell = null;
    tree.states[id] = 'found';
    tree.labels[id] = `=${v}`;
    say({
      title: `paths(${r},${c}) = ${down} + ${right} = ${v}`, desc: `Store (${r},${c}) → ${v} in the memo, then return it.`,
      logic: 'The memo is exactly the table a bottom-up solution would fill.', tone: 'success', java: [3, 4, 5], py: [5, 6], algo: 3,
      tag: 'STORE —', note: `memo[${r}][${c}] = ${down} + ${right} = ${v}`,
    });
    if (parent !== null) tree.states[parent] = 'active';
    return v;
  };
  const ans = run(0, 0, null, 'left');
  cur = [0, 0];
  hitCell = null;
  say({
    title: 'Done', tag: '✅ Done!', note: `paths(0,0) = ${ans}: ${calls} calls instead of ${plain}`, desc: `${ans} paths, found with ${calls} calls (${hits} cache hit${hits === 1 ? '' : 's'}) instead of ${plain}. The memo grid is the finished DP table.`,
    logic: 'Top-down with a memo visits the same states a bottom-up loop would, just in demand order.', tone: 'success', java: [5], py: [6], algo: 4,
    result: { title: String(ans), text: `${calls} calls instead of ${plain}` },
  });
  return steps;
}

export const gridPathsMemo: ProblemDef<In> = {
  slug: 'cp-grid-paths-with-memoization',
  id: 'CP', title: 'Grid Paths with Memoization', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'top-down memo, 2-D state',
  statement: 'Count the routes from the top-left to the bottom-right cell of a grid when you may only move down or right, using recursion on the pair (row, column) and a memo so each cell is solved only once.',
  constraints: 'Any grid size (animation input: 2–4 rows and 2–4 columns)',
  examples: [
    { label: '3 × 3 grid', input: { rows: 3, cols: 3 }, output: '6' },
    { label: '3 × 4 grid', input: { rows: 3, cols: 4 }, output: '10' },
    { label: '4 × 4 grid', input: { rows: 4, cols: 4 }, output: '20' },
  ],
  inputPlaceholder: 'rows x cols, e.g. 3 x 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'recursion tree (left) and the memo grid it fills (right)',
  legend: [{ label: 'Running call / current cell', state: 'active' }, { label: 'Waiting for sub-calls', state: 'sorted' }, { label: 'Cache hit', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Not computed yet', state: 'dim' }],
  varLabels: ['cell', 'calls', 'cache hits', 'plain calls'],
  emphasis: ['down or right', 'memo'],
  phases: [
    { icon: '🧩', label: 'State = (r, c)', tone: 'orange' },
    { icon: '🏁', label: 'Base: last row / column = 1', tone: 'blue' },
    { icon: '⚡', label: 'Memo lookup / call', tone: 'cyan' },
    { icon: '💾', label: 'Add down + right, store', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Top-down recursion on (row, column) with a memo',
    text: 'paths(r, c) = 1 on the last row or column, otherwise paths(r+1, c) + paths(r, c+1). Before recursing look (r, c) up in the memo; after computing, store it. Each of the (R−1)(C−1) inner cells is expanded once, so the work is O(R·C) instead of exponential.',
  },
  java: [
    'static int paths(int r, int c, int R, int C, int[][] memo) {',
    '    if (r == R - 1 || c == C - 1) return 1;          // last row or column: one straight path',
    '    if (memo[r][c] != 0) return memo[r][c];            // cache hit',
    '    memo[r][c] = paths(r + 1, c, R, C, memo)           // go down',
    '               + paths(r, c + 1, R, C, memo);          // go right',
    '    return memo[r][c];',
    '}',
  ],
  python: [
    'def paths(r, c, R, C, memo):',
    '    if r == R - 1 or c == C - 1:',
    '        return 1                       # one straight path left',
    '    if (r, c) in memo:',
    '        return memo[(r, c)]            # cache hit',
    '    memo[(r, c)] = paths(r + 1, c, R, C, memo) + paths(r, c + 1, R, C, memo)',
    '    return memo[(r, c)]',
  ],
  algorithm: [
    'State = (r, c): the number of routes from that cell to the corner',
    'Base case: on the last row or column there is exactly 1 route',
    'Check the memo for (r, c); a hit returns immediately',
    'Otherwise add paths(r+1, c) + paths(r, c+1) and store the sum',
    'The answer is paths(0, 0)',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C) memo + O(R + C) recursion depth' }],
  why: 'The number of routes from a cell depends only on that cell, never on how you got there, so it can be cached. There are R·C distinct states and each one is expanded at most once (later requests hit the memo), giving O(R·C) calls. The memo ends up as the same table a bottom-up grid DP fills, only in the order the recursion happens to need.',
};
