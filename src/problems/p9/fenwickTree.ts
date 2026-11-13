import type { Aux, Cell, CellState, Pointer, ProblemDef, Step } from '../../engine/types.ts';
import { bitBuild, bitScene, lowbit, parseOps } from './kitB.ts';
import type { ParsedOps } from './kitB.ts';

function parse(raw: string): ParsedOps {
  return parseOps(raw, {
    spec: { add: 2, prefix: 1 },
    example: '3 2 -1 6 5 4 -3 3 | prefix 7 | add 3 4 | prefix 5',
    maxN: 8, maxOps: 5, lo: -20, hi: 20,
    check: (name, args, n) => {
      if (name === 'prefix') return args[0] < 1 || args[0] > n ? `prefix needs a position from 1 to ${n} (positions are 1-based)` : null;
      return args[0] < 1 || args[0] > n ? `add needs a position from 1 to ${n} (positions are 1-based)` : null;
    },
  });
}
const P = (s: string): ParsedOps => parse(s);

const L = {
  start: { j: [4, 5, 6], p: [1, 2, 3] },
  build: { j: [7, 8, 9, 10], p: [4, 5, 6, 7, 8] },
  addTop: { j: [14], p: [10] },
  addNode: { j: [15, 16], p: [11, 12, 13] },
  addEnd: { j: [14], p: [11] },
  qTop: { j: [20, 21], p: [15, 16] },
  qNode: { j: [22, 23], p: [17, 18, 19] },
  qEnd: { j: [25], p: [20] },
};

