import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';

interface In { board: string[] }

const MAX_EMPTY = 20;

function validDigit(b: string[][], r: number, c: number, d: string): boolean {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === d || b[i][c] === d) return false;
    if (b[Math.floor(r / 3) * 3 + Math.floor(i / 3)][Math.floor(c / 3) * 3 + (i % 3)] === d) return false;
  }
  return true;
}

function parse(raw: string): In {
  const s = raw.replace(/[\s,/|]+/g, '').replace(/0/g, '.');
  if (s.length !== 81 || /[^1-9.]/.test(s)) throw new Error('Give 9 rows of 9 characters: digits 1-9, and . or 0 for an empty cell');
  const board = Array.from({ length: 9 }, (_, r) => s.slice(r * 9, r * 9 + 9));
  const grid = board.map((row) => [...row]);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = grid[r][c];
      if (d === '.') continue;
      grid[r][c] = '.';
      const ok = validDigit(grid, r, c, d);
      grid[r][c] = d;
      if (!ok) throw new Error(`The given ${d} at row ${r + 1}, column ${c + 1} clashes with another given`);
    }
  }
  const empties = s.split('.').length - 1;
  if (empties === 0) throw new Error('The board has no empty cell to fill');
  if (empties > MAX_EMPTY) throw new Error(`Leave at most ${MAX_EMPTY} cells empty so the animation stays short`);
  const steps = build({ board });
  if (steps.length > 400) throw new Error('This board needs more than 400 steps. Fill in more cells.');
  if (!steps[steps.length - 1].result!.title.startsWith('Solved')) throw new Error('This board has no solution');
  return { board };
}

