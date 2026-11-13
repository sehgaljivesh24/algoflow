import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { blockGrid, ceilSqrt, lineOf, parseNums, splitBar } from './kitC.ts';

interface Q { l: number; r: number; v: number }
interface In { a: number[]; qs: Q[] }

const EX = '1 3 1 2 3 1 2 1 3 | q:0-8=1 q:2-6=3 q:3-7=2';

function parse(raw: string): In {
  const [arrPart, toks] = splitBar(raw, EX);
  const a = parseNums(arrPart, { what: 'the array', min: 3, max: 12, lo: 0, hi: 9, example: '1 3 1 2 3 1 2 1 3' });
  if (!toks.length) throw new Error(`Add at least one query after the bar, e.g. ${EX}`);
  if (toks.length > 5) throw new Error('Use at most 5 queries');
  const qs = toks.map((t): Q => {
    const m = /^q:(\d+)-(\d+)=(\d)$/i.exec(t);
    if (!m) throw new Error(`"${t}" is not a query. Write q:l-r=value, e.g. q:2-6=3`);
    const l = Number(m[1]);
    const r = Number(m[2]);
    if (l > r || r >= a.length) throw new Error(`"${t}": indexes must satisfy 0 <= l <= r <= ${a.length - 1}`);
    return { l, r, v: Number(m[3]) };
  });
  return { a, qs };
}

const java = [
  'class RangeFreqQuery {',
  '    private final int[] a;',
  '    private final int n, B;',
  '    private final int[][] cnt;                 // cnt[b][v] = how often v occurs inside block b',
  '',
  '    RangeFreqQuery(int[] arr) {',
  '        a = arr;',
  '        n = a.length;',
  '        B = (int) Math.ceil(Math.sqrt(n));',
  '        cnt = new int[(n + B - 1) / B][10001];',
  '        for (int i = 0; i < n; i++) cnt[i / B][a[i]]++;',
  '    }',
  '',
  '    int query(int l, int r, int v) {',
  '        int bl = l / B, br = r / B, c = 0;',
  '        if (bl == br) {',
  '            for (int i = l; i <= r; i++) if (a[i] == v) c++;',
  '            return c;',
  '        }',
  '        for (int i = l; i < (bl + 1) * B; i++) if (a[i] == v) c++;   // left partial',
  '        for (int b = bl + 1; b < br; b++) c += cnt[b][v];             // whole blocks: one lookup each',
  '        for (int i = br * B; i <= r; i++) if (a[i] == v) c++;         // right partial',
  '        return c;',
  '    }',
  '}',
];
const python = [
  'class RangeFreqQuery:',
  '    def __init__(self, arr):',
  '        self.a = arr',
  '        n = len(arr)',
  '        self.B = math.ceil(math.sqrt(n))',
  '        nb = (n + self.B - 1) // self.B',
  '        self.cnt = [collections.Counter() for _ in range(nb)]   # cnt[b][v] = occurrences in block b',
  '        for i, x in enumerate(arr): self.cnt[i // self.B][x] += 1',
  '',
  '    def query(self, l, r, v):',
  '        B = self.B',
  '        bl, br = l // B, r // B',
  '        c = 0',
  '        if bl == br:',
  '            return sum(1 for i in range(l, r + 1) if self.a[i] == v)',
  '        c += sum(1 for i in range(l, (bl + 1) * B) if self.a[i] == v)       # left partial',
  '        for b in range(bl + 1, br): c += self.cnt[b][v]                      # whole blocks: one lookup each',
  '        c += sum(1 for i in range(br * B, r + 1) if self.a[i] == v)         # right partial',
  '        return c',
];

const J = {
  build: [lineOf(java, 'B = (int)'), lineOf(java, 'cnt = new int'), lineOf(java, 'cnt[i / B][a[i]]++')],
  head: [lineOf(java, 'int query'), lineOf(java, 'int bl = l / B')],
  same: [lineOf(java, 'if (bl == br)'), lineOf(java, 'for (int i = l; i <= r')],
  left: [lineOf(java, 'left partial')],
  mid: [lineOf(java, 'whole blocks')],
  right: [lineOf(java, 'right partial')],
  ret: [lineOf(java, 'return c;', lineOf(java, 'right partial'))],
};
const P = {
  build: [lineOf(python, 'self.B ='), lineOf(python, 'self.cnt = ['), lineOf(python, 'self.cnt[i // self.B][x] += 1')],
  head: [lineOf(python, 'def query'), lineOf(python, 'bl, br')],
  same: [lineOf(python, 'if bl == br'), lineOf(python, 'return sum(1 for i in range(l, r + 1)')],
  left: [lineOf(python, 'left partial')],
  mid: [lineOf(python, 'whole blocks')],
  right: [lineOf(python, 'right partial')],
  ret: [lineOf(python, 'return c')],
};

