import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { find, gc, heads, parseOne, recorder } from './dpAdvKit.ts';

interface In { n: number }

const java = [
  'public int numTrees(int n) {',
  '    int[] dp = new int[n + 1];          // dp[k] = distinct BSTs holding k nodes',
  '    dp[0] = 1; dp[1] = 1;               // empty tree and single node',
  '    for (int nodes = 2; nodes <= n; nodes++) {',
  '        for (int root = 1; root <= nodes; root++) {',
  '            dp[nodes] += dp[root - 1] * dp[nodes - root];',
  '        }',
  '    }',
  '    return dp[n];',
  '}',
];
const python = [
  'def num_trees(n):',
  '    dp = [0] * (n + 1)                  # dp[k] = distinct BSTs holding k nodes',
  '    dp[0] = dp[1] = 1                   # empty tree and single node',
  '    for nodes in range(2, n + 1):',
  '        for root in range(1, nodes + 1):',
  '            dp[nodes] += dp[root - 1] * dp[nodes - root]',
  '    return dp[n]',
];
const J = { def: find(java, 'int[] dp'), base: find(java, 'dp[0] = 1'), outer: find(java, 'for (int nodes'), term: find(java, 'for (int root', 'dp[nodes] +='), ret: find(java, 'return dp[n]') };
const P = { def: find(python, 'dp = [0]'), base: find(python, 'dp[0] = dp[1]'), outer: find(python, 'for nodes'), term: find(python, 'for root', 'dp[nodes] +='), ret: find(python, 'return dp[n]') };

