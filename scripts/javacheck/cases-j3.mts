import type { JavaCaseModule } from './types.ts';

/**
 * J3 batch (d3 + d6): backtracking, BFS/flood fill, greedy, heaps, divide and conquer, tries, segment/Fenwick trees,
 * sqrt decomposition, persistent trees, suffix structures, Aho-Corasick, convex hull.
 * Expected strings come from the animation's verified final state or from small independent TS references.
 */
const ia = (a: number[]): string => `new int[]{${a.join(', ')}}`;
const ia2 = (a: number[][]): string => `new int[][]{${a.map((r) => '{' + r.join(', ') + '}').join(', ')}}`;
const q = (s: string): string => JSON.stringify(s);
const sa = (a: string[]): string => `new String[]{${a.map(q).join(', ')}}`;
const list = (a: (number | string)[]): string => `[${a.join(', ')}]`;
/** Java statements declaring `char[][] <name>` from an array of row strings. */
const chars = (name: string, rows: string[]): string =>
  `            String[] ${name}Rows = ${sa(rows)};\n            char[][] ${name} = new char[${name}Rows.length][];\n            for (int i = 0; i < ${name}Rows.length; i++) ${name}[i] = ${name}Rows[i].toCharArray();`;
const last = <T,>(a: T[]): T => a[a.length - 1];
const LISTNODE = 'class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\n';