function build({ a, qs }: In): Step[] {
  const n = a.length;
  const B = ceilSqrt(n);
  const nb = Math.ceil(n / B);
  const size = (b: number) => Math.min(n, (b + 1) * B) - b * B;
  const cnt: Map<number, number>[] = Array.from({ length: nb }, () => new Map());
  a.forEach((x, i) => cnt[Math.floor(i / B)].set(x, (cnt[Math.floor(i / B)].get(x) ?? 0) + 1));
  const answers: number[] = [];
  const steps: Step[] = [];
  let st = new Map<number, CellState>();
  let hot = -1;
  let op = '—';
  let range = '—';
  let c: number | string = '—';

  const scene = () => blockGrid(a, B, (i) => st.get(i), (b) => `blk ${b}`);
  const aux = (): Aux[] => [
    {
      title: 'count table: value ×occurrences per block', kind: 'map',
      items: cnt.map((m, b) => `b${b} → ${[...m.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}×${v}`).join(' ')}`),
      highlight: hot >= 0 ? hot : undefined,
    },
    { title: 'answers so far', kind: 'list', items: answers.map(String) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { query: op, range, count: c, answers: `[${answers.join(', ')}]` } });
  };

  push({
    title: 'Start: blocks with a count table', desc: `n = ${n}, block size B = ${B}. For every block we stored how many times each value occurs (right panel).`,
    logic: 'The count table turns "how many v inside this whole block?" into one lookup instead of a scan.', logicTone: 'info',
    javaLines: J.build, pyLines: P.build, algoStep: 0,
    tag: 'BUILD —', note: `B = ${B}, ${nb} blocks; cnt[b][v] filled for every element`,
  });

  for (const { l, r, v } of qs) {
    st = new Map();
    hot = -1;
    const bl = Math.floor(l / B);
    const br = Math.floor(r / B);
    let total = 0;
    op = `query(${l}, ${r}, ${v})`;
    range = `${l}..${r}`;
    c = 0;
    push({
      title: op, desc: `How many times does ${v} occur in a[${l}..${r}]? The range spans blocks ${bl} to ${br}.`,
      logic: 'Split the range into ragged ends (scan) and whole blocks (count-table lookups).', logicTone: 'info',
      javaLines: J.head, pyLines: P.head, algoStep: 1,
      tag: 'QUERY —', note: `bl = ${l} / ${B} = ${bl}, br = ${r} / ${B} = ${br}${bl === br ? ' → same block, scan it' : ''}`,
    });
    const scan = (i: number, jl: number[], pl: number[]) => {
      const hit = a[i] === v;
      if (hit) total++;
      c = total;
      st.set(i, hit ? 'found' : 'dim');
      push({ title: hit ? `a[${i}] = ${a[i]} matches` : `a[${i}] = ${a[i]} differs`, desc: hit ? `a[${i}] = ${a[i]} equals ${v}: the count becomes ${total}.` : `a[${i}] = ${a[i]} is not ${v}; the count stays ${total}.`, logic: 'Elements in partial blocks must be compared one by one.', logicTone: hit ? 'success' : 'info', javaLines: jl, pyLines: pl, algoStep: 2,
        tag: hit ? 'MATCH:' : 'SKIP:', note: `a[${i}] == ${v}? ${a[i]} == ${v} → ${hit ? `yes, c = ${total}` : `no, c = ${total}`}` });
    };
    if (bl === br) for (let i = l; i <= r; i++) scan(i, J.same, P.same);
    else {
      for (let i = l; i < (bl + 1) * B; i++) scan(i, J.left, P.left);
      for (let b = bl + 1; b < br; b++) {
        const k = cnt[b].get(v) ?? 0;
        total += k;
        c = total;
        hot = b;
        for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'swap');
        push({ title: `Block ${b}: table says ${k}`, desc: `Block ${b} is fully inside the range. Its count table has ${v}×${k}, so add ${k} without scanning ${size(b)} elements; count = ${total}.`, logic: 'One table lookup replaces comparing B elements.', logicTone: 'success', javaLines: J.mid, pyLines: P.mid, algoStep: 3,
          tag: 'TABLE —', note: `c += cnt[${b}][${v}] = ${k} → ${total}` });
        hot = -1;
      }
      for (let i = br * B; i <= r; i++) scan(i, J.right, P.right);
    }
    answers.push(total);
    push({ title: `${op} = ${total}`, desc: `Value ${v} occurs ${total} time${total === 1 ? '' : 's'} in a[${l}..${r}].`, logic: 'At most two ragged ends are scanned and at most n / B blocks are looked up: O(sqrt n).', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 3,
      tag: 'ANSWER —', note: `return c = ${total}` });
  }
  st = new Map();
  hot = -1;
  op = 'done';
  range = '—';
  c = '—';
  push({ title: 'All queries answered', desc: `Frequencies in order: [${answers.join(', ')}].`, logic: 'Building the count table costs O(n); each query then costs O(sqrt n) with no sorting or binary search.', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 4,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]` });
  steps[steps.length - 1].result = { title: `[${answers.join(', ')}]`, text: 'Frequencies in query order' };
  return steps;
}

