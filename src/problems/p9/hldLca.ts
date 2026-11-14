import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { childrenOf, depthsOf, heavyChildren, hldOf, parList, parseTreeQueries, toneMap } from './hldKit.ts';
import { refLca } from './lcaEngine.ts';

interface In { par: number[]; queries: [number, number][] }

const USAGE = '0 0 1 1 2 3 | 4:5 3:6   (parents of nodes 1,2,3,... | u:v queries)';
const parse = (raw: string): In => parseTreeQueries(raw, USAGE, '4:5 3:6');

function build({ par, queries }: In): Step[] {
  const h = hldOf(par);
  const depth = depthsOf(par);
  const ch = childrenOf(par);
  const heavySet = heavyChildren(h);
  const tones = toneMap(h, par.map((_, v) => v));
  const tags: Record<number, string> = {};
  par.forEach((_, v) => { tags[v] = `h=${h.head[v]}`; });
  const steps: Step[] = [];
  const answers: string[] = [];
  let vq: string | number = '—';
  let vu: string | number = '—';
  let vv: string | number = '—';

  const aux = (): Aux[] => [{ title: 'answers so far', kind: 'list', items: [...answers] }];
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({
    ...s, aux: aux(),
    vars: { query: vq, u: vu, v: vv, 'head[u]': typeof vu === 'number' ? h.head[vu] : '—', 'head[v]': typeof vv === 'number' ? h.head[vv] : '—' },
  });
  const scene = (states: Record<number, CellState>, extra: { from: number; to: number; label?: string }[] = []) => ({
    kind: 'ntree' as const, root: 0, extraEdges: extra.length ? extra : undefined,
    nodes: par.map((_, v) => ({ id: v, children: ch[v], tag: tags[v], state: states[v], tone: tones[v], heavy: heavySet.has(v) || undefined })),
  });

  push({
    title: 'Start', desc: 'The tree is split into heavy chains (one colour each, heavy edges thick). The chip h=… under a node names the head of its chain.',
    scene: scene({}),
    logic: 'Two nodes on the same chain are comparable by depth; nodes on different chains must climb over light edges first.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
    tag: 'INIT —', note: `head[] = [${h.head.join(', ')}], depth[] = [${depth.join(', ')}]`,
  });

  queries.forEach(([u0, v0], qi) => {
    vq = `${qi + 1} of ${queries.length}`;
    let u = u0;
    let v = v0;
    vu = u; vv = v;
    push({
      title: `Query lca(${u0}, ${v0})`, desc: `Chain heads: head[${u0}] = ${h.head[u0]}, head[${v0}] = ${h.head[v0]}. ${h.head[u0] === h.head[v0] ? 'They share a chain already.' : 'Different chains, so the node with the deeper head must climb.'}`,
      scene: scene({ [u]: 'active', [v]: 'swap' }),
      logic: 'Climb only over light edges: there are at most log n of them.', logicTone: 'info',
      javaLines: [1], pyLines: [1], algoStep: 1,
      tag: `QUERY ${qi + 1}`, note: `lca(${u0}, ${v0}): head[${u0}] = ${h.head[u0]}, head[${v0}] = ${h.head[v0]}`,
    });
    while (h.head[u] !== h.head[v]) {
      const moveU = depth[h.head[u]] > depth[h.head[v]];
      const mover = moveU ? u : v;
      const to = par[h.head[mover]];
      push({
        title: moveU ? `u's chain head is deeper: move u to ${to}` : `v's chain head is at least as deep: move v to ${to}`, desc: `The head of ${moveU ? 'u' : 'v'}'s chain (${h.head[mover]}) is at depth ${depth[h.head[mover]]}, ${moveU ? 'deeper than' : 'not shallower than'} the other head at depth ${depth[h.head[moveU ? v : u]]}. Jump to parent[${h.head[mover]}] = ${to}.`,
        scene: scene({ [u]: 'active', [v]: 'swap' }, [{ from: mover, to }]),
        logic: 'The deeper chain head cannot be above the LCA, so leaving that chain loses nothing.', logicTone: 'info',
        javaLines: moveU ? [1, 2] : [1, 2, 3], pyLines: moveU ? [1, 2, 3] : [1, 2, 4, 5], algoStep: 2,
        tag: 'CLIMB', note: `depth[head[${moveU ? 'u' : 'v'}]] = ${depth[h.head[mover]]} → ${moveU ? 'u' : 'v'} = parent[${h.head[mover]}] = ${to}`,
      });
      if (moveU) u = to; else v = to;
      vu = u; vv = v;
    }
    const lca = depth[u] < depth[v] ? u : v;
    push({
      title: `Same chain (head ${h.head[u]}): the shallower node is the LCA`, desc: `u = ${u} (depth ${depth[u]}) and v = ${v} (depth ${depth[v]}) lie on one chain, and on a chain the shallower node is an ancestor of the other. LCA = ${lca}.`,
      scene: scene({ [u]: 'active', [v]: 'swap', [lca]: 'found' }),
      logic: 'Along a chain, ancestry equals having a smaller depth.', logicTone: 'success',
      javaLines: [5], pyLines: [6], algoStep: 3,
      tag: 'SAME CHAIN', note: `head[${u}] == head[${v}] → shallower of ${u}, ${v} is ${lca}`,
    });
    answers.push(String(lca));
    push({
      title: `Answer: lca(${u0}, ${v0}) = ${lca}`, desc: `The lowest common ancestor of ${u0} and ${v0} is ${lca}.`,
      scene: scene({ [u0]: 'active', [v0]: 'swap', [lca]: 'found' }),
      logic: 'No binary lifting table is needed; the chain heads do the jumping.', logicTone: 'success',
      javaLines: [5], pyLines: [6], algoStep: 4,
      tag: qi === queries.length - 1 ? '✅ Done!' : 'ANSWER', note: `return ${lca}`,
    });
  });

  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'LCAs in query order' };
  return steps;
}

