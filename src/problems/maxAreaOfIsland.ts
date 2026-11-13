import type { Cell, CellState, ProblemDef, Step, Tone } from '../engine/types.ts';
import { recorder } from './stepKit.ts';
import { gridScene, parseCharRows } from './p4Kit.ts';

interface In { grid: string[] }

const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

function parse(raw: string): In {
  return { grid: parseCharRows(raw, { alphabet: '01', example: '0110 0100 1001', what: 'the map', maxR: 6, maxC: 8 }) };
}

function build({ grid }: In): Step[] {
  const R = grid.length;
  const C = grid[0].length;
  const land = grid.map((row) => [...row].map((ch) => ch === '1'));
  const owner = grid.map((row) => [...row].map(() => -1));
  const sizes: number[] = [];
  const stack: string[] = [];
  let cur: [number, number] | null = null;
  let best = 0;
  let bestId = -1;
  let islandNo = -1;
  let running = 0;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    grid.map((row, r) => [...row].map((_, c): Cell => {
      const id = owner[r][c];
      const isCur = !!cur && cur[0] === r && cur[1] === c;
      const state: CellState | undefined = isCur ? 'active' : id !== -1 && id === bestId && cur === null ? 'found' : id === -1 && !land[r][c] ? 'dim' : undefined;
      return { key: `${r},${c}`, value: land[r][c] || id !== -1 ? 1 : 0, state, tone: id !== -1 ? TONES[id % TONES.length] : undefined };
    }));
  const say = recorder(steps, () => ({
    scene: gridScene(rows()),
    aux: [
      { title: 'recursion stack (cells being explored)', kind: 'stack' as const, items: [...stack] },
      { title: 'island areas found', kind: 'list' as const, items: sizes.map(String) },
    ],
    vars: { island: islandNo >= 0 ? islandNo + 1 : '—', 'area so far': running, best, 'stack depth': stack.length },
  }));

  say({
    title: 'Start', tag: '🔍 SCAN —', desc: `A ${R}×${C} map with ${land.flat().filter(Boolean).length} land cells. Find the largest group of 1s connected up, down, left or right.`,
    note: 'best = 0; scan the grid for a 1',
    logic: 'Flood each island once and let the recursion return how many cells it covered; the answer is the largest return value.', java: [1], py: [7], algo: 0,
  });

  const NAMES = ['down', 'up', 'right', 'left'];
  const area = (r: number, c: number, id: number, from: [number, number] | null): number => {
    land[r][c] = false;
    owner[r][c] = id;
    running++;
    stack.push(`area(${r},${c})`);
    cur = [r, c];
    const fresh: string[] = [];
    const blocked: string[] = [];
    [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].forEach(([nr, nc], k) => {
      if (from && nr === from[0] && nc === from[1]) return;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) blocked.push(`${NAMES[k]} is outside the map`);
      else if (land[nr][nc]) fresh.push(`(${nr},${nc})`);
      else if (owner[nr][nc] !== -1) blocked.push(`(${nr},${nc}) is already counted`);
      else blocked.push(`(${nr},${nc}) is water`);
    });
    say({
      title: `Enter (${r}, ${c})`, tag: '🌊 ENTER —',
      desc: `Mark (${r},${c}) visited: area so far ${running}. ${fresh.length ? `Ask the unvisited land neighbours ${fresh.join(', ')} how much they add.` : 'No unvisited land next to it, so it adds just itself.'}`,
      note: `g[${r}][${c}] = 2; area so far = ${running}`,
      alert: blocked.length ? `Neighbours return 0: ${blocked.slice(0, 3).join('; ')}${blocked.length > 3 ? '; …' : ''}.` : undefined,
      logic: 'area(cell) = 1 + the areas of the four neighbours; marking first prevents counting a cell twice.', java: [9], py: [5], algo: 2,
    });
    const parts: number[] = [];
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]] as [number, number][]) {
      parts.push(nr < 0 || nc < 0 || nr >= R || nc >= C || !land[nr][nc] ? 0 : area(nr, nc, id, [r, c]));
    }
    const total = 1 + parts.reduce((a, b) => a + b, 0);
    cur = [r, c];
    say({
      title: `Return from (${r}, ${c}): ${total}`, tag: '↩ RETURN —',
      desc: `area(${r},${c}) = 1 + ${parts.join(' + ')} = ${total}. ${stack.length > 1 ? `The caller area(${stack[stack.length - 2].slice(5)} adds ${total} to its own sum.` : 'This was the island’s first cell, so the whole island has this area.'}`,
      note: `return 1 + ${parts.join(' + ')} = ${total}`,
      logic: 'Each call hands the number of cells it covered back up the call chain.', java: [10], py: [6], algo: 3,
    });
    stack.pop();
    return total;
  };

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!land[r][c]) continue;
      islandNo++;
      running = 0;
      cur = [r, c];
      say({
        title: `New island at (${r}, ${c})`, tag: '🏝 NEW ISLAND —', desc: `(${r},${c}) is unvisited land that no earlier flood reached: it starts island ${islandNo + 1}.`,
        note: `grid[${r}][${c}] == 1 → area(grid, ${r}, ${c})`,
        logic: 'Each island is flooded from exactly one starting cell.', tone: 'warn', java: [4], py: [10, 11], algo: 1,
      });
      const a = area(r, c, islandNo, null);
      sizes.push(a);
      const prev = best;
      if (a > best) { best = a; bestId = islandNo; }
      cur = null;
      say({
        title: `Island ${islandNo + 1} covers ${a} cell${a === 1 ? '' : 's'}`, tag: a > prev ? '🏆 NEW BEST —' : '📏 COMPARE —',
        desc: a > prev ? `Island ${islandNo + 1} has area ${a}, more than the previous best ${prev}. New best = ${a}.` : `Island ${islandNo + 1} has area ${a}, which does not beat the best ${best}.`,
        note: `best = max(${prev}, ${a}) = ${best}`,
        logic: 'The value returned by the outermost call is the whole island’s area.', tone: a > prev ? 'success' : 'info', java: [4], py: [11], algo: 4,
      });
    }
  }
  cur = null;
  say({
    title: 'Done', tag: '✅ Done!', desc: sizes.length ? `${sizes.length} island${sizes.length === 1 ? '' : 's'} with areas ${sizes.join(', ')}. The largest is ${best}.` : 'There is no land, so the answer is 0.',
    note: `return best → ${best}`,
    logic: 'Every land cell was entered once, so the work is proportional to the grid size.', tone: 'success', java: [5], py: [12], algo: 5,
    result: { title: String(best), text: 'Largest island area' },
  });
  return steps;
}

