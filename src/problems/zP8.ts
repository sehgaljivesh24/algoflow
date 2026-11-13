/** Pack p8 Z-algorithm problems: Z pattern search, Sum of Scores of Built Strings (#2223), All Periods of a String. */
import type { Aux, Cell, ProblemDef, Step, Tone } from '../engine/types.ts';
import { Rec, arr, idx, parts, word } from './p8Kit.ts';

const zJava = [
  'int[] z = new int[n];',
  'z[0] = n;',
  'for (int i = 1, l = 0, r = 0; i < n; i++) {',
  '    if (i < r) z[i] = Math.min(r - i, z[i - l]);',
  '    while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;',
  '    if (i + z[i] > r) { l = i; r = i + z[i]; }',
  '}',
];
const zPy = [
  'z = [0] * n',
  'z[0] = n',
  'l = r = 0',
  'for i in range(1, n):',
  '    if i < r:',
  '        z[i] = min(r - i, z[i - l])',
  '    while i + z[i] < n and s[z[i]] == s[i + z[i]]:',
  '        z[i] += 1',
  '    if i + z[i] > r:',
  '        l, r = i, i + z[i]',
];
const ind = (lines: string[], by: string) => lines.map((l) => by + l);

type Z = (number | undefined)[];

/** `s` on top, `z` underneath; `extra` can restyle columns (e.g. matches). */
function zGrid(s: string, z: Z, box: [number, number] | null, cur: number, mirror: number, span: [number, number] | null, extra: (k: number) => { top?: Cell['state']; bottom?: Cell['state']; tone?: Tone } = () => ({})) {
  const top: Cell[] = [...s].map((ch, k) => {
    const x = extra(k);
    const inBox = box && k >= box[0] && k < box[1];
    const inSpan = span && k >= span[0] && k < span[1];
    return { key: `s${k}`, value: ch, state: x.top ?? (k === cur ? 'compare' : k === mirror ? 'swap' : inSpan ? 'found' : undefined), tone: x.tone ?? (inBox ? ('purple' as Tone) : undefined) };
  });
  const bot: Cell[] = z.map((v, k) => ({ key: `z${k}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : extra(k).bottom ?? (k === cur ? 'found' : undefined) }));
  return { kind: 'grid' as const, variant: 'table' as const, rows: [top, bot], rowHeads: ['s', 'z'], colHeads: idx(s.length) };
}

interface ZCtx {
  rec: Rec;
  s: string;
  jo: number;
  po: number;
  vars: (i: number | string, l: number | string, r: number | string, zi: number | string) => Record<string, string | number>;
  /** optional wording for what the string is (e.g. "pattern # text") */
  intro?: string;
  aux?: (z: Z) => Aux[];
}

/** Build the Z array with one step per index. Returns z (z[0] = n). */
function zPhase(c: ZCtx): number[] {
  const { rec, s, jo, po } = c;
  const n = s.length;
  const z: Z = Array(n).fill(undefined);
  z[0] = n;
  const J = (...k: number[]) => k.map((x) => x + jo);
  const P = (...k: number[]) => k.map((x) => x + po);
  rec.push({ t: 'Start: z[0] = n', d: `${c.intro ?? 'z[i]'} = longest common prefix of s and the suffix at i; z[0] = ${n}. The Z-box [l, r) is the rightmost window known to equal a prefix.`, scene: zGrid(s, z, null, -1, -1, null), aux: c.aux?.(z), v: c.vars('—', 0, 0, n), why: 'Inside the Z-box the text is a copy of the start of s, so earlier z values can be reused instead of comparing again.', j: J(0, 1), p: P(0, 1, 2), a: 0, tag: 'READY —', note: `z[0] = n = ${n}; box [0, 0)` });
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    const oldBox: [number, number] | null = r > l ? [l, r] : null;
    const inside = i < r;
    const mirror = inside ? i - l : -1;
    let zi = 0;
    const [bl, br] = [l, r];
    let how = `outside the box [${bl}, ${br}), compare from 0`;
    let seed = '0';
    if (inside) {
      zi = Math.min(r - i, z[i - l]!);
      how = `inside box [${bl}, ${br}): min(${br} − ${i}, z[${i - bl}] = ${z[i - bl]}) = ${zi}`;
      seed = `min(${br - i}, z[${i - bl}] = ${z[i - bl]}) = ${zi}`;
    }
    const start = zi;
    while (i + zi < n && s[zi] === s[i + zi]) zi++;
    z[i] = zi;
    const ext = zi - start;
    let updated = false;
    if (i + zi > r) { l = i; r = i + zi; updated = true; }
    const note = `z[${i}] = ${seed}${ext > 0 ? ` + ${ext} compared = ${zi}` : ''}; box ${updated ? `→ [${l}, ${r})` : `stays [${bl}, ${br})`}`;
    const desc = `${how}${ext > 0 ? `, then ${ext} more match${ext > 1 ? 'es' : ''}` : ext === 0 && !inside ? ': no match' : ''} → z[${i}] = ${zi}${updated ? `. Box moves to [${l}, ${r})` : ''}.`;
    rec.push({
      tag: ext > 0 ? `z[${i}] — EXTEND` : inside ? `z[${i}] — REUSE` : `z[${i}] — NO MATCH`, note,
      t: `i=${i}: z[${i}] = ${zi}`, d: desc,
      scene: zGrid(s, z, oldBox, i, mirror, zi > 0 ? [i, i + zi] : null), aux: c.aux?.(z), v: c.vars(i, l, r, zi),
      why: inside ? 'The mirror value is exact whenever it stays strictly inside the box; only a value that reaches the box edge needs fresh comparisons, and those comparisons push r forward.' : 'Fresh comparisons here move r forward; r never moves back, so all comparisons in the whole run total O(n).',
      tone: zi > 0 ? 'success' : 'info',
      j: [...J(2), ...(inside ? J(3) : []), ...J(4), ...(updated ? J(5) : [])], p: [...P(3), ...(inside ? P(4, 5) : []), ...P(6, 7), ...(updated ? P(8, 9) : [])], a: 1,
    });
  }
  return z as number[];
}

const VARS = ['i', 'l', 'r', 'z[i]'];
const zVars = (i: number | string, l: number | string, r: number | string, zi: number | string) => ({ i, l, r, 'z[i]': zi });
const ZLEGEND = [{ label: 'Current index i (z being computed)', state: 'compare' as const }, { label: 'Mirror position inside the Z-box', state: 'swap' as const }, { label: 'Characters matching the prefix', state: 'found' as const }, { label: 'Not computed yet', state: 'dim' as const }];

/* --------------------------------------------------------------------- Z pattern search */
interface SIn { text: string; pat: string }

function parseSearch(raw: string): SIn {
  const [t, p] = parts(raw, 2, 'text ; pattern, e.g. abaabcabaab ; aab');
  return { text: word(t, { max: 12, what: 'text' }), pat: word(p, { max: 5, what: 'pattern' }) };
}

function buildSearch({ text, pat }: SIn): Step[] {
  const rec = new Rec();
  const m = pat.length;
  const s = `${pat}#${text}`;
  const z = zPhase({ rec, s, jo: 3, po: 3, vars: zVars, intro: `Z-function of pattern + "#" + text: z[i]` });
  const hits: number[] = [];
  for (let i = m + 1; i < s.length; i++) if (z[i] === m) hits.push(i - m - 1);
  const isHit = (k: number) => k > m && z[k] === m;
  rec.push({ t: hits.length ? `z[i] = ${m} at ${hits.length} position${hits.length > 1 ? 's' : ''}` : 'No z value equals the pattern length', d: hits.length ? `Wherever z[i] equals the pattern length ${m}, the pattern occurs in the text, starting at text index i − ${m + 1}: ${arr(hits)}.` : `No z value inside the text part reaches ${m}, so the pattern never occurs.`, scene: zGrid(s, z, null, -1, -1, null, (k) => (isHit(k) ? { top: 'found' as const, bottom: 'found' as const } : k === m ? { top: 'dim' as const } : {})), v: zVars('—', '—', '—', '—'), why: 'The separator "#" cannot match anything, so no z value can exceed m: z[i] = m means the whole pattern matches at that position.', tone: 'success', j: [10, 11, 12], p: [13], a: 2, tag: 'READ HITS —', note: `z[i] == ${m} at ${hits.length ? hits.map((h) => `i = ${h + m + 1}`).join(', ') : 'no i'}` });
  rec.push({ t: `Matches: ${arr(hits)}`, d: `${hits.length} occurrence${hits.length === 1 ? '' : 's'} found in one linear pass over pattern + text.`, scene: zGrid(s, z, null, -1, -1, null, (k) => (isHit(k) ? { top: 'found' as const, bottom: 'found' as const } : {})), v: zVars('—', '—', '—', '—'), why: 'Cost: O(m + n) for the Z array and O(n) to read the matches.', tone: 'success', j: [13], p: [13], a: 3, tag: '✅ Done!', note: `hits.add(i − ${m} − 1) → ${arr(hits)}`, result: { title: arr(hits), text: hits.length ? `Pattern occurs at indices ${arr(hits)}` : 'Pattern does not occur' } });
  return rec.steps;
}

export const zPatternSearch: ProblemDef<SIn> = {
  slug: 'alg-z-algorithm-pattern-search', id: 'ALG', title: 'Z-Algorithm Pattern Search', difficulty: 'Medium', category: 'Strings', tag: 'Z-array on pattern#text',
  statement: 'Find every position at which a pattern occurs in a text using the Z-function: compute z for pattern + "#" + text and report the positions where z equals the pattern length.',
  constraints: 'Lowercase letters (animation input: text ≤ 12, pattern ≤ 5; the "#" separator is added for you)',
  examples: [
    { label: 'abaabcabaab ; aab', input: { text: 'abaabcabaab', pat: 'aab' }, output: '[2,8]' },
    { label: 'aaaaa ; aa', input: { text: 'aaaaa', pat: 'aa' }, output: '[0,1,2,3]' },
    { label: 'abcde ; xyz', input: { text: 'abcde', pat: 'xyz' }, output: '[]' },
  ],
  inputPlaceholder: 'text ; pattern   e.g. abaabcabaab ; aab', parseInput: parseSearch, buildSteps: buildSearch, viz: 'cells', vizTitle: 'Z array of pattern # text',
  legend: ZLEGEND,
  varLabels: VARS,
  emphasis: ['every position', 'Z-function', 'z equals the pattern length'],
  phases: [
    { icon: '🧵', label: 'Phase 1: s = pattern # text', tone: 'blue' },
    { icon: '📦', label: 'Phase 2: Fill z with the Z-box', tone: 'cyan' },
    { icon: '🎯', label: 'Phase 3: Find z[i] = m', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Glue pattern and text, compute Z once', text: 'Concatenate pattern + "#" + text. z[i] says how far the suffix at i agrees with the start of this string, i.e. with the pattern. A value equal to the pattern length is an exact occurrence. The Z-box lets every index reuse earlier work so the whole array costs O(n).' },
  java: [
    'public List<Integer> search(String text, String pat) {',
    '    String s = pat + "#" + text;',
    '    int n = s.length(), m = pat.length();',
    ...ind(zJava, '    '),
    '    List<Integer> hits = new ArrayList<>();',
    '    for (int i = m + 1; i < n; i++)',
    '        if (z[i] == m) hits.add(i - m - 1);',
    '    return hits;',
    '}',
  ],
  python: [
    'def search(text, pat):',
    "    s = pat + '#' + text",
    '    n, m = len(s), len(pat)',
    ...ind(zPy, '    '),
    '    return [i - m - 1 for i in range(m + 1, n) if z[i] == m]',
  ],
  algorithm: ['Build s = pattern + "#" + text', 'Fill z[i] left to right, reusing the Z-box [l, r) and extending only past its edge', 'Look for entries with z[i] = m: each one is an occurrence', 'Report i − m − 1 for every such i'],
  complexity: [{ label: 'Time', value: 'O(n + m)' }, { label: 'Space', value: 'O(n + m)' }],
  why: 'Inside the Z-box [l, r) the string equals its own prefix shifted by l, so z[i] ≥ min(r − i, z[i − l]) and equality holds when z[i − l] < r − i. Only a value that reaches r needs more comparisons, and each such comparison extends r. As r only increases, total comparisons are O(n). Because "#" occurs once, z[i] ≤ m inside the text and z[i] = m exactly means the pattern matches.',
};

/* ---------------------------------------------------------- #2223 Sum of Scores of Built Strings */
interface WIn { s: string }

function buildScores({ s }: WIn): Step[] {
  const rec = new Rec();
  const aux = (z: Z): Aux[] => [{ title: 'scores so far', kind: 'list', items: z.filter((v) => v !== undefined).map(String) }];
  const z = zPhase({ rec, s, jo: 2, po: 2, vars: zVars, intro: 'score(i) = z[i]', aux });
  const sum = z.reduce((a, b) => a + b, 0);
  rec.push({ t: `Add all scores: ${z.join(' + ')}`, d: `Each built string s_i (the suffix of length i) has score z = longest common prefix with s. The total is ${sum}.`, scene: zGrid(s, z, null, -1, -1, null, () => ({ bottom: 'found' })), aux: aux(z), v: zVars('—', '—', '—', sum), why: 'The score of the suffix starting at position n − i is exactly its Z value, and z[0] = n covers the full string.', tone: 'success', j: [9, 10], p: [12], a: 2, tag: 'ADD —', note: `sum = ${z.join(' + ')} = ${sum}` });
  rec.push({ t: `Sum of scores = ${sum}`, d: `Z array ${arr(z)} sums to ${sum}.`, scene: zGrid(s, z, null, -1, -1, null, () => ({ bottom: 'found' })), aux: aux(z), v: zVars('—', '—', '—', sum), why: 'One linear Z computation replaces n separate prefix comparisons.', tone: 'success', j: [11], p: [12], a: 3, tag: '✅ Done!', note: `return ${sum}`, result: { title: String(sum), text: `Sum of scores of all built strings: ${sum}` } });
  return rec.steps;
}

export const sumOfScores: ProblemDef<WIn> = {
  slug: '2223-sum-of-scores-of-built-strings', id: '2223', title: 'Sum of Scores of Built Strings', difficulty: 'Hard', category: 'Strings', tag: 'Z-function sum',
  statement: 'Build s one character at a time by prepending: s_1 is the last character, s_2 the last two, and so on up to s_n = s. The score of s_i is the length of the longest common prefix between s_i and s. Return the sum of all scores.',
  constraints: '1 ≤ s.length ≤ 10⁵, lowercase letters (animation input: 1–12 letters)',
  examples: [
    { label: 'babab', input: { s: 'babab' }, output: '9' },
    { label: 'azbazbzaz', input: { s: 'azbazbzaz' }, output: '14' },
    { label: 'aaaa', input: { s: 'aaaa' }, output: '10' },
  ],
  inputPlaceholder: 'e.g. babab', parseInput: (raw) => ({ s: word(raw, { max: 12, what: 'string' }) }), buildSteps: buildScores, viz: 'cells', vizTitle: 'Z array of s',
  legend: ZLEGEND,
  varLabels: VARS,
  emphasis: ['score', 'longest common prefix', 'sum of all scores'],
  phases: [
    { icon: '🏁', label: 'Phase 1: z[0] = n', tone: 'blue' },
    { icon: '📦', label: 'Phase 2: Fill z with the Z-box', tone: 'cyan' },
    { icon: '➕', label: 'Phase 3: Add the scores', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'The scores are the Z array', text: 'The suffix of length i that starts at position n − i has score equal to z[n − i]: its longest common prefix with s. So compute the Z array once and add its entries, with z[0] = n for the whole string.' },
  java: [
    'public long sumScores(String s) {',
    '    int n = s.length();',
    ...ind(zJava, '    '),
    '    long sum = 0;',
    '    for (int v : z) sum += v;',
    '    return sum;',
    '}',
  ],
  python: [
    'def sum_scores(s):',
    '    n = len(s)',
    ...ind(zPy, '    '),
    '    return sum(z)',
  ],
  algorithm: ['Compute the Z array of s with z[0] = n', 'Every entry z[i] is the score of the suffix starting at i', 'Add the entries', 'Return the sum'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The built string s_k is the suffix of s starting at index n − k, and its score is by definition the longest common prefix of that suffix with s, which is z[n − k]. Summing over k = 1..n is summing the whole Z array (z[0] = n for s itself). The Z algorithm computes all entries in linear time because r never moves backwards.',
};

/* ------------------------------------------------------------------- All periods of a string */
function buildPeriods({ s }: WIn): Step[] {
  const rec = new Rec();
  const n = s.length;
  const z = zPhase({ rec, s, jo: 2, po: 2, vars: zVars, intro: 'z[i]' });
  const periods: number[] = [];
  for (let p = 1; p <= n; p++) if (p === n || z[p] === n - p) periods.push(p);
  const hit = (k: number) => periods.includes(k);
  rec.push({ t: 'Check p = 1 … n: p is a period when z[p] = n − p', d: `p is a period when the suffix at p equals a prefix, i.e. z[p] = n − p. The full length n always qualifies. Periods: ${arr(periods)}.`, scene: zGrid(s, z, null, -1, -1, null, (k) => (hit(k) ? { top: 'found' as const, bottom: 'found' as const } : {})), v: zVars('—', '—', '—', '—'), why: 'The suffix starting at p reaches the end of the string exactly when its common prefix with s has length n − p.', tone: 'success', j: [9, 10, 11], p: [12], a: 2, tag: 'CHECK —', note: `z[p] == ${n} − p holds for p = ${periods.filter((p) => p < n).join(', ') || 'none'}; p = ${n} always` });
  const smallest = periods[0];
  rec.push({ t: `Periods: ${arr(periods)}`, d: `The smallest period is ${smallest}${n % smallest === 0 && smallest < n ? `, and since it divides ${n} the string is ${quote2(s.slice(0, smallest))} repeated ${n / smallest} times` : smallest === n ? ': the string has no shorter period' : `, which does not divide ${n} (the last block is partial)`}.`, scene: zGrid(s, z, null, -1, -1, null, (k) => (hit(k) ? { top: 'found' as const, bottom: 'found' as const } : {})), v: zVars('—', '—', '—', smallest), why: 'Every period is a shift that lines the string up with itself, so the list is read straight off the Z array.', tone: 'success', j: [12], p: [12], a: 3, tag: '✅ Done!', note: `return ${arr(periods)}`, result: { title: arr(periods), text: `Periods of the string: ${arr(periods)}` } });
  return rec.steps;
}
const quote2 = (t: string) => `"${t}"`;

export const stringPeriods: ProblemDef<WIn> = {
  slug: 'alg-all-periods-of-a-string', id: 'ALG', title: 'All Periods of a String', difficulty: 'Medium', category: 'Strings', tag: 'Z-array: z[p] = n − p',
  statement: 'A period of a string s of length n is a number p (1 ≤ p ≤ n) such that s[i] = s[i + p] for all 0 ≤ i < n − p. List all periods of s in increasing order. (The length n itself is always a period.)',
  constraints: 'Lowercase letters (animation input: 1–12 letters)',
  examples: [
    { label: 'abaaba', input: { s: 'abaaba' }, output: '[3,5,6]' },
    { label: 'aaaa', input: { s: 'aaaa' }, output: '[1,2,3,4]' },
    { label: 'abcd', input: { s: 'abcd' }, output: '[4]' },
  ],
  inputPlaceholder: 'e.g. abaaba', parseInput: (raw) => ({ s: word(raw, { max: 12, what: 'string' }) }), buildSteps: buildPeriods, viz: 'cells', vizTitle: 'Z array of s',
  legend: ZLEGEND,
  varLabels: VARS,
  emphasis: ['period', 'all periods', 'increasing order'],
  phases: [
    { icon: '🏁', label: 'Phase 1: z[0] = n', tone: 'blue' },
    { icon: '📦', label: 'Phase 2: Fill z with the Z-box', tone: 'cyan' },
    { icon: '🔍', label: 'Phase 3: Test z[p] = n − p', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'A period is a suffix that reaches the end', text: 'Position p is a period exactly when the suffix starting at p matches the prefix of the same length, i.e. when z[p] = n − p. Compute the Z array once and test each p.' },
  java: [
    'public List<Integer> periods(String s) {',
    '    int n = s.length();',
    ...ind(zJava, '    '),
    '    List<Integer> res = new ArrayList<>();',
    '    for (int p = 1; p <= n; p++)',
    '        if (p == n || z[p] == n - p) res.add(p);',
    '    return res;',
    '}',
  ],
  python: [
    'def periods(s):',
    '    n = len(s)',
    ...ind(zPy, '    '),
    '    return [p for p in range(1, n + 1) if p == n or z[p] == n - p]',
  ],
  algorithm: ['Compute the Z array of s', 'p is a period when z[p] = n − p (the suffix at p equals a prefix)', 'The length n is always a period', 'Collect all such p'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 's has period p iff s[p..n−1] = s[0..n−p−1], which is the statement z[p] = n − p because z[p] cannot exceed n − p. The check is O(1) per p after the linear Z computation.',
};
