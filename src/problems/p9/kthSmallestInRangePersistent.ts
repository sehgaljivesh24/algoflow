import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { dagScene, layoutDag, lineOf, parseNums, splitBar } from './kitC.ts';
import type { DagLayout, PNode } from './kitC.ts';

interface Q { l: number; r: number; k: number }
interface In { a: number[]; qs: Q[] }

const EX = '4 1 9 4 7 | q:2-5:2 q:1-4:3 q:3-5:1';

function parse(raw: string): In {
  const [arrPart, toks] = splitBar(raw, EX);
  const a = parseNums(arrPart, { what: 'the array', min: 2, max: 5, lo: 1, hi: 99, example: '4 1 9 4 7' });
  if (new Set(a).size > 4) throw new Error('Use at most 4 different values (the picture shows one tree per prefix)');
  if (!toks.length) throw new Error(`Add at least one query after the bar, e.g. ${EX}`);
  if (toks.length > 3) throw new Error('Use at most 3 queries');
  const qs = toks.map((t): Q => {
    const m = /^q:(\d+)-(\d+):(\d+)$/i.exec(t);
    if (!m) throw new Error(`"${t}" is not a query. Write q:l-r:k (1-based positions), e.g. q:2-5:2`);
    const l = Number(m[1]);
    const r = Number(m[2]);
    const k = Number(m[3]);
    if (l < 1 || l > r || r > a.length) throw new Error(`"${t}": positions must satisfy 1 <= l <= r <= ${a.length}`);
    if (k < 1 || k > r - l + 1) throw new Error(`"${t}": k must be between 1 and ${r - l + 1}, the length of the range`);
    return { l, r, k };
  });
  return { a, qs };
}

const java = [
  'class KthInRange {',
  '    static class Node { int cnt; Node left, right; }',
  '    private final int[] vals;                       // sorted distinct values',
  '    private final Node[] root;                      // root[i] = tree after the first i elements',
  '',
  '    KthInRange(int[] a) {',
  '        vals = Arrays.stream(a).distinct().sorted().toArray();',
  '        int m = vals.length;',
  '        root = new Node[a.length + 1];',
  '        root[0] = empty(0, m - 1);                  // version 0: every count is 0',
  '        for (int i = 0; i < a.length; i++) {',
  '            int rank = Arrays.binarySearch(vals, a[i]);',
  '            root[i + 1] = insert(root[i], 0, m - 1, rank);',
  '        }',
  '    }',
  '',
  '    private Node empty(int lo, int hi) {',
  '        Node x = new Node();',
  '        if (lo < hi) { int mid = (lo + hi) / 2; x.left = empty(lo, mid); x.right = empty(mid + 1, hi); }',
  '        return x;',
  '    }',
  '',
  '    private Node insert(Node prev, int lo, int hi, int pos) {',
  '        Node cur = new Node();',
  '        cur.cnt = prev.cnt + 1;                     // one more element in this value range',
  '        cur.left = prev.left; cur.right = prev.right;   // share children for now',
  '        if (lo == hi) return cur;',
  '        int mid = (lo + hi) / 2;',
  '        if (pos <= mid) cur.left = insert(prev.left, lo, mid, pos);',
  '        else cur.right = insert(prev.right, mid + 1, hi, pos);',
  '        return cur;',
  '    }',
  '',
  '    int kth(int l, int r, int k) {                  // positions l..r, 1-based',
  '        Node a = root[r], b = root[l - 1];          // difference of two versions = the range',
  '        int lo = 0, hi = vals.length - 1;',
  '        while (lo < hi) {',
  '            int mid = (lo + hi) / 2;',
  '            int inLeft = a.left.cnt - b.left.cnt;   // range elements in the smaller half',
  '            if (k <= inLeft) { a = a.left; b = b.left; hi = mid; }',
  '            else { k -= inLeft; a = a.right; b = b.right; lo = mid + 1; }',
  '        }',
  '        return vals[lo];',
  '    }',
  '}',
];
const python = [
  'class Node:',
  '    def __init__(self, cnt=0, left=None, right=None):',
  '        self.cnt, self.left, self.right = cnt, left, right',
  '',
  'class KthInRange:',
  '    def __init__(self, a):',
  '        self.vals = sorted(set(a))                   # sorted distinct values',
  '        m = len(self.vals)',
  '        self.root = [self._empty(0, m - 1)]          # version 0: every count is 0',
  '        for x in a:',
  '            rank = self.vals.index(x)',
  '            self.root.append(self._insert(self.root[-1], 0, m - 1, rank))',
  '',
  '    def _empty(self, lo, hi):',
  '        if lo == hi: return Node()',
  '        mid = (lo + hi) // 2',
  '        return Node(0, self._empty(lo, mid), self._empty(mid + 1, hi))',
  '',
  '    def _insert(self, prev, lo, hi, pos):',
  '        cur = Node(prev.cnt + 1, prev.left, prev.right)   # one more element, children shared for now',
  '        if lo == hi: return cur',
  '        mid = (lo + hi) // 2',
  '        if pos <= mid: cur.left = self._insert(prev.left, lo, mid, pos)',
  '        else: cur.right = self._insert(prev.right, mid + 1, hi, pos)',
  '        return cur',
  '',
  '    def kth(self, l, r, k):                          # positions l..r, 1-based',
  '        a, b = self.root[r], self.root[l - 1]        # difference of two versions = the range',
  '        lo, hi = 0, len(self.vals) - 1',
  '        while lo < hi:',
  '            mid = (lo + hi) // 2',
  '            in_left = a.left.cnt - b.left.cnt        # range elements in the smaller half',
  '            if k <= in_left: a, b, hi = a.left, b.left, mid',
  '            else: k -= in_left; a, b, lo = a.right, b.right, mid + 1',
  '        return self.vals[lo]',
];

