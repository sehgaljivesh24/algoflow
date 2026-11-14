import type { Aux, Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { recorder } from './stepKit.ts';
import { DIRS4, gridScene, parseCharRows } from './p4Kit.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  const grid = parseCharRows(raw, { alphabet: '01', example: '000 010 111', what: 'the matrix' });
  if (!grid.some((r) => r.includes('0'))) throw new Error('The matrix needs at least one 0');
  return { grid };
}

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const dist: number[][] = grid.map((row) => [...row].map((ch) => (ch === '0' ? 0 : -1)));
  const q: [number, number][] = [];
  let cur: [number, number] | null = null;
  let time = 0;
  const steps: Step[] = [];
  const inQ = () => new Set(q.map(([r, c]) => `${r},${c}`));
  const unknown = () => dist.flat().filter((d) => d === -1).length;

  const rows = (): Cell[][] => {
    const queued = inQ();
    return dist.map((row, r) => row.map((d, c): Cell => {
      const key = `${r},${c}`;
      if (d === -1) return { key, value: '?', state: 'dim' };
      if (cur && cur[0] === r && cur[1] === c) return { key, value: d, state: 'active' };
      if (d === 0) return { key, value: d, state: 'found' };
      return { key, value: d, state: queued.has(key) ? 'compare' : 'sorted' };
    }));
  };
  const say = recorder(steps, () => ({
    scene: gridScene(rows()),
    aux: [{ title: 'queue (wavefront, front first)', kind: 'queue', items: q.map(([r, c]) => `(${r},${c}) d=${dist[r][c]}`) } as Aux],
    vars: { time, 'queue size': q.length, unknown: unknown() },
  }));

  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (dist[r][c] === 0) q.push([r, c]);
  say({
    title: 'Start', tag: '🔴 INIT SOURCES —',
    desc: `All ${plural(q.length, 'zero')} ${verb(q.length, 'enters', 'enter')} the queue together at distance 0; the other ${plural(unknown(), 'cell')} ${verb(unknown(), 'is', 'are')} unknown (?). Time = 0.`,
    note: `q = all ${plural(q.length, 'zero')}, dist[zero] = 0, dist[one] = -1`,
    logic: 'Instead of searching from every 1 towards a 0, flip the question: search outward from all the 0s at once, so each cell is reached first by its nearest 0.', java: [3], py: [2, 3], algo: 0,
  });

  let level = 0;
  while (q.length) {
    const [r, c] = q[0];
    const d = dist[r][c];
    if (d !== level) {
      level = d;
      time = d;
      say({
        title: `Time ${d}`, tag: '⏱ TICK —',
        desc: `The clock moves to ${d}: the ${q.length} queued cell${q.length === 1 ? '' : 's'} at distance ${d} spread next. ${unknown()} cell${unknown() === 1 ? ' is' : 's are'} still unknown.`,
        note: `distance level ${d}: q.size() = ${q.length}`,
        logic: 'All cells at distance d are queued before any cell at distance d + 1, so the wave advances one ring per tick.', java: [10], py: [4], algo: 1,
      });
    }
    q.shift();
    time = d;
    cur = [r, c];
    const fresh: [number, number][] = [];
    const known: string[] = [];
    for (const [dr, dc] of DIRS4) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
      if (dist[nr][nc] !== -1) { known.push(`(${nr},${nc})`); continue; }
      dist[nr][nc] = d + 1;
      q.push([nr, nc]);
      fresh.push([nr, nc]);
    }
    if (fresh.length) {
      const list = fresh.map(([a, b]) => `(${a},${b})`).join(', ');
      say({
        title: `Spread from (${r},${c})`, tag: '🌊 SPREAD —',
        desc: `Pop (${r},${c}) at d=${d}. Unknown neighbour${fresh.length > 1 ? 's' : ''} ${list} ${fresh.length > 1 ? 'get' : 'gets'} d=${d + 1} and ${fresh.length > 1 ? 'join' : 'joins'} the queue.`,
        note: `dist = ${d} + 1 = ${d + 1} for ${list}`,
        logic: 'BFS reaches cells in non-decreasing distance order, so the first time a cell is touched is its shortest distance.', tone: 'success', java: [15, 16], py: [9, 10], algo: 2,
      });
    } else {
      say({
        title: `Nothing new from (${r},${c})`, tag: '🌊 SPREAD —',
        desc: `Pop (${r},${c}) at d=${d}: ${known.length ? `neighbours ${known.join(', ')} already have a distance` : 'it has no neighbours'}, so nothing is queued.`,
        note: `dist[nr][nc] != -1 for every neighbour of (${r},${c}); q.size = ${q.length}`,
        alert: `Dead end at (${r},${c}): every neighbour is already filled, so this cell adds nothing to the wavefront.`,
        logic: 'A neighbour that already has a distance was reached earlier, which means by a shorter or equal route.', java: [14], py: [8], algo: 2,
      });
    }
    cur = null;
  }

  const out = dist.map((row) => `[${row.join(',')}]`).join(',');
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `The queue is empty at time ${time}: every cell holds its distance to the nearest 0 (largest distance ${Math.max(...dist.flat())}).`,
    note: `return dist → [${out}]`,
    logic: 'Each cell was enqueued once and looked at four neighbours, so the work is proportional to the number of cells.', tone: 'success', java: [19], py: [11], algo: 3,
    result: { title: `[${out}]`, text: 'Distance of every cell to its nearest 0' },
  });
  return steps;
}

