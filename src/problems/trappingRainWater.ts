import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { height: number[] }

function parse(raw: string): In {
  const height = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!height.length || height.some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Enter non-negative whole numbers, e.g. 0 1 0 2 1 0 1 3 2 1 2 1');
  if (height.length > 12) throw new Error('Use 12 bars or fewer');
  return { height };
}

function build({ height }: In): Step[] {
  const n = height.length;
  const water: (number | null)[] = Array(n).fill(null);
  const steps: Step[] = [];
  let l = 0;
  let r = n - 1;
  let leftMax = 0;
  let rightMax = 0;
  let total = 0;

  const cells = (hot: number): Cell[] =>
    height.map((value, i) => {
      let state: CellState | undefined;
      if (i === hot) state = 'swap';
      else if (i === l || i === r) state = 'active';
      else if (water[i] !== null) state = (water[i] as number) > 0 ? 'found' : 'sorted';
      return { key: i, value, state };
    });
  const ptrs = () => [{ id: 'l', label: 'L', index: l, tone: 'blue' as const }, { id: 'r', label: 'R', index: r, tone: 'orange' as const }];
  const aux = (hl?: number) => [{ title: `water above each bar (total ${total})`, kind: 'list' as const, items: water.map((w) => (w === null ? '?' : String(w))), highlight: hl }];
  const vars = () => ({ l, r, leftMax, rightMax, water: total });

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `L = 0, R = ${n - 1}, leftMax = 0, rightMax = 0. Water over a bar is capped by the shorter of the two best walls.`,
    cells: cells(-1), pointers: ptrs(), aux: aux(), vars: vars(),
    logic: 'water[i] = min(tallest on the left, tallest on the right) − height[i]. Two pointers let us know which side is the limiting one without storing both maximum arrays.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0, note: `l = 0, r = ${n - 1}, water = 0`,
  });

  while (l < r) {
    const goLeft = height[l] < height[r];
    steps.push({
      title: goLeft ? `height[l] = ${height[l]} < height[r] = ${height[r]}` : `height[r] = ${height[r]} ≤ height[l] = ${height[l]}`,
      tag: 'COMPARE:',
      desc: goLeft
        ? `${height[l]} < ${height[r]}: the right wall is taller, so the left side limits the water and bar ${l} can be settled.`
        : `${height[r]} ≤ ${height[l]}: the left wall is at least as tall, so the right side limits the water and bar ${r} can be settled.`,
      cells: cells(-1), pointers: ptrs(), aux: aux(), vars: vars(),
      logic: 'The shorter wall decides the water level: the other wall is already tall enough, whatever lies between the pointers.', logicTone: 'info',
      javaLines: goLeft ? [4] : [4, 8], pyLines: goLeft ? [4] : [4, 8], algoStep: 1,
      note: goLeft ? `height[${l}] = ${height[l]} < height[${r}] = ${height[r]} → settle the left` : `height[${r}] = ${height[r]} ≤ height[${l}] = ${height[l]} → settle the right`,
    });
    let at: number;
    let added: number;
    let oldMax: number;
    if (goLeft) {
      oldMax = leftMax;
      leftMax = Math.max(leftMax, height[l]);
      added = leftMax - height[l];
      at = l;
    } else {
      oldMax = rightMax;
      rightMax = Math.max(rightMax, height[r]);
      added = rightMax - height[r];
      at = r;
    }
    const wall = goLeft ? leftMax : rightMax;
    const newWall = wall !== oldMax;
    const before = total;
    water[at] = added;
    total += added;
    steps.push({
      title: added > 0 ? `Bar ${at} holds ${added} water` : `Bar ${at} holds no water`,
      tag: added > 0 ? 'FILL —' : 'NEW WALL —',
      desc: added > 0
        ? `${goLeft ? 'leftMax' : 'rightMax'} = ${wall}, so bar ${at} (height ${height[at]}) holds ${wall} − ${height[at]} = ${added}; total ${before} → ${total}.`
        : `bar ${at} (height ${height[at]}) is the tallest on its side so far${newWall ? `: ${goLeft ? 'leftMax' : 'rightMax'} rises from ${oldMax} to ${wall}` : ''}; no water, total stays ${total}.`,
      cells: cells(at), pointers: ptrs(), aux: aux(at), vars: vars(),
      logic: added > 0 ? 'The bar is lower than the best wall on its side, so the gap fills with water up to that wall.' : 'This bar is itself the tallest on its side so far: it becomes the new wall.', logicTone: added > 0 ? 'success' : 'warn',
      javaLines: goLeft ? [5, 6, 7] : [9, 10, 11], pyLines: goLeft ? [5, 6, 7] : [9, 10, 11], algoStep: 2,
      note: added > 0 ? `water += ${wall} − ${height[at]} = ${added} → ${total}` : `${goLeft ? 'leftMax' : 'rightMax'} = max(${oldMax}, ${height[at]}) = ${wall}`,
    });
    if (goLeft) l++;
    else r--;
  }

  steps.push({
    title: 'Pointers met', tag: '✅ Done!',
    desc: `L and R met: every bar is settled. Total trapped water = ${total} (${water.filter((w) => (w ?? 0) > 0).length} bars hold water).`,
    cells: height.map((value, i) => ({ key: i, value, state: (water[i] ?? 0) > 0 ? ('found' as const) : ('dim' as const) })), pointers: [], aux: aux(), vars: vars(),
    logic: `Green bars hold water; the answer is ${total}.`, logicTone: 'success', javaLines: [14], pyLines: [12], algoStep: 3,
    note: `return water = ${total}`,
    result: { title: String(total), text: 'Units of trapped rain water' },
  });
  return steps;
}

