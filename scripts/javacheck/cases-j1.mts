import type { JavaCaseModule } from './types.ts';

/**
 * Java verification, agent J1: batches d1 (windows, two pointers, prefix/hash/Kadane, binary search, misc) and e1 (misc).
 * Every case compiles the Java shown on the code panel, runs it on the declared examples + oracle-generator random inputs and compares one
 * canonical line with an independent TypeScript reference (brute force wherever possible).
 */
const A = (a: number[]): string => `{${a.join(', ')}}`;
const S = (a: number[]): string => `[${a.join(', ')}]`;
const J = (s: string): string => JSON.stringify(s);
const jstrs = (a: string[]): string => `{${a.map(J).join(', ')}}`;

/** Shared Java helpers printed by several cases. */
const HELP = `
class H {
    static String lists(List<List<Integer>> l) {
        List<String> parts = new ArrayList<>();
        for (List<Integer> x : l) { List<Integer> c = new ArrayList<>(x); Collections.sort(c); parts.add(c.toString()); }
        Collections.sort(parts);
        return parts.toString();
    }
    static String strLists(List<List<String>> l) {
        List<String> parts = new ArrayList<>();
        for (List<String> x : l) { List<String> c = new ArrayList<>(x); Collections.sort(c); parts.add(c.toString()); }
        Collections.sort(parts);
        return parts.toString();
    }
    static String sortedInts(List<Integer> l) { List<Integer> c = new ArrayList<>(l); Collections.sort(c); return c.toString(); }
}
`;

const cases: JavaCaseModule['cases'] = [
  // ---- batch d1 ----
  {
    slug: '1-two-sum',
    main: ({ nums, target }: any) => `            int[] nums = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().twoSum(nums, ${target})));`,
    expected: ({ nums, target }: any) => {
      const seen = new Map<number, number>();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return S([seen.get(target - nums[i])!, i]);
        seen.set(nums[i], i);
      }
      return '[]';
    },
  },
  {
    slug: '1011-capacity-to-ship-packages',
    main: ({ nums, k }: any) => `            int[] w = ${A(nums)};\n            System.out.println(new Solution().shipWithinDays(w, ${k}));`,
    expected: ({ nums, k }: any) => {
      for (let cap = Math.max(...nums); ; cap++) {
        let d = 1, load = 0;
        for (const w of nums) { if (load + w > cap) { d++; load = 0; } load += w; }
        if (d <= k) return String(cap);
      }
    },
  },
  {
    slug: '11-container-with-most-water',
    main: ({ height }: any) => `            int[] h = ${A(height)};\n            System.out.println(new Solution().maxArea(h));`,
    expected: ({ height }: any) => {
      let b = 0;
      for (let i = 0; i < height.length; i++) for (let j = i + 1; j < height.length; j++) b = Math.max(b, Math.min(height[i], height[j]) * (j - i));
      return String(b);
    },
  },
  {
    slug: '121-best-time-to-buy-and-sell-stock',
    main: ({ prices }: any) => `            int[] p = ${A(prices)};\n            System.out.println(new Solution().maxProfit(p));`,
    expected: ({ prices }: any) => {
      let b = 0;
      for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) b = Math.max(b, prices[j] - prices[i]);
      return String(b);
    },
  },
  {
    slug: '128-longest-consecutive-sequence',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().longestConsecutive(n));`,
    expected: ({ nums }: any) => {
      const s = new Set<number>(nums);
      let b = 0;
      for (const x of s) { let l = 1; while (s.has(x + l)) l++; if (!s.has(x - 1)) b = Math.max(b, l); }
      return String(b);
    },
  },
  {
    slug: '1438-longest-continuous-subarray-with-abs-diff-limit',
    main: ({ nums, limit }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().longestSubarray(n, ${limit}));`,
    expected: ({ nums, limit }: any) => {
      let b = 0;
      for (let i = 0; i < nums.length; i++) { let mx = -Infinity, mn = Infinity; for (let j = i; j < nums.length; j++) { mx = Math.max(mx, nums[j]); mn = Math.min(mn, nums[j]); if (mx - mn <= limit) b = Math.max(b, j - i + 1); } }
      return String(b);
    },
    notes: 'maxQ.peekFirst() == nums[l] compares Integer with int (unboxes) so it is fine.',
  },
  {
    slug: '1480-running-sum-of-1d-array',
    main: ({ nums, l, r }: any) =>
      `            int[] n = ${A(nums)};\n            int[] rs = new Solution().runningSum(n);\n            String extra = "";\n` +
      (l !== undefined && r !== undefined ? `            int[] pre = new int[rs.length + 1]; System.arraycopy(rs, 0, pre, 1, rs.length);\n            extra = " " + Solution.rangeSum(pre, ${l}, ${r});\n` : '') +
      `            System.out.println(Arrays.toString(rs) + extra);`,
    expected: ({ nums, l, r }: any) => {
      const rs: number[] = [];
      let s = 0;
      for (const x of nums) { s += x; rs.push(s); }
      let e = '';
      if (l !== undefined && r !== undefined) { let t = 0; for (let i = l; i <= r; i++) t += nums[i]; e = ' ' + t; }
      return S(rs) + e;
    },
  },
  {
    slug: '15-3sum',
    extra: HELP,
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(H.lists(new Solution().threeSum(n)));`,
    expected: ({ nums }: any) => {
      const set = new Set<string>();
      const n = nums.length;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) if (nums[i] + nums[j] + nums[k] === 0) set.add(S([nums[i], nums[j], nums[k]].sort((a, b) => a - b)));
      return `[${[...set].sort().join(', ')}]`;
    },
    notes: 'inner triples and the outer list are sorted before printing (order of triplets is free in LC 15).',
  },
  {
    slug: '152-maximum-product-subarray',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().maxProduct(n));`,
    expected: ({ nums }: any) => {
      let b = -Infinity;
      for (let i = 0; i < nums.length; i++) { let p = 1; for (let j = i; j < nums.length; j++) { p *= nums[j]; b = Math.max(b, p); } }
      return String(b);
    },
  },
];

