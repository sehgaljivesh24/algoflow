import type { Aux, CellState, Pointer, ProblemDef, Step } from '../../engine/types.ts';
import { plural, verb } from '../text.ts';
import { parseOps, rangeText, segScene, segStructure } from './kitB.ts';
import type { ParsedOps } from './kitB.ts';

function parse(raw: string): ParsedOps {
  return parseOps(raw, {
    spec: { add: 3, sum: 2 },
    example: '2 4 6 8 10 12 | add 1 4 3 | sum 2 5 | add 0 5 -1 | sum 0 3',
    maxN: 8, maxOps: 4, lo: -30, hi: 30,
    check: (name, args, n) => {
      if (args[0] < 0 || args[1] >= n || args[0] > args[1]) return `need 0 <= left <= right <= ${n - 1}`;
      if (name === 'add' && (args[2] < -20 || args[2] > 20 || args[2] === 0)) return 'the added value must be a non-zero number between -20 and 20';
      return null;
    },
  });
}
const P = (s: string): ParsedOps => parse(s);

const java = [
  'class LazySegTree {',
  '    private final int n;',
  '    private final long[] sum, lazy;',
  '',
  '    LazySegTree(int[] a) {',
  '        n = a.length;',
  '        sum = new long[4 * n];',
  '        lazy = new long[4 * n];',
  '        build(1, 0, n - 1, a);',
  '    }',
  '',
  '    private void build(int node, int l, int r, int[] a) {',
  '        if (l == r) { sum[node] = a[l]; return; }',
  '        int mid = (l + r) / 2;',
  '        build(2 * node, l, mid, a);',
  '        build(2 * node + 1, mid + 1, r, a);',
  '        sum[node] = sum[2 * node] + sum[2 * node + 1];',
  '    }',
  '',
  '    // hand the pending addition of a node down to its two children',
  '    private void push(int node, int l, int r) {',
  '        if (lazy[node] == 0) return;',
  '        int mid = (l + r) / 2;',
  '        apply(2 * node, l, mid, lazy[node]);',
  '        apply(2 * node + 1, mid + 1, r, lazy[node]);',
  '        lazy[node] = 0;',
  '    }',
  '',
  '    private void apply(int node, int l, int r, long v) {',
  '        sum[node] += v * (r - l + 1);   // the whole range shifts by v',
  '        lazy[node] += v;                // children still owe it',
  '    }',
  '',
  '    void add(int node, int l, int r, int ql, int qr, long v) {',
  '        if (qr < l || r < ql) return;',
  '        if (ql <= l && r <= qr) { apply(node, l, r, v); return; }',
  '        push(node, l, r);',
  '        int mid = (l + r) / 2;',
  '        add(2 * node, l, mid, ql, qr, v);',
  '        add(2 * node + 1, mid + 1, r, ql, qr, v);',
  '        sum[node] = sum[2 * node] + sum[2 * node + 1];',
  '    }',
  '',
  '    long query(int node, int l, int r, int ql, int qr) {',
  '        if (qr < l || r < ql) return 0;',
  '        if (ql <= l && r <= qr) return sum[node];',
  '        push(node, l, r);',
  '        int mid = (l + r) / 2;',
  '        return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);',
  '    }',
  '}',
];
const python = [
  'class LazySegTree:',
  '    def __init__(self, a):',
  '        self.n = len(a)',
  '        self.sum = [0] * (4 * self.n)',
  '        self.lazy = [0] * (4 * self.n)',
  '        self._build(1, 0, self.n - 1, a)',
  '',
  '    def _build(self, node, l, r, a):',
  '        if l == r:',
  '            self.sum[node] = a[l]',
  '            return',
  '        mid = (l + r) // 2',
  '        self._build(2 * node, l, mid, a)',
  '        self._build(2 * node + 1, mid + 1, r, a)',
  '        self.sum[node] = self.sum[2 * node] + self.sum[2 * node + 1]',
  '',
  '    def _apply(self, node, l, r, v):',
  '        self.sum[node] += v * (r - l + 1)   # the whole range shifts by v',
  '        self.lazy[node] += v                # children still owe it',
  '',
  '    def _push(self, node, l, r):',
  '        if self.lazy[node] == 0:',
  '            return',
  '        mid = (l + r) // 2',
  '        self._apply(2 * node, l, mid, self.lazy[node])',
  '        self._apply(2 * node + 1, mid + 1, r, self.lazy[node])',
  '        self.lazy[node] = 0',
  '',
  '    def add(self, node, l, r, ql, qr, v):',
  '        if qr < l or r < ql:',
  '            return',
  '        if ql <= l and r <= qr:',
  '            self._apply(node, l, r, v)',
  '            return',
  '        self._push(node, l, r)',
  '        mid = (l + r) // 2',
  '        self.add(2 * node, l, mid, ql, qr, v)',
  '        self.add(2 * node + 1, mid + 1, r, ql, qr, v)',
  '        self.sum[node] = self.sum[2 * node] + self.sum[2 * node + 1]',
  '',
  '    def query(self, node, l, r, ql, qr):',
  '        if qr < l or r < ql:',
  '            return 0',
  '        if ql <= l and r <= qr:',
  '            return self.sum[node]',
  '        self._push(node, l, r)',
  '        mid = (l + r) // 2',
  '        return (self.query(2 * node, l, mid, ql, qr) +',
  '                self.query(2 * node + 1, mid + 1, r, ql, qr))',
];
const L = {
  start: { j: [4, 5, 6, 7, 8], p: [1, 2, 3, 4, 5] },
  leaf: { j: [12], p: [8, 9, 10] },
  merge: { j: [13, 14, 15, 16], p: [11, 12, 13, 14] },
  addTop: { j: [33], p: [28] },
  addOut: { j: [34], p: [29, 30] },
  addCover: { j: [35, 29, 30], p: [31, 32, 33, 17, 18] },
  push: { j: [36, 21, 22, 23, 24, 25], p: [34, 21, 22, 23, 24, 25, 26] },
  addBack: { j: [37, 38, 39, 40], p: [35, 36, 37, 38] },
  qTop: { j: [43], p: [40] },
  qOut: { j: [44], p: [41, 42] },
  qIn: { j: [45], p: [43, 44] },
  qPush: { j: [46, 21, 22, 23, 24, 25], p: [45, 21, 22, 23, 24, 25, 26] },
  qBack: { j: [47, 48], p: [46, 47, 48] },
};

