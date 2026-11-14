import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { image: number[][] }

function parse(raw: string): In {
  const image = raw.split(/[\s;,]+/).filter(Boolean).map((r) => {
    if (/[^01]/.test(r)) throw new Error('Each row is a string of 0s and 1s, e.g. 110 101 000');
    return [...r].map(Number);
  });
  if (!image.length) throw new Error('Enter rows of 0s and 1s, e.g. 110 101 000');
  if (image.some((r) => r.length !== image.length)) throw new Error('The image must be square (as many columns as rows)');
  if (image.length > 6) throw new Error('Use at most 6 × 6');
  return { image };
}

function build({ image }: In): Step[] {
  const n = image.length;
  const g = image.map((r) => [...r]);
  const steps: Step[] = [];

  const scene = (row: number, hot: number[], state: CellState) => ({
    kind: 'grid' as const,
    rows: g.map((r, i): Cell[] =>
      r.map((value, c) => {
        let st: CellState | undefined;
        if (i === row && hot.includes(c)) st = state;
        else if (i < row) st = 'sorted';
        return { key: `${i},${c}`, value, state: st, tone: st === 'compare' ? ('yellow' as const) : st === 'swap' ? ('purple' as const) : undefined };
      }),
    ),
    rowHeads: g.map((_, i) => `row ${i}`),
    colHeads: g[0].map((_, c) => String(c)),
  });
  const vars = (row: number | string, l: number | string, r: number | string) => ({ row, l, r });

  steps.push({
    title: 'Start', tag: 'START —', desc: `a ${n}×${n} binary image: for every row reverse it, then flip each bit (0 ↔ 1), all in one two-pointer sweep.`,
    scene: scene(-1, [], 'active'), vars: vars('—', '—', '—'),
    logic: 'Both operations can be done in one sweep: the new left value is the flipped old right value, and vice versa.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `${n} rows to process`,
  });

  for (let row = 0; row < n; row++) {
    steps.push({
      title: `Row ${row}`, tag: 'ROW:', desc: `take row ${row} = [${g[row].join(', ')}] with l = 0 and r = ${n - 1}; ${Math.ceil(n / 2)} pair${Math.ceil(n / 2) === 1 ? '' : 's'} to process.`,
      scene: scene(row, [0, n - 1], 'active'), vars: vars(row, 0, n - 1),
      logic: 'Each row is independent, so we finish one row before starting the next.', logicTone: 'info',
      javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, note: `row = [${g[row].join(', ')}], l = 0, r = ${n - 1}`,
    });
    for (let l = 0, r = n - 1; l <= r; l++, r--) {
      const a = g[row][l];
      const b = g[row][r];
      steps.push({
        title: l === r ? `Middle cell (${row}, ${l})` : `Pair (${row}, ${l}) and (${row}, ${r})`, tag: l === r ? 'MIDDLE:' : 'PAIR:',
        desc: l === r ? `the middle cell (${row}, ${l}) is its own mirror, so it only needs to be flipped: ${a} → ${1 - a}.` : `left row[${l}] = ${a} and right row[${r}] = ${b} will trade places and each gets flipped.`,
        scene: scene(row, [l, r], 'compare'), vars: vars(row, l, r),
        logic: 'Two pointers walk toward the centre of the row, one pair per step.', logicTone: 'info', javaLines: [3, 4], pyLines: [3], algoStep: 1,
        note: l === r ? `a = b = ${a}, l = r = ${l}` : `a = ${a}, b = ${b}, l = ${l}, r = ${r}`,
      });
      g[row][l] = 1 - b;
      g[row][r] = 1 - a;
      steps.push({
        title: l === r ? `Flip (${row}, ${l})` : 'Swap and flip', tag: 'FLIP:',
        desc: l === r ? `the middle cell is now 1 − ${a} = ${g[row][l]}.` : `left becomes 1 − ${b} = ${g[row][l]} and right becomes 1 − ${a} = ${g[row][r]}.`,
        scene: scene(row, [l, r], 'swap'), vars: vars(row, l, r),
        logic: 'New left = flipped old right; new right = flipped old left. Reading both values first makes the swap safe.', logicTone: 'success',
        javaLines: [5, 6, 7], pyLines: [4, 5], algoStep: 2,
        note: l === r ? `row[${l}] = 1 − ${a} = ${g[row][l]}` : `row[${l}] = 1 − ${b} = ${g[row][l]}, row[${r}] = 1 − ${a} = ${g[row][r]}`,
      });
    }
  }

  const flat = g.map((r) => `[${r.join(',')}]`).join(',');
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `every row has been reversed and inverted, giving [${flat}].`,
    scene: { ...scene(n, [], 'active'), rows: g.map((r, i) => r.map((value, c) => ({ key: `${i},${c}`, value, state: 'found' as const }))) }, vars: vars('—', '—', '—'),
    note: `return image`,
    logic: `Result: [${flat}]`, logicTone: 'success', javaLines: [10], pyLines: [6], algoStep: 3,
    result: { title: `[${flat}]`, text: 'Image flipped horizontally, then inverted' },
  });
  return steps;
}

