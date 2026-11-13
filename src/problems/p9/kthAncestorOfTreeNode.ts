import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { bitLen, liftGrid, liftTable, ntScene, parList, parseParents, parsePairs, rangeStr, splitParts } from './kitE.ts';

interface In { par: number[]; queries: [number, number][] }

const USAGE = '0 0 1 1 2 | 4:3 5:2   (parents of nodes 1,2,3,... | node:k queries)';

function parse(raw: string): In {
  const [t, q] = splitParts(raw, 2, USAGE);
  const par = parseParents(t);
  const n = par.length;
  const queries = parsePairs(q, {
    max: 3, example: '4:3 5:2',
    check: (node, k, tok) => {
      if (node >= n) throw new Error(`In "${tok}" the node must be between 0 and ${n - 1}`);
      if (k < 1 || k > n) throw new Error(`In "${tok}" k must be between 1 and ${n}`);
    },
  });
  return { par, queries };
}

function build({ par, queries }: In): Step[] {
  const n = par.length;
  const LOG = bitLen(n);
  const up = liftTable(par, LOG);
  const steps: Step[] = [];
  const table: (number | null)[][] = Array.from({ length: LOG }, () => Array<number | null>(n).fill(null));
  const answers: string[] = [];
  let vj: string | number = '—';
  let vq: string | number = '—';
  let vnode: string | number = '—';
  let vk: string | number = '—';

  const aux = (): Aux[] => [{ title: 'answers so far', kind: 'list', items: [...answers] }];
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({
    ...s, aux: aux(), vars: { 'level j': vj, query: vq, node: vnode, k: vk, answer: answers.length ? answers[answers.length - 1] : '—' },
  });
  const split = (tree: ReturnType<typeof ntScene>, hot: Record<string, CellState> = {}) => ({
    kind: 'split' as const, stack: true, parts: [tree, liftGrid(table, hot)],
  });

  push({
    title: 'Start', desc: `A tree with ${n} nodes (node 0 is the root). We will fill an ancestor table: row j holds, for every node, its 2^j-th ancestor.`,
    scene: split(ntScene({ par })),
    logic: 'With O(log n) rows we can jump any distance: write k in binary and take one hop per 1-bit.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [0, 1], algoStep: 0,
    tag: 'INIT —', note: `n = ${n} nodes, log = ${LOG} rows, up[j][v] unknown`,
  });

  vj = 0;
  up[0].forEach((x, v) => { table[0][v] = x; });
  push({
    title: 'Row 2^0: the direct parents', desc: 'The first row is simply the parent array; the root has no parent, shown as –.',
    scene: split(ntScene({ par, states: { 0: 'found' } })),
    logic: 'up[0][v] is one hop. Every other row is built from this one.', logicTone: 'info',
    javaLines: [5, 6, 7], pyLines: [2, 3], algoStep: 0,
    tag: 'ROW 0', note: `up[0] = parent.clone() = [${up[0].map((x) => (x < 0 ? '–' : x)).join(', ')}]`,
  });

  for (let j = 1; j < LOG; j++) {
    vj = j;
    let ex = -1;
    for (let v = n - 1; v >= 0; v--) if (up[j][v] >= 0) { ex = v; break; }
    if (ex >= 0) {
      const mid = up[j - 1][ex];
      const to = up[j][ex];
      table[j][ex] = to;
      push({
        title: `up[${j}][${ex}] = up[${j - 1}][up[${j - 1}][${ex}]] = ${to}`,
        desc: `Take 2^${j - 1} steps from ${ex} to reach ${mid}, then another 2^${j - 1} steps from ${mid} to reach ${to}. Two half-jumps make one 2^${j} jump.`,
        scene: split(
          ntScene({ par, states: { [ex]: 'active', [mid]: 'compare', [to]: 'found' }, extra: [{ from: ex, to: mid, label: `2^${j - 1}` }, { from: mid, to, label: `2^${j - 1}`, tone: 'green' }] }),
          { [`${j - 1},${ex}`]: 'compare', [`${j - 1},${mid}`]: 'compare', [`${j},${ex}`]: 'found' },
        ),
        logic: 'The 2^j-th ancestor is the 2^(j-1)-th ancestor of the 2^(j-1)-th ancestor.', logicTone: 'info',
        javaLines: [10, 11], pyLines: [5, 6], algoStep: 1,
        tag: `ROW 2^${j}`, note: `up[${j}][${ex}] = up[${j - 1}][${mid}] = ${to}`,
      });
    }
    up[j].forEach((x, v) => { table[j][v] = x; });
    push({
      title: `Row 2^${j} complete`, desc: `Every node now knows its ${1 << j}-th ancestor (or – when that is above the root).`,
      scene: split(ntScene({ par })),
      logic: 'Once an ancestor is missing it stays missing: –  propagates to the higher rows.', logicTone: 'info',
      javaLines: [8, 9, 12], pyLines: [4, 5, 6], algoStep: 1,
      tag: `ROW 2^${j}`, note: `row ${j} = [${up[j].map((x) => (x < 0 ? '–' : x)).join(', ')}]`,
    });
  }

  for (let qi = 0; qi < queries.length; qi++) {
    const [node, k] = queries[qi];
    vq = `${qi + 1} of ${queries.length}`;
    vnode = node;
    vk = k;
    vj = '—';
    const bits: number[] = [];
    for (let j = 0; j < LOG; j++) if ((k >> j) & 1) bits.push(j);
    push({
      title: `Query getKthAncestor(${node}, ${k})`, desc: `${k} in binary has 1-bits at ${bits.map((b) => `2^${b}`).join(' + ')} = ${k}. We take one jump per set bit; zero bits are skipped.`,
      scene: split(ntScene({ par, states: { [node]: 'active' } })),
      logic: 'Any distance k is a sum of distinct powers of two, so k hops become at most log n table jumps.', logicTone: 'info',
      javaLines: [16], pyLines: [8], algoStep: 2,
      tag: `QUERY ${qi + 1}`, note: `k = ${k} = binary ${k.toString(2)} → jumps ${bits.map((b) => `2^${b}`).join(' + ')}`,
    });
    let cur = node;
    const visited: number[] = [node];
    const extra: { from: number; to: number; label?: string }[] = [];
    let dead = false;
    for (const j of bits) {
      vj = j;
      const nxt = up[j][cur];
      if (nxt < 0) {
        dead = true;
        push({
          title: `up[${j}][${cur}] is –: fell off the root`, desc: `${cur} has no ${1 << j}-th ancestor, so the k-th ancestor does not exist.`,
          scene: split(ntScene({ par, states: { [cur]: 'error' }, extra }), { [`${j},${cur}`]: 'error' }),
          logic: 'The table already knows when a jump leaves the tree, so we can stop at once.', logicTone: 'warn',
          javaLines: [17, 18, 20], pyLines: [9, 10, 11, 14], algoStep: 4,
          tag: 'FELL OFF', alert: `Node ${cur} has no ${1 << j}-th ancestor: the tree is not tall enough, answer -1.`, note: `up[${j}][${cur}] = −1 → return −1`,
        });
        break;
      }
      extra.push({ from: cur, to: nxt, label: `2^${j}` });
      const states: Record<number, CellState> = {};
      for (const x of visited) states[x] = 'compare';
      states[nxt] = 'active';
      push({
        title: `Bit ${j} is set: node = up[${j}][${cur}] = ${nxt}`, desc: `Jump ${1 << j} step${j ? 's' : ''} up from ${cur} to ${nxt}.`,
        scene: split(ntScene({ par, states, extra }), { [`${j},${cur}`]: 'active' }),
        logic: 'One table lookup replaces 2^j individual parent steps.', logicTone: 'info',
        javaLines: [17, 18], pyLines: [9, 12, 13], algoStep: 3,
        tag: 'JUMP', note: `bit ${j} set → node = up[${j}][${cur}] = ${nxt}`,
      });
      visited.push(nxt);
      cur = nxt;
    }
    const ans = dead ? -1 : cur;
    answers.push(String(ans));
    push({
      title: `Answer: ${ans}`, desc: dead ? 'The ancestor does not exist, so the answer is -1.' : `All set bits used; the node we stand on, ${cur}, is the ${k}-th ancestor of ${node}.`,
      scene: split(ntScene({ par, states: dead ? { [node]: 'error' } : { [node]: 'compare', [cur]: 'found' }, extra: dead ? [] : extra })),
      logic: dead ? 'Return -1 when the walk leaves the tree.' : 'The jumps add up to exactly k steps, so this is the k-th ancestor.', logicTone: dead ? 'warn' : 'success',
      javaLines: [20], pyLines: [14], algoStep: 4,
      tag: 'ANSWER', note: dead ? 'return −1' : `return node = ${cur}`,
    });
  }

  vq = '—'; vnode = '—'; vk = '—'; vj = '—';
  push({
    title: 'All queries answered', desc: `Answers in order: [${answers.join(', ')}] (-1 means the tree is not that tall).`,
    scene: split(ntScene({ par })),
    logic: 'The table was built once; every query then cost at most log n jumps.', logicTone: 'success',
    javaLines: [20], pyLines: [14], algoStep: 5,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]`,
    result: { title: rangeStr(answers.map(Number)), text: 'Answers to the queries in order' },
  });
  return steps;
}

const ex = (par: number[], q: [number, number][], out: string): { label: string; input: In; output: string } => ({
  label: `${parList(par)} | ${q.map(([a, b]) => `${a}:${b}`).join(' ')}`, input: { par, queries: q }, output: out,
});

export const kthAncestorOfTreeNode: ProblemDef<In> = {
  slug: '1483-kth-ancestor-of-a-tree-node',
  id: '1483', title: 'Kth Ancestor of a Tree Node', difficulty: 'Hard', category: 'Tree', tag: 'binary lifting',
  statement: 'A rooted tree has n nodes numbered 0 to n-1 with root 0, given by a parent array. Preprocess it so that getKthAncestor(node, k) returns the k-th ancestor of node (its parent is the 1st), or -1 if the tree is not that tall.',
  constraints: '1 ≤ k ≤ n ≤ 5·10⁴, up to 5·10⁴ queries (animation: parents of nodes 1..n-1 written before |, at most 11 nodes and 3 queries written as node:k)',
  examples: [
    ex([-1, 0, 0, 1, 1, 2, 2, 3], [[7, 3], [5, 2], [4, 3]], '[0, 0, -1]'),
    ex([-1, 0, 1, 2, 3, 4, 5, 6, 7], [[8, 5], [6, 6], [3, 4]], '[3, 0, -1]'),
    ex([-1, 0, 0, 1, 1, 2, 3, 3, 4, 7], [[9, 1], [8, 2], [6, 3]], '[7, 1, 0]'),
  ],
  inputPlaceholder: 'e.g. 0 0 1 1 2 2 3 | 6:2 5:1   (parents of nodes 1..n-1 | node:k)',
  parseInput: parse, buildSteps: build, viz: 'cells', vizTitle: 'Tree and ancestor table', vizCaption: 'up[j][v] = the 2^j-th ancestor of v',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Already visited / half-jump', state: 'compare' }, { label: 'Answer / computed cell', state: 'found' }, { label: 'Fell off the root', state: 'error' }],
  varLabels: ['level j', 'query', 'node', 'k', 'answer'],
  approach: {
    title: 'Binary lifting: precompute 2^j-th ancestors',
    text: 'Store, for every node, its 1st, 2nd, 4th, 8th ... ancestor. Each row is made from the previous one by taking two half-jumps. To find the k-th ancestor, write k in binary and hop once for every set bit.',
  },
  java: [
    'class TreeAncestor {',
    '    private final int[][] up;',
    '    private final int log;',
    '',
    '    public TreeAncestor(int n, int[] parent) {',
    '        log = 32 - Integer.numberOfLeadingZeros(n);',
    '        up = new int[log][n];',
    '        up[0] = parent.clone();                 // 2^0: the parent',
    '        for (int j = 1; j < log; j++) {',
    '            for (int v = 0; v < n; v++) {',
    '                int mid = up[j - 1][v];',
    '                up[j][v] = mid < 0 ? -1 : up[j - 1][mid];   // two half-jumps',
    '            }',
    '        }',
    '    }',
    '',
    '    public int getKthAncestor(int node, int k) {',
    '        for (int j = 0; j < log && node >= 0; j++) {',
    '            if (((k >> j) & 1) == 1) node = up[j][node];',
    '        }',
    '        return node;',
    '    }',
    '}',
  ],
  python: [
    'class TreeAncestor:',
    '    def __init__(self, n, parent):',
    '        self.log = n.bit_length()',
    '        self.up = [parent[:]]                    # level 0: the parent',
    '        for j in range(1, self.log):',
    '            prev = self.up[-1]',
    '            self.up.append([-1 if m < 0 else prev[m] for m in prev])',
    '',
    '    def getKthAncestor(self, node, k):',
    '        for j in range(self.log):',
    '            if node < 0:',
    '                break',
    '            if (k >> j) & 1:',
    '                node = self.up[j][node]',
    '        return node',
  ],
  algorithm: [
    'Row 0 of the table is the parent array: up[0][v] = parent[v]',
    'Row j is built from row j-1: up[j][v] = up[j-1][ up[j-1][v] ], and stays -1 once it leaves the tree',
    'For a query, write k in binary',
    'For every set bit j, jump: node = up[j][node]',
    'If a jump leaves the tree answer -1, otherwise the node reached is the answer',
    'After the last query, return all the answers',
  ],
  phases: [
    { icon: '🌱', label: 'Row 0: parents', tone: 'blue' },
    { icon: '🏗', label: 'Build row j (two half-jumps)', tone: 'cyan' },
    { icon: '🔢', label: 'Write k in binary', tone: 'gold' },
    { icon: '🦘', label: 'Jump per set bit', tone: 'green' },
    { icon: '📍', label: 'Answer a query', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['k-th ancestor', 'parent array', '-1'],
  complexity: [{ label: 'Time', value: 'O(n log n) build, O(log k) per query' }, { label: 'Space', value: 'O(n log n)' }],
  why: 'Row j is correct by induction: the 2^j-th ancestor is reached by two hops of length 2^(j-1), and row j-1 already knows those hops. Any k is a sum of distinct powers of two, and ancestors compose along a single root path, so taking the hops for the set bits in any order lands on exactly the k-th ancestor. A missing ancestor (-1) can never come back, which is why an early -1 is the final answer.',
  naive: 'Walking up one parent at a time costs O(k) per query, which is O(n) on a path-shaped tree and too slow for 5·10⁴ queries.',
};
