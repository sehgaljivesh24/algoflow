import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { plural, verb } from '../text.ts';
import { dagScene, layoutDag, lineOf, parseNums, splitBar } from './kitC.ts';
import type { DagLayout, PNode } from './kitC.ts';

type Op = { k: 'set'; i: number; v: number } | { k: 'get'; ver: number; i: number };
interface In { a: number[]; ops: Op[] }

const EX = '5 3 8 2 | set:1=9 set:3=7 get:0.1 get:2.3 get:1.1';

function parse(raw: string): In {
  const [arrPart, toks] = splitBar(raw, EX);
  const a = parseNums(arrPart, { what: 'the array', min: 2, max: 4, lo: -50, hi: 50, example: '5 3 8 2' });
  if (!toks.length) throw new Error(`Add at least one operation after the bar, e.g. ${EX}`);
  if (toks.length > 6) throw new Error('Use at most 6 operations');
  let versions = 1;
  const ops = toks.map((t): Op => {
    let m = /^set:(\d+)=(-?\d+)$/i.exec(t);
    if (m) {
      const i = Number(m[1]);
      const v = Number(m[2]);
      if (i >= a.length) throw new Error(`"${t}": the index must be between 0 and ${a.length - 1}`);
      if (Math.abs(v) > 50) throw new Error('Keep new values within -50..50');
      versions++;
      if (versions > 4) throw new Error('Use at most 3 set operations (the picture holds 4 versions)');
      return { k: 'set', i, v };
    }
    m = /^get:(\d+)\.(\d+)$/i.exec(t);
    if (m) {
      const ver = Number(m[1]);
      const i = Number(m[2]);
      if (ver >= versions) throw new Error(`"${t}": version ${ver} does not exist yet (versions so far: 0..${versions - 1})`);
      if (i >= a.length) throw new Error(`"${t}": the index must be between 0 and ${a.length - 1}`);
      return { k: 'get', ver, i };
    }
    throw new Error(`"${t}" is not an operation. Write set:i=v (makes a new version) or get:version.i`);
  });
  return { a, ops };
}

const java = [
  'class Node {',
  '    final int sum;',
  '    final Node left, right;',
  '    Node(int sum, Node left, Node right) { this.sum = sum; this.left = left; this.right = right; }',
  '}',
  '',
  'class PersistentArray {',
  '    private final List<Node> roots = new ArrayList<>();   // roots.get(k) is version k',
  '    private final int n;',
  '',
  '    PersistentArray(int[] a) {',
  '        n = a.length;',
  '        roots.add(build(a, 0, n - 1));                      // version 0',
  '    }',
  '',
  '    private Node build(int[] a, int l, int r) {',
  '        if (l == r) return new Node(a[l], null, null);',
  '        int m = (l + r) / 2;',
  '        Node L = build(a, l, m), R = build(a, m + 1, r);',
  '        return new Node(L.sum + R.sum, L, R);',
  '    }',
  '',
  '    int set(int i, int v) {                                 // creates a NEW version',
  '        roots.add(set(roots.get(roots.size() - 1), 0, n - 1, i, v));',
  '        return roots.size() - 1;',
  '    }',
  '',
  '    private Node set(Node cur, int l, int r, int i, int v) {',
  '        if (l == r) return new Node(v, null, null);         // fresh leaf',
  '        int m = (l + r) / 2;',
  '        Node L = cur.left, R = cur.right;                   // share both children for now',
  '        if (i <= m) L = set(L, l, m, i, v);                 // copy only the child on the path',
  '        else R = set(R, m + 1, r, i, v);',
  '        return new Node(L.sum + R.sum, L, R);               // new parent, old subtree shared',
  '    }',
  '',
  '    int get(int version, int i) {',
  '        Node cur = roots.get(version);',
  '        int l = 0, r = n - 1;',
  '        while (l < r) {',
  '            int m = (l + r) / 2;',
  '            if (i <= m) { cur = cur.left; r = m; } else { cur = cur.right; l = m + 1; }',
  '        }',
  '        return cur.sum;',
  '    }',
  '}',
];
const python = [
  'class Node:',
  '    def __init__(self, s, left=None, right=None):',
  '        self.sum, self.left, self.right = s, left, right',
  '',
  'class PersistentArray:',
  '    def __init__(self, a):',
  '        self.n = len(a)',
  '        self.roots = [self._build(a, 0, self.n - 1)]          # roots[k] is version k',
  '',
  '    def _build(self, a, l, r):',
  '        if l == r: return Node(a[l])',
  '        m = (l + r) // 2',
  '        L, R = self._build(a, l, m), self._build(a, m + 1, r)',
  '        return Node(L.sum + R.sum, L, R)',
  '',
  '    def set(self, i, v):                                      # creates a NEW version',
  '        self.roots.append(self._set(self.roots[-1], 0, self.n - 1, i, v))',
  '        return len(self.roots) - 1',
  '',
  '    def _set(self, cur, l, r, i, v):',
  '        if l == r: return Node(v)                             # fresh leaf',
  '        m = (l + r) // 2',
  '        L, R = cur.left, cur.right                            # share both children for now',
  '        if i <= m: L = self._set(L, l, m, i, v)               # copy only the child on the path',
  '        else: R = self._set(R, m + 1, r, i, v)',
  '        return Node(L.sum + R.sum, L, R)                      # new parent, old subtree shared',
  '',
  '    def get(self, version, i):',
  '        cur, l, r = self.roots[version], 0, self.n - 1',
  '        while l < r:',
  '            m = (l + r) // 2',
  '            if i <= m: cur, r = cur.left, m',
  '            else: cur, l = cur.right, m + 1',
  '        return cur.sum',
];

