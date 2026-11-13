/** Pack p8 Manacher problems: Manacher's Algorithm (longest palindrome), Palindromic Substrings via Manacher, Shortest Palindrome (#214). */
import type { Cell, ProblemDef, Step, Tone } from '../engine/types.ts';
import { Rec, idx, quote, word } from './p8Kit.ts';

const mJava = [
  'String t = "#" + String.join("#", s.split("")) + "#";',
  'int N = t.length();',
  'int[] p = new int[N];',
  'int c = 0, r = 0;',
  'for (int i = 0; i < N; i++) {',
  '    if (i < r) p[i] = Math.min(r - i, p[2 * c - i]);',
  '    while (i - p[i] - 1 >= 0 && i + p[i] + 1 < N && t.charAt(i - p[i] - 1) == t.charAt(i + p[i] + 1)) p[i]++;',
  '    if (i + p[i] > r) { c = i; r = i + p[i]; }',
  '}',
];
const mPy = [
  "t = '#' + '#'.join(s) + '#'",
  'N = len(t)',
  'p = [0] * N',
  'c = r = 0',
  'for i in range(N):',
  '    if i < r:',
  '        p[i] = min(r - i, p[2 * c - i])',
  '    while i - p[i] - 1 >= 0 and i + p[i] + 1 < N and t[i - p[i] - 1] == t[i + p[i] + 1]:',
  '        p[i] += 1',
  '    if i + p[i] > r:',
  '        c, r = i, i + p[i]',
];
const ind = (lines: string[], by: string) => lines.map((l) => by + l);

type P = (number | undefined)[];

type Extra = (k: number) => { top?: Cell['state']; bottom?: Cell['state']; tone?: Tone };
interface Opts { box?: [number, number] | null; cur?: number; mirror?: number; span?: [number, number] | null; extra?: Extra; thirdRow?: { head: string; cells: (number | string)[] } }