export const flippingAnImage: ProblemDef<In> = {
  slug: '832-flipping-an-image',
  id: '832', title: 'Flipping an Image', difficulty: 'Easy', category: 'Arrays', tag: 'basics',
  statement: 'Given an n × n binary matrix, flip the image horizontally (reverse every row), then invert it (replace every 0 with 1 and every 1 with 0). Return the resulting image.',
  constraints: 'n × n matrix · every entry is 0 or 1 · 1 ≤ n ≤ 20 (animation input is limited to 6 × 6)',
  examples: [
    { label: '110 101 000', input: { image: [[1, 1, 0], [1, 0, 1], [0, 0, 0]] }, output: '[[1,0,0],[0,1,0],[1,1,1]]' },
    { label: '1100 1001 0111 1010', input: { image: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 0]] }, output: '[[1,1,0,0],[0,1,1,0],[0,0,0,1],[1,0,1,0]]' },
    { label: '1', input: { image: [[1]] }, output: '[[0]]' },
  ],
  inputPlaceholder: 'rows of 0/1, e.g. 110 101 000',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pair about to change', state: 'compare' }, { label: 'Just swapped and flipped', state: 'swap' }, { label: 'Finished row', state: 'sorted' }, { label: 'Final image', state: 'found' }],
  varLabels: ['row', 'l', 'r'],
  approach: {
    title: 'Swap and invert in one two-pointer sweep',
    text: 'In each row keep one pointer at each end. Replace the left cell by the inverted right cell and the right cell by the inverted left cell, then move both inward. If they meet at the middle, just invert that one cell.',
  },
  java: [
    'public int[][] flipAndInvertImage(int[][] image) {',
    '    for (int[] row : image) {',
    '        int l = 0, r = row.length - 1;',
    '        while (l <= r) {',
    '            int a = row[l], b = row[r];',
    '            row[l] = 1 - b;',
    '            row[r] = 1 - a;',
    '            l++; r--;',
    '        }',
    '    }',
    '    return image;',
    '}',
  ],
  python: [
    'def flip_and_invert_image(image):',
    '    for row in image:',
    '        l, r = 0, len(row) - 1',
    '        while l <= r:',
    '            row[l], row[r] = 1 - row[r], 1 - row[l]',
    '            l, r = l + 1, r - 1',
    '    return image',
  ],
  phases: [
    { icon: '📄', label: 'Take next row', tone: 'blue' },
    { icon: '👀', label: 'Read pair (l, r)', tone: 'cyan' },
    { icon: '🔄', label: 'Swap and flip', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['flip the image horizontally', 'invert', 'n × n binary matrix'],
  algorithm: [
    'Process each row independently with a pointer at each end',
    'Read the pair at l and r',
    'Set left = 1 − right and right = 1 − left, then move inward',
    'Done: return the image once every row is finished',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Reversing a row swaps cell j with cell n − 1 − j, and inversion is applied per cell, so doing "swap, then invert both" for each mirrored pair gives the same result as the two separate passes. When l = r the pair is one cell and the formula 1 − a still inverts it correctly.',
};