const mk = (par: number[], queries: [number, number][]) => ({
  label: `${parList(par)} | ${queries.map(([a, b]) => `${a}:${b}`).join(' ')}`,
  input: { par, queries },
  output: `[${queries.map(([a, b]) => refLca(par, a, b)).join(', ')}]`,
});

export const hldLca: ProblemDef<In> = {
  slug: 'cp-lca-via-heavy-light-decomposition',
  id: 'CP', title: 'LCA via Heavy-Light Decomposition', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'heavy-light decomposition',
  statement: 'Find the lowest common ancestor of pairs of nodes in a rooted tree using only the chain heads of a heavy-light decomposition: no binary-lifting table, O(n) memory, O(log n) per query.',
  constraints: 'n ≤ 10⁵ nodes (animation: parents of nodes 1..n-1 before |, at most 11 nodes and 3 queries written u:v)',
  examples: [
    mk([-1, 0, 0, 1, 1, 2, 3, 3, 4], [[6, 8], [7, 5], [3, 4]]),
    mk([-1, 0, 1, 2, 0, 4, 5, 4, 3], [[8, 7], [3, 6], [2, 5]]),
    mk([-1, 0, 0, 0, 1, 1, 2, 2, 2, 8], [[9, 5], [7, 3], [6, 9]]),
  ],
  inputPlaceholder: `e.g. ${USAGE}`,
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Tree with heavy chains', vizCaption: 'h = head of the node\'s chain; colours = chains; thick green = heavy edge',
  legend: [{ label: 'u', state: 'active' }, { label: 'v', state: 'swap' }, { label: 'LCA', state: 'found' }],
  varLabels: ['query', 'u', 'v', 'head[u]', 'head[v]'],
  approach: {
    title: 'Climb the deeper chain head',
    text: 'While u and v lie on different chains, move the node whose chain head is deeper to the parent of that head (crossing one light edge). When they share a chain, the shallower of the two is the LCA.',
  },
  java: [
    'int lca(int u, int v) {',
    '    while (head[u] != head[v]) {',
    '        if (depth[head[u]] > depth[head[v]]) u = parent[head[u]];',
    '        else v = parent[head[v]];',
    '    }',
    '    return depth[u] < depth[v] ? u : v;     // same chain: shallower node',
    '}',
    '',
    'int[] parent, depth, head;                 // filled by the decomposition: head[v] = top node of v\'s heavy chain',
  ],
  python: [
    'def lca(u, v):',
    '    while head[u] != head[v]:',
    '        if depth[head[u]] > depth[head[v]]:',
    '            u = parent[head[u]]',
    '        else:',
    '            v = parent[head[v]]',
    '    return u if depth[u] < depth[v] else v',
    '',
    'parent, depth, head = [], [], []     # filled by the decomposition: head[v] = top node of v\'s heavy chain',
  ],
  algorithm: [
    'Decompose the tree into heavy chains and record head[] and depth[]',
    'While head[u] != head[v], compare the depths of the two chain heads',
    'Move the node with the deeper head to parent[head] (one light edge)',
    'When the heads agree, the node with smaller depth is the LCA',
    'Return that node as the answer to the query',
  ],
  phases: [
    { icon: '⛓', label: 'Chains, head[], depth[]', tone: 'blue' },
    { icon: '⚖', label: 'Compare chain heads', tone: 'cyan' },
    { icon: '🦘', label: 'Climb the deeper head', tone: 'green' },
    { icon: '🎯', label: 'Same chain: shallower node', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['lowest common ancestor', 'chain heads', 'O(n) memory'],
  complexity: [{ label: 'Time', value: 'O(log n) per query' }, { label: 'Space', value: 'O(n)' }],
  why: 'The deeper of the two chain heads cannot be an ancestor of the other node\'s chain head, so the LCA lies above it and jumping to that head\'s parent never overshoots. Every jump crosses a light edge and a root path has only O(log n) of them. Once both nodes are on one chain, which is a vertical path, the one closer to the root is the ancestor of the other.',
  naive: 'Climbing node by node is O(depth) per query; the chain heads skip a whole chain per step.',
};
