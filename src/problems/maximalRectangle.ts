import type { Cell, LogicTone, ProblemDef, Step, Tone } from '../engine/types.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  const grid = raw.split(/[\s,;/]+/).filter(Boolean);
  if (!grid.length || grid.some((r) => /[^01]/.test(r))) throw new Error('Rows of 0s and 1s separated by spaces, e.g. 10100 10111 11111 10010');
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same length');
  if (grid.length > 6 || grid[0].length > 8) throw new Error('Use at most 6 rows and 8 columns');
  return { grid };
}

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const h: number[] = Array(C).fill(0);
  const stack: number[] = [];
  const steps: Step[] = [];
  let best = 0;
  let bestBox: [number, number, number, number] | null = null; // r1, r2, c1, c2
  let row = -1;
  let col = -1;
  let box: [number, number, number, number] | null = null;
  const inBox = (b: [number, number, number, number] | null, r: number, c: number) => !!b && r >= b[0] && r <= b[1] && c >= b[2] && c <= b[3];

  const rows = (): Cell[][] =>
    grid.map((line, r) => [...line].map((ch, c) => {
      let state: Cell['state'];
      let tone: Tone | undefined;
      if (inBox(bestBox, r, c)) state = 'found';
      else if (inBox(box, r, c)) state = 'compare';
      else if (r === row && c === col) state = 'active';
      else if (ch === '0') state = 'dim';
      if (r === row && !state) tone = 'blue';
      return { key: `${r},${c}`, value: ch, state, tone };
    }));
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, hl?: number, result?: Step['result']) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: grid.map((_, r) => String(r)), colHeads: [...grid[0]].map((_, c) => String(c)) },
      aux: [
        { title: row >= 0 ? `heights after row ${row} (consecutive 1s ending here)` : 'heights', kind: 'list', items: h.map(String) },
        { title: 'stack (column:height)', kind: 'stack', items: stack.map((c) => `${c}:${h[c]}`), highlight: hl },
      ],
      vars: { row: row >= 0 ? row : '—', col: col >= 0 ? col : '—', 'stack size': stack.length, 'best area': best },
      logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result,
    });

  push('Start', `A ${R}×${C} grid of 0s and 1s. Find the biggest rectangle made only of 1s.`,
    'Trick: treat every row as the floor of a histogram whose bar heights count the consecutive 1s stacked above. The largest rectangle in that histogram is the largest all-1s rectangle ending on that row.', 'info', [1, 2], [1, 2], 0);

  for (let r = 0; r < R; r++) {
    row = r;
    col = -1;
    box = null;
    for (let c = 0; c < C; c++) h[c] = grid[r][c] === '1' ? h[c] + 1 : 0;
    push(`Row ${r}: build the histogram`, `Each column grows by 1 where the cell is 1 and resets to 0 where it is 0. Heights = [${h.join(', ')}].`,
      'A 0 breaks the column of 1s, so its height restarts at 0.', 'info', [3, 4, 5], [3, 4], 1);

    for (let i = 0; i <= C; i++) {
      const cur = i === C ? 0 : h[i];
      col = i === C ? -1 : i;
      while (stack.length && cur < h[stack[stack.length - 1]]) {
        const j = stack.pop()!;
        const left = stack.length ? stack[stack.length - 1] : -1;
        const width = i - left - 1;
        const area = h[j] * width;
        box = h[j] > 0 ? [r - h[j] + 1, r, left + 1, i - 1] : null;
        const improved = area > best;
        if (improved) { best = area; bestBox = box; }
        push(`Pop column ${j}: ${h[j]} × ${width} = ${area}`, `A ${h[j]}-tall rectangle spans columns ${left + 1} to ${i - 1} (the walls are ${left === -1 ? 'the left edge' : `column ${left}`} and ${i === C ? 'the right edge' : `column ${i}`}).`,
          improved ? `New best area: ${best}.` : `Area ${area} does not beat the best (${best}).`, improved ? 'success' : 'info', [15, 16, 17, 18], [12, 13, 14, 15], 2);
        box = null;
      }
      if (i < C) {
        stack.push(i);
        push(`Push column ${i} (height ${h[i]})`, 'Wait for a shorter column to close the rectangle on the right.', 'The stack keeps heights non-decreasing, exactly as in the histogram problem.', 'info', [20], [16], 2, stack.length - 1);
      }
    }
    col = -1;
    stack.length = 0; // only zero-height bars can remain; they cannot form an area
    push(`Row ${r} finished`, `Best rectangle so far: ${best}.`, 'Move to the next row and extend the heights.', 'warn', [6], [5], 3);
  }

  row = -1;
  push('Done', best > 0 ? `The largest all-1s rectangle has area ${best}.` : 'There is no 1 in the grid, so the area is 0.', 'The green block is the winning rectangle.', 'success', [8], [6], 3, undefined,
    { title: String(best), text: 'Largest rectangle of 1s' });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const heights = auxItems(s, 'heights');
    const best = s.vars['best area'];
    if (i === 0) return { tag: 'INIT —', note: 'h = [0, 0, …], best = 0' };
    if (s.title.includes('build the histogram')) return { tag: 'HEIGHTS —', note: `h[c] = cell == '1' ? h[c] + 1 : 0 → [${heights.join(', ')}]` };
    const pop = /^Pop column (\d+): (\d+) × (\d+) = (\d+)/.exec(s.title);
    if (pop) {
      const improved = s.logic.startsWith('New best');
      return { tag: improved ? '🏆 NEW MAX —' : 'POP + AREA —', note: `area = ${pop[2]} × ${pop[3]} = ${pop[4]} → best = ${best}`, desc: `Pop column ${pop[1]} (height ${pop[2]}): a rectangle ${pop[2]} tall and ${pop[3]} wide, area ${pop[4]}. ${improved ? `New best area: ${best}!` : `Best stays ${best}.`}` };
    }
    const push = /^Push column (\d+) \(height (\d+)\)/.exec(s.title);
    if (push) return { tag: 'PUSH —', note: `stack.push(${push[1]}) → h = ${push[2]}`, desc: `Push column ${push[1]} (height ${push[2]}); it waits for a shorter column on its right to close the rectangle.` };
    if (s.title.endsWith('finished')) return { tag: 'ROW DONE —', note: `best = ${best}` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return best = ${best}`, desc: `${s.desc} Answer: ${s.result?.title}.`, algoStep: 4 };
  });
}

export const maximalRectangle: ProblemDef<In> = {
  slug: '85-maximal-rectangle',
  id: '85', title: 'Maximal Rectangle', difficulty: 'Hard', category: 'Stack', tag: 'stack on histogram',
  statement: 'Given a binary matrix of 0s and 1s, find the largest rectangle containing only 1s and return its area.',
  constraints: '1 ≤ rows, cols ≤ 200 (animation input is limited to 6 × 8)',
  examples: [
    { label: '10100 10111 11111 10010', input: { grid: ['10100', '10111', '11111', '10010'] }, output: '6' },
    { label: '11 11', input: { grid: ['11', '11'] }, output: '4' },
    { label: '0', input: { grid: ['0'] }, output: '0' },
  ],
  inputPlaceholder: 'rows of 0/1, e.g. 10100 10111 11111 10010',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current column', state: 'active' }, { label: 'Rectangle being measured', state: 'compare' }, { label: 'Best rectangle so far', state: 'found' }, { label: 'Zero', state: 'dim' }],
  varLabels: ['row', 'col', 'stack size', 'best area'],
  emphasis: ['binary matrix', 'largest rectangle', 'only 1s'],
  phases: [
    { icon: '🚀', label: 'Init heights', tone: 'blue' },
    { icon: '🧱', label: 'Build row histogram', tone: 'cyan' },
    { icon: '📐', label: 'Stack: pop + area', tone: 'orange' },
    { icon: '🏆', label: 'Row done: best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'One histogram per row',
    text: 'Process rows top to bottom while keeping, for each column, the number of consecutive 1s ending at the current row. That array is a histogram, so run the monotonic-stack "largest rectangle in a histogram" on it. The answer is the best over all rows.',
  },
  java: [
    'public int maximalRectangle(char[][] g) {',
    '    int C = g[0].length, best = 0;',
    '    int[] h = new int[C];',
    '    for (char[] row : g) {',
    '        for (int c = 0; c < C; c++)',
    "            h[c] = row[c] == '1' ? h[c] + 1 : 0;",
    '        best = Math.max(best, largestRectangleArea(h));',
    '    }',
    '    return best;',
    '}',
    'int largestRectangleArea(int[] h) {',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    int best = 0, n = h.length;',
    '    for (int i = 0; i <= n; i++) {',
    '        int cur = (i == n) ? 0 : h[i];',
    '        while (!stack.isEmpty() && cur < h[stack.peek()]) {',
    '            int height = h[stack.pop()];',
    '            int left = stack.isEmpty() ? -1 : stack.peek();',
    '            best = Math.max(best, height * (i - left - 1));',
    '        }',
    '        stack.push(i);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def maximal_rectangle(g):',
    '    C, best = len(g[0]), 0',
    '    h = [0] * C',
    '    for row in g:',
    "        h = [h[c] + 1 if row[c] == '1' else 0 for c in range(C)]",
    '        best = max(best, largest_rectangle_area(h))',
    '    return best',
    '',
    'def largest_rectangle_area(h):',
    '    stack, best, n = [], 0, len(h)',
    '    for i in range(n + 1):',
    '        cur = 0 if i == n else h[i]',
    '        while stack and cur < h[stack[-1]]:',
    '            height = h[stack.pop()]',
    '            left = stack[-1] if stack else -1',
    '            best = max(best, height * (i - left - 1))',
    '        stack.append(i)',
    '    return best',
  ],
  algorithm: [
    'Keep an array h of consecutive-1 counts per column',
    'For each row, update h (add 1 on a 1, reset to 0 on a 0)',
    'Run the monotonic-stack largest-rectangle routine on h',
    'Track the best area over all rows',
    'Return the best area after the last row',
  ],
  complexity: [{ label: 'Time', value: 'O(rows × cols)' }, { label: 'Space', value: 'O(cols)' }],
  why: 'Any all-1s rectangle has a bottom row. On that row, the heights count how far each column of 1s extends upward, so the rectangle fits under the histogram of that row and its height is limited by its shortest column. The histogram routine finds the best such rectangle for every bottom row, so the maximum over rows is the true answer. The stack makes each row linear.',
};
