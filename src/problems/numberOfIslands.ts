import type { Aux, Cell, CellState, ProblemDef, Step, Tone } from '../engine/types';

interface In { grid: string[] }

const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

function parse(raw: string): In {
  const grid = raw.split(/[\s,;]+/).filter(Boolean);
  if (!grid.length || grid.some((r) => /[^01]/.test(r))) throw new Error('Rows of 0s and 1s separated by spaces, e.g. 110 010 001');
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same length');
  if (grid.length > 7 || grid[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  return { grid };
}

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const land = grid.map((row) => [...row].map((ch) => ch === '1'));
  const island: number[][] = grid.map((row) => [...row].map(() => -1)); // island index per cell, -1 = none
  const steps: Step[] = [];
  let count = 0;
  let cur: [number, number] | null = null;
  let visited = 0;
  const stack: [number, number][] = [];

  const rows = (): Cell[][] =>
    grid.map((row, r) =>
      [...row].map((_, c) => {
        const isCur = cur && cur[0] === r && cur[1] === c;
        const id = island[r][c];
        const open = stack.some(([a, b]) => a === r && b === c);
        const state: CellState | undefined = isCur ? 'active' : open ? 'compare' : !land[r][c] && id === -1 ? 'dim' : undefined;
        return {
          key: `${r},${c}`,
          value: land[r][c] || id !== -1 ? '1' : '0',
          state,
          tone: id !== -1 ? TONES[id % TONES.length] : undefined,
        };
      }),
    );
  const vars = () => ({ islands: count, scan: cur ? `(${cur[0]},${cur[1]})` : '—', 'cells sunk': visited, 'stack depth': stack.length });
  const scene = () => ({ kind: 'grid' as const, rows: rows(), rowHeads: grid.map((_, r) => String(r)), colHeads: [...grid[0]].map((_, c) => String(c)) });
  const aux = (): Aux[] => [{ title: 'call stack (cells being flooded)', kind: 'stack', items: stack.map(([r, c]) => `sink(${r},${c})`) }];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', tag: '🔍 SCAN —', desc: `A ${R}×${C} grid with ${land.flat().filter(Boolean).length} land cells. Scan row by row; every unvisited 1 starts a new island.`,
    note: `count = 0; scan (0,0) → (${R - 1},${C - 1})`,
    logic: 'Scan cell by cell. The first unvisited 1 of each island increments the count, then we flood the whole island so it is never counted again.',
    logicTone: 'info', javaLines: [1], pyLines: [1], algoStep: 0,
  });

  const NAMES = ['down', 'up', 'right', 'left'];
  const sink = (r: number, c: number, id: number, from: [number, number] | null) => {
    land[r][c] = false;
    island[r][c] = id;
    visited++;
    cur = [r, c];
    stack.push([r, c]);
    const fresh: string[] = [];
    const blocked: string[] = [];
    [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].forEach(([nr, nc], k) => {
      if (from && nr === from[0] && nc === from[1]) return;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) blocked.push(`${NAMES[k]} is outside the grid`);
      else if (land[nr][nc]) fresh.push(`(${nr},${nc})`);
      else if (island[nr][nc] !== -1) blocked.push(`(${nr},${nc}) is already sunk`);
      else blocked.push(`(${nr},${nc}) is water`);
    });
    push({
      title: `Sink (${r}, ${c})`, tag: '🌊 FLOOD —',
      desc: `Mark (${r},${c}) as part of island ${id + 1} (${visited} cell${visited === 1 ? '' : 's'} sunk). ${fresh.length ? `Unvisited land next to it: ${fresh.join(', ')}.` : 'No unvisited land next to it.'}`,
      note: `g[${r}][${c}] = '0'; stack depth ${stack.length}`,
      alert: blocked.length ? `Neighbours skipped: ${blocked.slice(0, 3).join('; ')}${blocked.length > 3 ? '; …' : ''}.` : undefined,
      logic: 'Turning the land into "visited" stops us from counting it twice.', logicTone: 'info',
      javaLines: [12], pyLines: [11], algoStep: 2,
    });
    const next: [number, number][] = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];
    for (const [nr, nc] of next) {
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || !land[nr][nc]) continue;
      sink(nr, nc, id, [r, c]);
    }
    stack.pop();
    cur = [r, c];
    push({
      title: `Return from (${r}, ${c})`, tag: '↩ BACKTRACK —',
      desc: `All four neighbours of (${r},${c}) are handled; return ${stack.length ? `to sink(${stack[stack.length - 1][0]},${stack[stack.length - 1][1]})` : 'to the scan'}.`,
      note: `return; stack depth ${stack.length}`,
      logic: 'When every neighbour is water, outside the grid or already sunk, the call has nothing left to do.', logicTone: 'info',
      javaLines: [14], pyLines: [13], algoStep: 3,
    });
  };

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!land[r][c]) {
        if (island[r][c] !== -1) {
          cur = [r, c];
          push({
            title: `Skip (${r}, ${c})`, tag: '⏭ SKIP —', desc: `The scan reaches (${r},${c}): land, but already sunk as part of island ${island[r][c] + 1}. It is not counted again (islands = ${count}).`,
            note: `grid[${r}][${c}] == '0' now → no new island`,
            alert: `(${r},${c}) was already flooded as island ${island[r][c] + 1}: skipped, so the count stays ${count}.`,
            logic: 'Sinking an island turns its land into "visited", so later scan positions inside it are ignored.', logicTone: 'info',
            javaLines: [4], pyLines: [4], algoStep: 0,
          });
        }
        continue;
      }
      cur = [r, c];
      count++;
      push({
        title: `New island found at (${r}, ${c})`, tag: '🏝 NEW ISLAND —', desc: `(${r},${c}) is unvisited land, so islands = ${count}. Flood the whole island from here.`,
        note: `count++ → ${count}; sink(grid, ${r}, ${c})`,
        logic: 'This cell was not reached from any earlier island, so it starts a new one.', logicTone: 'warn',
        javaLines: [5, 6], pyLines: [5, 6], algoStep: 1,
      });
      sink(r, c, count - 1, null);
    }
  }

  cur = null;
  push({
    title: 'Done', tag: '✅ Done!', desc: `The scan is complete: ${count} island${count === 1 ? '' : 's'} made of ${visited} land cells. Each colour is one island.`,
    note: `return count → ${count}`,
    logic: 'Each colour is one island.', logicTone: 'success', javaLines: [8], pyLines: [7], algoStep: 4,
    result: { title: String(count), text: `${count} island${count === 1 ? '' : 's'}` },
  });
  return steps;
}

