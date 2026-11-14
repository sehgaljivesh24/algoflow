import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, listAux, parseTree, queueAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public List<Double> averageOfLevels(TreeNode root) {',
  '    List<Double> res = new ArrayList<>();',
  '    Queue<TreeNode> q = new LinkedList<>();',
  '    q.add(root);',
  '    while (!q.isEmpty()) {',
  '        int size = q.size();',
  '        long sum = 0;',
  '        for (int i = 0; i < size; i++) {',
  '            TreeNode node = q.poll();',
  '            sum += node.val;',
  '            if (node.left != null) q.add(node.left);',
  '            if (node.right != null) q.add(node.right);',
  '        }',
  '        res.add((double) sum / size);',
  '    }',
  '    return res;',
  '}',
];
const python = [
  'def average_of_levels(root):',
  '    res, q = [], deque([root])',
  '    while q:',
  '        size = len(q)',
  '        total = 0',
  '        for _ in range(size):',
  '            node = q.popleft()',
  '            total += node.val',
  '            if node.left:',
  '                q.append(node.left)',
  '            if node.right:',
  '                q.append(node.right)',
  '        res.append(total / size)',
  '    return res',
];
const J = {
  start: find(java, 'q.add(root)'), size: find(java, 'int size', 'long sum'), poll: find(java, 'q.poll()', 'sum += node.val'),
  kids: find(java, 'node.left != null', 'node.right != null'), done: find(java, 'res.add('), ret: find(java, 'return res'),
};
const P = {
  start: find(python, 'res, q ='), size: find(python, 'size = len(q)', 'total = 0'), poll: find(python, 'popleft', 'total += node.val'),
  kids: find(python, 'if node.left', 'q.append(node.left)', 'if node.right', 'q.append(node.right)'), done: find(python, 'res.append'), ret: find(python, 'return res'),
};

export const fmtAvg = (sum: number, n: number) => String(Number((sum / n).toFixed(5)));

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const queue: number[] = [];
  const avgs: string[] = [];
  let depth = 0;
  let size = 0;
  let sum = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [queueAux('queue (front → back)', queue.map(val)), listAux('averages', avgs)];
  const vars = (node: number | string) => ({ level: depth, size, sum, node });

  queue.push(0);
  states[0] = 'compare';
  add({
    title: 'Start', tag: 'START —', desc: `queue the root ${val(0)}; for each level we will add up its values and divide by how many nodes it has.`,
    logic: 'This is plain level-order traversal; the only extra state is a running sum per level.',
    j: J.start, p: P.start, a: 0, vars: vars('—'), aux: aux(), note: `queue = [${val(0)}]`,
  });

  while (queue.length) {
    size = queue.length;
    sum = 0;
    add({
      title: `Level ${depth}: size = ${size}`, tag: 'LEVEL:', desc: `level ${depth} holds ${size} node${size === 1 ? '' : 's'} (${queue.map(val).join(', ')}); freeze size = ${size} and reset the running sum to 0.`,
      logic: 'Freeze the size now — it is both the loop bound and the divisor for the average.',
      j: J.size, p: P.size, a: 1, vars: vars('—'), aux: aux(), note: `size = ${size}, sum = 0`,
    });
    for (let i = 0; i < size; i++) {
      const id = queue.shift()!;
      const before = sum;
      sum += val(id);
      states[id] = 'active';
      labels[id] = `Σ${sum}`;
      add({
        title: `Dequeue ${val(id)}`, tag: 'POLL:', desc: `dequeue ${val(id)} (node ${i + 1} of ${size} in level ${depth}) and add it to the level sum: ${before} + ${val(id)} = ${sum}.`,
        logic: 'Poll, accumulate. The label on the node shows the running sum after it was added.',
        j: J.poll, p: P.poll, a: 2, vars: vars(val(id)), aux: aux(), note: `sum = ${before} + ${val(id)} = ${sum}`,
      });
      const kids = [nodes[id].left, nodes[id].right].filter((c): c is number => c !== null);
      for (const c of kids) {
        queue.push(c);
        states[c] = 'compare';
      }
      if (kids.length) {
        add({
          title: `Enqueue children of ${val(id)}`, tag: 'PUSH:', desc: `queue the children ${kids.map((c) => val(c)).join(' and ')} of ${val(id)} behind this level, for the next level.`,
          logic: 'They go behind the current level, so they are not part of this level’s sum.', tone: 'success',
          j: J.kids, p: P.kids, a: 2, vars: vars(val(id)), aux: aux(), note: `queue += [${kids.map((c) => val(c)).join(', ')}]`,
        });
      }
      states[id] = 'found';
    }
    const avg = fmtAvg(sum, size);
    avgs.push(avg);
    add({
      title: `Level ${depth} average = ${avg}`, tag: 'AVERAGE:', desc: `level ${depth} is complete: ${sum} / ${size} = ${avg}, appended to the result.`,
      logic: 'Sum divided by node count of this level.', tone: 'success',
      j: J.done, p: P.done, a: 3, vars: vars('—'), aux: aux(), note: `res.add(${sum} / ${size} = ${avg})`,
    });
    depth++;
  }

  const out = `[${avgs.join(', ')}]`;
  add({
    title: 'Done', tag: '✅ Done!', desc: `the queue is empty, so every level has its average, listed top to bottom: ${out}.`, logic: 'Results are in top-to-bottom order.', tone: 'success',
    j: J.ret, p: P.ret, a: 4, vars: vars('—'), aux: aux(), note: `return ${out}`, result: { title: out, text: 'Average of each level' },
  });
  return steps;
}

