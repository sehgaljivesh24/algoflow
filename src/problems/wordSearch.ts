import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { board: string[]; word: string }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: board rows, then "|", then the word, e.g. ABCE SFCS ADEE | ABCCED');
  const board = parts[0].split(/[\s,;/]+/).filter(Boolean).map((r) => r.toUpperCase());
  const word = parts[1].replace(/\s+/g, '').toUpperCase();
  if (!board.length || board.some((r) => /[^A-Z]/.test(r))) throw new Error('Board rows must be letters only, separated by spaces');
  if (board.some((r) => r.length !== board[0].length)) throw new Error('Every board row must have the same length');
  if (board.length > 4 || board[0].length > 5) throw new Error('Use a board of at most 4 rows and 5 columns');
  if (!word || /[^A-Z]/.test(word)) throw new Error('The word must be letters only');
  if (word.length > 8) throw new Error('Use a word of 8 letters or fewer');
  return { board, word };
}

function build({ board, word }: In): Step[] {
  const R = board.length;
  const C = board[0].length;
  const steps: Step[] = [];
  const path: [number, number][] = [];
  const onPath = board.map((r) => [...r].map(() => false));
  let cur: [number, number] | null = null;
  let bad: [number, number] | null = null;
  let won = false;
  let trimmed = false;
  let k = 0;
  const MAX_STEPS = 360;

  const rows = (): Cell[][] =>
    board.map((row, r) => [...row].map((ch, c) => {
      let state: Cell['state'];
      if (bad && bad[0] === r && bad[1] === c) state = 'error';
      else if (won && onPath[r][c]) state = 'found';
      else if (cur && cur[0] === r && cur[1] === c) state = 'active';
      else if (onPath[r][c]) state = 'compare';
      return { key: `${r},${c}`, value: ch, state };
    }));
  const push = (
    title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, force = false, result?: Step['result'],
    extra: { tag?: string; note?: string; alert?: string } = {},
  ) => {
    if (!force && steps.length >= MAX_STEPS) { trimmed = true; return; }
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: board.map((_, r) => String(r)), colHeads: [...board[0]].map((_, c) => String(c)) },
      aux: [
        { title: 'call stack', kind: 'stack', items: path.map(([r, c], d) => `dfs(${r},${c}, i=${d})`) },
        {
          title: `word (matched ${path.length} of ${word.length})`, kind: 'list', items: [...word].map((ch, i) => (i < path.length ? `${ch}` : `${ch}?`)),
          highlight: extra.alert && path.length < word.length ? path.length : undefined, bad: extra.alert && path.length < word.length ? [path.length] : undefined,
        },
        { title: 'current path', kind: 'stack', items: path.map(([r, c]) => `(${r},${c}) ${board[r][c]}`) },
      ],
      vars: { row: cur ? cur[0] : '—', col: cur ? cur[1] : '—', 'letter index': k, depth: path.length },
      logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...extra,
    });
  };

  push('Start', `Find "${word}" in a ${R}×${C} board by moving up, down, left or right without reusing a cell.`,
    'Try every cell as a possible start. From a match, explore neighbours for the next letter; if stuck, undo the last choice (backtrack).', 'info', [1], [1], 0, false, undefined,
    { tag: 'INIT', note: `scan the ${R}×${C} board for a cell equal to "${word[0]}"` });

  const dfs = (r: number, c: number, i: number): boolean => {
    if (r < 0 || c < 0 || r >= R || c >= C) return false;
    if (onPath[r][c]) {
      k = i;
      cur = [r, c];
      bad = [r, c];
      push(`(${r}, ${c}) is already on the path`, `Cell (${r}, ${c}) holds ${board[r][c]} but is already used in this path.`, 'A cell may appear at most once in a path, so this neighbour is rejected.', 'warn', [9], [10, 11], 2, false, undefined,
        { tag: 'USED CELL ✂️', alert: `Cell (${r}, ${c}) is already on the path and cannot be reused. Branch cut.`, note: `b[${r}][${c}] == '#' (used) → return false` });
      bad = null;
      return false;
    }
    k = i;
    if (board[r][c] !== word[i]) {
      cur = [r, c];
      bad = [r, c];
      push(`(${r}, ${c}) is ${board[r][c]}, need ${word[i]}`, `Mismatch: (${r}, ${c}) is "${board[r][c]}" but letter ${i} of the word is "${word[i]}".`, 'A wrong letter kills this branch immediately.', 'warn', [9], [10, 11], 2, false, undefined,
        { tag: 'MISMATCH ✂️', alert: `Mismatch: "${board[r][c]}" at (${r}, ${c}) is not "${word[i]}" (letter ${i}). Nothing after it can match.`, note: `b[${r}][${c}] = '${board[r][c]}' != w.charAt(${i}) = '${word[i]}' → return false` });
      bad = null;
      return false;
    }
    onPath[r][c] = true;
    path.push([r, c]);
    cur = [r, c];
    if (i === word.length - 1) {
      won = true;
      push(`Matched ${board[r][c]} — word complete`, `Letter ${i} ("${word[i]}") matches at (${r}, ${c}) and it is the last letter.`, 'The whole path is now a valid word placement.', 'success', [8], [8, 9], 4, true, undefined,
        { tag: 'FOUND!', note: `all ${word.length} letters matched → true` });
      return true;
    }
    push(`Match ${board[r][c]} at (${r}, ${c})`, `Letter ${i} ("${word[i]}") matches at (${r}, ${c}). Mark the cell used and look for "${word[i + 1]}" next door.`, 'Marking the cell as used stops the path from reusing it.', 'info', [10, 11, 12], [12, 13, 14], 1, false, undefined,
      { tag: 'MATCH', note: `b[${r}][${c}] == '${word[i]}' → mark '#', next letter ${i + 1} = '${word[i + 1]}'` });
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    if (found) return true;
    onPath[r][c] = false;
    path.pop();
    cur = [r, c];
    push(`Backtrack from (${r}, ${c})`, 'None of the four neighbours continued the word, so free this cell again and step back.', 'Un-marking lets other paths use this cell later.', 'warn', [13], [15], 3, false, undefined,
      { tag: 'BACKTRACK', note: `b[${r}][${c}] = '${board[r][c]}' restored → return false (path length ${path.length})` });
    return false;
  };

  let ok = false;
  for (let r = 0; r < R && !ok; r++) {
    for (let c = 0; c < C && !ok; c++) {
      if (board[r][c] !== word[0]) continue;
      {
        push(`Try a path starting at (${r}, ${c})`, `${board[r][c]} equals the first letter "${word[0]}".`, 'Only cells that match the first letter can start a path.', 'info', [3], [3], 0, false, undefined,
          { tag: 'START CELL', note: `b[${r}][${c}] == '${word[0]}' → dfs(b, w, ${r}, ${c}, 0)` });
      }
      ok = dfs(r, c, 0);
    }
  }

  cur = null;
  const note = trimmed ? ' (Some intermediate steps were skipped to keep the animation short.)' : '';
  push(ok ? 'Found' : 'Not found', ok ? `"${word}" can be traced through the board.${note}` : `No path spells "${word}".${note}`,
    ok ? 'The highlighted cells form the word.' : 'Every start cell and every branch was tried and undone.', ok ? 'success' : 'warn', [ok ? 4 : 5], [ok ? 4 : 5], 5, true,
    { title: String(ok), text: ok ? 'Word exists in the grid' : 'Word is not in the grid' },
    { tag: '✅ Done!', note: `return ${ok}` });
  return steps;
}

