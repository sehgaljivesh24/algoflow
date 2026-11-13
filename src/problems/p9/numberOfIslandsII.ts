import type { Aux, Cell, ProblemDef, Step } from '../../engine/types.ts';
import { recorder } from '../stepKit.ts';
import { TONES } from './kitA.ts';

interface In { m: number; n: number; pos: [number, number][] }

function parse(raw: string): In {
  const [a, b, ...rest] = raw.split('|');
  const ex = '3x3 | 0,0 0,1 2,2 1,1';
  if (b === undefined || rest.length) throw new Error(`Write the grid size, a bar, then the cells to turn into land, e.g. ${ex}`);
  const dims = /^\s*(\d+)\s*[x×*]\s*(\d+)\s*$/i.exec(a);
  if (!dims) throw new Error(`The grid size must look like 3x3 (rows x columns), e.g. ${ex}`);
  const m = Number(dims[1]);
  const n = Number(dims[2]);
  if (m < 1 || n < 1 || m > 5 || n > 5) throw new Error('Use a grid of at most 5 x 5');
  const toks = b.split(/[\s;]+/).filter(Boolean);
  if (!toks.length) throw new Error(`Give at least one cell as row,col, e.g. ${ex}`);
  if (toks.length > 8) throw new Error('Use at most 8 positions');
  const pos = toks.map((t): [number, number] => {
    const mm = /^(\d+),(\d+)$/.exec(t);
    if (!mm) throw new Error(`"${t}" is not a cell. Write row,col like 1,2`);
    const r = Number(mm[1]);
    const c = Number(mm[2]);
    if (r >= m || c >= n) throw new Error(`Cell ${t} is outside the ${m}x${n} grid (rows 0-${m - 1}, columns 0-${n - 1})`);
    return [r, c];
  });
  return { m, n, pos };
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function build({ m, n, pos }: In): Step[] {
  const parent: number[] = Array.from({ length: m * n }, () => -1);
  const steps: Step[] = [];
  const out: number[] = [];
  let count = 0;
  let cur: number | null = null;
  let nb: number | null = null;
  let curState: 'active' | 'found' | 'error' = 'active';
  let cell = '—';

  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const rootNoCompress = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const scene = () => {
    const rows: Cell[][] = [];
    for (let r = 0; r < m; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        if (parent[i] === -1) row.push({ key: i, value: '~', state: 'dim' });
        else {
          const root = rootNoCompress(i);
          const cl: Cell = { key: i, value: root, tone: TONES[root % TONES.length] };
          if (i === cur) cl.state = curState;
          else if (i === nb) cl.state = 'compare';
          row.push(cl);
        }
      }
      rows.push(row);
    }
    return { kind: 'grid' as const, rows, rowHeads: Array.from({ length: m }, (_, r) => String(r)), colHeads: Array.from({ length: n }, (_, c) => String(c)), variant: 'matrix' as const };
  };
  const aux = (): Aux[] => [
    { title: 'parent[ ] of land cells (index = row·cols + col)', kind: 'list', items: parent.map((p, i) => (p === -1 ? null : `${i}→${p}`)).filter((x): x is string => x !== null) },
    { title: 'island count after each add', kind: 'list', items: out.map(String) },
  ];
  const say = recorder(steps, () => ({ scene: scene(), aux: aux(), vars: { cell, neighbour: nb === null ? '—' : `(${Math.floor(nb / n)},${nb % n})`, islands: count, output: `[${out.join(', ')}]` } }));

  say({ title: 'Start', desc: `A ${m}×${n} grid of water (~). Land appears one cell at a time and after each addition we must report the number of islands. Each land cell will belong to a union-find group; the number in a cell is its group's leader.`, logic: 'Recounting islands with a flood fill after every addition would cost O(m·n) each time; union-find updates the count in near-constant time.', java: [1, 2, 4], py: [1, 2], algo: 0, tag: 'INIT —', note: `parent[0..${m * n - 1}] = −1 (water), count = 0` });

  for (const [r, c] of pos) {
    const id = r * n + c;
    cell = `(${r},${c})`;
    cur = id;
    nb = null;
    curState = 'active';
    if (parent[id] !== -1) {
      out.push(count);
      say({ title: `(${r},${c}) is already land`, desc: `Adding it again changes nothing, so the count stays ${count}.`, logic: 'Without this check a repeated cell would be counted as a second island.', tone: 'warn', java: [6, 7, 8, 18], py: [8, 9, 19], algo: 1, tag: 'REPEAT', alert: `(${r},${c}) was already land: the count stays ${count}.`, note: `parent[${id}] ≠ −1 → out.add(${count})` });
      continue;
    }
    parent[id] = id;
    count++;
    const land = DIRS.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(([rr, cc]) => rr >= 0 && rr < m && cc >= 0 && cc < n && parent[rr * n + cc] !== -1);
    say({ title: `Add land at (${r},${c})`, desc: `A new cell is its own island for now: islands = ${count}. It has ${land.length} land neighbour${land.length === 1 ? '' : 's'}${land.length ? `: ${land.map(([rr, cc]) => `(${rr},${cc})`).join(', ')}` : ''}.`, logic: 'Every new land cell starts as a group of one, which can only merge with groups next to it.', tone: 'success', java: [6, 7, 8, 9, 10], py: [8, 9, 10, 11], algo: 1, tag: 'ADD', note: `parent[${id}] = ${id}, count = ${count}` });
    for (const [rr, cc] of land) {
      const ni = rr * n + cc;
      nb = ni;
      const a = find(id);
      const b = find(ni);
      if (a === b) {
        say({ title: `(${rr},${cc}): already the same island`, desc: `Both cells have leader ${a}, so this neighbour is already connected; the count stays ${count}.`, logic: 'Two cells with one leader are connected, merging again would double-subtract.', java: [11, 12, 13, 14], py: [12, 13, 14, 15], algo: 2, tag: 'NEIGHBOUR', alert: `(${rr},${cc}) is already in this island (leader ${a}): no merge, no decrement.`, note: `find(${id}) = find(${ni}) = ${a} → count stays ${count}` });
      } else {
        parent[a] = b;
        count--;
        curState = 'found';
        say({ title: `Merge with (${rr},${cc}): islands = ${count}`, desc: `Leaders ${a} and ${b} differ, so two islands touch through the new cell. Point ${a} at ${b}: one island fewer.`, logic: 'Each successful union removes exactly one island.', tone: 'success', java: [14, 15], py: [15, 16, 17, 18], algo: 3, tag: 'MERGE', note: `parent[${a}] = ${b}, count-- → ${count}` });
        curState = 'active';
      }
    }
    nb = null;
    out.push(count);
    say({ title: `After (${r},${c}): ${count} island${count === 1 ? '' : 's'}`, desc: `Record ${count} in the output.`, logic: 'The count is maintained incrementally, never recomputed.', java: [18], py: [19], algo: 4, tag: 'RECORD', note: `out = [${out.join(', ')}]` });
  }
  cur = null;
  nb = null;
  cell = '—';
  say({
    title: 'All additions processed', desc: `Island counts after each addition: [${out.join(', ')}].`,
    logic: 'Every addition cost a handful of finds, never a full scan of the grid.', tone: 'success', java: [20], py: [20], algo: 5,
    tag: '✅ Done!', note: `return [${out.join(', ')}]`,
    result: { title: `[${out.join(', ')}]`, text: 'Island count after each addition' },
  });
  return steps;
}

