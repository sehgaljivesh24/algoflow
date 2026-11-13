import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { heights: number[] }

function parse(raw: string): In {
  const heights = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!heights.length || heights.some((n) => !Number.isInteger(n) || n < 0 || n > 99)) throw new Error('Enter whole numbers from 0 to 99, e.g. 2 1 5 6 2 3');
  if (heights.length > 12) throw new Error('Use 12 bars or fewer');
  return { heights };
}

function build({ heights: h }: In): Step[] {
  const n = h.length;
  const stack: number[] = [];
  const steps: Step[] = [];
  let best = 0;
  let bestL = -1;
  let bestR = -2;

  // popped: bar just removed; span: the rectangle (inclusive indexes) it can form; showBest: final highlight
  const cells = (cur: number, popped = -1, span: [number, number] | null = null, showBest = false): Cell[] =>
    h.map((value, i) => {
      let state: CellState | undefined;
      if (showBest && i >= bestL && i <= bestR) state = 'found';
      else if (i === popped) state = 'found';
      else if (span && i >= span[0] && i <= span[1]) state = 'compare';
      else if (i === cur) state = 'active';
      else if (stack.includes(i)) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number, area?: { items: string[]; hl?: number }) => [
    { title: 'stack (index:height, heights never decrease upward)', kind: 'stack' as const, items: stack.map((i) => `${i}:${h[i]}`), highlight: hl },
    ...(area ? [{ title: 'area computation', kind: 'list' as const, items: area.items, highlight: area.hl }] : []),
  ];
  const vars = (i: number | string) => ({ i, 'h[i]': typeof i === 'number' ? (i < n ? h[i] : 0) : '—', 'stack size': stack.length, 'best area': best });
  const ptr = (i: number) => (i < n ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : []);

  steps.push({
    title: 'Start', tag: 'INIT —', desc: 'Find the biggest rectangle inside the bars. Each candidate is limited by its shortest bar, so a stack of rising bars finds both walls.',
    note: 'stack = [], best = 0',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'For each bar we want to know how far it can stretch left and right before meeting a shorter bar. A stack of increasing bars finds both boundaries.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1], algoStep: 0,
  });

  for (let i = 0; i <= n; i++) {
    const cur = i === n ? 0 : h[i];
    const top = stack.length ? stack[stack.length - 1] : -1;
    steps.push({
      title: i === n ? 'Sentinel: height 0 past the end' : `Read bar ${i} (height ${cur})`, tag: i === n ? 'SENTINEL —' : 'SCAN —',
      desc: i === n ? 'A virtual bar of height 0 follows the last bar. It is shorter than everything, so it will pop every bar still on the stack.'
        : top >= 0 && cur < h[top] ? `Bar ${i} (h=${cur}) is shorter than the top bar ${top} (h=${h[top]}): that bar cannot stretch further right.`
          : top >= 0 ? `Bar ${i} (h=${cur}) is not shorter than the top bar ${top} (h=${h[top]}): nothing to finish yet.` : `Bar ${i} (h=${cur}) arrives and the stack is empty: nothing to finish yet.`,
      note: top >= 0 ? `cur = ${cur} ${cur < h[top] ? '<' : '≥'} h[${top}] = ${h[top]} → ${cur < h[top] ? 'pop' : 'push'}` : `cur = ${cur}, stack empty → push`,
      cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(i),
      logic: 'A shorter bar is the right wall for every taller bar sitting on the stack.', logicTone: 'info', javaLines: [3, 4], pyLines: [2, 3], algoStep: 1,
    });
    while (stack.length && cur < h[stack[stack.length - 1]]) {
      const j = stack.pop()!;
      const left = stack.length ? stack[stack.length - 1] : -1;
      const width = i - left - 1;
      const area = h[j] * width;
      const improved = area > best;
      const prev = best;
      if (improved) { best = area; bestL = left + 1; bestR = i - 1; }
      steps.push({
        title: `Pop bar ${j}: area ${h[j]} × ${width} = ${area}`, tag: improved ? '🏆 NEW MAX —' : 'POP + AREA —',
        desc: `Pop bar ${j} (h=${h[j]}): left wall ${left === -1 ? 'is the edge' : `bar ${left}`}, right wall ${i === n ? 'is the sentinel' : `bar ${i}`}. Width ${i} − ${left} − 1 = ${width}, area ${h[j]} × ${width} = ${area}${improved ? `. New max (was ${prev})!` : `. Max stays ${best}.`}`,
        note: `area = ${h[j]} × (${i} − ${left} − 1) = ${area}${improved ? ' → new max' : ` ≤ ${best}`}`,
        cells: cells(i, j, [left + 1, i - 1]), pointers: ptr(i), vars: vars(i),
        aux: aux(undefined, { items: [`height = ${h[j]}`, `width = ${i} − ${left} − 1 = ${width}`, `area = ${area}`, improved ? `new max (was ${prev})` : `max stays ${best}`], hl: improved ? 3 : undefined }),
        logic: improved ? `New best area: ${best}.` : `Area ${area} does not beat the best (${best}).`, logicTone: improved ? 'success' : 'info',
        javaLines: [5, 6, 7, 8], pyLines: [4, 5, 6, 7], algoStep: improved ? 3 : 2,
      });
    }
    if (i < n) {
      stack.push(i);
      steps.push({
        title: `Push bar ${i}`, tag: 'PUSH —', desc: `Push bar ${i} (h=${cur}); it waits for a shorter bar on its right. Stack: [${stack.map((k) => `${k}:${h[k]}`).join(', ')}].`,
        note: `stack.push(${i}) → size ${stack.length}`,
        cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
        logic: 'Everything below it on the stack is not taller, so the stack keeps increasing from bottom to top.', logicTone: 'info', javaLines: [10], pyLines: [8], algoStep: 4,
      });
    }
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: best > 0 ? `Largest rectangle: bars ${bestL}..${bestR} (height ${Math.min(...h.slice(bestL, bestR + 1))}, width ${bestR - bestL + 1}), area ${best}.` : 'All bars have height 0, so the best area is 0.',
    note: `return best = ${best}`,
    cells: cells(-1, -1, null, true), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Largest area: ${best}`, logicTone: 'success', javaLines: [12], pyLines: [9], algoStep: 5, result: { title: String(best), text: 'Largest rectangle area' },
  });
  return steps;
}

export const largestRectangleInHistogram: ProblemDef<In> = {
  slug: '84-largest-rectangle-in-histogram',
  id: '84', title: 'Largest Rectangle in Histogram', difficulty: 'Hard', category: 'Stack', tag: 'monotonic stack',
  statement: 'Given the heights of bars in a histogram (each of width 1), return the area of the largest rectangle that fits entirely inside the histogram.',
  constraints: '1 ≤ n ≤ 10⁵, 0 ≤ height ≤ 10⁴ (animation input is limited to 12 bars of height 0-99)',
  examples: [
    { label: '2 1 5 6 2 3', input: { heights: [2, 1, 5, 6, 2, 3] }, output: '10' },
    { label: '2 4', input: { heights: [2, 4] }, output: '4' },
    { label: '6 2 5 4 5 1 6', input: { heights: [6, 2, 5, 4, 5, 1, 6] }, output: '12' },
  ],
  inputPlaceholder: 'bar heights, e.g. 2 1 5 6 2 3',
  parseInput: parse, buildSteps: build, viz: 'bars',
  legend: [{ label: 'Bar being read', state: 'active' }, { label: 'On the stack', state: 'sorted' }, { label: 'Rectangle extent being measured', state: 'compare' }, { label: 'Popped bar / best rectangle', state: 'found' }],
  varLabels: ['i', 'h[i]', 'stack size', 'best area'],
  emphasis: ['histogram', 'largest rectangle', 'area'],
  phases: [
    { icon: '🚀', label: 'Init stack', tone: 'blue' },
    { icon: '🔍', label: 'Scan next bar', tone: 'cyan' },
    { icon: '📐', label: 'Pop + area', tone: 'orange' },
    { icon: '🏆', label: 'New max!', tone: 'gold' },
    { icon: '📥', label: 'Push', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A stack of increasing bars',
    text: 'Keep a stack of bar indexes whose heights never decrease. When a shorter bar arrives, it is the right wall of every taller bar on the stack: pop each one, the bar now below it is its left wall, and the rectangle with that bar\'s height spans everything between the two walls. A zero-height sentinel at the end flushes the stack.',
  },
  java: [
    'public int largestRectangleArea(int[] h) {',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    int best = 0, n = h.length;',
    '    for (int i = 0; i <= n; i++) {',
    '        int cur = (i == n) ? 0 : h[i];',
    '        while (!stack.isEmpty() && cur < h[stack.peek()]) {',
    '            int height = h[stack.pop()];',
    '            int left = stack.isEmpty() ? -1 : stack.peek();',
    '            best = Math.max(best, height * (i - left - 1));',
    '        }',
    '        stack.push(i);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def largest_rectangle_area(h):',
    '    stack, best, n = [], 0, len(h)',
    '    for i in range(n + 1):',
    '        cur = 0 if i == n else h[i]',
    '        while stack and cur < h[stack[-1]]:',
    '            height = h[stack.pop()]',
    '            left = stack[-1] if stack else -1',
    '            best = max(best, height * (i - left - 1))',
    '        stack.append(i)',
    '    return best',
  ],
  algorithm: [
    'Keep a stack of bar indexes with non-decreasing heights',
    'Read the next bar (a zero-height sentinel after the last one)',
    'While it is shorter than the top bar: pop, find the left wall below it, and measure height × width',
    'If that area beats the best so far, record it as the new maximum',
    'Push the current index',
    'After the sentinel the best area seen is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The best rectangle is limited by some bar of minimum height, and it extends left and right until a shorter bar. The stack keeps heights non-decreasing, so the bar below a popped one is a wall on its left no taller than it, and the bar that triggers the pop is the first strictly shorter bar on its right. With equal heights, the earliest bar of the run measures the full width and the later ones only measure narrower copies, so the maximum is never missed. Each bar is pushed and popped once, so the work is linear.',
};
