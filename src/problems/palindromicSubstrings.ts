import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim();
  if (!s || /\s/.test(s)) throw new Error('Enter one word with no spaces, e.g. aaa');
  if (s.length > 8) throw new Error('Use 8 characters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const found: string[] = [];
  let count = 0;

  const cells = (lo: number, hi: number, tone: CellState, bad: number[] = []): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (bad.includes(i)) state = 'error';
      else if (i >= lo && i <= hi) state = tone;
      return { key: i, value, state };
    });
  const aux = (hl?: number) => [{ title: 'palindromes counted', kind: 'list' as const, items: found.map((w, i) => `${i + 1}. ${w}`), highlight: hl }];
  const vars = (c: string | number, l: number | string, r: number | string) => ({ center: c, l, r, count });
  const ptrs = (l: number, r: number) => [
    { id: 'l', label: 'l', index: Math.max(0, Math.min(l, n - 1)), tone: 'blue' as const },
    { id: 'r', label: 'r', index: Math.max(0, Math.min(r, n - 1)), tone: 'orange' as const },
  ];

  steps.push({
    title: 'Start', desc: `Count every palindromic substring of "${s}" (substrings at different positions count separately).`,
    cells: cells(0, -1, 'active'), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Each palindrome has one centre. Expanding from a centre, every successful step outward is one more palindrome, so we add 1 per step instead of testing every substring.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, tag: 'START —', note: `${2 * n - 1} centres: ${n} letters + ${n - 1} gaps, count = 0`,
  });

  for (let c = 0; c < n; c++) {
    for (let ext = 0; ext < 2; ext++) {
      let l = c;
      let r = c + ext;
      const label = `${ext === 0 ? 'odd' : 'even'} @ ${c}`;
      while (true) {
        if (l < 0 || r >= n) {
          steps.push({
            title: `${label}: reached the edge`, desc: `l = ${l}, r = ${r}: ${l < 0 ? 'l has run off the left end' : 'r has run off the right end'} of the string; this centre is finished.`,
            cells: cells(0, -1, 'active'), pointers: [], aux: aux(), vars: vars(label, l, r),
            logic: 'Stop when either end leaves the string.', logicTone: 'warn', javaLines: [5], pyLines: [5], algoStep: 2,
            tag: 'EDGE —', note: `l = ${l}, r = ${r} out of range → next centre`,
          });
          break;
        }
        if (s[l] !== s[r]) {
          steps.push({
            title: `${label}: '${s[l]}' ≠ '${s[r]}'`, desc: 'The ends differ, so no wider palindrome exists around this centre.',
            cells: cells(0, -1, 'active', [l, r]), pointers: ptrs(l, r), aux: aux(), vars: vars(label, l, r),
            logic: 'A mismatch ends this centre; move on to the next one.', logicTone: 'warn', javaLines: [5], pyLines: [5], algoStep: 2,
            tag: 'MISMATCH —', note: `s[${l}] = '${s[l]}' ≠ s[${r}] = '${s[r]}' → stop`, alert: `'${s[l]}' ≠ '${s[r]}': no wider palindrome exists around this centre.`,
          });
          break;
        }
        count++;
        found.push(s.slice(l, r + 1));
        steps.push({
          title: `${label}: "${s.slice(l, r + 1)}" is a palindrome`, desc: `Count it. Total so far: ${count}.`,
          cells: cells(l, r, 'found'), pointers: ptrs(l, r), aux: aux(found.length - 1), vars: vars(label, l, r),
          logic: 'The ends matched and the inside was already a palindrome, so this wider span is one too.', logicTone: 'success',
          javaLines: [5, 6, 7], pyLines: [5, 6, 7], algoStep: 1,
          tag: 'COUNT —', note: `s[${l}] = s[${r}] = '${s[l]}' → count = ${count}`,
        });
        l--;
        r++;
      }
    }
  }

  steps.push({
    title: 'Done', desc: `There ${verb(count, 'is', 'are')} ${plural(count, 'palindromic substring')}.`,
    cells: cells(0, -1, 'active'), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'All centres were expanded as far as they go.', logicTone: 'success', javaLines: [11], pyLines: [8], algoStep: 3,
    tag: '✅ Done!', note: `return count = ${count}`,
    result: { title: String(count), text: `${count} palindromic substring${count === 1 ? '' : 's'}` },
  });
  return steps;
}

export const palindromicSubstrings: ProblemDef<In> = {
  slug: '647-palindromic-substrings',
  id: '647', title: 'Palindromic Substrings', difficulty: 'Medium', category: 'Strings', tag: 'expand around center',
  statement: 'Count how many contiguous substrings of a string are palindromes. Substrings with different start or end positions are counted separately even if their text is identical.',
  constraints: '1 ≤ length ≤ 1000 (animation input: up to 8 characters)',
  examples: [
    { label: '"abc"', input: { s: 'abc' }, output: '3' },
    { label: '"aaa"', input: { s: 'aaa' }, output: '6' },
    { label: '"abba"', input: { s: 'abba' }, output: '6' },
  ],
  inputPlaceholder: 'e.g. aaa',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Palindrome counted', state: 'found' }, { label: 'Mismatching ends', state: 'error' }],
  varLabels: ['center', 'l', 'r', 'count'],
  emphasis: ['palindromes', 'counted separately'],
  phases: [
    { icon: '🎯', label: 'Pick a centre', tone: 'blue' },
    { icon: '↔️', label: 'Widen while ends match', tone: 'green' },
    { icon: '🛑', label: 'Mismatch or edge: stop', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Every successful expansion is one palindrome',
    text: 'For each of the 2n − 1 centres (a letter or a gap), start with l and r at the centre and widen while s[l] equals s[r], adding 1 to the count at every step that still matches.',
  },
  java: [
    'public int countSubstrings(String s) {',
    '    int count = 0;',
    '    for (int c = 0; c < s.length(); c++) {',
    '        for (int ext = 0; ext < 2; ext++) {          // odd, then even',
    '            int l = c, r = c + ext;',
    '            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {',
    '                count++;',
    '                l--; r++;',
    '            }',
    '        }',
    '    }',
    '    return count;',
    '}',
  ],
  python: [
    'def count_substrings(s):',
    '    count = 0',
    '    for c in range(len(s)):',
    '        for r0 in (c, c + 1):          # odd, then even',
    '            l, r = c, r0',
    '            while l >= 0 and r < len(s) and s[l] == s[r]:',
    '                count += 1',
    '                l -= 1; r += 1',
    '    return count',
  ],
  algorithm: [
    'Choose a centre: one letter (odd) or the gap between two letters (even)',
    'While s[l] == s[r], count one palindrome and widen the span',
    'Stop at a mismatch or when l or r leaves the string',
    'Repeat for all centres and return the total count',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A span s[l..r] is a palindrome iff s[l] = s[r] and the span inside it is a palindrome. Expanding from the centre guarantees the inside is already known to be a palindrome, so each matching step certifies exactly one new palindrome, and each palindrome is found from its unique centre — nothing is counted twice or missed.',
};