export const maxAreaOfIsland: ProblemDef<In> = {
  slug: '695-max-area-of-island',
  id: '695', title: 'Max Area of Island', difficulty: 'Medium', category: 'Matrix', tag: 'DFS returns area',
  statement: 'A binary grid marks land as 1 and water as 0. An island is a group of 1s joined horizontally or vertically. Return the area (number of cells) of the largest island, or 0 if there is none.',
  constraints: '1 ≤ rows, columns ≤ 50 (animation input: at most 6 rows × 8 columns, rows written like 0110 0100 1001)',
  examples: [
    { label: '0110 0100 1001', input: { grid: ['0110', '0100', '1001'] }, output: '3', answer: '3 (the largest of three islands)' },
    { label: '11011 11001 00011', input: { grid: ['11011', '11001', '00011'] }, output: '5' },
    { label: '110 011 101', input: { grid: ['110', '011', '101'] }, output: '5' },
  ],
  inputPlaceholder: 'e.g. 0110 0100 1001   (1 = land, 0 = water)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being explored', state: 'active' }, { label: 'Water', state: 'dim' }, { label: 'Largest island (final)', state: 'found' }],
  varLabels: ['island', 'area so far', 'best', 'stack depth'],
  emphasis: ['largest island', 'area'],
  phases: [
    { icon: '🔍', label: 'Scan grid', tone: 'blue' },
    { icon: '🏝', label: 'New island', tone: 'blue' },
    { icon: '🌊', label: 'Enter cell', tone: 'cyan' },
    { icon: '↩', label: 'Return area', tone: 'orange' },
    { icon: '🏆', label: 'Compare best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'DFS that returns the size of what it floods',
    text: 'Scan the grid. At each unvisited 1, call area(r, c): it marks the cell visited and returns 1 plus the areas of its four neighbours (0 for water, walls or visited cells). The value returned for the starting cell is the island’s area. Track the maximum over all islands.',
  },
  java: [
    'public int maxAreaOfIsland(int[][] grid) {',
    '    int best = 0;',
    '    for (int r = 0; r < grid.length; r++)',
    '        for (int c = 0; c < grid[0].length; c++)',
    '            if (grid[r][c] == 1) best = Math.max(best, area(grid, r, c));',
    '    return best;',
    '}',
    'private int area(int[][] g, int r, int c) {',
    '    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != 1) return 0;',
    '    g[r][c] = 2;                                           // mark visited',
    '    return 1 + area(g, r + 1, c) + area(g, r - 1, c) + area(g, r, c + 1) + area(g, r, c - 1);',
    '}',
  ],
  python: [
    'def max_area_of_island(grid):',
    '    R, C = len(grid), len(grid[0])',
    '    def area(r, c):',
    '        if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != 1:',
    '            return 0',
    '        grid[r][c] = 2                          # mark visited',
    '        return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1)',
    '    best = 0',
    '    for r in range(R):',
    '        for c in range(C):',
    '            if grid[r][c] == 1:',
    '                best = max(best, area(r, c))',
    '    return best',
  ],
  algorithm: [
    'Scan the grid for land cells',
    'At an unvisited 1, start a flood (a new island)',
    'Enter a cell: mark it visited and ask its four neighbours',
    'Return area = 1 + the areas of the four neighbours',
    'Compare the island’s area with the best so far',
    'Return the largest area',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C) recursion depth' }],
  why: 'Marking a cell as visited the moment it is entered guarantees that every land cell contributes to exactly one call chain, so the returned count equals the number of cells in the connected component. Because the scan starts a flood only at unvisited land, each island is measured once and no cell is counted twice.',
};
