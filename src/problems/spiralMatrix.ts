import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';

interface In { m: number[][] }

function parse(raw: string): In {
  const m = raw.split(/[;/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error('Rows of whole numbers separated by ";", e.g. 1 2 3; 4 5 6; 7 8 9');
  if (m.some((r) => r.length !== m[0].length)) throw new Error('Every row must have the same number of columns');
  if (m.length > 7 || m[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  return { m };
}

const asc = (a: number, b: number): number[] => {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
};
const desc = (a: number, b: number): number[] => {
  const out: number[] = [];
  for (let i = a; i >= b; i--) out.push(i);
  return out;
};

function build({ m }: In): Step[] {
  const R = m.length;
  const C = m[0].length;
  const seen = m.map((r) => r.map(() => false));
  const out: number[] = [];
  let top = 0, bottom = R - 1, left = 0, right = C - 1;
  let cur: [number, number] | null = null;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, r) => row.map((v, c) => ({
      key: `${r},${c}`, value: v,
      state: cur && cur[0] === r && cur[1] === c ? 'active' : seen[r][c] ? 'sorted' : undefined,
    })));
  const scene = () => ({ kind: 'grid' as const, rows: rows(), rowHeads: m.map((_, r) => String(r)), colHeads: m[0].map((_, c) => String(c)) });
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result'], x: Pick<Step, 'tag' | 'note' | 'alert'> = {}) =>
    steps.push({
      title, desc, scene: scene(), aux: [{ title: 'output so far', kind: 'list', items: out.map(String) }],
      vars: { top, bottom, left, right, taken: out.length }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...x,
    });

  push('Start', `A ${R}×${C} matrix (${R * C} cells). Four walls, top = 0, bottom = ${R - 1}, left = 0, right = ${C - 1}, bound the part not yet visited.`,
    'Walk the outer ring clockwise, then shrink the walls inward and repeat until they cross.', 'info', [2], [2], 0, undefined,
    { tag: '🧱 WALLS —', note: `top = 0, bottom = ${R - 1}, left = 0, right = ${C - 1}` });

  const ICON: Record<string, string> = { 'top row': '➡', 'right column': '⬇', 'bottom row': '⬅', 'left column': '⬆' };
  const WALL: Record<string, string> = { 'top row': 'top', 'right column': 'right', 'bottom row': 'bottom', 'left column': 'left' };
  const walk = (label: string, cells: [number, number][], jv: number[], pv: number[], shrink: () => [number, number], js: number[], ps: number[]) => {
    for (const [r, c] of cells) {
      cur = [r, c];
      seen[r][c] = true;
      out.push(m[r][c]);
      push(`Take ${m[r][c]}`, `(${r}, ${c}) holds ${m[r][c]}: walking the ${label}. ${out.length} of ${plural(R * C, 'cell')} taken.`, 'Each cell is taken exactly once, in the order the ring is walked.', 'info', jv, pv, 1, undefined,
        { tag: `${ICON[label]} TAKE —`, note: `out.add(m[${r}][${c}]) → ${m[r][c]}; taken = ${out.length}` });
    }
    const [from, to] = shrink();
    push(`Shrink: ${WALL[label]} = ${to}`, `The ${label} is finished, so ${WALL[label]} moves from ${from} to ${to}. The unvisited part is now rows ${top}–${bottom}, columns ${left}–${right}.`, 'Moving the wall past the finished line guarantees it is never walked again.', 'warn', js, ps, 2, undefined,
      { tag: '🔽 SHRINK —', note: `${WALL[label]} ${label === 'top row' || label === 'left column' ? '++' : '--'} → ${to}` });
  };

  let ring = 0;
  while (top <= bottom && left <= right) {
    ring++;
    push(`Ring ${ring}`, `Ring ${ring} spans rows ${top}–${bottom} and columns ${left}–${right}. Walk it clockwise: top row, right column, bottom row, left column.`, 'Each ring is one lap of the spiral.', 'info', [3], [3], 0, undefined,
      { tag: `🌀 RING ${ring} —`, note: `top = ${top}, bottom = ${bottom}, left = ${left}, right = ${right}` });
    walk('top row', asc(left, right).map((c) => [top, c]), [4], [4, 5], () => { top++; return [top - 1, top]; }, [5], [6]);
    walk('right column', asc(top, bottom).map((r) => [r, right]), [6], [7, 8], () => { right--; return [right + 1, right]; }, [7], [9]);
    if (top <= bottom) walk('bottom row', desc(right, left).map((c) => [bottom, c]), [9], [11, 12], () => { bottom--; return [bottom + 1, bottom]; }, [10], [13]);
    else push('Guard: skip the bottom row', `top = ${top} is past bottom = ${bottom}, so there is no bottom row left.`, 'Without this guard a single remaining row would be walked twice.', 'warn', [8], [10], 3, undefined,
      { tag: '🛡 GUARD —', note: `top (${top}) <= bottom (${bottom}) is false`, alert: `Single row already taken: top (${top}) > bottom (${bottom}), so the bottom row is skipped.` });
    if (left <= right) walk('left column', desc(bottom, top).map((r) => [r, left]), [13], [15, 16], () => { left++; return [left - 1, left]; }, [14], [17]);
    else push('Guard: skip the left column', `left = ${left} is past right = ${right}, so there is no left column left.`, 'Without this guard a single remaining column would be walked twice.', 'warn', [12], [14], 3, undefined,
      { tag: '🛡 GUARD —', note: `left (${left}) <= right (${right}) is false`, alert: `Single column already taken: left (${left}) > right (${right}), so the left column is skipped.` });
  }

  cur = null;
  push('Done', `The walls have crossed (top = ${top} > bottom = ${bottom} or left = ${left} > right = ${right}): all ${plural(out.length, 'cell')} ${verb(out.length, 'was', 'were')} taken once.`, `Result: [${out.join(', ')}]`, 'success', [17], [18], 4,
    { title: JSON.stringify(out), text: 'Spiral order' }, { tag: '✅ Done!', note: `return out → [${out.join(',')}]` });
  return steps;
}

export const spiralMatrix: ProblemDef<In> = {
  slug: '54-spiral-matrix',
  id: '54', title: 'Spiral Matrix', difficulty: 'Medium', category: 'Matrix', tag: 'simulation',
  statement: 'Given an m × n matrix, return all of its elements in clockwise spiral order, starting at the top-left corner.',
  constraints: '1 ≤ m, n ≤ 10 (animation input is limited to 7 × 9), −100 ≤ matrix[i][j] ≤ 100',
  examples: [
    { label: '1 2 3; 4 5 6; 7 8 9', input: { m: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, output: '[1,2,3,6,9,8,7,4,5]', answer: '[1,2,3,6,9,8,7,4,5] (two rings: the border, then the centre 5)' },
    { label: '1 2 3 4; 5 6 7 8; 9 10 11 12', input: { m: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] }, output: '[1,2,3,4,8,12,11,10,9,5,6,7]' },
    { label: '1; 2; 3', input: { m: [[1], [2], [3]] }, output: '[1,2,3]' },
  ],
  inputPlaceholder: 'rows separated by ";", e.g. 1 2 3; 4 5 6; 7 8 9',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being taken', state: 'active' }, { label: 'Already taken', state: 'sorted' }],
  varLabels: ['top', 'bottom', 'left', 'right', 'taken'],
  emphasis: ['clockwise spiral order'],
  phases: [
    { icon: '🧱', label: 'Set walls', tone: 'blue' },
    { icon: '➡', label: 'Walk a side', tone: 'cyan' },
    { icon: '🔽', label: 'Shrink wall', tone: 'orange' },
    { icon: '🛡', label: 'Guard', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Peel the matrix like an onion',
    text: 'Keep four boundaries. Walk the top row left to right, the right column downward, the bottom row right to left and the left column upward, moving each wall inward after its side is done. Guards stop the last two sides from re-walking a single remaining row or column.',
  },
  java: [
    'public List<Integer> spiralOrder(int[][] m) {',
    '    List<Integer> out = new ArrayList<>();',
    '    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;',
    '    while (top <= bottom && left <= right) {',
    '        for (int c = left; c <= right; c++) out.add(m[top][c]);',
    '        top++;',
    '        for (int r = top; r <= bottom; r++) out.add(m[r][right]);',
    '        right--;',
    '        if (top <= bottom) {',
    '            for (int c = right; c >= left; c--) out.add(m[bottom][c]);',
    '            bottom--;',
    '        }',
    '        if (left <= right) {',
    '            for (int r = bottom; r >= top; r--) out.add(m[r][left]);',
    '            left++;',
    '        }',
    '    }',
    '    return out;',
    '}',
  ],
  python: [
    'def spiral_order(m):',
    '    out = []',
    '    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1',
    '    while top <= bottom and left <= right:',
    '        for c in range(left, right + 1):',
    '            out.append(m[top][c])',
    '        top += 1',
    '        for r in range(top, bottom + 1):',
    '            out.append(m[r][right])',
    '        right -= 1',
    '        if top <= bottom:',
    '            for c in range(right, left - 1, -1):',
    '                out.append(m[bottom][c])',
    '            bottom -= 1',
    '        if left <= right:',
    '            for r in range(bottom, top - 1, -1):',
    '                out.append(m[r][left])',
    '            left += 1',
    '    return out',
  ],
  algorithm: [
    'Set the four walls to the matrix edges (one ring at a time)',
    'Walk one side of the current ring, collecting values',
    'Move that wall one step inward',
    'Guard: skip the last two sides when the ring has collapsed to one row or column',
    'Stop when top passes bottom or left passes right, then return the list',
  ],
  complexity: [{ label: 'Time', value: 'O(m × n)' }, { label: 'Space', value: 'O(1) extra (besides the output)' }],
  why: 'Every ring is walked once and each cell belongs to exactly one ring, so every cell is collected exactly once. After finishing a side its wall is moved past it, so that line can never be revisited; the two guards handle rings that have collapsed to one row or column, where walking back would duplicate cells.',
};