function build(input: ParsedOps): Step[] {
  const a = [...input.nums];
  const n = a.length;
  const tree = new Array<number>(n + 1).fill(0);
  let built = 0;
  let st: Record<number, CellState> = {};
  let path: number[] = [];
  let jumps: { from: number; to: number; label?: string }[] = [];
  let here: number | null = null;
  let cellSt: (k: number) => CellState | undefined = () => undefined;
  let opText = 'build';
  let iShow: number | string = '—';
  let sumShow: number | string = '—';
  let pieces: string[] = [];
  const answers: string[] = [];
  const steps: Step[] = [];
  const live2 = (i: number) => i <= built || tree[i] !== 0;
  const rng = (j: number) => (lowbit(j) === 1 ? `a[${j}]` : `a[${j - lowbit(j) + 1}..${j}]`);

  const emit = (title: string, desc: string, logic: string, tone: Step['logicTone'], l: { j: number[]; p: number[] }, algo: number, _ptrs: Pointer[], tag: string, note: string, alert?: string) => {
    const states: Record<number, CellState> = {};
    const live = (i: number) => i <= built || tree[i] !== 0 || st[i] !== undefined;
    for (let i = 1; i <= n; i++) states[i] = !live(i) ? 'dim' : (st[i] as CellState);
    const cells: Cell[] = a.map((v, k) => { const c: Cell = { key: k, value: v }; const s = cellSt(k); if (s) c.state = s; return c; });
    const aux: Aux[] = [{ title: 'a[ ] positions 1..n (the real array)', kind: 'list', items: a.map((v, k) => `${k + 1}:${v}`) }];
    if (pieces.length) aux.push({ title: 'tree nodes added by this query', kind: 'list', items: [...pieces] });
    steps.push({
      title, desc, logic, logicTone: tone, javaLines: l.j, pyLines: l.p, algoStep: algo, tag, note, alert,
      scene: bitScene(n, tree, (i) => (live2(i) ? String(tree[i]) : '·'), states, path, jumps, { kind: 'grid', rows: [cells], colHeads: a.map((_, k) => String(k + 1)), rowHeads: ['a'], variant: 'matrix' }, here),
      aux,
      vars: { op: opText, i: iShow, sum: sumShow, answers: `[${answers.join(', ')}]` },
    });
  };

  emit('Start', `The array a[1..${n}] is shown at the bottom. The Fenwick tree keeps an array tree[1..${n}] where tree[i] stores the sum of the last lowbit(i) items ending at i: tree[i] = a[i - lowbit(i) + 1 .. i]. Every box shows its range.`,
    'lowbit(i) = i & -i is the value of the lowest set bit; it is the length of the block that ends at i.', 'info', L.start, 0, [],
    'START —', `n = ${n}, tree = new int[${n + 1}] (all 0)`);

  // O(n) build: add each item, then pass the finished total to the parent i + lowbit(i)
  const target = bitBuild(a);
  for (let i = 1; i <= n; i++) {
    tree[i] += a[i - 1];
    built = i;
    const p = i + lowbit(i);
    st = { [i]: 'active' };
    here = i;
    iShow = i;
    let note = `tree[${i}] receives a[${i}] = ${a[i - 1]}, now ${tree[i]}, the final sum of ${rng(i)}.`;
    if (p <= n) {
      tree[p] += tree[i];
      st[p] = 'found';
      note += ` Its parent ${i} + ${lowbit(i)} = ${p} is the next block that must contain it, so tree[${p}] += ${tree[i]}.`;
    } else note += ` ${i} + ${lowbit(i)} = ${i + lowbit(i)} is past ${n}: no parent.`;
    path = p <= n ? [p, i] : [];
    cellSt = (k) => (k === i - 1 ? 'active' : undefined);
    emit(`Build slot ${i}`, note, 'Each slot finishes before it is passed upward, so the whole tree is built in O(n) rather than n updates of O(log n).', 'info', L.build, 0, [{ id: 'k', label: 'i', index: i - 1, tone: 'orange' }],
      'BUILD —', p <= n ? `tree[${i}] += a[${i}] → ${tree[i]}; tree[${p}] += ${tree[i]} → ${tree[p]}` : `tree[${i}] += a[${i}] → ${tree[i]}; parent ${i + lowbit(i)} > n`);
    st = {}; path = [];
    void target;
  }
  built = n;
  here = null; cellSt = () => undefined; iShow = '—'; st = {}; path = [];
  emit('Tree built', `tree[1..${n}] = [${tree.slice(1).join(', ')}]. The picture draws an edge from i to i + lowbit(i): the "update" direction. A query will instead hop from i to i - lowbit(i).`,
    'Two walks, two directions: up the tree to update, jump leftwards to query.', 'info', L.build, 0, [],
    'BUILT —', `tree = [${tree.slice(1).join(', ')}] after ${n} slots in O(n)`);

  for (const o of input.ops) {
    st = {}; path = []; jumps = []; here = null; pieces = []; sumShow = '—'; iShow = '—'; cellSt = () => undefined;
    if (o.name === 'add') {
      const [pos, d] = o.args;
      opText = `add(${pos}, ${d})`;
      cellSt = (k) => (k === pos - 1 ? 'swap' : undefined);
      emit(`${opText}`, `Add ${d} to a[${pos}]. Every block whose range contains ${pos} must change: start at ${pos} and keep adding lowbit.`, 'The blocks containing a position form a chain: i, i + lowbit(i), ... up to n.', 'info', L.addTop, 1, [{ id: 'k', label: 'pos', index: pos - 1, tone: 'orange' }],
        'ADD —', `add(${pos}, ${d}): a[${pos}] ${a[pos - 1]} → ${a[pos - 1] + d}`);
      a[pos - 1] += d;
      const chain: number[] = [];
      for (let j = pos; j <= n; j += lowbit(j)) chain.push(j);
      chain.forEach((j, k) => {
        tree[j] += d;
        here = j; iShow = j;
        st = { ...st, [j]: 'active' };
        path = chain.slice(0, k + 1).reverse();
        emit(`tree[${j}] += ${d} → ${tree[j]}`, `Slot ${j} (binary ${j.toString(2)}) covers ${rng(j)}, which contains position ${pos}. ${k + 1 < chain.length ? `Next: ${j} + ${lowbit(j)} = ${chain[k + 1]}.` : `${j} + ${lowbit(j)} = ${j + lowbit(j)} is past ${n}: stop.`}`,
          'Adding the lowest set bit moves to the next, strictly larger block that still covers the position.', 'info', L.addNode, 1, [{ id: 'k', label: 'pos', index: pos - 1, tone: 'orange' }],
          'UPDATE —', `tree[${j}] += ${d} → ${tree[j]}; i = ${j} + ${lowbit(j)} = ${j + lowbit(j)}${j + lowbit(j) > n ? ' > n, stop' : ''}`);
        st[j] = 'found';
      });
      here = null; path = [];
      answers.push('null');
      emit('Update finished', `${chain.length} slot${chain.length === 1 ? '' : 's'} changed (${chain.join(', ')}; at most log2(n)+1); the other slots were untouched.`, 'Cost is the length of the chain: O(log n).', 'info', L.addEnd, 1, [],
        'UPDATED —', `${chain.length} of ${n} slots touched: ${chain.join(' → ')}`);
    } else {
      const [pos] = o.args;
      opText = `prefix(${pos})`;
      cellSt = (k) => (k < pos ? 'active' : undefined);
      emit(`Query ${opText}`, `Sum of a[1..${pos}]. Write ${pos} in binary (${pos.toString(2)}): each set bit is one block. Take tree[${pos}], then drop the lowest bit and repeat.`, 'The blocks tile the prefix without overlap, one per set bit of the position.', 'info', L.qTop, 2, [{ id: 'k', label: 'pos', index: pos - 1, tone: 'orange' }],
        'QUERY —', `prefix(${pos}): i = ${pos} = ${pos.toString(2)}b`);
      let s = 0;
      let j = pos;
      while (j > 0) {
        const nxt = j - lowbit(j);
        s += tree[j];
        sumShow = s; iShow = j; here = j;
        st = { ...st, [j]: 'active' };
        pieces.push(`tree[${j}]=${tree[j]}`);
        jumps = nxt > 0 ? [{ from: j, to: nxt, label: `-${lowbit(j)}` }] : [];
        emit(`Take tree[${j}] = ${tree[j]}`, `Slot ${j} covers ${rng(j)}, sum ${tree[j]}. Running total ${s}. ${nxt > 0 ? `Remove the lowest bit: ${j} - ${lowbit(j)} = ${nxt}.` : `${j} - ${lowbit(j)} = 0: the prefix is fully covered.`}`,
          'Each hop clears one set bit, so there are at most log2(n)+1 hops.', 'info', L.qNode, 2, [{ id: 'k', label: 'pos', index: pos - 1, tone: 'orange' }],
          'TAKE —', `sum += tree[${j}] → ${s}; i = ${j} - ${lowbit(j)} = ${nxt}`);
        st[j] = 'compare';
        j = nxt;
      }
      jumps = []; here = null;
      answers.push(String(s));
      emit(`Answer = ${s}`, `The blocks ${pieces.join(' + ')} add to ${s}, which equals a[1] + ... + a[${pos}].`, 'No block was counted twice and none was missed.', 'success', L.qEnd, 2, [],
        'ANSWER —', `prefix(${pos}) = ${s}`);
    }
  }
  st = {}; path = []; jumps = []; here = null; pieces = []; cellSt = () => undefined; iShow = '—'; sumShow = '—'; opText = 'done';
  emit('Done', `All operations processed. Outputs in order: [${answers.join(', ')}].`, 'Both operations cost O(log n); the structure needs only n extra numbers.', 'success', L.qEnd, 3, [],
    '✅ Done!', `return [${answers.join(', ')}]`);
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

export function fenwickReference(input: ParsedOps): string {
  const a = [...input.nums];
  const out: string[] = [];
  for (const o of input.ops) {
    if (o.name === 'add') { a[o.args[0] - 1] += o.args[1]; out.push('null'); } else out.push(String(a.slice(0, o.args[0]).reduce((x, y) => x + y, 0)));
  }
  return `[${out.join(', ')}]`;
}

const ex1 = '3 2 -1 6 5 4 -3 3 | prefix 7 | add 3 4 | prefix 5';
const ex2 = '1 2 3 4 5 | prefix 5 | add 1 10 | prefix 1 | prefix 4';
const ex3 = '4 -2 7 1 | add 2 5 | prefix 3 | add 4 -1 | prefix 4';

export const fenwickTree: ProblemDef<ParsedOps> = {
  slug: 'alg-fenwick-tree-binary-indexed-tree',
  id: 'ALG', title: 'Fenwick Tree (Binary Indexed Tree)', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'fenwick tree',
  statement: 'Maintain an array under two operations: add(pos, d), which adds d to the element at position pos (1-based), and prefix(pos), which returns the sum of the first pos elements. Use a Fenwick tree (binary indexed tree), where each slot stores the sum of a block whose length is the lowest set bit of its index.',
  constraints: 'Animation input: 2 to 8 numbers in [-20, 20] and at most 5 operations, written as "numbers | add pos d | prefix pos | ..." with 1-based positions.',
  examples: [
    { label: ex1, input: P(ex1), output: fenwickReference(P(ex1)) },
    { label: ex2, input: P(ex2), output: fenwickReference(P(ex2)) },
    { label: ex3, input: P(ex3), output: fenwickReference(P(ex3)) },
  ],
  inputPlaceholder: 'e.g. 3 2 -1 6 5 4 -3 3 | prefix 7 | add 3 4 | prefix 5',
  parseInput: parse,
  buildSteps: build,
  viz: 'cells',
  vizTitle: 'Fenwick tree (slot i covers a block ending at i)',
  legend: [{ label: 'Current slot / prefix', state: 'active' }, { label: 'Slot updated', state: 'found' }, { label: 'Slot read by query', state: 'compare' }, { label: 'Position being changed', state: 'swap' }, { label: 'Not built yet', state: 'dim' }],
  varLabels: ['op', 'i', 'sum', 'answers'],
  approach: {
    title: 'Blocks sized by the lowest set bit',
    text: 'Slot i stores the sum of the lowbit(i) items ending at i. A prefix query takes tree[i], clears the lowest bit of i and repeats, so it reads one block per set bit. A point update adds the delta at i, then moves to i + lowbit(i), the next slot whose block also contains the position. Both walks have at most log2(n)+1 steps and the structure is just one extra array.',
  },
  java: [
    'class Fenwick {',
    '    private final int n;',
    '    private final int[] tree;      // tree[i] covers (i - lowbit(i), i]',
    '',
    '    Fenwick(int[] a) {',
    '        n = a.length;',
    '        tree = new int[n + 1];',
    '        for (int i = 1; i <= n; i++) {',
    '            tree[i] += a[i - 1];',
    '            int parent = i + (i & -i);',
    '            if (parent <= n) tree[parent] += tree[i];',
    '        }',
    '    }',
    '',
    '    void add(int i, int delta) {            // i is 1-based',
    '        for (; i <= n; i += i & -i) {',
    '            tree[i] += delta;',
    '        }',
    '    }',
    '',
    '    int prefix(int i) {                     // sum of the first i items',
    '        int sum = 0;',
    '        for (; i > 0; i -= i & -i) {',
    '            sum += tree[i];',
    '        }',
    '        return sum;',
    '    }',
    '}',
  ],
  python: [
    'class Fenwick:',
    '    def __init__(self, a):',
    '        self.n = len(a)',
    '        self.tree = [0] * (self.n + 1)',
    '        for i in range(1, self.n + 1):',
    '            self.tree[i] += a[i - 1]',
    '            parent = i + (i & -i)',
    '            if parent <= self.n:',
    '                self.tree[parent] += self.tree[i]',
    '',
    '    def add(self, i, delta):',
    '        while i <= self.n:',
    '            self.tree[i] += delta',
    '            i += i & -i',
    '',
    '    def prefix(self, i):',
    '        total = 0',
    '        while i > 0:',
    '            total += self.tree[i]',
    '            i -= i & -i',
    '        return total',
  ],
  algorithm: [
    'Build: tree[i] gets a[i], then is added into its parent i + lowbit(i)',
    'add: change tree[i], then move to i + lowbit(i) until past n',
    'prefix: add tree[i], then move to i - lowbit(i) until 0',
    'The sum collected by prefix is the answer',
  ],
  phases: [
    { icon: '🔨', label: 'Build: pass each slot to its parent', tone: 'blue' },
    { icon: '⬆', label: 'Add: i += lowbit(i)', tone: 'cyan' },
    { icon: '⬅', label: 'Prefix: i -= lowbit(i)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['add(pos, d)', 'prefix(pos)', 'lowest set bit', 'Fenwick tree'],
  complexity: [{ label: 'Time', value: 'O(n) build, O(log n) per op' }, { label: 'Space', value: 'O(n)' }],
  why: 'Slot i holds the sum of positions i - lowbit(i) + 1 .. i. Writing a prefix length as a sum of powers of two (its set bits) cuts [1..pos] into disjoint blocks, and each block is exactly one slot, found by repeatedly clearing the lowest bit. A position p belongs to the blocks of the slots p, p + lowbit(p), ... because each step doubles the lowbit or carries it upward, so adding the delta along that chain updates exactly the blocks that contain p.',
  naive: 'A running prefix array answers queries in O(1) but an update forces O(n) recomputation; rescanning the array makes queries O(n). The Fenwick tree balances both at O(log n).',
};
