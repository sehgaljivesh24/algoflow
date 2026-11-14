import type { JavaCaseModule } from './types.ts';
import type { Step } from '../../src/engine/types.ts';

/**
 * Java checks, agent J2: stacks, linked lists, trees/BST/Morris/construction, LRU/LFU caches + miscellaneous (sorts, strings, sudoku, partitions).
 * The Java shown on the code panel is compiled and run; the printed line is compared with the animation's final answer
 * (fuzz-verified) or with an independent reference written here.
 */

// ---------------------------------------------------------------- helpers
const lastTitle = (steps: Step[]): string => steps[steps.length - 1].result?.title ?? '';
const ints = (t: string): number[] => (t.match(/-?\d+/g) ?? []).map(Number);
/** canonical int list "[1, 2, 3]" from a result title such as "[1,2,3]" */
const intList = (t: string): string => `[${ints(t).join(', ')}]`;
const lst = (a: (number | string)[]): string => `[${a.join(', ')}]`;
/** Java int[] initializer literal */
const ja = (a: number[]): string => `{${a.join(', ')}}`;
const js = (s: string): string => JSON.stringify(s);

/** ListNode + helpers (build from int[], optional cycle back to index pos, canonical "[1, 2, 3]" print). */
const LIST_EXTRA = `
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
class LH {
    static ListNode build(int[] a) {
        ListNode d = new ListNode(0), t = d;
        for (int x : a) { t.next = new ListNode(x); t = t.next; }
        return d.next;
    }
    static ListNode buildCycle(int[] a, int pos) {
        ListNode h = build(a);
        if (pos < 0 || h == null) return h;
        ListNode target = h, t = h;
        for (int i = 0; i < pos; i++) target = target.next;
        while (t.next != null) t = t.next;
        t.next = target;
        return h;
    }
    static int indexOf(ListNode head, ListNode node, int n) {
        if (node == null) return -1;
        ListNode c = head;
        for (int i = 0; i < n && c != null; i++, c = c.next) if (c == node) return i;
        return -2;
    }
    static String str(ListNode h) {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; h != null && i < 10000; i++, h = h.next) out.add(h.val);
        return out.toString();
    }
}
`;
/** TreeNode + helpers: build from LeetCode level-order tokens (Integer[] with nulls), print level-order tokens with trailing nulls trimmed. */
const TREE_EXTRA = `
class TreeNode {
    int val; TreeNode left, right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
class TH {
    static TreeNode build(Integer[] t) {
        if (t.length == 0 || t[0] == null) return null;
        TreeNode root = new TreeNode(t[0]);
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < t.length) {
            TreeNode n = q.poll();
            if (i < t.length && t[i] != null) { n.left = new TreeNode(t[i]); q.add(n.left); }
            i++;
            if (i < t.length && t[i] != null) { n.right = new TreeNode(t[i]); q.add(n.right); }
            i++;
        }
        return root;
    }
    static String ser(TreeNode root) {
        List<String> out = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode n = q.poll();
            if (n == null) { out.add("null"); continue; }
            out.add(String.valueOf(n.val));
            q.add(n.left); q.add(n.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return out.toString().replaceAll(", ", ",");
    }
    static String inorder(TreeNode n) {
        List<Integer> out = new ArrayList<>();
        walk(n, out);
        return out.toString().replaceAll(", ", ",");
    }
    static void walk(TreeNode n, List<Integer> out) { if (n == null) return; walk(n.left, out); out.add(n.val); walk(n.right, out); }
    static TreeNode find(TreeNode n, int v) {
        if (n == null) return null;
        if (n.val == v) return n;
        TreeNode l = find(n.left, v);
        return l != null ? l : find(n.right, v);
    }
}
`;
type Tok = number | null;
const tokLit = (t: Tok[]): string => `Integer[] t = {${t.map((x) => (x === null ? 'null' : x)).join(', ')}};`;
interface TN { v: number; l: TN | null; r: TN | null }
const buildTok = (t: Tok[]): TN | null => {
  if (!t.length || t[0] === null) return null;
  const root: TN = { v: t[0], l: null, r: null };
  const q = [root];
  let i = 1;
  while (q.length && i < t.length) {
    const n = q.shift()!;
    if (i < t.length && t[i] !== null) { n.l = { v: t[i]!, l: null, r: null }; q.push(n.l); }
    i++;
    if (i < t.length && t[i] !== null) { n.r = { v: t[i]!, l: null, r: null }; q.push(n.r); }
    i++;
  }
  return root;
};
const serTree = (root: TN | null): string => {
  const out: string[] = [];
  const q: (TN | null)[] = [root];
  while (q.length) {
    const n = q.shift()!;
    if (!n) { out.push('null'); continue; }
    out.push(String(n.v)); q.push(n.l, n.r);
  }
  while (out.length && out[out.length - 1] === 'null') out.pop();
  return `[${out.join(',')}]`;
};
/** random tree (depth <= maxDepth) as level-order tokens */
const genTokens = (r: () => number, maxDepth: number, lo: number, hi: number, p = 0.65): Tok[] => {
  const mk = (d: number): TN | null => {
    if (d >= maxDepth || (d > 0 && r() > p)) return null;
    return { v: lo + Math.floor(r() * (hi - lo + 1)), l: mk(d + 1), r: mk(d + 1) };
  };
  const root = mk(0) ?? { v: lo, l: null, r: null };
  return JSON.parse(serTree(root).replace(/null/g, 'null')) as Tok[];
};
const noWs =(s: string): string => s.replace(/\s+/g, '');
type TIn = { tokens: Tok[] };
/** main for a method taking only the tree and returning something printed with the given Java expression */
const treeMain = (print: (call: string) => string, call: (root: string) => string) => ({ tokens }: TIn) =>
  `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            ${print(call('root'))}`;