export const trappingRainWater: ProblemDef<In> = {
  slug: '42-trapping-rain-water',
  id: '42', title: 'Trapping Rain Water', difficulty: 'Hard', category: 'Arrays', tag: 'two pointers',
  statement: 'Given n non-negative integers representing bar heights (each bar is 1 unit wide), compute how much rain water is trapped between the bars.',
  constraints: '1 ≤ n ≤ 2·10⁴ · 0 ≤ height[i] ≤ 10⁵ (animation input is limited to 12 bars)',
  examples: [
    { label: '[0,1,0,2,1,0,1,3,2,1,2,1]', input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] }, output: '6' },
    { label: '[4,2,0,3,2,5]', input: { height: [4, 2, 0, 3, 2, 5] }, output: '9' },
    { label: '[1,2,3]', input: { height: [1, 2, 3] }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 0 1 0 2 1 0 1 3 2 1 2 1',
  parseInput: parse, buildSteps: build, viz: 'bars',
  legend: [{ label: 'Pointer bars', state: 'active' }, { label: 'Bar just settled', state: 'swap' }, { label: 'Holds water', state: 'found' }, { label: 'No water', state: 'sorted' }],
  varLabels: ['l', 'r', 'leftMax', 'rightMax', 'water'],
  emphasis: ['trapped', 'bar heights'],
  phases: [
    { icon: '🧱', label: 'Setup: both ends', tone: 'blue' },
    { icon: '⚖️', label: 'Compare walls', tone: 'cyan' },
    { icon: '💧', label: 'Settle shorter side', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Settle the shorter side first',
    text: 'Keep the tallest wall seen so far from each end. Whichever end currently has the shorter bar is limited by its own side\'s wall, so its water is exactly (wall − bar). Settle that bar and move that pointer inward.',
  },
  java: [
    'public int trap(int[] height) {',
    '    int l = 0, r = height.length - 1;',
    '    int leftMax = 0, rightMax = 0, water = 0;',
    '    while (l < r) {',
    '        if (height[l] < height[r]) {',
    '            leftMax = Math.max(leftMax, height[l]);',
    '            water += leftMax - height[l];',
    '            l++;',
    '        } else {',
    '            rightMax = Math.max(rightMax, height[r]);',
    '            water += rightMax - height[r];',
    '            r--;',
    '        }',
    '    }',
    '    return water;',
    '}',
  ],
  python: [
    'def trap(height):',
    '    l, r = 0, len(height) - 1',
    '    left_max = right_max = water = 0',
    '    while l < r:',
    '        if height[l] < height[r]:',
    '            left_max = max(left_max, height[l])',
    '            water += left_max - height[l]',
    '            l += 1',
    '        else:',
    '            right_max = max(right_max, height[r])',
    '            water += right_max - height[r]',
    '            r -= 1',
    '    return water',
  ],
  algorithm: [
    'Start with l at the left end, r at the right end, both wall maxima at 0',
    'Compare height[l] and height[r] to find the shorter side',
    'On that side update the wall maximum and add (wall − bar) to the total',
    'Move that pointer inward; stop when the pointers meet and return the total',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Suppose height[l] < height[r]. Some bar at r or beyond (at least height[r]) already exists on the right of l, so the right wall is at least as tall as anything l might need. Water at l therefore depends only on leftMax, and it equals leftMax − height[l]. The mirror argument handles r. Each step settles exactly one bar, so the loop is linear.',
};
