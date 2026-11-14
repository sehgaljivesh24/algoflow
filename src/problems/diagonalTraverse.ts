import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { recorder } from './stepKit.ts';
import { gridScene, parseNumRows } from './p4Kit.ts';

interface In { m: number[][] }

function parse(raw: string): In {
  return { m: parseNumRows(raw.replace(/;/g, '/'), { example: '1 2 3 / 4 5 6 / 7 8 9', maxR: 6, maxC: 8, lo: -99, hi: 99 }) };
}

function build({ m }: In): Step[] {
  const R = m.length;
  const C = m[0].length;
  const seen = m.map((row) => row.map(() => false));
  const out: number[] = [];
  let r = 0;
  let c = 0;
  let up = true;
  let diag = 0;
  const steps: Step[] = [];

  const rows = (): Cell[][] => m.map((row, i) => row.map((v, j): Cell => ({
    key: `${i},${j}`, value: v,
    state: i === r && j === c && out.length < R * C ? 'active' : seen[i][j] ? 'sorted' : undefined,
    tone: seen[i][j] || (i === r && j === c) ? (((i + j) % 2 === 0) ? 'orange' : 'blue') : undefined,
  })));
  const say = recorder(steps, () => ({
    scene: gridScene(rows()),
    aux: [{ title: 'output so far', kind: 'list' as const, items: out.map(String) }],
    vars: { row: r, col: c, direction: up ? 'up-right' : 'down-left', diagonal: diag, taken: out.length },
  }));

  say({
    title: 'Start', tag: '🧭 START —', desc: `A ${R}×${C} matrix (${R * C} cells). Read it diagonal by diagonal, alternating up-right and down-left, starting at the top-left cell (0,0).`,
    note: 'r = 0, c = 0, up = true',
    logic: 'Cells on one diagonal share r + c; the direction flips each time a wall is hit.', java: [3, 4], py: [3, 4], algo: 0,
  });

  for (let step = 0; step < R * C; step++) {
    const v = m[r][c];
    out.push(v);
    seen[r][c] = true;
    const here = `(${r}, ${c})`;
    const wasUp = up;
    const pr = r;
    const pc = c;
    let wall: string | null = null;
    let jl: number[];
    let pl: number[];
    if (up) {
      if (c === C - 1) { wall = 'right wall'; r++; up = false; diag++; jl = [7, 8]; pl = [7, 8, 9]; }
      else if (r === 0) { wall = 'top wall'; c++; up = false; diag++; jl = [7, 9]; pl = [7, 10, 11]; }
      else { r--; c++; jl = [7, 10]; pl = [7, 12, 13]; }
    } else {
      if (r === R - 1) { wall = 'bottom wall'; c++; up = true; diag++; jl = [11, 12]; pl = [14, 15, 16]; }
      else if (c === 0) { wall = 'left wall'; r++; up = true; diag++; jl = [11, 13]; pl = [14, 17, 18]; }
      else { r++; c--; jl = [11, 14]; pl = [14, 19, 20]; }
    }
    const dirTag = wasUp ? '↗ UP-RIGHT —' : '↙ DOWN-LEFT —';
    if (out.length < R * C) {
      const next = `(${r}, ${c})`;
      say({
        title: `Take ${v} at ${here}`, tag: wall ? '↻ TURN —' : dirTag,
        desc: wall
          ? `${v} at ${here} goes to the output. The ${wall} blocks the diagonal step, so move to ${next} and turn ${up ? 'up-right' : 'down-left'}.`
          : `${v} at ${here} goes to the output. Keep going ${wasUp ? 'up-right' : 'down-left'} to ${next}.`,
        note: `out[${out.length - 1}] = m[${pr}][${pc}] = ${v}; next = ${next}`,
        alert: wall ? `Hit the ${wall} at ${here}: step along the wall instead of diagonally, then reverse direction.` : undefined,
        logic: 'Corner cells are checked in a fixed order (right/bottom wall before top/left wall) so the path never leaves the matrix.', java: [6, ...jl], py: [6, ...pl], algo: wall ? 2 : 1,
      });
    } else {
      say({
        title: `Take ${v} at ${here}`, tag: '🏁 LAST CELL —', desc: `${v} at ${here} is the last cell, so the output holds all ${plural(R * C, 'value')}.`,
        note: `out[${out.length - 1}] = m[${pr}][${pc}] = ${v}; ${out.length} = R × C`,
        logic: 'Exactly R × C cells were taken, one per loop iteration.', tone: 'success', java: [6], py: [6], algo: 1,
      });
    }
  }
  say({
    title: 'Done', tag: '✅ Done!', desc: `Diagonal order: ${out.join(', ')}. The walk covered ${R + C - 1} diagonals.`,
    note: `return out → [${out.join(',')}]`,
    logic: `The walk visited ${R + C - 1} diagonals and every cell exactly once.`, tone: 'success', java: [17], py: [21], algo: 4,
    result: { title: `[${out.join(',')}]`, text: 'Diagonal traversal' },
  });
  return steps;
}

