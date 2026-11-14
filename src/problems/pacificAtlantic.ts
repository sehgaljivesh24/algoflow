import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { tokens } from './graphKit.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  const grid = tokens(raw);
  if (!grid.length || grid.some((r) => /[^0-9]/.test(r))) throw new Error('Rows of heights 0-9 separated by spaces, e.g. 12235 32344 24531 67145 51124');
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same length');
  if (grid.length > 5 || grid[0].length > 6) throw new Error('Use at most 5 rows and 6 columns');
  return { grid };
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const h = grid.map((row) => [...row].map(Number));
  const pac = h.map((row) => row.map(() => false));
  const atl = h.map((row) => row.map(() => false));
  let newly = new Set<string>();
  let result = '—';
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    h.map((row, r) =>
      row.map((v, c) => {
        const state: CellState | undefined = newly.has(`${r},${c}`) ? 'swap' : pac[r][c] && atl[r][c] ? 'found' : pac[r][c] ? 'active' : atl[r][c] ? 'compare' : undefined;
        return { key: `${r},${c}`, value: v, state };
      }),
    );
  const scene = () => ({ kind: 'grid' as const, rows: rows(), rowHeads: h.map((_, r) => String(r)), colHeads: h[0].map((_, c) => String(c)) });
  const both = () => { let k = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (pac[r][c] && atl[r][c]) k++; return k; };
  const aux = (): Aux[] => [{ title: 'cells that reach BOTH oceans', kind: 'list', items: h.flatMap((row, r) => row.flatMap((_, c) => (pac[r][c] && atl[r][c] ? [`(${r},${c})`] : []))) }];
  const count = (m: boolean[][]) => m.flat().filter(Boolean).length;
  const vars = () => ({ 'reach Pacific': count(pac), 'reach Atlantic': count(atl), 'reach both': both(), answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', tag: '🗺️ PLAN —', note: `${R} × ${plural(C, 'height')}; Pacific = top + left, Atlantic = bottom + right`, desc: `Heights on a ${R}×${C} island. The Pacific touches the top row and left column; the Atlantic touches the bottom row and right column. Water flows to equal or lower neighbours.`,
    logic: 'Instead of asking from every cell where its water goes, flip it: start at each ocean and climb UPHILL. Every cell the climb reaches can drain into that ocean.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0,
  });

  const flood = (name: 'Pacific' | 'Atlantic', seen: boolean[][], seeds: [number, number][]) => {
    let frontier: [number, number][] = [];
    newly = new Set();
    for (const [r, c] of seeds) {
      if (!seen[r][c]) { seen[r][c] = true; frontier.push([r, c]); newly.add(`${r},${c}`); }
    }
    push({
      title: `Seed the ${name} border`, tag: '🌊 SEED —', note: `${name === 'Pacific' ? 'pac' : 'atl'}[border] = true for ${plural(frontier.length, 'cell')}`, desc: `${frontier.length} border cell${frontier.length === 1 ? '' : 's'} touch the ${name}, so they drain into it (purple = just reached).`,
      logic: 'Border cells next to an ocean obviously flow into it.', logicTone: 'info',
      javaLines: name === 'Pacific' ? [4, 5] : [8, 9], pyLines: name === 'Pacific' ? [2] : [3], algoStep: 1,
    });
    let wave = 0;
    while (frontier.length) {
      wave++;
      const next: [number, number][] = [];
      newly = new Set();
      let blocked = '';
      for (const [r, c] of frontier) {
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) continue;
          if (h[nr][nc] < h[r][c]) { if (!blocked) blocked = `(${nr},${nc}) height ${h[nr][nc]} is lower than (${r},${c}) height ${h[r][c]}`; continue; }
          seen[nr][nc] = true;
          next.push([nr, nc]);
          newly.add(`${nr},${nc}`);
        }
      }
      const prevWave = frontier.length;
      frontier = next;
      if (!next.length) break;
      push({
        title: `${name} wave ${wave}: ${next.length} more cell${next.length === 1 ? '' : 's'}`, tag: `⛰ CLIMB ${wave} —`,
        note: `${name === 'Pacific' ? 'pac' : 'atl'}[nr][nc] = true for ${next.length} cell${next.length === 1 ? '' : 's'}: ${next.slice(0, 4).map(([a, b]) => `(${a},${b})=${h[a][b]}`).join(' ')}${next.length > 4 ? ' …' : ''}`,
        alert: blocked ? `Blocked: ${blocked}, so its water cannot run down to the ${name} from here.` : undefined,
        desc: `${prevWave} cell${prevWave === 1 ? '' : 's'} from the last wave look for neighbours at least as high: ${next.length} qualify (purple, ${count(seen)} reach the ${name} so far).`,
        logic: 'Reverse the flow: climbing to a neighbour that is ≥ the current height means that neighbour’s water can run down into the current cell.', logicTone: 'success',
        javaLines: [22, 27, 28], pyLines: [11, 12, 13, 14, 15, 16, 17], algoStep: 2,
      });
    }
    newly = new Set();
    push({
      title: `${name} finished`, tag: '🏁 FINISHED —', note: `${name === 'Pacific' ? 'pac' : 'atl'} has ${count(seen)} of ${plural(R * C, 'cell')}`, desc: `No unvisited neighbour is high enough to continue: ${count(seen)} of ${plural(R * C, 'cell')} can drain into the ${name}.`,
      logic: 'No unvisited neighbour is high enough to continue the climb.', logicTone: 'info',
      javaLines: [name === 'Pacific' ? 6 : 10], pyLines: [name === 'Pacific' ? 4 : 5], algoStep: 3,
    });
  };

  const pacSeeds: [number, number][] = [];
  for (let r = 0; r < R; r++) pacSeeds.push([r, 0]);
  for (let c = 1; c < C; c++) pacSeeds.push([0, c]);
  const atlSeeds: [number, number][] = [];
  for (let r = 0; r < R; r++) atlSeeds.push([r, C - 1]);
  for (let c = 0; c < C - 1; c++) atlSeeds.push([R - 1, c]);
  flood('Pacific', pac, pacSeeds);
  flood('Atlantic', atl, atlSeeds);

  const cells: string[] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (pac[r][c] && atl[r][c]) cells.push(`[${r}, ${c}]`);
  result = `[${cells.join(', ')}]`;
  push({
    title: 'Done: cells in both', tag: '✅ Done!', note: `pac && atl → ${cells.length} cell${cells.length === 1 ? '' : 's'}`, desc: `${cells.length} cell${cells.length === 1 ? '' : 's'} (green) were reached by both climbs, so water from them can flow to both oceans.`,
    logic: 'A cell qualifies exactly when both reverse climbs reached it: the intersection of the two reachable sets.', logicTone: 'success',
    javaLines: [14], pyLines: [6], algoStep: 4,
    result: { title: result, text: 'Cells that drain into both the Pacific and the Atlantic' },
  });
  return steps;
}

