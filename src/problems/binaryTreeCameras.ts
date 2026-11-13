import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'int cameras = 0;',
  'public int minCameraCover(TreeNode root) {',
  '    if (dfs(root) == 0) cameras++;                  // the root itself is still uncovered',
  '    return cameras;',
  '}',
  '// 0 = not covered, 1 = has a camera, 2 = covered without a camera',
  'private int dfs(TreeNode node) {',
  '    if (node == null) return 2;                     // nothing to cover',
  '    int left = dfs(node.left), right = dfs(node.right);',
  '    if (left == 0 || right == 0) {                  // a child is uncovered: a camera must go here',
  '        cameras++;',
  '        return 1;',
  '    }',
  '    return (left == 1 || right == 1) ? 2 : 0;       // covered by a child camera, else wait for the parent',
  '}',
];
const python = [
  'def min_camera_cover(root):',
  '    cameras = 0',
  '    # 0 = not covered, 1 = has a camera, 2 = covered without a camera',
  '    def dfs(node):',
  '        nonlocal cameras',
  '        if not node:',
  '            return 2                                # nothing to cover',
  '        left, right = dfs(node.left), dfs(node.right)',
  '        if left == 0 or right == 0:                 # a child is uncovered: a camera must go here',
  '            cameras += 1',
  '            return 1',
  '        return 2 if (left == 1 or right == 1) else 0   # covered by a child camera, else wait for the parent',
  '    if dfs(root) == 0:                              # the root itself is still uncovered',
  '        cameras += 1',
  '    return cameras',
];
const J = { start: find(java, 'if (dfs(root) == 0)'), visit: find(java, 'if (node == null)', 'int left = dfs'), cam: find(java, 'if (left == 0 || right == 0)', 'cameras++;', 'return 1;'), no: find(java, 'return (left == 1'), fin: find(java, 'return cameras;') };
const P = { start: find(python, 'if dfs(root) == 0'), visit: find(python, 'if not node', 'left, right = dfs'), cam: find(python, 'if left == 0 or right == 0', 'cameras += 1', 'return 1'), no: find(python, 'return 2 if'), fin: find(python, 'return cameras') };

const NAME = ['gap', 'cam', 'ok'];
const ST: CellState[] = ['error', 'swap', 'found'];

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let cameras = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, left: number | string, right: number | string) => ({ node, left, right, cameras });
  const setState = (id: number, s: number) => {
    states[id] = ST[s];
    labels[id] = NAME[s];
  };
  const fmt = (s: number | null) => (s === null ? 'null (2, covered)' : `${s} (${NAME[s]})`);

  add({
    title: 'Three states per node', desc: 'Every node ends up in one of three states: 0 = not covered yet ("gap"), 1 = holds a camera ("cam"), 2 = covered by a neighbour\'s camera ("ok"). A camera watches its parent, its children and itself.',
    logic: 'Greedy from the bottom: never put a camera on a leaf, put it on the leaf\'s parent, because that covers strictly more.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—'), aux: aux(),
    tag: 'STATES —', note: '0 = gap, 1 = camera, 2 = covered; null counts as 2',
  });

  const dfs = (id: number): number => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    add({
      title: `Visit node ${val(id)}`, desc: `Call dfs(${val(id)}). A missing child counts as "covered" (2) so it never forces a camera.`,
      logic: 'Post-order: decide a node only after learning the states of both children.', j: J.visit, p: P.visit, a: 1, vars: vars(val(id), '?', '?'), aux: aux(),
      tag: 'VISIT —', note: `dfs(node ${val(id)}): children report first`,
    });
    const n = nodes[id];
    const l = n.left === null ? 2 : dfs(n.left);
    const r = n.right === null ? 2 : dfs(n.right);
    let res: number;
    let text: string;
    if (l === 0 || r === 0) {
      cameras++;
      res = 1;
      for (const c of [n.left, n.right]) if (c !== null && (c === n.left ? l : r) === 0) setState(c, 2);
      text = `A child is a "gap", so put a camera here (cameras = ${cameras}); it covers the child${l === 0 && r === 0 ? 'ren' : ''} and this node's parent.`;
    } else if (l === 1 || r === 1) {
      res = 2;
      text = 'A child holds a camera, so this node is covered and needs nothing.';
    } else {
      res = 0;
      text = 'Both children are covered but neither has a camera, so this node is a "gap": its parent will have to cover it.';
    }
    setState(id, res);
    add({
      title: `Node ${val(id)} → ${NAME[res]}`, desc: `Left ${fmt(n.left === null ? null : l)}, right ${fmt(n.right === null ? null : r)}. ${text}`,
      logic: res === 1 ? 'A camera is forced here: the only other fixes would be one camera per child.' : res === 2 ? 'No cost: coverage came for free from below.' : 'Postponing the decision to the parent covers this node and more.',
      tone: res === 1 ? 'success' : res === 0 ? 'warn' : 'info', j: res === 1 ? J.cam : J.no, p: res === 1 ? P.cam : P.no, a: res === 1 ? 2 : 3, vars: vars(val(id), l, r), aux: aux(),
      tag: res === 1 ? 'CAMERA —' : res === 2 ? 'COVERED —' : 'GAP —',
      note: `left = ${l} (${NAME[l]}), right = ${r} (${NAME[r]}) → return ${res}${res === 1 ? `, cameras = ${cameras}` : ''}`,
      ...(res === 0 ? { alert: `Node ${val(id)} stays uncovered for now: its parent must cover it.` } : {}),
    });
    stack.pop();
    return res;
  };

  const rootState = dfs(0);
  if (rootState === 0) {
    cameras++;
    setState(0, 1);
    add({
      title: 'Root is still a gap', desc: `The root has no parent to cover it, so it gets its own camera (cameras = ${cameras}).`,
      logic: 'This is the one case where the greedy rule leaves a node uncovered at the very end.', tone: 'success', j: J.start, p: P.start, a: 4, vars: vars(Number(nodes[0].value), '—', '—'), aux: aux(),
      tag: 'ROOT FIX —', note: `dfs(root) = 0 → cameras = ${cameras}`,
    });
  }
  add({
    title: 'Done', desc: `${cameras} camera${cameras === 1 ? '' : 's'} (purple) watch every node.`,
    logic: 'Every node is a camera or covered, and the greedy bottom-up rule used each camera as high as it could be.', tone: 'success',
    j: J.fin, p: P.fin, a: 4, vars: vars('—', '—', '—'), aux: aux(), tag: '✅ Done!', note: `return cameras = ${cameras}`, result: { title: String(cameras), text: 'Minimum cameras' },
  });
  return steps;
}

