import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim().toLowerCase();
  if (!/^[a-z]+$/.test(s)) throw new Error('Use lowercase letters a-z only, e.g. abca');
  if (s.length > 12) throw new Error('Use 12 letters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  let l = 0;
  let r = n - 1;
  let deleted = -1; // index being deleted during a trial

  const cells = (hot: number[] = [], tone: CellState = 'compare', lo = -1, hi = -1, final?: CellState): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (final) state = final;
      else if (hot.includes(i)) state = tone;
      else if (i === deleted) state = 'swap';
      else if (lo >= 0 && i >= lo && i <= hi) state = 'active';
      else if (lo < 0 && (i < l || i > r)) state = 'sorted';
      else if (lo >= 0) state = 'dim';
      return { key: i, value, state };
    });
  const mainPtrs = () => [
    { id: 'l', label: 'l', index: l, tone: 'blue' as const },
    { id: 'r', label: 'r', index: r, tone: 'orange' as const },
  ];
  const vars = (i: number | string, j: number | string, skip: string) => ({ l, r, i, j, skipped: skip });

  steps.push({
    title: 'Start', tag: 'START —', desc: `can "${s}" become a palindrome after deleting at most one character? l starts at 0 and r at ${n - 1}.`,
    cells: cells(), pointers: mainPtrs(), vars: vars('—', '—', 'none'),
    logic: 'Walk two pointers inward as in a normal palindrome check. The first mismatch is the only place a deletion can help, and the culprit is either the left or the right character.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `l = 0, r = ${n - 1}`,
  });

  // palindrome test of s[i..j] with a step per pair; returns the verdict
  const trial = (i: number, j: number, which: 'left' | 'right'): boolean => {
    const lo = i;
    const hi = j;
    deleted = which === 'left' ? i - 1 : j + 1;
    steps.push({
      title: `Try deleting the ${which} character '${s[deleted]}'`, tag: 'TRY:', desc: `delete s[${deleted}]='${s[deleted]}' (the ${which} one), then check whether s[${lo}..${hi}] = "${s.slice(lo, hi + 1)}" is a palindrome.`,
      cells: cells([], 'compare', lo, hi), pointers: [{ id: 'i', label: 'i', index: i, tone: 'purple' }, { id: 'j', label: 'j', index: j, tone: 'yellow' }], vars: vars(i, j, `s[${deleted}]`),
      logic: 'With one character removed, the rest must be a perfect palindrome — no more deletions allowed.', logicTone: 'info',
      javaLines: [4, 8], pyLines: [6, 9], algoStep: 3, note: which === 'left' ? `isPal(s, ${lo}, ${hi})` : `isPal(s, ${lo}, ${hi}) after the left try failed`,
    });
    while (i < j) {
      const eq = s[i] === s[j];
      steps.push({
        title: eq ? `'${s[i]}' = '${s[j]}'` : `Mismatch: '${s[i]}' ≠ '${s[j]}'`, tag: eq ? 'PAIR:' : 'FAIL:',
        desc: eq ? `s[${i}]='${s[i]}' and s[${j}]='${s[j]}' agree, so i and j move inward.` : `s[${i}]='${s[i]}' and s[${j}]='${s[j]}' differ, so deleting the ${which} character does not work.`,
        cells: cells([i, j], eq ? 'found' : 'error', lo, hi), pointers: [{ id: 'i', label: 'i', index: i, tone: 'purple' }, { id: 'j', label: 'j', index: j, tone: 'yellow' }], vars: vars(i, j, `s[${deleted}]`),
        alert: eq ? undefined : `Second mismatch inside the ${which}-deletion trial: it would need another deletion.`,
        logic: eq ? 'Still a palindrome so far.' : 'A second mismatch would need a second deletion, which is not allowed.', logicTone: eq ? 'success' : 'warn',
        javaLines: eq ? [9] : [9, 10], pyLines: eq ? [10, 11, 12] : [10, 11], algoStep: 3, note: eq ? `'${s[i]}' == '${s[j]}' → i = ${i + 1}, j = ${j - 1}` : `'${s[i]}' != '${s[j]}' → return false`,
      });
      if (!eq) { deleted = -1; return false; }
      i++;
      j--;
    }
    return true;
  };

  while (l < r) {
    if (s[l] === s[r]) {
      steps.push({
        title: `Match: '${s[l]}' = '${s[r]}'`, tag: 'MATCH:', desc: `s[${l}]='${s[l]}' and s[${r}]='${s[r]}' agree, so l moves to ${l + 1} and r to ${r - 1} with no deletion used.`,
        cells: cells([l, r], 'found'), pointers: mainPtrs(), vars: vars('—', '—', 'none'),
        logic: 'No deletion needed for this pair.', logicTone: 'success', javaLines: [3], pyLines: [3, 4], algoStep: 1, note: `'${s[l]}' == '${s[r]}' → l = ${l + 1}, r = ${r - 1}`,
      });
      l++;
      r--;
      continue;
    }
    steps.push({
      title: `Mismatch: '${s[l]}' ≠ '${s[r]}'`, tag: 'MISMATCH:', desc: `first disagreement at l = ${l}, r = ${r}: '${s[l]}' ≠ '${s[r]}'. The one allowed deletion must be s[${l}] or s[${r}].`,
      cells: cells([l, r], 'error'), pointers: mainPtrs(), vars: vars('—', '—', 'none'),
      alert: `Mismatch at l = ${l}, r = ${r}: spend the single deletion on s[${l}] or s[${r}].`,
      logic: 'Delete either s[l] or s[r]; if either choice leaves a palindrome the answer is true.', logicTone: 'warn', javaLines: [4], pyLines: [5, 6], algoStep: 2, note: `'${s[l]}' != '${s[r]}' → try isPal(${l + 1}, ${r}) || isPal(${l}, ${r - 1})`,
    });
    const ok = trial(l + 1, r, 'left') || (deleted = -1, trial(l, r - 1, 'right'));
    const dropped = deleted;
    steps.push({
      title: ok ? 'One deletion fixes it' : 'No single deletion works', tag: '✅ Done!',
      desc: ok ? `deleting s[${dropped >= 0 ? dropped : l}]='${s[dropped >= 0 ? dropped : l]}' leaves a palindrome, so the answer is true.` : 'both deletions leave another mismatch, so more than one deletion would be needed: the answer is false.',
      cells: cells([], 'compare', -1, -1, ok ? 'found' : 'error'), pointers: [], vars: vars('—', '—', ok ? `s[${dropped >= 0 ? dropped : l}]` : 'none'),
      logic: ok ? 'At most one deletion was enough.' : 'Neither the left nor the right candidate yields a palindrome.', logicTone: ok ? 'success' : 'warn',
      javaLines: [4], pyLines: [6], algoStep: 4, note: `return ${ok}`,
      result: { title: String(ok), text: ok ? 'Palindrome after deleting one character' : 'Cannot be fixed with one deletion' },
    });
    return steps;
  }

  steps.push({
    title: 'Already a palindrome', tag: '✅ Done!', desc: `l and r met without a single mismatch, so "${s}" is already a palindrome and needs no deletion.`,
    cells: cells([], 'found', -1, -1, 'found'), pointers: [], vars: vars('—', '—', 'none'),
    logic: 'Zero deletions is within the allowance of one.', logicTone: 'success', javaLines: [6], pyLines: [7], algoStep: 4, note: 'loop ends → return true',
    result: { title: 'true', text: 'Already a palindrome' },
  });
  return steps;
}

