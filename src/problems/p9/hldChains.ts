import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { childrenOf, countLight, hldOf, parList, parseParents, posRow, toneMap } from './hldKit.ts';

interface In { par: number[] }

function parse(raw: string): In {
  return { par: parseParents(raw) };
}

function refChains(par: number[]): number[][] {
  return hldOf(par).chains;
}

const fmtChains = (c: number[][]) => c.map((x) => `(${x.join('-')})`).join(' ');

function build({ par }: In): Step[] {
  const n = par.length;
  const h = hldOf(par);
  const ch = childrenOf(par);
  const steps: Step[] = [];
  const size = par.map(() => 1);
  const decided = new Set<number>(); // heavy children chosen so far
  let doneChains = 0;
  let phase = 'start';
  let vnode: string | number = '—';
  let vhead: string | number = '—';
  let vpos: string | number = 0;
  const tags: Record<number, string> = {};
  const showSize = (v: number) => `s=${size[v]}`;
  par.forEach((_, v) => { tags[v] = showSize(v); });
  const chainsText: string[] = [];

  const aux = (): Aux[] => [{ title: 'chains found (head first)', kind: 'list', items: [...chainsText] }];
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...s, aux: aux(), vars: { phase, node: vnode, 'chain head': vhead, 'next pos': vpos } });
  const scene = (states: Record<number, CellState>, upto: number, extraStates: (p: number) => CellState | undefined = () => undefined) => {
    const toned = h.order.slice(0, upto);
    return {
      kind: 'split' as const, stack: true,
      parts: [
        {
          kind: 'ntree' as const, root: 0, nodes: par.map((_, v) => ({ id: v, children: ch[v], tag: tags[v], state: states[v], tone: toned.includes(v) ? toneMap(h, toned)[v] : undefined, heavy: decided.has(v) || undefined })),
        },
        posRow(h, upto, (v) => v, extraStates),
      ],
    };
  };

  push({
    title: 'Start', desc: `A rooted tree with ${n} nodes (root 0). We will split it into chains: paths along which every node continues to its largest child.`,
    scene: scene({ 0: 'found' }, 0),
    logic: 'Plan: measure subtree sizes, pick one heavy child per node, then number the nodes so each chain is a contiguous block.', logicTone: 'info',
    javaLines: [4], pyLines: [0], algoStep: 0,
    tag: 'INIT —', note: `n = ${n}, size[v] = 1 for all nodes`,
  });

  phase = 'sizes';
  for (let v = n - 1; v >= 1; v--) {
    const p = par[v];
    vnode = v;
    size[p] += size[v];
    tags[v] = showSize(v);
    tags[p] = showSize(p);
    push({
      title: `size[${v}] = ${size[v]}, add it to parent ${p}`, desc: `Node ${v}'s subtree is complete (${size[v]} node${size[v] > 1 ? 's' : ''}). Add that to node ${p}, now ${size[p]} so far.`,
      scene: scene({ [v]: 'active', [p]: 'compare' }, 0),
      logic: 'Every child has a larger id than its parent, so scanning ids downwards finishes each subtree before its parent.', logicTone: 'info',
      javaLines: [5, 6], pyLines: [1, 2, 3], algoStep: 0,
      tag: 'SIZE', note: `size[${p}] += size[${v}] → ${size[p]}`,
    });
  }

  phase = 'heavy child';
  for (let v = 0; v < n; v++) {
    if (!ch[v].length) continue;
    vnode = v;
    const c = h.heavy[v];
    decided.add(c);
    push({
      title: `heavy[${v}] = ${c}`, desc: `Children of ${v}: ${ch[v].map((x) => `${x} (size ${size[x]})`).join(', ')}. The biggest subtree wins, so the edge ${v}→${c} becomes heavy (thick green).${ch[v].length > 1 ? ' The other children are light.' : ''}`,
      scene: scene({ [v]: 'active', [c]: 'found' }, 0),
      logic: 'A light child has a subtree of at most half the parent\'s size, so a root path meets at most log n light edges.', logicTone: 'success',
      javaLines: [7, 8, 9, 10], pyLines: [4, 5, 6, 7, 8], algoStep: 1,
      tag: 'HEAVY', note: `heavy[${v}] = argmax size over {${ch[v].join(', ')}} = ${c} (size ${size[c]})`,
    });
  }

  phase = 'chains';
  let upto = 0;
  h.chains.forEach((chain, k) => {
    const start = upto;
    vhead = chain[0];
    vpos = start;
    push({
      title: k === 0 ? `Chain ${k + 1} starts at the root` : `Node ${chain[0]} is a light child: a new chain starts`, desc: k === 0 ? `Start at root 0 and follow heavy children downwards.` : `${chain[0]} hangs off ${par[chain[0]]} by a light edge, so it becomes the head of chain ${k + 1}.`,
      scene: scene({ [chain[0]]: 'active' }, upto),
      logic: 'Every node is either the head of its chain or the heavy child of its parent.', logicTone: 'info',
      javaLines: [19, 20], pyLines: [18, 19, 20], algoStep: 3,
      tag: 'NEW CHAIN', note: k === 0 ? 'assign(0, 0): head[0] = 0' : `assign(${chain[0]}, ${chain[0]}): light child heads a chain`,
    });
    for (const v of chain) {
      tags[v] = `p=${upto}`;
      vnode = v;
      upto++;
      vpos = upto;
    }
    doneChains++;
    chainsText.push(`(${chain.join('-')})`);
    push({
      title: `Chain ${k + 1}: ${chain.join(' → ')} gets positions ${start}..${upto - 1}`, desc: `Walk down heavy children from ${chain[0]} and number the nodes consecutively. The chain is now one contiguous block in the position array.`,
      scene: scene({ [chain[chain.length - 1]]: 'active' }, upto, (p) => (p >= start && p < upto ? 'active' : undefined)),
      logic: 'Because a heavy child is numbered right after its parent, a chain occupies consecutive positions.', logicTone: 'success',
      javaLines: [16, 17, 18], pyLines: [13, 14, 15, 16, 17], algoStep: 2,
      tag: 'NUMBER', note: `pos[${chain[0]}..${chain[chain.length - 1]}] = ${start}..${upto - 1}, head = ${chain[0]}`,
    });
  });
  void doneChains;

  phase = 'done';
  vnode = '—';
  vhead = '—';
  const maxLight = Math.max(...par.map((_, v) => countLight(h, par, v)));
  push({
    title: 'Decomposition complete', desc: `${h.chains.length} chain${h.chains.length > 1 ? 's' : ''}: ${fmtChains(h.chains)}. The deepest root path crosses ${maxLight} light edge${maxLight === 1 ? '' : 's'}.`,
    scene: scene({}, n),
    logic: 'A path query now splits into at most O(log n) chain pieces, each a range of consecutive positions.', logicTone: 'success',
    tag: '✅ Done!', note: `${h.chains.length} chains: ${fmtChains(h.chains)}`,
    javaLines: [12], pyLines: [21, 22], algoStep: 4,
    result: { title: fmtChains(h.chains), text: 'Chains, each written head to tail' },
  });
  return steps;
}

