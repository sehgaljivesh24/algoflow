import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim();
  if (!s || /\s/.test(s)) throw new Error('Enter one word with no spaces, e.g. babad');
  if (s.length > 10) throw new Error('Use 10 characters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  let best = 0;
  let start = 0;

  const cells = (lo: number, hi: number, tone: CellState, bad: number[] = []): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (bad.includes(i)) state = 'error';
      else if (i >= lo && i <= hi) state = tone;
      else if (best > 0 && i >= start && i < start + best) state = 'found';
      return { key: i, value, state };
    });
  const aux = () => [{ title: 'longest palindrome so far', kind: 'list' as const, items: best ? [s.slice(start, start + best)] : [] }];
  const vars = (c: string | number, l: number | string, r: number | string) => ({ center: c, l, r, best: best ? `"${s.slice(start, start + best)}"` : '—' });
  const ptrs = (l: number, r: number) => [
    { id: 'l', label: 'l', index: Math.max(0, Math.min(l, n - 1)), tone: 'blue' as const },
    { id: 'r', label: 'r', index: Math.max(0, Math.min(r, n - 1)), tone: 'orange' as const },
  ];

  steps.push({
    title: 'Start', desc: `Find the longest palindromic substring of "${s}".`,
    cells: cells(0, -1, 'active'), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Every palindrome mirrors around a centre — a letter (odd length) or the gap between two letters (even length). Try each centre and expand outward while the two ends match.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let c = 0; c < n; c++) {
    for (let ext = 0; ext < 2; ext++) {
      let l = c;
      let r = c + ext;
      const label = `${ext === 0 ? 'odd' : 'even'} @ ${c}`;
      while (true) {
        if (l < 0 || r >= n) {
          steps.push({
            title: `${label}: reached the edge`, desc: `l = ${l}, r = ${r} is outside the string, so this centre cannot grow further.`,
            cells: cells(l + 1, r - 1, 'active'), pointers: l + 1 <= r - 1 ? ptrs(l + 1, r - 1) : [], aux: aux(), vars: vars(label, l, r),
            logic: 'Stop when either end leaves the string.', logicTone: 'warn', javaLines: [5], pyLines: [5], algoStep: 2,
          });
          break;
        }
        if (s[l] !== s[r]) {
          steps.push({
            title: `${label}: '${s[l]}' ≠ '${s[r]}'`, desc: ext === 1 && l === c && r === c + 1 ? `The two middle letters differ, so there is no even palindrome here.` : `The ends differ, so the palindrome around this centre is s[${l + 1}..${r - 1}].`,
            cells: cells(l + 1, r - 1, 'active', [l, r]), pointers: ptrs(l, r), aux: aux(), vars: vars(label, l, r),
            logic: 'A mismatch ends the expansion for this centre.', logicTone: 'warn', javaLines: [5], pyLines: [5], algoStep: 2,
          });
          break;
        }
        const len = r - l + 1;
        const improved = len > best;
        if (improved) { best = len; start = l; }
        steps.push({
          title: `${label}: "${s.slice(l, r + 1)}" is a palindrome`, desc: improved ? `Length ${len} beats the previous best, so record it.` : `Length ${len} does not beat the best (${best}).`,
          cells: cells(l, r, improved ? 'found' : 'compare'), pointers: ptrs(l, r), aux: aux(), vars: vars(label, l, r),
          logic: improved ? 'New longest palindrome.' : 'A palindrome, but not longer than the best.', logicTone: improved ? 'success' : 'info',
          javaLines: improved ? [5, 6, 7] : [5, 7], pyLines: improved ? [5, 6, 7, 8] : [5, 8], algoStep: 1,
        });
        l--;
        r++;
      }
    }
  }

  const ans = s.slice(start, start + best);
  steps.push({
    title: 'Done', desc: `Longest palindromic substring: "${ans}" (length ${best}).`,
    cells: cells(0, -1, 'active'), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Every centre was expanded to its maximum, so the best one is the answer (leftmost on ties).', logicTone: 'success', javaLines: [11], pyLines: [9], algoStep: 3,
    result: { title: JSON.stringify(ans), text: `Length ${best}` },
  });
  return steps;
}

export const longestPalindromicSubstring: ProblemDef<In> = {
  slug: '5-longest-palindromic-substring',
  id: '5', title: 'Longest Palindromic Substring', difficulty: 'Medium', category: 'Strings', tag: 'expand around center',
  statement: 'Given a string, return its longest contiguous substring that reads the same forwards and backwards. If several have the same length, any one is accepted (the animation shows the leftmost).',
  constraints: '1 ≤ length ≤ 1000 (animation input: up to 10 characters)',
  examples: [
    { label: '"babad"', input: { s: 'babad' }, output: '"bab"' },
    { label: '"cbbd"', input: { s: 'cbbd' }, output: '"bb"' },
    { label: '"abaxyzzyx"', input: { s: 'abaxyzzyx' }, output: '"xyzzyx"' },
  ],
  inputPlaceholder: 'e.g. babad',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Best so far / new best', state: 'found' }, { label: 'Palindrome (not better)', state: 'compare' }, { label: 'Mismatching ends', state: 'error' }],
  varLabels: ['center', 'l', 'r', 'best'],
  approach: {
    title: 'Expand around every centre',
    text: 'A palindrome has a centre. For each letter (odd length) and each gap between letters (even length), grow l left and r right while s[l] equals s[r], remembering the longest span seen.',
  },
  java: [
    'public String longestPalindrome(String s) {',
    '    int start = 0, bestLen = 0;',
    '    for (int c = 0; c < s.length(); c++) {',
    '        for (int ext = 0; ext < 2; ext++) {          // odd, then even',
    '            int l = c, r = c + ext;',
    '            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {',
    '                if (r - l + 1 > bestLen) { bestLen = r - l + 1; start = l; }',
    '                l--; r++;',
    '            }',
    '        }',
    '    }',
    '    return s.substring(start, start + bestLen);',
    '}',
  ],
  python: [
    'def longest_palindrome(s):',
    '    start = best = 0',
    '    for c in range(len(s)):',
    '        for r0 in (c, c + 1):          # odd, then even',
    '            l, r = c, r0',
    '            while l >= 0 and r < len(s) and s[l] == s[r]:',
    '                if r - l + 1 > best:',
    '                    best, start = r - l + 1, l',
    '                l -= 1; r += 1',
    '    return s[start:start + best]',
  ],
  algorithm: [
    'Pick a centre: a letter, or the gap between two letters',
    'Expand outward while the characters at l and r are equal',
    'Whenever the span is longer than the best, remember its start and length',
    'After trying all 2n − 1 centres, return the longest span',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Every palindrome is symmetric about exactly one centre, so trying all 2n − 1 centres sees every palindrome. If the ends at l and r differ, no wider span around that centre can be a palindrome, so expansion can stop. Each centre costs O(n) at worst: O(n²) total with no extra memory (unlike a DP table).',
};