export const pacificAtlantic: ProblemDef<In> = {
  slug: '417-pacific-atlantic-water-flow',
  id: '417', title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', category: 'Graph', tag: 'reverse BFS from coasts',
  statement: 'A rectangular island has a height for each cell. The Pacific Ocean touches the top and left edges, the Atlantic the bottom and right edges. Rain flows to neighbouring cells of equal or lower height. Return every cell from which water can reach both oceans.',
  constraints: '1 ≤ rows, columns ≤ 200 (animation input: at most 5 rows × 6 columns, heights 0-9; write rows like 12235 32344 24153)',
  examples: [
    { label: '12235 32344 24531 67145 51124', input: { grid: ['12235', '32344', '24531', '67145', '51124'] }, output: '[[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]]', answer: '7 cells: [0,4] [1,3] [1,4] [2,2] [3,0] [3,1] [4,0]' },
    { label: '12 34', input: { grid: ['12', '34'] }, output: '[[0, 1], [1, 0], [1, 1]]' },
    { label: '111 191 111', input: { grid: ['111', '191', '111'] }, output: '[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]' },
  ],
  inputPlaceholder: 'e.g. 12235 32344 24531 67145 51124',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Reaches Pacific', state: 'active' }, { label: 'Reaches Atlantic', state: 'compare' }, { label: 'Both oceans', state: 'found' }, { label: 'Newly reached', state: 'swap' }],
  varLabels: ['reach Pacific', 'reach Atlantic', 'reach both', 'answer'],
  emphasis: ['Pacific', 'Atlantic', 'equal or lower'],
  phases: [
    { icon: '🗺️', label: 'Plan', tone: 'blue' },
    { icon: '🌊', label: 'Seed border', tone: 'blue' },
    { icon: '⛰', label: 'Climb uphill', tone: 'cyan' },
    { icon: '🏁', label: 'Ocean finished', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Climb uphill from each ocean',
    text: 'Run one multi-source BFS from all Pacific border cells and another from all Atlantic border cells, each moving only to neighbours that are at least as high. A cell reached by the first BFS drains into the Pacific; reached by the second, into the Atlantic. Return the cells reached by both.',
  },
  java: [
    'public List<List<Integer>> pacificAtlantic(int[][] h) {',
    '    int R = h.length, C = h[0].length;',
    '    boolean[][] pac = new boolean[R][C], atl = new boolean[R][C];',
    '    Deque<int[]> q = new ArrayDeque<>();',
    '    for (int r = 0; r < R; r++) { q.add(new int[]{r, 0}); pac[r][0] = true; }',
    '    for (int c = 1; c < C; c++) { q.add(new int[]{0, c}); pac[0][c] = true; }',
    '    bfs(h, q, pac);',
    '    q.clear();',
    '    for (int r = 0; r < R; r++) { q.add(new int[]{r, C - 1}); atl[r][C - 1] = true; }',
    '    for (int c = 0; c < C - 1; c++) { q.add(new int[]{R - 1, c}); atl[R - 1][c] = true; }',
    '    bfs(h, q, atl);',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    for (int r = 0; r < R; r++)',
    '        for (int c = 0; c < C; c++)',
    '            if (pac[r][c] && atl[r][c]) res.add(List.of(r, c));',
    '    return res;',
    '}',
    '',
    '// reverse flow: only step to neighbours that are >= the current cell',
    'private void bfs(int[][] h, Deque<int[]> q, boolean[][] seen) {',
    '    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};',
    '    while (!q.isEmpty()) {',
    '        int[] cur = q.poll();',
    '        for (int[] d : dirs) {',
    '            int r = cur[0] + d[0], c = cur[1] + d[1];',
    '            if (r < 0 || c < 0 || r >= h.length || c >= h[0].length) continue;',
    '            if (seen[r][c] || h[r][c] < h[cur[0]][cur[1]]) continue;',
    '            seen[r][c] = true;',
    '            q.add(new int[]{r, c});',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def pacific_atlantic(h):',
    '    R, C = len(h), len(h[0])',
    '    pac = {(r, 0) for r in range(R)} | {(0, c) for c in range(C)}',
    '    atl = {(r, C - 1) for r in range(R)} | {(R - 1, c) for c in range(C)}',
    '    bfs(h, pac)',
    '    bfs(h, atl)',
    '    return [[r, c] for r, c in sorted(pac & atl)]',
    '',
    '# reverse flow: only step to neighbours that are >= the current cell',
    'def bfs(h, seen):',
    '    queue = deque(seen)',
    '    while queue:',
    '        r, c = queue.popleft()',
    '        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '            nr, nc = r + dr, c + dc',
    '            if 0 <= nr < len(h) and 0 <= nc < len(h[0]) and (nr, nc) not in seen and h[nr][nc] >= h[r][c]:',
    '                seen.add((nr, nc))',
    '                queue.append((nr, nc))',
  ],
  algorithm: [
    'Read the heights: instead of tracing water downhill from every cell, climb uphill from each ocean',
    'Seed the border cells of one ocean (Pacific: top row and left column; Atlantic: bottom row and right column)',
    'BFS from them, stepping only to neighbours at least as high; every cell reached drains into that ocean',
    'When no neighbour qualifies the ocean is finished; repeat for the other ocean',
    'Return the cells reached by both searches',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C)' }],
  why: 'Water flows from a cell to an equal-or-lower neighbour, so a cell drains into an ocean exactly when there is a non-increasing path from it to that ocean’s border. Walking that path backwards from the border means moving to equal-or-higher cells, which is what each BFS does. Two O(R·C) searches (one per ocean) replace a search from every cell, and the answer is their intersection.',
};
