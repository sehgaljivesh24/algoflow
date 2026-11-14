import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim();
  if (!s) throw new Error('Enter some text, e.g. hello');
  if (/\s/.test(s)) throw new Error('Use a single word with no spaces, e.g. hello');
  if (s.length > 12) throw new Error('Use 12 characters or fewer');
  return { s };
}

/** One step per event: start, then per round CHECK (l < r?) -> SWAP -> MOVE, a last CHECK that fails, and Done. */
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
    title: 'Start', tag: 'START —', desc: `Reverse "${s}" in place with O(1) extra memory: l starts at index 0, r at index ${n - 1}.`,
    cells: cells(0, n - 1, false), pointers: n > 1 ? ptrs(0, n - 1) : [], vars: vars(0, n - 1),
    logic: 'Put one pointer at each end. Swapping the pair they point at puts both characters in their final mirrored positions.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `l = 0, r = ${n - 1}`,
  });

  let l = 0;
  let r = n - 1;
  while (l < r) {
    steps.push({
      title: `Check l < r`, tag: 'CHECK:',
      desc: `l=${l} < r=${r} is true, so s[${l}]='${arr[l].c}' and s[${r}]='${arr[r].c}' must trade places.`,
      cells: cells(l, r, false), pointers: ptrs(l, r), vars: vars(l, r),
      logic: 'While the pointers have not met, the pair they mark is still in the wrong spots.', logicTone: 'info',
      javaLines: [2], pyLines: [2], algoStep: 1, note: `${l} < ${r} → true`,
    });
    const a = arr[l].c;
    const b = arr[r].c;
    [arr[l], arr[r]] = [arr[r], arr[l]];
    swaps++;
    steps.push({
      title: `Swap s[${l}] and s[${r}]`, tag: 'SWAP:',
      desc: `exchange '${a}' and '${b}': index ${l} now holds '${arr[l].c}', index ${r} holds '${arr[r].c}' (swap #${swaps}).`,
      cells: cells(l, r, true), pointers: ptrs(l, r), vars: vars(l, r),
      logic: 'Both characters are now final. Move the pointers inward and repeat.', logicTone: 'success',
      javaLines: [3, 4, 5], pyLines: [3], algoStep: 2, note: `s[${l}] ↔ s[${r}]: '${a}' ↔ '${b}'`,
    });
    l++;
    r--;
    steps.push({
      title: 'Move pointers inward', tag: 'MOVE:',
      desc: l < r ? `l → ${l}, r → ${r}: the untouched middle "${arr.slice(l, r + 1).map((x) => x.c).join('')}" is what remains.` : `l → ${l}, r → ${r}: the pointers ${l === r ? 'met' : 'crossed'}, nothing is left to swap.`,
      cells: cells(l, r, false), pointers: ptrs(l, r), vars: vars(l, r),
      logic: 'The untouched middle shrinks by two characters each round.', logicTone: 'info', javaLines: [6, 7], pyLines: [4, 5], algoStep: 3,
      note: `l = ${l}, r = ${r}`,
    });
  }

  steps.push({
    title: 'Check l < r: false', tag: 'CHECK:',
    desc: `l=${l} < r=${r} is false, so the loop ends${l === r ? ` and the middle character '${arr[l].c}' stays where it is` : ''}.`,
    cells: cells(l, r, false), pointers: ptrs(l, r), vars: vars(l, r),
    logic: 'When l ≥ r every pair has been swapped; an odd-length string leaves its centre untouched.', logicTone: 'success',
    javaLines: [2, 8], pyLines: [2], algoStep: 1, note: `${l} < ${r} → false, stop`,
  });

  const out = arr.map((x) => x.c).join('');
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `After ${swaps} swap${swaps === 1 ? '' : 's'} the array reads "${out}", the mirror image of "${s}".`,
    cells: cells(0, n - 1, false, true), pointers: [], vars: vars('—', '—'),
    logic: 'Every position i now holds the character that began at n−1−i.', logicTone: 'success', javaLines: [9], pyLines: [5], algoStep: 4,
    note: `"${s}" → "${out}"`,
    result: { title: JSON.stringify(out), text: `"${s}" reversed is "${out}"` },
  });
  return steps;
}

export const reverseString: ProblemDef<In> = {
  slug: '344-reverse-string',
  id: '344', title: 'Reverse String', difficulty: 'Easy', category: 'Strings', tag: 'two pointers',
  statement: 'Reverse an array of characters in place. You must modify the input array itself and use only O(1) extra memory.',
  emphasis: ['in place', 'O(1) extra memory'],
  constraints: '1 ≤ length ≤ 10⁵ (animation input: one word of up to 12 characters)',
  examples: [
    { label: '"hello"', input: { s: 'hello' }, output: '"olleh"', answer: '"olleh" (2 swaps, the middle "l" stays)' },
    { label: '"Hannah"', input: { s: 'Hannah' }, output: '"hannaH"' },
    { label: '"abcdef"', input: { s: 'abcdef' }, output: '"fedcba"' },
  ],
  inputPlaceholder: 'e.g. hello',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pair about to swap', state: 'compare' }, { label: 'Just swapped', state: 'swap' }, { label: 'Already in place', state: 'sorted' }, { label: 'Finished', state: 'found' }],
  varLabels: ['l', 'r', 'swaps'],
  phases: [
    { icon: '🎯', label: 'Place l and r', tone: 'blue' },
    { icon: '🔍', label: 'Check l < r', tone: 'cyan' },
    { icon: '🔄', label: 'Swap pair', tone: 'orange' },
    { icon: '➡️', label: 'Move inward', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
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
    'Check l < r; if false, stop',
    'Swap s[l] and s[r]',
    'Move l right and r left, then check again',
    'Done: the array is reversed',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Position i in the reversed string must hold the character from position n−1−i. Each swap fixes two positions at once, and the pairs (0, n−1), (1, n−2), … are disjoint, so after ⌊n/2⌋ swaps every position is correct.',
};
