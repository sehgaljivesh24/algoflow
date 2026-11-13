import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, fmtList, recorder } from './stepKit.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error('Enter a whole number from 1 to 6');
  return capSteps(build, { n });
}

function build({ n }: In): Step[] {
  const steps: Step[] = [];
  const cols: number[] = [];
  const solutions: string[] = [];
  let focus: [number, number] | null = null;
  let solved = false;

  const attacked = (r: number, c: number) => cols.some((qc, qr) => qc === c || Math.abs(qc - c) === Math.abs(qr - r));

  const snap = () => {
    const next = cols.length;
    const rows: Cell[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c): Cell => {
        const key = `${r},${c}`;
        const isFocus = focus !== null && focus[0] === r && focus[1] === c;
        if (cols[r] === c) return { key, value: 'Q', state: solved ? 'found' : isFocus ? 'active' : 'sorted' };
        if (isFocus) return { key, value: '', state: 'active' };
        if (r === next && next < n && attacked(r, c)) return { key, value: '×', state: 'error' };
        return { key, value: '' };
      }),
    );
    return {
      scene: { kind: 'grid' as const, rows, rowHeads: rows.map((_, r) => String(r)), colHeads: rows.map((_, c) => String(c)) },
      aux: [
        {
          title: next < n ? `row ${next}: safe columns` : 'row: all filled', kind: 'list' as const,
          items: next < n ? Array.from({ length: n }, (_, c) => `col ${c} ${attacked(next, c) ? '✗' : '✓'}`) : [],
          bad: next < n ? Array.from({ length: n }, (_, c) => c).filter((c) => attacked(next, c)) : undefined,
        },
        { title: 'call stack · queens (row, col)', kind: 'stack' as const, items: cols.map((c, r) => `solve(row=${r}) → (${r},${c})`) },
        { title: `solutions (${solutions.length}) · column per row`, kind: 'list' as const, items: [...solutions], highlight: solutions.length - 1 },
      ],
      vars: { row: cols.length, queens: cols.length, 'last col': cols.length ? cols[cols.length - 1] : '—', solutions: solutions.length },
    };
  };
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Place ${n} queens on a ${n}×${n} board so none attacks another. One queen per row, so rows never clash; only columns and diagonals can.`,
    note: `solve(n=${n}, cols=[ ]) → row 0`,
    logic: 'Only columns and diagonals can conflict. Red × squares in the next row show where earlier queens already attack.',
    java: [2], py: [14], algo: 0,
  });

  const solve = () => {
    const row = cols.length;
    for (let c = 0; c < n; c++) {
      if (attacked(row, c)) continue;
      cols.push(c);
      focus = [row, c];
      if (row === n - 1) {
        solutions.push(fmtList(cols));
        solved = true;
        say({
          title: `Solution found: ${fmtList(cols)}`, tag: 'SOLUTION!',
          desc: `The last queen goes on (${row}, ${c}); all ${n} rows are filled safely. Record solution #${solutions.length}: columns ${fmtList(cols)}.`,
          note: `row == ${n} → res.add(draw(${fmtList(cols)}))`,
          logic: 'A full board reached through safe placements is automatically valid.', tone: 'success', java: [7], py: [6, 7], algo: 2,
        });
        solved = false;
      } else {
        const dead = Array.from({ length: n }, (_, k) => attacked(row + 1, k)).every(Boolean);
        say({
          title: `Place queen at (${row}, ${c})`, tag: dead ? 'DEAD END' : 'PLACE',
          ...(dead ? { alert: `Dead end: every square of row ${row + 1} is attacked, so this placement cannot lead to a solution.` } : {}),
          desc: dead
            ? `Queen on column ${c}. Row ${row + 1} is now fully attacked (all ×): no square is left, so we must backtrack.`
            : `Queen on column ${c}. Squares marked × in row ${row + 1} are now off-limits; explore the next row.`,
          note: `safe(${row}, ${c}) → cols.add(${c}); cols = ${fmtList(cols)}${dead ? ' → row ' + (row + 1) + ' has 0 safe squares' : ''}`,
          logic: dead ? 'Dead end: abandon this placement as soon as a row has no safe square.' : 'Choose a safe square, then explore the next row.',
          tone: dead ? 'warn' : 'info', java: [10, 11], py: [11, 12], algo: dead ? 3 : 1,
        });
        solve();
      }
      cols.pop();
      focus = [row, c];
      say({
        title: `Remove queen from (${row}, ${c})`, tag: 'BACKTRACK',
        desc: `Take the queen back off (${row}, ${c}); row ${row} will try its next safe column after ${c}.`,
        note: `cols.remove(last); cols = ${fmtList(cols)}`,
        logic: 'Un-choose: restore the board exactly as it was before this placement.', tone: 'warn', java: [12], py: [13], algo: 4,
      });
    }
  };
  solve();

  focus = null;
  say({
    title: 'Done', tag: '✅ Done!', desc: `${solutions.length} solution${solutions.length === 1 ? '' : 's'} for n = ${n}${solutions.length ? `: ${solutions.join(' ')}` : '; every row-by-row attempt hit a dead end'}.`,
    note: `return res → ${solutions.length} solution${solutions.length === 1 ? '' : 's'}`,
    logic: n >= 4 ? 'The known counts are 2, 10, 4 for n = 4, 5, 6 (1 for n = 1, none for 2 and 3).' : 'Tiny boards are special: one queen fits, but two or three cannot avoid attacking.',
    tone: 'success', java: [3], py: [15],
    algo: 5, result: { title: `${solutions.length} solution${solutions.length === 1 ? '' : 's'}`, text: solutions.length ? solutions.join(' ') : 'No placement works' },
  });
  return steps;
}