function build(input: ParsedOps): Step[] {
  const real = [...input.nums];
  const n = real.length;
  const shape = segStructure(n);
  const sum: number[] = new Array(4 * n).fill(0);
  const lazy: number[] = new Array(4 * n).fill(0);
  const built = new Set<number>();
  const steps: Step[] = [];
  let st: Record<number, CellState> = {};
  let cellSt: (i: number) => CellState | undefined = () => undefined;
  let ptrs: Pointer[] = [];
  let opText = 'build';
  let nodeText = '—';
  let running: number | string = '—';
  const answers: string[] = [];
  const tagOf = (id: number): string | undefined => (lazy[id] !== 0 ? `lazy ${lazy[id] > 0 ? '+' : ''}${lazy[id]}` : undefined);

  const emit = (title: string, desc: string, logic: string, tone: Step['logicTone'], l: { j: number[]; p: number[] }, algo: number, here: number | null, tag: string, note: string, alert?: string) => {
    const states: Record<number, CellState> = {};
    const tags: Record<number, string> = {};
    for (const s of shape) {
      states[s.id] = !built.has(s.id) ? 'dim' : (st[s.id] as CellState);
      const t = built.has(s.id) ? tagOf(s.id) : undefined;
      if (t) tags[s.id] = t;
    }
    const aux: Aux[] = [{ title: 'actual array values (what the tree must reproduce)', kind: 'list', items: real.map(String) }];
    if (answers.length) aux.push({ title: 'answers so far', kind: 'list', items: [...answers] });
    steps.push({
      title, desc, logic, logicTone: tone, javaLines: l.j, pyLines: l.p, algoStep: algo, tag, note, alert,
      scene: segScene(shape, (id) => (built.has(id) ? String(sum[id]) : '·'), states, tags, here, real, cellSt, ptrs),
      aux, vars: { op: opText, node: nodeText, running, answers: `[${answers.join(', ')}]` },
    });
  };

  emit('Start', `An array of ${n} numbers. Each node stores the sum of its range; a second number, the lazy tag, will remember "add this to every element below me" so that a range update does not have to touch every leaf.`,
    'Sum alone supports point updates; the lazy tag is what makes range updates logarithmic.', 'info', L.start, 0, null,
    'START —', `n = ${n}, sum = new long[${4 * n}], lazy = new long[${4 * n}] (all 0)`);

  const rec = (id: number, l: number, r: number) => {
    nodeText = rangeText(l, r);
    if (l === r) {
      sum[id] = real[l]; built.add(id); st = { [id]: 'found' };
      emit(`Leaf ${rangeText(l, r)} = ${real[l]}`, `A single-item range stores a[${l}] = ${real[l]}.`, 'Leaves are the base case.', 'info', L.leaf, 0, id,
        'LEAF —', `sum[${id}] = a[${l}] = ${real[l]}`);
      return;
    }
    const m = (l + r) >> 1;
    rec(2 * id, l, m);
    rec(2 * id + 1, m + 1, r);
    nodeText = rangeText(l, r);
    sum[id] = sum[2 * id] + sum[2 * id + 1]; built.add(id);
    st = { [id]: 'active', [2 * id]: 'compare', [2 * id + 1]: 'compare' };
    emit(`Node ${rangeText(l, r)} = ${sum[2 * id]} + ${sum[2 * id + 1]} = ${sum[id]}`, `Both halves of ${rangeText(l, r)} are known (${sum[2 * id]} and ${sum[2 * id + 1]}), so the range sum is their total ${sum[id]}.`, 'Built bottom-up in O(n); all lazy tags start at 0.', 'info', L.merge, 0, id,
      'MERGE —', `sum[${id}] = ${sum[2 * id]} + ${sum[2 * id + 1]} = ${sum[id]}`);
  };
  rec(1, 0, n - 1);
  st = {};

  const apply = (id: number, l: number, r: number, v: number) => {
    sum[id] += v * (r - l + 1);
    lazy[id] += v;
  };
  const push = (id: number, l: number, r: number, algo: number, ln: typeof L.push) => {
    const m = (l + r) >> 1;
    if (lazy[id] === 0) {
      st[id] = 'compare';
      emit(`${rangeText(l, r)} has no pending tag`, `Node ${id} owes nothing to its children (lazy = 0), so we can descend straight away.`, 'push is a no-op when the tag is 0.', 'info', ln, algo, id,
        'PUSH —', `lazy[${id}] == 0 → nothing to push`);
      return;
    }
    const v = lazy[id];
    apply(2 * id, l, m, v);
    apply(2 * id + 1, m + 1, r, v);
    lazy[id] = 0;
    st = { ...st, [id]: 'compare', [2 * id]: 'swap', [2 * id + 1]: 'swap' };
    emit(`Push ${v > 0 ? '+' : ''}${v} down from ${rangeText(l, r)}`, `Tag ${v > 0 ? '+' : ''}${v} goes to both children: sum[${2 * id}] = ${sum[2 * id]}, sum[${2 * id + 1}] = ${sum[2 * id + 1]} (each changed by ${v} x its length). lazy[${id}] resets to 0.`,
      'We must settle the debt before looking inside, otherwise the children would describe an outdated array.', 'warn', ln, algo, id,
      'PUSH DOWN:', `lazy[${id}] = ${v} → children ${2 * id}, ${2 * id + 1} each get ${v} x length; lazy[${id}] = 0`,
      `Pending tag ${v > 0 ? '+' : ''}${v} on node ${id} must be pushed down before looking inside`);
  };

  const add = (id: number, l: number, r: number, ql: number, qr: number, v: number) => {
    nodeText = rangeText(l, r);
    if (qr < l || r < ql) {
      st[id] = 'dim';
      emit(`${rangeText(l, r)} is outside`, `Node ${id} ${rangeText(l, r)} is disjoint from [${ql},${qr}]: leave it alone.`, 'Pruned immediately.', 'info', L.addOut, 1, id,
        'OUTSIDE:', `qr=${qr} < l=${l} or r=${r} < ql=${ql} → return`, `Node ${id} ${rangeText(l, r)} is outside [${ql},${qr}]: pruned`);
      return;
    }
    if (ql <= l && r <= qr) {
      const before = sum[id];
      apply(id, l, r, v);
      st[id] = 'found';
      emit(`${rangeText(l, r)} fully inside: lazy ${v > 0 ? '+' : ''}${v}`, `Range ${rangeText(l, r)} gets ${v > 0 ? '+' : ''}${v}: sum[${id}] ${before} → ${sum[id]} (${v} x ${r - l + 1} = ${v * (r - l + 1)}) and lazy[${id}] = ${lazy[id]}. The children are NOT visited.`,
        'This is the saving: one node stands for the whole block, and the update is postponed ("lazy").', 'success', L.addCover, 1, id,
        'COVER —', `sum[${id}] += ${v} * ${r - l + 1} → ${sum[id]}; lazy[${id}] += ${v} → ${lazy[id]}`);
      return;
    }
    st[id] = 'active';
    emit(`${rangeText(l, r)} overlaps partly`, `Only part of ${rangeText(l, r)} is inside [${ql},${qr}], so look at the children, after settling any pending tag (lazy[${id}] = ${lazy[id]}).`, 'Partial overlap is the only case that recurses.', 'warn', L.push, 2, id,
      'SPLIT:', `${rangeText(l, r)} overlaps [${ql},${qr}] partly → push(${id}), then recurse`);
    push(id, l, r, 2, L.push);
    const m = (l + r) >> 1;
    add(2 * id, l, m, ql, qr, v);
    add(2 * id + 1, m + 1, r, ql, qr, v);
    nodeText = rangeText(l, r);
    sum[id] = sum[2 * id] + sum[2 * id + 1];
    st[id] = 'found';
    emit(`Recompute ${rangeText(l, r)} = ${sum[id]}`, `On the way back sum[${id}] is rebuilt from its children (${sum[2 * id]} + ${sum[2 * id + 1]} = ${sum[id]}).`, 'Ancestors of changed nodes always get re-merged.', 'info', L.addBack, 3, id,
      'REPAIR —', `sum[${id}] = ${sum[2 * id]} + ${sum[2 * id + 1]} = ${sum[id]}`);
  };

  const query = (id: number, l: number, r: number, ql: number, qr: number): number => {
    nodeText = rangeText(l, r);
    if (qr < l || r < ql) {
      st[id] = 'dim';
      emit(`${rangeText(l, r)} is outside`, `Node ${id} ${rangeText(l, r)} is disjoint from [${ql},${qr}] and contributes 0.`, 'Pruned immediately.', 'info', L.qOut, 4, id,
        'OUTSIDE:', `qr=${qr} < l=${l} or r=${r} < ql=${ql} → return 0`, `Node ${id} ${rangeText(l, r)} is outside [${ql},${qr}]: contributes 0`);
      return 0;
    }
    if (ql <= l && r <= qr) {
      st[id] = 'found';
      running = (running === '—' ? 0 : (running as number)) + sum[id];
      emit(`${rangeText(l, r)} fully inside: take ${sum[id]}`, `Stored sum[${id}] = ${sum[id]} is already correct, even if the children below are stale. Running total ${running}.`, 'A node always knows its own sum; only the children can be behind.', 'success', L.qIn, 4, id,
        'TAKE —', `return sum[${id}] = ${sum[id]}, running = ${running}`);
      return sum[id];
    }
    st[id] = 'active';
    emit(`${rangeText(l, r)} overlaps partly`, `${rangeText(l, r)} overlaps [${ql},${qr}] partly: settle lazy[${id}] = ${lazy[id]}, then ask both children.`, 'The children must be up to date before they are read.', 'warn', L.qPush, 4, id,
      'SPLIT:', `partial overlap → push(${id}), then query children ${2 * id} and ${2 * id + 1}`);
    push(id, l, r, 4, L.qPush);
    const m = (l + r) >> 1;
    return query(2 * id, l, m, ql, qr) + query(2 * id + 1, m + 1, r, ql, qr);
  };

  for (const o of input.ops) {
    st = {};
    cellSt = () => undefined;
    nodeText = rangeText(0, n - 1);
    running = '—';
    if (o.name === 'sum') {
      const [ql, qr] = o.args;
      opText = `sum(${ql}, ${qr})`;
      cellSt = (k) => (k >= ql && k <= qr ? 'active' : undefined);
      ptrs = [{ id: 'l', label: 'l', index: ql, tone: 'blue' }, { id: 'r', label: 'r', index: qr, tone: 'orange' }];
      if (ql === qr) ptrs = [{ id: 'l', label: 'l=r', index: ql, tone: 'blue' }];
      emit(`Query ${opText}`, `Sum of a[${ql}..${qr}] = ${real.slice(ql, qr + 1).join(' + ')}. Descend from the root, pushing tags down where we split.`, 'Queries also have to respect pending tags.', 'info', L.qTop, 4, null,
        'QUERY —', `query(1, 0, ${n - 1}, ${ql}, ${qr})`);
      const res = query(1, 0, n - 1, ql, qr);
      running = res;
      answers.push(String(res));
      emit(`Answer = ${res}`, `The covered pieces add up to ${res}, which matches the real array sum of a[${ql}..${qr}].`, 'O(log n) nodes were touched.', 'success', L.qBack, 4, null,
        'ANSWER —', `sum(${ql}, ${qr}) = ${res}`);
    } else {
      const [ql, qr, v] = o.args;
      opText = `add(${ql}, ${qr}, ${v})`;
      for (let k = ql; k <= qr; k++) real[k] += v;
      cellSt = (k) => (k >= ql && k <= qr ? 'swap' : undefined);
      ptrs = ql === qr ? [{ id: 'l', label: 'l=r', index: ql, tone: 'blue' }] : [{ id: 'l', label: 'l', index: ql, tone: 'blue' }, { id: 'r', label: 'r', index: qr, tone: 'orange' }];
      emit(`${opText}`, `Add ${v} to every element of a[${ql}..${qr}]. The array row already shows the true result; the tree has to catch up lazily.`, 'Touching every leaf would cost O(length); tags let us stop early.', 'info', L.addTop, 1, null,
        'ADD —', `add(1, 0, ${n - 1}, ${ql}, ${qr}, ${v}): ${plural(qr - ql + 1, 'element')} ${verb(qr - ql + 1, 'changes', 'change')} by ${v}`);
      add(1, 0, n - 1, ql, qr, v);
      answers.push('null');
      emit('Update finished', `Covered blocks carry tags; ancestors have been re-merged. Root sum is now ${sum[1]}.`, 'Tags left on inner nodes will be pushed only when a later operation needs to look below them.', 'info', L.addBack, 3, null,
        'ADDED —', `root sum[1] = ${sum[1]}; tags stay where they are`);
    }
  }
  st = {};
  cellSt = () => undefined;
  ptrs = [];
  nodeText = '—';
  emit('Done', `All operations processed. Outputs: [${answers.join(', ')}].`, 'Every operation cost O(log n).', 'success', L.qBack, 5, null,
    '✅ Done!', `return [${answers.join(', ')}]`);
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

export function lazyReference(input: ParsedOps): string {
  const a = [...input.nums];
  const out: string[] = [];
  for (const o of input.ops) {
    if (o.name === 'sum') out.push(String(a.slice(o.args[0], o.args[1] + 1).reduce((x, y) => x + y, 0)));
    else { for (let k = o.args[0]; k <= o.args[1]; k++) a[k] += o.args[2]; out.push('null'); }
  }
  return `[${out.join(', ')}]`;
}

export const rangeAddRangeSumLazy: ProblemDef<ParsedOps> = {
  slug: 'cp-range-add-range-sum-lazy-propagation',
  id: 'CP', title: 'Range Add Range Sum (Lazy Propagation)', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'lazy segment tree',
  statement: 'Support two operations on an array: add(left, right, v), which adds v to every element in the range, and sum(left, right), which returns the range sum. Both must run in O(log n), so a range update may not touch every element: postpone work with lazy tags on segment-tree nodes.',
  constraints: 'Animation input: 2 to 8 numbers in [-30, 30] and at most 4 operations, written as "numbers | add l r v | sum l r | ...".',
  examples: [
    { label: '2 4 6 8 10 12 | add 1 4 3 | sum 2 5 | add 0 5 -1 | sum 0 3', input: P('2 4 6 8 10 12 | add 1 4 3 | sum 2 5 | add 0 5 -1 | sum 0 3'), output: '[null, 45, null, 25]' },
    { label: '1 1 1 1 | add 0 3 2 | sum 1 2 | add 2 3 5', input: P('1 1 1 1 | add 0 3 2 | sum 1 2 | add 2 3 5'), output: '[null, 6, null]' },
    { label: '5 3 8 1 9 2 7 | sum 0 6 | add 2 4 -4 | sum 3 5 | sum 0 1', input: P('5 3 8 1 9 2 7 | sum 0 6 | add 2 4 -4 | sum 3 5 | sum 0 1'), output: '[35, null, 4, 8]' },
  ],
  inputPlaceholder: 'e.g. 2 4 6 8 10 12 | add 1 4 3 | sum 2 5 | add 0 5 -1 | sum 0 3',
  parseInput: parse,
  buildSteps: build,
  viz: 'cells',
  vizTitle: 'Lazy segment tree (sum, lazy tag)',
  legend: [{ label: 'Node in use', state: 'active' }, { label: 'Fully covered / done', state: 'found' }, { label: 'Tag pushed down', state: 'swap' }, { label: 'Partial overlap', state: 'compare' }, { label: 'Pruned / not built', state: 'dim' }],
  varLabels: ['op', 'node', 'running', 'answers'],
  approach: {
    title: 'Postpone the update, settle it when someone looks',
    text: 'A node fully inside the update range changes its sum at once and leaves a lazy tag meaning "my children still need +v". Nobody below is touched. Whenever an operation has to descend into a node that carries a tag, it first pushes the tag to the two children. Sums stay correct at every node that is read, and every operation visits O(log n) nodes.',
  },
  java, python,
  algorithm: [
    'Build the sum tree; every lazy tag starts at 0',
    'add: fully covered node -> sum += v * length and lazy += v, then stop',
    'Before descending into a partly covered node, push its tag to both children',
    'After the children return, recompute the node sum from them',
    'sum: same walk; fully covered nodes return their stored sum',
    'Return the answers of all operations in order',
  ],
  phases: [
    { icon: '🔨', label: 'Build sum tree', tone: 'blue' },
    { icon: '🏷️', label: 'Add: tag a covered node', tone: 'cyan' },
    { icon: '⬇', label: 'Push tag before descending', tone: 'orange' },
    { icon: '🔧', label: 'Recompute from children', tone: 'green' },
    { icon: '🔍', label: 'Sum: take covered nodes', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['add(left, right, v)', 'sum(left, right)', 'O(log n)', 'lazy tags'],
  complexity: [{ label: 'Time', value: 'O(n) build, O(log n) per op' }, { label: 'Space', value: 'O(n)' }],
  why: 'Invariant: for every node, sum[node] is correct for the real array once the tags of its strict ancestors have been applied, and a tag means exactly "children still lack this addition". push moves the debt one level down without changing what any node represents, so descending is always safe. A fully covered node can stop because its sum is already right and its tag keeps the children consistent for later.',
  naive: 'Adding v to each of up to n elements makes a range update O(n); a plain segment tree would still have to update every leaf in the range.',
};
