import type { ProblemDef, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { fmtArr, suffixesSorted, tableScene } from './kitD.ts';

interface In { s: string; p: string }

function parse(raw: string): In {
  const t = raw.trim().toLowerCase().split(/[\s,|]+/).filter(Boolean);
  if (t.length !== 2) throw new Error('Write the text and the pattern separated by a space, e.g. banana ana');
  const [s, p] = t;
  if (!/^[a-z]+$/.test(s) || !/^[a-z]+$/.test(p)) throw new Error('Use lowercase letters only, e.g. banana ana');
  if (s.length < 2 || s.length > 8) throw new Error('The text must have 2 to 8 letters');
  if (p.length > 4) throw new Error('Keep the pattern to 4 letters or fewer');
  return { s, p };
}

export function searchPositions(s: string, p: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + p.length <= s.length; i++) if (s.startsWith(p, i)) out.push(i);
  return out;
}


function build({ s, p }: In): Step[] {
  const n = s.length;
  const m = p.length;
  const sa = suffixesSorted(s);
  const head = (r: number) => s.slice(sa[r], sa[r] + m);
  const steps: Step[] = [];
  let phase = 'build';
  let lo: number | string = '—';
  let hi: number | string = '—';
  let mid: number | string = '—';
  let hd = '—';
  let found: [number, number] | null = null;
  let bounds: [number, number] = [0, n];
  let midRow: number | null = null;
  let boundRow: number | null = null;

  const scene = () =>
    tableScene(
      sa.map((start, r) => {
        const inFound = found && r >= found[0] && r < found[1];
        const outside = !found && (r < bounds[0] || r >= bounds[1]);
        return {
          cells: [start, s.slice(start), head(r)],
          state: inFound ? 'found' : midRow === r ? 'active' : boundRow === r ? 'compare' : outside ? 'dim' : undefined,
        };
      }),
      ['start', 'suffix', `first ${m}`],
      sa.map((_, r) => {
        const tags: string[] = [];
        if (!found && r === bounds[0]) tags.push('lo');
        if (!found && r === bounds[1]) tags.push('hi');
        if (midRow === r) tags.push('mid');
        return tags.length ? `${r} ${tags.join('/')}` : String(r);
      }),
    );
  const push = (x: Omit<Step, 'vars' | 'scene'>) => steps.push({ ...x, scene: scene(), vars: { phase, lo, hi, mid, head: hd } });

  push({
    title: 'Sorted suffix table', desc: `The suffix array of "${s}" lists the suffixes in order. Any occurrence of "${p}" is a prefix of some suffix, and those suffixes sit in one contiguous block.`,
    logic: 'Sorted order puts all suffixes that start with the same letters next to each other, so a binary search can find the block.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0], algoStep: 0,
    tag: 'SUFFIX TABLE —', note: `SA = ${fmtArr(sa)}, pattern "${p}" has m = ${m} letter${m === 1 ? '' : 's'}`,
  });

  const bound = (strict: boolean): number => {
    phase = strict ? 'upper' : 'lower';
    boundRow = null;
    let a = 0;
    let b = n;
    while (a < b) {
      const md = Math.floor((a + b) / 2);
      const hh = head(md);
      const goRight = hh < p || (strict && hh === p);
      bounds = [a, b];
      midRow = md;
      lo = a; hi = b; mid = md; hd = `"${hh}"`;
      push({
        title: `mid = ${md}: "${hh}" vs "${p}"`,
        desc: goRight
          ? `The head "${hh}" (first ${plural(m, 'letter')}, or the whole suffix if shorter) ${hh === p ? 'equals the pattern, and we want the end of the block' : 'sorts before the pattern'}, so everything up to rank ${md} is too small: lo = ${md + 1}.`
          : `"${hh}" ${hh === p ? 'matches the pattern, and we want the start of the block' : 'sorts after the pattern'}, so the boundary is at or before rank ${md}: hi = ${md}.`,
        logic: strict ? 'Upper bound: skip suffixes whose prefix is smaller than OR equal to the pattern.' : 'Lower bound: skip only suffixes whose prefix is strictly smaller than the pattern.', logicTone: 'info',
        javaLines: [12, 13, 14, 15, goRight ? 16 : 17], pyLines: [7, 8, 9, 10, goRight ? 11 : 13], algoStep: strict ? 2 : 1,
        tag: strict ? 'UPPER BOUND:' : 'LOWER BOUND:',
        note: `mid = (${a} + ${b}) / 2 = ${md}, head "${hh}" ${hh < p ? '<' : hh === p ? '=' : '>'} "${p}" → ${goRight ? `lo = ${md + 1}` : `hi = ${md}`}`,
      });
      if (goRight) a = md + 1;
      else b = md;
    }
    bounds = [a, a];
    midRow = null;
    boundRow = a < n ? a : null;
    lo = a; hi = a; mid = '—';
    push({
      title: `${strict ? 'Upper' : 'Lower'} bound = rank ${a}`,
      desc: strict ? `Rank ${a} is the first suffix whose prefix is greater than "${p}".` : `Rank ${a} is the first suffix whose prefix is at least "${p}".`,
      logic: 'The search window is empty: lo = hi is the boundary.', logicTone: 'success',
      javaLines: [19], pyLines: [14], algoStep: strict ? 2 : 1,
      tag: strict ? 'UPPER FOUND —' : 'LOWER FOUND —', note: `lo = hi = ${a} → ${strict ? 'upper' : 'lower'} bound = ${a}`,
    });
    return a;
  };

  const L = bound(false);
  const U = bound(true);
  found = [L, U];
  midRow = null;
  boundRow = null;
  const pos = sa.slice(L, U).sort((x, y) => x - y);
  lo = L; hi = U;
  push({
    title: U > L ? `Ranks ${L}..${U - 1} match` : 'No suffix starts with the pattern', desc: U > L ? `Suffixes at ranks ${L} to ${U - 1} start with "${p}": positions ${fmtArr(sa.slice(L, U))}. Sorted: ${fmtArr(pos)}.` : `The lower and upper bound coincide at rank ${L}, so the block is empty: "${p}" does not occur in "${s}".`,
    logic: 'The number of matches is hi − lo, and the block gives their start positions.', logicTone: U > L ? 'success' : 'warn',
    javaLines: [4, 5, 6, 7], pyLines: [3], algoStep: 3,
    tag: '✅ Done!', note: `hi − lo = ${U} − ${L} = ${U - L} match${U - L === 1 ? '' : 'es'}`,
    alert: U > L ? undefined : `No suffix of "${s}" starts with "${p}": the block [${L}, ${U}) is empty.`,
    result: { title: `${pos.length} match${pos.length === 1 ? '' : 'es'}`, text: `at ${fmtArr(pos)}` },
  });
  return steps;
}

