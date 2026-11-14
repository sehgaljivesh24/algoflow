import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { blockGrid, ceilSqrt, lineOf, parseNums, splitBar } from './kitC.ts';

type Op = { k: 'sum'; l: number; r: number } | { k: 'set'; i: number; v: number };
interface In { a: number[]; ops: Op[] }

const EX = '5 2 7 1 8 3 6 4 9 | sum:1-6 set:3=10 sum:2-8';

function parse(raw: string): In {
  const [arrPart, toks] = splitBar(raw, EX);
  const a = parseNums(arrPart, { what: 'the array', min: 3, max: 12, lo: -50, hi: 50, example: '5 2 7 1 8 3 6 4 9' });
  if (!toks.length) throw new Error(`Add at least one operation after the bar, e.g. ${EX}`);
  if (toks.length > 6) throw new Error('Use at most 6 operations');
  const ops = toks.map((t): Op => {
    let m = /^sum:(\d+)-(\d+)$/i.exec(t);
    if (m) {
      const l = Number(m[1]);
      const r = Number(m[2]);
      if (l > r || r >= a.length) throw new Error(`"${t}": indexes must satisfy 0 <= l <= r <= ${a.length - 1}`);
      return { k: 'sum', l, r };
    }
    m = /^set:(\d+)=(-?\d+)$/i.exec(t);
    if (m) {
      const i = Number(m[1]);
      const v = Number(m[2]);
      if (i >= a.length) throw new Error(`"${t}": the index must be between 0 and ${a.length - 1}`);
      if (Math.abs(v) > 50) throw new Error('Keep new values within -50..50');
      return { k: 'set', i, v };
    }
    throw new Error(`"${t}" is not an operation. Write sum:l-r (inclusive) or set:i=v`);
  });
  return { a, ops };
}

const java = [
  'class SqrtSum {',
  '    private final int[] a;',
  '    private final long[] block;',
  '    private final int n, B;',
  '',
  '    SqrtSum(int[] nums) {',
  '        a = nums.clone();',
  '        n = a.length;',
  '        B = (int) Math.ceil(Math.sqrt(n));          // block size ~ sqrt(n)',
  '        block = new long[(n + B - 1) / B];',
  '        for (int i = 0; i < n; i++) block[i / B] += a[i];   // block sums',
  '    }',
  '',
  '    void set(int i, int v) {',
  '        block[i / B] += v - a[i];                    // fix the one block sum',
  '        a[i] = v;',
  '    }',
  '',
  '    long sum(int l, int r) {',
  '        int bl = l / B, br = r / B;',
  '        long s = 0;',
  '        if (bl == br) {                              // inside one block',
  '            for (int i = l; i <= r; i++) s += a[i];',
  '            return s;',
  '        }',
  '        for (int i = l; i < (bl + 1) * B; i++) s += a[i];   // left partial block',
  '        for (int b = bl + 1; b < br; b++) s += block[b];    // whole blocks',
  '        for (int i = br * B; i <= r; i++) s += a[i];        // right partial block',
  '        return s;',
  '    }',
  '}',
];
const python = [
  'class SqrtSum:',
  '    def __init__(self, nums):',
  '        self.a = nums[:]',
  '        self.n = len(nums)',
  '        self.B = math.ceil(math.sqrt(self.n))        # block size ~ sqrt(n)',
  '        self.block = [0] * ((self.n + self.B - 1) // self.B)',
  '        for i, x in enumerate(nums):',
  '            self.block[i // self.B] += x             # block sums',
  '',
  '    def set(self, i, v):',
  '        self.block[i // self.B] += v - self.a[i]     # fix the one block sum',
  '        self.a[i] = v',
  '',
  '    def sum(self, l, r):',
  '        B = self.B',
  '        bl, br = l // B, r // B',
  '        s = 0',
  '        if bl == br:                                 # inside one block',
  '            for i in range(l, r + 1): s += self.a[i]',
  '            return s',
  '        for i in range(l, (bl + 1) * B): s += self.a[i]      # left partial block',
  '        for b in range(bl + 1, br): s += self.block[b]       # whole blocks',
  '        for i in range(br * B, r + 1): s += self.a[i]        # right partial block',
  '        return s',
];