const J = {
  empty: [lineOf(java, 'root[0] = empty')],
  insHead: [lineOf(java, 'int rank'), lineOf(java, 'root[i + 1] = insert')],
  insCopy: [lineOf(java, 'cur.cnt = prev.cnt + 1'), lineOf(java, 'share children for now'), lineOf(java, 'if (pos <= mid) cur.left')],
  insLeaf: [lineOf(java, 'if (lo == hi) return cur;')],
  qHead: [lineOf(java, 'int kth(int l'), lineOf(java, 'Node a = root[r]')],
  qStep: [lineOf(java, 'int inLeft'), lineOf(java, 'if (k <= inLeft)')],
  qRight: [lineOf(java, 'int inLeft'), lineOf(java, 'else { k -= inLeft')],
  qEnd: [lineOf(java, 'return vals[lo];')],
};
const P = {
  empty: [lineOf(python, 'self.root = [self._empty')],
  insHead: [lineOf(python, 'rank = self.vals.index'), lineOf(python, 'self.root.append')],
  insCopy: [lineOf(python, 'cur = Node(prev.cnt + 1'), lineOf(python, 'if pos <= mid: cur.left')],
  insLeaf: [lineOf(python, 'if lo == hi: return cur')],
  qHead: [lineOf(python, 'def kth'), lineOf(python, 'a, b = self.root[r]')],
  qStep: [lineOf(python, 'in_left ='), lineOf(python, 'if k <= in_left')],
  qRight: [lineOf(python, 'in_left ='), lineOf(python, 'else: k -= in_left')],
  qEnd: [lineOf(python, 'return self.vals[lo]')],
};

