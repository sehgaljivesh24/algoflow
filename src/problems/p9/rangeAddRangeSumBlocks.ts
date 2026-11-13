import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { blockGrid, ceilSqrt, lineOf, parseNums, splitBar } from './kitC.ts';

type Op = { k: 'sum'; l: number; r: number } | { k: 'add'; l: number; r: number; v: number };
interface In { a: number[]; ops: Op[] }

const EX = '3 1 4 1 5 9 2 6 5 | add:1-7=2 sum:2-6 add:0-8=-1 sum:0-8';

function parse(raw: string): In {
  const [arrPart, toks] = splitBar(raw, EX);
  const a = parseNums(arrPart, { what: 'the array', min: 3, max: 12, lo: -50, hi: 50, example: '3 1 4 1 5 9 2 6 5' });
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
    m = /^add:(\d+)-(\d+)=(-?\d+)$/i.exec(t);
    if (m) {
      const l = Number(m[1]);
      const r = Number(m[2]);
      const v = Number(m[3]);
      if (l > r || r >= a.length) throw new Error(`"${t}": indexes must satisfy 0 <= l <= r <= ${a.length - 1}`);
      if (Math.abs(v) > 20) throw new Error('Keep the added amount within -20..20');
      return { k: 'add', l, r, v };
    }
    throw new Error(`"${t}" is not an operation. Write add:l-r=v (add v to every element) or sum:l-r`);
  });
  return { a, ops };
}

const java = [
  'class BlockArray {',
  '    private final long[] a, sum, lazy;     // elements, block sums, pending per-block adds',
  '    private final int n, B;',
  '',
  '    BlockArray(int[] nums) {',
  '        n = nums.length;',
  '        B = (int) Math.ceil(Math.sqrt(n));',
  '        a = new long[n];',
  '        sum = new long[(n + B - 1) / B];',
  '        lazy = new long[sum.length];',
  '        for (int i = 0; i < n; i++) { a[i] = nums[i]; sum[i / B] += nums[i]; }',
  '    }',
  '',
  '    int size(int b) { return Math.min(n, (b + 1) * B) - b * B; }',
  '',
  '    void add(int l, int r, long v) {',
  '        int bl = l / B, br = r / B;',
  '        if (bl == br) {',
  '            for (int i = l; i <= r; i++) { a[i] += v; sum[bl] += v; }',
  '            return;',
  '        }',
  '        for (int i = l; i < (bl + 1) * B; i++) { a[i] += v; sum[bl] += v; }   // left partial',
  '        for (int b = bl + 1; b < br; b++) { lazy[b] += v; sum[b] += v * size(b); } // tag whole block',
  '        for (int i = br * B; i <= r; i++) { a[i] += v; sum[br] += v; }        // right partial',
  '    }',
  '',
  '    long query(int l, int r) {',
  '        int bl = l / B, br = r / B;',
  '        long s = 0;',
  '        if (bl == br) {',
  '            for (int i = l; i <= r; i++) s += a[i] + lazy[bl];',
  '            return s;',
  '        }',
  '        for (int i = l; i < (bl + 1) * B; i++) s += a[i] + lazy[bl];          // left partial',
  '        for (int b = bl + 1; b < br; b++) s += sum[b];                         // whole blocks',
  '        for (int i = br * B; i <= r; i++) s += a[i] + lazy[br];               // right partial',
  '        return s;',
  '    }',
  '}',
];
const python = [
  'class BlockArray:',
  '    def __init__(self, nums):',
  '        self.n = len(nums)',
  '        self.B = math.ceil(math.sqrt(self.n))',
  '        self.a = nums[:]                    # elements (without the pending tag)',
  '        nb = (self.n + self.B - 1) // self.B',
  '        self.sum = [0] * nb                 # true block sums',
  '        self.lazy = [0] * nb                # pending add for the whole block',
  '        for i, x in enumerate(nums): self.sum[i // self.B] += x',
  '',
  '    def size(self, b):',
  '        return min(self.n, (b + 1) * self.B) - b * self.B',
  '',
  '    def add(self, l, r, v):',
  '        B = self.B',
  '        bl, br = l // B, r // B',
  '        if bl == br:',
  '            for i in range(l, r + 1): self.a[i] += v; self.sum[bl] += v',
  '            return',
  '        for i in range(l, (bl + 1) * B): self.a[i] += v; self.sum[bl] += v    # left partial',
  '        for b in range(bl + 1, br): self.lazy[b] += v; self.sum[b] += v * self.size(b)  # tag whole block',
  '        for i in range(br * B, r + 1): self.a[i] += v; self.sum[br] += v      # right partial',
  '',
  '    def query(self, l, r):',
  '        B = self.B',
  '        bl, br = l // B, r // B',
  '        s = 0',
  '        if bl == br:',
  '            for i in range(l, r + 1): s += self.a[i] + self.lazy[bl]',
  '            return s',
  '        for i in range(l, (bl + 1) * B): s += self.a[i] + self.lazy[bl]       # left partial',
  '        for b in range(bl + 1, br): s += self.sum[b]                           # whole blocks',
  '        for i in range(br * B, r + 1): s += self.a[i] + self.lazy[br]         # right partial',
  '        return s',
];

