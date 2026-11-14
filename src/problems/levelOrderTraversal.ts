import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { buildTree, emitter, find, fmtList, fmtLists, listAux, parseTree, queueAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public List<List<Integer>> levelOrder(TreeNode root) {',
  '    List<List<Integer>> res = new ArrayList<>();',
  '    if (root == null) return res;',
  '    Queue<TreeNode> q = new LinkedList<>();',
  '    q.add(root);',
  '    while (!q.isEmpty()) {',
  '        int size = q.size();',
  '        List<Integer> level = new ArrayList<>();',
  '        for (int i = 0; i < size; i++) {',
  '            TreeNode node = q.poll();',
  '            level.add(node.val);',
  '            if (node.left != null) q.add(node.left);',
  '            if (node.right != null) q.add(node.right);',
  '        }',
  '        res.add(level);',
  '    }',
  '    return res;',
  '}',
];
const python = [
  'def level_order(root):',
  '    if not root:',
  '        return []',
  '    res, q = [], deque([root])',
  '    while q:',
  '        level = []',
  '        for _ in range(len(q)):',
  '            node = q.popleft()',
  '            level.append(node.val)',
  '            if node.left:',
  '                q.append(node.left)',
  '            if node.right:',
  '                q.append(node.right)',
  '        res.append(level)',
  '    return res',
];
const J = {
  start: find(java, 'q.add(root)'), size: find(java, 'int size', 'List<Integer> level'),
  poll: find(java, 'q.poll()', 'level.add'), kids: find(java, 'node.left != null', 'node.right != null'),
  done: find(java, 'res.add(level)'), ret: find(java, ['return res;', 2]),
};
const P = {
  start: find(python, 'res, q ='), size: find(python, 'level = []', 'for _ in range'),
  poll: find(python, 'popleft', 'level.append'), kids: find(python, 'if node.left', 'q.append(node.left)', 'if node.right', 'q.append(node.right)'),
  done: find(python, 'res.append'), ret: find(python, 'return res'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const queue: number[] = [];
  const result: number[][] = [];
  let level: number[] = [];
  let depth = 0;
  let size = 0;
  let visited = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [
    queueAux('queue (front → back)', queue.map(val)),
    listAux('current level', level),
    listAux('result', result.map(fmtList)),
  ];
  const vars = () => ({ level: depth, visited, 'q.size': queue.length, 'level size': size || '—' });
  const q = () => (queue.length ? `[${queue.map(val).join(', ')}]` : '[ ]');

  queue.push(0);
  states[0] = 'compare';
  add({
    title: 'Start', tag: '📥 ENQUEUE —',
    desc: `Put the root ${val(0)} in the queue. The queue holds the nodes waiting to be visited, level by level, left to right.`,
    note: `q.add(root) → q = ${q()}`,
    logic: 'A queue is first-in, first-out, so nodes of the same depth come out together before any deeper node.',
    j: J.start, p: P.start, a: 0, vars: vars(), aux: aux(),
  });

  while (queue.length) {
    size = queue.length;
    add({
      title: `Level ${depth}: size = ${size}`, tag: `🌊 LEVEL ${depth}:`,
      desc: `The queue holds ${size} node${size === 1 ? '' : 's'} ${q()}. Freeze that number: exactly ${size} dequeue${size === 1 ? ' makes' : 's make'} up this level.`,
      note: `size = q.size() = ${size}`,
      logic: 'Children we enqueue while looping belong to the NEXT level, so we must not count them in this one.',
      j: J.size, p: P.size, a: 1, vars: vars(), aux: aux(),
    });
    for (let i = 0; i < size; i++) {
      const id = queue.shift()!;
      level.push(val(id));
      visited++;
      states[id] = 'active';
      labels[id] = `L${depth}`;
      add({
        title: `Dequeue ${val(id)}`, tag: '⚙️ PROCESS —',
        desc: `Take ${val(id)} from the front of the queue and add it to level ${depth} (${i + 1} of ${size}). Level so far: ${fmtList(level)}.`,
        note: `node = ${val(id)}; level.add(${val(id)}) → level = ${fmtList(level)}`,
        logic: 'Poll from the front, record the value. Its children are queued behind everything already waiting.',
        j: J.poll, p: P.poll, a: 2, vars: vars(), aux: aux(),
      });
      const kids = [nodes[id].left, nodes[id].right].filter((c): c is number => c !== null);
      for (const c of kids) {
        queue.push(c);
        states[c] = 'compare';
      }
      if (kids.length) {
        add({
          title: `Enqueue children of ${val(id)}`, tag: '📥 ENQUEUE —',
          desc: `${val(id)} has ${kids.length === 2 ? 'two children' : 'one child'}: add ${kids.map((c) => val(c)).join(' then ')} to the back. Queue is now ${q()}.`,
          note: `q.add(${kids.map((c) => val(c)).join('), q.add(')}) → q.size = ${queue.length}`,
          logic: 'Left child first, then right, so the next level also reads left to right.', tone: 'success',
          j: J.kids, p: P.kids, a: 3, vars: vars(), aux: aux(),
        });
      } else {
        add({
          title: `${val(id)} is a leaf`, tag: '📥 NO CHILDREN —',
          desc: `${val(id)} has no children, so nothing is added to the queue (q.size stays ${queue.length}).`,
          note: `node.left == null && node.right == null → q.size = ${queue.length}`,
          logic: 'A leaf adds no work; the loop simply moves on to the next node of this level.',
          j: J.kids, p: P.kids, a: 3, vars: vars(), aux: aux(),
        });
      }
      states[id] = 'found';
    }
    result.push(level);
    add({
      title: `Level ${depth} complete`, tag: `🌊 LEVEL ${depth} DONE:`,
      desc: `Level ${depth} = ${fmtList(level)}. Append it to the result; ${queue.length ? `the queue now holds the next level ${q()}.` : 'the queue is empty, so there is no deeper level.'}`,
      note: `res.add(${fmtList(level)}) → res has ${result.length} level${result.length === 1 ? '' : 's'}`,
      logic: queue.length ? 'The queue now holds exactly the next level.' : 'Queue empty — there is no deeper level.', tone: 'success',
      j: J.done, p: P.done, a: 4, vars: vars(), aux: aux(),
    });
    level = [];
    depth++;
  }

  size = 0;
  const out = fmtLists(result);
  add({
    title: 'Done', tag: '✅ Complete!',
    desc: `The queue is empty after ${plural(visited, 'node')} in ${plural(result.length, 'level')}. Result: ${out}`,
    note: `return res → ${out}`,
    logic: `${result.length} level${result.length === 1 ? '' : 's'}, visited top to bottom.`, tone: 'success',
    j: J.ret, p: P.ret, a: 5, vars: vars(), aux: aux(), result: { title: out, text: 'Level-order traversal' },
  });
  return steps;
}

export const levelOrderTraversal: ProblemDef<TreeIn> = {
  slug: '102-binary-tree-level-order-traversal',
  id: '102', title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', category: 'Tree', tag: 'BFS',
  statement: 'Given the root of a binary tree, return the values of its nodes grouped by depth: first the root, then its children left to right, then the grandchildren, and so on.',
  constraints: '0 ≤ nodes ≤ 2000 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '3 9 20 null null 15 7', input: { tokens: [3, 9, 20, null, null, 15, 7] }, output: '[[3],[9,20],[15,7]]', answer: '[[3],[9,20],[15,7]] (3 levels)' },
    { label: '1 2 3 4 5 null 6', input: { tokens: [1, 2, 3, 4, 5, null, 6] }, output: '[[1],[2,3],[4,5,6]]' },
    { label: '1 null 2 null 3', input: { tokens: [1, null, 2, null, 3] }, output: '[[1],[2],[3]]' },
  ],
  inputPlaceholder: 'e.g. 3 9 20 null null 15 7',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being processed', state: 'active' }, { label: 'Waiting in queue', state: 'compare' }, { label: 'Visited (label = level)', state: 'found' }],
  varLabels: ['level', 'visited', 'q.size', 'level size'],
  emphasis: ['grouped by depth', 'left to right'],
  phases: [
    { icon: '📥', label: 'Enqueue root', tone: 'blue' },
    { icon: '🌊', label: 'Freeze level size', tone: 'cyan' },
    { icon: '⚙️', label: 'Process', tone: 'green' },
    { icon: '📥', label: 'Enqueue children', tone: 'cyan' },
    { icon: '🌊', label: 'Level done', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS with a level-size snapshot',
    text: 'Use a queue. At the start of each round, read q.size() — that is the number of nodes in the current level. Dequeue exactly that many, collecting values and queueing their children for the next round.',
  },
  java, python,
  algorithm: [
    'Queue the root',
    'While the queue is non-empty, freeze size = q.size()',
    'Dequeue size nodes into the current level list',
    'Enqueue each dequeued node’s children behind the rest',
    'Append the level to the result; the queue now holds the next level',
    'The queue is empty: return the result',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(w)' }],
  why: 'Every node enters and leaves the queue once. Because the queue is FIFO and children are appended behind all nodes of the current depth, when a round starts the queue holds exactly one full level; snapshotting its size separates that level from the children added during the round. The queue never holds more than two adjacent levels, so space is the tree’s maximum width w.',
};