const J = {
  build: [lineOf(java, 'roots.add(build'), lineOf(java, 'Node L = build'), lineOf(java, 'return new Node(L.sum + R.sum, L, R);')],
  setHead: [lineOf(java, 'int set(int i'), lineOf(java, 'roots.add(set(')],
  copy: [lineOf(java, 'share both children'), lineOf(java, 'copy only the child')],
  leaf: [lineOf(java, 'fresh leaf')],
  fix: [lineOf(java, 'new parent')],
  getHead: [lineOf(java, 'int get('), lineOf(java, 'Node cur = roots.get(version)')],
  getStep: [lineOf(java, 'if (i <= m) { cur = cur.left')],
  getEnd: [lineOf(java, 'return cur.sum;')],
};
const P = {
  build: [lineOf(python, 'self.roots = [self._build'), lineOf(python, 'L, R = self._build'), lineOf(python, 'return Node(L.sum + R.sum, L, R)')],
  setHead: [lineOf(python, 'def set(self, i, v)'), lineOf(python, 'self.roots.append')],
  copy: [lineOf(python, 'share both children'), lineOf(python, 'copy only the child')],
  leaf: [lineOf(python, 'fresh leaf')],
  fix: [lineOf(python, 'new parent')],
  getHead: [lineOf(python, 'def get('), lineOf(python, 'cur, l, r = self.roots[version]')],
  getStep: [lineOf(python, 'if i <= m: cur, r'), lineOf(python, 'else: cur, l')],
  getEnd: [lineOf(python, 'return cur.sum')],
};