export const patternSearchSuffixArray: ProblemDef<In> = {
  slug: 'cp-pattern-search-with-a-suffix-array',
  id: 'CP', title: 'Pattern Search with a Suffix Array', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'suffix array + binary search',
  statement: 'Given a text and a pattern, report how many times the pattern occurs and where. Use the sorted suffix array: all suffixes that begin with the pattern form one contiguous block, found by two binary searches (lower and upper bound).',
  constraints: 'Lowercase letters (animation input: text 2 to 8 letters, pattern up to 4 letters; write them as "text pattern")',
  examples: [
    { label: 'banana ana', input: { s: 'banana', p: 'ana' }, output: '2 matches at [1, 3]' },
    { label: 'abracada a', input: { s: 'abracada', p: 'a' }, output: '4 matches at [0, 3, 5, 7]' },
    { label: 'banana nab', input: { s: 'banana', p: 'nab' }, output: '0 matches at []' },
  ],
  inputPlaceholder: 'e.g. banana ana   (text, space, pattern)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Suffix array search',
  legend: [{ label: 'mid being tested', state: 'active' }, { label: 'Matching block', state: 'found' }, { label: 'Boundary found', state: 'compare' }, { label: 'Outside [lo, hi)', state: 'dim' }],
  emphasis: ['how many times', 'sorted suffix array', 'contiguous block', 'lower and upper bound'],
  phases: [
    { icon: '📋', label: 'Sorted suffix table', tone: 'blue' },
    { icon: '⬅️', label: 'Lower bound (first ≥ p)', tone: 'cyan' },
    { icon: '➡️', label: 'Upper bound (first > p)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['phase', 'lo', 'hi', 'mid', 'head'],
  approach: {
    title: 'Two binary searches on sorted suffixes',
    text: 'Compare only the first m letters of each suffix with the pattern. The lower bound finds the first suffix whose prefix is at least the pattern; the upper bound finds the first whose prefix is strictly greater. Every suffix between them starts with the pattern, so hi − lo is the count and the suffix array entries there are the positions.',
  },
  java: [
    'static List<Integer> search(String s, int[] sa, String p) {',
    '    int m = p.length();',
    '    int lo = lowerBound(s, sa, p, false);        // first suffix >= p',
    '    int hi = lowerBound(s, sa, p, true);         // first suffix > p',
    '    List<Integer> out = new ArrayList<>();',
    '    for (int k = lo; k < hi; k++) out.add(sa[k]);',
    '    Collections.sort(out);',
    '    return out;',
    '}',
    '',
    'static int lowerBound(String s, int[] sa, String p, boolean strict) {',
    '    int lo = 0, hi = sa.length, m = p.length();',
    '    while (lo < hi) {',
    '        int mid = (lo + hi) / 2;',
    '        String head = s.substring(sa[mid], Math.min(s.length(), sa[mid] + m));',
    '        int cmp = head.compareTo(p);',
    '        if (cmp < 0 || (strict && cmp == 0)) lo = mid + 1;',
    '        else hi = mid;',
    '    }',
    '    return lo;',
    '}',
  ],
  python: [
    'def search(s, sa, p):',
    '    lo = lower_bound(s, sa, p, False)     # first suffix >= p',
    '    hi = lower_bound(s, sa, p, True)      # first suffix > p',
    '    return sorted(sa[lo:hi])',
    '',
    'def lower_bound(s, sa, p, strict):',
    '    lo, hi, m = 0, len(sa), len(p)',
    '    while lo < hi:',
    '        mid = (lo + hi) // 2',
    '        head = s[sa[mid]:sa[mid] + m]',
    '        if head < p or (strict and head == p):',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid',
    '    return lo',
  ],
  algorithm: [
    'Build the suffix array (the sorted suffix table)',
    'Lower bound: binary search the first suffix whose first m letters are >= pattern',
    'Upper bound: binary search the first suffix whose first m letters are > pattern',
    'Ranks [lo, hi) match: collect their start positions',
  ],
  complexity: [{ label: 'Time', value: 'O(m log n) per query' }, { label: 'Space', value: 'O(n) for the array' }],
  why: 'In sorted order, the suffixes beginning with the pattern are exactly those whose first m letters equal it, and sorting by whole suffix also sorts them by first m letters, so they are contiguous. The comparison "prefix < pattern" is monotone along the array (false … false, true … true flipped appropriately), which is what makes binary search valid for both boundaries.',
};