export const averageOfLevels: ProblemDef<TreeIn> = {
  slug: '637-average-of-levels-in-binary-tree',
  id: '637', title: 'Average of Levels in Binary Tree', difficulty: 'Easy', category: 'Tree', tag: 'BFS',
  statement: 'Given the root of a binary tree, return the average value of the nodes on each level, from the top level down.',
  constraints: '1 ≤ nodes ≤ 10⁴ (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '3 9 20 null null 15 7', input: { tokens: [3, 9, 20, null, null, 15, 7] }, output: '[3, 14.5, 11]' },
    { label: '3 9 20 15 7', input: { tokens: [3, 9, 20, 15, 7] }, output: '[3, 14.5, 11]' },
    { label: '1 2 3 4 5 6 7', input: { tokens: [1, 2, 3, 4, 5, 6, 7] }, output: '[1, 2.5, 5.5]' },
  ],
  inputPlaceholder: 'e.g. 3 9 20 null null 15 7',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being processed', state: 'active' }, { label: 'Waiting in queue', state: 'compare' }, { label: 'Counted', state: 'found' }],
  varLabels: ['level', 'size', 'sum', 'node'],
  approach: {
    title: 'Level-order with a running sum',
    text: 'Run BFS one level at a time. Snapshot the queue size, add up that many dequeued values, and divide the sum by the size to get that level’s average.',
  },
  java, python,
  phases: [
    { icon: '🌱', label: 'Queue the root', tone: 'blue' },
    { icon: '📏', label: 'Freeze level size', tone: 'cyan' },
    { icon: '➕', label: 'Poll, add, push kids', tone: 'green' },
    { icon: '📊', label: 'Level average', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['average value', 'each level'],
  algorithm: [
    'Queue the root',
    'For each level read size = q.size() and reset sum = 0',
    'Dequeue size nodes, add their values, queue their children',
    'Append sum / size to the result',
    'Done: the queue is empty, return the list of averages',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(w)' }],
  why: 'Each node is queued and dequeued once, contributing to exactly one level’s sum. Snapshotting the size guarantees the sum and the divisor describe the same level. Use a 64-bit sum: a level of many large values can overflow an int before you divide.',
};