export const nQueens: ProblemDef<In> = {
  slug: '51-n-queens',
  id: '51', title: 'N-Queens', difficulty: 'Hard', category: 'Backtracking', tag: 'backtrack + constraints',
  statement: 'Place n queens on an n×n chessboard so that no two queens attack each other (same row, column or diagonal). Return every distinct arrangement.',
  constraints: '1 ≤ n ≤ 9 (animation input is limited to n ≤ 6, under 400 steps)',
  examples: [
    { label: 'n = 4', input: { n: 4 }, output: '2 solutions' },
    { label: 'n = 5', input: { n: 5 }, output: '10 solutions' },
    { label: 'n = 3', input: { n: 3 }, output: '0 solutions' },
  ],
  inputPlaceholder: 'e.g. 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['n queens', 'attack each other', 'every distinct arrangement'],
  phases: [
    { icon: '♛', label: 'Init', tone: 'blue' },
    { icon: '➕', label: 'Place queen', tone: 'green' },
    { icon: '🌟', label: 'Solution!', tone: 'gold' },
    { icon: '✂️', label: 'Dead end', tone: 'orange' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Queen just placed / removed', state: 'active' }, { label: 'Queen on board', state: 'sorted' }, { label: 'Attacked square', state: 'error' }, { label: 'Solution', state: 'found' }],
  varLabels: ['row', 'queens', 'last col', 'solutions'],
  approach: {
    title: 'One queen per row, undo on dead ends',
    text: 'Fill rows top to bottom. In each row try every column that no earlier queen attacks (same column or diagonal). Place, recurse to the next row, then remove the queen. Reaching row n records a solution.',
  },
  java: [
    'public List<List<String>> solveNQueens(int n) {',
    '    List<List<String>> res = new ArrayList<>();',
    '    solve(n, new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void solve(int n, List<Integer> cols, List<List<String>> res) {',
    '    int row = cols.size();',
    '    if (row == n) { res.add(draw(cols)); return; }',
    '    for (int c = 0; c < n; c++) {',
    '        if (!safe(cols, row, c)) continue;      // attacked square',
    '        cols.add(c);                            // place',
    '        solve(n, cols, res);                    // explore next row',
    '        cols.remove(cols.size() - 1);           // remove',
    '    }',
    '}',
    'boolean safe(List<Integer> cols, int row, int c) {',
    '    for (int r = 0; r < row; r++)',
    '        if (cols.get(r) == c || Math.abs(cols.get(r) - c) == row - r) return false;',
    '    return true;',
    '}',
  ],
  python: [
    'def solve_n_queens(n):',
    '    res, cols = [], []',
    '    def safe(row, c):',
    '        return all(cols[r] != c and abs(cols[r] - c) != row - r for r in range(row))',
    '    def solve():',
    '        row = len(cols)',
    '        if row == n:',
    '            res.append(draw(cols)); return',
    '        for c in range(n):',
    '            if not safe(row, c):',
    '                continue  # attacked square',
    '            cols.append(c)  # place',
    '            solve()  # explore next row',
    '            cols.pop()  # remove',
    '    solve()',
    '    return res',
  ],
  algorithm: [
    'Start with an empty board; one queen will go in each row',
    'Place a queen on a safe square (columns or diagonals attacked by earlier queens are skipped) and explore the next row',
    'When all n rows hold a queen, record the board',
    'Dead end: if the next row has no safe square, abandon this placement at once',
    'Remove the queen and try the next column of that row',
    'Return all recorded solutions',
  ],
  complexity: [{ label: 'Time', value: 'O(n!) worst case (heavily pruned)' }, { label: 'Space', value: 'O(n) recursion, plus output' }],
  why: 'Putting exactly one queen in each row removes row conflicts by construction. The safe test rejects same-column and same-diagonal squares (|Δcol| = |Δrow|), so every partial board stays conflict-free. Trying every safe column in every row visits all valid boards, and cutting a branch the moment a row has no safe square never discards a solution.',
};
