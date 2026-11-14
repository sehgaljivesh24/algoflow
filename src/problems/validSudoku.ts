import type { Cell, LogicTone, ProblemDef, Step, Tone } from '../engine/types.ts';

interface In { board: string[] }

function parse(raw: string): In {
  const board = raw.split(/[\s,;/|]+/).filter(Boolean);
  if (board.length !== 9 || board.some((r) => r.length !== 9)) throw new Error('Give exactly 9 rows of 9 characters, separated by spaces (digits 1-9, "." for empty)');
  if (board.some((r) => /[^1-9.]/.test(r))) throw new Error('Use only the digits 1-9 and "." for an empty cell');
  return { board };
}

const boxOf = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

function build({ board }: In): Step[] {
  const rowSeen: Map<string, number>[] = Array.from({ length: 9 }, () => new Map()); // digit -> column where it was seen
  const colSeen: Map<string, number>[] = Array.from({ length: 9 }, () => new Map()); // digit -> row
  const boxSeen: Map<string, string>[] = Array.from({ length: 9 }, () => new Map()); // digit -> "r,c"
  const checked = board.map((row) => [...row].map(() => false));
  let cur: [number, number] | null = null;
  let clash: [number, number] | null = null;
  let filled = 0;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    board.map((row, r) => [...row].map((ch, c) => {
      let state: Cell['state'];
      let tone: Tone | undefined;
      if (cur) {
        if (boxOf(r, c) === boxOf(cur[0], cur[1])) tone = 'purple';
        else if (r === cur[0]) tone = 'blue';
        else if (c === cur[1]) tone = 'orange';
        if (r === cur[0] && boxOf(r, c) === boxOf(cur[0], cur[1])) tone = 'purple';
      }
      if (clash && ((clash[0] === r && clash[1] === c) || (cur && cur[0] === r && cur[1] === c))) state = 'error';
      else if (cur && cur[0] === r && cur[1] === c) state = 'active';
      else if (checked[r][c]) state = 'sorted';
      else if (ch === '.') state = 'dim';
      return { key: `${r},${c}`, value: ch === '.' ? '' : ch, state, tone };
    }));
  const auxPanels = (dup?: string) => {
    const r = cur ? cur[0] : -1;
    const c = cur ? cur[1] : -1;
    const b = cur ? boxOf(cur[0], cur[1]) : -1;
    const list = (title: string, empty: string, keys: string[] | null) => {
      const items = keys ? keys.sort() : [];
      return { title: keys ? title : empty, kind: 'list' as const, items, bad: dup ? items.flatMap((x, i) => (x === dup ? [i] : [])) : undefined };
    };
    return [
      list(`row ${r} has seen`, 'row seen-set', r >= 0 ? [...rowSeen[r].keys()] : null),
      list(`column ${c} has seen`, 'column seen-set', c >= 0 ? [...colSeen[c].keys()] : null),
      list(`box ${b} has seen`, 'box seen-set', b >= 0 ? [...boxSeen[b].keys()] : null),
    ];
  };
  const push = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number,
    extra: { result?: Step['result']; alert?: string; dup?: string } = {}) =>
    steps.push({
      title, tag, desc, note, alert: extra.alert, scene: { kind: 'grid', rows: rows(), rowHeads: board.map((_, r) => String(r)), colHeads: [...board[0]].map((_, c) => String(c)) },
      aux: auxPanels(extra.dup), vars: { row: cur ? cur[0] : '—', col: cur ? cur[1] : '—', box: cur ? boxOf(cur[0], cur[1]) : '—', 'digits checked': filled },
      logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result: extra.result,
    });

  push('Start', 'START —', 'A 9×9 board with nine empty row sets, nine column sets and nine box sets. Rows, columns and 3×3 boxes may not repeat a digit.',
    'filled cells = 0, nothing seen yet',
    'Each filled cell is checked against three seen-sets: its row, its column and its box. A repeat in any of them means the board is invalid.', 'info', [1, 2, 3], [1, 2, 3], 0);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = board[r][c];
      if (d === '.') continue;
      cur = [r, c];
      const b = boxOf(r, c);
      const prevRow = rowSeen[r].get(d);
      const prevCol = colSeen[c].get(d);
      const prevBox = boxSeen[b].get(d);
      if (prevRow !== undefined || prevCol !== undefined || prevBox !== undefined) {
        const where = prevRow !== undefined ? `row ${r}` : prevCol !== undefined ? `column ${c}` : `box ${b}`;
        clash = prevRow !== undefined ? [r, prevRow] : prevCol !== undefined ? [prevCol, c] : (prevBox!.split(',').map(Number) as [number, number]);
        push(`Duplicate ${d} in ${where}`, 'REJECT:', `digit ${d} at (${r}, ${c}) is already in ${where}, first seen at (${clash[0]}, ${clash[1]}).`,
          `${d} ∈ ${where} set → return false`,
          'One repeated digit is enough: the board is invalid.', 'warn', [6, 7, 8, 9], [6, 7], 2,
          { alert: `Duplicate ${d} in ${where}: cells (${clash[0]}, ${clash[1]}) and (${r}, ${c}) both hold ${d}.`, dup: d });
        push('Invalid board', '✅ Done!', `The scan stops at the first repeat (${d} in ${where}), so the board is invalid after ${filled} accepted digit${filled === 1 ? '' : 's'}.`,
          `return false`,
          'The first violation settles the answer; the rest of the board never needs to be read.', 'success', [9], [7], 4,
          { result: { title: 'false', text: `Duplicate ${d} in ${where}` }, dup: d });
        return steps;
      }
      push(`Look up ${d} at (${r}, ${c})`, 'LOOKUP:', `${d} at (${r}, ${c}) is missing from row ${r}, column ${c} and box ${b}, so no repeat yet.`,
        `${d} ∉ row ${r}, col ${c}, box ${b}`,
        'The box index is (r / 3) * 3 + (c / 3), which numbers the nine boxes 0 … 8.', 'info', [5, 6, 7, 8], [4, 6, 7], 1);
      rowSeen[r].set(d, c);
      colSeen[c].set(d, r);
      boxSeen[b].set(d, `${r},${c}`);
      checked[r][c] = true;
      filled++;
      push(`Record ${d}`, 'RECORD:', `add ${d} to row ${r}, column ${c} and box ${b}: ${filled} digit${filled === 1 ? '' : 's'} verified so far.`,
        `rows[${r}], cols[${c}], boxes[${b}] += ${d}`,
        'Recording the digit lets every later cell in the same row, column or box detect a repeat.', 'info', [6, 7, 8], [8], 3);
    }
  }

  cur = null;
  push('Valid board', '✅ Done!', `All ${filled} filled cells were unique in their row, column and box, so the board is valid.`, `return true after ${filled} digits`,
    'No duplicate was found after scanning the whole board.', 'success', [11], [9], 4,
    { result: { title: 'true', text: 'The board is a valid partial Sudoku' } });
  return steps;
}

