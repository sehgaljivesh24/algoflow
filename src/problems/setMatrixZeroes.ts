import type { Cell, LogicTone, ProblemDef, Step, Tone } from '../engine/types.ts';

interface In { m: number[][] }

function parse(raw: string): In {
  const m = raw.split(/[;/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error('Rows of whole numbers separated by ";", e.g. 1 1 1; 1 0 1; 1 1 1');
  if (m.some((r) => r.length !== m[0].length)) throw new Error('Every row must have the same number of columns');
  if (m.length > 7 || m[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  return { m };
}

function build({ m: input }: In): Step[] {
  const m = input.map((r) => [...r]);
  const R = m.length;
  const C = m[0].length;
  const marker = m.map((r) => r.map(() => false)); // first-row / first-column cells used as markers
  const zeroed = m.map((r) => r.map(() => false));
  let cur: [number, number] | null = null;
  let rowZero = false;
  let colZero = false;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, r) => row.map((v, c) => {
      const tone: Tone | undefined = marker[r][c] ? 'orange' : undefined;
      const state = cur && cur[0] === r && cur[1] === c ? 'active' : zeroed[r][c] ? 'found' : undefined;
      return { key: `${r},${c}`, value: v, state, tone };
    }));
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result'], x: Pick<Step, 'tag' | 'note' | 'alert'> = {}) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: m.map((_, r) => String(r)), colHeads: m[0].map((_, c) => String(c)) },
      aux: [{ title: 'first row / column flags', kind: 'map', items: [`first row had a 0 → ${rowZero}`, `first column had a 0 → ${colZero}`] }],
      vars: { 'first row zero': String(rowZero), 'first col zero': String(colZero), row: cur ? cur[0] : '—', col: cur ? cur[1] : '—' },
      logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...x,
    });

  const zerosAtStart = m.flat().filter((v) => v === 0).length;
  push('Start', `A ${R}×${C} matrix with ${zerosAtStart} zero${zerosAtStart === 1 ? '' : 's'}. Any 0 must wipe its whole row and column.`,
    'Zeroing as soon as we see a 0 would create fake zeros. Instead we leave notes in the first row and column, then act on the notes.', 'info', [1], [1], 0, undefined,
    { tag: '🧠 PLAN —', note: `R = ${R}, C = ${C}; the first row and column become the note pad` });

  rowZero = m[0].some((v) => v === 0);
  colZero = m.some((row) => row[0] === 0);
  push('Remember the first row and column', `First row contains a 0: ${rowZero}. First column contains a 0: ${colZero}. Save both before they are overwritten.`,
    'The first row and column are about to become our note pad, so we must remember beforehand whether they themselves held a zero.', 'warn', [3, 4], [2, 3], 0, undefined,
    { tag: '🧠 REMEMBER —', note: `rowZero = ${rowZero}, colZero = ${colZero}` });

  let first = true;
  for (let r = 1; r < R; r++) {
    for (let c = 1; c < C; c++) {
      if (m[r][c] !== 0) continue;
      cur = [r, c];
      m[r][0] = 0;
      m[0][c] = 0;
      marker[r][0] = true;
      marker[0][c] = true;
      push(`Zero at (${r}, ${c})`, `m[${r}][${c}] is 0: write notes by setting (${r}, 0) and (0, ${c}) to 0 (orange). Nothing else is wiped yet.`,
        'Row r and column c now carry a note saying "wipe me" in their first cells.', 'info', [8], [7], 1, undefined,
        { tag: '📝 NOTE —', note: `m[${r}][0] = 0; m[0][${c}] = 0`, alert: first ? 'Only notes are written now: wiping the row and column immediately would create fake zeros.' : undefined });
      first = false;
    }
  }

  cur = null;
  push('Notes complete', `Every inner zero has left a note (${marker.flat().filter(Boolean).length} marked head cells). Now use the notes to wipe cells.`,
    'A cell (r, c) must become 0 exactly when the note at (r, 0) or (0, c) is 0.', 'info', [10], [8], 2, undefined,
    { tag: '📝 NOTES DONE —', note: 'second pass: m[r][0] == 0 || m[0][c] == 0 → m[r][c] = 0' });

  for (let r = 1; r < R; r++) {
    for (let c = 1; c < C; c++) {
      if ((m[r][0] === 0 || m[0][c] === 0) && m[r][c] !== 0) {
        cur = [r, c];
        const old = m[r][c];
        const why = m[r][0] === 0 ? `row note m[${r}][0] = 0` : `column note m[0][${c}] = 0`;
        m[r][c] = 0;
        zeroed[r][c] = true;
        push(`Wipe (${r}, ${c})`, `The ${why} says to wipe, so ${old} at (${r},${c}) becomes 0.`,
          'Inner cells are wiped first; the notes themselves must stay intact until all are used.', 'success', [12], [11], 2, undefined,
          { tag: '🧹 WIPE —', note: `m[${r}][${c}]: ${old} → 0 (${why})` });
      }
    }
  }

  cur = null;
  if (rowZero) {
    for (let c = 0; c < C; c++) { if (m[0][c] !== 0) zeroed[0][c] = true; m[0][c] = 0; }
    push('Wipe the first row', 'The first row originally had a 0 (saved in rowZero), so every cell in it becomes 0.', 'Only now is it safe to act on the first row.', 'success', [13], [12, 13], 3, undefined,
      { tag: '🧱 FIRST ROW —', note: `rowZero is true → m[0][0..${C - 1}] = 0` });
  }
  if (colZero) {
    for (let r = 0; r < R; r++) { if (m[r][0] !== 0) zeroed[r][0] = true; m[r][0] = 0; }
    push('Wipe the first column', 'The first column originally had a 0 (saved in colZero), so every cell in it becomes 0.', 'Likewise the first column is handled last.', 'success', [14], [14, 15], 3, undefined,
      { tag: '🧱 FIRST COLUMN —', note: `colZero is true → m[0..${R - 1}][0] = 0` });
  }
  if (!rowZero && !colZero) {
    push('First row and column stay', 'Neither the first row nor the first column held an original 0, so their note cells keep the marks they already have.', 'The saved flags decide, not the current contents.', 'info', [13], [12], 3, undefined,
      { tag: '🧱 FIRST ROW/COL —', note: 'rowZero = false, colZero = false → nothing extra to wipe', alert: 'Flags are false: wiping the first row or column here would be wrong.' });
  }

  push('Done', `Every row and column that contained an original 0 is now all zeros: ${JSON.stringify(m)}.`, 'The matrix was modified in place with O(1) extra space.', 'success', [15], [15], 4,
    { title: JSON.stringify(m), text: 'Matrix after zeroing' }, { tag: '✅ Done!', note: 'in place, O(1) extra space' });
  return steps;
}

