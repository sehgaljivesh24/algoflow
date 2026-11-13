import type { CellState, ProblemDef, Step, TreeNodeVM } from '../engine/types';
import { annotateRules } from './annotate.ts';

interface In { tokens: (number | null)[] }

/** LeetCode-style level order: "3 9 20 null null 15 7". */
function parse(raw: string): In {
  const tokens = raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.toLowerCase() === 'null' || t === '#' ? null : Number(t)));
  if (!tokens.length || tokens[0] === null || tokens.some((t) => t !== null && !Number.isInteger(t))) {
    throw new Error('Level-order numbers with "null" for gaps, e.g. 3 9 20 null null 15 7');
  }
  if (tokens.filter((t) => t !== null).length > 12) throw new Error('Use 12 nodes or fewer');
  return { tokens };
}

/** Build nodes the way LeetCode serialises trees (children of null are not listed). */
export function buildTree(tokens: (number | null)[]): TreeNodeVM[] {
  const nodes: TreeNodeVM[] = [];
  const queue: number[] = [];
  const make = (v: number) => {
    const node: TreeNodeVM = { id: nodes.length, value: v, left: null, right: null };
    nodes.push(node);
    return node.id;
  };
  queue.push(make(tokens[0]!));
  let i = 1;
  while (queue.length && i < tokens.length) {
    const parent = nodes[queue.shift()!];
    for (const side of ['left', 'right'] as const) {
      if (i >= tokens.length) break;
      const t = tokens[i++];
      if (t !== null) {
        parent[side] = make(t);
        queue.push(parent[side]!);
      }
    }
  }
  return nodes;
}

function build({ tokens }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const steps: Step[] = [];
  const val = (id: number) => nodes[id].value;

  const scene = () => ({ kind: 'tree' as const, nodes, root: 0, states: { ...states }, labels: { ...labels } });
  const aux = () => [{ title: 'call stack', kind: 'stack' as const, items: [...stack] }];
  const vars = (cur: number | string, ret: number | string) => ({ node: cur, depth: stack.length, returns: ret });

  steps.push({
    title: 'Start', desc: 'maxDepth(root) — the height of a tree is 1 + the taller of its two subtrees.',
    scene: scene(), aux: aux(), vars: vars('—', '—'),
    logic: 'We recurse to the bottom, then every node reports its height back up.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  const visit = (id: number): number => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    steps.push({
      title: `Visit node ${val(id)}`, desc: `Call maxDepth(${val(id)}). First go left, then right.`,
      scene: scene(), aux: aux(), vars: vars(val(id), '—'),
      logic: 'Not null, so we need the heights of both children before we can answer.', logicTone: 'info',
      javaLines: [1, 2, 3], pyLines: [1, 3, 4], algoStep: 1,
    });
    const n = nodes[id];
    const l = n.left === null ? 0 : visit(n.left);
    const r = n.right === null ? 0 : visit(n.right);
    const h = 1 + Math.max(l, r);
    states[id] = 'found';
    labels[id] = `h=${h}`;
    steps.push({
      title: `Node ${val(id)} returns ${h}`,
      desc: `left = ${l}${n.left === null ? ' (null)' : ''}, right = ${r}${n.right === null ? ' (null)' : ''} → 1 + max(${l}, ${r}) = ${h}`,
      scene: scene(), aux: aux(), vars: vars(val(id), h),
      logic: 'A null child contributes 0. Otherwise it contributes its own height.', logicTone: 'success',
      javaLines: [4], pyLines: [5], algoStep: 2,
    });
    stack.pop();
    return h;
  };

  const depth = visit(0);
  steps.push({
    title: 'Done', desc: `The root returned ${depth}.`,
    scene: scene(), aux: aux(), vars: vars('—', depth),
    logic: `The tree has ${depth} level${depth === 1 ? '' : 's'}.`, logicTone: 'success', javaLines: [4], pyLines: [5], algoStep: 3,
    result: { title: String(depth), text: 'Maximum depth' },
  });
  return steps;
}

function annotated(input: In): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'maxDepth(root)' },
    { on: /^Visit node (-?\d+)/, tag: 'CALL —', note: (m, s) => `maxDepth(${m[1]}) → call stack depth ${s.vars.depth}` },
    { on: /^Node (-?\d+) returns (\d+)/, tag: 'RETURN —', note: (m) => `return 1 + max(left, right) = ${m[2]} (node ${m[1]})` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `root returned ${s.result?.title}` },
  ]);
}

export const maxDepth: ProblemDef<In> = {
  slug: '104-maximum-depth-of-binary-tree',
  id: '104', title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', category: 'Tree', tag: 'DFS',
  statement: 'Given the root of a binary tree, return its maximum depth: the number of nodes on the longest path from the root down to a leaf.',
  constraints: '0 ≤ nodes ≤ 10⁴ (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '3 9 20 null null 15 7', input: { tokens: [3, 9, 20, null, null, 15, 7] }, output: '3' },
    { label: '1 null 2', input: { tokens: [1, null, 2] }, output: '2' },
    { label: '1 2 3 4 5 null null 6', input: { tokens: [1, 2, 3, 4, 5, null, null, 6] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 3 9 20 null null 15 7',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Height known', state: 'found' }],
  varLabels: ['node', 'depth', 'returns'],
  emphasis: ['maximum depth', 'longest path'],
  phases: [
    { icon: '🚀', label: 'Call maxDepth(root)', tone: 'blue' },
    { icon: '⬇️', label: 'Visit: recurse both sides', tone: 'cyan' },
    { icon: '⬆️', label: 'Return 1 + max(left, right)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Height = 1 + taller child',
    text: 'Recurse into both children. An empty subtree has height 0. Every other node returns 1 plus the larger of its two children heights.',
  },
  java: [
    'public int maxDepth(TreeNode root) {',
    '    if (root == null) return 0;',
    '    int left = maxDepth(root.left);',
    '    int right = maxDepth(root.right);',
    '    return 1 + Math.max(left, right);',
    '}',
  ],
  python: [
    'def max_depth(root):',
    '    if not root:',
    '        return 0',
    '    left = max_depth(root.left)',
    '    right = max_depth(root.right)',
    '    return 1 + max(left, right)',
  ],
  algorithm: [
    'Call maxDepth on the root',
    'null → return 0; otherwise recurse into left and right',
    'Return 1 + max(left, right)',
    'The root’s return value is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Every node is visited once. The recursion stack holds one frame per level of the current path, so space is the tree height h (up to n for a skewed tree).',
};