function build({ board }: In): Step[] {
  const b = board.map((row) => [...row]);
  const given = board.map((row) => [...row].map((ch) => ch !== '.'));
  const steps: Step[] = [];
  const decisions: string[] = [];
  let focus: [number, number] | null = null;
  let mode: 'try' | 'dead' | 'none' = 'none';
  let cands: string[] = [];

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: b.map((row, r) => row.map((ch, c): Cell => {
        const key = `${r},${c}`;
        const isFocus = focus !== null && focus[0] === r && focus[1] === c;
        if (given[r][c]) return { key, value: ch, tone: 'blue' };
        if (isFocus) return { key, value: ch === '.' ? '' : ch, state: mode === 'dead' ? 'error' : 'active' };
        if (ch !== '.') return { key, value: ch, state: 'found' };
        return { key, value: '' };
      })),
      rowHeads: b.map((_, r) => String(r)),
      colHeads: b.map((_, c) => String(c)),
    },
    aux: [
      { title: 'call stack · decisions (row,col)=digit', kind: 'stack' as const, items: [...decisions] },
      focus
        ? {
            title: `digits for (${focus[0]},${focus[1]}): row, column and box check`, kind: 'list' as const,
            items: [...'123456789'].map((d) => (cands.includes(d) ? d : `${d} ✗`)),
            bad: [...'123456789'].map((d, i) => (cands.includes(d) ? -1 : i)).filter((i) => i >= 0),
            highlight: typeof curDigit === 'string' && cands.includes(curDigit) ? Number(curDigit) - 1 : undefined,
          }
        : { title: 'digits', kind: 'list' as const, items: [] },
    ],
    vars: { row: focus ? focus[0] : '—', col: focus ? focus[1] : '—', digit: '—', decisions: decisions.length },
  });
  let curDigit: string | number = '—';
  const say = recorder(steps, () => {
    const s = snap();
    return { ...s, vars: { ...s.vars, digit: curDigit } };
  });

  const empties = b.flat().filter((ch) => ch === '.').length;
  say({
    title: 'Start', tag: 'INIT', desc: `${empties} empty cells. Blue digits are the givens. We fill empty cells in reading order, trying digits 1-9 that fit.`,
    note: `solve(board) → ${empties} empty cells to fill`,
    logic: 'Only decisions are animated: digits that clash with the cell\'s row, column or 3×3 box are rejected silently, and each remaining candidate becomes a step.',
    java: [1], py: [21], algo: 0,
  });

  const solve = (): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] !== '.') continue;
        const options = [...'123456789'].filter((d) => validDigit(b, r, c, d));
        if (options.length === 0) {
          focus = [r, c];
          mode = 'dead';
          cands = [];
          curDigit = '—';
          say({
            title: `Dead end at (${r}, ${c})`, tag: 'DEAD END',
            alert: `Dead end at (${r}, ${c}): all nine digits clash with the row, column or 3×3 box. The last guess must be undone.`,
            desc: `No digit from 1-9 fits cell (${r}, ${c}): every one clashes with its row, column or box. Backtrack.`,
            note: `valid(b, ${r}, ${c}, d) is false for d = 1..9 → return false`,
            logic: 'An earlier guess must have been wrong, so return false and let the caller try its next digit.', tone: 'warn',
            java: [13], py: [19], algo: 3,
          });
          return false;
        }
        for (const d of options) {
          focus = [r, c];
          mode = 'try';
          cands = options;
          b[r][c] = d;
          curDigit = d;
          decisions.push(`(${r},${c})=${d}`);
          say({
            title: `Try ${d} at (${r}, ${c})`, tag: 'TRY DIGIT',
            desc: `Cell (${r}, ${c}) can legally hold ${options.join(', ')}${options.length < 9 ? ` (${9 - options.length} digits clash)` : ''}. Choose ${d} and explore the next empty cell.`,
            note: `legal ${options.join(',')} → b[${r}][${c}] = '${d}'; decisions = ${decisions.length}`,
            logic: 'Choose a legal digit, then recurse; if the rest of the board cannot be completed, we will undo it.', java: [9, 10], py: [15, 16], algo: 1,
          });
          if (solve()) return true;
          focus = [r, c];
          mode = 'try';
          cands = options;
          b[r][c] = '.';
          curDigit = d;
          decisions.pop();
          say({
            title: `Undo ${d} at (${r}, ${c})`, tag: 'BACKTRACK',
            desc: `Choosing ${d} at (${r}, ${c}) led to a dead end deeper down, so clear the cell${options.indexOf(d) + 1 < options.length ? ` and try the next candidate ${options[options.indexOf(d) + 1]}` : '; no candidates left here'}.`,
            note: `b[${r}][${c}] = '.'; decisions = ${decisions.length}`,
            logic: 'Un-choose restores the board exactly, so the next digit is tested on a clean state.', tone: 'warn', java: [11], py: [18], algo: 2,
          });
        }
        return false;
      }
    }
    return true;
  };
  const solved = solve();

  focus = null;
  mode = 'none';
  cands = [];
  curDigit = '—';
  say({
    title: solved ? 'Solved' : 'No solution', tag: solved ? '✅ Solved!' : '⛔ No solution', note: solved ? 'return true, no empty cell left' : 'return false',
    desc: solved ? 'No empty cell is left: every row, column and box is complete.' : 'Every candidate failed, so the board cannot be completed.',
    logic: solved ? 'Reaching the end of the scan with no empty cell means all placements were consistent.' : 'The givens contradict each other.', tone: solved ? 'success' : 'warn',
    java: [16], py: [20], algo: 4,
    result: solved
      ? { title: 'Solved', text: b.map((row) => row.join('')).join(' ') }
      : { title: 'No solution', text: 'The board cannot be completed' },
  });
  return steps;
}

