import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types';
import { plural, verb } from './text.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  const grid = raw.split(/[\s,;]+/).filter(Boolean);
  if (!grid.length || grid.some((r) => /[^012]/.test(r))) throw new Error('Rows of 0 (empty), 1 (fresh) and 2 (rotten) separated by spaces, e.g. 211 110 011');
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same length');
  if (grid.length > 6 || grid[0].length > 8) throw new Error('Use at most 6 rows and 8 columns');
  return { grid };
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function build({ grid: g0 }: In): Step[] {
  const R = g0.length;
  const C = g0[0].length;
  const g = g0.map((row) => [...row].map(Number));
  const steps: Step[] = [];
  const fresh0 = g.flat().filter((v) => v === 1).length;
  let fresh = fresh0;
  let minutes = 0;
  let q: [number, number][] = [];
  let newly = new Set<string>();
  let stuck = false;
  let result: number | string = '—';

  const rows = (): Cell[][] =>
    g.map((row, r) =>
      row.map((v, c) => {
        const key = `${r},${c}`;
        const state: CellState = newly.has(key) ? 'compare' : v === 0 ? 'dim' : v === 2 ? 'error' : stuck ? 'swap' : 'found';
        return { key, value: v, state };
      }),
    );
  const scene = () => ({ kind: 'grid' as const, rows: rows(), rowHeads: g.map((_, r) => String(r)), colHeads: g[0].map((_, c) => String(c)) });
  const aux = (): Aux[] => [{ title: 'queue: rotten oranges to spread from', kind: 'queue', items: q.map(([r, c]) => `(${r},${c})`) }];
  const vars = () => ({ minute: minutes, 'queue size': q.length, 'fresh left': fresh, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  const qText = () => q.map(([r, c]) => `(${r},${c})`).join(' ');
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === 2) q.push([r, c]);
  push({
    title: 'Start', tag: '🔴 INIT SOURCES —',
    desc: `${plural(q.length, 'rotten orange')}${q.length ? ' ' + qText() : ''} and ${plural(fresh, 'fresh one')}. All rotten oranges enter the queue together.`,
    note: `q = ${q.length} rotten, fresh = ${fresh}, minutes = 0`,
    logic: 'Every rotten orange spreads at the same moment, so we start a BFS from ALL of them at once (multi-source BFS).', logicTone: 'info',
    javaLines: [2], pyLines: [2, 3, 4, 5, 6, 7, 8, 9], algoStep: 0,
  });

  while (q.length && fresh > 0) {
    minutes++;
    const level = q;
    const next: [number, number][] = [];
    newly = new Set();
    push({
      title: `Minute ${minutes} begins`, tag: `⏱ MINUTE ${minutes} —`,
      desc: `The queue holds ${level.length} rotten orange${level.length === 1 ? '' : 's'} ${qText()}. This whole level spreads during minute ${minutes}; ${fresh} fresh left.`,
      note: `minutes = ${minutes}; size = q.size() = ${level.length}`,
      logic: 'Processing the whole queue length at once is one level of BFS = one minute.', logicTone: 'info',
      javaLines: [11, 12], pyLines: [12, 13], algoStep: 1,
    });
    for (const [r, c] of level) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] !== 1) continue;
        g[nr][nc] = 2;
        fresh--;
        next.push([nr, nc]);
        newly.add(`${nr},${nc}`);
      }
    }
    q = next;
    const list = next.map(([r, c]) => `(${r},${c})`).join(' ');
    push({
      title: `Minute ${minutes}: ${next.length} orange${next.length === 1 ? '' : 's'} rot`, tag: '🌊 SPREAD —',
      desc: next.length
        ? `${level.length} rotten from last minute infect ${next.length} fresh neighbour${next.length === 1 ? '' : 's'} ${list}. ${fresh} fresh left.`
        : `${plural(level.length, 'rotten orange')} ${verb(level.length, 'has', 'have')} no fresh neighbour left to infect. ${fresh} fresh ${verb(fresh, 'stays', 'stay')} fresh.`,
      note: next.length ? `grid = 2 at ${list}; fresh = ${fresh}` : `no grid[r][c] == 1 next to the queue; fresh = ${fresh}`,
      alert: next.length ? undefined : `Nothing rotted in minute ${minutes}: the remaining ${fresh} fresh orange${fresh === 1 ? ' is' : 's are'} walled off.`,
      logic: 'Processing the whole queue length at once is one level of BFS = one minute.', logicTone: next.length ? 'success' : 'warn',
      javaLines: [17, 18, 19], pyLines: [15, 16, 17, 18], algoStep: 2,
    });
  }

  newly = new Set();
  stuck = fresh > 0;
  const ans = fresh === 0 ? minutes : -1;
  result = ans;
  push({
    title: fresh === 0 ? `All rotten after ${minutes} minute${minutes === 1 ? '' : 's'}` : 'Some oranges can never rot', tag: fresh === 0 ? '✅ Done!' : '🚫 IMPOSSIBLE —',
    desc: fresh === 0 ? (minutes === 0 ? 'There were no fresh oranges to begin with, so the answer is 0.' : `The last fresh orange rotted in minute ${minutes}. Answer: ${minutes}.`) : `${fresh} fresh orange${fresh === 1 ? ' is' : 's are'} walled off by empty cells (purple), so the answer is −1.`,
    note: fresh === 0 ? `fresh == 0 → return ${minutes}` : `fresh = ${fresh} > 0 → return -1`,
    alert: fresh === 0 ? undefined : `${fresh} fresh orange${fresh === 1 ? '' : 's'} can never be reached by a rotten one.`,
    logic: fresh === 0 ? 'The number of BFS levels needed is exactly the number of minutes.' : 'The queue emptied while fresh oranges remained: they have no rotten path to them.', logicTone: fresh === 0 ? 'success' : 'warn',
    javaLines: [23], pyLines: [21], algoStep: 3,
    result: { title: String(ans), text: ans === -1 ? 'Impossible: some orange stays fresh' : 'Minutes until no fresh orange remains' },
  });
  return steps;
}