const title = (steps: any[]): string => String(steps[steps.length - 1].result.title);

cases.push(
  {
    slug: '16-3sum-closest',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().threeSumClosest(n, ${target}));`,
    expected: ({ nums, target }: any, steps: any) => {
      // two sums equally close to the target are possible: accept the animation's value only if it is really a closest sum
      let d = Infinity;
      const n = nums.length;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) d = Math.min(d, Math.abs(nums[i] + nums[j] + nums[k] - target));
      const t = Number(title(steps));
      return Math.abs(t - target) === d ? String(t) : `animation answer ${t} is not closest (distance ${d})`;
    },
    notes: 'ties between two equally close sums resolve like the animation (same algorithm); the animation value is validated against brute force',
  },
  {
    slug: '162-find-peak-element',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().findPeakElement(n));`,
    expected: ({ nums }: any, steps: any) => {
      const i = Number(title(steps));
      const plateau = nums.some((x: number, j: number) => j > 0 && x === nums[j - 1]); // LC 162 forbids adjacent equal values; the oracle generator may produce them
      const ok = plateau || ((nums[i - 1] ?? -Infinity) < nums[i] && nums[i] > (nums[i + 1] ?? -Infinity));
      return ok ? String(i) : `animation index ${i} is not a peak`;
    },
    notes: 'several peaks may exist: the Java index is compared with the animation (same binary search), which is validated to be a peak',
  },
  {
    slug: '167-two-sum-ii',
    main: ({ numbers, target }: any) => `            int[] n = ${A(numbers)};\n            System.out.println(Arrays.toString(new Solution().twoSum(n, ${target})));`,
    expected: ({ numbers, target }: any, steps: any) => {
      const t = title(steps);
      const [a, b] = JSON.parse(t) as number[];
      return a < b && numbers[a - 1] + numbers[b - 1] === target ? t : `animation pair ${t} does not sum to ${target}`;
    },
    notes: 'if several pairs exist the two-pointer pair is compared with the animation (same algorithm), validated to sum to the target',
  },
  {
    slug: '169-majority-element',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().majorityElement(n));`,
    expected: ({ nums }: any, steps: any) => {
      const c = new Map<number, number>();
      for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
      for (const [k, v] of c) if (v > nums.length / 2) return String(k);
      return title(steps); // no majority: Boyer-Moore result is whatever the algorithm yields
    },
  },
  {
    slug: '1696-jump-game-vi',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().maxResult(n, ${k}));`,
    expected: ({ nums, k }: any) => {
      const dp: number[] = [nums[0]];
      for (let i = 1; i < nums.length; i++) { let b = -Infinity; for (let j = Math.max(0, i - k); j < i; j++) b = Math.max(b, dp[j]); dp.push(nums[i] + b); }
      return String(dp[nums.length - 1]);
    },
  },
  {
    slug: '209-minimum-size-subarray-sum',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().minSubArrayLen(${target}, n));`,
    expected: ({ nums, target }: any) => {
      let b = 0;
      for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s >= target) { if (b === 0 || j - i + 1 < b) b = j - i + 1; break; } } }
      return String(b);
    },
  },
  {
    slug: '229-majority-element-ii',
    extra: HELP,
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(H.sortedInts(new Solution().majorityElement(n)));`,
    expected: ({ nums }: any) => {
      const c = new Map<number, number>();
      for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
      return S([...c].filter(([, v]) => v > Math.floor(nums.length / 3)).map(([k]) => k).sort((a, b) => a - b));
    },
  },
  {
    slug: '238-product-of-array-except-self',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().productExceptSelf(n)));`,
    expected: ({ nums }: any) => S(nums.map((_: number, i: number) => nums.reduce((p: number, x: number, j: number) => (j === i ? p : p * x), 1))),
  },
  {
    slug: '239-sliding-window-maximum',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().maxSlidingWindow(n, ${k})));`,
    expected: ({ nums, k }: any) => {
      const r: number[] = [];
      for (let i = 0; i + k <= nums.length; i++) r.push(Math.max(...nums.slice(i, i + k)));
      return S(r);
    },
  },
);

