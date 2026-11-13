import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';
import { gridScene, parseCharRows } from './p4Kit.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  return { grid: parseCharRows(raw.toUpperCase(), { alphabet: 'XO', example: 'XXXX XOOX XXOX XOXX', what: 'the board', maxR: 6, maxC: 8 }) };
}

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const b = grid.map((row) => [...row]);
  const safe = grid.map((row) => [...row].map(() => false));
  const captured = grid.map((row) => [...row].map(() => false));
  const stack: string[] = [];
  let cur: [number, number] | null = null;
  let nSafe = 0;
  let phase = 0;
  const steps: Step[] = [];
  const oCount = grid.join('').split('O').length - 1;
  const doomedNow = () => b.flat().filter((ch, i) => ch === 'O' && !safe[Math.floor(i / C)][i % C]).length + captured.flat().filter(Boolean).length;

  const rows = (): Cell[][] =>
    b.map((row, r) => row.map((ch, c): Cell => {
      const key = `${r},${c}`;
      if (cur && cur[0] === r && cur[1] === c) return { key, value: captured[r][c] ? 'X' : 'O', state: captured[r][c] ? 'error' : 'active' };
      if (safe[r][c]) return { key, value: 'O', state: 'found' };
      if (captured[r][c]) return { key, value: 'X', state: 'error' };
      if (ch === 'X') return { key, value: 'X', state: 'dim' };
      return { key, value: 'O', state: phase === 2 ? 'swap' : undefined };
    }));
  const say = recorder(steps, () => ({
    scene: gridScene(rows()),
    aux: [{ title: 'recursion stack (border flood)', kind: 'stack' as const, items: [...stack] }],
    vars: { 'safe O cells': nSafe, 'O cells to capture': doomedNow(), 'stack depth': stack.length, phase: phase === 0 ? 'start' : phase === 1 ? 'mark safe' : phase === 2 ? 'capture' : 'restore' },
  }));

  say({
    title: 'Start', tag: '🔍 PLAN —', desc: `A ${R}×${C} board with ${oCount} O cell${oCount === 1 ? '' : 's'}. An O group survives only if it touches the border; all other O groups become X.`,
    note: `${oCount} O cells; flood from the border instead of searching for enclosed groups`,
    logic: 'An O group survives only if it connects to a border O. So flip the question: find everything that is safe, and capture the rest.', java: [1], py: [1, 2], algo: 0,
  });

  const dfs = (r: number, c: number, from: [number, number] | null) => {
    safe[r][c] = true;
    nSafe++;
    stack.push(`dfs(${r},${c})`);
    cur = [r, c];
    const onBorder = r === 0 || c === 0 || r === R - 1 || c === C - 1;
    const blocked: string[] = [];
    const fresh: string[] = [];
    [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].forEach(([nr, nc]) => {
      if (from && nr === from[0] && nc === from[1]) return;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) return;
      if (b[nr][nc] === 'X') blocked.push(`(${nr},${nc}) is X`);
      else if (safe[nr][nc]) blocked.push(`(${nr},${nc}) is already safe`);
      else fresh.push(`(${nr},${nc})`);
    });
    say({
      title: `Mark (${r}, ${c}) safe`, tag: '🌊 FLOOD —',
      desc: `(${r},${c}) ${onBorder ? 'is a border O' : 'touches a safe O'}, so it can never be surrounded (${nSafe} safe so far). ${fresh.length ? `O neighbours to visit: ${fresh.join(', ')}.` : 'No further O neighbours.'}`,
      note: `b[${r}][${c}] = '#'; safe = ${nSafe}`,
      alert: blocked.length ? `Not followed: ${blocked.slice(0, 3).join('; ')}${blocked.length > 3 ? '; …' : ''}.` : undefined,
      logic: 'Safety spreads through connected O cells exactly like a flood fill.', java: [12], py: [5], algo: 1,
    });
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]] as [number, number][]) {
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || b[nr][nc] !== 'O' || safe[nr][nc]) continue;
      dfs(nr, nc, [r, c]);
    }
    stack.pop();
  };

  phase = 1;
  const border: [number, number][] = [];
  for (let r = 0; r < R; r++) { border.push([r, 0], [r, C - 1]); }
  for (let c = 0; c < C; c++) { border.push([0, c], [R - 1, c]); }
  const borderO = new Set(border.filter(([r, c]) => b[r][c] === 'O').map(([r, c]) => `${r},${c}`)).size;
  say({
    title: 'Flood from the border', tag: '🌊 SEED —', desc: `${borderO} O cell${borderO === 1 ? ' sits' : 's sit'} on the four edges. Each is safe, and so is every O connected to it.`,
    note: `dfs from every border cell: ${borderO} border O${borderO === 1 ? '' : 's'}`,
    logic: 'Seeding the search from the whole border at once is the same idea as multi-source BFS.', java: [2, 3], py: [8, 9, 10, 11], algo: 1,
  });
  for (const [r, c] of border) if (b[r][c] === 'O' && !safe[r][c]) dfs(r, c, null);
  cur = null;

  phase = 2;
  const doomed = doomedNow();
  say({
    title: 'Border flood finished', tag: doomed ? '🚫 ENCLOSED —' : '🔎 CHECK —',
    desc: doomed ? `${doomed} O cell${doomed === 1 ? ' is' : 's are'} still unmarked (orange): no path leads from them to the border.` : 'Every O is safe, so nothing will be captured.',
    note: `${nSafe} safe, ${doomed} unmarked`,
    alert: doomed ? `${doomed} O cell${doomed === 1 ? ' is' : 's are'} enclosed by X: unreachable from the border.` : undefined,
    logic: 'An unmarked O has no route to the border, so it is enclosed.', tone: doomed ? 'warn' : 'info', java: [4], py: [12], algo: 2,
  });
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (b[r][c] === 'O' && !safe[r][c]) {
        captured[r][c] = true;
        b[r][c] = 'X';
        cur = [r, c];
        say({
          title: `Capture (${r}, ${c})`, tag: '✂️ CAPTURE —', desc: `(${r},${c}) was never marked safe, so it is surrounded: flip it to X (${captured.flat().filter(Boolean).length} of ${doomed} captured).`,
          note: `board[${r}][${c}] = 'X'`,
          logic: 'An unmarked O cannot reach the border, so flipping it is safe.', tone: 'success', java: [6], py: [14], algo: 3,
        });
      }
    }
  }
  cur = null;
  phase = 3;
  const out = b.map((row) => row.join('')).join(' ');
  say({
    title: 'Restore the safe cells', tag: '♻ RESTORE —', desc: `The ${nSafe} safe cell${nSafe === 1 ? '' : 's'} (marked #) turn back into plain O.`,
    note: `board[r][c] = 'O' for ${nSafe} cell${nSafe === 1 ? '' : 's'}`,
    logic: 'One last pass over the board finishes the job.', tone: 'success', java: [7], py: [15], algo: 4,
  });
  say({
    title: 'Done', tag: '✅ Done!', desc: `Final board: ${out}. ${doomed} cell${doomed === 1 ? '' : 's'} captured, ${nSafe} kept.`,
    note: `return board → ${out}`,
    logic: 'Each cell was visited a constant number of times, so the work is O(R · C).', tone: 'success', java: [9], py: [16], algo: 4,
    result: { title: out, text: 'Board after capturing surrounded regions' },
  });
  return steps;
}