const q = (code: string[], needle: string, from: string) => lineOf(code, needle, lineOf(code, from));
const J = {
  build: [lineOf(java, 'B = (int)'), lineOf(java, 'sum = new long'), lineOf(java, 'lazy = new long'), lineOf(java, 'sum[i / B] += nums[i]')],
  addHead: [lineOf(java, 'void add'), lineOf(java, 'int bl = l / B')],
  addSame: [lineOf(java, 'if (bl == br)'), lineOf(java, 'for (int i = l; i <= r; i++) { a[i] += v')],
  addLeft: [lineOf(java, 'left partial')],
  addMid: [lineOf(java, 'tag whole block')],
  addRight: [lineOf(java, 'right partial')],
  qHead: [lineOf(java, 'long query'), q(java, 'int bl = l / B', 'long query')],
  qSame: [q(java, 'if (bl == br)', 'long query'), lineOf(java, 'a[i] + lazy[bl];')],
  qLeft: [q(java, 'left partial', 'long query')],
  qMid: [lineOf(java, 'whole blocks')],
  qRight: [q(java, 'right partial', 'long query')],
  ret: [q(java, 'return s;', 'long query')],
};
const P = {
  build: [lineOf(python, 'self.B = math'), lineOf(python, 'self.sum = [0]'), lineOf(python, 'self.lazy = [0]'), lineOf(python, 'for i, x in enumerate')],
  addHead: [lineOf(python, 'def add'), lineOf(python, 'bl, br')],
  addSame: [lineOf(python, 'if bl == br'), lineOf(python, 'for i in range(l, r + 1): self.a[i] += v')],
  addLeft: [lineOf(python, 'left partial')],
  addMid: [lineOf(python, 'tag whole block')],
  addRight: [lineOf(python, 'right partial')],
  qHead: [lineOf(python, 'def query'), q(python, 'bl, br', 'def query')],
  qSame: [q(python, 'if bl == br', 'def query'), lineOf(python, 's += self.a[i] + self.lazy[bl]')],
  qLeft: [q(python, 'left partial', 'def query')],
  qMid: [lineOf(python, 'whole blocks')],
  qRight: [q(python, 'right partial', 'def query')],
  ret: [q(python, 'return s', 'def query')],
};