function build({ n }: In): Step[] {
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let cur = -1;
  let l = -1;
  let r = -1;
  let done = false;
  let terms: string[] = [];
  let root: number | string = '—';
  let sum: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const, variant: 'table' as const,
      rows: [dp.map((v, k) => {
        let s: CellState | undefined;
        if (k === cur) s = done ? 'found' : 'active';
        else if (k === l || k === r) s = 'compare';
        else if (v === null) s = 'dim';
        return gc(`d${k}`, v === null ? '?' : v, s);
      })],
      rowHeads: ['BSTs'], colHeads: heads(n + 1, (k) => `${k} nodes`),
    },
    aux: [{ title: cur >= 0 ? `dp[${cur}] = sum over the root` : 'sum over the root', kind: 'list' as const, items: [...terms] }],
    vars: { nodes: cur < 0 ? '—' : cur, root, 'dp[root-1]': l < 0 ? '—' : dp[l]!, 'dp[nodes-root]': r < 0 ? '—' : dp[r]!, sum },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `dp[k] = number of structurally different BSTs that store the keys 1..k. We need dp[${n}].`,
    logic: 'Only the shape matters: any k distinct keys give the same count as 1..k, so one table of sizes is enough.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `dp[0..${n}] allocated, goal dp[${n}]`,
  });
  dp[0] = 1;
  dp[1] = 1;
  cur = 1;
  done = true;
  say({
    title: 'Base cases dp[0] = dp[1] = 1', desc: 'The empty tree is one (empty) shape, and a single key forms exactly one tree.',
    logic: 'dp[0] = 1 matters: a missing subtree contributes a factor of 1, not 0.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: 'dp[0] = dp[1] = 1',
  });

  for (let m = 2; m <= n; m++) {
    cur = m;
    done = false;
    terms = [];
    dp[m] = 0;
    for (let j = 1; j <= m; j++) {
      l = j - 1;
      r = m - j;
      root = j;
      const t = dp[l]! * dp[r]!;
      dp[m] = dp[m]! + t;
      sum = dp[m]!;
      terms.push(`root ${j}: dp[${l}]×dp[${r}] = ${dp[l]}×${dp[r]} = ${t}`);
      say({
        title: `${m} nodes, root = ${j}`,
        desc: `Key ${j} at the root puts ${l} smaller key${l === 1 ? '' : 's'} on the left and ${r} larger key${r === 1 ? '' : 's'} on the right: ${dp[l]} × ${dp[r]} = ${t} trees. Running total ${dp[m]}.`,
        logic: 'Left and right subtrees are chosen independently, so their counts multiply; summing over every possible root is the Catalan convolution.',
        java: J.term, py: P.term, algo: 2,
        tag: `ROOT ${j} —`, note: `dp[${m}] += dp[${l}] × dp[${r}] = ${dp[l]} × ${dp[r]} = ${t} → ${dp[m]}`,
      });
    }
    l = -1;
    r = -1;
    root = '—';
    done = true;
    say({
      title: `dp[${m}] = ${dp[m]}`, desc: `All ${m} roots are accounted for: ${terms.length} terms add up to ${dp[m]}.`,
      logic: 'This value is now a building block for every larger size.', tone: 'success', java: J.outer, py: P.outer, algo: 2,
      tag: 'STORE —', note: `dp[${m}] = ${terms.length} terms = ${dp[m]}`,
    });
  }

  cur = n;
  l = -1;
  r = -1;
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[${n}] = ${dp[n]}`, desc: `There are ${dp[n]} structurally different BSTs with ${n} node${n === 1 ? '' : 's'} (the ${n}th Catalan number).`,
    logic: 'dp[n] holds the answer; the sequence 1, 1, 2, 5, 14, 42, … is the Catalan numbers.', tone: 'success',
    java: J.ret, py: P.ret, algo: 3, result: { title: String(dp[n]), text: 'Distinct BSTs' },
  });
  return steps;
}

export const uniqueBinarySearchTrees: ProblemDef<In> = {
  slug: '96-unique-binary-search-trees',
  id: '96', title: 'Unique Binary Search Trees', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'Catalan convolution',
  statement: 'Given n, count the structurally different binary search trees that store exactly the keys 1 through n.',
  constraints: '1 ≤ n ≤ 19 (animation input: 1 ≤ n ≤ 10)',
  examples: [
    { label: 'n = 4', input: { n: 4 }, output: '14', answer: '14 trees (dp = 1, 1, 2, 5, 14: the Catalan numbers)' },
    { label: 'n = 3', input: { n: 3 }, output: '5' },
    { label: 'n = 1', input: { n: 1 }, output: '1' },
    { label: 'n = 6', input: { n: 6 }, output: '132' },
  ],
  inputPlaceholder: 'n, e.g. 5',
  parseInput: (raw) => ({ n: parseOne(raw, 'n', 1, 10, '5') }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Size being filled', state: 'active' }, { label: 'dp[root−1] and dp[nodes−root]', state: 'compare' }, { label: 'Finished size', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['nodes', 'root', 'dp[root-1]', 'dp[nodes-root]', 'sum'],
  emphasis: ['structurally different', 'binary search trees'],
  phases: [
    { icon: '🧱', label: 'Define dp[k] = #BSTs', tone: 'blue' },
    { icon: '🌱', label: 'Base: dp[0] = dp[1] = 1', tone: 'blue' },
    { icon: '🌳', label: 'Pick a root, multiply the sides', tone: 'cyan' },
    { icon: '✅', label: 'Done: Catalan number', tone: 'green' },
  ],
  approach: {
    title: 'Pick the root, multiply the two sides',
    text: 'Choose key j as the root of a tree on k keys. Keys below j form the left subtree (j−1 keys) and keys above form the right subtree (k−j keys), each in dp[·] ways. So dp[k] = Σ over j of dp[j−1] · dp[k−j].',
  },
  java, python,
  algorithm: [
    'dp[k] = number of BSTs on k keys',
    'Base: dp[0] = dp[1] = 1',
    'For each size k, add dp[root−1] × dp[k−root] for every root 1..k',
    'Return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Every BST on 1..k has exactly one root, and once the root j is fixed the BST property forces the keys 1..j−1 left and j+1..k right. The two subtrees can be any valid BSTs, chosen independently, so the count for this root is a product. Roots give disjoint sets of trees, so the totals add. The same split-and-multiply recurrence counts bracket sequences and polygon triangulations, which is why the whole family is the Catalan numbers.',
};