export const wordSearch: ProblemDef<In> = {
  slug: '79-word-search',
  id: '79', title: 'Word Search', difficulty: 'Medium', category: 'Matrix', tag: 'DFS + backtrack',
  statement: 'Given a board of letters and a word, decide whether the word can be built from sequentially adjacent cells (horizontally or vertically), using each cell at most once.',
  constraints: '1 ≤ rows, cols ≤ 6, 1 ≤ word length ≤ 15 (animation input is limited to 4 × 5 and 8 letters)',
  examples: [
    { label: 'ABCE SFCS ADEE | ABCCED', input: { board: ['ABCE', 'SFCS', 'ADEE'], word: 'ABCCED' }, output: 'true' },
    { label: 'ABCE SFCS ADEE | ABCB', input: { board: ['ABCE', 'SFCS', 'ADEE'], word: 'ABCB' }, output: 'false' },
    { label: 'ABC DEF | ADEB', input: { board: ['ABC', 'DEF'], word: 'ADEB' }, output: 'true' },
  ],
  inputPlaceholder: 'rows | word, e.g. ABCE SFCS ADEE | ABCCED',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['sequentially adjacent cells', 'at most once'],
  phases: [
    { icon: '🔍', label: 'Start cell', tone: 'blue' },
    { icon: '✔️', label: 'Match', tone: 'green' },
    { icon: '✂️', label: 'Pruned', tone: 'orange' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Cell being tried', state: 'active' }, { label: 'On the current path', state: 'compare' }, { label: 'Wrong letter / used cell', state: 'error' }, { label: 'Final path', state: 'found' }],
  varLabels: ['row', 'col', 'letter index', 'depth'],
  approach: {
    title: 'DFS with undo',
    text: 'Start a depth-first search from every cell matching the first letter. At each step mark the cell as used, try the four neighbours for the next letter, and un-mark the cell when all of them fail so other paths can reuse it.',
  },
  java: [
    'public boolean exist(char[][] b, String w) {',
    '    for (int r = 0; r < b.length; r++)',
    '        for (int c = 0; c < b[0].length; c++)',
    '            if (dfs(b, w, r, c, 0))',
    '                return true;',
    '    return false;',
    '}',
    'boolean dfs(char[][] b, String w, int r, int c, int i) {',
    '    if (i == w.length()) return true;',
    '    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;',
    '    char keep = b[r][c]; b[r][c] = \'#\';',
    '    boolean ok = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1)',
    '              || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);',
    '    b[r][c] = keep;',
    '    return ok;',
    '}',
  ],
  python: [
    'def exist(b, w):',
    '    for r in range(len(b)):',
    '        for c in range(len(b[0])):',
    '            if dfs(b, w, r, c, 0):',
    '                return True',
    '    return False',
    '',
    'def dfs(b, w, r, c, i):',
    '    if i == len(w):',
    '        return True',
    '    if not (0 <= r < len(b) and 0 <= c < len(b[0])) or b[r][c] != w[i]:',
    '        return False',
    '    keep, b[r][c] = b[r][c], "#"',
    '    ok = (dfs(b, w, r + 1, c, i + 1) or dfs(b, w, r - 1, c, i + 1)',
    '          or dfs(b, w, r, c + 1, i + 1) or dfs(b, w, r, c - 1, i + 1))',
    '    b[r][c] = keep',
    '    return ok',
  ],
  algorithm: [
    'Try every cell as the start of the word',
    'If the cell matches the current letter, mark it used and try the four neighbours for the next letter',
    'Prune: a wrong letter or an already-used cell cuts the branch at once',
    'If every neighbour fails, un-mark the cell and backtrack',
    'When all letters are matched, the path is found',
    'Report true, or false if every start cell failed',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n · 3^L)' }, { label: 'Space', value: 'O(L) recursion depth' }],
  why: 'A used cell is blocked only while it is on the current path, because it is restored on the way back. That makes the search explore every simple path, one at a time. After the first step each cell has at most three unused neighbours to continue, which gives the 3^L bound.',
};
