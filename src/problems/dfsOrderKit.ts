/**
 * Shared engine for the three recursive depth-first traversal animations of the "DFS Traversal" pattern page
 * (pre-order, in-order, post-order). One recursive walk, three moments at which a node may be recorded.
 * Every node produces exactly three events: CALL (a frame is pushed), VISIT (the value is recorded) and RETURN (the frame is popped).
 */
import type { CellState, Phase, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, fmtList, listAux, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

export type Order = 'pre' | 'in' | 'post';

const NAME: Record<Order, string> = { pre: 'pre-order', in: 'in-order', post: 'post-order' };
const RULE: Record<Order, string[]> = { pre: ['Visit', 'Left', 'Right'], in: ['Left', 'Visit', 'Right'], post: ['Left', 'Right', 'Visit'] };
const RULE_SENTENCE: Record<Order, string> = {
  pre: 'each node is recorded BEFORE its subtrees (node, left, right)',
  in: 'each node is recorded BETWEEN its subtrees (left, node, right)',
  post: 'each node is recorded AFTER its subtrees (left, right, node)',
};

function javaFor(order: Order, method: string): string[] {
  const body: Record<string, string> = {
    visit: order === 'pre' ? '    res.add(node.val);                          // visit BEFORE the children' : order === 'in' ? '    res.add(node.val);                          // visit BETWEEN the children' : '    res.add(node.val);                          // visit AFTER the children',
    left: '    dfs(node.left, res);',
    right: '    dfs(node.right, res);',
  };
  const seq = RULE[order].map((r) => body[r.toLowerCase()]);
  return [
    `public List<Integer> ${method}(TreeNode root) {`,
    '    List<Integer> res = new ArrayList<>();',
    '    dfs(root, res);',
    '    return res;',
    '}',
    'private void dfs(TreeNode node, List<Integer> res) {',
    '    if (node == null) return;                   // base case: an empty subtree has nothing to visit',
    ...seq,
    '}',
  ];
}

function pythonFor(order: Order, method: string): string[] {
  const body: Record<string, string> = { visit: '        res.append(node.val)', left: '        dfs(node.left)', right: '        dfs(node.right)' };
  return [
    `def ${method}(root):`,
    '    res = []',
    '    def dfs(node):',
    '        if not node:',
    '            return',
    ...RULE[order].map((r) => body[r.toLowerCase()]),
    '    dfs(root)',
    '    return res',
  ];
}

const PHASES: Phase[] = [
  { icon: '🌱', label: 'Init', tone: 'blue' },
  { icon: '📞', label: 'Call (descend)', tone: 'cyan' },
  { icon: '👁️', label: 'Visit node', tone: 'gold' },
  { icon: '↩️', label: 'Return (ascend)', tone: 'orange' },
  { icon: '✅', label: 'Done', tone: 'green' },
];

function buildFor(order: Order) {
  return function build({ tokens }: TreeIn): Step[] {
    const nodes = buildTree(tokens);
    const labels: Record<number, string> = {};
    const visited = new Set<number>();
    const onStack: number[] = [];
    const res: number[] = [];
    const steps: Step[] = [];
    const val = (id: number) => Number(nodes[id].value);
    const rule = RULE[order];
    const J = javaLines(order);
    const P = pythonLines(order);

    const states = (cur: number | null): Record<number, CellState> => {
      const st: Record<number, CellState> = {};
      for (const id of onStack) st[id] = 'compare';
      for (const id of visited) st[id] = 'found';
      if (cur !== null) st[cur] = 'active';
      return st;
    };
    const aux = (ruleHl?: number) => [
      stackAux('call stack (top = current call)', onStack.map((id) => `dfs(${val(id)})`)),
      listAux(`result (${NAME[order]})`, res),
      listAux(`rule at every node: ${rule.join(' → ')}`, rule, ruleHl),
    ];
    const vars = (node: number | string) => ({ node, depth: onStack.length, visited: res.length });
    const push = (s: Omit<Step, 'scene' | 'vars' | 'aux' | 'logicTone'> & { cur: number | null; ruleHl?: number; tone?: Step['logicTone']; node: number | string }) => {
      const { cur, ruleHl, tone, node, ...rest } = s;
      steps.push({ ...rest, scene: treeScene(nodes, states(cur), labels), aux: aux(ruleHl), vars: vars(node), logicTone: tone ?? 'info' });
    };

    push({
      title: 'Start', tag: 'INIT —',
      desc: `Walk the tree ${NAME[order]}: ${RULE_SENTENCE[order]}. The recursion keeps a call stack of the nodes whose work is unfinished.`,
      note: 'res = [], call stack empty',
      logic: 'One recursive function does the whole walk. Only the moment at which a node is recorded differs between the three orders.',
      javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, cur: null, node: '—',
    });

    const dfs = (id: number, from: { parent: number; side: 'left' | 'right' } | null) => {
      onStack.push(id);
      const v = val(id);
      const d = onStack.length;
      const callJ = from === null ? J.root : from.side === 'left' ? J.left : J.right;
      const callP = from === null ? P.root : from.side === 'left' ? P.left : P.right;
      push({
        title: `Call dfs(${v})`, tag: 'CALL',
        desc: from === null ? `dfs(${v}) is called on the root. Push its frame, depth ${d}.` : `dfs(${v}) is called from ${val(from.parent)}'s ${from.side} child. Push its frame, depth ${d}.`,
        note: from === null ? `node = ${v}, depth ${d}` : `${val(from.parent)}.${from.side} = ${v} → depth ${d}`,
        logic: 'A call that receives a real node pushes a frame; a null would return immediately (the base case).',
        javaLines: [callJ, J.base], pyLines: [callP, P.base], algoStep: 1, cur: id, node: v,
        ruleHl: from === null ? undefined : rule.indexOf(from.side === 'left' ? 'Left' : 'Right'),
      });

      const visit = () => {
        res.push(v);
        visited.add(id);
        labels[id] = `#${res.length}`;
        const leftNull = nodes[id].left === null;
        const why =
          order === 'pre' ? `Visit ${v} first, before any child` : order === 'in' ? (leftNull ? `${v} has no left subtree, so it is next in order` : `The left subtree of ${v} is finished, so visit ${v}`) : (nodes[id].left === null && nodes[id].right === null ? `${v} is a leaf, so there is nothing to wait for` : `Both subtrees of ${v} are finished, so visit ${v} last`);
        push({
          title: `Visit ${v}`, tag: 'VISIT',
          desc: `${why}: append ${v} → result ${fmtList(res)}. Badge #${res.length}.`,
          note: `res.add(${v}) → ${fmtList(res)}`,
          logic: 'This is the only line that records a value; moving it before, between or after the two recursive calls changes the order.',
          tone: 'success', javaLines: [J.visit], pyLines: [P.visit], algoStep: 2, cur: id, node: v, ruleHl: rule.indexOf('Visit'),
        });
      };
      const child = (side: 'left' | 'right') => {
        const c = nodes[id][side];
        if (c !== null) dfs(c, { parent: id, side });
      };
      for (const r of rule) {
        if (r === 'Visit') visit();
        else child(r === 'Left' ? 'left' : 'right');
      }

      onStack.pop();
      const leaf = nodes[id].left === null && nodes[id].right === null;
      push({
        title: `Return from dfs(${v})`, tag: 'RETURN',
        desc: from === null
          ? `dfs(${v}) is finished. The call stack is empty again.`
          : `dfs(${v}) is finished${leaf ? ' (both children were null, so two calls returned at once)' : ''}. Pop its frame and resume dfs(${val(from.parent)}).`,
        note: `pop dfs(${v}) → depth ${onStack.length}`,
        logic: 'When a function falls off its last line the frame is popped and the parent continues with the next line.',
        javaLines: [J.end], pyLines: [P.visit], algoStep: 3, cur: from === null ? null : from.parent, node: from === null ? '—' : val(from.parent),
      });
    };
    dfs(0, null);

    const out = fmtList(res);
    push({
      title: 'Done', tag: '✅ Done!',
      desc: `${NAME[order][0].toUpperCase()}${NAME[order].slice(1)} result = ${out}: ${RULE_SENTENCE[order]}.`,
      note: `return res → ${out}`,
      logic: 'Every node was called once, visited once and returned once, so the walk costs O(n) time and O(h) stack.',
      tone: 'success', javaLines: [J.ret], pyLines: [P.ret], algoStep: 4, cur: null, node: '—',
      result: { title: out, text: `${NAME[order][0].toUpperCase()}${NAME[order].slice(1)} traversal` },
    });
    return steps;
  };
}

function javaLines(order: Order) {
  // lines 7..9 hold the three order lines
  const idx = { visit: 7 + RULE[order].indexOf('Visit'), left: 7 + RULE[order].indexOf('Left'), right: 7 + RULE[order].indexOf('Right') };
  return { root: 2, base: 6, ...idx, end: 10, ret: 3 };
}
function pythonLines(order: Order) {
  const idx = { visit: 5 + RULE[order].indexOf('Visit'), left: 5 + RULE[order].indexOf('Left'), right: 5 + RULE[order].indexOf('Right') };
  return { root: 8, base: 3, ...idx, ret: 9 };
}

interface Spec {
  slug: string;
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tag: string;
  method: string;
  statement: string;
  emphasis: string[];
  approach: { title: string; text: string };
  why: string;
  examples: { label: string; tokens: (number | null)[]; output: string }[];
}

/** Builds the full ProblemDef of one traversal order. */
export function makeOrderProblem(order: Order, spec: Spec): ProblemDef<TreeIn> {
  return {
    slug: spec.slug,
    id: spec.id, title: spec.title, difficulty: spec.difficulty, category: 'Tree', tag: spec.tag,
    statement: spec.statement,
    emphasis: spec.emphasis,
    constraints: '0 ≤ nodes ≤ 100 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
    examples: spec.examples.map((e) => ({ label: e.label, input: { tokens: e.tokens }, output: e.output })),
    inputPlaceholder: 'e.g. 1 2 3 4 5 null 6',
    parseInput: parseTree,
    buildSteps: buildFor(order),
    viz: 'cells',
    legend: [{ label: 'Current call', state: 'active' }, { label: 'On the call stack', state: 'compare' }, { label: 'Visited (badge = visit order)', state: 'found' }],
    varLabels: ['node', 'depth', 'visited'],
    phases: PHASES,
    approach: spec.approach,
    java: javaFor(order, spec.method),
    python: pythonFor(order, spec.method.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)),
    algorithm: [
      'Start with the root and an empty result list',
      'Call dfs(node): a real node pushes a frame, null returns at once',
      order === 'pre' ? 'Visit the node first, then recurse left, then right' : order === 'in' ? 'Recurse left, visit the node, then recurse right' : 'Recurse left, recurse right, then visit the node',
      'Return: pop the frame and let the parent continue',
      'When the root returns, the result list holds the traversal',
    ],
    complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
    why: spec.why,
  };
}
