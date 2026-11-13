import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { p: string; s: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: s1 ; s2 — e.g. ab ; eidbaooo');
  const p = parts[0].trim().toLowerCase();
  const s = parts[1].trim().toLowerCase();
  if (!/^[a-z]+$/.test(p) || !/^[a-z]+$/.test(s)) throw new Error('Use lowercase letters a-z only (both strings non-empty)');
  if (p.length > 5) throw new Error('Use 5 letters or fewer for s1');
  if (s.length > 12) throw new Error('Use 12 letters or fewer for s2');
  return { p, s };
}

const code = (c: string) => c.charCodeAt(0) - 97;
const ch = (i: number) => String.fromCharCode(97 + i);

/**
 * One step per event: start, count s1 into need, count the first window, count the matches, then every slide is two steps
 * (the new letter enters, the old letter leaves), and finally the verdict.
 */
function build({ p, s }: In): Step[] {
  const steps: Step[] = [];
  const k = p.length;
  const n = s.length;
  const need = new Array(26).fill(0);
  const win = new Array(26).fill(0);
  let matches = 0;
  let known = false; // matches has been computed
  const recount = () => { matches = 0; for (let c = 0; c < 26; c++) if (need[c] === win[c]) matches++; };
  const aux = () => {
    const needItems: string[] = [];
    const winItems: string[] = [];
    const bad: number[] = [];
    for (let c = 0; c < 26; c++) {
      if (need[c] > 0) needItems.push(`'${ch(c)}' ×${need[c]}`);
      if (need[c] > 0 || win[c] > 0) {
        if (win[c] !== need[c]) bad.push(winItems.length);
        winItems.push(`'${ch(c)}' ×${win[c]}`);
      }
    }
    return [
      { title: `need (letters of "${p}")`, kind: 'map' as const, items: needItems },
      { title: 'window counts (orange = differs from need)', kind: 'map' as const, items: winItems, bad },
    ];
  };
  const cells = (lo: number, hi: number, enter = -1, leave = -1, final = false): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (i === enter) state = 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = final ? 'found' : 'active';
      else if (i < lo) state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = (lo: number, hi: number) => [
    { id: 'l', label: 'L', index: lo, tone: 'blue' as const },
    { id: 'r', label: 'R', index: hi, tone: 'orange' as const },
  ];
  const vars = (window: string, verdict = '—') => ({ window, k, matches: known ? `${matches}/26` : '—', equal: verdict });
  const win2 = (lo: number, hi: number) => `"${s.slice(lo, hi + 1)}"`;

  steps.push({
    title: 'Start', tag: 'READY —', desc: `Is some rearrangement of "${p}" a substring of "${s}"? Slide a window of length ${k} over it.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'A window is a permutation of s1 exactly when every letter has the same count in both. Comparing 26 counts each time is wasteful, so we maintain "matches", the number of letters whose counts agree.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0, note: `k = ${k}, window length = ${k}`,
  });

  if (k > n) {
    for (const c of p) need[code(c)]++;
    steps.push({
      title: 'Pattern is longer than the text', tag: 'REJECT —', desc: `"${p}" has ${k} letters but "${s}" has only ${n}, so no window can fit it.`,
      cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', 'false'),
      alert: `s1 needs ${k} letters, s2 has only ${n}. No window fits.`,
      logic: 'A permutation of s1 needs at least |s1| characters in s2.', logicTone: 'warn', javaLines: [2], pyLines: [2], algoStep: 3,
      note: `${k} > ${n} → return false`,
      result: { title: 'false', text: 's1 is longer than s2' },
    });
    return steps;
  }

  const verdict = (ok: boolean, lo: number, hi: number, javaLine: number, pyLine: number) =>
    steps.push({
      title: ok ? 'Permutation found!' : 'No permutation exists', tag: ok ? '✅ Match!' : '🚫 No match!',
      desc: ok ? `window ${win2(lo, hi)} at [${lo}..${hi}] has exactly the letters of "${p}" (26/26 counts agree)` : `no window of length ${k} in "${s}" matched "${p}"; matches never reached 26`,
      cells: ok ? cells(lo, hi, -1, -1, true) : cells(0, -1), pointers: ok ? ptrs(lo, hi) : [], aux: aux(), vars: ok ? vars(win2(lo, hi), 'true') : vars('—', 'false'),
      alert: ok ? undefined : 'Every window was checked and none had all 26 counts equal.',
      logic: ok ? 'All 26 letter counts agree, so the window is a rearrangement of s1.' : 'We slid across the whole string and matches never reached 26.', logicTone: ok ? 'success' : 'warn',
      javaLines: [javaLine], pyLines: [pyLine], algoStep: 3,
      note: ok ? `matches = ${matches} == 26 → true` : `matches ≠ 26 → false`,
      result: { title: String(ok), text: ok ? `"${s.slice(lo, hi + 1)}" at index ${lo} is a permutation of "${p}"` : 'No substring of s2 is a permutation of s1' },
    });

  // Phase 1: count s1, count the first window, count the agreeing letters
  for (const c of p) need[code(c)]++;
  steps.push({
    title: 'Count s1 into need', tag: 'COUNT —', desc: `count the letters of "${p}" → ${[...new Set(p)].map((c) => `${c}×${need[code(c)]}`).join(', ')}`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The target counts never change again, so they are built once.', logicTone: 'info',
    javaLines: [4, 5], pyLines: [4, 5], algoStep: 0, note: `need = {${[...new Set(p)].map((c) => `${c}:${need[code(c)]}`).join(', ')}}`,
  });
  for (let i = 0; i < k; i++) win[code(s[i])]++;
  steps.push({
    title: 'Count the first window', tag: 'COUNT —', desc: `count the first ${k} letters of s2, window ${win2(0, k - 1)} = [0..${k - 1}]`,
    cells: cells(0, k - 1), pointers: ptrs(0, k - 1), aux: aux(), vars: vars(win2(0, k - 1)),
    logic: 'The first window is counted letter by letter, once. Every later window is derived from the previous one.', logicTone: 'info',
    javaLines: [4, 6], pyLines: [4, 6], algoStep: 0, note: `window = ${win2(0, k - 1)}`,
  });
  recount();
  known = true;
  steps.push({
    title: 'Count the matches', tag: 'MATCHES —', desc: `${matches} of 26 letters have need == window (letters absent from both count as 0 = 0)`,
    cells: cells(0, k - 1), pointers: ptrs(0, k - 1), aux: aux(), vars: vars(win2(0, k - 1)),
    logic: 'Letters absent from both strings (0 = 0) already count as matches; the window is a permutation when all 26 agree.', logicTone: matches === 26 ? 'success' : 'info',
    javaLines: [8, 9], pyLines: [7], algoStep: 1, note: `matches = ${matches}`,
  });
  if (matches === 26) { verdict(true, 0, k - 1, n > k ? 11 : 18, n > k ? 9 : 17); return steps; }

  // Phase 2: slide, one step for the letter entering and one for the letter leaving
  for (let i = k; i < n; i++) {
    const a = code(s[i]);
    const b = code(s[i - k]);
    const before1 = matches;
    win[a]++;
    recount();
    steps.push({
      title: `Add '${s[i]}'`, tag: 'ENTER —', desc: `+s[${i}]='${s[i]}' → window['${s[i]}'] = ${win[a]} vs need ${need[a]} → matches ${before1} → ${matches}`,
      cells: cells(i - k, i - 1, i), pointers: ptrs(i - k, i), aux: aux(), vars: vars(win2(i - k, i)),
      logic: win[a] === need[a] ? `The count of '${s[i]}' now equals need, so one more letter agrees.` : 'Only this letter changed, so only its match status can change.',
      logicTone: 'info', javaLines: [12, 13, 14], pyLines: [10, 11, 12, 13], algoStep: 2,
      note: `win['${s[i]}']++ → ${win[a]} (need ${need[a]}), matches = ${matches}`,
    });
    const before2 = matches;
    win[b]--;
    recount();
    const ok = matches === 26;
    steps.push({
      title: `Drop '${s[i - k]}'`, tag: 'LEAVE —', desc: `−s[${i - k}]='${s[i - k]}' → window ${win2(i - k + 1, i)} [${i - k + 1}..${i}], window['${s[i - k]}'] = ${win[b]}, matches ${before2} → ${matches}`,
      cells: cells(i - k + 1, i, -1, i - k), pointers: ptrs(i - k + 1, i), aux: aux(), vars: vars(win2(i - k + 1, i), ok ? 'true' : 'false'),
      logic: ok ? 'All 26 counts agree after the slide.' : 'Two counts changed this slide; matches was repaired in O(1) without rescanning 26 letters.', logicTone: ok ? 'success' : 'warn',
      javaLines: [15, 16], pyLines: [14, 15, 16], algoStep: 2,
      note: `win['${s[i - k]}']-- → ${win[b]} (need ${need[b]}), matches = ${matches}`,
    });
    if (ok) { verdict(true, i - k + 1, i, i < n - 1 ? 11 : 18, i < n - 1 ? 9 : 17); return steps; }
  }
  verdict(false, 0, 0, 18, 17);
  return steps;
}

export const permutationInString: ProblemDef<In> = {
  slug: '567-permutation-in-string',
  id: '567', title: 'Permutation in String', difficulty: 'Medium', category: 'Strings', tag: 'fixed window + matches',
  statement: 'Given two strings s1 and s2, return true if some substring of s2 is a permutation (rearrangement) of s1. A window of length |s1| slides over s2; the letter counts of the window must equal those of s1.',
  emphasis: ['permutation', 'substring', 'letter counts'],
  constraints: '1 ≤ |s1|, |s2| ≤ 10⁴, lowercase letters (animation: |s1| ≤ 5, |s2| ≤ 12)',
  examples: [
    { label: '"ab", "eidbaooo"', input: { p: 'ab', s: 'eidbaooo' }, output: 'true', answer: 'true (window "ba" at indices 3–4 is a permutation of "ab")' },
    { label: '"ab", "eidboaoo"', input: { p: 'ab', s: 'eidboaoo' }, output: 'false' },
    { label: '"adc", "dcda"', input: { p: 'adc', s: 'dcda' }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. ab ; eidbaooo',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'In window', state: 'active' }, { label: 'Letter entering (R)', state: 'compare' }, { label: 'Letter leaving (L)', state: 'swap' }, { label: 'Permutation found', state: 'found' }, { label: 'Passed', state: 'dim' }],
  varLabels: ['window', 'k', 'matches', 'equal'],
  phases: [
    { icon: '🔨', label: 'Phase 1: Count (s1 + first window)', tone: 'blue' },
    { icon: '🧮', label: 'Matches (need == window)', tone: 'gold' },
    { icon: '🪟', label: 'Phase 2: Slide (enter + leave)', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Fixed window with a match counter',
    text: 'Slide a window of length |s1| across s2. Keep letter counts for s1 and for the window, plus the number of letters whose counts agree. When all 26 agree, the window is a permutation.',
  },
  java: [
    'public boolean checkInclusion(String s1, String s2) {',
    '    int k = s1.length();',
    '    if (k > s2.length()) return false;',
    '    int[] need = new int[26], win = new int[26];',
    '    for (int i = 0; i < k; i++) {',
    '        need[s1.charAt(i) - \'a\']++;',
    '        win[s2.charAt(i) - \'a\']++;',
    '    }',
    '    int matches = 0;',
    '    for (int c = 0; c < 26; c++) if (need[c] == win[c]) matches++;',
    '    for (int i = k; i < s2.length(); i++) {',
    '        if (matches == 26) return true;',
    '        int a = s2.charAt(i) - \'a\', b = s2.charAt(i - k) - \'a\';',
    '        win[a]++;',
    '        if (win[a] == need[a]) matches++; else if (win[a] == need[a] + 1) matches--;',
    '        win[b]--;',
    '        if (win[b] == need[b]) matches++; else if (win[b] == need[b] - 1) matches--;',
    '    }',
    '    return matches == 26;',
    '}',
  ],
  python: [
    'def check_inclusion(s1, s2):',
    '    k = len(s1)',
    '    if k > len(s2): return False',
    '    need, win = [0] * 26, [0] * 26',
    '    for i in range(k):',
    '        need[ord(s1[i]) - 97] += 1',
    '        win[ord(s2[i]) - 97] += 1',
    '    matches = sum(need[c] == win[c] for c in range(26))',
    '    for i in range(k, len(s2)):',
    '        if matches == 26: return True',
    '        a, b = ord(s2[i]) - 97, ord(s2[i - k]) - 97',
    '        win[a] += 1',
    '        if win[a] == need[a]: matches += 1',
    '        elif win[a] == need[a] + 1: matches -= 1',
    '        win[b] -= 1',
    '        if win[b] == need[b]: matches += 1',
    '        elif win[b] == need[b] - 1: matches -= 1',
    '    return matches == 26',
  ],
  algorithm: [
    'Count the letters of s1 (need) and of the first window of s2 (win)',
    'Count how many of the 26 letters have need == win (matches)',
    'Slide the window: add the new letter, remove the old one, fix matches',
    'If matches reaches 26 return true; return false if the string ends first',
  ],
  complexity: [{ label: 'Time', value: 'O(26 + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A substring is a permutation of s1 iff it has the same length and the same count for every letter. Because every window has length |s1|, equal counts for all 26 letters is both necessary and sufficient. A slide changes only two counts, and a count can enter or leave "matched" status in O(1), so each slide costs constant time instead of 26.',
};