function run(input: In, lay: DagLayout | null): { steps: Step[]; nodes: PNode[] } {
  const { a, qs } = input;
  const vals = [...new Set(a)].sort((x, y) => x - y);
  const m = vals.length;
  const nodes: PNode[] = [];
  const roots: number[] = [];
  const answers: number[] = [];
  const steps: Step[] = [];
  let st: Record<number, CellState> = {};
  let ptr: { label: string; node: number; tone: 'orange' | 'purple' }[] = [];
  let op = '—';
  let rangeTxt = '—';
  let kk: number | string = '—';

  const rangeLabel = (lo: number, hi: number) => (lo === hi ? `v=${vals[lo]}` : `${vals[lo]}..${vals[hi]}`);
  const mkNode = (lo: number, hi: number, depth: number, left: number | null, right: number | null, val: number, ver: number): PNode => {
    const nd: PNode = { id: nodes.length, lo, hi, depth, left, right, val, ver, key: [lo, ver] };
    nodes.push(nd);
    return nd;
  };
  const scene = () => dagScene(nodes.map((x) => ({ ...x })), [...roots], lay, st, (x) => rangeLabel(x.lo, x.hi), () => undefined, ptr);
  const prefix = (i: number) => `{${a.slice(0, i).join(' ')}}`;
  const aux = (): Aux[] => [
    { title: 'versions (elements inserted so far)', kind: 'list', items: roots.map((_, i) => `v${i}: ${prefix(i)}`), highlight: roots.length - 1 },
    { title: 'answers', kind: 'list', items: answers.map(String) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { op, range: rangeTxt, k: kk, answers: `[${answers.join(', ')}]` } });
  };

  const emptyRec = (lo: number, hi: number, depth: number): number => {
    if (lo === hi) return mkNode(lo, hi, depth, null, null, 0, 0).id;
    const mid = Math.floor((lo + hi) / 2);
    const L = emptyRec(lo, mid, depth + 1);
    const R = emptyRec(mid + 1, hi, depth + 1);
    return mkNode(lo, hi, depth, L, R, 0, 0).id;
  };
  roots.push(emptyRec(0, m - 1, 0));
  push({
    title: 'Version 0: an empty tree over the values', desc: `The ${m} distinct value${m === 1 ? '' : 's'} ${vals.join(', ')} are the leaves; each box counts how many inserted elements fall in its value range (shown under the count). Everything is 0.`,
    logic: 'The tree is indexed by VALUE, not by position. Version i will count the first i array elements.', logicTone: 'info',
    javaLines: J.empty, pyLines: P.empty, algoStep: 0,
    tag: 'VERSION 0 —', note: `vals = [${vals.join(', ')}] → ${m} leaves, all counts 0`,
  });

  a.forEach((x, idx) => {
    const ver = idx + 1;
    const rank = vals.indexOf(x);
    st = {};
    op = `insert a[${ver}] = ${x}`;
    kk = '—';
    rangeTxt = `v${idx} -> v${ver}`;
    push({
      title: `Insert ${x} (position ${ver}) to make version ${ver}`, desc: `Value ${x} has rank ${rank}. Path copying: copy the nodes from the root to leaf ${x}, adding one to each count, and share all other subtrees with version ${idx}.`,
      logic: 'Version i = version i-1 plus one element, built from only O(log m) new nodes.', logicTone: 'info',
      javaLines: J.insHead, pyLines: P.insHead, algoStep: 1,
      tag: 'INSERT —', note: `rank = binarySearch(vals, ${x}) = ${rank}; root[${ver}] = insert(root[${idx}], ...)`,
    });
    const copies: PNode[] = [];
    let old = nodes[roots[roots.length - 1]];
    for (;;) {
      const cp = mkNode(old.lo, old.hi, old.depth, old.left, old.right, old.val + 1, ver);
      if (copies.length) {
        const par = copies[copies.length - 1];
        if (par.left === old.id) par.left = cp.id; else par.right = cp.id;
      } else roots.push(cp.id);
      copies.push(cp);
      st = {};
      copies.forEach((c) => { st[c.id] = 'active'; });
      st[old.id] = 'compare';
      const leaf = old.lo === old.hi;
      push({
        title: leaf ? `New leaf for ${x}: count ${cp.val}` : `Copy [${rangeLabel(old.lo, old.hi)}]: count ${old.val} -> ${cp.val}`,
        desc: leaf ? `The leaf gets a fresh node with count ${cp.val}. The old leaf (yellow) keeps serving older versions.` : `New node ${cp.id} copies node ${old.id} with count + 1 and, for now, points to the same children (shared).`,
        logic: leaf ? 'Every node on the path counted one more element; no old node was modified.' : 'Only the nodes on the path change; each gets count + 1.', logicTone: leaf ? 'success' : 'info',
        javaLines: leaf ? J.insLeaf : J.insCopy, pyLines: leaf ? P.insLeaf : P.insCopy, algoStep: 1,
        tag: leaf ? 'NEW LEAF —' : 'COPY PATH —', note: `cur.cnt = prev.cnt + 1 = ${old.val} + 1 = ${cp.val}${leaf ? '' : ', children shared for now'}`,
      });
      if (leaf) break;
      const mid = Math.floor((old.lo + old.hi) / 2);
      old = nodes[rank <= mid ? old.left! : old.right!];
    }
    st = {};
    const fresh = new Set(copies.map((c) => c.id));
    copies.forEach((c) => {
      st[c.id] = 'active';
      for (const ch of [c.left, c.right]) if (ch !== null && !fresh.has(ch)) st[ch] = 'found';
    });
    push({
      title: `Version ${ver} ready: ${prefix(ver)}`, desc: `${copies.length} new nodes were created (blue outline); the green nodes are shared with older versions.`,
      logic: 'After n inserts there are n + 1 roots, and the tree of any prefix can be read from its root.', logicTone: 'success',
      javaLines: J.insHead, pyLines: P.insHead, algoStep: 1,
      tag: 'VERSION READY —', note: `${copies.length} new nodes, ${nodes.length} in total; v${ver} counts ${prefix(ver)}`,
    });
  });

  for (const q of qs) {
    st = {};
    let A = nodes[roots[q.r]];
    let B = nodes[roots[q.l - 1]];
    let k = q.k;
    op = `kth(${q.l}, ${q.r}, ${q.k})`;
    rangeTxt = `v${q.r} - v${q.l - 1}`;
    kk = k;
    const sub = a.slice(q.l - 1, q.r);
    st = { [A.id]: 'active', [B.id]: 'compare' };
    ptr = [{ label: `R:v${q.r}`, node: A.id, tone: 'orange' }, { label: `L:v${q.l - 1}`, node: B.id, tone: 'purple' }];
    push({
      title: `${q.k}-th smallest of positions ${q.l}..${q.r}`, desc: `The range holds [${sub.join(' ')}]. Its value counts are (version ${q.r}) minus (version ${q.l - 1}), so we walk both trees together from their roots.`,
      logic: 'Subtracting two prefix versions gives the counts of exactly the elements in the range, without building anything new.', logicTone: 'info',
      javaLines: J.qHead, pyLines: P.qHead, algoStep: 2,
      tag: 'QUERY —', note: `a = root[${q.r}], b = root[${q.l - 1}], k = ${q.k}, range [${sub.join(' ')}]`,
    });
    while (A.lo < A.hi) {
      const la = nodes[A.left!].val;
      const lb = nodes[B.left!].val;
      const inLeft = la - lb;
      const goLeft = k <= inLeft;
      const before = k;
      if (goLeft) { A = nodes[A.left!]; B = nodes[B.left!]; } else { k -= inLeft; A = nodes[A.right!]; B = nodes[B.right!]; }
      kk = k;
      st = { [A.id]: 'active', [B.id]: 'compare' };
      ptr = [{ label: `R:v${q.r}`, node: A.id, tone: 'orange' }, { label: `L:v${q.l - 1}`, node: B.id, tone: 'purple' }];
      push({
        title: goLeft ? `${inLeft} in the smaller half: go left` : `Only ${inLeft} in the smaller half: go right with k = ${k}`,
        desc: `Range elements in the smaller half: ${la} - ${lb} = ${inLeft}. ${goLeft ? `k = ${before} <= ${inLeft}, so the answer is among the smaller values (${rangeLabel(A.lo, A.hi)}).` : `k = ${before} > ${inLeft}: skip those ${inLeft}; the answer is the ${k}-th among the larger values (${rangeLabel(A.lo, A.hi)}).`}`,
        logic: 'count(range in left half) = count in version r minus count in version l-1, so one subtraction decides the direction.', logicTone: 'info',
        javaLines: goLeft ? J.qStep : J.qRight, pyLines: goLeft ? P.qStep : P.qRight, algoStep: 3,
        tag: goLeft ? 'GO LEFT:' : 'GO RIGHT:',
        note: `inLeft = ${la} − ${lb} = ${inLeft}; k = ${before} ${goLeft ? '≤' : '>'} ${inLeft} → ${goLeft ? 'left' : `k = ${before} − ${inLeft} = ${k}, right`}`,
      });
    }
    const ans = vals[A.lo];
    answers.push(ans);
    st = { [A.id]: 'found', [B.id]: 'compare' };
    push({ title: `${op} = ${ans}`, desc: `Both walks ended on the leaf for value ${ans}; it is the ${q.k}-th smallest in [${sub.join(' ')}]. Sorted: [${[...sub].sort((x, y) => x - y).join(' ')}].`, logic: 'O(log m) steps, regardless of how long the range is.', logicTone: 'success', javaLines: J.qEnd, pyLines: P.qEnd, algoStep: 4, tag: 'ANSWER —', note: `return vals[${A.lo}] = ${ans}` });
  }
  st = {};
  ptr = [];
  op = 'done';
  rangeTxt = '—';
  kk = '—';
  push({ title: 'All queries answered', desc: `Answers in order: [${answers.join(', ')}]. ${roots.length} versions share ${nodes.length} nodes.`, logic: 'Persistence turned "k-th smallest in a range" into a walk over two trees.', logicTone: 'success', javaLines: J.qEnd, pyLines: P.qEnd, algoStep: 5, tag: '✅ Done!', note: `${roots.length} versions share ${nodes.length} nodes` });
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'k-th smallest of each queried range' };
  return { steps, nodes };
}