const J = {
  build: [lineOf(java, 'B = (int)'), lineOf(java, 'block = new long'), lineOf(java, 'block[i / B] += a[i]')],
  setDiff: [lineOf(java, 'void set')],
  setApply: [lineOf(java, 'block[i / B] += v'), lineOf(java, 'a[i] = v')],
  query: [lineOf(java, 'long sum'), lineOf(java, 'int bl = l')],
  same: [lineOf(java, 'if (bl == br)'), lineOf(java, 'for (int i = l; i <= r')],
  left: [lineOf(java, 'left partial')],
  mid: [lineOf(java, 'whole blocks')],
  right: [lineOf(java, 'right partial')],
  ret: [lineOf(java, 'return s;', lineOf(java, 'right partial'))],
};
const P = {
  build: [lineOf(python, 'self.B ='), lineOf(python, 'self.block = [0]'), lineOf(python, 'self.block[i // self.B] += x')],
  setDiff: [lineOf(python, 'def set')],
  setApply: [lineOf(python, 'self.block[i // self.B] += v'), lineOf(python, 'self.a[i] = v')],
  query: [lineOf(python, 'def sum'), lineOf(python, 'bl, br')],
  same: [lineOf(python, 'if bl == br'), lineOf(python, 'for i in range(l, r + 1)')],
  left: [lineOf(python, 'left partial')],
  mid: [lineOf(python, 'whole blocks')],
  right: [lineOf(python, 'right partial')],
  ret: [lineOf(python, 'return s', lineOf(python, 'right partial'))],
};