export const rottingOranges: ProblemDef<In> = {
  slug: '994-rotting-oranges',
  id: '994', title: 'Rotting Oranges', difficulty: 'Medium', category: 'Graph', tag: 'multi-source BFS',
  statement: 'A grid holds empty cells (0), fresh oranges (1) and rotten oranges (2). Every minute, each fresh orange next to a rotten one (up, down, left, right) becomes rotten. Return the minutes until no fresh orange is left, or -1 if that can never happen.',
  constraints: '1 ≤ rows, columns ≤ 10 (animation input: at most 6 rows × 8 columns; write rows like 211 110 011)',
  examples: [
    { label: '211 110 011', input: { grid: ['211', '110', '011'] }, output: '4', answer: '4 minutes' },
    { label: '211 011 101', input: { grid: ['211', '011', '101'] }, output: '-1' },
    { label: '2111 1011 1112', input: { grid: ['2111', '1011', '1112'] }, output: '2' },
  ],
  inputPlaceholder: 'e.g. 211 110 011   (0 empty, 1 fresh, 2 rotten)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Fresh', state: 'found' }, { label: 'Rotten', state: 'error' }, { label: 'Rots this minute', state: 'compare' }, { label: 'Empty', state: 'dim' }, { label: 'Never reached', state: 'swap' }],
  varLabels: ['minute', 'queue size', 'fresh left', 'answer'],
  emphasis: ['fresh orange', 'rotten', 'minutes'],
  phases: [
    { icon: '🔴', label: 'Init sources', tone: 'blue' },
    { icon: '⏱', label: 'Start minute', tone: 'gold' },
    { icon: '🌊', label: 'Spread', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS from every rotten orange at once',
    text: 'Put all rotten oranges in a queue. Each BFS level (processing everything currently in the queue) is one minute: infect fresh neighbours and queue them. Stop when no fresh orange is left. If fresh oranges remain after the queue empties, they are unreachable.',
  },
  java: [
    'public int orangesRotting(int[][] grid) {',
    '    int R = grid.length, C = grid[0].length, fresh = 0;',
    '    Queue<int[]> q = new ArrayDeque<>();',
    '    for (int r = 0; r < R; r++)',
    '        for (int c = 0; c < C; c++) {',
    '            if (grid[r][c] == 2) q.add(new int[]{r, c});',
    '            else if (grid[r][c] == 1) fresh++;',
    '        }',
    '    int minutes = 0;',
    '    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};',
    '    while (!q.isEmpty() && fresh > 0) {',
    '        minutes++;',
    '        for (int size = q.size(); size > 0; size--) {',
    '            int[] cur = q.poll();',
    '            for (int[] d : dirs) {',
    '                int r = cur[0] + d[0], c = cur[1] + d[1];',
    '                if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] != 1) continue;',
    '                grid[r][c] = 2;',
    '                fresh--;',
    '                q.add(new int[]{r, c});',
    '            }',
    '        }',
    '    }',
    '    return fresh == 0 ? minutes : -1;',
    '}',
  ],
  python: [
    'def oranges_rotting(grid):',
    '    R, C = len(grid), len(grid[0])',
    '    q = deque()',
    '    fresh = 0',
    '    for r in range(R):',
    '        for c in range(C):',
    '            if grid[r][c] == 2:',
    '                q.append((r, c))',
    '            elif grid[r][c] == 1:',
    '                fresh += 1',
    '    minutes = 0',
    '    while q and fresh:',
    '        minutes += 1',
    '        for _ in range(len(q)):',
    '            r, c = q.popleft()',
    '            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '                nr, nc = r + dr, c + dc',
    '                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:',
    '                    grid[nr][nc] = 2',
    '                    fresh -= 1',
    '                    q.append((nr, nc))',
    '    return minutes if fresh == 0 else -1',
  ],
  algorithm: [
    'Queue every rotten orange and count the fresh ones',
    'While the queue is not empty and fresh oranges remain, start a minute = one BFS level',
    'Rot each fresh neighbour of the level, decrement fresh and enqueue it',
    'Return the minutes if fresh == 0, otherwise −1',
  ],
  complexity: [{ label: 'Time', value: 'O(R · C)' }, { label: 'Space', value: 'O(R · C)' }],
  why: 'BFS visits cells in order of their distance from the nearest source, so a fresh orange rots at minute = (shortest distance to any rotten orange). Starting from all sources at once makes that distance the minimum over all of them, and the answer is the largest such distance. A fresh orange with no path to a rotten one is never enqueued, which is why fresh > 0 at the end means −1.',
};
