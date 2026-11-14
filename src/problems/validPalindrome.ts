import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.replace(/^\s+|\s+$/g, '');
  if (!s) throw new Error('Enter some text, e.g. Madam, I\'m Adam');
  if (s.length > 15) throw new Error('Use 15 characters or fewer');
  if (/[^\x20-\x7e]/.test(s)) throw new Error('Use plain keyboard characters only');
  return { s };
}

const alnum = (c: string) => /[a-z0-9]/i.test(c);
const show = (c: string) => (c === ' ' ? '␣' : c);

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  let l = 0;
  let r = n - 1;

  const cells = (hot: number[] = [], tone: CellState = 'compare', skipped: Set<number> = new Set(), finalState?: CellState): Cell[] =>
    [...s].map((c, i) => {
      let state: CellState | undefined;
      if (finalState) state = finalState;
      else if (hot.includes(i)) state = tone;
      else if (skipped.has(i)) state = 'dim';
      else if (i < l || i > r) state = 'sorted';
      return { key: i, value: show(c), state };
    });
  const skipped = new Set<number>();
  const ptrs = () => [
    { id: 'l', label: 'l', index: l, tone: 'blue' as const },
    { id: 'r', label: 'r', index: r, tone: 'orange' as const },
  ];
  const vars = () => ({ l, r, 'left char': l < n ? s[l].toLowerCase() : '—', 'right char': r >= 0 ? s[r].toLowerCase() : '—' });

  steps.push({
    title: 'Start', desc: 'Ignoring case and non-alphanumeric characters, does the text read the same both ways?',
    cells: cells(), pointers: ptrs(), vars: vars(),
    logic: 'Instead of building a cleaned copy, walk two pointers inward and skip anything that is not a letter or digit as we go.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, tag: 'READY —', note: `l = 0, r = ${n - 1}`,
  });

  while (l < r) {
    while (l < r && !alnum(s[l])) {
      skipped.add(l);
      steps.push({
        title: `Skip '${show(s[l])}' on the left`, tag: 'SKIP LEFT:', desc: `s[${l}]='${show(s[l])}' is not a letter or digit, so move l right to ${l + 1}`,
        cells: cells([l], 'dim', skipped), pointers: ptrs(), vars: vars(),
        alert: `'${show(s[l])}' is not alphanumeric: it takes no part in the comparison, so it is skipped.`,
        logic: 'Punctuation and spaces do not take part in the comparison.', logicTone: 'warn', javaLines: [3], pyLines: [3], algoStep: 1,
        note: `isLetterOrDigit('${show(s[l])}') is false: l = ${l + 1}`,
      });
      l++;
    }
    while (l < r && !alnum(s[r])) {
      skipped.add(r);
      steps.push({
        title: `Skip '${show(s[r])}' on the right`, tag: 'SKIP RIGHT:', desc: `s[${r}]='${show(s[r])}' is not a letter or digit, so move r left to ${r - 1}`,
        cells: cells([r], 'dim', skipped), pointers: ptrs(), vars: vars(),
        alert: `'${show(s[r])}' is not alphanumeric: it takes no part in the comparison, so it is skipped.`,
        logic: 'Same rule on the right side.', logicTone: 'warn', javaLines: [4], pyLines: [4], algoStep: 1,
        note: `isLetterOrDigit('${show(s[r])}') is false: r = ${r - 1}`,
      });
      r--;
    }
    const a = s[l].toLowerCase();
    const b = s[r].toLowerCase();
    if (a !== b) {
      steps.push({
        title: `Mismatch: '${a}' ≠ '${b}'`, tag: 'MISMATCH:', desc: `s[${l}]='${a}' and s[${r}]='${b}' differ after ignoring case, so this is not a palindrome`,
        cells: cells([l, r], 'error', skipped), pointers: ptrs(), vars: vars(),
        alert: `'${a}' ≠ '${b}': one mismatching mirrored pair is enough to say false.`,
        logic: 'One mismatching mirrored pair is enough to rule out a palindrome.', logicTone: 'warn', javaLines: [5, 6], pyLines: [5, 6], algoStep: 3,
        note: `'${a}' != '${b}' → return false`,
      });
      steps.push({
        title: 'Done', tag: '✅ Done!', desc: `the answer is false: '${a}' at index ${l} does not match '${b}' at index ${r}`,
        cells: cells([l, r], 'error', skipped), pointers: ptrs(), vars: vars(),
        logic: 'The scan stops at the first mismatch; nothing after it can change the answer.', logicTone: 'warn', javaLines: [6], pyLines: [6], algoStep: 4,
        note: 'return false',
        result: { title: 'false', text: `'${a}' at ${l} does not match '${b}' at ${r}` },
      });
      return steps;
    }
    steps.push({
      title: `Match: '${a}' = '${b}'`, tag: 'MATCH:',
      desc: l === r ? `l and r met on s[${l}]='${a}', which is its own mirror` : `s[${l}]='${a}' and s[${r}]='${b}' agree (ignoring case), so move both inward`,
      cells: cells([l, r], 'found', skipped), pointers: ptrs(), vars: vars(),
      logic: 'This mirrored pair is fine; shrink the range.', logicTone: 'success', javaLines: [5, 7, 8], pyLines: [5, 7, 8], algoStep: 2,
      note: `'${a}' == '${b}': l = ${l + 1}, r = ${r - 1}`,
    });
    l++;
    r--;
  }

  l = Math.min(l, n - 1);
  r = Math.max(r, 0);
  steps.push({
    title: 'Pointers met', tag: '✅ Done!', desc: 'the pointers crossed and every mirrored pair of alphanumeric characters matched, so the answer is true',
    cells: cells([], 'found', skipped, 'found'), pointers: [], vars: vars(),
    logic: 'No mismatch was found, so the cleaned text is a palindrome.', logicTone: 'success', javaLines: [10], pyLines: [9], algoStep: 4,
    note: 'l >= r → return true',
    result: { title: 'true', text: 'It is a palindrome' },
  });
  return steps;
}