function build({ a: input, ops }: In): Step[] {
  const a = [...input];
  const n = a.length;
  const B = ceilSqrt(n);
  const nb = Math.ceil(n / B);
  const block = Array.from({ length: nb }, (_, b) => a.slice(b * B, b * B + B).reduce((x, y) => x + y, 0));
  const answers: number[] = [];
  const steps: Step[] = [];
  let st = new Map<number, CellState>();
  let hot = -1;
  let op = '—';
  let range = '—';
  let total: number | string = '—';

  const scene = () => blockGrid(a, B, (i) => st.get(i), (b) => `blk ${b}: Σ=${block[b]}`);
  const aux = (): Aux[] => [
    { title: `block sums (B = ${B})`, kind: 'list', items: block.map((s, b) => `b${b}=${s}`), highlight: hot >= 0 ? hot : undefined },
    { title: 'answers so far', kind: 'list', items: answers.map(String) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { op, range, total, answers: `[${answers.join(', ')}]` } });
  };

  push({
    title: 'Start: cut the array into blocks', desc: `n = ${n}, so the block size is B = ceil(sqrt(${n})) = ${B}. Each row below is one block; its sum is stored in the row heading.`,
    logic: 'With blocks of size about sqrt(n) there are about sqrt(n) blocks, which balances the two kinds of work a query has to do.', logicTone: 'info',
    javaLines: J.build, pyLines: P.build, algoStep: 0,
    tag: 'BUILD —', note: `B = ceil(sqrt(${n})) = ${B}, ${nb} blocks, block sums = [${block.join(', ')}]`,
  });

  for (const o of ops) {
    st = new Map();
    hot = -1;
    if (o.k === 'set') {
      const b = Math.floor(o.i / B);
      const diff = o.v - a[o.i];
      op = `set(${o.i}, ${o.v})`;
      range = `a[${o.i}]`;
      total = diff >= 0 ? `+${diff}` : String(diff);
      st.set(o.i, 'active');
      hot = b;
      push({
        title: `set(${o.i}, ${o.v})`, desc: `a[${o.i}] changes from ${a[o.i]} to ${o.v}, a difference of ${diff}. Index ${o.i} lives in block ${b} (${o.i} / ${B} = ${b}).`,
        logic: 'Only the block that owns the index can be affected, so one block sum has to be corrected.', logicTone: 'info',
        javaLines: J.setDiff, pyLines: P.setDiff, algoStep: 1,
        tag: 'SET —', note: `i=${o.i} → block ${o.i} / ${B} = ${b}; diff = ${o.v} - ${a[o.i]} = ${diff}`,
      });
      const oldSum = block[b];
      block[b] += diff;
      a[o.i] = o.v;
      for (let i = b * B; i < Math.min(n, b * B + B); i++) st.set(i, 'swap');
      st.set(o.i, 'active');
      push({
        title: `Block ${b} sum becomes ${block[b]}`, desc: `Block ${b} sum ${oldSum} + (${diff}) = ${block[b]}, and a[${o.i}] = ${o.v}: O(1) work, no rescan of the block.`,
        logic: 'An update touches one element and one stored sum, so it costs O(1).', logicTone: 'info',
        javaLines: J.setApply, pyLines: P.setApply, algoStep: 1,
        tag: 'FIX BLOCK —', note: `block[${b}] += ${diff} → ${block[b]}; a[${o.i}] = ${o.v}`,
      });
      continue;
    }
    const { l, r } = o;
    const bl = Math.floor(l / B);
    const br = Math.floor(r / B);
    let s = 0;
    let scanned = 0;
    op = `sum(${l}, ${r})`;
    range = `${l}..${r}`;
    total = 0;
    push({
      title: `sum(${l}, ${r})`, desc: `Index ${l} is in block ${bl}, index ${r} is in block ${br}. ${bl === br ? 'Both ends are in one block, so scan the elements directly.' : 'The two ends sit in different blocks: scan the ragged ends, take whole blocks from the stored sums.'}`,
      logic: 'Classify the range into partial blocks (scan) and whole blocks (look up).', logicTone: 'info',
      javaLines: J.query, pyLines: P.query, algoStep: 2,
      tag: 'QUERY —', note: `bl = ${l} / ${B} = ${bl}, br = ${r} / ${B} = ${br}${bl === br ? ' → same block' : ` → ${plural(Math.max(0, br - bl - 1), 'whole block')} between`}`,
    });
    const addElem = (i: number, lines: number[], pl: number[], algo: number) => {
      st.set(i, 'compare');
      const before = s;
      s += a[i];
      scanned++;
      total = s;
      push({ title: `Add a[${i}] = ${a[i]}`, desc: `a[${i}] = ${a[i]} is read one by one: ${before} + ${a[i]} = ${s}.`, logic: 'Elements outside whole blocks are read one by one.', logicTone: 'info', javaLines: lines, pyLines: pl, algoStep: algo,
        tag: 'SCAN —', note: `s += a[${i}] → ${before} + ${a[i]} = ${s}` });
      st.set(i, 'found');
    };
    if (bl === br) {
      for (let i = l; i <= r; i++) addElem(i, J.same, P.same, 2);
    } else {
      for (let i = l; i < (bl + 1) * B; i++) addElem(i, J.left, P.left, 2);
      for (let b = bl + 1; b < br; b++) {
        const idx = Array.from({ length: Math.min(n, b * B + B) - b * B }, (_, k) => b * B + k);
        idx.forEach((i) => st.set(i, 'compare'));
        hot = b;
        const before = s;
        s += block[b];
        total = s;
        push({ title: `Take whole block ${b}: +${block[b]}`, desc: `Block ${b} lies completely inside the range, so its stored sum ${block[b]} is added without looking at its ${plural(idx.length, 'element')}: ${before} + ${block[b]} = ${s}.`, logic: 'This is the saving: B elements are replaced by one number.', logicTone: 'success', javaLines: J.mid, pyLines: P.mid, algoStep: 3,
          tag: 'WHOLE BLOCK —', note: `s += block[${b}] → ${before} + ${block[b]} = ${s} (skipped ${idx.length} reads)` });
        idx.forEach((i) => st.set(i, 'found'));
        hot = -1;
      }
      for (let i = br * B; i <= r; i++) addElem(i, J.right, P.right, 2);
    }
    answers.push(s);
    push({ title: `sum(${l}, ${r}) = ${s}`, desc: `sum(${l}, ${r}) = ${s}: read ${scanned} single element${scanned === 1 ? '' : 's'} and ${Math.max(0, br - bl - 1)} block sum${br - bl - 1 === 1 ? '' : 's'} instead of ${plural(r - l + 1, 'element')}.`, logic: 'Two ragged ends cost at most 2(B-1) reads and the middle at most n/B reads: O(sqrt n).', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 3,
      tag: 'ANSWER —', note: `return s = ${s}` });
  }
  st = new Map();
  hot = -1;
  op = 'done';
  range = '—';
  total = '—';
  push({ title: 'All operations done', desc: `Answers to the sum queries: [${answers.join(', ')}].`, logic: 'Updates cost O(1) and queries O(sqrt n), so q operations cost O(q sqrt n) in total.', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 4,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]` });
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Answers of the sum queries in order' };
  return steps;
}

const mk = (s: string): In => parse(s);

export const sqrtDecompositionRangeSum: ProblemDef<In> = {
  slug: 'alg-sqrt-decomposition-range-sum-with-updates',
  id: 'ALG', title: 'Sqrt Decomposition (Range Sum with Updates)', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'sqrt decomposition',
  statement: 'Keep an array that supports two operations: set(i, v) overwrites one element and sum(l, r) returns the total of a[l..r] (inclusive). Split the array into blocks of about sqrt(n) elements and store each block\'s sum, so that updates cost O(1) and queries cost O(sqrt n) instead of O(n).',
  constraints: 'Animation input: 3 to 12 integers in -50..50, then up to 6 operations written sum:l-r (0-based, inclusive) or set:i=v',
  examples: [
    { label: EX, input: mk(EX), output: '[27, 47]' },
    { label: '4 -2 9 0 3 7 -5 1 | sum:0-7 set:6=5 sum:5-7 sum:2-2', input: mk('4 -2 9 0 3 7 -5 1 | sum:0-7 set:6=5 sum:5-7 sum:2-2'), output: '[17, 13, 9]' },
    { label: '1 2 3 4 5 6 7 8 9 10 11 12 | sum:2-9 set:0=20 sum:0-5', input: mk('1 2 3 4 5 6 7 8 9 10 11 12 | sum:2-9 set:0=20 sum:0-5'), output: '[52, 40]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Blocks',
  legend: [{ label: 'Being added', state: 'compare' }, { label: 'Added to the total', state: 'found' }, { label: 'Updated element / block', state: 'active' }],
  varLabels: ['op', 'range', 'total', 'answers'],
  approach: {
    title: 'Pay sqrt(n) at both ends, one lookup per whole block',
    text: 'Store the sum of every block of size B = ceil(sqrt n). A point update fixes one element and one block sum. A range query scans the partial block on each end and adds the stored sums of the blocks fully inside the range.',
  },
  java, python,
  algorithm: [
    'Choose B = ceil(sqrt n) and store the sum of every block',
    'set(i, v): add (v - a[i]) to the sum of block i / B, then overwrite a[i]',
    'sum(l, r): find the blocks of l and r; if equal, scan l..r directly',
    'Otherwise scan the left partial block, add whole-block sums, scan the right partial block',
    'Return the answers of all sum queries',
  ],
  phases: [
    { icon: '🧱', label: 'Build block sums', tone: 'blue' },
    { icon: '✏️', label: 'Set: fix one block sum', tone: 'cyan' },
    { icon: '🔍', label: 'Query: scan ragged ends', tone: 'orange' },
    { icon: '📦', label: 'Take whole blocks', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['set(i, v)', 'sum(l, r)', 'blocks of about sqrt(n) elements', 'O(1)', 'O(sqrt n)'],
  complexity: [{ label: 'Time', value: 'O(1) update, O(sqrt n) query' }, { label: 'Space', value: 'O(n)' }],
  why: 'A range covers at most two partial blocks (each at most B - 1 elements) and at most n / B whole blocks, so a query reads at most 2B + n / B numbers, which is O(sqrt n) when B = sqrt n. A point update changes exactly one element and therefore exactly one block sum, so keeping both consistent is O(1). The invariant is that block[b] always equals the sum of the elements of block b.',
  naive: 'Summing the range element by element costs O(n) per query. Prefix sums make queries O(1) but an update then has to rewrite O(n) prefixes. Blocks sit in the middle and make both operations cheap.',
};
