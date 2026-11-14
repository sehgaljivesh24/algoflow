import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types';

/** Grid of heights; walk from the top-left to the bottom-right, minimising the largest height jump between steps. */
interface In { grid: number[][] }

function parse(raw: string): In {
  const rows = raw.split(/[/;|]/).map((r) => r.trim()).filter(Boolean);
  const msg = 'Write rows separated by "/", cells separated by spaces, e.g. 1 2 2/3 8 2/5 3 5';
  if (!rows.length) throw new Error(msg);
  const grid = rows.map((r) => r.split(/[\s,]+/).filter(Boolean).map((t) => {
    if (!/^\d+$/.test(t)) throw new Error(`"${t}" is not a whole number. ${msg}`);
    return Number(t);
  }));
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same number of cells');
  if (grid.length > 4 || grid[0].length > 5) throw new Error('Use at most 4 rows and 5 columns');
  if (grid.length * grid[0].length < 2) throw new Error('Use at least 2 cells');
  if (grid.some((r) => r.some((v) => v > 99))) throw new Error('Keep heights at 99 or below');
  return { grid };
}

const INF = Infinity;
const DIRS: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const effort: number[][] = grid.map((r) => r.map(() => INF));
  const done: boolean[][] = grid.map((r) => r.map(() => false));
  const parent: ([number, number] | null)[][] = grid.map((r) => r.map(() => null));
  const heap: [number, number, number][] = [];
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let nb: [number, number] | null = null;
  let path = new Set<string>();
  let answer: number | string = '—';

  const dd = (x: number) => (x === INF ? '∞' : String(x));
  const sortHeap = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const st = (r: number, c: number): CellState | undefined =>
    path.has(`${r},${c}`) ? 'sorted'
    : cur && cur[0] === r && cur[1] === c ? 'active'
    : nb && nb[0] === r && nb[1] === c ? 'swap'
    : done[r][c] ? 'found' : effort[r][c] < INF ? 'compare' : undefined;
  const mkRows = (val: (r: number, c: number) => string | number): Cell[][] =>
    grid.map((row, r) => row.map((_, c) => ({ key: `${r},${c}`, value: val(r, c), state: st(r, c) })));
  const heads = () => ({ rowHeads: grid.map((_, r) => String(r)), colHeads: grid[0].map((_, c) => String(c)), variant: 'matrix' as const });
  const scene = () => ({
    kind: 'split' as const,
    parts: [
      { kind: 'grid' as const, rows: mkRows((r, c) => grid[r][c]), ...heads() },
      { kind: 'grid' as const, rows: mkRows((r, c) => dd(effort[r][c])), ...heads() },
    ],
  });
  const aux = (): Aux[] => [
    {
      title: 'min-heap (effort, row, col); stale entries marked',
      kind: 'queue',
      items: heap.map(([e, r, c]) => `(${e}, ${r}, ${c})${e > effort[r][c] ? ' stale' : ''}`),
      bad: heap.flatMap(([e, r, c], i) => (e > effort[r][c] ? [i] : [])),
    },
  ];
  const vars = () => ({ cell: cur ? `(${cur[0]}, ${cur[1]})` : '—', 'effort[cell]': cur ? dd(effort[cur[0]][cur[1]]) : '—', answer });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Left: heights. Right: effort[ ][ ], the smallest possible "largest jump" found so far for reaching each cell. Everything starts at ∞.`,
    logic: 'The cost of a route is its single biggest height difference, not the sum. We still use Dijkstra, with max instead of + to extend a route.', logicTone: 'info',
    tag: 'INIT —', note: `${R}×${C} grid, effort[][] = ∞`,
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
  });
  effort[0][0] = 0;
  heap.push([0, 0, 0]);
  push({
    title: 'effort[0][0] = 0, push (0, 0, 0)', desc: 'Standing on the start cell costs nothing, so effort[0][0] = 0 and (0, 0, 0) enters the heap.',
    logic: 'The heap always gives the cell that is cheapest to reach among those not finished.', logicTone: 'info',
    tag: 'SEED', note: 'effort[0][0] = 0, heap = [(0, 0, 0)]',
    javaLines: [4, 5, 6], pyLines: [3, 4], algoStep: 0,
  });

  let reached = false;
  while (heap.length) {
    sortHeap();
    const [e, r, c] = heap.shift()!;
    nb = null;
    if (e > effort[r][c]) {
      cur = null;
      push({
        title: `Skip stale entry (${e}, ${r}, ${c})`, desc: `effort[${r}][${c}] is already ${effort[r][c]}, better than ${e}.`,
        logic: 'The same cell can be pushed more than once; only its best entry is worth expanding.', logicTone: 'warn',
        tag: 'SKIP', alert: `Stale entry (${e}, ${r}, ${c}): cell (${r}, ${c}) already has the better effort ${effort[r][c]}.`, note: `e = ${e} > effort[${r}][${c}] = ${effort[r][c]} → continue`,
        javaLines: [11], pyLines: [7, 8], algoStep: 3,
      });
      continue;
    }
    cur = [r, c];
    done[r][c] = true;
    push({
      title: `Pop cell (${r}, ${c}) with effort ${e}`, desc: `This is the cheapest unfinished cell, so effort ${e} is final for it.`,
      logic: 'A route can only get more strenuous when extended (the maximum never drops), so nothing later can beat it.', logicTone: 'success',
      tag: 'POP', note: `poll → e = ${e}, (r, c) = (${r}, ${c})${r === R - 1 && c === C - 1 ? ' = target, stop' : ''}`,
      javaLines: [9, 10], pyLines: [5, 6], algoStep: 1,
    });
    if (r === R - 1 && c === C - 1) { reached = true; break; }
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
      nb = [nr, nc];
      const jump = Math.abs(grid[nr][nc] - grid[r][c]);
      const ne = Math.max(e, jump);
      if (ne < effort[nr][nc]) {
        const old = effort[nr][nc];
        effort[nr][nc] = ne;
        parent[nr][nc] = [r, c];
        heap.push([ne, nr, nc]);
        sortHeap();
        push({
          title: `To (${nr}, ${nc}): max(${e}, |${grid[nr][nc]} − ${grid[r][c]}|) = ${ne} < ${dd(old)}`,
          desc: `Stepping to (${nr}, ${nc}) needs a jump of ${jump}. The route's effort is max(${e}, ${jump}) = ${ne}, better than ${dd(old)}, so update and push.`,
          logic: 'The effort of a route is the largest jump on it, so extending a route takes the max of the old effort and the new jump.', logicTone: 'success',
          tag: 'RELAX', note: `ne = max(${e}, ${jump}) = ${ne} < ${dd(old)} → effort[${nr}][${nc}] = ${ne}`,
          javaLines: [14, 15, 16, 17, 18, 19], pyLines: [11, 12, 13, 14, 15, 16, 17], algoStep: 2,
        });
      } else {
        push({
          title: `To (${nr}, ${nc}): max(${e}, ${jump}) = ${ne} ≥ ${dd(effort[nr][nc])}`,
          desc: `A jump of ${jump} gives effort ${ne}, which is no better than the ${dd(effort[nr][nc])} already known.`,
          logic: 'Nothing changes; a cheaper route to this cell was found earlier.', logicTone: 'info',
          tag: 'RELAX', alert: `No improvement: effort ${ne} is not below the known ${dd(effort[nr][nc])} for (${nr}, ${nc}).`, note: `ne = max(${e}, ${jump}) = ${ne} ≥ ${dd(effort[nr][nc])} → unchanged`,
          javaLines: [14, 15, 16, 17], pyLines: [11, 12, 13, 14, 15], algoStep: 2,
        });
      }
    }
    nb = null;
    cur = null;
  }

  // route (follow parents back from the target)
  path = new Set<string>();
  if (reached) {
    let p: [number, number] | null = [R - 1, C - 1];
    while (p) { path.add(`${p[0]},${p[1]}`); p = parent[p[0]][p[1]]; }
  }
  cur = null;
  nb = null;
  const ans = effort[R - 1][C - 1];
  answer = ans;
  steps.push({
    title: `Minimum effort is ${ans}`, desc: `The bottom-right cell is finalised with effort ${ans}. The highlighted route never needs a jump larger than ${ans}.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'When the target is popped its effort is final, so we can stop without exploring the rest.', logicTone: 'success',
    tag: '✅ Done!', note: `(R−1, C−1) popped → return ${ans}`,
    javaLines: [12], pyLines: [9, 10],
    algoStep: 4,
    result: { title: String(ans), text: 'Smallest possible largest height difference on a route' },
  });
  return steps;
}

const g = (s: string): In => ({ grid: s.split('/').map((r) => r.split(' ').map(Number)) });

export const pathWithMinimumEffort: ProblemDef<In> = {
  slug: '1631-path-with-minimum-effort',
  id: '1631', title: 'Path With Minimum Effort', difficulty: 'Medium', category: 'Graph', tag: 'grid Dijkstra, bottleneck',
  statement: 'A hiker starts at the top-left cell of a grid of heights and wants to reach the bottom-right cell, moving up, down, left or right. The effort of a route is the largest absolute height difference between two consecutive cells on it. Return the smallest effort over all routes.',
  constraints: '1 ≤ rows, cols ≤ 100, 1 ≤ height ≤ 10⁶ (animation input: up to 4 × 5 cells; write rows separated by "/")',
  examples: [
    { label: '1 2 2/3 8 2/5 3 5', input: g('1 2 2/3 8 2/5 3 5'), output: '2' },
    { label: '1 2 3/3 8 4/5 3 5', input: g('1 2 3/3 8 4/5 3 5'), output: '1' },
    { label: '1 10 6 7/9 2 5 4/3 8 1 2', input: g('1 10 6 7/9 2 5 4/3 8 1 2'), output: '8' },
  ],
  inputPlaceholder: 'e.g. 1 2 2/3 8 2/5 3 5   (rows separated by "/")',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Just finalised', state: 'active' }, { label: 'Neighbour being tried', state: 'swap' }, { label: 'Seen, not final', state: 'compare' }, { label: 'Final effort', state: 'found' }, { label: 'Best route', state: 'sorted' }],
  varLabels: ['cell', 'effort[cell]', 'answer'],
  vizTitle: 'Heights (left) and effort so far (right)',
  approach: {
    title: 'Dijkstra where a route costs its biggest jump',
    text: 'Every cell is a node and each move to a neighbour is an edge whose weight is the height difference. Keep effort[cell], the smallest possible biggest jump to reach it, and a min-heap. Pop the cheapest cell, then for every neighbour compute max(effort so far, the jump); if that beats the stored effort, update it and push. The target\'s effort is the answer.',
  },
  java: [
    'public int minimumEffortPath(int[][] h) {',
    '    int R = h.length, C = h[0].length;',
    '    int[][] effort = new int[R][C];',
    '    for (int[] row : effort) Arrays.fill(row, Integer.MAX_VALUE);',
    '    effort[0][0] = 0;',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);',
    '    pq.add(new int[]{0, 0, 0});',
    '    int[][] dirs = {{-1,0},{0,1},{1,0},{0,-1}};',
    '    while (!pq.isEmpty()) {',
    '        int[] top = pq.poll();',
    '        int e = top[0], r = top[1], c = top[2];',
    '        if (e > effort[r][c]) continue;                 // stale',
    '        if (r == R - 1 && c == C - 1) return e;',
    '        for (int[] d : dirs) {',
    '            int nr = r + d[0], nc = c + d[1];',
    '            if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;',
    '            int ne = Math.max(e, Math.abs(h[nr][nc] - h[r][c]));',
    '            if (ne < effort[nr][nc]) {',
    '                effort[nr][nc] = ne;',
    '                pq.add(new int[]{ne, nr, nc});',
    '            }',
    '        }',
    '    }',
    '    return 0;',
    '}',
  ],
  python: [
    'def minimum_effort_path(h):',
    '    R, C = len(h), len(h[0])',
    "    effort = [[float('inf')] * C for _ in range(R)]",
    '    effort[0][0] = 0',
    '    pq = [(0, 0, 0)]',
    '    while pq:',
    '        e, r, c = heapq.heappop(pq)',
    '        if e > effort[r][c]:',
    '            continue                                  # stale',
    '        if (r, c) == (R - 1, C - 1):',
    '            return e',
    '        for dr, dc in ((-1, 0), (0, 1), (1, 0), (0, -1)):',
    '            nr, nc = r + dr, c + dc',
    '            if 0 <= nr < R and 0 <= nc < C:',
    '                ne = max(e, abs(h[nr][nc] - h[r][c]))',
    '                if ne < effort[nr][nc]:',
    '                    effort[nr][nc] = ne',
    '                    heapq.heappush(pq, (ne, nr, nc))',
    '    return 0',
  ],
  phases: [
    { icon: '🚀', label: 'Init: effort = ∞', tone: 'blue' },
    { icon: '📤', label: 'Pop cheapest cell', tone: 'cyan' },
    { icon: '⛰', label: 'Relax: max(e, jump)', tone: 'green' },
    { icon: '⏭', label: 'Skip stale', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['largest absolute height difference', 'smallest effort'],
  algorithm: [
    'Set effort[0][0] = 0 and every other cell to ∞; push (0, 0, 0) into a min-heap',
    'Pop the cheapest (e, r, c); stop as soon as the bottom-right cell is popped',
    'For each neighbour compute max(e, height difference); if it is smaller than the stored effort, update and push',
    'If the popped e is larger than effort[r][c], the entry is stale: skip it',
    'The target cell\'s effort is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(R·C·log(R·C))' }, { label: 'Space', value: 'O(R·C)' }],
  why: 'The cost of a route is the maximum of its edge weights, and extending a route can never lower a maximum. That is the only property Dijkstra\'s argument needs: the cell popped with the smallest effort cannot be reached more cheaply through any unfinished cell, because every route out of the finished region already costs at least as much. So each popped effort is final, including the target\'s.',
};