const listMain =(vals: number[], call: string): string =>
  `            ListNode h = LH.build(${ja(vals).replace(/^\{/, 'new int[]{')});\n            System.out.println(LH.str(${call}));`;

export const cases: JavaCaseModule['cases'] = [
  // ======================================================== stacks
  {
    slug: '20-valid-parentheses',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().isValid(${js(s)}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '150-evaluate-reverse-polish-notation',
    main: ({ tokens }: { tokens: string[] }) => `            String[] t = {${tokens.map(js).join(', ')}};\n            System.out.println(new Solution().evalRPN(t));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '155-min-stack',
    noWrap: true,
    main: ({ ops }: { ops: { op: string; val?: number }[] }) =>
      `            MinStack m = new MinStack();\n            List<String> out = new ArrayList<>();\n` +
      ops.map((o) => {
        if (o.op === 'push') return `            m.push(${o.val}); out.add("null");`;
        if (o.op === 'pop') return `            m.pop(); out.add("null");`;
        if (o.op === 'top') return `            out.add(String.valueOf(m.top()));`;
        return `            out.add(String.valueOf(m.getMin()));`;
      }).join('\n') + `\n            System.out.println(out);`,
    expected: ({ ops }: { ops: { op: string; val?: number }[] }) => {
      const st: number[] = [], out: string[] = [];
      for (const o of ops) {
        if (o.op === 'push') { st.push(o.val!); out.push('null'); }
        else if (o.op === 'pop') { st.pop(); out.push('null'); }
        else if (o.op === 'top') out.push(String(st[st.length - 1]));
        else out.push(String(Math.min(...st)));
      }
      return lst(out);
    },
  },
  {
    slug: '224-basic-calculator',
    main: ({ expr }: { expr: string }) => `            System.out.println(new Solution().calculate(${js(expr)}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '402-remove-k-digits',
    main: ({ num, k }: { num: string; k: number }) => `            System.out.println(new Solution().removeKdigits(${js(num)}, ${k}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '496-next-greater-element-i',
    main: ({ nums1, nums2 }: { nums1: number[]; nums2: number[] }) =>
      `            int[] a = ${ja(nums1)}; int[] b = ${ja(nums2)};\n            System.out.println(Arrays.toString(new Solution().nextGreaterElement(a, b)));`,
    expected: (_i, steps) => intList(lastTitle(steps)),
  },
  {
    slug: '503-next-greater-element-ii',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            System.out.println(Arrays.toString(new Solution().nextGreaterElements(a)));`,
    expected: (_i, steps) => intList(lastTitle(steps)),
  },
  {
    slug: '739-daily-temperatures',
    main: ({ temps }: { temps: number[] }) => `            int[] a = ${ja(temps)};\n            System.out.println(Arrays.toString(new Solution().dailyTemperatures(a)));`,
    expected: (_i, steps) => intList(lastTitle(steps)),
  },
  {
    slug: '84-largest-rectangle-in-histogram',
    main: ({ heights }: { heights: number[] }) => `            int[] a = ${ja(heights)};\n            System.out.println(new Solution().largestRectangleArea(a));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '85-maximal-rectangle',
    main: ({ grid }: { grid: string[] }) =>
      `            char[][] g = {${grid.map((r) => `${js(r)}.toCharArray()`).join(', ')}};\n            System.out.println(new Solution().maximalRectangle(g));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  // ======================================================== linked lists
  {
    slug: '141-linked-list-cycle',
    extra: LIST_EXTRA,
    main: ({ vals, pos }: { vals: number[]; pos: number }) =>
      `            ListNode h = LH.buildCycle(new int[]${ja(vals)}, ${pos});\n            System.out.println(new Solution().hasCycle(h));`,
    expected: ({ vals, pos }: { vals: number[]; pos: number }) => String(pos >= 0 && vals.length > 0),
  },
  {
    slug: '142-linked-list-cycle-ii',
    extra: LIST_EXTRA,
    main: ({ vals, pos }: { vals: number[]; pos: number }) =>
      `            ListNode h = LH.buildCycle(new int[]${ja(vals)}, ${pos});\n            System.out.println(LH.indexOf(h, new Solution().detectCycle(h), ${vals.length}));`,
    expected: ({ vals, pos }: { vals: number[]; pos: number }) => String(vals.length > 0 ? pos : -1),
  },
  {
    slug: '206-reverse-linked-list',
    extra: LIST_EXTRA,
    main: ({ vals }: { vals: number[] }) => listMain(vals, 'new Solution().reverseList(h)'),
    expected: ({ vals }: { vals: number[] }) => lst([...vals].reverse()),
  },
  {
    slug: '92-reverse-linked-list-ii',
    extra: LIST_EXTRA,
    main: ({ vals, left, right }: { vals: number[]; left: number; right: number }) => listMain(vals, `new Solution().reverseBetween(h, ${left}, ${right})`),
    expected: ({ vals, left, right }: { vals: number[]; left: number; right: number }) =>
      lst([...vals.slice(0, left - 1), ...vals.slice(left - 1, right).reverse(), ...vals.slice(right)]),
  },
  {
    slug: '876-middle-of-the-linked-list',
    extra: LIST_EXTRA,
    main: ({ vals }: { vals: number[] }) => listMain(vals, 'new Solution().middleNode(h)'),
    expected: ({ vals }: { vals: number[] }) => lst(vals.slice(Math.floor(vals.length / 2))),
  },
  {
    slug: '19-remove-nth-node-from-end',
    extra: LIST_EXTRA,
    main: ({ vals, n }: { vals: number[]; n: number }) => listMain(vals, `new Solution().removeNthFromEnd(h, ${n})`),
    expected: ({ vals, n }: { vals: number[]; n: number }) => lst(vals.filter((_, i) => i !== vals.length - n)),
  },
  {
    slug: '21-merge-two-sorted-lists',
    extra: LIST_EXTRA,
    main: ({ a, b }: { a: number[]; b: number[] }) =>
      `            ListNode x = LH.build(new int[]${ja(a)}), y = LH.build(new int[]${ja(b)});\n            System.out.println(LH.str(new Solution().mergeTwoLists(x, y)));`,
    expected: ({ a, b }: { a: number[]; b: number[] }) => lst([...a, ...b].sort((p, q) => p - q)),
  },
  {
    slug: '2-add-two-numbers',
    extra: LIST_EXTRA,
    main: ({ a, b }: { a: number[]; b: number[] }) =>
      `            ListNode x = LH.build(new int[]${ja(a)}), y = LH.build(new int[]${ja(b)});\n            System.out.println(LH.str(new Solution().addTwoNumbers(x, y)));`,
    expected: ({ a, b }: { a: number[]; b: number[] }) => {
      const out: number[] = [];
      let carry = 0;
      for (let i = 0; i < Math.max(a.length, b.length) || carry; i++) { const s = (a[i] ?? 0) + (b[i] ?? 0) + carry; out.push(s % 10); carry = Math.floor(s / 10); }
      return lst(out);
    },
  },
  {
    slug: '234-palindrome-linked-list',
    extra: LIST_EXTRA,
    main: ({ vals }: { vals: number[] }) => `            ListNode h = LH.build(new int[]${ja(vals)});\n            System.out.println(new Solution().isPalindrome(h));`,
    expected: ({ vals }: { vals: number[] }) => String(vals.every((v, i) => v === vals[vals.length - 1 - i])),
  },
  {
    slug: '25-reverse-nodes-in-k-group',
    extra: LIST_EXTRA,
    main: ({ vals, k }: { vals: number[]; k: number }) => listMain(vals, `new Solution().reverseKGroup(h, ${k})`),
    expected: ({ vals, k }: { vals: number[]; k: number }) => {
      const out: number[] = [];
      for (let i = 0; i < vals.length; i += k) {
        const g = vals.slice(i, i + k);
        out.push(...(g.length === k ? g.reverse() : g));
      }
      return lst(out);
    },
  },
  {
    slug: '287-find-the-duplicate-number',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            System.out.println(new Solution().findDuplicate(a));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '83-remove-duplicates-from-sorted-list',
    extra: LIST_EXTRA,
    main: ({ vals }: { vals: number[] }) => listMain(vals, 'new Solution().deleteDuplicates(h)'),
    expected: ({ vals }: { vals: number[] }) => lst(vals.filter((v, i) => i === 0 || v !== vals[i - 1])),
  },
  // ======================================================== trees: DFS / BFS / paths
  {
    slug: '104-maximum-depth-of-binary-tree',
    extra: TREE_EXTRA,
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().maxDepth(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '543-diameter-of-binary-tree',
    extra: TREE_EXTRA,
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().diameterOfBinaryTree(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '124-binary-tree-maximum-path-sum',
    extra: TREE_EXTRA,
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().maxPathSum(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '129-sum-root-to-leaf-numbers',
    extra: TREE_EXTRA,
    gen: (r) => ({ tokens: genTokens(r, 7, 0, 9) }),
    notes: 'own generator: depth <= 7 so the answer fits int (LeetCode guarantees a 32-bit answer; the oracle generator can exceed it)',
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().sumNumbers(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '98-validate-binary-search-tree',
    extra: TREE_EXTRA,
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().isValidBST(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '101-symmetric-tree',
    extra: TREE_EXTRA,
    main: treeMain((c) => `System.out.println(${c});`, (r) => `new Solution().isSymmetric(${r})`),
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '113-path-sum-ii',
    extra: TREE_EXTRA,
    main: ({ tokens, target }: TIn & { target: number }) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            System.out.println(new Solution().pathSum(root, ${target}).toString().replaceAll("\\\\s", ""));`,
    expected: (_i, steps) => noWs(lastTitle(steps)),
  },
  ...(['102-binary-tree-level-order-traversal:levelOrder', '103-binary-tree-zigzag-level-order:zigzagLevelOrder', '199-binary-tree-right-side-view:rightSideView'] as const).map((sm) => {
    const [slug, method] = sm.split(':');
    return {
      slug,
      extra: TREE_EXTRA,
      main: treeMain((c) => `System.out.println(${c}.toString().replaceAll("\\\\s", ""));`, (r) => `new Solution().${method}(${r})`),
      expected: (_i: unknown, steps: Step[]) => noWs(lastTitle(steps)),
    };
  }),
  {
    slug: '637-average-of-levels-in-binary-tree',
    extra: TREE_EXTRA,
    main: treeMain(
      (c) => `StringBuilder sb = new StringBuilder("[");\n            for (double d : ${c}) { if (sb.length() > 1) sb.append(", "); sb.append(String.format(Locale.US, "%.5f", d)); }\n            System.out.println(sb.append("]"));`,
      (r) => `new Solution().averageOfLevels(${r})`,
    ),
    expected: (_i, steps) => lst((lastTitle(steps).match(/-?\d+(\.\d+)?/g) ?? []).map((x) => Number(x).toFixed(5))),
  },
  // ======================================================== traversals (recursive / iterative / Morris)
  ...(['94-binary-tree-inorder-traversal:inorderTraversal', '144-binary-tree-preorder-traversal:preorderTraversal', '145-binary-tree-postorder-traversal:postorderTraversal',
    'alg-inorder-traversal-recursive-dfs:inorderTraversal', 'alg-preorder-traversal-recursive-dfs:preorderTraversal', 'alg-morris-inorder-traversal:inorderMorris'] as const).map((sm) => {
    const [slug, method] = sm.split(':');
    const kind = /inorder/i.test(method) ? 'in' : /preorder/i.test(method) ? 'pre' : 'post';
    return {
      slug,
      extra: TREE_EXTRA,
      main: treeMain((c) => `System.out.println(${c}.toString().replaceAll(", ", ","));`, (r) => `new Solution().${method}(${r})`),
      // independent reference: textbook recursive traversal of the tree built from the tokens
      expected: ({ tokens }: TIn) => {
        const out: number[] = [];
        const go = (n: TN | null) => { if (!n) return; if (kind === 'pre') out.push(n.v); go(n.l); if (kind === 'in') out.push(n.v); go(n.r); if (kind === 'post') out.push(n.v); };
        go(buildTok(tokens));
        return `[${out.join(',')}]`;
      },
    };
  }),
  // ======================================================== BST operations
  {
    slug: '700-search-in-a-binary-search-tree',
    extra: TREE_EXTRA,
    main: ({ tokens, target }: TIn & { target: number }) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            System.out.println(TH.ser(new Solution().searchBST(root, ${target})));`,
    expected: ({ tokens, target }: TIn & { target: number }) => {
      let n = buildTok(tokens);
      while (n && n.v !== target) n = target < n.v ? n.l : n.r;
      return serTree(n);
    },
  },
  {
    slug: '701-insert-into-a-binary-search-tree',
    extra: TREE_EXTRA,
    main: ({ tokens, value }: TIn & { value: number }) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            System.out.println(TH.ser(new Solution().insertIntoBST(root, ${value})));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '235-lowest-common-ancestor-of-a-binary-search-tree',
    extra: TREE_EXTRA,
    main: ({ tokens, p, q }: TIn & { p: number; q: number }) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            System.out.println(new Solution().lowestCommonAncestor(root, TH.find(root, ${p}), TH.find(root, ${q})).val);`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '230-kth-smallest-element-in-a-bst',
    extra: TREE_EXTRA,
    main: ({ tokens, k }: TIn & { k: number }) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            System.out.println(new Solution().kthSmallest(root, ${k}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '99-recover-binary-search-tree',
    extra: TREE_EXTRA,
    main: ({ tokens }: TIn) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            new Solution().recoverTree(root);\n            System.out.println(TH.inorder(root));`,
    // after recovery the in-order sequence must be sorted
    expected: ({ tokens }: TIn) => `[${(tokens.filter((x) => x !== null) as number[]).sort((a, b) => a - b).join(',')}]`,
  },
  // ======================================================== tree construction / serialisation
  {
    slug: '105-construct-tree-from-preorder-inorder',
    extra: TREE_EXTRA,
    main: ({ pre, ino }: { pre: number[]; ino: number[] }) =>
      `            int[] p = ${ja(pre)}; int[] i = ${ja(ino)};\n            System.out.println(TH.ser(new Solution().buildTree(p, i)));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '108-convert-sorted-array-to-bst',
    extra: TREE_EXTRA,
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            System.out.println(TH.ser(new Solution().sortedArrayToBST(a)));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '1008-construct-binary-search-tree-from-preorder-traversal',
    extra: TREE_EXTRA,
    main: ({ pre }: { pre: number[] }) => `            int[] a = ${ja(pre)};\n            System.out.println(TH.ser(new Solution().bstFromPreorder(a)));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '654-maximum-binary-tree',
    extra: TREE_EXTRA,
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            System.out.println(TH.ser(new Solution().constructMaximumBinaryTree(a)));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '297-serialize-and-deserialize-binary-tree',
    extra: TREE_EXTRA,
    main: ({ tokens }: TIn) =>
      `            ${tokLit(tokens)}\n            TreeNode root = TH.build(t);\n            Solution s = new Solution();\n            String d = s.serialize(root);\n            System.out.println(d + " " + TH.ser(s.deserialize(d)));`,
    expected: ({ tokens }: TIn, steps) => `${lastTitle(steps)}, ${serTree(buildTok(tokens))}`,
    notes: 'the displayed serialize() leaves a trailing comma that the animation title omits (round trip still exact); prints the serialized string and the level-order form of the deserialized tree (round trip)',
  },
  // ======================================================== design problems (scripted operation sequences)
  {
    slug: '146-lru-cache',
    noWrap: true,
    main: ({ cap, ops }: { cap: number; ops: { t: string; k: number; v?: number }[] }) =>
      `            LRUCache c = new LRUCache(${cap});\n            List<String> out = new ArrayList<>();\n` +
      ops.map((o) => (o.t === 'put' ? `            c.put(${o.k}, ${o.v});` : `            out.add(String.valueOf(c.get(${o.k})));`)).join('\n') +
      `\n            System.out.println(String.join(", ", out));`,
    expected: ({ cap, ops }: { cap: number; ops: { t: string; k: number; v?: number }[] }) => {
      const m = new Map<number, number>(); // insertion order = recency (oldest first)
      const out: number[] = [];
      for (const o of ops) {
        if (o.t === 'put') {
          if (m.has(o.k)) m.delete(o.k);
          else if (m.size === cap) m.delete(m.keys().next().value!);
          m.set(o.k, o.v!);
        } else if (m.has(o.k)) { const v = m.get(o.k)!; m.delete(o.k); m.set(o.k, v); out.push(v); }
        else out.push(-1);
      }
      return out.join(', ');
    },
  },
  {
    slug: '460-lfu-cache',
    noWrap: true,
    main: ({ cap, ops }: { cap: number; ops: { t: string; k: number; v?: number }[] }) =>
      `            LFUCache c = new LFUCache(${cap});\n            List<String> out = new ArrayList<>();\n` +
      ops.map((o) => (o.t === 'put' ? `            c.put(${o.k}, ${o.v});` : `            out.add(String.valueOf(c.get(${o.k})));`)).join('\n') +
      `\n            System.out.println(String.join(", ", out));`,
    // independent reference: entries carry (value, uses, lastTouch); evict the lowest uses, ties by least recently used
    expected: ({ cap, ops }: { cap: number; ops: { t: string; k: number; v?: number }[] }) => {
      const m = new Map<number, { v: number; u: number; t: number }>();
      let clock = 0;
      const out: number[] = [];
      for (const o of ops) {
        clock++;
        if (o.t === 'put') {
          if (cap <= 0) continue;
          const e = m.get(o.k);
          if (e) { e.v = o.v!; e.u++; e.t = clock; continue; }
          if (m.size === cap) {
            let victim = -1, best: { u: number; t: number } | null = null;
            for (const [k, x] of m) if (!best || x.u < best.u || (x.u === best.u && x.t < best.t)) { best = x; victim = k; }
            m.delete(victim);
          }
          m.set(o.k, { v: o.v!, u: 1, t: clock });
        } else {
          const e = m.get(o.k);
          if (!e) out.push(-1); else { e.u++; e.t = clock; out.push(e.v); }
        }
      }
      return out.join(', ');
    },
  },
  {
    slug: '432-all-o-1-data-structure',
    noWrap: true,
    main: ({ ops }: { ops: { t: string; k?: string }[] }) =>
      `            AllOne a = new AllOne();\n            List<String> out = new ArrayList<>();\n` +
      ops.map((o) => (o.t === 'inc' ? `            a.inc(${js(o.k!)});` : o.t === 'dec' ? `            a.dec(${js(o.k!)});` : o.t === 'max' ? `            out.add(a.getMaxKey());` : `            out.add(a.getMinKey());`)).join('\n') +
      `\n            System.out.println(String.join(", ", out));`,
    expected: (_i, steps) => lastTitle(steps).replace(/""/g, '').replace('(no queries)', ''), // the animation writes an empty answer as ""
    notes: 'ties between keys of equal count are order-dependent (insertion order in the bucket); expected comes from the animation, which models the same buckets',
  },
  // ======================================================== strings / bits / misc (batch 1)
  {
    slug: '383-ransom-note',
    main: ({ ransom, magazine }: { ransom: string; magazine: string }) => `            System.out.println(new Solution().canConstruct(${js(ransom)}, ${js(magazine)}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '344-reverse-string',
    main: ({ s }: { s: string }) => `            char[] c = ${js(s)}.toCharArray();\n            new Solution().reverseString(c);\n            System.out.println(new String(c));`,
    expected: ({ s }: { s: string }) => [...s].reverse().join(''),
  },
  {
    slug: '438-find-all-anagrams-in-a-string',
    main: ({ s, p }: { s: string; p: string }) => `            System.out.println(new Solution().findAnagrams(${js(s)}, ${js(p)}).toString().replaceAll(", ", ","));`,
    // independent reference: sorted-window comparison
    expected: ({ s, p }: { s: string; p: string }) => {
      const key = [...p].sort().join(''), out: number[] = [];
      for (let i = 0; i + p.length <= s.length; i++) if ([...s.slice(i, i + p.length)].sort().join('') === key) out.push(i);
      return `[${out.join(',')}]`;
    },
  },
  {
    slug: '5-longest-palindromic-substring',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().longestPalindrome(${js(s)}));`,
    expected: (_i, steps) => lastTitle(steps).replace(/^"|"$/g, ''),
    notes: 'ties between equally long palindromes: the displayed code and the animation both keep the first (leftmost-center) one',
  },
  {
    slug: '36-valid-sudoku',
    main: ({ board }: { board: string[] }) => `            char[][] b = {${board.map((r) => `${js(r)}.toCharArray()`).join(', ')}};\n            System.out.println(new Solution().isValidSudoku(b));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '4-median-of-two-sorted-arrays',
    main: ({ a, b }: { a: number[]; b: number[] }) =>
      `            int[] x = ${ja(a)}; int[] y = ${ja(b)};\n            System.out.println(String.format(Locale.US, "%.5f", new Solution().findMedianSortedArrays(x, y)));`,
    // independent reference: merge and take the middle
    expected: ({ a, b }: { a: number[]; b: number[] }) => {
      const m = [...a, ...b].sort((p, q) => p - q), n = m.length;
      return (n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2).toFixed(5);
    },
  },
  {
    slug: '389-find-the-difference',
    main: ({ s, t }: { s: string; t: string }) => `            System.out.println(new Solution().findTheDifference(${js(s)}, ${js(t)}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '371-sum-of-two-integers',
    main: ({ a, b }: { a: number; b: number }) => `            System.out.println(new Solution().getSum(${a}, ${b}));`,
    expected: ({ a, b }: { a: number; b: number }) => String(a + b),
  },
  {
    slug: '452-minimum-arrows-to-burst-balloons',
    main: ({ iv }: { iv: number[][] }) => `            int[][] p = {${iv.map((x) => `{${x.join(', ')}}`).join(', ')}};\n            System.out.println(new Solution().findMinArrowShots(p));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: '399-evaluate-division',
    main: ({ eqs, queries }: { eqs: { a: string; b: string; v: number }[]; queries: string[][] }) =>
      `            List<List<String>> eq = List.of(${eqs.map((e) => `List.of(${js(e.a)}, ${js(e.b)})`).join(', ')});\n` +
      `            double[] vals = {${eqs.map((e) => (Number.isInteger(e.v) ? e.v.toFixed(1) : String(e.v))).join(', ')}};\n` +
      `            List<List<String>> qs = List.of(${queries.map((q) => `List.of(${js(q[0])}, ${js(q[1])})`).join(', ')});\n` +
      `            double[] r = new Solution().calcEquation(eq, vals, qs);\n` +
      `            StringBuilder sb = new StringBuilder("[");\n            for (double d : r) { if (sb.length() > 1) sb.append(", "); sb.append(String.format(Locale.US, "%.5f", d)); }\n            System.out.println(sb.append("]"));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  // ======================================================== strings / arrays / dp (batch 2)
  {
    slug: '832-flipping-an-image',
    main: ({ image }: { image: number[][] }) =>
      `            int[][] g = {${image.map((x) => `{${x.join(', ')}}`).join(', ')}};\n            System.out.println(Arrays.deepToString(new Solution().flipAndInvertImage(g)).replaceAll(", ", ","));`,
    expected: ({ image }: { image: number[][] }) => `[${image.map((r) => `[${[...r].reverse().map((v) => 1 - v).join(',')}]`).join(',')}]`,
  },
  {
    slug: '977-squares-of-a-sorted-array',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            System.out.println(Arrays.toString(new Solution().sortedSquares(a)));`,
    expected: ({ nums }: { nums: number[] }) => lst(nums.map((v) => v * v).sort((a, b) => a - b)),
  },
  {
    slug: '76-minimum-window-substring',
    main: ({ s, t }: { s: string; t: string }) => `            System.out.println(new Solution().minWindow(${js(s)}, ${js(t)}));`,
    expected: (_i, steps) => lastTitle(steps).replace(/^"|"$/g, ''),
    notes: 'ties between equally short windows: both implementations keep the leftmost',
  },
  {
    slug: '680-valid-palindrome-ii',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().validPalindrome(${js(s)}));`,
    // independent reference: try deleting every character
    expected: ({ s }: { s: string }) => {
      const pal = (x: string) => x === [...x].reverse().join('');
      if (pal(s)) return 'true';
      for (let i = 0; i < s.length; i++) if (pal(s.slice(0, i) + s.slice(i + 1))) return 'true';
      return 'false';
    },
  },
  {
    slug: '59-spiral-matrix-ii',
    main: ({ n }: { n: number }) => `            System.out.println(Arrays.deepToString(new Solution().generateMatrix(${n})).replaceAll(", ", ","));`,
    expected: (_i, steps) => noWs(lastTitle(steps)),
  },
  {
    slug: '763-partition-labels',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().partitionLabels(${js(s)}).toString().replaceAll(", ", ","));`,
    expected: (_i, steps) => noWs(lastTitle(steps)),
  },
  {
    slug: '81-search-in-rotated-sorted-array-ii',
    main: ({ nums, target }: { nums: number[]; target: number }) => `            int[] a = ${ja(nums)};\n            System.out.println(new Solution().search(a, ${target}));`,
    expected: ({ nums, target }: { nums: number[]; target: number }) => String(nums.includes(target)),
  },
  {
    slug: '621-task-scheduler',
    main: ({ tasks, n }: { tasks: string[]; n: number }) =>
      `            char[] t = {${tasks.map((c) => `'${c}'`).join(', ')}};\n            System.out.println(new Solution().leastInterval(t, ${n}));`,
    // independent reference: closed formula max(len, (maxCount-1)*(n+1) + numberWithMax)
    expected: ({ tasks, n }: { tasks: string[]; n: number }) => {
      const cnt = new Map<string, number>();
      for (const c of tasks) cnt.set(c, (cnt.get(c) ?? 0) + 1);
      const mx = Math.max(...cnt.values()), withMax = [...cnt.values()].filter((v) => v === mx).length;
      return String(Math.max(tasks.length, (mx - 1) * (n + 1) + withMax));
    },
  },
  {
    slug: '509-fibonacci-number',
    main: ({ n }: { n: number }) => `            System.out.println(new Solution().fib(${n}));`,
    expected: ({ n }: { n: number }) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return String(a); },
  },
  {
    slug: '746-min-cost-climbing-stairs',
    main: ({ cost }: { cost: number[] }) => `            int[] c = ${ja(cost)};\n            System.out.println(new Solution().minCostClimbingStairs(c));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  // ======================================================== sorts, queues, binary-search-on-answer partitions
  ...(['912-bubble-sort:bubbleSort', '912-insertion-sort:insertionSort', '912-heap-sort:heapSort'] as const).map((sm) => {
    const [slug, method] = sm.split(':');
    return {
      slug,
      main: ({ nums }: { nums: number[] }) => `            int[] a = ${ja(nums)};\n            new Solution().${method}(a);\n            System.out.println(Arrays.toString(a));`,
      expected: ({ nums }: { nums: number[] }) => lst([...nums].sort((a, b) => a - b)),
    };
  }),
  {
    slug: 'gfg-reverse-first-k-elements-of-queue',
    main: ({ queue, k }: { queue: number[]; k: number }) =>
      `            Queue<Integer> q = new LinkedList<>(List.of(${queue.join(', ')}));\n            System.out.println(new Solution().reverseFirstK(q, ${k}).toString().replaceAll(", ", ","));`,
    expected: ({ queue, k }: { queue: number[]; k: number }) => `[${[...queue.slice(0, k).reverse(), ...queue.slice(k)].join(',')}]`,
  },
  {
    slug: 'gfg-minimum-platforms',
    main: ({ arr, dep }: { arr: number[]; dep: number[] }) =>
      `            int[] a = ${ja(arr)}; int[] d = ${ja(dep)};\n            System.out.println(new Solution().findPlatform(a, d));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: 'gfg-allocate-minimum-pages',
    main: ({ nums, k }: { nums: number[]; k: number }) => `            int[] a = ${ja(nums)};\n            System.out.println(new Solution().findPages(a, ${k}));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  {
    slug: 'ib-painters-partition-problem',
    main: ({ nums, k }: { nums: number[]; k: number }) => `            int[] a = ${ja(nums)};\n            System.out.println(new Solution().paint(${k}, a));`,
    expected: (_i, steps) => lastTitle(steps),
  },
  // @@END
];