export const sudokuSolver: ProblemDef<In> = {
  slug: '37-sudoku-solver',
  id: '37', title: 'Sudoku Solver', difficulty: 'Hard', category: 'Backtracking', tag: 'backtrack + constraints',
  statement: 'Fill the empty cells of a 9×9 Sudoku so every row, every column and every 3×3 box contains the digits 1-9 exactly once. The puzzle has a valid solution.',
  constraints: 'board is 9×9; digits 1-9 or "." (animation input: at most 20 empty cells and under 400 steps)',
  examples: [
    { label: 'Easy: 10 empty cells', input: { board: ['53.6789.2', '6721.5348', '198342.67', '.59761423', '4268.3791', '71392485.', '96.537284', '28741.635', '3452861.9'] }, output: 'Solved' },
    { label: 'Backtracks: 19 empty cells', input: { board: ['.3.67891.', '6.2.95..8', '.98342567', '.5976142.', '.26853791', '.1392485.', '9615372.4', '2874.9635', '3..286.7.'] }, output: 'Solved' },
    { label: 'Backtracks more: 20 empty cells', input: { board: ['.34.7....', '672.9.348', '.98.42567', '859761423', '426853791', '71.92.856', '961537...', '287.19635', '.4.2.6.79'] }, output: 'Solved' },
  ],
  inputPlaceholder: '9 rows, e.g. 53.678912 672195348 … (use . for empty)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['3×3 box', 'exactly once', 'empty cells'],
  phases: [
    { icon: '🔎', label: 'Find empty cell', tone: 'blue' },
    { icon: '🔢', label: 'Try legal digit', tone: 'green' },
    { icon: '↩', label: 'Undo (backtrack)', tone: 'cyan' },
    { icon: '🚫', label: 'Dead end', tone: 'orange' },
    { icon: '✅', label: 'Solved', tone: 'green' },
  ],
  legend: [{ label: 'Cell being tried', state: 'active' }, { label: 'Digit placed by the solver', state: 'found' }, { label: 'Dead end', state: 'error' }],
  varLabels: ['row', 'col', 'digit', 'decisions'],
  approach: {
    title: 'First empty cell, try each legal digit',
    text: 'Scan for the first empty cell. For each digit 1-9 that is legal there, write it and recurse. If the recursion fails, erase the digit and try the next one. No empty cell left means solved; a cell with no legal digit means backtrack.',
  },
  java: [
    'public void solveSudoku(char[][] board) {',
    '    solve(board);',
    '}',
    'boolean solve(char[][] b) {',
    '    for (int r = 0; r < 9; r++) {',
    '        for (int c = 0; c < 9; c++) {',
    "            if (b[r][c] != '.') continue;",
    "            for (char d = '1'; d <= '9'; d++) {",
    '                if (!valid(b, r, c, d)) continue;   // clash in row / column / box',
    '                b[r][c] = d;                        // choose',
    '                if (solve(b)) return true;          // explore',
    "                b[r][c] = '.';                      // un-choose",
    '            }',
    '            return false;                           // dead end: no digit fits',
    '        }',
    '    }',
    '    return true;                                    // no empty cell left',
    '}',
    'boolean valid(char[][] b, int r, int c, char d) {',
    '    for (int i = 0; i < 9; i++) {',
    '        if (b[r][i] == d || b[i][c] == d) return false;',
    '        if (b[r / 3 * 3 + i / 3][c / 3 * 3 + i % 3] == d) return false;',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def solve_sudoku(b):',
    '    def valid(r, c, d):',
    '        for i in range(9):',
    '            if b[r][i] == d or b[i][c] == d:',
    '                return False',
    '            if b[r // 3 * 3 + i // 3][c // 3 * 3 + i % 3] == d:',
    '                return False',
    '        return True',
    '    def solve():',
    '        for r in range(9):',
    '            for c in range(9):',
    '                if b[r][c] != ".":',
    '                    continue',
    '                for d in "123456789":',
    '                    if valid(r, c, d):',
    '                        b[r][c] = d  # choose',
    '                        if solve():  # explore',
    '                            return True',
    '                        b[r][c] = "."  # un-choose',
    '                return False  # dead end',
    '        return True  # no empty cell left',
    '    solve()',
  ],
  algorithm: [
    'Scan for the first empty cell (row by row)',
    'For each legal digit: write it and recurse on the next empty cell',
    'If the recursion fails, erase the digit and try the next one',
    'If no digit fits, return false to the caller (dead end)',
    'If no empty cell remains, the board is solved',
  ],
  complexity: [{ label: 'Time', value: 'O(9^E) worst case, E empty cells (pruned heavily)' }, { label: 'Space', value: 'O(E) recursion depth' }],
  why: 'Each placement is checked against its row, column and box, so the board never contains a clash. Every digit that is legal in the first empty cell is tried, and a branch is abandoned only when some cell has no legal digit, which proves that branch cannot be completed. Hence if a solution exists the search finds one, and the first full board it reaches is valid.',
};