function run(input: In, lay: DagLayout | null): { steps: Step[]; nodes: PNode[] } {
  const { a, ops } = input;
  const n = a.length;
  const nodes: PNode[] = [];
  const roots: number[] = [];
  const versArr: number[][] = [[...a]];
  const answers: number[] = [];
  const steps: Step[] = [];
  let st: Record<number, CellState> = {};
  let ptr: { label: string; node: number; tone: 'blue' | 'orange' }[] = [];
  let op = '—';
  let version: number | string = 0;
  let index: number | string = '—';

  const mkNode = (lo: number, hi: number, depth: number, left: number | null, right: number | null, val: number, ver: number): PNode => {
    const nd: PNode = { id: nodes.length, lo, hi, depth, left, right, val, ver, key: [lo, ver] };
    nodes.push(nd);
    return nd;
  };
  const scene = () => dagScene(nodes.map((x) => ({ ...x })), [...roots], lay, st, (x) => (x.lo === x.hi ? `[${x.lo}]` : `[${x.lo},${x.hi}]`), () => undefined, ptr);
  const aux = (): Aux[] => [
    { title: 'versions (array contents)', kind: 'list', items: versArr.map((v, k) => `v${k}: [${v.join(' ')}]`), highlight: roots.length - 1 },
    { title: 'get answers', kind: 'list', items: answers.map(String) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { op, version, index, answers: `[${answers.join(', ')}]` } });
  };

  // ---- version 0
  const buildRec = (l: number, r: number, depth: number): number => {
    if (l === r) return mkNode(l, r, depth, null, null, a[l], 0).id;
    const m = Math.floor((l + r) / 2);
    const L = buildRec(l, m, depth + 1);
    const R = buildRec(m + 1, r, depth + 1);
    return mkNode(l, r, depth, L, R, nodes[L].val + nodes[R].val, 0).id;
  };
  roots.push(buildRec(0, n - 1, 0));
  push({
    title: 'Version 0: an ordinary segment tree', desc: `Each box shows a node's sum and its range. The colour tells which version created the node; the top "vers" node lists every version root (v0 now).`,
    logic: 'Version 0 is a plain segment tree. Persistence only matters once we start changing it.', logicTone: 'info',
    javaLines: J.build, pyLines: P.build, algoStep: 0,
    tag: 'VERSION 0 —', note: `build(a, 0, ${n - 1}) → ${nodes.length} nodes, root sum = ${nodes[roots[0]].val}`,
  });

  for (const o of ops) {
    st = {};
    ptr = [];
    if (o.k === 'set') {
      const prevRoot = roots[roots.length - 1];
      const ver = roots.length;
      version = ver;
      index = o.i;
      op = `set(${o.i}, ${o.v}) -> v${ver}`;
      push({
        title: `set(${o.i}, ${o.v}) makes version ${ver}`, desc: `Nothing in the old versions may change. Instead we copy the nodes on the path from the root to index ${o.i} (path copying) and share everything else.`,
        logic: 'A new version costs O(log n) new nodes instead of a full copy of the tree.', logicTone: 'info',
        javaLines: J.setHead, pyLines: P.setHead, algoStep: 1,
        tag: 'NEW VERSION —', note: `roots.add(set(roots[${ver - 1}], 0, ${n - 1}, ${o.i}, ${o.v})) → version ${ver}; a[${o.i}] was ${versArr[ver - 1][o.i]}`,
      });
      const copies: PNode[] = [];
      let old = nodes[prevRoot];
      let l = 0;
      let r = n - 1;
      for (let d = 0; ; d++) {
        const cp = mkNode(l, r, d, old.left, old.right, old.val, ver);
        if (copies.length) {
          const par = copies[copies.length - 1];
          if (par.left === old.id) par.left = cp.id; else par.right = cp.id;
        } else roots.push(cp.id);
        copies.push(cp);
        st = {};
        copies.forEach((c) => { st[c.id] = 'active'; });
        st[old.id] = 'compare';
        if (l === r) {
          cp.val = o.v;
          push({
            title: `Fresh leaf for index ${o.i}`, desc: `The leaf [${o.i}] is replaced by a brand-new leaf holding ${o.v}. The old leaf (yellow) stays alive for older versions.`,
            logic: 'Only the leaf on the path changes value; everything else is reused.', logicTone: 'success',
            javaLines: J.leaf, pyLines: P.leaf, algoStep: 1,
            tag: 'FRESH LEAF —', note: `l == r == ${o.i} → new Node(${o.v}), old leaf kept (${old.val})`,
          });
          break;
        }
        push({
          title: `Copy node [${l},${r}]`, desc: `New node ${cp.id} starts as a copy of node ${old.id}: it points at the same two children (shared). Next we replace the child on the path to index ${o.i}.`,
          logic: 'The copy keeps pointing at old children, so untouched subtrees are shared between versions.', logicTone: 'info',
          javaLines: J.copy, pyLines: P.copy, algoStep: 1,
          tag: 'COPY PATH —', note: `copy [${l},${r}] (sum ${old.val}), then go ${o.i <= Math.floor((l + r) / 2) ? 'left' : 'right'}; ${copies.length} new node${copies.length === 1 ? '' : 's'} so far`,
        });
        const m = Math.floor((l + r) / 2);
        if (o.i <= m) { old = nodes[old.left!]; r = m; } else { old = nodes[old.right!]; l = m + 1; }
      }
      versArr.push(versArr[versArr.length - 1].map((x, k) => (k === o.i ? o.v : x)));
      for (let d = copies.length - 2; d >= 0; d--) {
        const c = copies[d];
        c.val = nodes[c.left!].val + nodes[c.right!].val;
        st = {};
        copies.forEach((x) => { st[x.id] = 'active'; });
        st[c.id] = 'swap';
        push({
          title: `Recompute sum of [${c.lo},${c.hi}] = ${c.val}`, desc: `Back on the way up: the new node's sum is the sum of its two children (one new, one shared).`,
          logic: 'Each copied ancestor gets a fresh sum; the old ancestors keep their old sums for the old versions.', logicTone: 'info',
          javaLines: J.fix, pyLines: P.fix, algoStep: 2,
          tag: 'RECOMPUTE —', note: `${nodes[c.left!].val} + ${nodes[c.right!].val} = ${c.val} for [${c.lo},${c.hi}]`,
        });
      }
      // final picture: new nodes active, shared children green
      st = {};
      const fresh = new Set(copies.map((c) => c.id));
      copies.forEach((c) => {
        st[c.id] = 'active';
        for (const ch of [c.left, c.right]) if (ch !== null && !fresh.has(ch)) st[ch] = 'found';
      });
      push({
        title: `Version ${ver} is ready`, desc: `${copies.length} new nodes (blue outline); the green nodes belong to older versions and are shared. Version ${ver} reads [${versArr[ver].join(' ')}].`,
        logic: 'Old versions are untouched, because no existing node was modified: new nodes only point at old ones.', logicTone: 'success',
        javaLines: J.setHead, pyLines: P.setHead, algoStep: 2,
        tag: 'VERSION READY —', note: `${copies.length} new of ${nodes.length} nodes in total; v${ver} = [${versArr[ver].join(' ')}]`,
      });
      continue;
    }
    // get
    version = o.ver;
    index = o.i;
    op = `get(v${o.ver}, ${o.i})`;
    let cur = nodes[roots[o.ver]];
    let l = 0;
    let r = n - 1;
    const walked: number[] = [];
    st = { [cur.id]: 'active' };
    ptr = [{ label: `v${o.ver}`, node: cur.id, tone: 'orange' }];
    push({
      title: `get(v${o.ver}, ${o.i}): start at the root of version ${o.ver}`, desc: `Version ${o.ver}'s root is node ${cur.id}. From here the walk is an ordinary segment-tree descent.`,
      logic: 'The version number just selects which root to start from.', logicTone: 'info',
      javaLines: J.getHead, pyLines: P.getHead, algoStep: 3,
      tag: 'READ VERSION —', note: `cur = roots[${o.ver}] = node ${cur.id}, searching index ${o.i} in [0,${n - 1}]`,
    });
    walked.push(cur.id);
    while (l < r) {
      const m = Math.floor((l + r) / 2);
      const goLeft = o.i <= m;
      cur = nodes[goLeft ? cur.left! : cur.right!];
      if (goLeft) r = m; else l = m + 1;
      walked.push(cur.id);
      st = {};
      walked.forEach((w) => { st[w] = 'compare'; });
      st[cur.id] = 'active';
      ptr = [{ label: `v${o.ver}`, node: cur.id, tone: 'orange' }];
      push({
        title: `Go ${goLeft ? 'left' : 'right'} to [${l},${r}]`, desc: `Index ${o.i} is ${goLeft ? 'at most' : 'greater than'} the middle ${m}, so follow the ${goLeft ? 'left' : 'right'} pointer to node ${cur.id}${cur.ver !== o.ver ? `, which was created by version ${cur.ver} and shared` : ''}.`,
        logic: 'Shared nodes are followed exactly like private ones: a version cannot tell the difference.', logicTone: 'info',
        javaLines: J.getStep, pyLines: P.getStep, algoStep: 3,
        tag: 'DESCEND —', note: `i=${o.i} ${goLeft ? '≤' : '>'} m=${m} → ${goLeft ? 'left' : 'right'}, now [${l},${r}]${cur.ver !== o.ver ? `, shared node from v${cur.ver}` : ''}`,
      });
    }
    answers.push(cur.val);
    st = {};
    walked.forEach((w) => { st[w] = 'compare'; });
    st[cur.id] = 'found';
    push({ title: `${op} = ${cur.val}`, desc: `The leaf reached holds ${cur.val}, so index ${o.i} of version ${o.ver} is ${cur.val}.`, logic: 'The answer comes from version ' + o.ver + ' only; later versions never changed it.', logicTone: 'success', javaLines: J.getEnd, pyLines: P.getEnd, algoStep: 3, tag: 'READ —', note: `return cur.sum = ${cur.val}` });
  }
  st = {};
  ptr = [];
  op = 'done';
  version = '—';
  index = '—';
  push({ title: 'All operations done', desc: `Values returned by get: [${answers.join(', ')}]. ${plural(roots.length, 'version')} ${verb(roots.length, 'shares', 'share')} ${plural(nodes.length, 'node')} in total; storing them as separate trees would need ${roots.length * (2 * n - 1)}.`, logic: 'Each set added O(log n) nodes, so history is cheap to keep.', logicTone: 'success', javaLines: J.getEnd, pyLines: P.getEnd, algoStep: 4, tag: '✅ Done!', note: `${nodes.length} shared nodes vs ${roots.length * (2 * n - 1)} for separate copies` });
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Values returned by the get operations' };
  return { steps, nodes };
}

