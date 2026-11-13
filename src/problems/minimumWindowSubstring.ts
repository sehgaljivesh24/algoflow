import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string; t: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: s ; t — e.g. DOBECODEBANC ; ABC');
  const s = parts[0].trim();
  const t = parts[1].trim();
  if (!s || !t) throw new Error('Both strings must be non-empty');
  if (/\s/.test(s) || /\s/.test(t)) throw new Error('Strings cannot contain spaces');
  if (s.length > 12) throw new Error('Use 12 characters or fewer for s');
  if (t.length > 5) throw new Error('Use 5 characters or fewer for t');
  return { s, t };
}

function build({ s, t }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  const win = new Map<string, number>();
  const required = need.size;
  let formed = 0;
  let l = 0;
  let bestLen = Infinity;
  let bestL = 0;

  const cells = (lo: number, hi: number, final = false): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (final) state = bestLen !== Infinity && i >= bestL && i < bestL + bestLen ? 'found' : 'dim';
      else if (i >= lo && i <= hi) state = formed === required ? 'found' : 'active';
      else if (i < lo) state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = (r: number) => [
    { id: 'l', label: 'l', index: Math.min(l, n - 1), tone: 'blue' as const },
    { id: 'r', label: 'r', index: r, tone: 'orange' as const },
  ];
  const aux = (hl?: string) => [
    { title: 'need (from t)', kind: 'map' as const, items: [...need].map(([c, v]) => `${c} → ${v}`) },
    { title: 'window counts', kind: 'map' as const, items: [...win].filter(([, v]) => v > 0).map(([c, v]) => `${c} → ${v}`), highlight: hl === undefined ? undefined : [...win].filter(([, v]) => v > 0).findIndex(([c]) => c === hl) },
  ];
  const vars = (r: number | string) => ({ l, r, formed: `${formed}/${required}`, best: bestLen === Infinity ? '—' : bestLen });

  steps.push({
    title: 'Start', desc: `Shortest window of "${s}" containing every letter of "${t}" (with multiplicity).`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'Grow the window until it covers all needed letters, then shrink from the left to make it as short as possible while it still does. "formed" counts letters whose need is satisfied.', logicTone: 'info',
    javaLines: [0, 1, 2, 3, 4], pyLines: [0, 1, 2, 3], algoStep: 0,
  });

  for (let r = 0; r < n; r++) {
    const ch = s[r];
    win.set(ch, (win.get(ch) ?? 0) + 1);
    const relevant = need.has(ch);
    if (relevant && win.get(ch) === need.get(ch)) formed++;
    steps.push({
      title: `Expand: add '${ch}'`, desc: relevant
        ? `'${ch}' count is now ${win.get(ch)} (need ${need.get(ch)}).${win.get(ch) === need.get(ch) ? ` '${ch}' is satisfied: formed = ${formed}/${required}.` : ''}`
        : `'${ch}' is not in t, so it only widens the window.`,
      cells: cells(l, r), pointers: ptrs(r), aux: aux(ch), vars: vars(r),
      logic: formed === required ? 'Every needed letter is covered, time to shrink.' : 'Still missing some letters, keep expanding.', logicTone: formed === required ? 'success' : 'info',
      javaLines: [6, 7, 8], pyLines: [4, 5, 6], algoStep: 1,
    });
    while (formed === required) {
      const len = r - l + 1;
      if (len < bestLen) {
        bestLen = len;
        bestL = l;
      }
      const out = s[l];
      win.set(out, win.get(out)! - 1);
      const broke = need.has(out) && win.get(out)! < need.get(out)!;
      if (broke) formed--;
      steps.push({
        title: `Valid window [${l}..${r}], length ${len}`, desc: `Best so far: ${bestLen}. Drop '${out}' from the left${broke ? ` — that breaks '${out}' (${win.get(out)} < ${need.get(out)}), so formed = ${formed}/${required}` : ' — the window stays valid'}.`,
        cells: cells(l, r), pointers: ptrs(r), aux: aux(out), vars: vars(r),
        logic: broke ? 'The window just lost a needed letter; go back to expanding.' : 'Still covers t after the removal, so keep shrinking for a shorter answer.', logicTone: broke ? 'warn' : 'success',
        javaLines: broke ? [9, 10, 11, 12, 13] : [9, 10, 11, 12], pyLines: broke ? [7, 8, 9, 10, 11] : [7, 8, 9, 10], algoStep: 2,
      });
      l++;
    }
  }

  const found = bestLen !== Infinity;
  const ans = found ? s.slice(bestL, bestL + bestLen) : '';
  steps.push({
    title: 'Done', desc: found ? `Minimum window: "${ans}" (indexes ${bestL}..${bestL + bestLen - 1}).` : `No window of "${s}" contains all of "${t}".`,
    cells: cells(0, -1, true), pointers: [], aux: aux(), vars: vars('—'),
    logic: found ? 'Highlighted is the shortest (leftmost on ties) window that covers t.' : 'Return the empty string.', logicTone: found ? 'success' : 'warn',
    javaLines: [16], pyLines: [12], algoStep: 3,
    result: { title: JSON.stringify(ans), text: found ? `Window [${bestL}..${bestL + bestLen - 1}]` : 'No valid window' },
  });
  return steps;
}

