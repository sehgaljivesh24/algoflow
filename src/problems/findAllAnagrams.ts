import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string; p: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: s ; p — e.g. cbaebabacd ; abc');
  const s = parts[0].trim().toLowerCase();
  const p = parts[1].trim().toLowerCase();
  if (!/^[a-z]+$/.test(s) || !/^[a-z]+$/.test(p)) throw new Error('Use lowercase letters a-z only (both strings non-empty)');
  if (s.length > 12) throw new Error('Use 12 letters or fewer for s');
  if (p.length > 5) throw new Error('Use 5 letters or fewer for p');
  return { s, p };
}

const code = (c: string) => c.charCodeAt(0) - 97;

function build({ s, p }: In): Step[] {
  const steps: Step[] = [];
  const k = p.length;
  const n = s.length;
  const need = new Array(26).fill(0);
  const win = new Array(26).fill(0);
  const res: number[] = [];
  let matches = 0;
  const letters = (a: number[]) => a.map((v, i) => (v > 0 ? `${String.fromCharCode(97 + i)} → ${v}` : '')).filter(Boolean);
  const aux = (hl?: number) => [
    { title: `need (letters of "${p}")`, kind: 'map' as const, items: letters(need) },
    { title: 'window counts', kind: 'map' as const, items: letters(win) },
    { title: 'start indexes found', kind: 'list' as const, items: res.map(String), highlight: hl },
  ];
  const cells = (lo: number, hi: number, enter = -1, leave = -1): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (i === enter) state = 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = matches === 26 ? 'found' : 'active';
      else if (res.some((st) => i >= st && i < st + k)) state = 'sorted';
      return { key: i, value, state };
    });
  const ptrs = (lo: number, hi: number) => [
    { id: 'l', label: 'l', index: lo, tone: 'blue' as const },
    { id: 'r', label: 'r', index: hi, tone: 'orange' as const },
  ];
  const vars = (lo: number | string, hi: number | string) => ({ l: lo, r: hi, k, matches: `${matches}/26` });
  const recount = () => { matches = 0; for (let c = 0; c < 26; c++) if (need[c] === win[c]) matches++; };
  const finish = () =>
    steps.push({
      title: 'Done', desc: res.length ? `Anagrams of "${p}" start at index${res.length > 1 ? 'es' : ''} ${res.join(', ')}.` : `No substring of "${s}" is an anagram of "${p}".`,
      cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
      logic: res.length ? 'Highlighted cells are the windows that matched.' : 'matches never reached 26.', logicTone: res.length ? 'success' : 'warn',
      javaLines: [20], pyLines: [18], algoStep: 3,
      result: { title: JSON.stringify(res), text: res.length ? `${res.length} anagram start${res.length > 1 ? 's' : ''}` : 'Empty list' },
    });

  steps.push({
    title: 'Start', desc: `Find every start index in "${s}" where a rearrangement of "${p}" begins. Slide a window of length ${k}.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'A window is an anagram of p exactly when all 26 letter counts agree. "matches" counts the letters whose counts agree, so a slide only needs O(1) updates.', logicTone: 'info',
    javaLines: [0, 1, 2, 3, 4], pyLines: [0, 1, 2, 3], algoStep: 0,
  });

  if (k > n) {
    steps.push({
      title: 'Pattern is longer than the text', desc: `"${p}" has ${k} letters but "${s}" has only ${n}, so nothing can match.`,
      cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
      logic: 'An anagram needs exactly |p| characters, which the text cannot supply.', logicTone: 'warn', javaLines: [2, 3], pyLines: [1, 2], algoStep: 0,
      result: { title: '[]', text: 'Empty list' },
    });
    return steps;
  }

  for (let i = 0; i < k; i++) { need[code(p[i])]++; win[code(s[i])]++; }
  recount();
  if (matches === 26) res.push(0);
  steps.push({
    title: 'Fill the first window', desc: `Window [0..${k - 1}] = "${s.slice(0, k)}". ${matches} of 26 letters agree${matches === 26 ? ' — an anagram starts at index 0!' : '.'}`,
    cells: cells(0, k - 1), pointers: ptrs(0, k - 1), aux: aux(matches === 26 ? 0 : undefined), vars: vars(0, k - 1),
    logic: 'Letters absent from both strings (0 = 0) already count as matches.', logicTone: matches === 26 ? 'success' : 'info',
    javaLines: [5, 6, 7, 8, 9, 10, 11], pyLines: [4, 5, 6, 7, 8], algoStep: 1,
  });

  for (let i = k; i < n; i++) {
    win[code(s[i])]++;
    win[code(s[i - k])]--;
    recount();
    if (matches === 26) res.push(i - k + 1);
    steps.push({
      title: `Slide: add '${s[i]}', drop '${s[i - k]}'`, desc: `Window [${i - k + 1}..${i}] = "${s.slice(i - k + 1, i + 1)}". ${matches} of 26 letters agree${matches === 26 ? ` — an anagram starts at index ${i - k + 1}!` : '.'}`,
      cells: cells(i - k + 1, i, i, i - k), pointers: ptrs(i - k + 1, i), aux: aux(matches === 26 ? res.length - 1 : undefined), vars: vars(i - k + 1, i),
      logic: matches === 26 ? 'All counts agree, so record the start index and keep sliding (overlapping anagrams count too).' : 'Only two counts changed, so matches was fixed up in O(1).', logicTone: matches === 26 ? 'success' : 'warn',
      javaLines: matches === 26 ? [13, 14, 15, 16, 17, 18] : [13, 14, 15, 16, 17], pyLines: matches === 26 ? [10, 11, 12, 13, 14, 15, 16, 17] : [10, 11, 12, 13, 14, 15, 16], algoStep: 2,
    });
  }
  finish();
  return steps;
}

export const findAllAnagrams: ProblemDef<In> = {
  slug: '438-find-all-anagrams-in-a-string',
  id: '438', title: 'Find All Anagrams in a String', difficulty: 'Medium', category: 'Strings', tag: 'fixed window + matches',
  statement: 'Given strings s and p, return the start indexes of every substring of s that is an anagram of p, in any order. Overlapping matches all count.',
  constraints: '1 ≤ |s|, |p| ≤ 3·10⁴, lowercase letters (animation: |s| ≤ 12, |p| ≤ 5)',
  examples: [
    { label: '"cbaebabacd", "abc"', input: { s: 'cbaebabacd', p: 'abc' }, output: '[0,6]' },
    { label: '"abab", "ab"', input: { s: 'abab', p: 'ab' }, output: '[0,1,2]' },
    { label: '"aaaa", "ab"', input: { s: 'aaaa', p: 'ab' }, output: '[]' },
  ],
  inputPlaceholder: 'e.g. cbaebabacd ; abc',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Window', state: 'active' }, { label: 'Letter entering', state: 'compare' }, { label: 'Letter leaving', state: 'swap' }, { label: 'Anagram window', state: 'found' }, { label: 'Earlier match', state: 'sorted' }],
  varLabels: ['l', 'r', 'k', 'matches'],
  approach: {
    title: 'Fixed window with a match counter',
    text: 'Slide a window of length |p| over s, updating the window letter counts by one addition and one removal. Count how many of the 26 letters agree with p; when all do, record the window start.',
  },
  java: [
    'public List<Integer> findAnagrams(String s, String p) {',
    '    List<Integer> res = new ArrayList<>();',
    '    int k = p.length();',
    '    if (k > s.length()) return res;',
    '    int[] need = new int[26], win = new int[26];',
    '    for (int i = 0; i < k; i++) {',
    '        need[p.charAt(i) - \'a\']++;',
    '        win[s.charAt(i) - \'a\']++;',
    '    }',
    '    int matches = 0;',
    '    for (int c = 0; c < 26; c++) if (need[c] == win[c]) matches++;',
    '    if (matches == 26) res.add(0);',
    '    for (int i = k; i < s.length(); i++) {',
    '        int a = s.charAt(i) - \'a\', b = s.charAt(i - k) - \'a\';',
    '        win[a]++;',
    '        if (win[a] == need[a]) matches++; else if (win[a] == need[a] + 1) matches--;',
    '        win[b]--;',
    '        if (win[b] == need[b]) matches++; else if (win[b] == need[b] - 1) matches--;',
    '        if (matches == 26) res.add(i - k + 1);',
    '    }',
    '    return res;',
    '}',
  ],
  python: [
    'def find_anagrams(s, p):',
    '    res, k = [], len(p)',
    '    if k > len(s): return res',
    '    need, win = [0] * 26, [0] * 26',
    '    for i in range(k):',
    '        need[ord(p[i]) - 97] += 1',
    '        win[ord(s[i]) - 97] += 1',
    '    matches = sum(need[c] == win[c] for c in range(26))',
    '    if matches == 26: res.append(0)',
    '    for i in range(k, len(s)):',
    '        a, b = ord(s[i]) - 97, ord(s[i - k]) - 97',
    '        win[a] += 1',
    '        if win[a] == need[a]: matches += 1',
    '        elif win[a] == need[a] + 1: matches -= 1',
    '        win[b] -= 1',
    '        if win[b] == need[b]: matches += 1',
    '        elif win[b] == need[b] - 1: matches -= 1',
    '        if matches == 26: res.append(i - k + 1)',
    '    return res',
  ],
  algorithm: [
    'Count the letters of p (need) and of the first window of s (win)',
    'Compute matches = number of letters with need == win; record index 0 if it is 26',
    'Slide: add s[i], remove s[i − k], adjust matches; record the start if matches is 26',
    'After the last slide, return the list of start indexes',
  ],
  complexity: [{ label: 'Time', value: 'O(26 + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Every window has the same length as p, so it is an anagram iff all 26 letter counts equal p\'s. A slide changes two counts; each change can move a letter into or out of the "matched" group, which we update in O(1). That removes the O(26) comparison per window and makes the scan linear.',
};
