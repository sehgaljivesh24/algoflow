import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string; k: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: string ; k — e.g. AABABBA ; 1');
  const s = left.trim().toUpperCase();
  const k = Number(right.trim());
  if (!s || !/^[A-Z]+$/.test(s)) throw new Error('Use capital letters A-Z only, e.g. AABABBA ; 1');
  if (right.trim() === '' || !Number.isInteger(k) || k < 0) throw new Error('k must be a whole number ≥ 0');
  if (s.length > 12) throw new Error('Use 12 letters or fewer');
  return { s, k };
}

function build({ s, k }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const count = new Map<string, number>();
  let l = 0;
  let maxf = 0;
  let best = 0;
  let bestL = 0;

  // enter = the letter just added on the right (R), leave = the letter just dropped on the left (L)
  const cells = (lo: number, hi: number, enter = -1, enterOver = false, leave = -1, final = false): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (final) state = i >= bestL && i < bestL + best ? 'found' : 'dim';
      else if (i === enter) state = enterOver ? 'error' : 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = 'active';
      else if (i < lo) state = 'dim';
      return { key: i, value, state };
    });
  // pointer labels are the indexes themselves
  const ptrs = (r: number) => [
    { id: 'l', label: String(l), index: Math.min(l, n - 1), tone: 'blue' as const },
    { id: 'r', label: String(r), index: r, tone: 'green' as const },
  ];
  /** Counts of the letters inside the window. While the window is over budget, the letters that would have to be replaced are marked. */
  const aux = (over = false, src: Map<string, number> = count) => {
    const keys = [...src].filter(([, v]) => v > 0);
    const top = keys.reduce((m, [, v]) => Math.max(m, v), 0);
    const topAt = keys.findIndex(([, v]) => v === top);
    return [{
      title: 'Window letter counts (letter → count)', kind: 'map' as const,
      items: keys.map(([c, v]) => `'${c}' ×${v}`), highlight: keys.length ? topAt : undefined,
      bad: over ? keys.flatMap((_, i) => (i === topAt ? [] : [i])) : [],
    }];
  };
  const budget = (len: number) => (len === 0 ? '—' : `${len - maxf} ≤ ${k} ${len - maxf <= k ? '✓' : '✗'}`);
  const vars = (r: number | string, len: number) => ({ L: l, R: r, maxf, 'len − maxf ≤ k': budget(len), best });

  steps.push({
    title: 'Start', tag: 'READY —', desc: `Find the longest run of one repeated letter after changing at most k = ${k} letter${k === 1 ? '' : 's'}. The window is empty.`,
    cells: cells(0, -1), pointers: [], aux: aux(), vars: { L: 0, R: '—', maxf: 0, 'len − maxf ≤ k': '—', best: 0 },
    logic: 'A window is fixable when (window length − count of its most frequent letter) ≤ k: change every other letter into the most frequent one.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0, note: `k = ${k}, window = empty`,
  });

  for (let r = 0; r < n; r++) {
    const ch = s[r];
    count.set(ch, (count.get(ch) ?? 0) + 1);
    const prevMax = maxf;
    maxf = Math.max(maxf, count.get(ch)!);
    const len = r - l + 1;
    const cost = len - maxf;
    steps.push({
      title: `Add '${ch}'`, tag: 'EXPAND:',
      desc: `take in s[${r}]='${ch}' → count ${count.get(ch)}, maxf ${prevMax === maxf ? `stays ${maxf}` : `${prevMax} → ${maxf}`}; len ${len} − maxf ${maxf} = ${cost} ${cost > k ? `> k=${k} ⚠ shrink!` : `≤ k=${k} ✓ valid`}`,
      cells: cells(l, r, r, cost > k), pointers: ptrs(r), aux: aux(cost > k), vars: vars(r, len),
      alert: cost > k ? `Window needs ${cost} replacements but k = ${k}. Move L right until it fits.` : undefined,
      logic: cost > k ? 'More replacements needed than allowed — the window is invalid and must shrink.' : 'Within budget, so this window is valid.', logicTone: cost > k ? 'warn' : 'info',
      javaLines: [4, 5], pyLines: [4, 5], algoStep: 0,
      note: `count['${ch}'] = ${count.get(ch)}; maxf = ${maxf}; ${len} − ${maxf} = ${cost} ${cost > k ? '>' : '≤'} ${k}`,
    });
    while (r - l + 1 - maxf > k) {
      const out = s[l];
      count.set(out, count.get(out)! - 1);
      l++;
      const len3 = r - l + 1;
      const still = len3 - maxf > k;
      steps.push({
        title: `Shrink: drop '${out}'`, tag: 'SHRINK:',
        desc: `drop s[${l - 1}]='${out}' → L moves to ${l}; len ${len3} − maxf ${maxf} = ${len3 - maxf} ${still ? `> k=${k}, still invalid` : `≤ k=${k} ✓ valid again`}`,
        cells: cells(l, r, -1, false, l - 1), pointers: ptrs(r), aux: aux(still), vars: vars(r, len3),
        alert: still ? `Still ${len3 - maxf} replacements for k = ${k}. Keep shrinking.` : undefined,
        logic: 'maxf is intentionally not lowered: only a window with a larger count could beat the best, so a stale maxf never causes a wrong answer.', logicTone: 'warn',
        javaLines: [6, 7], pyLines: [6, 7], algoStep: 1,
        note: `count['${out}'] → ${count.get(out)}; l = ${l}; ${len3} − ${maxf} = ${len3 - maxf} ${still ? '>' : '≤'} ${k}`,
      });
    }
    const len2 = r - l + 1;
    const old = best;
    const improved = len2 > best;
    if (improved) { best = len2; bestL = l; }
    steps.push({
      title: improved ? `New best length ${best}` : `Length ${len2} does not beat ${old}`, tag: 'UPDATE best:',
      desc: improved ? `window [${l}..${r}] is valid, len=${len2} → 🏆 NEW BEST! best = ${best} ("${s.slice(l, r + 1)}")` : `window [${l}..${r}] is valid, len=${len2} → best = max(${old}, ${len2}) = ${best}`,
      cells: cells(l, r), pointers: ptrs(r), aux: aux(), vars: vars(r, len2),
      logic: improved ? 'Record the largest valid window seen.' : 'A valid window, but not longer than the best.', logicTone: improved ? 'success' : 'info', javaLines: [9], pyLines: [8], algoStep: 2,
      note: `best = max(${old}, ${r} − ${l} + 1) = ${best}`,
    });
  }

  const bestCounts = new Map<string, number>();
  for (const c of s.slice(bestL, bestL + best)) bestCounts.set(c, (bestCounts.get(c) ?? 0) + 1);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `best = ${best}: the longest window that fits within k = ${k} replacements is "${s.slice(bestL, bestL + best)}" (indices ${bestL}–${bestL + best - 1})`,
    cells: cells(0, -1, -1, false, -1, true), pointers: [{ id: 'l', label: String(bestL), index: bestL, tone: 'blue' as const }, { id: 'r', label: String(bestL + best - 1), index: bestL + best - 1, tone: 'green' as const }], aux: aux(false, bestCounts),
    vars: { L: bestL, R: bestL + best - 1, maxf: Math.max(...bestCounts.values()), 'len − maxf ≤ k': `${best - Math.max(...bestCounts.values())} ≤ ${k} ✓`, best },
    logic: 'Highlighted is the first window that reached the best length.', logicTone: 'success', javaLines: [11], pyLines: [9], algoStep: 3, note: `return ${best}`,
    result: { title: String(best), text: `Window "${s.slice(bestL, bestL + best)}"` },
  });
  return steps;
}