export const validSudoku: ProblemDef<In> = {
  slug: '36-valid-sudoku',
  id: '36', title: 'Valid Sudoku', difficulty: 'Medium', category: 'Matrix', tag: 'hash set per row/col/box',
  statement: 'Decide whether a partially filled 9 × 9 Sudoku board is valid: no digit 1-9 may repeat within any row, column or 3 × 3 box. Empty cells (".") are ignored, and the board need not be solvable.',
  constraints: 'board is 9 × 9; each cell is a digit 1-9 or "."',
  examples: [
    { label: 'valid board', input: { board: ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'] }, output: 'true' },
    { label: 'two 8s in one column', input: { board: ['83..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'] }, output: 'false' },
    { label: 'two 1s in one box', input: { board: ['1........', '.1.......', '.........', '.........', '.........', '.........', '.........', '.........', '.........'] }, output: 'false' },
  ],
  inputPlaceholder: '9 rows of 9 chars, e.g. 53..7.... 6..195... .98....6. 8...6...3 4..8.3..1 7...2...6 .6....28. ...419..5 ....8..79',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being checked', state: 'active' }, { label: 'Already verified', state: 'sorted' }, { label: 'Duplicate', state: 'error' }, { label: 'Empty cell', state: 'dim' }],
  varLabels: ['row', 'col', 'box', 'digits checked'],
  approach: {
    title: 'Three seen-sets per cell',
    text: 'Scan every cell once. For a digit, look it up in the set of its row, its column and its 3×3 box (box id = (r/3)·3 + c/3). If it is in any of them the board is invalid; otherwise add it to all three.',
  },
  java: [
    'public boolean isValidSudoku(char[][] b) {',
    '    Set<String> seen = new HashSet<>();',
    '    for (int r = 0; r < 9; r++)',
    '        for (int c = 0; c < 9; c++) {',
    "            if (b[r][c] == '.') continue;",
    '            char d = b[r][c];',
    '            if (!seen.add(d + " in row " + r)',
    '             || !seen.add(d + " in col " + c)',
    '             || !seen.add(d + " in box " + (r / 3) + "," + (c / 3)))',
    '                return false;',
    '        }',
    '    return true;',
    '}',
  ],
  python: [
    'def is_valid_sudoku(b):',
    '    rows = [set() for _ in range(9)]; cols = [set() for _ in range(9)]; boxes = [set() for _ in range(9)]',
    '    for r in range(9):',
    '        for c in range(9):',
    "            d = b[r][c]",
    "            if d == '.': continue",
    '            k = (r // 3) * 3 + c // 3',
    '            if d in rows[r] or d in cols[c] or d in boxes[k]: return False',
    '            rows[r].add(d); cols[c].add(d); boxes[k].add(d)',
    '    return True',
  ],
  phases: [
    { icon: '🧰', label: 'Set up seen-sets', tone: 'blue' },
    { icon: '🔍', label: 'Look up digit', tone: 'cyan' },
    { icon: '⛔', label: 'Reject duplicate', tone: 'orange' },
    { icon: '📝', label: 'Record digit', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['no digit 1-9 may repeat', 'row', 'column', '3 × 3 box'],
  algorithm: [
    'Create one seen-set for each row, column and 3 × 3 box',
    'Visit the next filled cell in reading order and look its digit up in its row, column and box sets',
    'If the digit is in any of the three sets, return false',
    'Otherwise record the digit in all three sets and move on',
    'Done: return true if the scan ends, false at the first repeat',
  ],
  complexity: [{ label: 'Time', value: 'O(81) = O(1)' }, { label: 'Space', value: 'O(81) = O(1)' }],
  why: 'A board violates the rules exactly when some digit occurs twice inside one row, one column or one box. Each cell belongs to exactly one of each, so checking three sets per cell sees every possible repeat. The check is purely local, so validity does not require the puzzle to be solvable.',
};
