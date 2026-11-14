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
const ch = (i: number) => String.fromCharCode(97 + i);

/**
 * One step per event: count p, build the first window letter by letter, check matches, then per slide ADD / DROP (and MATCH
 * when all 26 counts agree), and Done.
 */
function build({ s, p }: In): Step[] {
  const steps: Step[] = [];
  const k = p.length;
  const n = s.length;
  const need = new Array(26).fill(0);
  const win = new Array(26).fill(0);
  const res: number[] = [];
  let matches = 0;
  let matchesKnown = false;
  const letters = (a: number[]) => a.map((v, i) => (v > 0 ? `${ch(i)} → ${v}` : '')).filter(Boolean);
  const aux = (hl?: number) => {
    const winIdx = win.map((v, i) => (v > 0 || need[i] > 0 ? i : -1)).filter((i) => i >= 0 && win[i] > 0);
    return [
      { title: `need (letters of "${p}")`, kind: 'map' as const, items: letters(need) },
      { title: 'window counts', kind: 'map' as const, items: winIdx.map((i) => `${ch(i)} → ${win[i]}`), bad: winIdx.flatMap((i, j) => (win[i] !== need[i] ? [j] : [])) },
      { title: 'start indexes found', kind: 'list' as const, items: res.map(String), highlight: hl },
    ];
  };
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
  const vars = (lo: number | string, hi: number | string) => ({ l: lo, r: hi, k, matches: matchesKnown ? `${matches}/26` : '—' });
  const recount = () => { matches = 0; for (let c = 0; c < 26; c++) if (need[c] === win[c]) matches++; matchesKnown = true; };
  const finish = () =>
    steps.push({
      title: 'Done', tag: '✅ Done!', desc: res.length ? `anagrams of "${p}" start at index${res.length > 1 ? 'es' : ''} ${res.join(', ')}: ${res.map((st) => `"${s.slice(st, st + k)}"`).join(', ')}.` : `no substring of "${s}" is an anagram of "${p}", so the answer is an empty list.`,
      cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
      logic: res.length ? 'Highlighted cells are the windows that matched.' : 'matches never reached 26.', logicTone: res.length ? 'success' : 'warn',
      javaLines: [20], pyLines: [18], algoStep: 5, note: `return [${res.join(', ')}]`,
      result: { title: JSON.stringify(res), text: res.length ? `${res.length} anagram start${res.length > 1 ? 's' : ''}` : 'Empty list' },
    });

  steps.push({
    title: 'Start', tag: 'START —', desc: `find every start index in "${s}" where a rearrangement of "${p}" begins; slide a window of length ${k}.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'A window is an anagram of p exactly when all 26 letter counts agree. "matches" counts the letters whose counts agree, so a slide only needs O(1) updates.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1], algoStep: 0, note: `k = ${p.length}, n = ${s.length}`,
  });

  if (k > n) {
    steps.push({
      title: 'Pattern is longer than the text', tag: 'SKIP:', desc: `"${p}" has ${k} letters but "${s}" has only ${n}, so no window can ever match.`,
      cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
      alert: `p is longer than s (${k} > ${n}): an anagram needs exactly ${k} letters, so return an empty list.`,
      logic: 'An anagram needs exactly |p| characters, which the text cannot supply.', logicTone: 'warn', javaLines: [2, 3], pyLines: [1, 2], algoStep: 0,
      note: `${k} > ${n} → return []`,
    });
    finish();
    return steps;
  }

  for (let i = 0; i < k; i++) need[code(p[i])]++;
  steps.push({
    title: `Count the letters of "${p}"`, tag: 'NEED:', desc: `tally p = "${p}": ${letters(need).join(', ')}. A window must reproduce exactly these counts.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'The need table never changes after this step.', logicTone: 'info',
    javaLines: [4, 5, 6], pyLines: [3, 4, 5], algoStep: 0, note: `need = {${letters(need).join(', ')}}`,
  });

  for (let i = 0; i < k; i++) {
    win[code(s[i])]++;
    steps.push({
      title: `Build: add '${s[i]}'`, tag: 'BUILD:', desc: `add s[${i}]='${s[i]}' to the first window: win['${s[i]}'] = ${win[code(s[i])]} (need ${need[code(s[i])]}).`,
      cells: cells(0, i, i), pointers: ptrs(0, i), aux: aux(), vars: vars(0, i),
      logic: 'The first window is built once, one letter at a time.', logicTone: 'info',
      javaLines: [5, 7], pyLines: [4, 6], algoStep: 1, note: `win['${s[i]}'] = ${win[code(s[i])]}`,
    });
  }
  recount();
  steps.push({
    title: 'Check the first window', tag: 'CHECK:', desc: `window [0..${k - 1}] = "${s.slice(0, k)}": ${matches} of 26 letters have win = need${matches === 26 ? ', so it is an anagram' : ''}.`,
    cells: cells(0, k - 1), pointers: ptrs(0, k - 1), aux: aux(), vars: vars(0, k - 1),
    logic: 'Letters absent from both strings (0 = 0) already count as matches.', logicTone: matches === 26 ? 'success' : 'info',
    javaLines: [9, 10], pyLines: [7], algoStep: 2, note: `matches = ${matches} of 26`,
  });
  if (matches === 26) {
    res.push(0);
    steps.push({
      title: 'Anagram found at index 0', tag: 'MATCH:', desc: `all 26 counts agree, so "${s.slice(0, k)}" is an anagram of "${p}": record start index 0.`,
      cells: cells(0, k - 1), pointers: ptrs(0, k - 1), aux: aux(0), vars: vars(0, k - 1),
      logic: 'All counts agree, so record the start index.', logicTone: 'success',
      javaLines: [11], pyLines: [8], algoStep: 4, note: 'res = [0]',
    });
  }

  for (let i = k; i < n; i++) {
    const a = s[i];
    const b = s[i - k];
    win[code(a)]++;
    recount();
    steps.push({
      title: `Slide: add '${a}'`, tag: 'ADD:', desc: `r moves to ${i}: add s[${i}]='${a}', so win['${a}'] = ${win[code(a)]} and ${matches} of 26 letters match.`,
      cells: cells(i - k, i, i), pointers: ptrs(i - k, i), aux: aux(), vars: vars(i - k, i),
      logic: 'For a moment the window holds k + 1 letters: one letter has entered, the oldest has not left yet.', logicTone: 'info',
      javaLines: [13, 14, 15], pyLines: [10, 11, 12, 13], algoStep: 3, note: `win['${a}'] = ${win[code(a)]}, matches = ${matches}`,
    });
    win[code(b)]--;
    recount();
    steps.push({
      title: `Slide: drop '${b}'`, tag: 'DROP:', desc: `l moves to ${i - k + 1}: drop s[${i - k}]='${b}', so win['${b}'] = ${win[code(b)]} and window "${s.slice(i - k + 1, i + 1)}" has ${matches} of 26 matches.`,
      cells: cells(i - k + 1, i, -1, i - k), pointers: ptrs(i - k + 1, i), aux: aux(), vars: vars(i - k + 1, i),
      logic: matches === 26 ? 'All 26 counts agree again, so this window is an anagram.' : 'Only two counts changed, so matches was fixed up in O(1).', logicTone: matches === 26 ? 'success' : 'info',
      javaLines: [16, 17], pyLines: [14, 15, 16], algoStep: 3, note: `win['${b}'] = ${win[code(b)]}, matches = ${matches}`,
    });
    if (matches === 26) {
      res.push(i - k + 1);
      steps.push({
        title: `Anagram found at index ${i - k + 1}`, tag: 'MATCH:', desc: `"${s.slice(i - k + 1, i + 1)}" is an anagram of "${p}": record start index ${i - k + 1}.`,
        cells: cells(i - k + 1, i), pointers: ptrs(i - k + 1, i), aux: aux(res.length - 1), vars: vars(i - k + 1, i),
        logic: 'All counts agree, so record the start index and keep sliding (overlapping anagrams count too).', logicTone: 'success',
        javaLines: [18], pyLines: [17], algoStep: 4, note: `res = [${res.join(', ')}]`,
      });
    }
  }
  finish();
  return steps;
}