export const setMatrixZeroes: ProblemDef<In> = {
  slug: '73-set-matrix-zeroes',
  id: '73', title: 'Set Matrix Zeroes', difficulty: 'Medium', category: 'Matrix', tag: 'in-place marking',
  statement: 'Given an m × n integer matrix, whenever an element is 0 set its entire row and column to 0. Do it in place.',
  constraints: '1 ≤ m, n ≤ 200 (animation input is limited to 7 × 9), −2³¹ ≤ matrix[i][j] ≤ 2³¹ − 1',
  examples: [
    { label: '1 1 1; 1 0 1; 1 1 1', input: { m: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] }, output: '[[1,0,1],[0,0,0],[1,0,1]]', answer: '[[1,0,1],[0,0,0],[1,0,1]] (row 1 and column 1 wiped)' },
    { label: '0 1 2 0; 3 4 5 2; 1 3 1 5', input: { m: [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]] }, output: '[[0,0,0,0],[0,4,5,0],[0,3,1,0]]' },
    { label: '1 2; 3 4', input: { m: [[1, 2], [3, 4]] }, output: '[[1,2],[3,4]]' },
  ],
  inputPlaceholder: 'rows separated by ";", e.g. 0 1 2 0; 3 4 5 2; 1 3 1 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being examined', state: 'active' }, { label: 'Wiped to zero', state: 'found' }],
  varLabels: ['first row zero', 'first col zero', 'row', 'col'],
  emphasis: ['entire row and column', 'in place'],
  phases: [
    { icon: '🧠', label: 'Remember first row/col', tone: 'blue' },
    { icon: '📝', label: 'Leave notes', tone: 'cyan' },
    { icon: '🧹', label: 'Wipe inner cells', tone: 'orange' },
    { icon: '🧱', label: 'First row / col', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Use the first row and column as notes',
    text: 'Remember whether the first row and column contain a zero. Then, for each inner zero, mark its row and column in the first column and first row. A second pass zeroes every inner cell whose row or column marker is 0, and finally the first row and column are zeroed if they were flagged.',
  },
  java: [
    'public void setZeroes(int[][] m) {',
    '    int R = m.length, C = m[0].length;',
    '    boolean rowZero = false, colZero = false;',
    '    for (int c = 0; c < C; c++) if (m[0][c] == 0) rowZero = true;',
    '    for (int r = 0; r < R; r++) if (m[r][0] == 0) colZero = true;',
    '    for (int r = 1; r < R; r++)',
    '        for (int c = 1; c < C; c++)',
    '            if (m[r][c] == 0) {',
    '                m[r][0] = 0; m[0][c] = 0;',
    '            }',
    '    for (int r = 1; r < R; r++)',
    '        for (int c = 1; c < C; c++)',
    '            if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;',
    '    if (rowZero) for (int c = 0; c < C; c++) m[0][c] = 0;',
    '    if (colZero) for (int r = 0; r < R; r++) m[r][0] = 0;',
    '}',
  ],
  python: [
    'def set_zeroes(m):',
    '    R, C = len(m), len(m[0])',
    '    row_zero = any(m[0][c] == 0 for c in range(C))',
    '    col_zero = any(m[r][0] == 0 for r in range(R))',
    '    for r in range(1, R):',
    '        for c in range(1, C):',
    '            if m[r][c] == 0:',
    '                m[r][0] = m[0][c] = 0',
    '    for r in range(1, R):',
    '        for c in range(1, C):',
    '            if m[r][0] == 0 or m[0][c] == 0:',
    '                m[r][c] = 0',
    '    if row_zero:',
    '        m[0] = [0] * C',
    '    if col_zero:',
    '        for r in range(R): m[r][0] = 0',
  ],
  algorithm: [
    'Record whether the first row and first column contain a zero',
    'Scan the inner cells; for every 0 write a note in its row head and column head',
    'Second pass: zero every inner cell whose row note or column note is 0',
    'Finally zero the first row and/or column if they were flagged',
    'Return the matrix, modified in place',
  ],
  complexity: [{ label: 'Time', value: 'O(m × n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The first row and column double as the note pad, so we save their original state in two booleans first. Inner cells are processed before the note cells are overwritten, so no note is destroyed before it is read, and no fake zero ever created by a wipe is mistaken for an original one.',
};
