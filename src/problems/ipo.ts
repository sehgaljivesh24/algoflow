import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { Heap, parseInts } from './listheapKit.ts';
import { recorder } from './stepKit.ts';
import { intIn, leaf, semis } from './p4Kit.ts';

interface In { k: number; w: number; profits: number[]; capital: number[] }

const FORMAT = 'k ; w ; profits ; capital — e.g. 2 ; 0 ; 1 2 3 ; 0 1 1';

function parse(raw: string): In {
  const p = semis(raw, 4, FORMAT);
  const profits = parseInts(p[2], { max: 7, lo: 0, hi: 30, hint: '1 2 3' });
  const capital = parseInts(p[3], { max: 7, lo: 0, hi: 30, hint: '0 1 1' });
  if (profits.length !== capital.length) throw new Error('profits and capital must have the same number of projects');
  return { k: intIn(p[0], 1, 7, 'k'), w: intIn(p[1], 0, 30, 'w'), profits, capital };
}

interface Item { p: number; i: number }

function build({ k, w: w0, profits, capital }: In): Step[] {
  const n = profits.length;
  const order = profits.map((_, i) => i).sort((a, b) => capital[a] - capital[b] || a - b); // sorted by capital
  const heap = new Heap<Item>('max', (x, y) => x.p > y.p || (x.p === y.p && x.i < y.i), (x) => x.p);
  const taken = new Set<number>();
  const noop = () => {};
  let w = w0;
  let ptr = 0;
  let round = 0;
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];

  const cells = (): Cell[] =>
    order.map((pi, pos): Cell => ({
      key: pos, value: `p${profits[pi]} c${capital[pi]}`,
      state: taken.has(pi) ? 'found' : pos < ptr ? 'active' : pos === ptr && capital[pi] > w ? 'dim' : undefined,
    }));
  const say = recorder(steps, () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        { kind: 'array' as const, cells: cells(), pointers: ptr < n ? [{ id: 'ptr', label: 'next locked', index: ptr, tone: 'orange' as const }] : [] },
        leaf(heap.scene(hot)),
      ],
    },
    aux: [heap.aux('affordable projects: max-heap of profits')],
    vars: { round: Math.min(round, k), capital: w, 'in heap': heap.size, 'next locked': ptr < n ? `c${capital[order[ptr]]}` : '—' },
  }));

  say({
    title: 'Start', desc: `${plural(n, 'project')} (p = profit, c = capital needed), ${plural(k, 'pick')} allowed, starting capital ${w}. They are laid out sorted by the capital they need.`,
    logic: 'A project is only allowed once your capital covers its requirement, and you always want the biggest profit among the allowed ones.', java: [4], py: [1], algo: 0,
    tag: 'INIT', note: `order by capital: ${order.map((pi) => `c${capital[pi]}`).join(' ')}; w = ${w}, k = ${k}`,
  });

  for (round = 1; round <= k; round++) {
    hot = {};
    const before = ptr;
    while (ptr < n && capital[order[ptr]] <= w) {
      heap.push({ p: profits[order[ptr]], i: order[ptr] }, noop, true);
      ptr++;
    }
    hot = {};
    const added = ptr - before;
    say({
      title: `Pick ${round}: unlock affordable projects`,
      desc: added ? `Capital is ${w}, so ${added} more project${added === 1 ? ' fits' : 's fit'} (everything with c ≤ ${w}); their profits are pushed into the max-heap.` : `Capital is ${w}; no new project becomes affordable, the heap keeps what it has.`,
      logic: 'Because projects are sorted by capital, a single moving pointer finds every newly affordable one.', tone: added ? 'success' : 'info', java: [8], py: [5, 6, 7], algo: 1,
      tag: `ROUND ${round} · UNLOCK`, note: `while capital[order[p]] <= ${w}: +${added} in heap, heap = ${heap.size}`,
    });
    if (heap.size === 0) {
      say({
        title: 'Nothing affordable', desc: `The heap is empty and the next project needs ${ptr < n ? capital[order[ptr]] : '—'} > ${w}. No further project can be started.`,
        logic: 'Capital only grows by finishing projects, so with none available it can never grow again: stop early.', tone: 'warn', java: [9], py: [8, 9], algo: 1,
        tag: 'STOP', note: `best.isEmpty(): next needs ${ptr < n ? capital[order[ptr]] : '—'} > w = ${w}: break`,
        alert: `No project is affordable: capital ${w} is below every locked requirement. Stopping early.`,
      });
      break;
    }
    const best = heap.peek();
    hot = { 0: 'found' };
    say({
      title: `Best affordable profit: ${best.p}`, desc: `The heap root is profit ${best.p}, the largest among everything you can afford.`,
      logic: 'Greedy choice: taking the biggest profit now also gives the most capital for unlocking later projects.', java: [10], py: [10], algo: 2,
      tag: 'BEST', note: `best.peek() = ${best.p} of ${heap.size} affordable`,
    });
    heap.pop(noop, true);
    taken.add(best.i);
    w += best.p;
    hot = {};
    say({
      title: `Take it: capital ${w - best.p} → ${w}`, desc: `Finish the project and add its profit. Capital is now ${w}.`,
      logic: 'A larger capital may unlock more projects in the next round.', tone: 'success', java: [10], py: [10], algo: 2,
      tag: 'TAKE', note: `w += best.poll(): ${w - best.p} + ${best.p} = ${w}`,
    });
  }

  hot = {};
  say({
    title: 'Done', desc: `Final capital: ${w} (started with ${w0}).`,
    logic: 'No other choice of at most k projects can end with more capital, because every pick was the maximum available.', tone: 'success', java: [12], py: [11], algo: 3,
    result: { title: String(w), text: 'Maximized capital after at most k projects' },
    tag: '✅ Done!', note: `return w = ${w}`,
  });
  return steps;
}