export const minimumWindowSubstring: ProblemDef<In> = {
  slug: '76-minimum-window-substring',
  id: '76', title: 'Minimum Window Substring', difficulty: 'Hard', category: 'Strings', tag: 'sliding window + map',
  statement: 'Given strings s and t, return the shortest substring of s that contains every character of t, counting duplicates. If no such substring exists, return the empty string.',
  constraints: '1 ≤ |s|, |t| ≤ 10⁵ (animation: |s| ≤ 12, |t| ≤ 5)',
  examples: [
    { label: '"DOBECODEBANC", "ABC"', input: { s: 'DOBECODEBANC', t: 'ABC' }, output: '"BANC"' },
    { label: '"a", "a"', input: { s: 'a', t: 'a' }, output: '"a"' },
    { label: '"a", "aa"', input: { s: 'a', t: 'aa' }, output: '""' },
  ],
  inputPlaceholder: 'e.g. DOBECODEBANC ; ABC',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Window (still missing letters)', state: 'active' }, { label: 'Window covers t', state: 'found' }, { label: 'Left of window', state: 'dim' }],
  varLabels: ['l', 'r', 'formed', 'best'],
  approach: {
    title: 'Expand until valid, then shrink until invalid',
    text: 'Count what t needs. Move r right, adding letters; whenever every needed letter is covered, record the window and move l right as far as the window stays valid, then resume expanding.',
  },
  java: [
    'public String minWindow(String s, String t) {',
    '    int[] need = new int[128], win = new int[128];',
    '    int required = 0;',
    '    for (char c : t.toCharArray()) if (need[c]++ == 0) required++;',
    '    int formed = 0, l = 0, bestLen = Integer.MAX_VALUE, bestL = 0;',
    '    for (int r = 0; r < s.length(); r++) {',
    '        char c = s.charAt(r);',
    '        win[c]++;',
    '        if (need[c] > 0 && win[c] == need[c]) formed++;',
    '        while (formed == required) {',
    '            if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }',
    '            char d = s.charAt(l++);',
    '            win[d]--;',
    '            if (need[d] > 0 && win[d] < need[d]) formed--;',
    '        }',
    '    }',
    '    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestL, bestL + bestLen);',
    '}',
  ],
  python: [
    'def min_window(s, t):',
    '    need, win = Counter(t), defaultdict(int)',
    '    formed, l, best = 0, 0, (float("inf"), 0)',
    '    for r, c in enumerate(s):',
    '        win[c] += 1',
    '        if c in need and win[c] == need[c]:',
    '            formed += 1',
    '        while formed == len(need):',
    '            best = min(best, (r - l + 1, l))',
    '            d = s[l]; l += 1; win[d] -= 1',
    '            if d in need and win[d] < need[d]:',
    '                formed -= 1',
    '    return "" if best[0] == float("inf") else s[best[1]:best[1] + best[0]]',
  ],
  algorithm: [
    'Count the letters t needs; keep a counter for the window',
    'Add s[r]; if its window count just reached the need, increase formed',
    'While every needed letter is covered, record the window and drop s[l]',
    'If dropping s[l] under-covers a letter, decrease formed; finally return the best window',
  ],
  complexity: [{ label: 'Time', value: 'O(|s| + |t|)' }, { label: 'Space', value: 'O(alphabet)' }],
  why: 'For each right end r, the best left end is the largest l that still keeps the window valid; as r grows that l never moves backward, so two forward-moving pointers see every candidate. Tracking "formed" (how many distinct letters have reached their needed count) makes the validity test O(1) instead of re-comparing the maps.',
};