function build(input: In): Step[] {
  const first = run(input, null);
  return run(input, layoutDag(first.nodes)).steps;
}

const mk = (s: string): In => parse(s);

export const persistentSegmentTreeVersionArray: ProblemDef<In> = {
  slug: 'cp-persistent-segment-tree-version-array',
  id: 'CP', title: 'Persistent Segment Tree: Version Array', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'persistent segment tree',
  statement: 'Keep a full history of an array. set(i, v) must create a new version of the array without disturbing any earlier version, and get(version, i) must read index i of any version. Build the array as a segment tree and use path copying: a set copies only the O(log n) nodes on the root-to-leaf path and shares every other subtree with the previous version.',
  constraints: 'Animation input: 2 to 4 integers in -50..50, then up to 6 operations: set:i=v (at most 3 of them) and get:version.i',
  examples: [
    { label: EX, input: mk(EX), output: '[3, 7, 9]' },
    { label: '4 1 7 | set:2=0 get:0.2 get:1.2 set:0=9 get:2.0 get:1.0', input: mk('4 1 7 | set:2=0 get:0.2 get:1.2 set:0=9 get:2.0 get:1.0'), output: '[7, 0, 9, 4]' },
    { label: '6 6 | set:0=1 set:1=2 get:0.0 get:2.1 get:2.0', input: mk('6 6 | set:0=1 set:1=2 get:0.0 get:2.1 get:2.0'), output: '[6, 2, 1]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Version DAG (shared nodes)',
  vizCaption: 'node colour = version that created it: grey v0, orange v1, purple v2, red v3',
  legend: [{ label: 'New node of this version', state: 'active' }, { label: 'Shared with an older version', state: 'found' }, { label: 'Old node being copied / walk path', state: 'compare' }, { label: 'Sum being recomputed', state: 'swap' }],
  varLabels: ['op', 'version', 'index', 'answers'],
  approach: {
    title: 'Copy the path, share the rest',
    text: 'Never modify a node. To change index i, create new copies of the nodes from the root down to the leaf of i; each copy points at the new child on the path and at the old, untouched sibling. The new root is the new version. Any version is read by starting at its root.',
  },
  java, python,
  algorithm: [
    'Build version 0 as a normal segment tree and remember its root',
    'set(i, v): copy the root-to-leaf path for index i, sharing all other children',
    'Recompute the sums of the copied nodes bottom-up; the copied root is the new version',
    'get(version, i): descend from that version\'s root exactly like a plain segment tree',
    'Return the values read and the version history',
  ],
  emphasis: ['full history', 'new version', 'path copying', 'shares every other subtree'],
  phases: [
    { icon: '🌳', label: 'Version 0: build', tone: 'blue' },
    { icon: '📑', label: 'set: copy the path', tone: 'cyan' },
    { icon: '🧮', label: 'Recompute copied sums', tone: 'green' },
    { icon: '🔎', label: 'get: read a version', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  complexity: [{ label: 'Time', value: 'O(log n) per set and get' }, { label: 'Space', value: 'O(n + q log n) nodes' }],
  why: 'Because a node is never changed after it is created, every old root still describes exactly the array it described when it was made. A set creates one new node per level (O(log n)) whose other pointers reuse old nodes, so each version is a complete tree built from only O(log n) fresh nodes. Reading a version needs no special logic: it is the ordinary descent from that version\'s root.',
  naive: 'Copying the whole array for every version costs O(n) time and memory per update. Persistence keeps every version readable while paying only O(log n) per update.',
};
