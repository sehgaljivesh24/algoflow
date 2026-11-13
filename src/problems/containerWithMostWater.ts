import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { height: number[] }

function parse(raw: string): In {
  const height = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (height.length < 2 || height.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error('Enter at least two non-negative whole numbers, e.g. 1 8 6 2 5 4 8 3 7');
  }
  if (height.length > 14) throw new Error('Use 14 numbers or fewer');
  return { height };
}

function build({ height }: In): Step[] {
  const n = height.length;
  const steps: Step[] = [];
  let l = 0;
  let r = n - 1;
  let best = 0;
  let bestL = 0;
  let bestR = 0;

  const cells = (l: number, r: number, bl?: number, br?: number, gone = -1): Cell[] =>
    height.map((value, i) => {
      let state: CellState | undefined;
      if (i < l || i > r) state = 'dim';
      if (i === l || i === r) state = 'active';
      if (bl !== undefined && (i === bl || i === br) && state !== 'active') state = 'found';
      if (i === gone) state = 'swap';
      return { key: i, value, state };
    });
  const ptrs = (l: number, r: number) => [
    { id: 'l', label: 'L', index: l, tone: 'blue' as const },
    { id: 'r', label: 'R', index: r, tone: 'orange' as const },
  ];
  const vars = (area: number | string) => ({ l, r, area, best });

  steps.push({
    title: 'Start with the widest container', tag: 'SETUP —',
    desc: `L = 0 and R = ${n - 1}: the two outermost lines (heights ${height[0]} and ${height[n - 1]}), width ${n - 1}.`,
    cells: cells(l, r), pointers: ptrs(l, r), vars: vars('—'),
    logic: 'The widest container is the first candidate. From here we can only get a taller container by giving up width.',
    logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `l = 0, r = ${n - 1}, best = 0`,
  });

  while (l < r) {
    const hl = height[l];
    const hr = height[r];
    const area = Math.min(hl, hr) * (r - l);
    const improved = area > best;
    const prevBest = best;
    if (improved) {
      best = area;
      bestL = l;
      bestR = r;
    }
    steps.push({
      title: `Area = ${area}`, tag: 'MEASURE —',
      desc: `min(${hl}, ${hr}) × (${r} − ${l}) = ${Math.min(hl, hr)} × ${r - l} = ${area}${improved ? ` 🏆 NEW BEST (was ${prevBest})` : `, best stays ${best}`}`,
      cells: cells(l, r, bestL, bestR), pointers: ptrs(l, r), vars: vars(area),
      logic: improved ? `New best: ${best}.` : `Not better than the current best (${best}).`,
      logicTone: improved ? 'success' : 'info', javaLines: [3, 4], pyLines: [3, 4], algoStep: 1,
      note: `area = ${Math.min(hl, hr)} × ${r - l} = ${area}, best = max(${prevBest}, ${area}) = ${best}`,
    });
    const moveLeft = hl < hr;
    const dropped = moveLeft ? l : r;
    steps.push({
      title: moveLeft ? 'Move the left pointer' : 'Move the right pointer', tag: moveLeft ? 'MOVE L →' : '← MOVE R',
      desc: moveLeft
        ? `height[L] = ${hl} is the shorter side (${hr} on the right), so L moves from ${l} to ${l + 1}.`
        : `height[R] = ${hr} is the shorter or equal side (${hl} on the left), so R moves from ${r} to ${r - 1}.`,
      cells: cells(l, r, bestL, bestR, dropped), pointers: ptrs(l, r), vars: vars(area),
      alert: `Line ${dropped} (height ${height[dropped]}) caps the water; with a narrower width it can never beat ${area}. Discard it.`,
      logic: 'The shorter line limits the water. Moving the taller one can never help, because width shrinks and the height is still capped by the shorter line.',
      logicTone: 'warn', javaLines: moveLeft ? [5] : [6], pyLines: moveLeft ? [5, 6] : [7, 8], algoStep: 2,
      note: moveLeft ? `${hl} < ${hr} → l++ (l = ${l + 1})` : `${hl} ≥ ${hr} → r-- (r = ${r - 1})`,
    });
    if (moveLeft) l++;
    else r--;
  }

  steps.push({
    title: 'Pointers met', tag: '✅ Done!',
    desc: `L and R met, so every line is ruled out. Most water: ${best} using lines ${bestL} and ${bestR} (heights ${height[bestL]} and ${height[bestR]}).`,
    cells: cells(bestL, bestR, bestL, bestR).map((c, i) => ({ ...c, state: i === bestL || i === bestR ? ('found' as const) : ('dim' as const) })),
    pointers: [{ id: 'l', label: 'L', index: bestL, tone: 'blue' as const }, { id: 'r', label: 'R', index: bestR, tone: 'orange' as const }], vars: vars('—'),
    logic: `Best container uses lines at index ${bestL} and ${bestR}.`, logicTone: 'success', javaLines: [8], pyLines: [9], algoStep: 3,
    note: `return ${best}`,
    result: { title: String(best), text: `Lines at indexes ${bestL} and ${bestR}` },
  });
  return steps;
}

