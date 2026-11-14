import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules, auxItems } from './annotate.ts';
import { buildTree, emitter, find, fmtList, fmtLists, listAux, parseTree, queueAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public List<List<Integer>> zigzagLevelOrder(TreeNode root) {',
  '    List<List<Integer>> res = new ArrayList<>();',
  '    if (root == null) return res;',
  '    Queue<TreeNode> q = new LinkedList<>();',
  '    q.add(root);',
  '    boolean leftToRight = true;',
  '    while (!q.isEmpty()) {',
  '        int size = q.size();',
  '        List<Integer> level = new ArrayList<>();',
  '        for (int i = 0; i < size; i++) {',
  '            TreeNode node = q.poll();',
  '            level.add(node.val);',
  '            if (node.left != null) q.add(node.left);',
  '            if (node.right != null) q.add(node.right);',
  '        }',
  '        if (!leftToRight) Collections.reverse(level);',
  '        res.add(level);',
  '        leftToRight = !leftToRight;',
  '    }',
  '    return res;',
  '}',
];
const python = [
  'def zigzag_level_order(root):',
  '    if not root:',
  '        return []',
  '    res, q, left_to_right = [], deque([root]), True',
  '    while q:',
  '        level = []',
  '        for _ in range(len(q)):',
  '            node = q.popleft()',
  '            level.append(node.val)',
  '            if node.left:',
  '                q.append(node.left)',
  '            if node.right:',
  '                q.append(node.right)',
  '        if not left_to_right:',
  '            level.reverse()',
  '        res.append(level)',
  '        left_to_right = not left_to_right',
  '    return res',
];
const J = {
  start: find(java, 'boolean leftToRight'), size: find(java, 'int size', 'List<Integer> level'), poll: find(java, 'q.poll()', 'level.add'),
  kids: find(java, 'node.left != null', 'node.right != null'), rev: find(java, 'Collections.reverse'), keep: find(java, 'if (!leftToRight)'),
  done: find(java, 'res.add(level)', 'leftToRight = !leftToRight'), ret: find(java, ['return res;', 2]),
};
const P = {
  start: find(python, 'res, q, left_to_right'), size: find(python, 'level = []', 'for _ in range'), poll: find(python, 'popleft', 'level.append'),
  kids: find(python, 'if node.left', 'q.append(node.left)', 'if node.right', 'q.append(node.right)'), rev: find(python, 'if not left_to_right', 'level.reverse()'),
  keep: find(python, 'if not left_to_right'), done: find(python, 'res.append', 'left_to_right = not'), ret: find(python, 'return res'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const queue: number[] = [];
  const result: number[][] = [];
  let level: number[] = [];
  let depth = 0;
  let ltr = true;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [
    queueAux('queue (front → back)', queue.map(val)),
    listAux(`current level (${ltr ? 'left → right' : 'right → left'})`, level),
    listAux('result', result.map(fmtList)),
  ];
  const vars = (node: number | string) => ({ level: depth, direction: ltr ? 'L→R' : 'R→L', node });

  queue.push(0);
  states[0] = 'compare';
  add({
    title: 'Start', desc: 'Queue the root and start with direction left → right.',
    logic: 'We always traverse the tree left to right with a normal queue; the zigzag comes from reversing every second level afterwards.',
    j: J.start, p: P.start, a: 0, vars: vars('—'), aux: aux(),
  });

  while (queue.length) {
    const size = queue.length;
    add({
      title: `Level ${depth} (${ltr ? 'L→R' : 'R→L'})`, desc: `${size} node${size === 1 ? '' : 's'} on this level. Collect them in queue order.`,
      logic: 'Snapshot the queue size so children added during the loop wait for the next level.',
      j: J.size, p: P.size, a: 1, vars: vars('—'), aux: aux(),
    });
    for (let i = 0; i < size; i++) {
      const id = queue.shift()!;
      level.push(val(id));
      states[id] = 'active';
      labels[id] = `L${depth}`;
      add({
        title: `Dequeue ${val(id)}`, desc: `Append ${val(id)} to the level list (queue order is always left to right).`,
        logic: 'Never insert at the front while collecting — reversing once at the end is simpler and cheaper.',
        j: J.poll, p: P.poll, a: 2, vars: vars(val(id)), aux: aux(),
      });
      const kids = [nodes[id].left, nodes[id].right].filter((c): c is number => c !== null);
      for (const c of kids) {
        queue.push(c);
        states[c] = 'compare';
      }
      if (kids.length) {
        add({
          title: `Enqueue children of ${val(id)}`, desc: `Queue ${kids.map((c) => val(c)).join(' and ')} (left first).`,
          logic: 'Children are always queued left then right, whatever the direction of the current level.', tone: 'success',
          j: J.kids, p: P.kids, a: 2, vars: vars(val(id)), aux: aux(),
        });
      }
      states[id] = 'found';
    }
    if (!ltr) {
      level.reverse();
      add({
        title: `Reverse level ${depth}`, desc: `This level reads right → left, so reverse it: ${fmtList(level)}.`,
        logic: 'Odd-numbered levels (1, 3, 5, …) are flipped; even levels are kept as they are.', tone: 'warn',
        j: J.rev, p: P.rev, a: 3, vars: vars('—'), aux: aux(),
      });
    } else {
      add({
        title: `Keep level ${depth}`, desc: `Direction is left → right, so ${fmtList(level)} stays unchanged.`,
        logic: 'No reversal needed on even-numbered levels.',
        j: J.keep, p: P.keep, a: 3, vars: vars('—'), aux: aux(),
      });
    }
    result.push(level);
    ltr = !ltr;
    add({
      title: `Level ${depth} saved`, desc: `Append to the result and flip the direction for the next level.`,
      logic: queue.length ? 'The queue now holds exactly the next level.' : 'No more nodes — done.', tone: 'success',
      j: J.done, p: P.done, a: 3, vars: vars('—'), aux: aux(),
    });
    level = [];
    depth++;
  }

  const out = fmtLists(result);
  add({
    title: 'Done', desc: `Result: ${out}`, logic: 'Alternating directions, top to bottom.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('—'), aux: aux(), result: { title: out, text: 'Zigzag level-order traversal' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: (_m, s) => `q.add(root) → q = [${auxItems(s, 'queue')[0]}]; leftToRight = true` },
    { on: /^Level (\d+) \((L→R|R→L)\)/, tag: (m) => `LEVEL ${m[1]} —`, note: (m, s) => `leftToRight = ${m[2] === 'L→R'}; size = q.size() = ${s.vars.node === '—' ? auxItems(s, 'queue').length : auxItems(s, 'queue').length}` },
    { on: /^Dequeue (-?\d+)/, tag: 'DEQUEUE —', note: (m) => `level.add(${m[1]})`, algoStep: 1 },
    { on: /^Enqueue children of (-?\d+)/, tag: 'ENQUEUE —', note: (m, s) => `q.add(children of ${m[1]}) → q = [${auxItems(s, 'queue').join(', ')}]`, algoStep: 2 },
    { on: /^Reverse level (\d+)/, tag: '🔀 REVERSE —', note: (m) => `Collections.reverse(level) for level ${m[1]}` },
    { on: /^Keep level (\d+)/, tag: 'KEEP —', note: (m) => `leftToRight → level ${m[1]} stays as collected` },
    { on: /^Level (\d+) saved/, tag: 'SAVE —', note: (_m, s) => `res.add(level); leftToRight = ${s.vars.direction === 'L→R' ? 'true' : 'false'}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return res → ${s.result?.title}`, desc: (_m, s) => `Every level was collected left to right and reversed on every second level. Result: ${s.result?.title}.`, algoStep: 4 },
  ]);
}

export const zigzagLevelOrder: ProblemDef<TreeIn> = {
  slug: '103-binary-tree-zigzag-level-order',
  id: '103', title: 'Binary Tree Zigzag Level Order', difficulty: 'Medium', category: 'Tree', tag: 'BFS + deque',
  statement: 'Return the level-order traversal of a binary tree, but alternate direction: the first level left to right, the second right to left, the third left to right again, and so on.',
  constraints: '0 ≤ nodes ≤ 2000 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '3 9 20 null null 15 7', input: { tokens: [3, 9, 20, null, null, 15, 7] }, output: '[[3],[20,9],[15,7]]' },
    { label: '1 2 3 4 null null 5', input: { tokens: [1, 2, 3, 4, null, null, 5] }, output: '[[1],[3,2],[4,5]]' },
    { label: '1 2 3 4 5 6 7', input: { tokens: [1, 2, 3, 4, 5, 6, 7] }, output: '[[1],[3,2],[4,5,6,7]]' },
  ],
  inputPlaceholder: 'e.g. 3 9 20 null null 15 7',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Being processed', state: 'active' }, { label: 'Waiting in queue', state: 'compare' }, { label: 'Visited', state: 'found' }],
  varLabels: ['level', 'direction', 'node'],
  emphasis: ['zigzag', 'left to right', 'alternating'],
  phases: [
    { icon: '📥', label: 'Queue the root', tone: 'blue' },
    { icon: '📏', label: 'Freeze size, collect', tone: 'cyan' },
    { icon: '📥', label: 'Enqueue children', tone: 'green' },
    { icon: '🔀', label: 'Reverse or keep, save', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Level order, then flip every other level',
    text: 'Traverse level by level with an ordinary queue and flip a boolean after each level. When the flag says right-to-left, reverse the finished level list before saving it.',
  },
  java, python,
  algorithm: [
    'Queue the root; start with leftToRight = true',
    'Freeze size = q.size() and collect that many nodes in queue order',
    'Queue their children (left, then right)',
    'Reverse the level if leftToRight is false, save it, and flip the flag',
    'Return the zigzag result',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(w)' }],
  why: 'The queue order of a level is always left to right, so every level is correct before the flag is consulted. Reversing a level of k values costs O(k), so all reversals together cost O(n). The traversal order of children does not depend on the direction, which keeps the next level consistent.',
};