cases.push(
  {
    slug: '26-remove-duplicates-from-sorted-array',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            int k = new Solution().removeDuplicates(n);\n            System.out.println(k + " " + Arrays.toString(Arrays.copyOf(n, k)));`,
    expected: ({ nums }: any) => { const u = [...new Set<number>(nums)]; return `${u.length} ${S(u)}`; },
  },
  {
    slug: '3-longest-substring-without-repeating-characters',
    main: ({ s }: any) => `            System.out.println(new Solution().lengthOfLongestSubstring(${J(s)}));`,
    expected: ({ s }: any) => {
      let b = 0;
      for (let i = 0; i < s.length; i++) { const seen = new Set<string>(); for (let j = i; j < s.length; j++) { if (seen.has(s[j])) break; seen.add(s[j]); b = Math.max(b, j - i + 1); } }
      return String(b);
    },
  },
  {
    slug: '33-search-in-rotated-sorted-array',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().search(n, ${target}));`,
    expected: ({ nums, target }: any) => String(nums.indexOf(target)),
  },
  {
    slug: '34-find-first-and-last-position',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().searchRange(n, ${target})));`,
    expected: ({ nums, target }: any) => S([nums.indexOf(target), nums.lastIndexOf(target)]),
  },
  {
    slug: '35-search-insert-position',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().searchInsert(n, ${target}));`,
    expected: ({ nums, target }: any) => { let i = 0; while (i < nums.length && nums[i] < target) i++; return String(i); },
    notes: 'assumes distinct values (LC 35); with duplicates any equal index is valid',
  },
  {
    slug: '41-first-missing-positive',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().firstMissingPositive(n));`,
    expected: ({ nums }: any) => { const s = new Set<number>(nums); let i = 1; while (s.has(i)) i++; return String(i); },
  },
  {
    slug: '410-split-array-largest-sum',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().splitArray(n, ${k}));`,
    expected: ({ nums, k }: any) => {
      const n = nums.length;
      const pre = [0]; for (const x of nums) pre.push(pre[pre.length - 1] + x);
      // dp[j][i] = min over splits of the largest sum of the first i items in j parts
      let dp: number[] = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? Infinity : pre[i]));
      dp[0] = 0;
      for (let j = 2; j <= k; j++) {
        const nd: number[] = Array(n + 1).fill(Infinity);
        for (let i = j; i <= n; i++) for (let t = j - 1; t < i; t++) nd[i] = Math.min(nd[i], Math.max(dp[t], pre[i] - pre[t]));
        dp = nd;
      }
      return String(dp[n]);
    },
  },
  {
    slug: '42-trapping-rain-water',
    main: ({ height }: any) => `            int[] h = ${A(height)};\n            System.out.println(new Solution().trap(h));`,
    expected: ({ height }: any) => {
      let w = 0;
      for (let i = 0; i < height.length; i++) w += Math.min(Math.max(...height.slice(0, i + 1)), Math.max(...height.slice(i))) - height[i];
      return String(w);
    },
  },
  {
    slug: '424-longest-repeating-character-replacement',
    main: ({ s, k }: any) => `            System.out.println(new Solution().characterReplacement(${J(s)}, ${k}));`,
    expected: ({ s, k }: any) => {
      let b = 0;
      for (let i = 0; i < s.length; i++) { const c: Record<string, number> = {}; let mx = 0; for (let j = i; j < s.length; j++) { c[s[j]] = (c[s[j]] ?? 0) + 1; mx = Math.max(mx, c[s[j]]); if (j - i + 1 - mx <= k) b = Math.max(b, j - i + 1); } }
      return String(b);
    },
  },
);