export const binaryTreeCameras: ProblemDef<TreeIn> = {
  slug: '968-binary-tree-cameras',
  id: '968', title: 'Binary Tree Cameras', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'tree DP · 3 states',
  statement: 'Place cameras on tree nodes. A camera watches its parent, itself and its direct children. Return the fewest cameras needed so that every node is watched. (Node values are irrelevant — only the shape matters.)',
  constraints: '1 ≤ nodes ≤ 1000 (animation input: ≤ 12 nodes; write the shape in level order, e.g. 0 0 null 0 0)',
  examples: [
    { label: '0 0 null 0 0', input: { tokens: [0, 0, null, 0, 0] }, output: '1' },
    { label: '0 0 null 0 null 0 null null 0', input: { tokens: [0, 0, null, 0, null, 0, null, null, 0] }, output: '2' },
    { label: '0 0 0 0 0 0 0', input: { tokens: [0, 0, 0, 0, 0, 0, 0] }, output: '2' },
  ],
  inputPlaceholder: 'level order, e.g. 0 0 null 0 0',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Camera', state: 'swap' }, { label: 'Covered (no camera)', state: 'found' }, { label: 'Not covered yet', state: 'error' }],
  varLabels: ['node', 'left', 'right', 'cameras'],
  emphasis: ['fewest cameras', 'every node is watched'],
  phases: [
    { icon: '🚦', label: 'Three states: gap / camera / covered', tone: 'blue' },
    { icon: '⬇️', label: 'Children first (post-order)', tone: 'cyan' },
    { icon: '📷', label: 'Child is a gap → camera here', tone: 'gold' },
    { icon: '🛡️', label: 'Covered or gap', tone: 'cyan' },
    { icon: '✅', label: 'Root fix, done', tone: 'green' },
  ],
  approach: {
    title: 'Post-order with three coverage states',
    text: 'Return 0 (not covered), 1 (camera) or 2 (covered) from every node, with null counting as 2. If a child is uncovered, place a camera here. If a child has a camera, this node is covered. Otherwise report "not covered" and let the parent fix it. If the root ends up uncovered, add one more camera.',
  },
  java, python,
  algorithm: [
    'State of a node: 0 = uncovered, 1 = camera, 2 = covered; null counts as 2',
    'Evaluate the children first (post-order)',
    'If either child is 0: place a camera here and return 1',
    'Else return 2 if a child has a camera, otherwise 0',
    'If the root returns 0, add one camera',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'An uncovered node can only be fixed by a camera on itself, on a child, or on its parent. Placing it on the parent covers the node, the parent, the parent’s other child and the grandparent, so it dominates the other two choices; hence cameras go on the parents of uncovered nodes. Working bottom-up applies this exactly when a child reports "uncovered", and the three states capture everything a parent needs to know about a subtree.',
};
