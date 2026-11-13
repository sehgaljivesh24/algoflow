/**
 * Shared animation engine for the plain (non-lazy) segment-tree problems: Range Sum Query - Mutable (op 'sum') and
 * Range Minimum Query (op 'min'). The Java / Python listings below have the SAME line layout for both ops, so one
 * set of highlighted line numbers serves both problems.
 */
import type { Aux, CellState, Phase, Pointer, Step } from '../../engine/types.ts';
import { rangeText, segScene, segStructure } from './kitB.ts';
import type { ParsedOps } from './kitB.ts';

export type SegOp = 'sum' | 'min';

/** Phase chips shared by both plain segment-tree problems (same length as their `algorithm`, last = Done). */
export const segPhases: Phase[] = [
  { icon: '🔨', label: 'Build (bottom-up)', tone: 'blue' },
  { icon: '⬇', label: 'Update: walk to the leaf', tone: 'cyan' },
  { icon: '🔧', label: 'Update: repair ancestors', tone: 'green' },
  { icon: '🔍', label: 'Query: skip, take, split', tone: 'gold' },
  { icon: '✅', label: 'Done', tone: 'green' },
];

const INF = Number.POSITIVE_INFINITY;
const show = (v: number): string => (v === INF ? '∞' : String(v));

export function segCode(op: SegOp): { java: string[]; python: string[] } {
  const s = op === 'sum';
  const cls = s ? 'NumArray' : 'MinArray';
  const J = (plus: string, mn: string) => (s ? plus : mn);
  const java = [
    `class ${cls} {`,
    '    private final int n;',
    '    private final int[] tree;',
    '',
    `    public ${cls}(int[] nums) {`,
    '        n = nums.length;',
    '        tree = new int[4 * n];',
    '        build(1, 0, n - 1, nums);',
    '    }',
    '',
    '    private void build(int node, int l, int r, int[] a) {',
    '        if (l == r) { tree[node] = a[l]; return; }',
    '        int mid = (l + r) / 2;',
    '        build(2 * node, l, mid, a);',
    '        build(2 * node + 1, mid + 1, r, a);',
    J('        tree[node] = tree[2 * node] + tree[2 * node + 1];', '        tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]);'),
    '    }',
    '',
    `    public void ${s ? 'update' : 'set'}(int index, int val) { update(1, 0, n - 1, index, val); }`,
    '',
    '    private void update(int node, int l, int r, int i, int val) {',
    '        if (l == r) { tree[node] = val; return; }',
    '        int mid = (l + r) / 2;',
    '        if (i <= mid) update(2 * node, l, mid, i, val);',
    '        else update(2 * node + 1, mid + 1, r, i, val);',
    J('        tree[node] = tree[2 * node] + tree[2 * node + 1];', '        tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]);'),
    '    }',
    '',
    `    public int ${s ? 'sumRange' : 'minRange'}(int left, int right) { return query(1, 0, n - 1, left, right); }`,
    '',
    '    private int query(int node, int l, int r, int ql, int qr) {',
    `        if (qr < l || r < ql) return ${J('0', 'Integer.MAX_VALUE')};   // outside the query`,
    '        if (ql <= l && r <= qr) return tree[node];   // fully inside',
    '        int mid = (l + r) / 2;',
    J('        return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);', '        return Math.min(query(2 * node, l, mid, ql, qr), query(2 * node + 1, mid + 1, r, ql, qr));'),
    '    }',
    '}',
  ];
  const python = [
    `class ${cls}:`,
    '    def __init__(self, nums):',
    '        self.n = len(nums)',
    '        self.tree = [0] * (4 * self.n)',
    '        self._build(1, 0, self.n - 1, nums)',
    '',
    '    def _build(self, node, l, r, a):',
    '        if l == r:',
    '            self.tree[node] = a[l]',
    '            return',
    '        mid = (l + r) // 2',
    '        self._build(2 * node, l, mid, a)',
    '        self._build(2 * node + 1, mid + 1, r, a)',
    J('        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]', '        self.tree[node] = min(self.tree[2 * node], self.tree[2 * node + 1])'),
    '',
    `    def ${s ? 'update' : 'set'}(self, i, val):`,
    '        self._update(1, 0, self.n - 1, i, val)',
    '',
    '    def _update(self, node, l, r, i, val):',
    '        if l == r:',
    '            self.tree[node] = val',
    '            return',
    '        mid = (l + r) // 2',
    '        if i <= mid:',
    '            self._update(2 * node, l, mid, i, val)',
    '        else:',
    '            self._update(2 * node + 1, mid + 1, r, i, val)',
    J('        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]', '        self.tree[node] = min(self.tree[2 * node], self.tree[2 * node + 1])'),
    '',
    `    def ${s ? 'sumRange' : 'minRange'}(self, left, right):`,
    '        return self._query(1, 0, self.n - 1, left, right)',
    '',
    '    def _query(self, node, l, r, ql, qr):',
    '        if qr < l or r < ql:',
    `            return ${J('0', 'float("inf")')}`,
    '        if ql <= l and r <= qr:',
    '            return self.tree[node]',
    '        mid = (l + r) // 2',
    J('        return (self._query(2 * node, l, mid, ql, qr) +', '        return min(self._query(2 * node, l, mid, ql, qr),'),
    '                self._query(2 * node + 1, mid + 1, r, ql, qr))',
  ];
  return { java, python };
}