cases.push(
  {
    slug: '442-find-all-duplicates-in-an-array',
    extra: HELP,
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(H.sortedInts(new Solution().findDuplicates(n)));`,
    expected: ({ nums }: any) => { const c = new Map<number, number>(); for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1); return S([...c].filter(([, v]) => v === 2).map(([k]) => k).sort((a, b) => a - b)); },
  },
  {
    slug: '49-group-anagrams',
    extra: HELP,
    main: ({ words }: any) => `            String[] w = ${jstrs(words)};\n            System.out.println(H.strLists(new Solution().groupAnagrams(w)));`,
    expected: ({ words }: any) => {
      const g = new Map<string, string[]>();
      for (const w of words) { const k = [...w].sort().join(''); g.set(k, [...(g.get(k) ?? []), w]); }
      return `[${[...g.values()].map((x) => `[${[...x].sort().join(', ')}]`).sort().join(', ')}]`;
    },
    notes: 'groups and members are sorted before printing (LC 49 allows any order)',
  },
  {
    slug: '53-maximum-subarray',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().maxSubArray(n));`,
    expected: ({ nums }: any) => { let b = -Infinity; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; b = Math.max(b, s); } } return String(b); },
  },
  {
    slug: '540-single-element-in-a-sorted-array',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().singleNonDuplicate(n));`,
    expected: ({ nums }: any) => { const c = new Map<number, number>(); for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1); return String([...c].find(([, v]) => v === 1)![0]); },
  },
  {
    slug: '560-subarray-sum-equals-k',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().subarraySum(n, ${k}));`,
    expected: ({ nums, k }: any) => { let c = 0; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) c++; } } return String(c); },
  },
  {
    slug: '567-permutation-in-string',
    main: ({ p, s }: any) => `            System.out.println(new Solution().checkInclusion(${J(p)}, ${J(s)}));`,
    expected: ({ p, s }: any) => {
      const key = (t: string): string => [...t].sort().join('');
      for (let i = 0; i + p.length <= s.length; i++) if (key(s.slice(i, i + p.length)) === key(p)) return 'true';
      return 'false';
    },
  },
  {
    slug: '611-valid-triangle-number',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().triangleNumber(n));`,
    expected: ({ nums }: any) => { let c = 0; const n = nums.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) { const [a, b, d] = [nums[i], nums[j], nums[k]].sort((x, y) => x - y); if (a + b > d) c++; } return String(c); },
  },
  {
    slug: '658-find-k-closest-elements',
    main: ({ arr, k, x }: any) => `            int[] a = ${A(arr)};\n            System.out.println(new Solution().findClosestElements(a, ${k}, ${x}));`,
    expected: ({ arr, k, x }: any) => S([...arr].sort((a: number, b: number) => Math.abs(a - x) - Math.abs(b - x) || a - b).slice(0, k).sort((a: number, b: number) => a - b)),
  },
  {
    slug: '704-binary-search',
    main: ({ nums, target }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().search(n, ${target}));`,
    expected: ({ nums, target }: any) => String(nums.indexOf(target)),
  },
);

cases.push(
  {
    slug: '74-search-a-2d-matrix',
    main: ({ m, target }: any) => `            int[][] m = {${m.map((r: number[]) => A(r)).join(', ')}};\n            System.out.println(new Solution().searchMatrix(m, ${target}));`,
    expected: ({ m, target }: any) => String(m.some((r: number[]) => r.includes(target))),
  },
  {
    slug: '75-sort-colors',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            new Solution().sortColors(n);\n            System.out.println(Arrays.toString(n));`,
    expected: ({ nums }: any) => S([...nums].sort((a: number, b: number) => a - b)),
  },
  {
    slug: '862-shortest-subarray-with-sum-at-least-k',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().shortestSubarray(n, ${k}));`,
    expected: ({ nums, k }: any) => {
      let b = Infinity;
      for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s >= k) { b = Math.min(b, j - i + 1); break; } } }
      return String(b === Infinity ? -1 : b);
    },
  },
  {
    slug: '875-koko-eating-bananas',
    main: ({ piles, h }: any) => `            int[] p = ${A(piles)};\n            System.out.println(new Solution().minEatingSpeed(p, ${h}));`,
    expected: ({ piles, h }: any) => { for (let s = 1; ; s++) if (piles.reduce((t: number, p: number) => t + Math.ceil(p / s), 0) <= h) return String(s); },
  },
  {
    slug: '88-merge-sorted-array',
    main: ({ nums1, nums2 }: any) =>
      `            int[] a = ${A([...nums1, ...nums2.map(() => 0)])};\n            int[] b = ${A(nums2)};\n            new Solution().merge(a, ${nums1.length}, b, ${nums2.length});\n            System.out.println(Arrays.toString(a));`,
    expected: ({ nums1, nums2 }: any) => S([...nums1, ...nums2].sort((a: number, b: number) => a - b)),
  },
  {
    slug: 'cp-cyclic-sort',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            new Solution().cyclicSort(n);\n            System.out.println(Arrays.toString(n));`,
    expected: ({ nums }: any) => S([...nums].sort((a: number, b: number) => a - b)),
  },
  {
    slug: 'cp-majority-element-with-verification',
    main: ({ nums }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().majority(n));`,
    expected: ({ nums }: any) => { for (const x of nums) if (nums.filter((y: number) => y === x).length > nums.length / 2) return String(x); return '-1'; },
  },
);