export const cases: JavaCaseModule['cases'] = [
  {
    slug: '1094-car-pooling',
    main: ({ trips, capacity }: { trips: number[][]; capacity: number }) =>
      `            System.out.println(new Solution().carPooling(${ia2(trips)}, ${capacity}));`,
    expected: ({ trips, capacity }: { trips: number[][]; capacity: number }) => {
      const d = new Map<number, number>();
      for (const [n, a, b] of trips) { d.set(a, (d.get(a) ?? 0) + n); d.set(b, (d.get(b) ?? 0) - n); }
      let load = 0;
      for (const k of [...d.keys()].sort((x, y) => x - y)) { load += d.get(k)!; if (load > capacity) return 'false'; }
      return 'true';
    },
  },
  {
    slug: '127-word-ladder',
    main: ({ begin, end, words }: { begin: string; end: string; words: string[] }) =>
      `            System.out.println(new Solution().ladderLength(${q(begin)}, ${q(end)}, new ArrayList<>(Arrays.asList(${words.map(q).join(', ')}))));`,
    expected: ({ begin, end, words }: { begin: string; end: string; words: string[] }) => {
      const dict = new Set(words);
      if (!dict.has(end)) return '0';
      const dist = new Map<string, number>([[begin, 1]]);
      const queue = [begin];
      const diff1 = (a: string, b: string) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;
      while (queue.length) {
        const w = queue.shift()!;
        if (w === end) return String(dist.get(w));
        for (const x of dict) if (!dist.has(x) && diff1(w, x)) { dist.set(x, dist.get(w)! + 1); queue.push(x); }
      }
      return '0';
    },
  },
  {
    slug: '130-surrounded-regions',
    main: ({ grid }: { grid: string[] }) =>
      `${chars('board', grid)}\n            new Solution().solve(board);\n            StringBuilder sb = new StringBuilder();\n            for (char[] row : board) { if (sb.length() > 0) sb.append(' '); sb.append(new String(row)); }\n            System.out.println(sb);`,
    expected: ({ grid }: { grid: string[] }) => {
      const R = grid.length, C = grid[0].length;
      const g = grid.map((r) => r.split(''));
      const safe = g.map((r) => r.map(() => false));
      const st: number[][] = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if ((r === 0 || c === 0 || r === R - 1 || c === C - 1) && g[r][c] === 'O') { safe[r][c] = true; st.push([r, c]); }
      while (st.length) {
        const [r, c] = st.pop()!;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const a = r + dr, b = c + dc;
          if (a >= 0 && b >= 0 && a < R && b < C && g[a][b] === 'O' && !safe[a][b]) { safe[a][b] = true; st.push([a, b]); }
        }
      }
      return g.map((row, r) => row.map((ch, c) => (ch === 'O' && !safe[r][c] ? 'X' : ch)).join('')).join(' ');
    },
  },
  {
    slug: '131-palindrome-partitioning',
    main: ({ s }: { s: string }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<String> p : new Solution().partition(${q(s)})) out.add(String.join("|", p));\n            Collections.sort(out);\n            System.out.println(String.join(",", out));`,
    expected: ({ s }: { s: string }) => {
      const out: string[] = [];
      const isP = (t: string) => t === [...t].reverse().join('');
      const go = (i: number, path: string[]) => {
        if (i === s.length) { out.push(path.join('|')); return; }
        for (let e = i + 1; e <= s.length; e++) if (isP(s.slice(i, e))) go(e, [...path, s.slice(i, e)]);
      };
      go(0, []);
      return out.sort().join(',');
    },
  },
  {
    slug: '134-gas-station',
    main: ({ gas, cost }: { gas: number[]; cost: number[] }) =>
      `            System.out.println(new Solution().canCompleteCircuit(${ia(gas)}, ${ia(cost)}));`,
    expected: ({ gas, cost }: { gas: number[]; cost: number[] }) => {
      const n = gas.length;
      for (let s = 0; s < n; s++) {
        let tank = 0, ok = true;
        for (let k = 0; k < n && ok; k++) { const i = (s + k) % n; tank += gas[i] - cost[i]; if (tank < 0) ok = false; }
        if (ok) return String(s);
      }
      return '-1';
    },
  },
  {
    slug: '17-letter-combinations-of-a-phone-number',
    main: ({ digits }: { digits: string }) =>
      `            List<String> out = new Solution().letterCombinations(${q(digits)});\n            Collections.sort(out);\n            System.out.println(String.join(",", out));`,
    expected: ({ digits }: { digits: string }) => {
      const keys = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
      let res = [''];
      for (const d of digits) res = res.flatMap((p) => [...keys[Number(d)]].map((c) => p + c));
      return res.sort().join(',');
    },
  },
  {
    slug: '1971-find-if-path-exists-in-graph',
    main: ({ n, source, destination, edges }: { n: number; source: number; destination: number; edges: { u: number; v: number }[] }) =>
      `            System.out.println(new Solution().validPath(${n}, ${ia2(edges.map((e) => [e.u, e.v]))}, ${source}, ${destination}));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '200-number-of-islands',
    main: ({ grid }: { grid: string[] }) => `${chars('grid', grid)}\n            System.out.println(new Solution().numIslands(grid));`,
    expected: (_i, steps) => String(last(steps).vars.islands),
  },
  {
    slug: '215-kth-largest-element-in-an-array',
    main: ({ nums, k }: { nums: number[]; k: number }) => `            System.out.println(new Solution().findKthLargest(${ia(nums)}, ${k}));`,
    expected: ({ nums, k }: { nums: number[]; k: number }) => String([...nums].sort((a, b) => b - a)[k - 1]),
  },
  {
    slug: '218-the-skyline-problem',
    main: ({ b }: { b: number[][] }) => `            System.out.println(new Solution().getSkyline(${ia2(b)}));`,
    expected: ({ b }: { b: number[][] }) => {
      const xs = [...new Set(b.flatMap(([l, r]) => [l, r]))].sort((x, y) => x - y);
      const pts: number[][] = [];
      let prev = 0;
      for (const x of xs) {
        const h = Math.max(0, ...b.filter(([l, r]) => l <= x && x < r).map((t) => t[2]));
        if (h !== prev) { pts.push([x, h]); prev = h; }
      }
      return `[${pts.map((p) => `[${p[0]}, ${p[1]}]`).join(', ')}]`;
    },
  },
  {
    slug: '22-generate-parentheses',
    main: ({ n }: { n: number }) => `            List<String> out = new Solution().generateParenthesis(${n});\n            Collections.sort(out);\n            System.out.println(String.join(",", out));`,
    expected: ({ n }: { n: number }) => {
      const out: string[] = [];
      const go = (s: string, o: number, c: number) => { if (s.length === 2 * n) { out.push(s); return; } if (o < n) go(s + '(', o + 1, c); if (c < o) go(s + ')', o, c + 1); };
      go('', 0, 0);
      return out.sort().join(',');
    },
  },
  {
    slug: '23-merge-k-sorted-lists',
    extra: LISTNODE,
    main: ({ lists }: { lists: number[][] }) =>
      `            ListNode[] ls = new ListNode[${lists.length}];\n            int[][] data = ${ia2(lists)};\n            for (int i = 0; i < data.length; i++) { ListNode d = new ListNode(0), t = d; for (int v : data[i]) { t.next = new ListNode(v); t = t.next; } ls[i] = d.next; }\n            ListNode h = new Solution().mergeKLists(ls);\n            StringBuilder sb = new StringBuilder();\n            for (; h != null; h = h.next) sb.append(h.val).append(' ');\n            System.out.println(sb);`,
    expected: ({ lists }: { lists: number[][] }) => lists.flat().sort((a, b) => a - b).join(' '),
  },
  {
    slug: '241-different-ways-to-add-parentheses',
    main: ({ expr }: { expr: string }) => `            List<Integer> r = new Solution().diffWaysToCompute(${q(expr)});\n            Collections.sort(r);\n            System.out.println(r);`,
    expected: ({ expr }: { expr: string }) => {
      const toks = expr.match(/\d+|[+\-*]/g)!;
      const go = (lo: number, hi: number): number[] => {
        if (lo === hi) return [Number(toks[lo])];
        const res: number[] = [];
        for (let i = lo + 1; i < hi; i += 2) for (const a of go(lo, i - 1)) for (const b of go(i + 1, hi)) res.push(toks[i] === '+' ? a + b : toks[i] === '-' ? a - b : a * b);
        return res;
      };
      return list(go(0, toks.length - 1).sort((a, b) => a - b));
    },
  },
  {
    slug: '253-meeting-rooms-ii',
    main: ({ iv }: { iv: number[][] }) => `            System.out.println(new Solution().minMeetingRooms(${ia2(iv)}));`,
    expected: ({ iv }: { iv: number[][] }) => {
      const pts = iv.flatMap(([s, e]) => [[s, 1], [e, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let cur = 0, best = 0;
      for (const [, d] of pts) { cur += d; best = Math.max(best, cur); }
      return String(best);
    },
  },
  {
    slug: '295-find-median-from-data-stream',
    noWrap: true,
    main: ({ nums }: { nums: number[] }) =>
      `            MedianFinder mf = new MedianFinder();\n            StringBuilder sb = new StringBuilder();\n            for (int x : ${ia(nums)}) { mf.addNum(x); sb.append(String.format(Locale.ROOT, "%.1f", mf.findMedian())).append(','); }\n            System.out.println(sb);`,
    expected: ({ nums }: { nums: number[] }) => {
      const out: string[] = [];
      for (let i = 1; i <= nums.length; i++) {
        const s = nums.slice(0, i).sort((a, b) => a - b);
        out.push(((i % 2 ? s[(i - 1) / 2] : (s[i / 2 - 1] + s[i / 2]) / 2)).toFixed(1));
      }
      return out.join(',') + ',';
    },
  },
  {
    slug: '31-next-permutation',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            new Solution().nextPermutation(a);\n            System.out.println(Arrays.toString(a));`,
    expected: ({ nums }: { nums: number[] }) => {
      const a = [...nums];
      let i = a.length - 2;
      while (i >= 0 && a[i] >= a[i + 1]) i--;
      if (i >= 0) { let j = a.length - 1; while (a[j] <= a[i]) j--; [a[i], a[j]] = [a[j], a[i]]; }
      return list([...a.slice(0, i + 1), ...a.slice(i + 1).reverse()]);
    },
  },
  {
    slug: '347-top-k-frequent-elements',
    main: ({ nums, k }: { nums: number[]; k: number }) =>
      `            int[] a = ${ia(nums)};\n            Map<Integer, Integer> f = new HashMap<>();\n            for (int x : a) f.merge(x, 1, Integer::sum);\n            int[] res = new Solution().topKFrequent(a, ${k});\n            List<Integer> fs = new ArrayList<>();\n            for (int r : res) fs.add(f.get(r));\n            Collections.sort(fs, Collections.reverseOrder());\n            System.out.println(fs + " distinct=" + new HashSet<>(Arrays.asList(Arrays.stream(res).boxed().toArray())).size());`,
    // ties make the exact elements ambiguous: compare the multiset of chosen frequencies and that the k elements are distinct
    expected: ({ nums, k }: { nums: number[]; k: number }) => {
      const f = new Map<number, number>();
      for (const x of nums) f.set(x, (f.get(x) ?? 0) + 1);
      return `${list([...f.values()].sort((a, b) => b - a).slice(0, k))} distinct=${k}`;
    },
    notes: 'ties between equal frequencies: validates chosen frequencies + distinctness rather than exact elements',
  },
  {
    slug: '37-sudoku-solver',
    main: ({ board }: { board: string[] }) =>
      `${chars('b', board)}\n            new Solution().solveSudoku(b);\n            StringBuilder sb = new StringBuilder();\n            for (char[] row : b) { if (sb.length() > 0) sb.append(' '); sb.append(new String(row)); }\n            System.out.println(sb);`,
    expected: (_i, steps) => String(last(steps).result?.text),
  },
  {
    slug: '378-kth-smallest-element-in-a-sorted-matrix',
    main: ({ m, k }: { m: number[][]; k: number }) => `            System.out.println(new Solution().kthSmallest(${ia2(m)}, ${k}));`,
    expected: ({ m, k }: { m: number[][]; k: number }) => String(m.flat().sort((a, b) => a - b)[k - 1]),
  },
  {
    slug: '39-combination-sum',
    main: ({ candidates, target }: { candidates: number[]; target: number }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> c : new Solution().combinationSum(${ia(candidates)}, ${target})) { List<Integer> s = new ArrayList<>(c); Collections.sort(s); out.add(s.toString()); }\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ candidates, target }: { candidates: number[]; target: number }) => {
      const c = [...candidates].sort((a, b) => a - b);
      const out: string[] = [];
      const go = (i: number, rem: number, path: number[]) => {
        if (rem === 0) { out.push(list(path)); return; }
        for (let j = i; j < c.length; j++) if (c[j] <= rem) go(j, rem - c[j], [...path, c[j]]);
      };
      go(0, target, []);
      return out.sort().join(';');
    },
  },
  {
    slug: '417-pacific-atlantic-water-flow',
    main: ({ grid }: { grid: string[] }) =>
      `            int[][] h = new int[${grid.length}][${grid[0].length}];\n            String[] rows = ${sa(grid)};\n            for (int i = 0; i < rows.length; i++) for (int j = 0; j < rows[i].length(); j++) h[i][j] = rows[i].charAt(j) - '0';\n            System.out.println(new Solution().pacificAtlantic(h));`,
    expected: ({ grid }: { grid: string[] }) => {
      const R = grid.length, C = grid[0].length;
      const h = grid.map((r) => [...r].map(Number));
      const flow = (starts: number[][]) => {
        const seen = h.map((r) => r.map(() => false));
        const st = [...starts];
        for (const [r, c] of st) seen[r][c] = true;
        while (st.length) {
          const [r, c] = st.pop()!;
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const a = r + dr, b = c + dc;
            if (a >= 0 && b >= 0 && a < R && b < C && !seen[a][b] && h[a][b] >= h[r][c]) { seen[a][b] = true; st.push([a, b]); }
          }
        }
        return seen;
      };
      const pac: number[][] = [], atl: number[][] = [];
      for (let r = 0; r < R; r++) { pac.push([r, 0]); atl.push([r, C - 1]); }
      for (let c = 0; c < C; c++) { pac.push([0, c]); atl.push([R - 1, c]); }
      const p = flow(pac), a = flow(atl);
      const res: string[] = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (p[r][c] && a[r][c]) res.push(`[${r}, ${c}]`);
      return `[${res.join(', ')}]`;
    },
  },
  {
    slug: '435-non-overlapping-intervals',
    main: ({ iv }: { iv: number[][] }) => `            System.out.println(new Solution().eraseOverlapIntervals(${ia2(iv)}));`,
    expected: ({ iv }: { iv: number[][] }) => {
      const s = [...iv].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const best: number[] = [];
      for (let i = 0; i < s.length; i++) { best[i] = 1; for (let j = 0; j < i; j++) if (s[j][1] <= s[i][0]) best[i] = Math.max(best[i], best[j] + 1); }
      return String(iv.length - Math.max(0, ...best));
    },
  },
  {
    slug: '45-jump-game-ii',
    // the problem guarantees the last index is reachable: unreachable generator inputs are skipped (both sides print "skip")
    main: ({ nums }: { nums: number[] }) => (jumpDist(nums) === Infinity ? '            System.out.println("skip");' : `            System.out.println(new Solution().jump(${ia(nums)}));`),
    expected: ({ nums }: { nums: number[] }) => (jumpDist(nums) === Infinity ? 'skip' : String(jumpDist(nums))),
  },
  {
    slug: '46-permutations',
    main: ({ nums }: { nums: number[] }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> p : new Solution().permute(${ia(nums)})) out.add(p.toString());\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ nums }: { nums: number[] }) => {
      const out: string[] = [];
      const go = (rest: number[], path: number[]) => { if (!rest.length) { out.push(list(path)); return; } rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...path, x])); };
      go(nums, []);
      return out.sort().join(';');
    },
  },
  {
    slug: '47-permutations-ii',
    main: ({ nums }: { nums: number[] }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> p : new Solution().permuteUnique(${ia(nums)})) out.add(p.toString());\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ nums }: { nums: number[] }) => {
      const out = new Set<string>();
      const go = (rest: number[], path: number[]) => { if (!rest.length) { out.add(list(path)); return; } rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...path, x])); };
      go(nums, []);
      return [...out].sort().join(';');
    },
    notes: 'also checks there are no duplicate permutations in the Java output (compared against the distinct set)',
  },
  {
    slug: '48-rotate-image',
    main: ({ m }: { m: number[][] }) => `            int[][] a = ${ia2(m)};\n            new Solution().rotate(a);\n            System.out.println(Arrays.deepToString(a));`,
    expected: ({ m }: { m: number[][] }) => {
      const n = m.length;
      const r = m.map((row) => row.map(() => 0));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
      return `[${r.map((row) => `[${row.join(', ')}]`).join(', ')}]`;
    },
  },
  {
    slug: '480-sliding-window-median',
    main: ({ nums, k }: { nums: number[]; k: number }) =>
      `            double[] r = new Solution().medianSlidingWindow(${ia(nums)}, ${k});\n            StringBuilder sb = new StringBuilder();\n            for (double d : r) sb.append(String.format(Locale.ROOT, "%.1f", d)).append(',');\n            System.out.println(sb);`,
    expected: ({ nums, k }: { nums: number[]; k: number }) => {
      const out: string[] = [];
      for (let i = 0; i + k <= nums.length; i++) {
        const s = nums.slice(i, i + k).sort((a, b) => a - b);
        out.push((k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2).toFixed(1));
      }
      return out.join(',') + ',';
    },
  },
  {
    slug: '493-reverse-pairs',
    main: ({ nums }: { nums: number[] }) => `            System.out.println(new Solution().reversePairs(${ia(nums)}));`,
    expected: ({ nums }: { nums: number[] }) => {
      let c = 0;
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] > 2 * nums[j]) c++;
      return String(c);
    },
  },
  {
    slug: '498-diagonal-traverse',
    main: ({ m }: { m: number[][] }) => `            System.out.println(Arrays.toString(new Solution().findDiagonalOrder(${ia2(m)})));`,
    expected: ({ m }: { m: number[][] }) => {
      const cells: number[][] = [];
      m.forEach((row, r) => row.forEach((_, c) => cells.push([r, c])));
      cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || ((a[0] + a[1]) % 2 === 0 ? b[0] - a[0] : a[0] - b[0]));
      return list(cells.map(([r, c]) => m[r][c]));
    },
  },
  {
    slug: '502-ipo',
    main: ({ k, w, profits, capital }: { k: number; w: number; profits: number[]; capital: number[] }) =>
      `            System.out.println(new Solution().findMaximizedCapital(${k}, ${w}, ${ia(profits)}, ${ia(capital)}));`,
    expected: ({ k, w, profits, capital }: { k: number; w: number; profits: number[]; capital: number[] }) => {
      const done = profits.map(() => false);
      for (let t = 0; t < k; t++) {
        let bi = -1;
        profits.forEach((p, i) => { if (!done[i] && capital[i] <= w && (bi < 0 || p > profits[bi])) bi = i; });
        if (bi < 0) break;
        done[bi] = true; w += profits[bi];
      }
      return String(w);
    },
  },
  {
    slug: '51-n-queens',
    main: ({ n }: { n: number }) =>
      `            int n = ${n};\n            List<String> out = new ArrayList<>();\n            for (List<String> b : new Solution().solveNQueens(n)) {\n                List<Integer> cols = new ArrayList<>();\n                for (String row : b) { int idx = row.indexOf('Q'); if (!row.equals(".".repeat(idx) + "Q" + ".".repeat(n - idx - 1))) throw new RuntimeException("bad row " + row); cols.add(idx); }\n                if (b.size() != n) throw new RuntimeException("bad size");\n                out.add(cols.toString());\n            }\n            Collections.sort(out);\n            System.out.println(String.join(" ", out));`,
    expected: ({ n }: { n: number }) => {
      const out: string[] = [];
      const go = (cols: number[]) => {
        if (cols.length === n) { out.push(list(cols)); return; }
        for (let c = 0; c < n; c++) if (cols.every((x, r) => x !== c && Math.abs(x - c) !== cols.length - r)) go([...cols, c]);
      };
      go([]);
      return out.sort().join(' ');
    },
  },
  {
    slug: '54-spiral-matrix',
    main: ({ m }: { m: number[][] }) => `            System.out.println(new Solution().spiralOrder(${ia2(m)}));`,
    expected: ({ m }: { m: number[][] }) => {
      let g = m.map((r) => [...r]);
      const out: number[] = [];
      while (g.length) {
        out.push(...g.shift()!);
        // rotate the rest counter-clockwise so the next edge becomes the top row
        const rows = g.length, cols = rows ? g[0].length : 0;
        g = Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => g[r][cols - 1 - c]));
      }
      return list(out);
    },
  },
  {
    slug: '542-01-matrix',
    main: ({ grid }: { grid: string[] }) =>
      `            String[] rows = ${sa(grid)};\n            int[][] mat = new int[rows.length][rows[0].length()];\n            for (int i = 0; i < rows.length; i++) for (int j = 0; j < rows[i].length(); j++) mat[i][j] = rows[i].charAt(j) - '0';\n            System.out.println(Arrays.deepToString(new Solution().updateMatrix(mat)));`,
    expected: ({ grid }: { grid: string[] }) => {
      const zeros: number[][] = [];
      grid.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '0') zeros.push([r, c]); }));
      const d = grid.map((row, r) => [...row].map((_, c) => (zeros.length ? Math.min(...zeros.map(([a, b]) => Math.abs(a - r) + Math.abs(b - c))) : -1)));
      return `[${d.map((row) => `[${row.join(', ')}]`).join(', ')}]`;
    },
  },
  {
    slug: '55-jump-game',
    main: ({ nums }: { nums: number[] }) => `            System.out.println(new Solution().canJump(${ia(nums)}));`,
    expected: ({ nums }: { nums: number[] }) => {
      const ok = nums.map(() => false);
      ok[0] = true;
      for (let i = 0; i < nums.length; i++) if (ok[i]) for (let j = i + 1; j <= i + nums[i] && j < nums.length; j++) ok[j] = true;
      return String(ok[nums.length - 1]);
    },
  },
  {
    slug: '56-merge-intervals',
    main: ({ iv }: { iv: number[][] }) => `            System.out.println(Arrays.deepToString(new Solution().merge(${ia2(iv)})));`,
    expected: ({ iv }: { iv: number[][] }) => {
      const s = [...iv].map((x) => [...x]).sort((a, b) => a[0] - b[0]);
      const out: number[][] = [];
      for (const x of s) { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push(x); }
      return `[${out.map((r) => `[${r.join(', ')}]`).join(', ')}]`;
    },
  },
  {
    slug: '57-insert-interval',
    main: ({ iv, add }: { iv: number[][]; add: number[] }) => `            System.out.println(Arrays.deepToString(new Solution().insert(${ia2(iv)}, ${ia(add)})));`,
    // the animation's answer is "[1, 5] [6, 9]": re-format it as the Java deepToString line
    expected: (_i, steps) => `[${String(last(steps).result?.title).replace(/\] \[/g, '], [')}]`,
  },
  {
    slug: '632-smallest-range-covering-elements-from-k-lists',
    main: ({ lists }: { lists: number[][] }) =>
      `            int[][] data = ${ia2(lists)};\n            List<List<Integer>> l = new ArrayList<>();\n            for (int[] row : data) { List<Integer> x = new ArrayList<>(); for (int v : row) x.add(v); l.add(x); }\n            System.out.println(Arrays.toString(new Solution().smallestRange(l)));`,
    expected: ({ lists }: { lists: number[][] }) => {
      let best: number[] | null = null;
      for (const a of lists.flat()) {
        let b = a, ok = true;
        for (const l of lists) { const c = l.filter((v) => v >= a); if (!c.length) { ok = false; break; } b = Math.max(b, Math.min(...c)); }
        if (ok && (!best || b - a < best[1] - best[0] || (b - a === best[1] - best[0] && a < best[0]))) best = [a, b];
      }
      return list(best!);
    },
  },
  {
    slug: '695-max-area-of-island',
    main: ({ grid }: { grid: string[] }) =>
      `            String[] rows = ${sa(grid)};\n            int[][] g = new int[rows.length][rows[0].length()];\n            for (int i = 0; i < rows.length; i++) for (int j = 0; j < rows[i].length(); j++) g[i][j] = rows[i].charAt(j) - '0';\n            System.out.println(new Solution().maxAreaOfIsland(g));`,
    expected: ({ grid }: { grid: string[] }) => {
      const seen = new Set<string>();
      let best = 0;
      grid.forEach((row, r0) => [...row].forEach((ch, c0) => {
        if (ch !== '1' || seen.has(`${r0},${c0}`)) return;
        let area = 0;
        const st = [[r0, c0]];
        seen.add(`${r0},${c0}`);
        while (st.length) {
          const [r, c] = st.pop()!;
          area++;
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const a = r + dr, b = c + dc;
            if (grid[a]?.[b] === '1' && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); st.push([a, b]); }
          }
        }
        best = Math.max(best, area);
      }));
      return String(best);
    },
  },
  {
    slug: '73-set-matrix-zeroes',
    main: ({ m }: { m: number[][] }) => `            int[][] a = ${ia2(m)};\n            new Solution().setZeroes(a);\n            System.out.println(Arrays.deepToString(a));`,
    expected: ({ m }: { m: number[][] }) => {
      const rows = new Set<number>(), cols = new Set<number>();
      m.forEach((row, r) => row.forEach((v, c) => { if (v === 0) { rows.add(r); cols.add(c); } }));
      return `[${m.map((row, r) => `[${row.map((v, c) => (rows.has(r) || cols.has(c) ? 0 : v)).join(', ')}]`).join(', ')}]`;
    },
  },
  {
    slug: '77-combinations',
    main: ({ n, k }: { n: number; k: number }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> c : new Solution().combine(${n}, ${k})) out.add(c.toString());\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ n, k }: { n: number; k: number }) => {
      const out: string[] = [];
      const go = (s: number, path: number[]) => { if (path.length === k) { out.push(list(path)); return; } for (let i = s; i <= n; i++) go(i + 1, [...path, i]); };
      go(1, []);
      return out.sort().join(';');
    },
  },
  {
    slug: '78-subsets',
    main: ({ nums }: { nums: number[] }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> c : new Solution().subsets(${ia(nums)})) out.add(c.toString());\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ nums }: { nums: number[] }) => {
      const out: string[] = [];
      for (let mask = 0; mask < 1 << nums.length; mask++) out.push(list(nums.filter((_, i) => mask >> i & 1)));
      return out.sort().join(';');
    },
  },
  {
    slug: '79-word-search',
    main: ({ board, word }: { board: string[]; word: string }) => `${chars('b', board)}\n            System.out.println(new Solution().exist(b, ${q(word)}));`,
    expected: ({ board, word }: { board: string[]; word: string }) => {
      const used = new Set<string>();
      const go = (r: number, c: number, i: number): boolean => {
        if (i === word.length) return true;
        if (board[r]?.[c] !== word[i] || used.has(`${r},${c}`)) return false;
        used.add(`${r},${c}`);
        const ok = go(r + 1, c, i + 1) || go(r - 1, c, i + 1) || go(r, c + 1, i + 1) || go(r, c - 1, i + 1);
        used.delete(`${r},${c}`);
        return ok;
      };
      for (let r = 0; r < board.length; r++) for (let c = 0; c < board[0].length; c++) if (go(r, c, 0)) return 'true';
      return 'false';
    },
  },
  {
    slug: '90-subsets-ii',
    main: ({ nums }: { nums: number[] }) =>
      `            List<String> out = new ArrayList<>();\n            for (List<Integer> c : new Solution().subsetsWithDup(${ia(nums)})) out.add(c.toString());\n            Collections.sort(out);\n            System.out.println(String.join(";", out));`,
    expected: ({ nums }: { nums: number[] }) => {
      const s = [...nums].sort((a, b) => a - b);
      const out = new Set<string>();
      for (let mask = 0; mask < 1 << s.length; mask++) out.add(list(s.filter((_, i) => mask >> i & 1)));
      return [...out].sort().join(';');
    },
    notes: 'Java output must contain every distinct subset exactly once (duplicates would break equality with the distinct set)',
  },
  {
    slug: '912-merge-sort',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            new Solution().mergeSort(a, 0, a.length - 1);\n            System.out.println(Arrays.toString(a));`,
    expected: ({ nums }: { nums: number[] }) => list([...nums].sort((a, b) => a - b)),
  },
  {
    slug: '912-quick-sort',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            new Solution().quickSort(a, 0, a.length - 1);\n            System.out.println(Arrays.toString(a));`,
    expected: ({ nums }: { nums: number[] }) => list([...nums].sort((a, b) => a - b)),
  },
  {
    slug: '973-k-closest-points-to-origin',
    main: ({ points, k }: { points: number[][]; k: number }) =>
      `            int[][] pts = ${ia2(points)};\n            int[][] res = new Solution().kClosest(pts, ${k});\n            List<String> pool = new ArrayList<>();\n            for (int[] p : pts) pool.add(p[0] + "," + p[1]);\n            List<Integer> ds = new ArrayList<>();\n            for (int[] p : res) { if (!pool.remove(p[0] + "," + p[1])) throw new RuntimeException("not an input point"); ds.add(p[0] * p[0] + p[1] * p[1]); }\n            Collections.sort(ds);\n            System.out.println(ds);`,
    // equal distances at the cut make the exact points ambiguous: compare the sorted squared distances and that the points come from the input
    expected: ({ points, k }: { points: number[][]; k: number }) => list(points.map(([x, y]) => x * x + y * y).sort((a, b) => a - b).slice(0, k)),
    notes: 'ties at the k-th distance: validates squared distances + membership instead of exact points',
  },
  {
    slug: '994-rotting-oranges',
    main: ({ grid }: { grid: string[] }) =>
      `            String[] rows = ${sa(grid)};\n            int[][] g = new int[rows.length][rows[0].length()];\n            for (int i = 0; i < rows.length; i++) for (int j = 0; j < rows[i].length(); j++) g[i][j] = rows[i].charAt(j) - '0';\n            System.out.println(new Solution().orangesRotting(g));`,
    expected: ({ grid }: { grid: string[] }) => {
      const g = grid.map((r) => [...r].map(Number));
      let minutes = 0;
      for (;;) {
        const nxt = g.map((r) => [...r]);
        let changed = false;
        g.forEach((row, r) => row.forEach((v, c) => {
          if (v !== 1) return;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => g[r + dr]?.[c + dc] === 2)) { nxt[r][c] = 2; changed = true; }
        }));
        if (!changed) break;
        for (let r = 0; r < g.length; r++) g[r] = nxt[r];
        minutes++;
      }
      return g.flat().includes(1) ? '-1' : String(minutes);
    },
  },
  {
    slug: 'alg-maximum-subarray-divide-and-conquer',
    main: ({ nums }: { nums: number[] }) => `            System.out.println(new Solution().maxSubArray(${ia(nums)}));`,
    expected: ({ nums }: { nums: number[] }) => {
      let best = -Infinity;
      for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; best = Math.max(best, s); } }
      return String(best);
    },
  },

  // ---------------------------------------------------------------- d6: data structures (operation sequences print "[null, v, ...]")
  {
    slug: '1032-stream-of-characters',
    noWrap: true,
    main: ({ words, text }: { words: string[]; text: string }) =>
      `            StreamChecker sc = new StreamChecker(${sa(words)});\n            List<Object> out = new ArrayList<>();\n            out.add(null);\n            for (char ch : ${q(text)}.toCharArray()) out.add(sc.query(ch));\n            System.out.println(out);`,
    expected: ({ words, text }: { words: string[]; text: string }) =>
      `[null${[...text].map((_, i) => ', ' + words.some((w) => w.length <= i + 1 && text.slice(i + 1 - w.length, i + 1) === w)).join('')}]`,
  },
  {
    slug: '1146-snapshot-array',
    noWrap: true,
    main: ({ n, ops }: { n: number; ops: { k: string; i?: number; v?: number; s?: number }[] }) =>
      `            SnapshotArray sa = new SnapshotArray(${n});\n            List<Object> out = new ArrayList<>();\n            out.add(null);\n${ops
        .map((o) => (o.k === 'set' ? `            sa.set(${o.i}, ${o.v}); out.add(null);` : o.k === 'snap' ? '            out.add(sa.snap());' : `            out.add(sa.get(${o.i}, ${o.s}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ n, ops }: { n: number; ops: { k: string; i?: number; v?: number; s?: number }[] }) => {
      const arr = new Array<number>(n).fill(0);
      const snaps: number[][] = [];
      const out: string[] = ['null'];
      for (const o of ops) {
        if (o.k === 'set') { arr[o.i!] = o.v!; out.push('null'); }
        else if (o.k === 'snap') { snaps.push([...arr]); out.push(String(snaps.length - 1)); }
        else out.push(String(snaps[o.s!][o.i!]));
      }
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: '208-implement-trie',
    noWrap: true,
    main: ({ ops }: { ops: { op: string; word: string }[] }) =>
      `            Trie t = new Trie();\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.op === 'insert' ? `            t.insert(${q(o.word)}); out.add(null);` : `            out.add(t.${o.op}(${q(o.word)}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ ops }: { ops: { op: string; word: string }[] }) => {
      const words = new Set<string>();
      const out = ops.map((o) => {
        if (o.op === 'insert') { words.add(o.word); return 'null'; }
        if (o.op === 'search') return String(words.has(o.word));
        return String([...words].some((w) => w.startsWith(o.word)));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: '2080-range-frequency-queries',
    noWrap: true,
    main: ({ a, qs }: { a: number[]; qs: { l: number; r: number; v: number }[] }) =>
      `            RangeFreqQuery rq = new RangeFreqQuery(${ia(a)});\n            List<Object> out = new ArrayList<>();\n${qs.map((x) => `            out.add(rq.query(${x.l}, ${x.r}, ${x.v}));`).join('\n')}\n            System.out.println(out);`,
    expected: ({ a, qs }: { a: number[]; qs: { l: number; r: number; v: number }[] }) =>
      `[${qs.map((x) => a.slice(x.l, x.r + 1).filter((y) => y === x.v).length).join(', ')}]`,
  },
  {
    slug: '211-design-add-and-search-words-data-structure',
    noWrap: true,
    main: ({ ops }: { ops: { op: string; word: string }[] }) =>
      `            WordDictionary d = new WordDictionary();\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.op === 'add' ? `            d.addWord(${q(o.word)}); out.add(null);` : `            out.add(d.search(${q(o.word)}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ ops }: { ops: { op: string; word: string }[] }) => {
      const words: string[] = [];
      const out = ops.map((o) => {
        if (o.op === 'add') { words.push(o.word); return 'null'; }
        return String(words.some((w) => w.length === o.word.length && [...o.word].every((c, i) => c === '.' || c === w[i])));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: '212-word-search-ii',
    main: ({ board, words }: { board: string[]; words: string[] }) =>
      `${chars('b', board)}\n            List<String> found = new Solution().findWords(b, ${sa(words)});\n            Collections.sort(found);\n            System.out.println(String.join(",", found));`,
    expected: ({ board, words }: { board: string[]; words: string[] }) => {
      const R = board.length, C = board[0].length;
      const has = (w: string): boolean => {
        const used = new Set<string>();
        const go = (r: number, c: number, i: number): boolean => {
          if (i === w.length) return true;
          if (r < 0 || c < 0 || r >= R || c >= C || board[r][c] !== w[i] || used.has(`${r},${c}`)) return false;
          used.add(`${r},${c}`);
          const ok = go(r + 1, c, i + 1) || go(r - 1, c, i + 1) || go(r, c + 1, i + 1) || go(r, c - 1, i + 1);
          used.delete(`${r},${c}`);
          return ok;
        };
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
        return false;
      };
      return [...new Set(words)].filter(has).sort().join(',');
    },
    notes: 'found words compared sorted (the displayed code reports in discovery order); duplicates in the word list must be reported once',
  },
  {
    slug: '307-range-sum-query-mutable',
    noWrap: true,
    main: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) =>
      `            NumArray na = new NumArray(${ia(nums)});\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.name === 'update' ? `            na.update(${o.args[0]}, ${o.args[1]}); out.add(null);` : `            out.add(na.sumRange(${o.args[0]}, ${o.args[1]}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) => {
      const a = [...nums];
      const out = ops.map((o) => {
        if (o.name === 'update') { a[o.args[0]] = o.args[1]; return 'null'; }
        return String(a.slice(o.args[0], o.args[1] + 1).reduce((x, y) => x + y, 0));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: '315-count-of-smaller-numbers-after-self',
    noWrap: true,
    main: (nums: number[]) => `            System.out.println(new Solution().countSmaller(${ia(nums)}));`,
    expected: (nums: number[]) => list(nums.map((x, i) => nums.slice(i + 1).filter((y) => y < x).length)),
  },
  {
    slug: '421-maximum-xor-of-two-numbers-in-an-array',
    main: ({ nums }: { nums: number[] }) => `            System.out.println(Solution.findMaximumXOR(${ia(nums)}));`,
    expected: ({ nums }: { nums: number[] }) => {
      let best = 0;
      for (const x of nums) for (const y of nums) best = Math.max(best, x ^ y);
      return String(best);
    },
  },
  {
    slug: '587-erect-the-fence',
    main: ({ pts }: { pts: number[][] }) =>
      `            int[][] res = new Solution().outerTrees(${ia2(pts)});\n            Arrays.sort(res, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);\n            System.out.println(Arrays.deepToString(res));`,
    expected: ({ pts }: { pts: number[][] }) => {
      // brute force: a point is on the fence iff some supporting line through two points keeps every tree on one side and passes through it
      const P = pts.filter((p, i) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i);
      const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const on = new Set<string>();
      if (P.length === 1) on.add(P[0].join(','));
      for (const a of P) for (const b of P) {
        if (a === b) continue;
        if (P.every((x) => cr(a, b, x) >= 0)) for (const x of P) if (cr(a, b, x) === 0) on.add(x.join(','));
      }
      const out = [...on].map((s) => s.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      return `[${out.map((p) => `[${p[0]}, ${p[1]}]`).join(', ')}]`;
    },
  },
  {
    slug: '648-replace-words',
    main: ({ roots, words }: { roots: string[]; words: string[] }) =>
      `            System.out.println(Solution.replaceWords(new ArrayList<>(Arrays.asList(${roots.map(q).join(', ')})), ${q(words.join(' '))}));`,
    expected: ({ roots, words }: { roots: string[]; words: string[] }) =>
      words.map((w) => { const hit = roots.filter((r) => w.startsWith(r)).sort((a, b) => a.length - b.length)[0]; return hit ?? w; }).join(' '),
  },
  {
    slug: 'alg-fenwick-tree-binary-indexed-tree',
    noWrap: true,
    main: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) =>
      `            Fenwick fw = new Fenwick(${ia(nums)});\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.name === 'add' ? `            fw.add(${o.args[0]}, ${o.args[1]}); out.add(null);` : `            out.add(fw.prefix(${o.args[0]}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) => {
      const a = [...nums];
      const out = ops.map((o) => {
        if (o.name === 'add') { a[o.args[0] - 1] += o.args[1]; return 'null'; }
        return String(a.slice(0, o.args[0]).reduce((x, y) => x + y, 0));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: 'alg-sqrt-decomposition-range-sum-with-updates',
    noWrap: true,
    main: ({ a, ops }: { a: number[]; ops: { k: string; l?: number; r?: number; i?: number; v?: number }[] }) =>
      `            SqrtSum sq = new SqrtSum(${ia(a)});\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.k === 'set' ? `            sq.set(${o.i}, ${o.v});` : `            out.add(sq.sum(${o.l}, ${o.r}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ a, ops }: { a: number[]; ops: { k: string; l?: number; r?: number; i?: number; v?: number }[] }) => {
      const arr = [...a];
      const out: number[] = [];
      for (const o of ops) {
        if (o.k === 'set') arr[o.i!] = o.v!;
        else out.push(arr.slice(o.l!, o.r! + 1).reduce((x, y) => x + y, 0));
      }
      return list(out);
    },
  },
  {
    slug: 'cp-aho-corasick-build-failure-links',
    noWrap: true,
    main: ({ words }: { words: string[] }) =>
      `            AhoCorasick ac = new AhoCorasick();\n            for (String w : ${sa(words)}) ac.insert(w);\n            ac.buildFailureLinks();\n            java.lang.reflect.Field fs = AhoCorasick.class.getDeclaredField("states"); fs.setAccessible(true);\n            java.lang.reflect.Field ff = AhoCorasick.class.getDeclaredField("fail"); ff.setAccessible(true);\n            int st = fs.getInt(ac);\n            System.out.println(st + " states, fail = " + Arrays.toString(Arrays.copyOf((int[]) ff.get(ac), st)));`,
    expected: (_i, steps) => `${last(steps).result?.title}, ${last(steps).result?.text}`,
    notes: 'private fields states/fail are read by reflection; expected is the animation\'s final fail array (state numbering = trie insertion order)',
  },
  {
    slug: 'cp-count-distinct-substrings-suffix-trie',
    main: ({ s }: { s: string }) => `            System.out.println(Solution.countDistinct(${q(s)}));`,
    expected: ({ s }: { s: string }) => {
      const set = new Set<string>();
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) set.add(s.slice(i, j));
      return String(set.size);
    },
  },
  {
    slug: 'cp-count-inversions-with-a-fenwick-tree',
    noWrap: true,
    main: (nums: number[]) => `            System.out.println(Inversions.count(${ia(nums)}));`,
    expected: (nums: number[]) => {
      let c = 0;
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] > nums[j]) c++;
      return String(c);
    },
  },
  {
    slug: 'cp-graham-scan-convex-hull',
    main: ({ pts }: { pts: number[][] }) =>
      `            List<int[]> h = new Solution().grahamScan(${ia2(pts)});\n            StringBuilder sb = new StringBuilder("[");\n            for (int[] p : h) { if (sb.length() > 1) sb.append(", "); sb.append("[").append(p[0]).append(", ").append(p[1]).append("]"); }\n            System.out.println(sb.append("]"));`,
    expected: ({ pts }: { pts: number[][] }) => {
      const h = hull(pts);
      // rotate so the pivot (lowest y, then lowest x) comes first
      let s = 0;
      h.forEach((p, i) => { if (p[1] < h[s][1] || (p[1] === h[s][1] && p[0] < h[s][0])) s = i; });
      return fmtPts([...h.slice(s), ...h.slice(0, s)]);
    },
  },
  {
    slug: 'cp-jarvis-march-gift-wrapping',
    main: ({ pts }: { pts: number[][] }) =>
      `            List<int[]> h = new Solution().jarvisMarch(${ia2(pts)});\n            StringBuilder sb = new StringBuilder("[");\n            for (int[] p : h) { if (sb.length() > 1) sb.append(", "); sb.append("[").append(p[0]).append(", ").append(p[1]).append("]"); }\n            System.out.println(sb.append("]"));`,
    expected: ({ pts }: { pts: number[][] }) => fmtPts(hull(pts)), // monotone chain starts at the leftmost (then lowest) point
  },
  {
    slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree',
    noWrap: true,
    main: ({ a, qs }: { a: number[]; qs: { l: number; r: number; k: number }[] }) =>
      `            KthInRange kr = new KthInRange(${ia(a)});\n            List<Object> out = new ArrayList<>();\n${qs.map((x) => `            out.add(kr.kth(${x.l}, ${x.r}, ${x.k}));`).join('\n')}\n            System.out.println(out);`,
    expected: ({ a, qs }: { a: number[]; qs: { l: number; r: number; k: number }[] }) =>
      list(qs.map((x) => a.slice(x.l - 1, x.r).sort((p, q) => p - q)[x.k - 1])),
  },
  {
    slug: 'cp-multi-keyword-search-aho-corasick',
    main: ({ words, text }: { words: string[]; text: string }) =>
      `            List<String> hits = Solution.findAll(${sa(words)}, ${q(text)});\n            System.out.println(hits.size() + " matches: " + hits);`,
    // exact report order (per end position: longest word first) must match the animation's final list
    expected: (_i, steps) => `${parseInt(String(last(steps).result?.title), 10)} matches: ${last(steps).result?.text}`, // the animation says "1 match", the harness line always "matches"
  },
  {
    slug: 'cp-pattern-search-with-a-suffix-array',
    main: ({ s, p }: { s: string; p: string }) => {
      const sa = [...s].map((_, i) => i).sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : 1));
      return `            List<Integer> out = Solution.search(${q(s)}, ${ia(sa)}, ${q(p)});\n            System.out.println(out.size() + " matches at " + out);`;
    },
    expected: ({ s, p }: { s: string; p: string }) => {
      const at: number[] = [];
      for (let i = 0; i + p.length <= s.length; i++) if (s.startsWith(p, i)) at.push(i);
      return `${at.length} matches at ${list(at)}`;
    },
  },
  {
    slug: 'cp-persistent-segment-tree-version-array',
    noWrap: true,
    main: ({ a, ops }: { a: number[]; ops: { k: string; i: number; v?: number; ver?: number }[] }) =>
      `            PersistentArray pa = new PersistentArray(${ia(a)});\n            List<Object> out = new ArrayList<>();\n${ops.map((o) => (o.k === 'set' ? `            pa.set(${o.i}, ${o.v});` : `            out.add(pa.get(${o.ver}, ${o.i}));`)).join('\n')}\n            System.out.println(out);`,
    expected: ({ a, ops }: { a: number[]; ops: { k: string; i: number; v?: number; ver?: number }[] }) => {
      const versions = [[...a]];
      const out: number[] = [];
      for (const o of ops) {
        if (o.k === 'set') { const c = [...versions[versions.length - 1]]; c[o.i] = o.v!; versions.push(c); }
        else out.push(versions[o.ver!][o.i]);
      }
      return list(out);
    },
  },
  {
    slug: 'cp-range-add-and-range-sum-with-blocks',
    noWrap: true,
    main: ({ a, ops }: { a: number[]; ops: { k: string; l: number; r: number; v?: number }[] }) =>
      `            BlockArray ba = new BlockArray(${ia(a)});\n            List<Object> out = new ArrayList<>();\n${ops.map((o) => (o.k === 'add' ? `            ba.add(${o.l}, ${o.r}, ${o.v});` : `            out.add(ba.query(${o.l}, ${o.r}));`)).join('\n')}\n            System.out.println(out);`,
    expected: ({ a, ops }: { a: number[]; ops: { k: string; l: number; r: number; v?: number }[] }) => {
      const arr = [...a];
      const out: number[] = [];
      for (const o of ops) {
        if (o.k === 'add') for (let i = o.l; i <= o.r; i++) arr[i] += o.v!;
        else out.push(arr.slice(o.l, o.r + 1).reduce((x, y) => x + y, 0));
      }
      return list(out);
    },
  },
  {
    slug: 'cp-range-add-range-sum-lazy-propagation',
    noWrap: true,
    main: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) =>
      `            LazySegTree lt = new LazySegTree(${ia(nums)});\n            int n = ${nums.length};\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.name === 'add' ? `            lt.add(1, 0, n - 1, ${o.args[0]}, ${o.args[1]}, ${o.args[2]}); out.add(null);` : `            out.add(lt.query(1, 0, n - 1, ${o.args[0]}, ${o.args[1]}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) => {
      const arr = [...nums];
      const out = ops.map((o) => {
        if (o.name === 'add') { for (let i = o.args[0]; i <= o.args[1]; i++) arr[i] += o.args[2]; return 'null'; }
        return String(arr.slice(o.args[0], o.args[1] + 1).reduce((x, y) => x + y, 0));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: 'cp-range-minimum-query-segment-tree',
    noWrap: true,
    main: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) =>
      `            MinArray ma = new MinArray(${ia(nums)});\n            List<Object> out = new ArrayList<>();\n${ops
        .map((o) => (o.name === 'set' ? `            ma.set(${o.args[0]}, ${o.args[1]}); out.add(null);` : `            out.add(ma.minRange(${o.args[0]}, ${o.args[1]}));`))
        .join('\n')}\n            System.out.println(out);`,
    expected: ({ nums, ops }: { nums: number[]; ops: { name: string; args: number[] }[] }) => {
      const arr = [...nums];
      const out = ops.map((o) => {
        if (o.name === 'set') { arr[o.args[0]] = o.args[1]; return 'null'; }
        return String(Math.min(...arr.slice(o.args[0], o.args[1] + 1)));
      });
      return `[${out.join(', ')}]`;
    },
  },
  {
    slug: 'cp-rotating-calipers-polygon-diameter',
    main: ({ pts }: { pts: number[][] }) => `            System.out.println(new Solution().diameterSquared(${ia2(pts)}));`,
    expected: ({ pts }: { pts: number[][] }) => {
      let best = 0;
      for (const a of pts) for (const b of pts) best = Math.max(best, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
      return String(best);
    },
  },
  {
    slug: 'cp-suffix-array-and-lcp-array',
    main: ({ s }: { s: string }) =>
      `            int[] sa = Solution.suffixArray(${q(s)});\n            System.out.println("SA = " + Arrays.toString(sa) + ", LCP = " + Arrays.toString(Solution.lcpArray(${q(s)}, sa)));`,
    expected: ({ s }: { s: string }) => {
      const sa = [...s].map((_, i) => i).sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : 1));
      const lcp = sa.map((p, k) => {
        if (k === 0) return 0;
        const q2 = sa[k - 1];
        let h = 0;
        while (p + h < s.length && q2 + h < s.length && s[p + h] === s[q2 + h]) h++;
        return h;
      });
      return `SA = ${list(sa)}, LCP = ${list(lcp)}`;
    },
  },
];

function jumpDist(nums: number[]): number {
  const d: number[] = nums.map(() => Infinity);
  d[0] = 0;
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j <= i + nums[i] && j < nums.length; j++) d[j] = Math.min(d[j], d[i] + 1);
  return d[nums.length - 1];
}

/** Strict convex hull (no collinear points), counter-clockwise, starting at the leftmost-lowest point (Andrew's monotone chain). */
function hull(pts: number[][]): number[][] {
  const P = pts.filter((p, i) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (arr: number[][]) => {
    const st: number[][] = [];
    for (const p of arr) { while (st.length >= 2 && cr(st[st.length - 2], st[st.length - 1], p) <= 0) st.pop(); st.push(p); }
    st.pop();
    return st;
  };
  return [...chain(P), ...chain([...P].reverse())];
}
const fmtPts = (a: number[][]): string => `[${a.map((p) => `[${p[0]}, ${p[1]}]`).join(', ')}]`;