export const numberOfIslands: ProblemDef<In> = {
  slug: '200-number-of-islands',
  id: '200', title: 'Number of Islands', difficulty: 'Medium', category: 'Matrix', tag: 'DFS / BFS on grid',
  statement: "Given a grid of '1' (land) and '0' (water), count the islands. An island is land connected horizontally or vertically.",
  constraints: '1 ≤ rows, cols ≤ 300 (animation input is limited to 7 × 9)',
  examples: [
    { label: '11000 11000 00100 00011', input: { grid: ['11000', '11000', '00100', '00011'] }, output: '3', answer: '3 islands' },
    { label: '111 010 111', input: { grid: ['111', '010', '111'] }, output: '1' },
    { label: '101 010 101', input: { grid: ['101', '010', '101'] }, output: '5' },
  ],
  inputPlaceholder: 'rows of 0/1, e.g. 11000 11000 00100 00011',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current cell', state: 'active' }, { label: 'On the call stack', state: 'compare' }, { label: 'Water', state: 'dim' }],
  emphasis: ['islands', 'connected horizontally or vertically'],
  phases: [
    { icon: '🔍', label: 'Scan grid', tone: 'blue' },
    { icon: '🏝', label: 'New island', tone: 'gold' },
    { icon: '🌊', label: 'Flood fill', tone: 'cyan' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['islands', 'scan', 'cells sunk', 'stack depth'],
  approach: {
    title: 'Count, then flood',
    text: 'Scan the grid. Whenever you meet land you have not visited, you have found a new island: add one, then DFS to mark every connected land cell as visited.',
  },
  java: [
    'public int numIslands(char[][] grid) {',
    '    int count = 0;',
    '    for (int r = 0; r < grid.length; r++)',
    '        for (int c = 0; c < grid[0].length; c++)',
    "            if (grid[r][c] == '1') {",
    '                count++;',
    '                sink(grid, r, c);',
    '            }',
    '    return count;',
    '}',
    'void sink(char[][] g, int r, int c) {',
    "    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;",
    "    g[r][c] = '0';",
    '    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);',
    '}',
  ],
  python: [
    'def num_islands(grid):',
    '    count = 0',
    '    for r in range(len(grid)):',
    '        for c in range(len(grid[0])):',
    "            if grid[r][c] == '1':",
    '                count += 1',
    '                sink(grid, r, c)',
    '    return count',
    'def sink(g, r, c):',
    "    if not (0 <= r < len(g) and 0 <= c < len(g[0])) or g[r][c] != '1':",
    '        return',
    "    g[r][c] = '0'",
    '    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '        sink(g, r + dr, c + dc)',
  ],
  algorithm: [
    'Scan every cell in row-major order, skipping water and land that is already sunk',
    'On unvisited land: count++ and start a flood fill',
    'Sink the cell (mark it visited) and recurse into its four neighbours',
    'Backtrack when a cell has no unvisited land neighbours left',
    'Return the count',
  ],
  complexity: [{ label: 'Time', value: 'O(rows × cols)' }, { label: 'Space', value: 'O(rows × cols) worst case' }],
  why: 'Every cell is sunk at most once and examined a constant number of times. Sinking an island before moving on guarantees each island increments the counter exactly once. The recursion can go as deep as the island is large.',
};
