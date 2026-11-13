import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules, auxItems } from './annotate.ts';
import { buildTree, emitter, find, fmtList, listAux, parseTree, queueAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public List<Integer> rightSideView(TreeNode root) {',
  '    List<Integer> view = new ArrayList<>();',
  '    if (root == null) return view;',
  '    Queue<TreeNode> q = new LinkedList<>();',
  '    q.add(root);',
  '    while (!q.isEmpty()) {',
  '        int size = q.size();',
  '        for (int i = 0; i < size; i++) {',
  '            TreeNode node = q.poll();',
  '            if (i == size - 1) view.add(node.val);',
  '            if (node.left != null) q.add(node.left);',
  '            if (node.right != null) q.add(node.right);',
  '        }',
  '    }',
  '    return view;',
  '}',
];
const python = [
  'def right_side_view(root):',
  '    if not root:',
  '        return []',
  '    view, q = [], deque([root])',
  '    while q:',
  '        size = len(q)',
  '        for i in range(size):',
  '            node = q.popleft()',
  '            if i == size - 1:',
  '                view.append(node.val)',
  '            if node.left:',
  '                q.append(node.left)',
  '            if node.right:',
  '                q.append(node.right)',
  '    return view',
];
const J = {
  start: find(java, 'q.add(root)'), size: find(java, 'int size', 'for (int i'), poll: find(java, 'q.poll()'), last: find(java, 'if (i == size - 1)'),
  kids: find(java, 'node.left != null', 'node.right != null'), ret: find(java, ['return view;', 2]),
};
const P = {
  start: find(python, 'view, q ='), size: find(python, 'size = len(q)', 'for i in range'), poll: find(python, 'popleft'), last: find(python, 'if i == size - 1', 'view.append'),
  kids: find(python, 'if node.left', 'q.append(node.left)', 'if node.right', 'q.append(node.right)'), ret: find(python, 'return view'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const queue: number[] = [];
  const view: number[] = [];
  let depth = 0;
  let size = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [queueAux('queue (front → back)', queue.map(val)), listAux('right side view', view)];
  const vars = (node: number | string, i: number | string) => ({ level: depth, size, i, node });

  queue.push(0);
  states[0] = 'compare';
  add({
    title: 'Start', desc: 'Standing on the right, you see the last node of every level. Walk the tree level by level.',
    logic: 'Nodes further left on a level are hidden behind the rightmost one — unless the right side of that level is empty.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—'), aux: aux(),
  });

  while (queue.length) {
    size = queue.length;
    add({
      title: `Level ${depth}: size = ${size}`, desc: `${size} node${size === 1 ? '' : 's'} on this level; only the one at index ${size - 1} is visible.`,
      logic: 'Snapshot the size so we know which dequeue is the last node of the level.',
      j: J.size, p: P.size, a: 1, vars: vars('—', '—'), aux: aux(),
    });
    for (let i = 0; i < size; i++) {
      const id = queue.shift()!;
      states[id] = 'active';
      add({
        title: `Dequeue ${val(id)} (i = ${i})`, desc: `Take ${val(id)} from the front. Is it the last of the level? i = ${i}, size − 1 = ${size - 1}.`,
        logic: 'Dequeue order is left to right, so the last dequeue of a round is the rightmost node.',
        j: J.poll, p: P.poll, a: 2, vars: vars(val(id), i), aux: aux(),
      });
      const last = i === size - 1;
      if (last) {
        view.push(val(id));
        labels[id] = 'seen';
        add({
          title: `${val(id)} is visible`, desc: `i = size − 1, so ${val(id)} is the rightmost node of level ${depth}. Add it to the view.`,
          logic: 'This node hides everything to its left on the same level.', tone: 'success',
          j: J.last, p: P.last, a: 2, vars: vars(val(id), i), aux: aux(),
        });
      }
      const kids = [nodes[id].left, nodes[id].right].filter((c): c is number => c !== null);
      for (const c of kids) {
        queue.push(c);
        states[c] = 'compare';
      }
      if (kids.length) {
        add({
          title: `Enqueue children of ${val(id)}`, desc: `Queue ${kids.map((c) => val(c)).join(' and ')} for the next level.`,
          logic: 'Always left then right — the right-most node of the next level then ends up last.',
          j: J.kids, p: P.kids, a: 3, vars: vars(val(id), i), aux: aux(),
        });
      }
      states[id] = last ? 'found' : 'dim';
    }
    depth++;
  }

  const out = fmtList(view);
  add({
    title: 'Done', desc: `One visible node per level: ${out}`, logic: 'Hidden nodes are faded; visible nodes are green.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('—', '—'), aux: aux(), result: { title: out, text: 'Right side view' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: (_m, s) => `q.add(root) → q = [${auxItems(s, 'queue')[0]}]`, desc: 'Standing on the right you see the last node of every level. Queue the root and walk the tree level by level.' },
    { on: /^Level (\d+): size = (\d+)/, tag: (m) => `LEVEL ${m[1]} —`, note: (m) => `size = q.size() = ${m[2]}; visible index = ${Number(m[2]) - 1}` },
    { on: /^Dequeue (-?\d+) \(i = (\d+)\)/, tag: 'DEQUEUE —', note: (m, s) => `node = ${m[1]}; i = ${m[2]} ${Number(m[2]) === Number(s.vars.size) - 1 ? '==' : '<'} size − 1 = ${Number(s.vars.size) - 1}` },
    { on: /^(-?\d+) is visible/, tag: '👁 VISIBLE —', note: (m) => `view.add(${m[1]})` },
    { on: /^Enqueue children of (-?\d+)/, tag: 'ENQUEUE —', note: (m, s) => `q.add(children of ${m[1]}) → q = [${auxItems(s, 'queue').join(', ')}]` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return view → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const rightSideView: ProblemDef<TreeIn> = {
  slug: '199-binary-tree-right-side-view',
  id: '199', title: 'Binary Tree Right Side View', difficulty: 'Medium', category: 'Tree', tag: 'BFS last node',
  statement: 'Imagine standing to the right of a binary tree. Return the values of the nodes you can see, ordered from top to bottom.',
  constraints: '0 ≤ nodes ≤ 100 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 2 3 null 5 null 4', input: { tokens: [1, 2, 3, null, 5, null, 4] }, output: '[1,3,4]' },
    { label: '1 2 3 4', input: { tokens: [1, 2, 3, 4] }, output: '[1,3,4]' },
    { label: '1 null 3', input: { tokens: [1, null, 3] }, output: '[1,3]' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 null 5 null 4',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Being processed', state: 'active' }, { label: 'Waiting in queue', state: 'compare' }, { label: 'Visible from the right', state: 'found' }, { label: 'Hidden', state: 'dim' }],
  varLabels: ['level', 'size', 'i', 'node'],
  emphasis: ['right', 'top to bottom', 'see'],
  phases: [
    { icon: '📥', label: 'Queue the root', tone: 'blue' },
    { icon: '📏', label: 'Freeze level size', tone: 'cyan' },
    { icon: '👁️', label: 'Dequeue: last = visible', tone: 'gold' },
    { icon: '📥', label: 'Enqueue children', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS, keep the last node of each level',
    text: 'Traverse level by level. Within a level the nodes leave the queue left to right, so the one dequeued when i == size − 1 is the rightmost; that is the node a viewer on the right sees.',
  },
  java, python,
  algorithm: [
    'Queue the root',
    'Freeze size = q.size() for the current level',
    'Dequeue size nodes; the node at i == size − 1 goes into the view',
    'Queue every dequeued node’s children and repeat for the next level',
    'Return the view after the last level',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(w)' }],
  why: 'Each level contributes exactly one visible node: the rightmost one on that depth. The rightmost node need not be a right child (a left child is visible when the right side of that level is empty), which is why we take the last node of each BFS level instead of walking only right pointers.',
};
