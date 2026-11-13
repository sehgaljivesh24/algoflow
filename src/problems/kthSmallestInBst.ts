import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, isStrictBst, listAux, parseInts, parseTokens, splitParts, stackAux, treeScene } from './treeKit.ts';
import type { Token } from './treeKit.ts';

interface In { tokens: Token[]; k: number }

const FORMAT = '5 3 6 2 4 null null 1 ; 3';

function parse(raw: string): In {
  const [t, kk] = splitParts(raw, 2, FORMAT);
  const tokens = parseTokens(t);
  const nodes = buildTree(tokens);
  if (!isStrictBst(nodes)) throw new Error('The tree must be a valid BST with distinct values (smaller on the left, larger on the right)');
  const ks = parseInts(kk, 'k');
  if (ks.length !== 1 || ks[0] < 1 || ks[0] > nodes.length) throw new Error(`After ";" give a single k between 1 and ${nodes.length}`);
  return { tokens, k: ks[0] };
}

const java = [
  'public int kthSmallest(TreeNode root, int k) {',
  '    Deque<TreeNode> stack = new ArrayDeque<>();',
  '    TreeNode cur = root;',
  '    int count = 0;',
  '    while (cur != null || !stack.isEmpty()) {',
  '        while (cur != null) {',
  '            stack.push(cur);',
  '            cur = cur.left;',
  '        }',
  '        cur = stack.pop();',
  '        if (++count == k) return cur.val;',
  '        cur = cur.right;',
  '    }',
  '    return -1;',
  '}',
];
const python = [
  'def kth_smallest(root, k):',
  '    stack, cur, count = [], root, 0',
  '    while cur or stack:',
  '        while cur:',
  '            stack.append(cur)',
  '            cur = cur.left',
  '        cur = stack.pop()',
  '        count += 1',
  '        if count == k:',
  '            return cur.val',
  '        cur = cur.right',
];
const ord = (n: number) => {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${sfx[(v - 20) % 10] || sfx[v] || sfx[0]}`;
};
const J = { start: find(java, 'Deque<TreeNode>', 'TreeNode cur = root', 'int count = 0'), push: find(java, 'stack.push(cur)', 'cur = cur.left'), pop: find(java, 'cur = stack.pop()', '++count == k'), right: find(java, 'cur = cur.right') };
const P = { start: find(python, 'stack, cur, count'), push: find(python, 'stack.append(cur)', 'cur = cur.left'), pop: find(python, 'cur = stack.pop()', 'count += 1', 'if count == k'), right: find(python, 'cur = cur.right') };

function build({ tokens, k }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: number[] = [];
  const order: number[] = [];
  let count = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('stack (top = next to visit)', stack.map(val)), listAux(`visited in sorted order (need #${k})`, order)];
  const vars = (cur: number | string) => ({ k, count, cur });

  add({
    title: 'Start', desc: `Find the ${ord(k)} smallest value. An in-order walk of a BST visits values in increasing order, so stop at visit number ${k}.`,
    logic: 'In-order = left subtree, node, right subtree. We do it with an explicit stack so we can stop early.',
    j: J.start, p: P.start, a: 0, vars: vars('root'), aux: aux(),
  });

  let cur: number | null = 0;
  let answer = -1;
  while (cur !== null || stack.length) {
    while (cur !== null) {
      stack.push(cur);
      states[cur] = 'compare';
      add({
        title: `Push ${val(cur)}, go left`, desc: `${val(cur)} must wait until everything smaller (its left subtree) has been visited. ${nodes[cur].left === null ? 'It has no left child, so the descent stops.' : `Move to its left child ${val(nodes[cur].left!)}.`}`,
        logic: 'Dive as far left as possible — the leftmost node holds the smallest value.',
        j: J.push, p: P.push, a: 1, vars: vars(val(cur)), aux: aux(),
      });
      cur = nodes[cur].left;
    }
    const id: number = stack.pop()!;
    cur = id;
    count++;
    order.push(val(id));
    states[id] = 'active';
    labels[id] = `#${count}`;
    const hit = count === k;
    add({
      title: `Pop ${val(id)}: visit #${count}`, desc: hit ? `This is visit number ${count} = k. The answer is ${val(id)}.` : `${val(id)} is the ${ord(count)} smallest so far (need ${k}).`,
      logic: hit ? 'We can stop immediately; the rest of the tree is never touched.' : 'The popped node is the next smallest value not yet visited.', tone: hit ? 'success' : 'info',
      j: J.pop, p: P.pop, a: 2, vars: vars(val(id)), aux: aux(),
    });
    if (hit) {
      answer = val(id);
      states[id] = 'swap';
      break;
    }
    states[id] = 'found';
    cur = nodes[id].right;
    add({
      title: `Go right of ${val(id)}`, desc: cur === null ? `${val(id)} has no right child; the next smallest value is on the stack.` : `Visit the right subtree: cur = ${val(cur)}.`,
      logic: 'After a node, its right subtree holds the next larger values.',
      j: J.right, p: P.right, a: 3, vars: vars(cur === null ? 'null' : val(cur)), aux: aux(),
    });
  }

  add({
    title: 'Done', desc: `The ${ord(k)} smallest value is ${answer}.`, logic: `Only ${count} node${count === 1 ? ' was' : 's were'} visited in sorted order.`, tone: 'success',
    j: J.pop, p: P.pop, a: 3, vars: vars(answer), aux: aux(), result: { title: String(answer), text: `${ord(k)} smallest value` },
  });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'cur = root, count = 0, stack = []' },
    { on: /^Push (-?\d+), go left/, tag: 'PUSH —', note: (m) => `stack.push(${m[1]}); cur = cur.left` },
    {
      on: /^Pop (-?\d+): visit #(\d+)/,
      tag: (_m, s) => (s.desc.includes('The answer is') ? '🎯 FOUND —' : 'VISIT —'),
      note: (m, s) => `count = ${m[2]} ${s.desc.includes('The answer is') ? `== k → return ${m[1]}` : `< k = ${s.vars.k}`}`,
    },
    { on: /^Go right of/, tag: 'GO RIGHT —', note: (_m, s) => `cur = cur.right → ${s.vars.cur}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const kthSmallestInBst: ProblemDef<In> = {
  slug: '230-kth-smallest-element-in-a-bst',
  id: '230', title: 'Kth Smallest Element in a BST', difficulty: 'Medium', category: 'Tree', tag: 'inorder',
  statement: 'Given the root of a binary search tree and an integer k, return the k-th smallest value (1-indexed) among all node values.',
  constraints: '1 ≤ k ≤ n ≤ 10⁴ (animation input is limited to 12 nodes). Input format: BST in level order, then ";", then k.',
  examples: [
    { label: '3 1 4 null 2 ; 1', input: { tokens: [3, 1, 4, null, 2], k: 1 }, output: '1' },
    { label: '5 3 6 2 4 null null 1 ; 3', input: { tokens: [5, 3, 6, 2, 4, null, null, 1], k: 3 }, output: '3' },
    { label: '8 4 12 2 6 10 14 ; 5', input: { tokens: [8, 4, 12, 2, 6, 10, 14], k: 5 }, output: '10' },
  ],
  inputPlaceholder: `e.g. ${FORMAT}`,
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Waiting on the stack', state: 'compare' }, { label: 'Visiting now', state: 'active' }, { label: 'Already visited', state: 'found' }, { label: 'Answer', state: 'swap' }],
  varLabels: ['k', 'count', 'cur'],
  emphasis: ['smallest', 'in-order', 'kth'],
  phases: [
    { icon: '🚀', label: 'cur = root, count = 0', tone: 'blue' },
    { icon: '⬅️', label: 'Push and go left', tone: 'cyan' },
    { icon: '👁️', label: 'Pop: visit #count', tone: 'gold' },
    { icon: '➡️', label: 'Go right', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Stop an in-order walk at the kth visit',
    text: 'In-order traversal of a BST yields values in sorted order. Walk it iteratively with a stack, count each visit, and return the value when the count reaches k — no need to traverse the rest.',
  },
  java, python,
  algorithm: [
    'Set cur = root, count = 0, and an empty stack',
    'Push cur and go left until null',
    'Pop a node and increment count; if count == k return its value',
    'Move to the popped node’s right child and repeat',
    'Return the value of visit number k',
  ],
  complexity: [{ label: 'Time', value: 'O(h + k)' }, { label: 'Space', value: 'O(h)' }],
  why: 'For every node, all values in its left subtree are smaller and all in its right subtree larger, so visiting left, node, right enumerates the keys in ascending order. The stack stores exactly the ancestors whose left subtree is being processed. Reaching the k-th pop takes at most h pushes to reach the leftmost node plus k pops with their right-subtree descents.',
};