/** Binary tree helpers shared by the tree problems (LeetCode level-order tokens, null children have no children). */
const TREE = `
class TreeNode {
    int val; TreeNode left, right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
class TB {
    static TreeNode build(Integer[] t) {
        if (t.length == 0 || t[0] == null) return null;
        TreeNode root = new TreeNode(t[0]);
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < t.length) {
            TreeNode n = q.poll();
            if (i < t.length) { Integer v = t[i++]; if (v != null) { n.left = new TreeNode(v); q.add(n.left); } }
            if (i < t.length) { Integer v = t[i++]; if (v != null) { n.right = new TreeNode(v); q.add(n.right); } }
        }
        return root;
    }
    static String pre(TreeNode n) { return n == null ? "#" : n.val + "(" + pre(n.left) + "," + pre(n.right) + ")"; }
    static TreeNode find(TreeNode n, int v) { if (n == null) return null; if (n.val == v) return n; TreeNode a = find(n.left, v); return a != null ? a : find(n.right, v); }
}
`;
const T = (tokens: (number | null)[]): string => `Integer[] t = {${tokens.map((x) => (x === null ? 'null' : x)).join(', ')}};\n            TreeNode root = TB.build(t);`;
interface TN { v: number; l: TN | null; r: TN | null }
const tsTree = (tokens: (number | null)[]): TN | null => {
  if (!tokens.length || tokens[0] === null) return null;
  const root: TN = { v: tokens[0], l: null, r: null };
  const q = [root];
  let i = 1;
  while (q.length && i < tokens.length) {
    const n = q.shift()!;
    if (i < tokens.length) { const v = tokens[i++]; if (v !== null) { n.l = { v, l: null, r: null }; q.push(n.l); } }
    if (i < tokens.length) { const v = tokens[i++]; if (v !== null) { n.r = { v, l: null, r: null }; q.push(n.r); } }
  }
  return root;
};
const tsPre = (n: TN | null): string => (n === null ? '#' : `${n.v}(${tsPre(n.l)},${tsPre(n.r)})`);

cases.push(
  // ---- batch e1 ----
  {
    slug: '1004-max-consecutive-ones-iii',
    main: ({ nums, k }: any) => `            int[] n = ${A(nums)};\n            System.out.println(new Solution().longestOnes(n, ${k}));`,
    expected: ({ nums, k }: any) => { let b = 0; for (let i = 0; i < nums.length; i++) { let z = 0; for (let j = i; j < nums.length; j++) { if (nums[j] === 0) z++; if (z <= k) b = Math.max(b, j - i + 1); } } return String(b); },
  },
  {
    slug: '1046-last-stone-weight',
    main: ({ stones }: any) => `            int[] s = ${A(stones)};\n            System.out.println(new Solution().lastStoneWeight(s));`,
    expected: ({ stones }: any) => {
      const a = [...stones];
      while (a.length > 1) { a.sort((x: number, y: number) => y - x); const y = a.shift()!, x = a.shift()!; if (y !== x) a.push(y - x); }
      return String(a.length ? a[0] : 0);
    },
  },
  {
    slug: '110-balanced-binary-tree',
    extra: TREE,
    main: ({ tokens }: any) => `            ${T(tokens)}\n            System.out.println(new Solution().isBalanced(root));`,
    expected: ({ tokens }: any) => {
      const h = (n: TN | null): number => (n === null ? 0 : 1 + Math.max(h(n.l), h(n.r)));
      const ok = (n: TN | null): boolean => n === null || (Math.abs(h(n.l) - h(n.r)) <= 1 && ok(n.l) && ok(n.r));
      return String(ok(tsTree(tokens)));
    },
  },
  {
    slug: '112-path-sum',
    extra: TREE,
    main: ({ tokens, target }: any) => `            ${T(tokens)}\n            System.out.println(new Solution().hasPathSum(root, ${target}));`,
    expected: ({ tokens, target }: any) => {
      const go = (n: TN | null, rest: number): boolean => (n === null ? false : !n.l && !n.r ? rest === n.v : go(n.l, rest - n.v) || go(n.r, rest - n.v));
      return String(go(tsTree(tokens), target));
    },
  },
  {
    slug: '114-flatten-binary-tree-to-linked-list',
    extra: TREE,
    main: ({ tokens }: any) =>
      `            ${T(tokens)}\n            new Solution().flatten(root);\n            StringBuilder sb = new StringBuilder("[");\n            for (TreeNode c = root; c != null; c = c.right) { if (c.left != null) sb.append("LEFT!"); sb.append(c.val); if (c.right != null) sb.append(", "); }\n            System.out.println(sb.append("]"));`,
    expected: ({ tokens }: any) => { const out: number[] = []; const go = (n: TN | null): void => { if (!n) return; out.push(n.v); go(n.l); go(n.r); }; go(tsTree(tokens)); return S(out); },
  },
  {
    slug: '1189-maximum-number-of-balloons',
    main: ({ text }: any) => `            System.out.println(new Solution().maxNumberOfBalloons(${J(text)}));`,
    expected: ({ text }: any) => { const c = (ch: string): number => [...text].filter((x) => x === ch).length; return String(Math.min(c('b'), c('a'), Math.floor(c('l') / 2), Math.floor(c('o') / 2), c('n'))); },
  },
  {
    slug: '125-valid-palindrome',
    main: ({ s }: any) => `            System.out.println(new Solution().isPalindrome(${J(s)}));`,
    expected: ({ s }: any) => { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return String(t === [...t].reverse().join('')); },
  },
  {
    slug: '13-roman-to-integer',
    main: ({ s }: any) => `            System.out.println(new Solution().romanToInt(${J(s)}));`,
    expected: ({ s }: any) => {
      const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let t = 0;
      for (let i = 0; i < s.length; i++) t += i + 1 < s.length && v[s[i]] < v[s[i + 1]] ? -v[s[i]] : v[s[i]];
      return String(t);
    },
  },
);