export const longestRepeatingCharacterReplacement: ProblemDef<In> = {
  slug: '424-longest-repeating-character-replacement',
  id: '424', title: 'Longest Repeating Character Replacement', difficulty: 'Medium', category: 'Strings', tag: 'sliding window',
  statement: 'You may change at most k characters of an uppercase string into any other letters. Return the length of the longest substring that can be made of a single repeated letter. A window is valid while its length minus the count of its most frequent letter is at most k.',
  emphasis: ['at most k', 'longest substring', 'single repeated letter', 'most frequent letter'],
  constraints: '1 ≤ length ≤ 10⁵, uppercase letters, 0 ≤ k ≤ length (animation input: up to 12 letters)',
  examples: [
    { label: '"ABAB", k=2', input: { s: 'ABAB', k: 2 }, output: '4' },
    { label: '"AABABBA", k=1', input: { s: 'AABABBA', k: 1 }, output: '4', answer: '4 (window "AABA" turns its single B into an A)' },
    { label: '"ABCDE", k=1', input: { s: 'ABCDE', k: 1 }, output: '2' },
  ],
  inputPlaceholder: 'e.g. AABABBA ; 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'R entering (expand)', state: 'compare' }, { label: 'L leaving (shrink)', state: 'swap' }, { label: 'Window contents', state: 'active' }, { label: 'Over budget', state: 'error' }, { label: 'Best window', state: 'found' }],
  varLabels: ['L', 'R', 'maxf', 'len − maxf ≤ k', 'best'],
  phases: [
    { icon: '➡', label: 'EXPAND (R →)', tone: 'green' },
    { icon: '⬅', label: 'SHRINK (← L)', tone: 'orange' },
    { icon: '★', label: 'UPDATE best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Window valid while len − maxFrequency ≤ k',
    text: 'Grow the window to the right, tracking letter counts and the highest count seen (maxf). If the letters that are not the majority exceed k, move the left edge until the window is valid again.',
  },
  java: [
    'public int characterReplacement(String s, int k) {',
    '    int[] count = new int[26];',
    '    int l = 0, maxf = 0, best = 0;',
    '    for (int r = 0; r < s.length(); r++) {',
    '        count[s.charAt(r) - \'A\']++;',
    '        maxf = Math.max(maxf, count[s.charAt(r) - \'A\']);',
    '        while (r - l + 1 - maxf > k) {',
    '            count[s.charAt(l++) - \'A\']--;',
    '        }',
    '        best = Math.max(best, r - l + 1);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def character_replacement(s, k):',
    '    count = defaultdict(int)',
    '    l = maxf = best = 0',
    '    for r, ch in enumerate(s):',
    '        count[ch] += 1',
    '        maxf = max(maxf, count[ch])',
    '        while r - l + 1 - maxf > k:',
    '            count[s[l]] -= 1; l += 1',
    '        best = max(best, r - l + 1)',
    '    return best',
  ],
  algorithm: [
    'Expand: add s[r], increase its count and update maxf',
    'Shrink: while (window length − maxf) > k, drop s[l] and advance l',
    'Update: record the window length as a candidate answer',
    'Return the best length',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) — 26 letters' }],
  why: 'In a window of length L whose commonest letter occurs m times, the cheapest way to make it uniform changes L − m letters, so it is feasible iff L − m ≤ k. maxf may be stale after shrinking, but a stale (too high) value can only keep the window from shrinking while its length stays the same; the window can only grow when a genuinely larger count appears, so the best recorded length is always correct.',
};