function build(input: In): Step[] {
  const first = run(input, null);
  return run(input, layoutDag(first.nodes)).steps;
}

const mk = (s: string): In => parse(s);

export const kthSmallestInRangePersistent: ProblemDef<In> = {
  slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree',
  id: 'CP', title: 'Kth Smallest in a Range (Persistent Segment Tree)', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'persistent segment tree',
  statement: 'Answer queries "what is the k-th smallest value among positions l..r of the array?" (positions are 1-based). Build a persistent segment tree over the VALUES: version i counts the first i elements. The counts of a range are version r minus version l-1, and a simultaneous walk down both trees finds the k-th smallest in O(log m).',
  constraints: 'Animation input: 2 to 5 integers in 1..99 with at most 4 different values, then up to 3 queries written q:l-r:k (1-based, k at most the range length)',
  examples: [
    { label: EX, input: mk(EX), output: '[4, 4, 4]' },
    { label: '3 8 3 1 8 | q:1-5:4 q:2-4:1 q:3-5:2', input: mk('3 8 3 1 8 | q:1-5:4 q:2-4:1 q:3-5:2'), output: '[8, 1, 3]' },
    { label: '6 2 6 | q:1-3:2 q:2-3:2', input: mk('6 2 6 | q:1-3:2 q:2-3:2'), output: '[6, 6]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Prefix versions (shared nodes)',
  vizCaption: 'boxes: count of elements whose value lies in the range written below it; node colour = version that created it',
  legend: [{ label: 'Walking in version r / new node', state: 'active' }, { label: 'Walking in version l-1 / old node copied', state: 'compare' }, { label: 'Shared with an older version', state: 'found' }],
  varLabels: ['op', 'range', 'k', 'answers'],
  approach: {
    title: 'Prefix versions, then subtract two of them',
    text: 'Insert the array left to right into a persistent count tree over the values, keeping the root after every insert. For positions l..r, walk down version r and version l-1 together: the difference of the left-child counts tells how many range elements are in the smaller half, so you go left or go right with a reduced k.',
  },
  java, python,
  algorithm: [
    'Compress the values and build version 0: an empty count tree over the sorted values',
    'Insert each element with path copying; keep the root of every prefix version',
    'For a query take roots r and l-1 and start at the top of both trees',
    'At each node compute inLeft = left count (version r) - left count (version l-1); if k <= inLeft go left, otherwise subtract inLeft and go right',
    'The leaf reached is the k-th smallest value of the range',
    'Return the answers of all queries',
  ],
  emphasis: ['k-th smallest', 'persistent segment tree', 'version r minus version l-1'],
  phases: [
    { icon: '🌳', label: 'Version 0: empty counts', tone: 'blue' },
    { icon: '📑', label: 'Insert with path copying', tone: 'cyan' },
    { icon: '📍', label: 'Take roots r and l−1', tone: 'blue' },
    { icon: '⚖️', label: 'inLeft: go left or right', tone: 'orange' },
    { icon: '🎯', label: 'Leaf = answer', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  complexity: [{ label: 'Time', value: 'O((n + q) log n)' }, { label: 'Space', value: 'O(n log n)' }],
  why: 'Version i is a count tree of exactly the first i elements, so for any node, (count in version r) - (count in version l-1) is the number of elements at positions l..r whose value lies in that node\'s range. The k-th smallest is found by the usual rank-descent: if at least k range elements fall in the smaller half it is there, otherwise skip them and look for the (k - inLeft)-th in the larger half. Path copying creates only O(log m) nodes per insert, so all n prefix versions fit in O(n log n) space.',
  naive: 'Sorting every queried subarray costs O(n log n) per query. A persistent tree pays O(log n) per query after an O(n log n) preprocessing.',
};
