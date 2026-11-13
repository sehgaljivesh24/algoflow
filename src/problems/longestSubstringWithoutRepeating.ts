import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.trim();
  if (!s) throw new Error('Enter some text, e.g. abcabcbb');
  if (/\s/.test(s)) throw new Error('Use characters with no spaces, e.g. abcabcbb');
  if (s.length > 12) throw new Error('Use 12 characters or fewer');
  return { s };
}

/**
 * One step per event: expand (add s[R]), shrink (drop s[L], repeated while a count is above 1), update (compare with the best).
 * For "pwwkew" that is 1 start + 2 + 2 + 4 + 2 + 2 + 3 + 1 done = 17 steps.
 */
function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const counts = new Map<string, number>(); // window contents, insertion ordered
  let l = 0;
  let best = 0;
  let bestL = 0;

  const cells = (lo: number, hi: number, enter = -1, leave = -1, bad = -1, final = false): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      if (final) state = i >= bestL && i < bestL + best ? 'found' : undefined;
      else if (i === bad) state = 'error';
      else if (i === enter) state = 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = 'active';
      return { key: i, value, state };
    });
  // pointer labels are the indexes themselves; when L = R both sit on one cell and are drawn as a single green marker
  const ptrs = (lo: number, hi: number) => [
    { id: 'l', label: String(lo), index: lo, tone: 'blue' as const },
    { id: 'r', label: String(hi), index: hi, tone: 'green' as const },
  ];
  const aux = (map: Map<string, number> = counts) => {
    const entries = [...map.entries()];
    return [{
      title: 'Window contents (char → count)', kind: 'map' as const,
      items: entries.map(([c, k]) => `'${c}' ×${k}`),
      bad: entries.flatMap(([, k], i) => (k > 1 ? [i] : [])),
    }];
  };
  const vars = (lo: number | string, hi: number | string, len: number | string) => ({ L: lo, R: hi, len, result: best });

  steps.push({
    title: 'Start', tag: 'READY —', desc: 'The window is empty: L and R are not placed yet and result = 0. Press Next to take in the first character.',
    cells: cells(0, -1), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Keep a window [L..R] with no repeated character. Grow R one character at a time; when the new character repeats, move L right until the repeat is gone.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, note: 'empty window, left = 0, result = 0',
  });

  for (let r = 0; r < n; r++) {
    const ch = s[r];
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const dup = (counts.get(ch) ?? 0) > 1;
    steps.push({
      title: dup ? `Add '${ch}': duplicate` : `Add '${ch}'`, tag: 'EXPAND:',
      desc: dup
        ? `take in s[${r}]='${ch}' → count=${counts.get(ch)} ⚠ DUPLICATE! Shrink from the left.`
        : `take in s[${r}]='${ch}' → window [L=${l}, R=${r}]`,
      cells: cells(l, r, dup ? -1 : r, -1, dup ? r : -1), pointers: ptrs(l, r), aux: aux(), vars: vars(l, r, r - l + 1),
      alert: dup ? 'Repeated character in the window! Move L right until every count is 1 again.' : undefined,
      logic: dup ? 'The window may not hold a character twice, so it has to shrink before it can go on.' : 'A new character that is not in the window can always join.',
      logicTone: dup ? 'warn' : 'info', javaLines: [5, 4], pyLines: [4], algoStep: dup ? 1 : 0,
      note: `'${ch}' count = ${counts.get(ch)}`,
    });

    while ((counts.get(ch) ?? 0) > 1) {
      const out = s[l];
      const c = (counts.get(out) ?? 0) - 1;
      if (c === 0) counts.delete(out);
      else counts.set(out, c);
      l++;
      const still = (counts.get(ch) ?? 0) > 1;
      steps.push({
        title: `Shrink: drop '${out}'`, tag: 'SHRINK:',
        desc: `remove s[${l - 1}]='${out}' → L moves to ${l} ${still ? '· still a duplicate' : '✓ valid!'}`,
        cells: cells(l, r, -1, l - 1), pointers: ptrs(l, r), aux: aux(), vars: vars(l, r, r - l + 1),
        alert: still ? 'Repeated character in the window! Move L right until every count is 1 again.' : undefined,
        logic: still ? 'The repeat is still inside, so keep dropping from the left.' : 'The repeat has left the window, so every count is 1 again.',
        logicTone: 'warn', javaLines: [8, 9, 7], pyLines: [7, 6, 8, 9, 10], algoStep: 1,
        note: `'${out}' leaves, left = ${l}`,
      });
    }

    const len = r - l + 1;
    const improved = len > best;
    const old = best;
    if (improved) { best = len; bestL = l; }
    steps.push({
      title: improved ? `Update: new best ${len}` : `Update: ${len} does not beat ${old}`, tag: 'UPDATE:',
      desc: improved ? `len=${len} → 🏆 NEW BEST! result = ${best} (window "${s.slice(l, r + 1)}")` : `len=${len} → result = max(${old},${len}) = ${best}`,
      cells: cells(l, r), pointers: ptrs(l, r), aux: aux(), vars: vars(l, r, len),
      logic: improved ? 'Longer than anything seen before, so record it.' : 'A valid window, but not longer than the best.',
      logicTone: improved ? 'success' : 'info', javaLines: [11], pyLines: [11], algoStep: 2,
      note: `= ${best}`,
    });
  }

  const bestR = bestL + best - 1;
  const bestCounts = new Map<string, number>();
  for (const c of s.slice(bestL, bestL + best)) bestCounts.set(c, (bestCounts.get(c) ?? 0) + 1);
  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: best > 0 ? `result = ${best}: the longest window without a repeat is "${s.slice(bestL, bestL + best)}" (indices ${bestL}–${bestR})` : 'the string is empty, result = 0',
    cells: cells(0, -1, -1, -1, -1, true), pointers: best > 0 ? ptrs(bestL, bestR) : [], aux: aux(bestCounts), vars: vars(bestL, bestR, best),
    logic: 'Highlighted is the first window that reached the maximum length.', logicTone: 'success', javaLines: [13], pyLines: [12], algoStep: 3,
    note: `= ${best}`,
    result: { title: String(best), text: `"${s.slice(bestL, bestL + best)}"` },
  });
  return steps;
}

