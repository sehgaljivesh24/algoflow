import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim();
  if (!s) throw new Error('Enter some text, e.g. hello');
  if (/\s/.test(s)) throw new Error('Use a single word with no spaces, e.g. hello');
  if (s.length > 12) throw new Error('Use 12 characters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  // each character keeps its original index as a key so swaps slide visually
  const arr = [...s].map((c, id) => ({ id, c }));
  const n = arr.length;
  const cells = (l: number, r: number, swapped: boolean, done = false): Cell[] =>
    arr.map(({ id, c }, i) => {
      let state: CellState | undefined;
      if (done) state = 'found';
      else if (i === l || i === r) state = swapped ? 'swap' : 'compare';
      else if (i < l || i > r) state = 'sorted';
      return { key: id, value: c, state };
    });
  const ptrs = (l: number, r: number) => [
    { id: 'l', label: 'l', index: l, tone: 'blue' as const },
    { id: 'r', label: 'r', index: r, tone: 'orange' as const },
  ];
  const vars = (l: number | string, r: number | string) => ({ l, r, 'swaps': swaps });
  let swaps = 0;

  steps.push({
    title: 'Start', desc: `Reverse "${s}" in place using O(1) extra memory.`,
    cells: cells(0, n - 1, false), pointers: n > 1 ? ptrs(0, n - 1) : [], vars: vars(0, n - 1),
    logic: 'Put one pointer at each end. Swapping the pair they point at puts both characters in their final mirrored positions.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  let l = 0;
  let r = n - 1;
  while (l < r) {
    [arr[l], arr[r]] = [arr[r], arr[l]];
    swaps++;
    steps.push({
      title: `Swap s[${l}] and s[${r}]`, desc: `Exchange '${arr[r].c}' and '${arr[l].c}': position ${l} now holds '${arr[l].c}', position ${r} holds '${arr[r].c}'.`,
      cells: cells(l, r, true), pointers: ptrs(l, r), vars: vars(l, r),
      logic: 'Both characters are now final. Move the pointers inward and repeat.', logicTone: 'success',
      javaLines: [3, 4, 5], pyLines: [3], algoStep: 2,
    });
    l++;
    r--;
    if (l < r) {
      steps.push({
        title: 'Move pointers inward', desc: `l = ${l}, r = ${r}.`,
        cells: cells(l, r, false), pointers: ptrs(l, r), vars: vars(l, r),
        logic: 'The untouched middle shrinks by two characters each round.', logicTone: 'info', javaLines: [6, 7], pyLines: [4, 5], algoStep: 1,
      });
    }
  }

  const out = arr.map((x) => x.c).join('');
  steps.push({
    title: 'Done', desc: l === r ? `The pointers met at index ${l}, the middle character, which stays put. Result: "${out}".` : `The pointers crossed. Result: "${out}".`,
    cells: cells(0, n - 1, false, true), pointers: [], vars: vars('—', '—'),
    logic: 'When l ≥ r every pair has been swapped; an odd-length string leaves its centre untouched.', logicTone: 'success', javaLines: [9], pyLines: [5], algoStep: 3,
    result: { title: JSON.stringify(out), text: `"${s}" reversed is "${out}"` },
  });
  return steps;
}

export const reverseString: ProblemDef<In> = {
  slug: '344-reverse-string',
  id: '344', title: 'Reverse String', difficulty: 'Easy', category: 'Strings', tag: 'two pointers',
  statement: 'Reverse an array of characters in place. You must modify the input array itself and use only O(1) extra memory.',
  constraints: '1 ≤ length ≤ 10⁵ (animation input: one word of up to 12 characters)',
  examples: [
    { label: '"hello"', input: { s: 'hello' }, output: '"olleh"' },
    { label: '"Hannah"', input: { s: 'Hannah' }, output: '"hannaH"' },
    { label: '"abcdef"', input: { s: 'abcdef' }, output: '"fedcba"' },
  ],
  inputPlaceholder: 'e.g. hello',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pair about to swap', state: 'compare' }, { label: 'Just swapped', state: 'swap' }, { label: 'Already in place', state: 'sorted' }, { label: 'Finished', state: 'found' }],
  varLabels: ['l', 'r', 'swaps'],
  approach: {
    title: 'Swap from both ends toward the middle',
    text: 'Keep l at the start and r at the end. Swap s[l] and s[r], then move l right and r left. Stop when the pointers meet or cross.',
  },
  java: [
    'public void reverseString(char[] s) {',
    '    int l = 0, r = s.length - 1;',
    '    while (l < r) {',
    '        char tmp = s[l];',
    '        s[l] = s[r];',
    '        s[r] = tmp;',
    '        l++;',
    '        r--;',
    '    }',
    '}',
  ],
  python: [
    'def reverse_string(s):',
    '    l, r = 0, len(s) - 1',
    '    while l < r:',
    '        s[l], s[r] = s[r], s[l]',
    '        l += 1',
    '        r -= 1',
  ],
  algorithm: [
    'Place l at index 0 and r at the last index',
    'While l < r, continue',
    'Swap s[l] and s[r]',
    'Move l right and r left; stop when they meet',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Position i in the reversed string must hold the character from position n−1−i. Each swap fixes two positions at once, and the pairs (0, n−1), (1, n−2), … are disjoint, so after ⌊n/2⌋ swaps every position is correct.',
};