export const containerWithMostWater: ProblemDef<In> = {
  slug: '11-container-with-most-water',
  id: '11', title: 'Container With Most Water', difficulty: 'Medium', category: 'Arrays', tag: 'two pointers',
  statement:
    'Given n vertical lines where line i has height height[i], pick two lines that, together with the x-axis, form a container holding the most water. Return that maximum amount.',
  constraints: '2 ≤ n ≤ 10⁵ · 0 ≤ height[i] ≤ 10⁴ (animation input is limited to 14 numbers)',
  examples: [
    { label: '[1,8,6,2,5,4,8,3,7]', input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] }, output: '49' },
    { label: '[1,1]', input: { height: [1, 1] }, output: '1' },
    { label: '[4,3,2,1,4]', input: { height: [4, 3, 2, 1, 4] }, output: '16' },
  ],
  inputPlaceholder: 'e.g. 1 8 6 2 5 4 8 3 7',
  parseInput: parse,
  buildSteps: build,
  viz: 'bars',
  emphasis: ['vertical lines', 'most water', 'container'],
  legend: [{ label: 'Current pair', state: 'active' }, { label: 'Line just discarded', state: 'swap' }, { label: 'Best so far', state: 'found' }, { label: 'Ruled out', state: 'dim' }],
  varLabels: ['l', 'r', 'area', 'best'],
  phases: [
    { icon: '📐', label: 'Setup: widest pair', tone: 'blue' },
    { icon: '💧', label: 'Measure area', tone: 'cyan' },
    { icon: '↔️', label: 'Move shorter line', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Squeeze inward from the shorter side',
    text: 'Start with the widest pair. The water level is limited by the shorter line, so move that pointer inward, hoping to find a taller line. Track the best area on the way.',
  },
  java: [
    'public int maxArea(int[] height) {',
    '    int l = 0, r = height.length - 1, best = 0;',
    '    while (l < r) {',
    '        int area = Math.min(height[l], height[r]) * (r - l);',
    '        best = Math.max(best, area);',
    '        if (height[l] < height[r]) l++;',
    '        else r--;',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def max_area(height):',
    '    l, r, best = 0, len(height) - 1, 0',
    '    while l < r:',
    '        area = min(height[l], height[r]) * (r - l)',
    '        best = max(best, area)',
    '        if height[l] < height[r]:',
    '            l += 1',
    '        else:',
    '            r -= 1',
    '    return best',
  ],
  algorithm: [
    'Start with l = 0, r = n − 1',
    'Compute area = min(height[l], height[r]) × (r − l); keep the maximum',
    'Move the pointer at the shorter line inward',
    'Stop when l meets r and return the best area',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Any container using the shorter line with a narrower width is no better than the one we just measured, so that line can be discarded safely. Each step discards one line, giving n − 1 steps.',
};