export const longestSubstringWithoutRepeating: ProblemDef<In> = {
  slug: '3-longest-substring-without-repeating-characters',
  id: '3', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'Strings', tag: 'sliding window + counts',
  statement: 'Given a string s, return the length of the longest substring with no repeating characters. A map of character counts describes the window: expand on the right to take in a character, shrink from the left whenever a count goes above 1.',
  emphasis: ['longest substring', 'no repeating characters'],
  constraints: '0 ≤ length ≤ 5·10⁴ (animation input: 1–12 characters, no spaces)',
  examples: [
    { label: '"pwwkew"', input: { s: 'pwwkew' }, output: '3', answer: '3 (substring "wke", indices 2–4)' },
    { label: '"abcabcbb"', input: { s: 'abcabcbb' }, output: '3' },
    { label: '"bbbbb"', input: { s: 'bbbbb' }, output: '1' },
  ],
  inputPlaceholder: 'e.g. pwwkew',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'R entering (expand)', state: 'compare' },
    { label: 'L leaving (shrink)', state: 'swap' },
    { label: 'Window contents', state: 'active' },
    { label: 'Duplicate', state: 'error' },
    { label: 'Best window', state: 'found' },
  ],
  varLabels: ['L', 'R', 'len', 'result'],
  phases: [
    { icon: '➡', label: 'EXPAND (R →)', tone: 'green' },
    { icon: '⬅', label: 'SHRINK (← L)', tone: 'orange' },
    { icon: '★', label: 'UPDATE best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Grow right, shrink left on a repeat',
    text: 'Keep a count of every character inside the window. Take in s[R]; while its count is above 1, drop s[L] and move L right; then record the window length.',
  },
  java: [
    'public int lengthOfLongestSubstring(String s) {',
    '    Map<Character, Integer> window = new HashMap<>();',
    '    int left = 0, result = 0;',
    '    for (int right = 0; right < s.length(); right++) {',
    '        char c = s.charAt(right);',
    '        window.merge(c, 1, Integer::sum);',
    '        while (window.get(c) > 1) {',
    '            char out = s.charAt(left);',
    '            if (window.merge(out, -1, Integer::sum) == 0) window.remove(out);',
    '            left++;',
    '        }',
    '        result = Math.max(result, right - left + 1);',
    '    }',
    '    return result;',
    '}',
  ],
  python: [
    'def length_of_longest_substring(s):',
    '    window = {}',
    '    left = result = 0',
    '    for right, c in enumerate(s):',
    '        window[c] = window.get(c, 0) + 1',
    '        while window[c] > 1:',
    '            out = s[left]',
    '            window[out] -= 1',
    '            if window[out] == 0:',
    '                del window[out]',
    '            left += 1',
    '        result = max(result, right - left + 1)',
    '    return result',
  ],
  algorithm: [
    'Expand: move R right and add s[R] to the window counts',
    'Shrink: while a count is above 1, remove s[L] and move L right',
    'Update: result = max(result, R − L + 1)',
    'Return result',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(min(n, alphabet))' }],
  why: 'After shrinking, the window [L..R] is the longest duplicate-free substring ending at R, because any longer one would have to include the earlier copy of s[R]. Both L and R only move forward, so each character is added and removed at most once: O(n) total.',
};