export const validPalindrome: ProblemDef<In> = {
  slug: '125-valid-palindrome',
  id: '125', title: 'Valid Palindrome', difficulty: 'Easy', category: 'Strings', tag: 'two pointers',
  statement: 'After lowercasing and removing every character that is not a letter or digit, decide whether the string reads the same forwards and backwards.',
  constraints: '1 ≤ length ≤ 2·10⁵ (animation input: up to 15 characters; spaces are shown as ␣)',
  examples: [
    { label: '"Madam, I\'m Adam"', input: { s: 'Madam, I\'m Adam' }, output: 'true' },
    { label: '"race a car"', input: { s: 'race a car' }, output: 'false' },
    { label: '"A Santa at NASA"', input: { s: 'A Santa at NASA' }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. Madam, I\'m Adam',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Matching pair', state: 'found' }, { label: 'Skipped character', state: 'dim' }, { label: 'Mismatch', state: 'error' }, { label: 'Already checked', state: 'sorted' }],
  varLabels: ['l', 'r', 'left char', 'right char'],
  emphasis: ['lowercasing', 'letter or digit', 'reads the same forwards and backwards'],
  phases: [
    { icon: '🎯', label: 'SETUP (l = 0, r = n−1)', tone: 'blue' },
    { icon: '⏭', label: 'SKIP non-alphanumeric', tone: 'cyan' },
    { icon: '✔', label: 'MATCH → move inward', tone: 'green' },
    { icon: '❌', label: 'MISMATCH → false', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Two pointers that skip junk',
    text: 'Start at both ends. Move each pointer inward past anything that is not a letter or digit, compare the two characters ignoring case, and repeat until the pointers meet.',
  },
  java: [
    'public boolean isPalindrome(String s) {',
    '    int l = 0, r = s.length() - 1;',
    '    while (l < r) {',
    '        while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;',
    '        while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;',
    '        if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r)))',
    '            return false;',
    '        l++;',
    '        r--;',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def is_palindrome(s):',
    '    l, r = 0, len(s) - 1',
    '    while l < r:',
    '        while l < r and not s[l].isalnum(): l += 1',
    '        while l < r and not s[r].isalnum(): r -= 1',
    '        if s[l].lower() != s[r].lower():',
    '            return False',
    '        l += 1',
    '        r -= 1',
    '    return True',
  ],
  algorithm: [
    'Put l at the start and r at the end',
    'Advance l and retreat r past non-alphanumeric characters',
    'Compare s[l] and s[r] ignoring case; on equality move both inward',
    'On the first mismatch return false',
    'If the pointers meet, return true',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A string is a palindrome iff its i-th character equals its (n−1−i)-th for every i. Skipping non-alphanumerics on the fly pairs up exactly the characters of the cleaned string, without ever building it, and each index is visited by at most one pointer: O(n) time and O(1) space.',
};