function mGrid(t: string, p: P, o: Opts = {}) {
  const { box = null, cur = -1, mirror = -1, span = null } = o;
  const extra: Extra = o.extra ?? (() => ({}));
  const top: Cell[] = [...t].map((ch, k) => {
    const x = extra(k);
    const inBox = box && k >= box[0] && k <= box[1];
    const inSpan = span && k >= span[0] && k <= span[1];
    return { key: `t${k}`, value: ch, state: x.top ?? (k === cur ? 'compare' : k === mirror ? 'swap' : inSpan ? 'found' : undefined), tone: x.tone ?? (inBox ? ('purple' as Tone) : undefined) };
  });
  const bot: Cell[] = p.map((v, k) => ({ key: `p${k}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : extra(k).bottom ?? (k === cur ? 'found' : undefined) }));
  const rows = [top, bot];
  const rowHeads = ['t', 'p'];
  if (o.thirdRow) {
    rows.push(o.thirdRow.cells.map((v, k) => ({ key: `c${k}`, value: v, state: extra(k).bottom })));
    rowHeads.push(o.thirdRow.head);
  }
  return { kind: 'grid' as const, variant: 'table' as const, rows, rowHeads, colHeads: idx(t.length) };
}

interface MCtx {
  rec: Rec;
  s: string;
  jo: number;
  po: number;
  intro: string;
}

const VARS = ['i', 'c', 'r', 'p[i]'];
const vars = (i: number | string, c: number | string, r: number | string, pi: number | string) => ({ i, c, r, 'p[i]': pi });

function manacher(ctx: MCtx): { t: string; p: number[] } {
  const { rec, s } = ctx;
  const t = `#${[...s].join('#')}#`;
  const N = t.length;
  const p: P = Array(N).fill(undefined);
  const J = (...k: number[]) => k.map((x) => x + ctx.jo);
  const Pp = (...k: number[]) => k.map((x) => x + ctx.po);
  rec.push({ t: 'Start: interleave "#" between letters', d: `${ctx.intro} t = "${t}": a "#" between letters gives every palindrome a centre. p[i] = radius at t[i], equal to the palindrome's length in s.`, scene: mGrid(t, p), v: vars('—', 0, 0, '—'), why: 'In t every palindrome is odd, so one loop covers both odd and even palindromes of s. The radius p[i] in t equals the palindrome length in s.', j: J(0, 1, 2, 3), p: Pp(0, 1, 2, 3), a: 0, tag: 'INTERLEAVE —', note: `t = "${t}", N = ${N}; c = 0, r = 0` });
  let c = 0;
  let r = 0;
  for (let i = 0; i < N; i++) {
    const inside = i < r;
    const oldBox: [number, number] | null = r > c || p[c] !== undefined ? [c - (p[c] ?? 0), c + (p[c] ?? 0)] : null;
    const mirror = inside ? 2 * c - i : -1;
    let k = 0;
    const [cOld, rOld] = [c, r];
    let how = i === 0 ? 'first position, nothing on its left' : `outside the box (r=${rOld}): start at 0`;
    let seed = '0';
    if (inside) {
      k = Math.min(r - i, p[mirror]!);
      how = `inside box (c=${cOld}, r=${rOld}): mirror ${mirror} has p=${p[mirror]}, cap ${r - i} → start ${k}`;
      seed = `min(${r - i}, p[${mirror}] = ${p[mirror]}) = ${k}`;
    }
    const start = k;
    while (i - k - 1 >= 0 && i + k + 1 < N && t[i - k - 1] === t[i + k + 1]) k++;
    p[i] = k;
    const ext = k - start;
    let updated = false;
    if (i + k > r) { c = i; r = i + k; updated = true; }
    const note = `p[${i}] = ${seed}${ext > 0 ? ` + ${ext} compared = ${k}` : ''}; ${updated ? `box → c = ${c}, r = ${r}` : `box stays c = ${cOld}, r = ${rOld}`}`;
    const desc = `${how}${ext > 0 ? `, then ${ext} more match${ext > 1 ? 'es' : ''}` : ''} → p[${i}]=${k}${updated ? `. New box: c=${c}, r=${r}` : ''}.`;
    rec.push({
      tag: ext > 0 ? `p[${i}] — EXTEND` : inside ? `p[${i}] — MIRROR` : `p[${i}] — NO MATCH`, note,
      t: `i=${i}: p[${i}] = ${k}`, d: desc,
      scene: mGrid(t, p, { box: inside ? oldBox : null, cur: i, mirror, span: k > 0 ? [i - k, i + k] : null }), v: vars(i, c, r, k),
      why: inside ? 'Inside a palindrome, the left half mirrors the right half, so the palindrome around the mirror position has the same radius, capped by the box edge. Only when it reaches the edge are fresh comparisons needed, and these push r right.' : 'Direct comparisons push the right edge r forward; r never moves left, so all comparisons together are O(n).',
      tone: k > 0 ? 'success' : 'info',
      j: [...J(4), ...(inside ? J(5) : []), ...J(6), ...(updated ? J(7) : [])], p: [...Pp(4), ...(inside ? Pp(5, 6) : []), ...Pp(7, 8), ...(updated ? Pp(9, 10) : [])], a: 1,
    });
  }
  return { t, p: p as number[] };
}

const LEGEND = [{ label: 'Centre i being computed', state: 'compare' as const }, { label: 'Mirror of i around the box centre', state: 'swap' as const }, { label: 'Palindrome around i', state: 'found' as const }, { label: 'Not computed yet', state: 'dim' as const }];

interface WIn { s: string }
const parseWord = (raw: string): WIn => ({ s: word(raw, { max: 9, what: 'string' }) });

/* --------------------------------------------------------------------- Manacher longest palindrome */
function buildLongest({ s }: WIn): Step[] {
  const rec = new Rec();
  const { t, p } = manacher({ rec, s, jo: 1, po: 1, intro: 'Longest palindromic substring.' });
  let best = 0;
  let ctr = 0;
  p.forEach((v, i) => { if (v > best) { best = v; ctr = i; } });
  const sub = s.slice((ctr - best) / 2, (ctr + best) / 2);
  rec.push({ t: `Largest radius: p[${ctr}] = ${best}`, d: `The biggest p value is ${best}, centred at t[${ctr}]. In s it covers indices ${(ctr - best) / 2} to ${(ctr + best) / 2 - 1}: "${sub}".`, scene: mGrid(t, p, { span: [ctr - best, ctr + best], extra: (k) => (k === ctr ? { top: 'compare' as const, bottom: 'found' as const } : {}) }), v: vars('—', '—', '—', best), why: 'Every palindromic substring of s is centred somewhere in t, so the maximum radius is the longest palindrome.', tone: 'success', j: [10, 11], p: [12], a: 2, tag: 'READ MAX —', note: `best = p[${ctr}] = ${best}, ctr = ${ctr}` });
  rec.push({ t: `Answer: ${quote(sub)}`, d: `Length ${best}, found in a single left-to-right pass over ${t.length} positions.`, scene: mGrid(t, p, { span: [ctr - best, ctr + best] }), v: vars('—', '—', '—', best), why: 'Linear time, versus O(n²) for expanding around every centre from scratch.', tone: 'success', j: [12], p: [13], a: 3, tag: '✅ Done!', note: `s.substring(${(ctr - best) / 2}, ${(ctr + best) / 2}) = ${quote(sub)}`, result: { title: quote(sub), text: `Longest palindromic substring: ${quote(sub)}` } });
  return rec.steps;
}

export const manachersAlgorithm: ProblemDef<WIn> = {
  slug: 'alg-manachers-algorithm', id: 'ALG', title: "Manacher's Algorithm", difficulty: 'Hard', category: 'Strings', tag: 'palindrome radii in O(n)',
  statement: 'Find the longest palindromic substring in linear time. Manacher\'s algorithm computes, for every centre, the radius of the largest palindrome around it, reusing the radii of mirrored positions inside the palindrome that reaches furthest right.',
  constraints: 'Lowercase letters (animation input: 1–9 letters; the interleaved string has up to 19 cells)',
  examples: [
    { label: 'babad', input: { s: 'babad' }, output: '"bab"' },
    { label: 'cbbd', input: { s: 'cbbd' }, output: '"bb"' },
    { label: 'abacabad', input: { s: 'abacabad' }, output: '"abacaba"' },
  ],
  inputPlaceholder: 'e.g. babad', parseInput: parseWord, buildSteps: buildLongest, viz: 'cells', vizTitle: 'Interleaved string t and radii p',
  legend: LEGEND, varLabels: VARS,
  emphasis: ['longest palindromic substring', 'linear time', 'radius'],
  phases: [
    { icon: '✂', label: 'Phase 1: Interleave "#"', tone: 'blue' },
    { icon: '🪞', label: 'Phase 2: Mirror + extend each centre', tone: 'cyan' },
    { icon: '📏', label: 'Phase 3: Read the largest p', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Mirror the radius inside the biggest palindrome', text: 'Insert "#" between letters so all palindromes are odd. Keep the palindrome that reaches furthest right (centre c, right edge r). For a new centre i inside it, the mirror 2c − i has a known radius, and the palindrome at i is at least that big (capped at the edge); only then try to extend by comparing characters.' },
  java: [
    'public String longestPalindrome(String s) {',
    ...ind(mJava, '    '),
    '    int best = 0, ctr = 0;',
    '    for (int i = 0; i < N; i++) if (p[i] > best) { best = p[i]; ctr = i; }',
    '    return s.substring((ctr - best) / 2, (ctr + best) / 2);',
    '}',
  ],
  python: [
    'def longest_palindrome(s):',
    ...ind(mPy, '    '),
    '    best = max(range(N), key=lambda i: p[i])',
    '    return s[(best - p[best]) // 2:(best + p[best]) // 2]',
  ],
  algorithm: ['Interleave "#" so every palindrome has a centre', 'For each centre i: start at min(r − i, p[2c − i]) inside the box (centre c, edge r), else at 0; extend by comparing and update (c, r)', 'Read the largest radius p[i]: it is the longest palindrome', 'Return that substring'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Inside the palindrome centred at c the characters are mirrored, so the palindrome at i matches the palindrome at its mirror 2c − i as long as it stays inside the box. If the mirror radius ends strictly inside, the radius at i is exactly that. Otherwise it is at least r − i and we extend, which moves r. r only increases (≤ 2n+1), so extension comparisons total O(n).',
};

/* ---------------------------------------------------------------- Palindromic Substrings via Manacher */
function buildCount({ s }: WIn): Step[] {
  const rec = new Rec();
  const { t, p } = manacher({ rec, s, jo: 1, po: 1, intro: 'Count all palindromic substrings.' });
  const per = p.map((v) => (v + 1) >> 1);
  const total = per.reduce((a, b) => a + b, 0);
  rec.push({ t: 'Each centre contributes ⌈p[i] / 2⌉ palindromes', d: `Around one centre the palindromes nest: radii 1…p[i]. In s that is ⌈p[i]/2⌉ substrings: odd lengths from a letter centre, even from a "#" centre.`, scene: mGrid(t, p, { thirdRow: { head: '⌈p/2⌉', cells: per }, extra: (k) => (per[k] > 0 ? { bottom: 'found' as const } : {}) }), v: vars('—', '—', '—', total), why: 'Every palindromic substring has exactly one centre, and shrinking a palindrome by one letter on each side gives another palindrome with the same centre.', tone: 'success', j: [10, 11], p: [12], a: 2, tag: 'PER CENTRE —', note: `⌈p/2⌉ per centre = [${per.join(', ')}]` });
  rec.push({ t: `Total = ${per.join(' + ')} = ${total}`, d: `${total} palindromic substring${total === 1 ? '' : 's'} (counted with multiplicity by position).`, scene: mGrid(t, p, { thirdRow: { head: '⌈p/2⌉', cells: per } }), v: vars('—', '—', '—', total), why: 'One Manacher pass replaces n separate expand-around-centre scans, from O(n²) to O(n).', tone: 'success', j: [12], p: [12], a: 3, tag: '✅ Done!', note: `total = ${per.join(' + ')} = ${total}`, result: { title: String(total), text: `${total} palindromic substrings` } });
  return rec.steps;
}

export const palindromicSubstringsManacher: ProblemDef<WIn> = {
  slug: 'cp-palindromic-substrings-via-manacher', id: 'CP', title: 'Palindromic Substrings via Manacher', difficulty: 'Medium', category: 'Strings', tag: 'Manacher radii, counting',
  statement: 'Count the palindromic substrings of s (substrings at different positions count separately, even if their text is equal) in linear time by summing, over all centres, how many palindromes are centred there.',
  constraints: 'Lowercase letters (animation input: 1–9 letters)',
  examples: [
    { label: 'abc', input: { s: 'abc' }, output: '3' },
    { label: 'aaa', input: { s: 'aaa' }, output: '6' },
    { label: 'abaab', input: { s: 'abaab' }, output: '8' },
  ],
  inputPlaceholder: 'e.g. aaa', parseInput: parseWord, buildSteps: buildCount, viz: 'cells', vizTitle: 'Interleaved string t, radii p and counts',
  legend: LEGEND, varLabels: VARS,
  emphasis: ['palindromic substrings', 'linear time', 'centres'],
  phases: [
    { icon: '✂', label: 'Phase 1: Interleave "#"', tone: 'blue' },
    { icon: '🪞', label: 'Phase 2: Mirror + extend each centre', tone: 'cyan' },
    { icon: '🔢', label: 'Phase 3: ⌈p/2⌉ per centre', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Count palindromes per centre', text: 'Run Manacher to get p[i] for every centre in the interleaved string. A centre with radius p[i] has ⌈p[i]/2⌉ palindromes (its radius can be cut back one letter at a time). Add them all up.' },
  java: [
    'public int countSubstrings(String s) {',
    ...ind(mJava, '    '),
    '    int total = 0;',
    '    for (int v : p) total += (v + 1) / 2;',
    '    return total;',
    '}',
  ],
  python: [
    'def count_substrings(s):',
    ...ind(mPy, '    '),
    '    return sum((v + 1) // 2 for v in p)',
  ],
  algorithm: ['Interleave "#" and run Manacher to get every radius p[i]', 'A centre with radius p[i] holds ⌈p[i] / 2⌉ palindromic substrings', 'Add the contributions of all centres', 'Return the sum'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'A palindrome is determined by its centre and its length. For a fixed centre in t, palindromes of radius 1..p[i] all exist (trimming symmetric ends keeps the property); radii that begin and end on "#" correspond to the empty palindrome and are not substrings, which leaves ⌈p[i]/2⌉ non-empty ones.',
};

/* -------------------------------------------------------------------------- #214 Shortest Palindrome */
function buildShortest({ s }: WIn): Step[] {
  const rec = new Rec();
  const { t, p } = manacher({ rec, s, jo: 1, po: 1, intro: 'Shortest palindrome by adding letters in front.' });
  let L = 0;
  p.forEach((v, i) => { if (i - v === 0) L = Math.max(L, v); });
  const touch = (k: number) => k - p[k] === 0;
  rec.push({ t: `Palindromes that start at the front: longest has length ${L}`, d: `A centre with i − p[i] = 0 has a palindrome reaching the first letter, i.e. a palindromic prefix. The longest has length ${L}: "${s.slice(0, L)}".`, scene: mGrid(t, p, { span: [0, 2 * L], extra: (k) => (touch(k) ? { bottom: 'found' as const } : {}) }), v: vars('—', '—', '—', L), why: 'The part of s after the palindromic prefix is what has to be mirrored in front, so we want the prefix as long as possible.', tone: 'success', j: [10, 11], p: [12], a: 2, tag: 'PREFIX —', note: `L = max p[i] where i − p[i] = 0 → ${L}` });
  const add = [...s.slice(L)].reverse().join('');
  const ans = add + s;
  rec.push({ t: `Answer: ${quote(ans)}`, d: `Reverse the remaining "${s.slice(L)}" → "${add}" and put it in front of s.`, scene: mGrid(t, p, { span: [0, 2 * L] }), v: vars('—', '—', '—', L), why: 'The result reads the same both ways: the added letters mirror the non-palindromic tail, and the prefix palindrome sits in the middle.', tone: 'success', j: [12], p: [13], a: 3, tag: '✅ Done!', note: `rev("${s.slice(L)}") + s = ${quote(ans)}`, result: { title: quote(ans), text: `Shortest palindrome: ${quote(ans)}` } });
  return rec.steps;
}

export const shortestPalindrome: ProblemDef<WIn> = {
  slug: '214-shortest-palindrome', id: '214', title: 'Shortest Palindrome', difficulty: 'Hard', category: 'Strings', tag: 'Manacher: longest palindromic prefix',
  statement: 'You may add characters only at the front of s. Return the shortest palindrome you can obtain this way. The key is the longest palindromic prefix of s.',
  constraints: '0 ≤ s.length ≤ 5·10⁴, lowercase letters (animation input: 1–9 letters)',
  examples: [
    { label: 'aacecaaa', input: { s: 'aacecaaa' }, output: '"aaacecaaa"' },
    { label: 'abcd', input: { s: 'abcd' }, output: '"dcbabcd"' },
    { label: 'racecar', input: { s: 'racecar' }, output: '"racecar"' },
  ],
  inputPlaceholder: 'e.g. aacecaaa', parseInput: parseWord, buildSteps: buildShortest, viz: 'cells', vizTitle: 'Interleaved string t and radii p',
  legend: LEGEND, varLabels: VARS,
  emphasis: ['add characters only at the front', 'shortest palindrome', 'longest palindromic prefix'],
  phases: [
    { icon: '✂', label: 'Phase 1: Interleave "#"', tone: 'blue' },
    { icon: '🪞', label: 'Phase 2: Mirror + extend each centre', tone: 'cyan' },
    { icon: '🔝', label: 'Phase 3: Longest palindromic prefix', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Longest palindromic prefix via radii', text: 'Whatever is not part of a palindromic prefix has to be mirrored in front of s. So find the longest palindromic prefix: with Manacher, it is the largest p[i] among centres whose palindrome touches the start of t (i − p[i] = 0). Reverse the rest and prepend it.' },
  java: [
    'public String shortestPalindrome(String s) {',
    ...ind(mJava, '    '),
    '    int L = 0;',
    '    for (int i = 0; i < N; i++) if (i - p[i] == 0) L = Math.max(L, p[i]);',
    '    return new StringBuilder(s.substring(L)).reverse() + s;',
    '}',
  ],
  python: [
    'def shortest_palindrome(s):',
    ...ind(mPy, '    '),
    '    L = max(p[i] for i in range(N) if i - p[i] == 0)',
    '    return s[L:][::-1] + s',
  ],
  algorithm: ['Interleave "#" and run Manacher for every radius', 'Keep the centres whose palindrome reaches the start (i − p[i] = 0); the longest radius L is the longest palindromic prefix', 'Reverse s[L:] and prepend it to s', 'Return the result'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'If the final answer is rev(x) + s, then rev(x) + s is a palindrome exactly when s starts with a palindrome followed by x (so that the whole thing mirrors around the prefix). The shorter the added part x, the longer the palindromic prefix. A palindromic prefix of s of length L is the palindrome of radius L around centre L in t, i.e. i − p[i] = 0.',
};