export const surroundedRegions: ProblemDef<In> = {
  slug: '130-surrounded-regions',
  id: '130', title: 'Surrounded Regions', difficulty: 'Medium', category: 'Matrix', tag: 'border DFS',
  statement: 'A board contains X and O. A region of connected O cells (up, down, left, right) is surrounded if none of its cells lies on the border of the board. Replace every cell of every surrounded region with X, in place.',
  constraints: '1 ≤ rows, columns ≤ 200 (animation input: at most 6 rows × 8 columns, rows written like XXXX XOOX XXOX XOXX)',
  examples: [
    { label: 'XXXX XOOX XXOX XOXX', input: { grid: ['XXXX', 'XOOX', 'XXOX', 'XOXX'] }, output: 'XXXX XXXX XXXX XOXX', answer: 'XXXX XXXX XXXX XOXX (3 cells captured, the bottom O stays)' },
    { label: 'XOX OXO XOX', input: { grid: ['XOX', 'OXO', 'XOX'] }, output: 'XOX OXO XOX' },
    { label: 'XXXXX XOOOX XOXOX XOOOX XXXXX', input: { grid: ['XXXXX', 'XOOOX', 'XOXOX', 'XOOOX', 'XXXXX'] }, output: 'XXXXX XXXXX XXXXX XXXXX XXXXX' },
  ],
  inputPlaceholder: 'e.g. XXXX XOOX XXOX XOXX   (rows of X and O)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being visited', state: 'active' }, { label: 'Safe O (reaches the border)', state: 'found' }, { label: 'Unmarked O (enclosed)', state: 'swap' }, { label: 'Captured', state: 'error' }, { label: 'X', state: 'dim' }],
  varLabels: ['safe O cells', 'O cells to capture', 'stack depth', 'phase'],
  emphasis: ['surrounded', 'border'],
  phases: [
    { icon: '🔍', label: 'Plan', tone: 'blue' },
    { icon: '🌊', label: 'Border flood', tone: 'cyan' },
    { icon: '🚫', label: 'Enclosed found', tone: 'orange' },
    { icon: '✂️', label: 'Capture', tone: 'orange' },
    { icon: '✅', label: 'Restore + done', tone: 'green' },
  ],
  approach: {
    title: 'Protect what touches the border, capture the rest',
    text: 'Instead of finding enclosed regions directly, flood-fill from every O on the border and mark everything reachable as safe. Any O that is still unmarked afterwards cannot reach the border, so it is flipped to X; the safe ones are turned back into plain O.',
  },
  java: [
    'public void solve(char[][] board) {',
    '    int R = board.length, C = board[0].length;',
    '    for (int r = 0; r < R; r++) { dfs(board, r, 0); dfs(board, r, C - 1); }',
    '    for (int c = 0; c < C; c++) { dfs(board, 0, c); dfs(board, R - 1, c); }',
    '    for (int r = 0; r < R; r++)',
    '        for (int c = 0; c < C; c++) {',
    '            if (board[r][c] == \'O\') board[r][c] = \'X\';        // enclosed: capture',
    '            else if (board[r][c] == \'#\') board[r][c] = \'O\';   // safe: restore',
    '        }',
    '}',
    'private void dfs(char[][] b, int r, int c) {',
    '    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != \'O\') return;',
    '    b[r][c] = \'#\';                                            // safe',
    '    dfs(b, r + 1, c); dfs(b, r - 1, c); dfs(b, r, c + 1); dfs(b, r, c - 1);',
    '}',
  ],
  python: [
    'def solve(board):',
    '    R, C = len(board), len(board[0])',
    '    def dfs(r, c):',
    '        if r < 0 or c < 0 or r >= R or c >= C or board[r][c] != "O":',
    '            return',
    '        board[r][c] = "#"                       # safe',
    '        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '            dfs(r + dr, c + dc)',
    '    for r in range(R):',
    '        dfs(r, 0); dfs(r, C - 1)',
    '    for c in range(C):',
    '        dfs(0, c); dfs(R - 1, c)',
    '    for r in range(R):',
    '        for c in range(C):',
    '            if board[r][c] == "O": board[r][c] = "X"      # enclosed: capture',
    '            elif board[r][c] == "#": board[r][c] = "O"    # safe: restore',
    '    return board',
  ],
  algorithm: [
    'Read the board; the border decides which O cells survive',
    'Flood-fill from every border O, marking everything reachable as safe',
    'When the flood ends, any O left unmarked is enclosed',
    'Capture: flip each enclosed O to X',
    'Restore the safe cells to O and return the board',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C) recursion depth' }],
  why: 'An O cell escapes capture exactly when some path of O cells connects it to the border, and the flood from all border O cells visits precisely the cells that have such a path. Everything else is therefore enclosed by X, and flipping it is safe. Restoring the temporary marker makes the surviving cells look unchanged.',
};