const ex = (par: number[]): { label: string; input: In; output: string } => ({ label: parList(par), input: { par }, output: fmtChains(refChains(par)) });

export const hldChains: ProblemDef<In> = {
  slug: 'cp-heavy-light-decomposition-chains',
  id: 'CP', title: 'Heavy-Light Decomposition: Chains', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'heavy-light decomposition',
  statement: 'Split a rooted tree into vertex-disjoint chains: every node links to its heavy child (the child with the largest subtree, ties to the smaller id) and every other child starts a new chain. Number the nodes so that each chain is a contiguous block, and report the chains.',
  constraints: 'n ≤ 10⁵ nodes (animation: parents of nodes 1..n-1, each parent id smaller than the child id, at most 11 nodes)',
  examples: [
    ex([-1, 0, 0, 1, 1, 2, 3, 3, 4]),
    ex([-1, 0, 1, 2, 0, 4, 5, 4, 3]),
    ex([-1, 0, 0, 0, 1, 1, 2, 2, 2, 8]),
  ],
  inputPlaceholder: 'e.g. 0 0 1 1 2 3 3 4   (parent of nodes 1, 2, 3, ...)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Tree and position array', vizCaption: 's = subtree size, p = position; one colour per chain, thick green = heavy edge',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Parent receiving a size', state: 'compare' }, { label: 'Heavy child chosen', state: 'found' }],
  varLabels: ['phase', 'node', 'chain head', 'next pos'],
  approach: {
    title: 'Biggest child continues the chain',
    text: 'Compute every subtree size, pick the child with the largest subtree as the heavy child, then number nodes by a DFS that visits the heavy child first. Heavy edges form chains; each light edge halves the subtree size, so any root path crosses only O(log n) chains.',
  },
  java: [
    'class HLD {',
    '    int[] parent, size, heavy, head, pos;',
    '    int cur = 0;',
    '',
    '    void decompose(int n, List<Integer>[] children) {',
    '        Arrays.fill(size, 1);',
    '        for (int v = n - 1; v >= 1; v--) size[parent[v]] += size[v];   // children have larger ids',
    '        for (int v = 0; v < n; v++) {',
    '            heavy[v] = -1;',
    '            for (int c : children[v])',
    '                if (heavy[v] < 0 || size[c] > size[heavy[v]]) heavy[v] = c;   // biggest subtree',
    '        }',
    '        assign(0, 0, children);',
    '    }',
    '',
    '    void assign(int v, int h, List<Integer>[] children) {',
    '        head[v] = h;',
    '        pos[v] = cur++;                          // heavy child follows right after v',
    '        if (heavy[v] >= 0) assign(heavy[v], h, children);',
    '        for (int c : children[v])',
    '            if (c != heavy[v]) assign(c, c, children);   // a light child heads a new chain',
    '    }',
    '}',
  ],
  python: [
    'def decompose(n, children, parent):',
    '    size = [1] * n',
    '    for v in range(n - 1, 0, -1):',
    '        size[parent[v]] += size[v]',
    '    heavy = [-1] * n',
    '    for v in range(n):',
    '        for c in children[v]:',
    '            if heavy[v] < 0 or size[c] > size[heavy[v]]:',
    '                heavy[v] = c',
    '    head, pos, cur = [0] * n, [0] * n, 0',
    '',
    '    def assign(v, h):',
    '        nonlocal cur',
    '        head[v] = h',
    '        pos[v] = cur',
    '        cur += 1',
    '        if heavy[v] >= 0:',
    '            assign(heavy[v], h)',
    '        for c in children[v]:',
    '            if c != heavy[v]:',
    '                assign(c, c)',
    '    assign(0, 0)',
    '    return head, pos',
  ],
  phases: [
    { icon: '📏', label: 'Subtree sizes', tone: 'blue' },
    { icon: '💪', label: 'Pick heavy children', tone: 'green' },
    { icon: '🔢', label: 'Number a chain', tone: 'cyan' },
    { icon: '🔗', label: 'Light child starts a chain', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['chains', 'heavy child', 'contiguous block'],
  algorithm: [
    'Compute every subtree size bottom-up (children have larger ids than their parents)',
    'For each node pick the child with the largest subtree as its heavy child',
    'Walk down heavy children from a chain head, giving consecutive positions',
    'Every light child becomes the head of a new chain',
    'Each chain is now a contiguous range of positions; a root path crosses O(log n) chains',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'If c is a light child of v then size[c] ≤ size[v] / 2, since the heavy child is at least as large. Going up a light edge therefore at least doubles the subtree size, which can happen at most log₂ n times on any root path. Numbering the heavy child immediately after its parent makes every chain consecutive, so later queries can treat a chain piece as an ordinary array range.',
  naive: 'Without the decomposition a path query walks up node by node, O(n) on a long path; chains let a data structure over positions answer each piece in O(log n).',
};