export const diagonalTraverse: ProblemDef<In> = {
  slug: '498-diagonal-traverse',
  id: '498', title: 'Diagonal Traverse', difficulty: 'Medium', category: 'Matrix', tag: 'diagonal simulation',
  statement: 'Given an m × n matrix, return all its elements in diagonal order: start at the top-left, move up-right along a diagonal, then down-left along the next, alternating until every cell is read.',
  constraints: '1 ≤ m, n ≤ 10⁴ with m · n ≤ 10⁴ (animation input: at most 6 rows × 8 columns, rows separated by "/")',
  examples: [
    { label: '1 2 3 / 4 5 6 / 7 8 9', input: { m: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, output: '[1,2,4,7,5,3,6,8,9]', answer: '[1,2,4,7,5,3,6,8,9] (5 diagonals)' },
    { label: '1 2 / 3 4', input: { m: [[1, 2], [3, 4]] }, output: '[1,2,3,4]' },
    { label: '1 2 3 4 / 5 6 7 8', input: { m: [[1, 2, 3, 4], [5, 6, 7, 8]] }, output: '[1,2,5,6,3,4,7,8]' },
  ],
  inputPlaceholder: 'rows separated by "/", e.g. 1 2 3 / 4 5 6 / 7 8 9',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current cell', state: 'active' }, { label: 'Already read', state: 'sorted' }],
  varLabels: ['row', 'col', 'direction', 'diagonal', 'taken'],
  emphasis: ['diagonal order', 'up-right', 'down-left'],
  phases: [
    { icon: '🧭', label: 'Start', tone: 'blue' },
    { icon: '↗', label: 'Step diagonally', tone: 'cyan' },
    { icon: '↻', label: 'Wall: turn around', tone: 'orange' },
    { icon: '🏁', label: 'All cells read', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Walk one cell at a time and bounce off the walls',
    text: 'Start at (0, 0) heading up-right. After reading a cell, move diagonally; if that would leave the matrix, move one step along the wall instead (right or down) and reverse direction. The walls are tested in a fixed priority: going up, the right wall is checked before the top; going down, the bottom wall before the left.',
  },
  java: [
    'public int[] findDiagonalOrder(int[][] mat) {',
    '    int R = mat.length, C = mat[0].length;',
    '    int[] out = new int[R * C];',
    '    int r = 0, c = 0;',
    '    boolean up = true;',
    '    for (int i = 0; i < R * C; i++) {',
    '        out[i] = mat[r][c];',
    '        if (up) {',
    '            if (c == C - 1) { r++; up = false; }          // right wall: step down, turn around',
    '            else if (r == 0) { c++; up = false; }         // top wall: step right, turn around',
    '            else { r--; c++; }',
    '        } else {',
    '            if (r == R - 1) { c++; up = true; }           // bottom wall: step right, turn around',
    '            else if (c == 0) { r++; up = true; }          // left wall: step down, turn around',
    '            else { r++; c--; }',
    '        }',
    '    }',
    '    return out;',
    '}',
  ],
  python: [
    'def find_diagonal_order(mat):',
    '    R, C = len(mat), len(mat[0])',
    '    out = []',
    '    r = c = 0',
    '    up = True',
    '    for _ in range(R * C):',
    '        out.append(mat[r][c])',
    '        if up:',
    '            if c == C - 1:                  # right wall: step down, turn around',
    '                r += 1; up = False',
    '            elif r == 0:                    # top wall: step right, turn around',
    '                c += 1; up = False',
    '            else:',
    '                r -= 1; c += 1',
    '        else:',
    '            if r == R - 1:                  # bottom wall: step right, turn around',
    '                c += 1; up = True',
    '            elif c == 0:                    # left wall: step down, turn around',
    '                r += 1; up = True',
    '            else:',
    '                r += 1; c -= 1',
    '    return out',
  ],
  algorithm: [
    'Start at the top-left cell heading up-right',
    'Read the cell, then step diagonally if the neighbour exists',
    'At a wall, step along it (right or down) and reverse the direction',
    'After R × C reads the output is complete',
    'Return the output',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(1) besides the output' }],
  why: 'Every cell lies on exactly one diagonal r + c = d, and the walk finishes diagonal d before starting d + 1: from the last cell of one diagonal the single step right or down lands on the first cell of the next, which is what the wall rules do. Because the corner cases are resolved in a fixed order, the position never leaves the matrix, and one cell is output per iteration, so exactly R × C iterations are needed.',
};
