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
  const aux = (hl?: string) => {
    const live = [...win].filter(([, v]) => v > 0);
    return [
      { title: 'need (from t)', kind: 'map' as const, items: [...need].map(([c, v]) => `${c} → ${v}`) },
      {
        title: 'window counts', kind: 'map' as const, items: live.map(([c, v]) => `${c} → ${v}`),
        highlight: hl === undefined ? undefined : live.findIndex(([c]) => c === hl),
        bad: live.flatMap(([c, v], i) => (need.has(c) && v < need.get(c)! ? [i] : [])),
      },
    ];
  };
  const vars = (r: number | string) => ({ l, r, formed: `${formed}/${required}`, best: bestLen === Infinity ? '—' : bestLen });
  const needText = [...need].map(([c, v]) => `${c}×${v}`).join(', ');

  steps.push({
    title: 'Start', tag: 'START —', desc: `find the shortest window of "${s}" containing every letter of "${t}", duplicates included; l = 0 and the window is empty.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'Grow the window until it covers all needed letters, then shrink from the left to make it as short as possible while it still does. "formed" counts letters whose need is satisfied.', logicTone: 'info',
    javaLines: [0, 1, 2, 3, 4], pyLines: [0, 1, 2], algoStep: 0, note: `l = 0, bestLen = ∞`,
  });
  steps.push({
    title: 'Count what t needs', tag: 'NEED:', desc: `t = "${t}" needs ${needText}, so required = ${required} distinct letter${required === 1 ? '' : 's'} must reach their counts.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The need table is built once; the window only ever compares against it.', logicTone: 'info',
    javaLines: [2, 3], pyLines: [1, 2], algoStep: 0, note: `required = ${required}, formed = 0`,
  });

  for (let r = 0; r < n; r++) {
    const ch = s[r];
    win.set(ch, (win.get(ch) ?? 0) + 1);
    const relevant = need.has(ch);
    const reached = relevant && win.get(ch) === need.get(ch);
    if (reached) formed++;
    steps.push({
      title: `Expand: add '${ch}'`, tag: 'EXPAND:', desc: relevant
        ? `r = ${r}: add s[${r}]='${ch}', so its count is ${win.get(ch)} (need ${need.get(ch)})${reached ? `: '${ch}' is satisfied, formed = ${formed}/${required}` : ''}.`
        : `r = ${r}: s[${r}]='${ch}' is not in t, so it only widens the window.`,
      cells: cells(l, r), pointers: ptrs(r), aux: aux(ch), vars: vars(r),
      logic: formed === required ? 'Every needed letter is covered, time to shrink.' : 'Still missing some letters, keep expanding.', logicTone: formed === required ? 'success' : 'info',
      javaLines: [5, 6, 7, 8], pyLines: [3, 4, 5, 6], algoStep: 1,
      note: relevant ? `win['${ch}'] = ${win.get(ch)}, need = ${need.get(ch)}, formed = ${formed}/${required}` : `'${ch}' not in need, formed = ${formed}/${required}`,
    });
    while (formed === required) {
      const len = r - l + 1;
      const improved = len < bestLen;
      const prevBest = bestLen;
      if (improved) {
        bestLen = len;
        bestL = l;
      }
      steps.push({
        title: `Valid window [${l}..${r}], length ${len}`, tag: improved ? 'RECORD:' : 'VALID:',
        desc: improved ? `window [${l}..${r}] = "${s.slice(l, r + 1)}" covers t with length ${len}, beating ${prevBest === Infinity ? 'no previous best' : `the best ${prevBest}`}: record it.`
          : `window [${l}..${r}] = "${s.slice(l, r + 1)}" covers t, but length ${len} does not beat the best ${bestLen}.`,
        cells: cells(l, r), pointers: ptrs(r), aux: aux(), vars: vars(r),
        logic: improved ? 'A shorter covering window than any before: remember where it starts.' : 'Valid but not shorter; still try to shrink it.', logicTone: improved ? 'success' : 'info',
        javaLines: [9, 10], pyLines: [7, 8], algoStep: 2, note: improved ? `${len} < ${prevBest === Infinity ? '∞' : prevBest} → bestLen = ${len}, bestL = ${l}` : `${len} ≥ ${bestLen}, best unchanged`,
      });
      const out = s[l];
      win.set(out, win.get(out)! - 1);
      const broke = need.has(out) && win.get(out)! < need.get(out)!;
      if (broke) formed--;
      l++;
      steps.push({
        title: `Shrink: drop '${out}'`, tag: 'SHRINK:',
        desc: `l moves to ${l}: drop s[${l - 1}]='${out}' so its count is ${win.get(out)}${broke ? `, below the need ${need.get(out)}: formed = ${formed}/${required}` : ', and the window still covers t'}.`,
        cells: cells(l, r), pointers: ptrs(r), aux: aux(out), vars: vars(r),
        alert: broke ? `Dropping '${out}' leaves ${win.get(out)} < ${need.get(out)}: the window no longer covers t, so go back to expanding.` : undefined,
        logic: broke ? 'The window just lost a needed letter; go back to expanding.' : 'Still covers t after the removal, so keep shrinking for a shorter answer.', logicTone: broke ? 'warn' : 'success',
        javaLines: broke ? [11, 12, 13] : [11, 12], pyLines: broke ? [9, 10, 11] : [9], algoStep: 3,
        note: `win['${out}'] = ${win.get(out)}${need.has(out) ? `, need = ${need.get(out)}` : ''}, formed = ${formed}/${required}`,
      });
    }
  }

  const found = bestLen !== Infinity;
  const ans = found ? s.slice(bestL, bestL + bestLen) : '';
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: found ? `r reached the end: the minimum window is "${ans}" at indexes ${bestL}..${bestL + bestLen - 1}, length ${bestLen}.` : `r reached the end and no window of "${s}" ever contained all of "${t}", so the answer is the empty string.`,
    cells: cells(0, -1, true), pointers: [], aux: aux(), vars: vars('—'),
    logic: found ? 'Highlighted is the shortest (leftmost on ties) window that covers t.' : 'Return the empty string.', logicTone: found ? 'success' : 'warn',
    javaLines: [16], pyLines: [12], algoStep: 4, note: found ? `s.substring(${bestL}, ${bestL + bestLen}) = "${ans}"` : 'bestLen = ∞ → return ""',
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
  phases: [
    { icon: '📋', label: 'Count need (t)', tone: 'blue' },
    { icon: '➡️', label: 'EXPAND (r →)', tone: 'green' },
    { icon: '🏆', label: 'RECORD best window', tone: 'gold' },
    { icon: '⬅️', label: 'SHRINK (← l)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['shortest substring', 'every character of t', 'duplicates'],
  algorithm: [
    'Count the letters t needs; keep a counter for the window',
    'Add s[r]; if its window count just reached the need, increase formed',
    'While every needed letter is covered, record the window if it is the shortest',
    'Drop s[l]; if that under-covers a letter, decrease formed and go back to expanding',
    'Done: return the best window (or the empty string)',
  ],
  complexity: [{ label: 'Time', value: 'O(|s| + |t|)' }, { label: 'Space', value: 'O(alphabet)' }],
  why: 'For each right end r, the best left end is the largest l that still keeps the window valid; as r grows that l never moves backward, so two forward-moving pointers see every candidate. Tracking "formed" (how many distinct letters have reached their needed count) makes the validity test O(1) instead of re-comparing the maps.',
};