export const findAllAnagrams: ProblemDef<In> = {
  slug: '438-find-all-anagrams-in-a-string',
  id: '438', title: 'Find All Anagrams in a String', difficulty: 'Medium', category: 'Strings', tag: 'fixed window + matches',
  statement: 'Given strings s and p, return the start indexes of every substring of s that is an anagram of p, in any order. Overlapping matches all count.',
  emphasis: ['start indexes', 'anagram of p', 'Overlapping matches'],
  constraints: '1 ≤ |s|, |p| ≤ 3·10⁴, lowercase letters (animation: |s| ≤ 12, |p| ≤ 5)',
  examples: [
    { label: '"cbaebabacd", "abc"', input: { s: 'cbaebabacd', p: 'abc' }, output: '[0,6]', answer: '[0, 6] ("cba" at 0, "bac" at 6)' },
    { label: '"abab", "ab"', input: { s: 'abab', p: 'ab' }, output: '[0,1,2]' },
    { label: '"aaaa", "ab"', input: { s: 'aaaa', p: 'ab' }, output: '[]' },
  ],
  inputPlaceholder: 'e.g. cbaebabacd ; abc',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Window', state: 'active' }, { label: 'Letter entering', state: 'compare' }, { label: 'Letter leaving', state: 'swap' }, { label: 'Anagram window', state: 'found' }, { label: 'Earlier match', state: 'sorted' }],
  varLabels: ['l', 'r', 'k', 'matches'],
  phases: [
    { icon: '📋', label: 'Count letters of p', tone: 'blue' },
    { icon: '🔨', label: 'Build first window', tone: 'cyan' },
    { icon: '⚖️', label: 'Check matches', tone: 'gold' },
    { icon: '🪟', label: 'Slide: add / drop', tone: 'green' },
    { icon: '🎯', label: 'Record match', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
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
    'Count the letters of p (need) and, later, of the first window of s (win)',
    'Build the first window of length |p| one letter at a time',
    'Compute matches = number of letters with need == win',
    'Slide: add s[i], remove s[i − k], adjust matches',
    'Record the start index whenever matches is 26',
    'Done: return the list of start indexes',
  ],
  complexity: [{ label: 'Time', value: 'O(26 + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Every window has the same length as p, so it is an anagram iff all 26 letter counts equal p\'s. A slide changes two counts; each change can move a letter into or out of the "matched" group, which we update in O(1). That removes the O(26) comparison per window and makes the scan linear.',
};
