import type { Aux, ProblemDef, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { bruteLcp, fmtArr, parseWord, suffixesSorted, tableScene } from './kitD.ts';

interface In { s: string }

const parse = (raw: string): In => ({ s: parseWord(raw, { min: 2, max: 8, what: 'the string', example: 'banana' }) });

export function suffixArrayAndLcp(s: string): { sa: number[]; lcp: number[] } {
  const sa = suffixesSorted(s);
  return { sa, lcp: bruteLcp(s, sa) };
}

function build({ s }: In): Step[] {
  const n = s.length;
  const steps: Step[] = [];
  const sorted: number[] = [];
  let pending: number[] = Array.from({ length: n }, (_, i) => i);
  let lcp: (number | null)[] = Array(n).fill(null);
  let h: number | string = '—';
  let suf: string = '—';
  let hi: { cur?: number; cmp?: number; placed?: number } = {};
  let final = false;

  const rows = () => {
    const list: { start: number; sorted: boolean; rank: number }[] = [
      ...sorted.map((p, r) => ({ start: p, sorted: true, rank: r })),
      ...pending.map((p) => ({ start: p, sorted: false, rank: -1 })),
    ];
    return tableScene(
      list.map((e) => ({
        cells: [e.start, s.slice(e.start), e.sorted && lcp[e.rank] !== null ? lcp[e.rank]! : '·'],
        cellStates: undefined,
        state: hi.cur === e.start && !(hi.placed === e.start) ? 'active' : hi.placed === e.start ? 'found' : hi.cmp === e.start ? 'compare' : !e.sorted ? 'dim' : final ? 'sorted' : undefined,
      })),
      ['start', 'suffix', 'lcp'],
      list.map((e) => (e.sorted ? String(e.rank) : '·')),
    );
  };
  const aux = (): Aux[] => [
    { title: 'SA[ ] so far (start of the suffix at each rank)', kind: 'list', items: sorted.map(String) },
    { title: 'LCP[ ] (common prefix with the previous rank)', kind: 'list', items: lcp.map((v) => (v === null ? '?' : String(v))) },
  ];
  const push = (x: Omit<Step, 'vars' | 'scene' | 'aux'>) =>
    steps.push({ ...x, scene: rows(), aux: aux(), vars: { suffix: suf, h, SA: sorted.length ? fmtArr(sorted) : '[ ]', LCP: lcp.some((v) => v !== null) ? fmtArr(lcp.map((v) => (v === null ? '?' : v))) : '[ ]' } });

  push({
    title: 'List every suffix', desc: `"${s}" has ${n} suffixes, one for each starting position. We will order them alphabetically; the order of their start positions is the suffix array.`,
    logic: 'Every substring is a prefix of some suffix, so sorting suffixes groups equal substrings next to each other.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1], algoStep: 0,
    tag: 'LIST —', note: `${n} suffixes, starts 0..${n - 1}: ${Array.from({ length: n }, (_, i) => `"${s.slice(i)}"`).join(' ')}`,
  });

  for (let k = 0; k < n; k++) {
    pending = pending.filter((p) => p !== k);
    pending.unshift(k);
    suf = `"${s.slice(k)}"`;
    hi = { cur: k };
    let pos = sorted.length;
    // compare with sorted entries from the back; the new row sits at the top of the pending block
    while (pos > 0) {
      const other = sorted[pos - 1];
      const bigger = s.slice(other) > s.slice(k);
      hi = { cur: k, cmp: other };
      push({
        title: `Compare "${s.slice(k)}" with "${s.slice(other)}"`,
        desc: bigger ? `"${s.slice(other)}" is alphabetically larger, so the new suffix belongs before it.` : `"${s.slice(other)}" is smaller or equal, so the new suffix belongs right after it.`,
        logic: 'Compare letter by letter; the first difference decides. A shorter suffix that is a prefix of the other comes first.', logicTone: 'info',
        javaLines: [4], pyLines: [1], algoStep: 1,
        tag: 'COMPARE:', note: bigger ? `"${s.slice(k)}" < "${s.slice(other)}" → move above rank ${pos - 1}` : `"${s.slice(k)}" ≥ "${s.slice(other)}" → stop, rank ${pos}`,
      });
      if (!bigger) break;
      pos--;
    }
    sorted.splice(pos, 0, k);
    pending = pending.filter((p) => p !== k);
    hi = { placed: k };
    push({
      title: `Place "${s.slice(k)}" at rank ${pos}`, desc: `Suffix ${k} is inserted at rank ${pos}; the sorted block now holds ${sorted.length} suffix${sorted.length === 1 ? '' : 'es'}.`,
      logic: 'The sorted block stays in order after every insertion, which is all a sort needs.', logicTone: 'info',
      javaLines: [4], pyLines: [1], algoStep: 1,
      tag: 'PLACE —', note: `sorted starts so far = ${fmtArr(sorted)}`,
    });
  }

  hi = {};
  suf = '—';
  const rank = Array(n).fill(0);
  sorted.forEach((p, r) => { rank[p] = r; });
  push({
    title: 'Suffix array ready', desc: `SA = ${fmtArr(sorted)}. rank[i] says where suffix i landed: rank = ${fmtArr(rank)}. Next: the LCP of every neighbouring pair.`,
    logic: 'The rank array is the inverse permutation of SA. Kasai uses it to visit suffixes by start position.', logicTone: 'success',
    javaLines: [10, 11], pyLines: [5, 6, 7], algoStep: 2,
    tag: 'RANK —', note: `rank[sa[r]] = r → rank = ${fmtArr(rank)}`,
  });

  let hh = 0;
  for (let i = 0; i < n; i++) {
    suf = `"${s.slice(i)}"`;
    const r = rank[i];
    if (r === 0) {
      lcp[0] = 0;
      hh = 0;
      h = 0;
      hi = { cur: i };
      push({
        title: `Suffix ${i} is first in order`, desc: `"${s.slice(i)}" has no predecessor, so its LCP is 0 and the carried length h resets to 0.`,
        logic: 'The first suffix in sorted order has nothing to share a prefix with.', logicTone: 'info',
        javaLines: [12, 13, 18], pyLines: [9, 10, 17, 18], algoStep: 3,
        tag: 'LCP —', note: `rank[${i}] = 0 → lcp[0] = 0, h = 0`,
      });
      continue;
    }
    const j = sorted[r - 1];
    const startH = hh;
    // Kasai: the first hh letters are already known to match
    while (i + hh < n && j + hh < n && s[i + hh] === s[j + hh]) hh++;
    lcp[r] = hh;
    h = hh;
    hi = { cur: i, cmp: j };
    push({
      title: `LCP of "${s.slice(i)}" and "${s.slice(j)}" = ${hh}`,
      desc: `Predecessor of suffix ${i} in sorted order is suffix ${j}. They share ${plural(hh, 'letter')}${startH > 0 ? ` (we start counting at h = ${startH}, the letters already known to match)` : ''}.`,
      logic: 'Kasai trick: dropping the first letter of both suffixes loses at most one letter of the common prefix, so h only goes down by 1 per step. Total work stays O(n).', logicTone: 'info',
      javaLines: [14, 15, 16], pyLines: [11, 12, 13, 14], algoStep: 3,
      tag: 'LCP —', note: `i=${i}, j=${j}: h grew ${startH} → ${hh}, lcp[${r}] = ${hh}`,
    });
    if (hh > 0) {
      hh--;
      h = hh;
      push({
        title: `Carry h = ${hh} to the next start`, desc: `Suffix ${i + 1} is suffix ${i} without its first letter, so its predecessor shares at least ${plural(hh, 'letter')}.`,
        logic: 'This carried value is why the loop is linear instead of quadratic.', logicTone: 'info',
        javaLines: [17], pyLines: [15, 16], algoStep: 3,
        tag: 'CARRY h —', note: `h = ${hh + 1} − 1 = ${hh}`,
      });
    }
  }

  final = true;
  hi = {};
  suf = '—';
  const out = lcp.map((v) => v ?? 0);
  push({
    title: 'Done', desc: `SA = ${fmtArr(sorted)} and LCP = ${fmtArr(out)}. The longest repeated substring has length ${Math.max(...out)}.`,
    logic: 'Together SA and LCP answer repeated-substring, distinct-substring and pattern-search questions.', logicTone: 'success',
    javaLines: [20], pyLines: [19], algoStep: 4,
    tag: '✅ Done!', note: `max(lcp) = ${Math.max(...out)} → longest repeated substring has length ${Math.max(...out)}`,
  });
  steps[steps.length - 1].result = { title: `SA = ${fmtArr(sorted)}`, text: `LCP = ${fmtArr(out)}` };
  return steps;
}

export const suffixArrayAndLcpProblem: ProblemDef<In> = {
  slug: 'cp-suffix-array-and-lcp-array',
  id: 'CP', title: 'Suffix Array and LCP Array', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'suffix array',
  statement: 'Given a string, list the starting positions of all its suffixes in alphabetical order (the suffix array SA), then compute LCP[r]: the length of the longest common prefix between the suffix at rank r and the suffix at rank r − 1.',
  constraints: 'Lowercase letters (animation input: 2 to 8 letters)',
  examples: [
    { label: 'banana', input: { s: 'banana' }, output: 'SA = [5, 3, 1, 0, 4, 2], LCP = [0, 1, 3, 0, 0, 2]' },
    { label: 'abracada', input: { s: 'abracada' }, output: 'SA = [7, 0, 3, 5, 1, 4, 6, 2], LCP = [0, 1, 1, 1, 0, 0, 0, 0]' },
    { label: 'aaaa', input: { s: 'aaaa' }, output: 'SA = [3, 2, 1, 0], LCP = [0, 1, 2, 3]' },
  ],
  inputPlaceholder: 'e.g. banana',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Sorted suffixes',
  legend: [{ label: 'Suffix being handled', state: 'active' }, { label: 'Compared with', state: 'compare' }, { label: 'Just placed', state: 'found' }, { label: 'Not sorted yet', state: 'dim' }],
  emphasis: ['suffix array', 'alphabetical order', 'longest common prefix'],
  phases: [
    { icon: '📋', label: 'List suffixes', tone: 'blue' },
    { icon: '🔢', label: 'Sort (insert in order)', tone: 'cyan' },
    { icon: '🔁', label: 'Build rank[]', tone: 'blue' },
    { icon: '📏', label: 'LCP with Kasai', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['suffix', 'h', 'SA', 'LCP'],
  approach: {
    title: 'Sort the suffixes, then measure neighbours',
    text: 'Write down every suffix and sort them alphabetically; the start positions in that order form the suffix array. For the LCP array, visit the suffixes by start position and compare each with its predecessor in sorted order, reusing the previous match length minus one (Kasai). That reuse makes the LCP pass linear.',
  },
  java: [
    'static int[] suffixArray(String s) {',
    '    int n = s.length();',
    '    Integer[] sa = new Integer[n];',
    '    for (int i = 0; i < n; i++) sa[i] = i;',
    '    Arrays.sort(sa, (a, b) -> s.substring(a).compareTo(s.substring(b)));',
    '    return Arrays.stream(sa).mapToInt(x -> x).toArray();',
    '}',
    '',
    'static int[] lcpArray(String s, int[] sa) {   // Kasai',
    '    int n = s.length(), h = 0;',
    '    int[] rank = new int[n], lcp = new int[n];',
    '    for (int i = 0; i < n; i++) rank[sa[i]] = i;',
    '    for (int i = 0; i < n; i++) {',
    '        if (rank[i] > 0) {',
    '            int j = sa[rank[i] - 1];',
    '            while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;',
    '            lcp[rank[i]] = h;',
    '            if (h > 0) h--;',
    '        } else h = 0;',
    '    }',
    '    return lcp;',
    '}',
  ],
  python: [
    'def suffix_array(s):',
    '    return sorted(range(len(s)), key=lambda i: s[i:])',
    '',
    'def lcp_array(s, sa):          # Kasai',
    '    n, h = len(s), 0',
    '    rank = [0] * n',
    '    for r, i in enumerate(sa):',
    '        rank[i] = r',
    '    lcp = [0] * n',
    '    for i in range(n):',
    '        if rank[i] > 0:',
    '            j = sa[rank[i] - 1]',
    '            while i + h < n and j + h < n and s[i + h] == s[j + h]:',
    '                h += 1',
    '            lcp[rank[i]] = h',
    '            if h > 0:',
    '                h -= 1',
    '        else:',
    '            h = 0',
    '    return lcp',
  ],
  algorithm: [
    'List every suffix by its starting position',
    'Sort the suffixes alphabetically; the starts in that order are SA',
    'Build rank[], the inverse of SA',
    'For each start i, compare suffix i with its predecessor in SA, beginning at h and shrinking h by one afterwards',
    'Return SA and LCP',
  ],
  complexity: [{ label: 'Time', value: 'O(n log² n) sort + O(n) LCP' }, { label: 'Space', value: 'O(n)' }],
  why: 'Sorting puts suffixes with a common prefix next to each other, so the LCP of any two suffixes is the minimum LCP between them in sorted order and adjacent pairs are enough. For Kasai, if suffix i shares h letters with its predecessor j, then suffix i + 1 shares at least h − 1 with suffix j + 1, which sorts earlier than suffix i + 1 in the same neighbourhood, so h never has to restart from zero and the total letter comparisons are at most 2n.',
};
