import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { m: number[][] }

function parse(raw: string): In {
  const m = raw.split(/[;/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error('Rows of whole numbers separated by ";", e.g. 1 2 3; 4 5 6; 7 8 9');
  if (m.some((r) => r.length !== m.length)) throw new Error('The matrix must be square (same number of rows and columns)');
  if (m.length > 7) throw new Error('Use at most a 7 × 7 matrix');
  return { m };
}

function build({ m: input }: In): Step[] {
  const m = input.map((r) => [...r]);
  const n = m.length;
  // id[r][c] is the origin of the value now sitting at (r, c), so each cell keeps a stable key and slides when swapped.
  const id = m.map((row, r) => row.map((_, c) => `${r},${c}`));
  let hot: [number, number][] = [];
  let phase = 'start';
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, r) => row.map((v, c) => ({ key: id[r][c], value: v, state: hot.some(([a, b]) => a === r && b === c) ? 'swap' : undefined })));
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result'], x: Pick<Step, 'tag' | 'note' | 'alert'> = {}) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: m.map((_, r) => String(r)), colHeads: m.map((_, c) => String(c)) },
      vars: { phase, i: hot.length ? hot[0][0] : '—', j: hot.length ? hot[0][1] : '—', n }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...x,
    });
  let swapped = '';
  const swap = (a: [number, number], b: [number, number]) => {
    swapped = `${m[a[0]][a[1]]} ↔ ${m[b[0]][b[1]]}`;
    [m[a[0]][a[1]], m[b[0]][b[1]]] = [m[b[0]][b[1]], m[a[0]][a[1]]];
    [id[a[0]][a[1]], id[b[0]][b[1]]] = [id[b[0]][b[1]], id[a[0]][a[1]]];
    hot = [a, b];
  };

  push('Start', `A ${n}×${n} image. Rotating 90° clockwise = transpose, then reverse every row.`,
    'Doing it as two simple in-place swaps passes avoids allocating a second matrix.', 'info', [1], [1], 0, undefined,
    { tag: '📐 PLAN —', note: `n = ${n}; ${(n * (n - 1)) / 2} transpose swaps, then ${n * Math.floor(n / 2)} row swaps` });

  phase = 'transpose';
  let k = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      swap([i, j], [j, i]);
      k++;
      push(`Transpose: swap (${i}, ${j}) ↔ (${j}, ${i})`, `Mirror across the main diagonal: m[${i}][${j}] and m[${j}][${i}] trade values (${swapped}). Swap ${k} of ${(n * (n - 1)) / 2}.`,
        'Only cells above the diagonal start a swap, so each pair is swapped exactly once.', 'info', [4], [4], 1, undefined,
        { tag: '🔀 TRANSPOSE —', note: `swap m[${i}][${j}] ↔ m[${j}][${i}]: ${swapped}` });
    }
  }
  hot = [];
  push('Transpose complete', 'Rows have become columns. The image is mirrored across the diagonal, not yet rotated.', 'Reversing each row now turns the mirror image into a clockwise rotation.', 'warn', [6], [5], 1, undefined,
    { tag: '🔀 TRANSPOSED —', note: `m = ${JSON.stringify(m)}`, alert: 'Only a mirror image so far: each row must still be reversed to finish the rotation.' });

  phase = 'reverse rows';
  let q = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < Math.floor(n / 2); j++) {
      swap([i, j], [i, n - 1 - j]);
      q++;
      push(`Reverse row ${i}: swap columns ${j} and ${n - 1 - j}`, `Swap the two ends of row ${i}, columns ${j} and ${n - 1 - j} (${swapped}), and move inward. Swap ${q} of ${n * Math.floor(n / 2)}.`,
        'Swapping ends toward the middle reverses the row in place.', 'info', [8], [7], 2, undefined,
        { tag: '↔ REVERSE —', note: `swap row[${j}] ↔ row[${n - 1 - j}] of row ${i}: ${swapped}` });
    }
  }
  hot = [];
  phase = 'done';
  push('Done', `The matrix has been rotated 90° clockwise in place: ${JSON.stringify(m)}.${n % 2 ? ' The centre cell never moved.' : ''}`, 'Transpose followed by a row reversal is exactly a clockwise quarter turn.', 'success', [10], [7], 3,
    { title: JSON.stringify(m), text: 'Rotated matrix' }, { tag: '✅ Done!', note: `rotated in place, no extra matrix` });
  return steps;
}

export const rotateImage: ProblemDef<In> = {
  slug: '48-rotate-image',
  id: '48', title: 'Rotate Image', difficulty: 'Medium', category: 'Matrix', tag: 'transpose + reverse',
  statement: 'Rotate an n × n matrix by 90 degrees clockwise, in place, without allocating another matrix.',
  constraints: '1 ≤ n ≤ 20 (animation input is limited to 7 × 7), −1000 ≤ matrix[i][j] ≤ 1000',
  examples: [
    { label: '1 2 3; 4 5 6; 7 8 9', input: { m: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, output: '[[7,4,1],[8,5,2],[9,6,3]]', answer: '[[7,4,1],[8,5,2],[9,6,3]] (3 transpose swaps + 3 row swaps)' },
    { label: '5 1 9 11; 2 4 8 10; 13 3 6 7; 15 14 12 16', input: { m: [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]] }, output: '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]' },
    { label: '1 2; 3 4', input: { m: [[1, 2], [3, 4]] }, output: '[[3,1],[4,2]]' },
  ],
  inputPlaceholder: 'square matrix, rows separated by ";", e.g. 1 2 3; 4 5 6; 7 8 9',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cells being swapped', state: 'swap' }],
  varLabels: ['phase', 'i', 'j', 'n'],
  emphasis: ['90 degrees clockwise', 'in place'],
  phases: [
    { icon: '📐', label: 'Plan', tone: 'blue' },
    { icon: '🔀', label: 'Transpose', tone: 'cyan' },
    { icon: '↔', label: 'Reverse rows', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Transpose, then reverse each row',
    text: 'A clockwise quarter turn sends the element at (r, c) to (c, n−1−r). Swapping across the main diagonal sends it to (c, r); reversing every row then sends it to (c, n−1−r).',
  },
  java: [
    'public void rotate(int[][] m) {',
    '    int n = m.length;',
    '    for (int i = 0; i < n; i++)',
    '        for (int j = i + 1; j < n; j++) {',
    '            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;',
    '        }',
    '    for (int[] row : m)',
    '        for (int l = 0, r = n - 1; l < r; l++, r--) {',
    '            int t = row[l]; row[l] = row[r]; row[r] = t;',
    '        }',
    '}',
  ],
  python: [
    'def rotate(m):',
    '    n = len(m)',
    '    for i in range(n):',
    '        for j in range(i + 1, n):',
    '            m[i][j], m[j][i] = m[j][i], m[i][j]',
    '    for row in m:',
    '        for l in range(n // 2):',
    '            row[l], row[n - 1 - l] = row[n - 1 - l], row[l]',
  ],
  algorithm: [
    'Let n be the side length',
    'Transpose: swap m[i][j] with m[j][i] for every j > i',
    'Reverse every row by swapping its ends toward the middle',
    'The matrix is now rotated 90° clockwise',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Rotation clockwise maps position (r, c) to (c, n−1−r). A transpose maps it to (c, r), and reversing row c then moves column r to column n−1−r, landing it exactly at (c, n−1−r). Both passes are pure swaps of paired cells, so everything is moved in place with no temporary matrix.',
};