const LIST = `
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
class LB {
    static ListNode build(int[] v) { ListNode d = new ListNode(0), c = d; for (int x : v) { c.next = new ListNode(x); c = c.next; } return d.next; }
    static String str(ListNode h) { List<Integer> o = new ArrayList<>(); int guard = 0; while (h != null && guard++ < 10000) { o.add(h.val); h = h.next; } return o.toString(); }
}
`;

cases.push(
  {
    slug: '133-clone-graph',
    extra: `
class Node {
    public int val; public List<Node> neighbors;
    public Node() { val = 0; neighbors = new ArrayList<Node>(); }
    public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); }
}
class GB {
    static String run(Solution s, int n, int[][] edges) {
        Node[] orig = new Node[n + 1];
        for (int i = 1; i <= n; i++) orig[i] = new Node(i);
        List<TreeSet<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new TreeSet<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        for (int i = 1; i <= n; i++) for (int v : adj.get(i)) orig[i].neighbors.add(orig[v]);
        Node c = s.cloneGraph(orig[1]);
        Map<Integer, Node> seen = new TreeMap<>();
        Deque<Node> q = new ArrayDeque<>();
        q.add(c); seen.put(c.val, c);
        while (!q.isEmpty()) { Node x = q.poll(); for (Node y : x.neighbors) if (!seen.containsKey(y.val)) { seen.put(y.val, y); q.add(y); } }
        List<String> out = new ArrayList<>();
        for (Node x : seen.values()) {
            if (x == orig[x.val]) return "SHARED NODE " + x.val;
            List<Integer> nb = new ArrayList<>();
            for (Node y : x.neighbors) { if (y == orig[y.val]) return "SHARED NEIGHBOR " + y.val; if (seen.get(y.val) != y) return "DUPLICATE COPY " + y.val; nb.add(y.val); }
            Collections.sort(nb);
            out.add(nb.toString());
        }
        return out.toString();
    }
}
`,
    main: ({ n, edges }: any) => `            int[][] e = {${edges.map((x: any) => `{${x.u}, ${x.v}}`).join(', ')}};\n            System.out.println(GB.run(new Solution(), ${n}, e));`,
    expected: ({ n, edges }: any) => {
      const adj: Set<number>[] = Array.from({ length: n + 1 }, () => new Set<number>());
      for (const { u, v } of edges) { adj[u].add(v); adj[v].add(u); }
      const seen = new Set<number>([1]);
      const q = [1];
      while (q.length) { const x = q.shift()!; for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); q.push(y); } }
      return `[${[...seen].sort((a, b) => a - b).map((x) => S([...adj[x]].sort((a, b) => a - b))).join(', ')}]`;
    },
    notes: 'prints the adjacency list of the clone reachable from node 1 (sorted), and fails if any clone node is an original or duplicated',
  },
  {
    slug: '135-candy',
    main: ({ ratings }: any) => `            int[] r = ${A(ratings)};\n            System.out.println(new Solution().candy(r));`,
    expected: ({ ratings }: any) => {
      const c: number[] = ratings.map(() => 1);
      for (let ch = true; ch; ) { ch = false; for (let i = 0; i < c.length; i++) { if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; ch = true; } if (i + 1 < c.length && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; ch = true; } } }
      return String(c.reduce((a: number, b: number) => a + b, 0));
    },
  },
  {
    slug: '138-copy-list-with-random-pointer',
    extra: `
class Node {
    int val; Node next, random;
    public Node(int val) { this.val = val; }
}
class RB {
    static String run(Solution s, int[] vals, int[] rnd) {
        int n = vals.length;
        Node[] o = new Node[n];
        for (int i = 0; i < n; i++) o[i] = new Node(vals[i]);
        for (int i = 0; i < n; i++) { if (i + 1 < n) o[i].next = o[i + 1]; if (rnd[i] >= 0) o[i].random = o[rnd[i]]; }
        Node c = s.copyRandomList(n == 0 ? null : o[0]);
        IdentityHashMap<Node, Integer> pos = new IdentityHashMap<>();
        int k = 0;
        for (Node p = c; p != null && k < 1000; p = p.next) pos.put(p, k++);
        List<String> out = new ArrayList<>();
        for (Node p = c; p != null; p = p.next) {
            for (Node x : o) if (x == p || x == p.random) return "SHARED ORIGINAL NODE";
            out.add(p.val + ":" + (p.random == null ? -1 : pos.getOrDefault(p.random, -99)));
        }
        return out.toString();
    }
}
`,
    main: ({ vals, random }: any) => `            int[] v = ${A(vals)};\n            int[] r = ${A(random.map((x: number | null) => (x === null ? -1 : x)))};\n            System.out.println(RB.run(new Solution(), v, r));`,
    expected: ({ vals, random }: any) => `[${vals.map((v: number, i: number) => `${v}:${random[i] === null ? -1 : random[i]}`).join(', ')}]`,
  },
  {
    slug: '139-word-break',
    main: ({ s, words }: any) => `            List<String> d = Arrays.asList(${words.map(J).join(', ')});\n            System.out.println(new Solution().wordBreak(${J(s)}, d));`,
    expected: ({ s, words }: any) => {
      const memo = new Map<number, boolean>();
      const go = (i: number): boolean => { if (i === s.length) return true; if (memo.has(i)) return memo.get(i)!; const r = words.some((w: string) => w.length > 0 && s.startsWith(w, i) && go(i + w.length)); memo.set(i, r); return r; };
      return String(go(0));
    },
  },
  {
    slug: '14-longest-common-prefix',
    main: ({ words }: any) => `            String[] w = ${jstrs(words)};\n            System.out.println("[" + new Solution().longestCommonPrefix(w) + "]");`,
    expected: ({ words }: any) => { let p = words[0]; for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1); return `[${p}]`; },
  },
  {
    slug: '143-reorder-list',
    extra: LIST,
    main: ({ vals }: any) => `            ListNode h = LB.build(new int[]${A(vals)});\n            new Solution().reorderList(h);\n            System.out.println(LB.str(h));`,
    expected: ({ vals }: any) => { const r: number[] = []; let i = 0, j = vals.length - 1; while (i <= j) { r.push(vals[i++]); if (i <= j) r.push(vals[j--]); } return S(r); },
  },
  {
    slug: '1470-shuffle-the-array',
    main: ({ nums, n }: any) => `            int[] a = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().shuffle(a, ${n})));`,
    expected: ({ nums, n }: any) => { const r: number[] = []; for (let i = 0; i < n; i++) r.push(nums[i], nums[i + n]); return S(r); },
  },
  {
    slug: '153-find-minimum-in-rotated-sorted-array',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(new Solution().findMin(a));`,
    expected: ({ nums }: any) => String(Math.min(...nums)),
  },
);

cases.push(
  {
    slug: '1672-richest-customer-wealth',
    main: ({ accounts }: any) => `            int[][] a = {${accounts.map((r: number[]) => A(r)).join(', ')}};\n            System.out.println(new Solution().maximumWealth(a));`,
    expected: ({ accounts }: any) => String(Math.max(...accounts.map((r: number[]) => r.reduce((x, y) => x + y, 0)))),
  },
  {
    slug: '189-rotate-array',
    main: ({ nums, k }: any) => `            int[] a = ${A(nums)};\n            new Solution().rotate(a, ${k});\n            System.out.println(Arrays.toString(a));`,
    expected: ({ nums, k }: any) => { const n = nums.length; const r = nums.map((_: number, i: number) => nums[(((i - k) % n) + n) % n]); return S(r); },
  },
  {
    slug: '1929-concatenation-of-array',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(Arrays.toString(new Solution().getConcatenation(a)));`,
    expected: ({ nums }: any) => S([...nums, ...nums]),
  },
  {
    slug: '202-happy-number',
    main: ({ n }: any) => `            System.out.println(new Solution().isHappy(${n}));`,
    expected: ({ n }: any) => {
      const seen = new Set<number>();
      let x = n;
      while (x !== 1 && !seen.has(x)) { seen.add(x); x = [...String(x)].reduce((s, d) => s + Number(d) ** 2, 0); }
      return String(x === 1);
    },
  },
  {
    slug: '205-isomorphic-strings',
    main: ({ s, t }: any) => `            System.out.println(new Solution().isIsomorphic(${J(s)}, ${J(t)}));`,
    expected: ({ s, t }: any) => {
      const pat = (x: string): string => { const m = new Map<string, number>(); return [...x].map((c) => { if (!m.has(c)) m.set(c, m.size); return m.get(c); }).join(','); };
      return String(s.length === t.length && pat(s) === pat(t));
    },
  },
  {
    slug: '213-house-robber-ii',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(new Solution().rob(a));`,
    expected: ({ nums }: any) => {
      const n = nums.length;
      if (n > 20) throw new Error('too long for brute force');
      let best = 0;
      for (let m = 0; m < 1 << n; m++) {
        let ok = true, s = 0;
        for (let i = 0; i < n && ok; i++) if (m >> i & 1) { s += nums[i]; if (m >> ((i + 1) % n) & 1 && n > 1) ok = false; }
        if (ok) best = Math.max(best, s);
      }
      return String(n === 1 ? nums[0] : best);
    },
    notes: 'brute force over all non-adjacent circular subsets (n <= 20)',
  },
  {
    slug: '217-contains-duplicate',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(new Solution().containsDuplicate(a));`,
    expected: ({ nums }: any) => String(new Set(nums).size !== nums.length),
  },
  {
    slug: '2239-find-closest-number-to-zero',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(new Solution().findClosestNumber(a));`,
    expected: ({ nums }: any) => String([...nums].sort((a: number, b: number) => Math.abs(a) - Math.abs(b) || b - a)[0]),
  },
  {
    slug: '226-invert-binary-tree',
    extra: TREE,
    main: ({ tokens }: any) => `            ${T(tokens)}\n            System.out.println(TB.pre(new Solution().invertTree(root)));`,
    expected: ({ tokens }: any) => { const inv = (n: TN | null): TN | null => (n === null ? null : { v: n.v, l: inv(n.r), r: inv(n.l) }); return tsPre(inv(tsTree(tokens))); },
  },
  {
    slug: '236-lowest-common-ancestor',
    extra: TREE,
    main: ({ tokens, p, q }: any) => `            ${T(tokens)}\n            TreeNode lca = new Solution().lowestCommonAncestor(root, TB.find(root, ${p}), TB.find(root, ${q}));\n            System.out.println(lca == null ? "null" : String.valueOf(lca.val));`,
    expected: ({ tokens, p, q }: any) => {
      const root = tsTree(tokens);
      const path = (n: TN | null, v: number, acc: TN[]): TN[] | null => { if (!n) return null; const a = [...acc, n]; if (n.v === v) return a; return path(n.l, v, a) ?? path(n.r, v, a); };
      const a = path(root, p, []), b = path(root, q, []);
      if (!a || !b) return 'null';
      let r = a[0];
      for (let i = 0; i < Math.min(a.length, b.length) && a[i] === b[i]; i++) r = a[i];
      return String(r.v);
    },
    notes: 'p and q are looked up by value (first in preorder); values are expected to be distinct',
  },
  {
    slug: '240-search-a-2d-matrix-ii',
    main: ({ m, target }: any) => `            int[][] m = {${m.map((r: number[]) => A(r)).join(', ')}};\n            System.out.println(new Solution().searchMatrix(m, ${target}));`,
    expected: ({ m, target }: any) => String(m.some((r: number[]) => r.includes(target))),
  },
  {
    slug: '242-valid-anagram',
    main: ({ s, t }: any) => `            System.out.println(new Solution().isAnagram(${J(s)}, ${J(t)}));`,
    expected: ({ s, t }: any) => String([...s].sort().join('') === [...t].sort().join('')),
  },
  {
    slug: '268-missing-number',
    main: ({ nums }: any) => `            int[] a = ${A(nums)};\n            System.out.println(new Solution().missingNumber(a));`,
    expected: ({ nums }: any) => { for (let i = 0; ; i++) if (!nums.includes(i)) return String(i); },
  },
  {
    slug: '271-encode-and-decode-strings',
    main: ({ words }: any) => `            List<String> w = Arrays.asList(${words.map(J).join(', ')});\n            Solution s = new Solution();\n            String enc = s.encode(w);\n            System.out.println((enc + " | " + s.decode(enc) + " | " + s.decode(enc).equals(w)).replace('#', '@'));`,
    // '#' is printed as '@' because the runner splits stdout on "###<n>" markers
    expected: ({ words }: any) => `${words.map((w: string) => `${w.length}#${w}`).join('')} | [${words.join(', ')}] | true`.replace(/#/g, '@'),
  },
);

// ---- CHUNK-MARKER ----
export { cases };