export const ipo: ProblemDef<In> = {
  slug: '502-ipo',
  id: '502', title: 'IPO', difficulty: 'Hard', category: 'Heap', tag: 'two heaps',
  statement: 'You start with capital w and may complete at most k distinct projects. Project i needs capital[i] to start and adds profits[i] to your capital when finished. Choose projects to maximise your final capital.',
  constraints: '1 ≤ k ≤ 10⁵, 0 ≤ w ≤ 10⁹, n ≤ 10⁵ (animation input: ≤ 7 projects, values 0..30; write k ; w ; profits ; capital)',
  examples: [
    { label: 'k=2, w=0, p=1 2 3, c=0 1 1', input: { k: 2, w: 0, profits: [1, 2, 3], capital: [0, 1, 1] }, output: '4', answer: '4 (take profit 1, then profit 3: capital 0 → 1 → 4)' },
    { label: 'k=3, w=0, p=1 2 3, c=0 1 2', input: { k: 3, w: 0, profits: [1, 2, 3], capital: [0, 1, 2] }, output: '6' },
    { label: 'k=2, w=1, p=5 4 9 2, c=3 2 6 0', input: { k: 2, w: 1, profits: [5, 4, 9, 2], capital: [3, 2, 6, 0] }, output: '8' },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Unlocked (in the max-heap)', state: 'active' }, { label: 'Completed', state: 'found' }, { label: 'Next locked project', state: 'dim' }, { label: 'Heap root (best choice)', state: 'found' }],
  emphasis: ['at most k distinct projects', 'maximise your final capital'],
  phases: [
    { icon: '🗂️', label: 'Sort by capital', tone: 'blue' },
    { icon: '🔓', label: 'Unlock affordable', tone: 'cyan' },
    { icon: '💰', label: 'Take best profit', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['round', 'capital', 'in heap', 'next locked'],
  approach: {
    title: 'One sorted list feeds one max-heap',
    text: 'Sort the projects by the capital they need. Before each of the k picks, move every project you can now afford from the sorted list into a max-heap of profits. Take the heap root, add it to your capital, and repeat. Two structures cooperate: the sorted list holds what is still locked, the heap holds what is available.',
  },
  java: [
    'public int findMaximizedCapital(int k, int w, int[] profits, int[] capital) {',
    '    int n = profits.length;',
    '    Integer[] order = new Integer[n];',
    '    for (int i = 0; i < n; i++) order[i] = i;',
    '    Arrays.sort(order, (a, b) -> capital[a] - capital[b]);',
    '    PriorityQueue<Integer> best = new PriorityQueue<>(Collections.reverseOrder());',
    '    int p = 0;',
    '    for (int round = 0; round < k; round++) {',
    '        while (p < n && capital[order[p]] <= w) best.add(profits[order[p++]]);',
    '        if (best.isEmpty()) break;',
    '        w += best.poll();',
    '    }',
    '    return w;',
    '}',
  ],
  python: [
    'def find_maximized_capital(k, w, profits, capital):',
    '    order = sorted(range(len(profits)), key=lambda i: capital[i])',
    '    best = []                                  # max-heap via negated profits',
    '    p = 0',
    '    for _ in range(k):',
    '        while p < len(order) and capital[order[p]] <= w:',
    '            heapq.heappush(best, -profits[order[p]])',
    '            p += 1',
    '        if not best:',
    '            break',
    '        w -= heapq.heappop(best)',
    '    return w',
  ],
  algorithm: [
    'Sort the projects by the capital they require',
    'Push every project the current capital can afford into a max-heap of profits',
    'Pop the largest profit and add it to the capital',
    'Repeat k times, or stop early when nothing is affordable',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n + k log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Capital never decreases, so the set of affordable projects only grows; a single pointer over the capital-sorted list therefore enumerates it exactly once. Among the affordable projects, the one with the largest profit is never a worse pick: an exchange argument shows that any plan taking a smaller profit first can swap in the larger one (it is available now) and finish with at least as much capital and at least as many options.',
};