export const validPalindromeII: ProblemDef<In> = {
  slug: '680-valid-palindrome-ii',
  id: '680', title: 'Valid Palindrome II', difficulty: 'Medium', category: 'Strings', tag: 'greedy skip',
  statement: 'Given a string, return true if it can become a palindrome by deleting at most one character.',
  constraints: '1 ≤ length ≤ 10⁵, lowercase letters (animation: up to 12 letters)',
  examples: [
    { label: '"cuppucu"', input: { s: 'cuppucu' }, output: 'true', answer: 'true (deleting the last "u" leaves "cuppuc")' },
    { label: '"aba"', input: { s: 'aba' }, output: 'true' },
    { label: '"abca"', input: { s: 'abca' }, output: 'true' },
    { label: '"abc"', input: { s: 'abc' }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. abca',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Matching pair', state: 'found' }, { label: 'Mismatch', state: 'error' }, { label: 'Range being re-checked', state: 'active' }, { label: 'Deleted candidate', state: 'swap' }, { label: 'Already checked', state: 'sorted' }],
  varLabels: ['l', 'r', 'i', 'j', 'skipped'],
  approach: {
    title: 'Two pointers, one forgiven mismatch',
    text: 'Compare from both ends. At the first mismatch, try skipping the left character and test whether the rest is a palindrome; if not, try skipping the right character instead.',
  },
  java: [
    'public boolean validPalindrome(String s) {',
    '    int l = 0, r = s.length() - 1;',
    '    while (l < r) {',
    '        if (s.charAt(l) == s.charAt(r)) { l++; r--; }',
    '        else return isPal(s, l + 1, r) || isPal(s, l, r - 1);',
    '    }',
    '    return true;',
    '}',
    'boolean isPal(String s, int i, int j) {',
    '    while (i < j)',
    '        if (s.charAt(i++) != s.charAt(j--)) return false;',
    '    return true;',
    '}',
  ],
  python: [
    'def valid_palindrome(s):',
    '    l, r = 0, len(s) - 1',
    '    while l < r:',
    '        if s[l] == s[r]:',
    '            l += 1; r -= 1',
    '        else:',
    '            return is_pal(s, l + 1, r) or is_pal(s, l, r - 1)',
    '    return True',
    '',
    'def is_pal(s, i, j):',
    '    while i < j:',
    '        if s[i] != s[j]: return False',
    '        i += 1; j -= 1',
    '    return True',
  ],
  phases: [
    { icon: '🎯', label: 'Place l and r', tone: 'blue' },
    { icon: '🟢', label: 'Match: move inward', tone: 'green' },
    { icon: '⚠️', label: 'First mismatch', tone: 'orange' },
    { icon: '🔍', label: 'Re-check without one char', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['at most one character', 'palindrome'],
  algorithm: [
    'Place l and r at the two ends of the string',
    'While s[l] == s[r], move both pointers inward',
    'At the first mismatch the one deletion must be s[l] or s[r]',
    'Test whether s[l+1..r] or s[l..r−1] is a palindrome',
    'Done: true if either test passes (or no mismatch ever occurred), otherwise false',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Everything before the first mismatch already mirrors, so the single deletion must remove s[l] or s[r] — any other deletion leaves that same pair facing each other. Each of the two candidates is checked with one linear scan, giving at most 2n comparisons overall.',
};