const mk = (s: string): In => parse(s);

export const rangeFrequencyQueries: ProblemDef<In> = {
  slug: '2080-range-frequency-queries',
  id: '2080', title: 'Range Frequency Queries', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'blocks + counts',
  statement: 'Given an array, answer many queries query(left, right, value): how many times does value appear in arr[left..right]? Here the array is cut into blocks of about sqrt(n) elements and every block remembers how often each value occurs inside it.',
  constraints: 'Animation input: 3 to 12 digits 0..9, then up to 5 queries written q:l-r=value (0-based, inclusive)',
  examples: [
    { label: EX, input: mk(EX), output: '[4, 1, 2]' },
    { label: '5 5 2 5 1 5 2 2 5 | q:1-7=5 q:0-8=2 q:4-4=1', input: mk('5 5 2 5 1 5 2 2 5 | q:1-7=5 q:0-8=2 q:4-4=1'), output: '[3, 3, 1]' },
    { label: '0 1 0 1 0 1 | q:0-5=0 q:1-4=1', input: mk('0 1 0 1 0 1 | q:0-5=0 q:1-4=1'), output: '[3, 2]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Blocks',
  legend: [{ label: 'Match (counted)', state: 'found' }, { label: 'Different value', state: 'dim' }, { label: 'Answered from the count table', state: 'swap' }],
  varLabels: ['query', 'range', 'count', 'answers'],
  approach: {
    title: 'Scan the ragged ends, look up whole blocks',
    text: 'For each block keep a table value -> occurrences. A query compares elements one by one in the two partial blocks and adds the table entry for the queried value from every block that is covered completely.',
  },
  java, python,
  algorithm: [
    'Split the array into blocks of size B and count every value inside each block',
    'For a query, find the blocks of left and right',
    'Compare the elements of the left and right partial blocks with the value',
    'Add count[b][value] for every block strictly between them',
    'Return the frequencies in query order',
  ],
  phases: [
    { icon: '🧱', label: 'Build count tables', tone: 'blue' },
    { icon: '📍', label: 'Locate the two blocks', tone: 'cyan' },
    { icon: '🔎', label: 'Scan ragged ends', tone: 'orange' },
    { icon: '📋', label: 'Table lookup per whole block', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['query(left, right, value)', 'blocks of about sqrt(n) elements', 'how often each value occurs'],
  complexity: [{ label: 'Time', value: 'O(n) build, O(sqrt n) query' }, { label: 'Space', value: 'O(n) with hash tables per block' }],
  why: 'Occurrences in the range are the occurrences in the left ragged part, plus those in the right ragged part, plus those in the blocks between. The ragged parts hold fewer than 2B elements and the table of a block answers its share in O(1), so a query costs O(B + n / B) = O(sqrt n). The invariant is that cnt[b][x] equals the true number of x in block b.',
  naive: 'Counting inside the range for every query is O(n). Keeping a sorted position list per value and using binary search is another good solution (O(log n)); the block table shows the sqrt-decomposition alternative, which also works when elements change.',
};