export const zeroOneMatrix: ProblemDef<In> = {
  slug: '542-01-matrix',
  id: '542', title: '01 Matrix', difficulty: 'Medium', category: 'Graph', tag: 'multi-source BFS',
  statement: 'Given a binary matrix, return a matrix of the same size where each cell holds the distance (number of up / down / left / right steps) to the nearest 0. At least one 0 exists.',
  constraints: '1 ≤ rows × columns ≤ 10⁴ (animation input: at most 6 rows × 8 columns, rows written like 000 010 111)',
  examples: [
    { label: '000 010 111', input: { grid: ['000', '010', '111'] }, output: '[[0,0,0],[0,1,0],[1,2,1]]', answer: '[[0,0,0],[0,1,0],[1,2,1]] (largest distance 2)' },
    { label: '0111 1111 1111', input: { grid: ['0111', '1111', '1111'] }, output: '[[0,1,2,3],[1,2,3,4],[2,3,4,5]]' },
    { label: '10101 11111 10101', input: { grid: ['10101', '11111', '10101'] }, output: '[[1,0,1,0,1],[2,1,2,1,2],[1,0,1,0,1]]' },
  ],
  inputPlaceholder: 'e.g. 000 010 111   (rows of 0 and 1)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Source 0 (distance 0)', state: 'found' }, { label: 'Queued (distance just set)', state: 'compare' }, { label: 'Popped now', state: 'active' }, { label: 'Distance known', state: 'sorted' }, { label: 'Unknown yet', state: 'dim' }],
  varLabels: ['time', 'queue size', 'unknown'],
  emphasis: ['distance', 'nearest 0'],
  phases: [
    { icon: '🔴', label: 'Init sources', tone: 'blue' },
    { icon: '⏱', label: 'Time tick', tone: 'gold' },
    { icon: '🌊', label: 'Spread', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS outward from every 0',
    text: 'Put every 0 in the queue with distance 0 and mark every 1 as unknown. Pop a cell and look at its neighbours: any unknown neighbour gets distance + 1 and joins the queue. Because all sources start together, the first time a cell is reached is via its nearest 0.',
  },
  java: [
    'public int[][] updateMatrix(int[][] mat) {',
    '    int R = mat.length, C = mat[0].length;',
    '    int[][] dist = new int[R][C];',
    '    Queue<int[]> q = new ArrayDeque<>();',
    '    for (int r = 0; r < R; r++)',
    '        for (int c = 0; c < C; c++) {',
    '            if (mat[r][c] == 0) q.add(new int[]{r, c});',
    '            else dist[r][c] = -1;                       // not reached yet',
    '        }',
    '    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};',
    '    while (!q.isEmpty()) {',
    '        int[] cur = q.poll();',
    '        for (int[] d : dirs) {',
    '            int r = cur[0] + d[0], c = cur[1] + d[1];',
    '            if (r < 0 || c < 0 || r >= R || c >= C || dist[r][c] != -1) continue;',
    '            dist[r][c] = dist[cur[0]][cur[1]] + 1;',
    '            q.add(new int[]{r, c});',
    '        }',
    '    }',
    '    return dist;',
    '}',
  ],
  python: [
    'def update_matrix(mat):',
    '    R, C = len(mat), len(mat[0])',
    '    dist = [[0 if mat[r][c] == 0 else -1 for c in range(C)] for r in range(R)]',
    '    q = deque((r, c) for r in range(R) for c in range(C) if mat[r][c] == 0)',
    '    while q:',
    '        r, c = q.popleft()',
    '        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '            nr, nc = r + dr, c + dc',
    '            if 0 <= nr < R and 0 <= nc < C and dist[nr][nc] == -1:',
    '                dist[nr][nc] = dist[r][c] + 1',
    '                q.append((nr, nc))',
    '    return dist',
  ],
  algorithm: [
    'Queue every 0 with distance 0; mark every 1 as unknown',
    'When the front of the queue reaches a larger distance, the clock ticks to that time',
    'Pop a cell; give each unknown neighbour distance + 1 and queue it',
    'The queue is empty: every cell holds its distance',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C)' }],
  why: 'BFS from a set of sources explores cells by increasing distance from that set: all cells at distance d are queued before any at distance d + 1. The first visit to a cell therefore happens along a shortest path from the closest source, and later visits can never improve it, so marking a cell on first touch is enough.',
};