export const numberOfIslandsII: ProblemDef<In> = {
  slug: '305-number-of-islands-ii',
  id: '305', title: 'Number of Islands II', difficulty: 'Hard', category: 'Graph', tag: 'online union-find',
  statement: 'An m × n grid starts as all water. You are given a list of cells to turn into land one after another. After each addition return how many islands exist (an island is a group of land cells joined horizontally or vertically).',
  constraints: 'Cells may repeat (animation input: grid up to 5 × 5 written like 3x3, up to 8 positions written row,col)',
  examples: [
    { label: '3x3 | 0,0 0,1 1,2 2,1', input: { m: 3, n: 3, pos: [[0, 0], [0, 1], [1, 2], [2, 1]] }, output: '[1, 1, 2, 3]' },
    { label: '3x3 | 0,0 1,1 0,1 1,0 0,1', input: { m: 3, n: 3, pos: [[0, 0], [1, 1], [0, 1], [1, 0], [0, 1]] }, output: '[1, 2, 1, 1, 1]' },
    { label: '2x4 | 0,0 0,2 0,1 1,3 0,3', input: { m: 2, n: 4, pos: [[0, 0], [0, 2], [0, 1], [1, 3], [0, 3]] }, output: '[1, 2, 1, 2, 1]' },
  ],
  inputPlaceholder: 'e.g. 3x3 | 0,0 0,1 1,2 2,1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Grid (number = group leader)',
  legend: [{ label: 'Cell being added', state: 'active' }, { label: 'Merged with a neighbour', state: 'found' }, { label: 'Neighbour being checked', state: 'compare' }, { label: 'Water', state: 'dim' }],
  varLabels: ['cell', 'neighbour', 'islands', 'output'],
  approach: {
    title: 'Online union-find: +1 per new cell, -1 per merge',
    text: 'Keep a union-find over land cells. Adding a land cell raises the island count by one; then for each of its four neighbours that is land, find both leaders and, if they differ, union them and lower the count by one. Repeated cells are ignored. The count after each addition is the answer for that step.',
  },
  java: [
    'List<Integer> numIslands2(int m, int n, int[][] positions) {',
    '    int[] parent = new int[m * n];',
    '    Arrays.fill(parent, -1);                 // -1 = water',
    '    List<Integer> out = new ArrayList<>();',
    '    int count = 0;',
    '    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};',
    '    for (int[] p : positions) {',
    '        int id = p[0] * n + p[1];',
    '        if (parent[id] == -1) {              // a repeated cell changes nothing',
    '            parent[id] = id;',
    '            count++;',
    '            for (int[] d : dirs) {',
    '                int r = p[0] + d[0], c = p[1] + d[1];',
    '                if (r < 0 || r >= m || c < 0 || c >= n || parent[r * n + c] == -1) continue;',
    '                int a = find(parent, id), b = find(parent, r * n + c);',
    '                if (a != b) { parent[a] = b; count--; }   // two islands become one',
    '            }',
    '        }',
    '        out.add(count);',
    '    }',
    '    return out;',
    '}',
    '',
    'private int find(int[] parent, int x) {',
    '    while (parent[x] != x) {',
    '        parent[x] = parent[parent[x]];       // path halving',
    '        x = parent[x];',
    '    }',
    '    return x;',
    '}',
  ],
  python: [
    'def num_islands2(m, n, positions):',
    '    parent = {}                              # missing = water',
    '    count, out = 0, []',
    '    def find(x):',
    '        while parent[x] != x:',
    '            parent[x] = parent[parent[x]]    # path halving',
    '            x = parent[x]',
    '        return x',
    '    for r, c in positions:',
    '        if (r, c) not in parent:             # a repeated cell changes nothing',
    '            parent[(r, c)] = (r, c)',
    '            count += 1',
    '            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '                nr, nc = r + dr, c + dc',
    '                if (nr, nc) in parent:',
    '                    a, b = find((r, c)), find((nr, nc))',
    '                    if a != b:',
    '                        parent[a] = b',
    '                        count -= 1',
    '        out.append(count)',
    '    return out',
  ],
  algorithm: [
    'Start with all water, count = 0 and an empty union-find',
    'For each new cell: skip it if it is already land, otherwise make it a group of one and count++',
    'Look at its four neighbours; only land neighbours matter',
    'If the leaders differ, union the groups and count--',
    'Append the current count to the answer',
    'After the last cell, return the list of counts',
  ],
  phases: [
    { icon: '🌊', label: 'Init: all water', tone: 'blue' },
    { icon: '🏝', label: 'Add land (count++)', tone: 'green' },
    { icon: '👀', label: 'Check a neighbour', tone: 'cyan' },
    { icon: '🔗', label: 'Merge (count--)', tone: 'gold' },
    { icon: '📝', label: 'Record the count', tone: 'blue' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['islands', 'after each addition', 'land'],
  complexity: [{ label: 'Time', value: 'O(k · α(mn))' }, { label: 'Space', value: 'O(mn)' }],
  why: 'The islands are exactly the connected components of the land cells, and union-find tracks components under insertions. A new isolated cell is one extra component; every union between two different components fuses them and reduces the number by one. A neighbour with the same leader is already in the component, so skipping it avoids subtracting twice. All updates are local, so no recount over the grid is ever needed.',
};