function build({ a: input, ops }: In): Step[] {
  const a = [...input];
  const n = a.length;
  const B = ceilSqrt(n);
  const nb = Math.ceil(n / B);
  const size = (b: number) => Math.min(n, (b + 1) * B) - b * B;
  const sum = Array.from({ length: nb }, (_, b) => a.slice(b * B, b * B + B).reduce((x, y) => x + y, 0));
  const lazy: number[] = Array(nb).fill(0);
  const answers: number[] = [];
  const steps: Step[] = [];
  let st = new Map<number, CellState>();
  let hot = -1;
  let op = '—';
  let range = '—';
  let total: number | string = '—';
  const blk = (i: number) => Math.floor(i / B);
  const signed = (v: number) => (v >= 0 ? `+${v}` : String(v));

  const scene = () => blockGrid(a, B, (i) => st.get(i), (b) => `blk ${b}: Σ=${sum[b]}  lazy ${signed(lazy[b])}`, (i) => a[i] + lazy[blk(i)]);
  const aux = (): Aux[] => [
    { title: `block sums (B = ${B})`, kind: 'list', items: sum.map((s, b) => `b${b}=${s}`), highlight: hot >= 0 ? hot : undefined },
    { title: 'pending lazy adds', kind: 'list', items: lazy.map((z, b) => `b${b}:${signed(z)}`), highlight: hot >= 0 ? hot : undefined },
    { title: 'answers so far', kind: 'list', items: answers.map(String) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { op, range, total, answers: `[${answers.join(', ')}]` } });
  };

  push({
    title: 'Start: blocks with a lazy tag each', desc: `n = ${n}, block size B = ${B}. Each block keeps its sum and a lazy tag "add this to every element". The cells show a[i] + the tag of their block.`,
    logic: 'A whole-block range add can be recorded in O(1) by writing the tag instead of touching B elements.', logicTone: 'info',
    javaLines: J.build, pyLines: P.build, algoStep: 0,
    tag: 'BUILD —', note: `B = ${B}, ${nb} blocks, sums = [${sum.join(', ')}], all lazy tags = 0`,
  });

  for (const o of ops) {
    st = new Map();
    hot = -1;
    const { l, r } = o;
    const bl = blk(l);
    const br = blk(r);
    range = `${l}..${r}`;
    if (o.k === 'add') {
      const v = o.v;
      op = `add(${l}, ${r}, ${signed(v)})`;
      total = signed(v);
      push({
        title: op, desc: `Add ${v} to every element of a[${l}..${r}]. The range starts in block ${bl} and ends in block ${br}${bl === br ? '' : `; blocks ${bl + 1}..${br - 1} are covered completely`}.`,
        logic: 'Ragged ends are rewritten element by element; fully covered blocks only get a tag.', logicTone: 'info',
        javaLines: J.addHead, pyLines: P.addHead, algoStep: 1,
        tag: 'ADD —', note: `bl = ${l} / ${B} = ${bl}, br = ${r} / ${B} = ${br}${bl === br ? ' → one block' : `; covered blocks: ${br - bl - 1}`}`,
      });
      const elem = (i: number, jl: number[], pl: number[]) => {
        const was = a[i];
        a[i] += v;
        sum[blk(i)] += v;
        hot = blk(i);
        st.set(i, 'active');
        push({ title: `a[${i}] += ${v}`, desc: `Element ${i} is rewritten (${was} → ${a[i]}) and the sum of block ${blk(i)} grows by ${v} to ${sum[blk(i)]}.`, logic: 'Partial blocks cannot use a tag, because only some of their elements change.', logicTone: 'info', javaLines: jl, pyLines: pl, algoStep: 1,
          tag: 'REWRITE —', note: `a[${i}] += ${v} → ${a[i]}; sum[${blk(i)}] → ${sum[blk(i)]}` });
        hot = -1;
      };
      if (bl === br) for (let i = l; i <= r; i++) elem(i, J.addSame, P.addSame);
      else {
        for (let i = l; i < (bl + 1) * B; i++) elem(i, J.addLeft, P.addLeft);
        for (let b = bl + 1; b < br; b++) {
          lazy[b] += v;
          sum[b] += v * size(b);
          hot = b;
          for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'swap');
          push({ title: `Tag block ${b}: lazy ${signed(lazy[b])}`, desc: `Block ${b} is fully inside the range: its tag grows by ${v} and its sum by ${v} x ${size(b)} = ${v * size(b)}. No element is touched.`, logic: 'One tag update replaces B element updates; the work is postponed until someone looks inside the block.', logicTone: 'success', javaLines: J.addMid, pyLines: P.addMid, algoStep: 2,
            tag: 'TAG BLOCK —', note: `lazy[${b}] += ${v} → ${lazy[b]}; sum[${b}] += ${v} * ${size(b)} → ${sum[b]}` });
          hot = -1;
        }
        for (let i = br * B; i <= r; i++) elem(i, J.addRight, P.addRight);
      }
      continue;
    }
    let s = 0;
    op = `sum(${l}, ${r})`;
    total = 0;
    push({
      title: op, desc: `Range ${l}..${r}: blocks ${bl} to ${br}. Whole blocks give their stored sum; ragged ends are read as a[i] plus the tag of their block.`,
      logic: 'The stored block sum already includes every lazy tag, so whole blocks need no unpacking.', logicTone: 'info',
      javaLines: J.qHead, pyLines: P.qHead, algoStep: 3,
      tag: 'QUERY —', note: `bl = ${l} / ${B} = ${bl}, br = ${r} / ${B} = ${br}${bl === br ? ' → one block' : ''}`,
    });
    const read = (i: number, jl: number[], pl: number[]) => {
      st.set(i, 'compare');
      const val = a[i] + lazy[blk(i)];
      const before = s;
      s += val;
      total = s;
      push({ title: `Read a[${i}] + lazy = ${val}`, desc: `${a[i]} + ${signed(lazy[blk(i)])} (tag of block ${blk(i)}) = ${val}; running total ${before} + ${val} = ${s}.`, logic: 'Elements read directly must add their block\'s pending tag.', logicTone: 'info', javaLines: jl, pyLines: pl, algoStep: 3,
        tag: 'READ —', note: `s += a[${i}] + lazy[${blk(i)}] = ${a[i]} + ${lazy[blk(i)]} → ${s}` });
      st.set(i, 'found');
    };
    if (bl === br) for (let i = l; i <= r; i++) read(i, J.qSame, P.qSame);
    else {
      for (let i = l; i < (bl + 1) * B; i++) read(i, J.qLeft, P.qLeft);
      for (let b = bl + 1; b < br; b++) {
        for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'compare');
        hot = b;
        const before = s;
        s += sum[b];
        total = s;
        push({ title: `Whole block ${b}: +${sum[b]}`, desc: `Block ${b} is inside the range; its stored sum ${sum[b]} (tags included) is added at once: ${before} + ${sum[b]} = ${s}.`, logic: 'A whole block costs one read however large the block is.', logicTone: 'success', javaLines: J.qMid, pyLines: P.qMid, algoStep: 3,
          tag: 'WHOLE BLOCK —', note: `s += sum[${b}] → ${before} + ${sum[b]} = ${s}` });
        for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'found');
        hot = -1;
      }
      for (let i = br * B; i <= r; i++) read(i, J.qRight, P.qRight);
    }
    answers.push(s);
    push({ title: `sum(${l}, ${r}) = ${s}`, desc: `sum(${l}, ${r}) = ${s}, using ${Math.max(0, br - bl - 1)} whole-block sum${br - bl - 1 === 1 ? '' : 's'} plus the ragged ends.`, logic: 'Both operations walk at most two partial blocks and the whole blocks between them: O(sqrt n).', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 3,
      tag: 'ANSWER —', note: `return s = ${s}` });
  }
  st = new Map();
  hot = -1;
  op = 'done';
  range = '—';
  total = '—';
  push({ title: 'All operations done', desc: `Answers to the sum queries: [${answers.join(', ')}].`, logic: 'Range add and range sum both cost O(sqrt n); the lazy tags are what make whole-block adds O(1) each.', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 4,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]` });
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Answers of the sum queries in order' };
  return steps;
}

const mk = (s: string): In => parse(s);

export const rangeAddRangeSumBlocks: ProblemDef<In> = {
  slug: 'cp-range-add-and-range-sum-with-blocks',
  id: 'CP', title: 'Range Add and Range Sum with Blocks', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'sqrt decomposition + lazy tags',
  statement: 'Support add(l, r, v), which adds v to every element of a[l..r], and sum(l, r), which returns the total of a[l..r]. With blocks of about sqrt(n) elements, give every block a sum and a lazy "add to all" tag so that both operations cost O(sqrt n).',
  constraints: 'Animation input: 3 to 12 integers in -50..50, then up to 6 operations written add:l-r=v (v in -20..20) or sum:l-r (0-based, inclusive)',
  examples: [
    { label: EX, input: mk(EX), output: '[31, 41]' },
    { label: '1 2 3 4 5 6 7 8 9 10 11 12 | add:0-11=1 sum:3-8 add:4-6=-3 sum:0-11', input: mk('1 2 3 4 5 6 7 8 9 10 11 12 | add:0-11=1 sum:3-8 add:4-6=-3 sum:0-11'), output: '[45, 81]' },
    { label: '0 0 0 0 0 0 | add:1-4=5 sum:0-5 sum:2-3 add:0-0=7 sum:0-2', input: mk('0 0 0 0 0 0 | add:1-4=5 sum:0-5 sum:2-3 add:0-0=7 sum:0-2'), output: '[20, 10, 17]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Blocks with lazy tags',
  vizCaption: 'cells show a[i] + the lazy tag of their block',
  legend: [{ label: 'Element rewritten', state: 'active' }, { label: 'Block tagged lazily', state: 'swap' }, { label: 'Being added', state: 'compare' }, { label: 'Added to the total', state: 'found' }],
  varLabels: ['op', 'range', 'total', 'answers'],
  approach: {
    title: 'Whole blocks get a tag, ragged ends get rewritten',
    text: 'For add, rewrite the elements of the two partial blocks and just bump the lazy tag (and the stored sum) of each block that is covered completely. For sum, read partial blocks element by element, adding the block tag, and take stored sums for whole blocks.',
  },
  java, python,
  algorithm: [
    'Cut the array into blocks of size B; store a sum and a lazy tag per block',
    'add(l, r, v): rewrite elements of the partial blocks and fix their sums',
    'add: for every fully covered block, lazy += v and sum += v * size',
    'sum(l, r): read partial blocks as a[i] + lazy, add stored sums of whole blocks',
    'Return the answers of all sum queries',
  ],
  phases: [
    { icon: '🧱', label: 'Build blocks + lazy tags', tone: 'blue' },
    { icon: '✏️', label: 'Add: rewrite ragged ends', tone: 'cyan' },
    { icon: '🏷️', label: 'Add: tag whole blocks', tone: 'orange' },
    { icon: '🔍', label: 'Sum: ends + whole blocks', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['add(l, r, v)', 'sum(l, r)', 'lazy', 'O(sqrt n)'],
  complexity: [{ label: 'Time', value: 'O(sqrt n) per operation' }, { label: 'Space', value: 'O(n)' }],
  why: 'The invariant is: the true value of element i is a[i] + lazy[block(i)], and sum[b] is the sum of the true values of block b. A whole-block add keeps both true by changing the tag and the sum together. A partial add changes a[i] and sum[b] together. Each operation visits at most two partial blocks (up to B - 1 elements each) and at most n / B whole blocks, hence O(sqrt n).',
  naive: 'Adding v to every element of the range costs O(n) per update. Prefix sums would make the sum O(1) but the update O(n) again; the lazy block tag makes the update as cheap as the query.',
};