/** Line numbers (0-based) for each event, for both listings (layout is identical for sum and min). */
const L = {
  start: { j: [4, 5, 6, 7], p: [1, 2, 3, 4] },
  leaf: { j: [11], p: [7, 8, 9] },
  merge: { j: [12, 13, 14, 15], p: [10, 11, 12, 13] },
  upTop: { j: [18], p: [15, 16] },
  upLeaf: { j: [21], p: [19, 20, 21] },
  upDown: { j: [22, 23, 24], p: [22, 23, 24, 25, 26] },
  upBack: { j: [25], p: [27] },
  qTop: { j: [28], p: [29, 30] },
  out: { j: [31], p: [33, 34] },
  inside: { j: [32], p: [35, 36] },
  part: { j: [33, 34], p: [37, 38, 39] },
};

export function segSteps(input: ParsedOps, op: SegOp): Step[] {
  const a = [...input.nums];
  const n = a.length;
  const shape = segStructure(n);
  const val: number[] = new Array(4 * n).fill(0);
  const built = new Set<number>();
  const ident = op === 'sum' ? 0 : INF;
  const comb = (x: number, y: number) => (op === 'sum' ? x + y : Math.min(x, y));
  const qName = op === 'sum' ? 'sum' : 'min';
  const word = op === 'sum' ? 'sum' : 'minimum';
  const steps: Step[] = [];
  let st: Record<number, CellState> = {};
  let cellSt: (i: number) => CellState | undefined = () => undefined;
  let ptrs: Pointer[] = [];
  let opText = 'build';
  let nodeText = '—';
  let running: number | string = '—';
  const answers: string[] = [];
  let pieces: string[] = [];

  const emit = (title: string, desc: string, logic: string, tone: Step['logicTone'], l: { j: number[]; p: number[] }, algo: number, here: number | null, tag: string, note: string, alert?: string) => {
    const states: Record<number, CellState> = {};
    for (const s of shape) states[s.id] = !built.has(s.id) ? 'dim' : st[s.id] as CellState;
    const aux: Aux[] = [];
    if (pieces.length) aux.push({ title: `pieces added (${word})`, kind: 'list', items: [...pieces] });
    if (answers.length) aux.push({ title: 'answers so far', kind: 'list', items: [...answers] });
    steps.push({
      title, desc, logic, logicTone: tone, javaLines: l.j, pyLines: l.p, algoStep: algo, tag, note, alert,
      scene: segScene(shape, (id) => (built.has(id) ? show(val[id]) : '·'), states, {}, here, a, cellSt, ptrs),
      aux: aux.length ? aux : undefined,
      vars: { op: opText, node: nodeText, running, answers: `[${answers.join(', ')}]` },
    });
  };

  emit('Start', `An array of ${n} numbers. Every segment-tree node will store the ${word} of one contiguous range; the root covers [0,${n - 1}] and each node splits its range in half. The nodes are still empty (·).`,
    `A node's range is the union of its two children's ranges, so its value can be computed from them alone.`, 'info', L.start, 0, null,
    'START —', `n = ${n}, tree = new int[${4 * n}], root = node 1 covers [0,${n - 1}]`);

  const build = (id: number, l: number, r: number) => {
    nodeText = rangeText(l, r);
    if (l === r) {
      val[id] = a[l]; built.add(id); st = { [id]: 'found' };
      emit(`Leaf ${rangeText(l, r)} = ${a[l]}`, `A range of length 1 simply stores the array item a[${l}] = ${a[l]}.`, 'Leaves are the base case of the recursion.', 'info', L.leaf, 0, id,
        'LEAF —', `tree[${id}] = a[${l}] = ${a[l]}`);
      return;
    }
    const m = (l + r) >> 1;
    build(2 * id, l, m);
    build(2 * id + 1, m + 1, r);
    nodeText = rangeText(l, r);
    val[id] = comb(val[2 * id], val[2 * id + 1]); built.add(id);
    st = { [id]: 'active', [2 * id]: 'compare', [2 * id + 1]: 'compare' };
    const expr = op === 'sum' ? `${val[2 * id]} + ${val[2 * id + 1]}` : `min(${val[2 * id]}, ${val[2 * id + 1]})`;
    emit(`Node ${rangeText(l, r)} = ${expr} = ${val[id]}`,
      `Both halves are ready (${val[2 * id]} and ${val[2 * id + 1]}), so combine them with ${word} to get the value for ${rangeText(l, r)}.`,
      'Post-order: a parent is computed only after both children, so the tree is built bottom-up in O(n).', 'info', L.merge, 0, id,
      'MERGE —', `tree[${id}] = ${expr} = ${val[id]}`);
  };
  build(1, 0, n - 1);
  st = {};
  nodeText = '—';

  const query = (id: number, l: number, r: number, ql: number, qr: number): number => {
    nodeText = rangeText(l, r);
    if (qr < l || r < ql) {
      st[id] = 'dim';
      emit(`${rangeText(l, r)} is outside [${ql},${qr}]`, `No element of node ${id} (${rangeText(l, r)}) lies in [${ql},${qr}], so it contributes nothing (${show(ident)}).`, 'Disjoint ranges are pruned immediately: this is what keeps the query logarithmic.', 'info', L.out, 3, id,
        'OUTSIDE:', `qr=${qr} < l=${l} or r=${r} < ql=${ql} → return ${show(ident)}`,
        `Node ${id} ${rangeText(l, r)} is disjoint from [${ql},${qr}]: pruned, returns ${show(ident)}`);
      return ident;
    }
    if (ql <= l && r <= qr) {
      st[id] = 'found';
      running = comb(running === '—' ? ident : (running as number), val[id]);
      pieces.push(`${rangeText(l, r)}=${show(val[id])}`);
      emit(`${rangeText(l, r)} is fully inside: take ${show(val[id])}`, `Range ${rangeText(l, r)} lies inside [${ql},${qr}], so its stored ${word} ${show(val[id])} is one ready-made piece; running ${word} = ${show(running as number)}.`,
        'A fully covered node answers for all its elements at once: this is a canonical piece.', 'success', L.inside, 3, id,
        'TAKE —', `${ql} <= ${l} && ${r} <= ${qr} → tree[${id}] = ${show(val[id])}, running = ${show(running as number)}`);
      return val[id];
    }
    st[id] = 'compare';
    emit(`${rangeText(l, r)} overlaps partly: split`, `Only part of ${rangeText(l, r)} is in [${ql},${qr}], so tree[${id}] = ${show(val[id])} cannot be used. Ask both children.`, 'Partial overlap is the only case that recurses; per level at most two nodes can overlap partially.', 'warn', L.part, 3, id,
        'SPLIT:', `${rangeText(l, r)} overlaps [${ql},${qr}] only partly → recurse into nodes ${2 * id} and ${2 * id + 1}`);
    const m = (l + r) >> 1;
    const x = query(2 * id, l, m, ql, qr);
    const y = query(2 * id + 1, m + 1, r, ql, qr);
    return comb(x, y);
  };

  const update = (id: number, l: number, r: number, i: number, v: number) => {
    nodeText = rangeText(l, r);
    if (l === r) {
      const was = a[i];
      val[id] = v; a[i] = v; st[id] = 'found';
      cellSt = (k) => (k === i ? 'found' : undefined);
      emit(`Leaf ${rangeText(l, r)} = ${v}`, `Reached the leaf for index ${i}: overwrite tree[${id}] with ${v}. Every ancestor's stored ${word} is now stale.`, 'Only the ancestors of this leaf can be affected by the change.', 'info', L.upLeaf, 1, id,
        'LEAF —', `tree[${id}] = ${v}  (a[${i}] was ${was})`, `Ancestors of leaf ${id} are stale until they are recomputed`);
      return;
    }
    st[id] = 'active';
    const m = (l + r) >> 1;
    emit(`Go ${i <= m ? 'left' : 'right'} at ${rangeText(l, r)}`, `Index ${i} is ${i <= m ? `<= mid (${m}), so descend into the left child ${2 * id}` : `> mid (${m}), so descend into the right child ${2 * id + 1}`}.`, 'Exactly one child contains the index, so the walk is a single root-to-leaf path.', 'info', L.upDown, 1, id,
      'DESCEND:', `i=${i} ${i <= m ? '<=' : '>'} mid=${m} → node ${i <= m ? 2 * id : 2 * id + 1}`);
    if (i <= m) update(2 * id, l, m, i, v); else update(2 * id + 1, m + 1, r, i, v);
    nodeText = rangeText(l, r);
    const oldVal = val[id];
    val[id] = comb(val[2 * id], val[2 * id + 1]);
    st[id] = 'found';
    emit(`Recompute ${rangeText(l, r)} = ${val[id]}`, `Back on the way up: combine the children again (${val[2 * id]}, ${val[2 * id + 1]}) to get ${val[id]}, was ${oldVal}.`, 'Recomputing from the two children keeps the invariant "node = combine of its children".', 'info', L.upBack, 2, id,
      'REPAIR —', `tree[${id}] = ${op === 'sum' ? `${val[2 * id]} + ${val[2 * id + 1]}` : `min(${val[2 * id]}, ${val[2 * id + 1]})`} = ${val[id]}`);
  };

  for (const o of input.ops) {
    pieces = [];
    st = {};
    cellSt = () => undefined;
    ptrs = [];
    if (o.name === qName) {
      const [ql, qr] = o.args;
      opText = `${op === 'sum' ? 'sumRange' : 'minRange'}(${ql}, ${qr})`;
      running = '—';
      cellSt = (k) => (k >= ql && k <= qr ? 'active' : undefined);
      ptrs = ql === qr ? [{ id: 'lr', label: 'l=r', index: ql, tone: 'blue' }] : [{ id: 'l', label: 'l', index: ql, tone: 'blue' }, { id: 'r', label: 'r', index: qr, tone: 'orange' }];
      nodeText = rangeText(0, n - 1);
      emit(`Query ${opText}`, `Find the ${word} of a[${ql}..${qr}]. Start at the root and decide, node by node, whether to use it, skip it or split it.`, 'Every node falls into exactly one of three cases: outside, fully inside, partial overlap.', 'info', L.qTop, 3, null,
        'QUERY —', `query(1, 0, ${n - 1}, ${ql}, ${qr})`);
      const res = query(1, 0, n - 1, ql, qr);
      running = res;
      answers.push(show(res));
      emit(`Answer = ${show(res)}`, `The ${pieces.length} piece${pieces.length === 1 ? '' : 's'} ${pieces.join(', ')} cover exactly [${ql},${qr}], combined: ${show(res)}.`, `Only O(log n) nodes were touched instead of ${qr - ql + 1} array items.`, 'success', L.qTop, 3, null,
        'ANSWER —', `${op === 'sum' ? pieces.map((p) => p.split('=')[1]).join(' + ') : `min(${pieces.map((p) => p.split('=')[1]).join(', ')})`} = ${show(res)}`);
    } else {
      const [i, v] = o.args;
      opText = `${op === 'sum' ? 'update' : 'set'}(${i}, ${v})`;
      running = '—';
      ptrs = [{ id: 'i', label: 'i', index: i, tone: 'orange' }];
      nodeText = rangeText(0, n - 1);
      emit(`${opText}`, `Change a[${i}] from ${a[i]} to ${v}. Walk down to the leaf, then repair the ancestors on the way back.`, 'A point update touches one node per level.', 'info', L.upTop, 1, null,
        'UPDATE —', `update(1, 0, ${n - 1}, ${i}, ${v}), a[${i}]: ${a[i]} → ${v}`);
      update(1, 0, n - 1, i, v);
      answers.push('null');
      nodeText = '—';
      emit('Update finished', `a[${i}] = ${v} and every ancestor of its leaf was recomputed (${Math.ceil(Math.log2(n)) + 1} nodes at most).`, 'The rest of the tree was untouched and is still valid.', 'info', L.upBack, 2, null,
        'UPDATED —', `a[${i}] = ${v}; root tree[1] = ${show(val[1])}`);
    }
  }
  st = {};
  cellSt = () => undefined;
  ptrs = [];
  nodeText = '—';
  emit('Done', `All operations processed. Outputs in order: [${answers.join(', ')}].`, 'Each query and update cost O(log n).', 'success', L.qTop, 4, null,
    '✅ Done!', `return [${answers.join(', ')}]`);
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

/** Plain reference: apply the operations to a plain array. */
export function segReference(input: ParsedOps, op: SegOp): string {
  const a = [...input.nums];
  const out: string[] = [];
  const qName = op === 'sum' ? 'sum' : 'min';
  for (const o of input.ops) {
    if (o.name === qName) {
      const sl = a.slice(o.args[0], o.args[1] + 1);
      out.push(String(op === 'sum' ? sl.reduce((x, y) => x + y, 0) : Math.min(...sl)));
    } else {
      a[o.args[0]] = o.args[1];
      out.push('null');
    }
  }
  return `[${out.join(', ')}]`;
}
