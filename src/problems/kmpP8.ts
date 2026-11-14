/** Pack p8 KMP problems: Find the Index of the First Occurrence (#28), Longest Happy Prefix (#1392), Repeated Substring Pattern (#459). */
import type { Cell, ProblemDef, Step, Tone } from '../engine/types.ts';
import { Rec, blank, idx, parts, quote, word } from './p8Kit.ts';

/* ------------------------------------------------------------------ LPS (failure table) core */
type Lps = (number | undefined)[];

const lpsJava = (name: string): string[] => [
  'int[] lps = new int[m];',
  `for (int i = 1, len = 0; i < m; ) {`,
  `    if (${name}.charAt(i) == ${name}.charAt(len)) {`,
  '        lps[i++] = ++len;',
  '    } else if (len > 0) {',
  '        len = lps[len - 1];',
  '    } else {',
  '        lps[i++] = 0;',
  '    }',
  '}',
];
const lpsPy = (name: string): string[] => [
  'lps = [0] * m',
  'length, i = 0, 1',
  'while i < m:',
  `    if ${name}[i] == ${name}[length]:`,
  '        length += 1',
  '        lps[i] = length',
  '        i += 1',
  '    elif length > 0:',
  '        length = lps[length - 1]',
  '    else:',
  '        lps[i] = 0',
  '        i += 1',
];
const ind = (lines: string[], by: string) => lines.map((l) => by + l);

/** Grid with the pattern on top and its lps values underneath; `mark` can style columns (border prefix / suffix …). */
function lpsGrid(pat: string, lps: Lps, mark: (k: number) => { top?: Cell['state']; tone?: Tone; bottom?: Cell['state'] } = () => ({})) {
  const top: Cell[] = [...pat].map((ch, k) => ({ key: `p${k}`, value: ch, state: mark(k).top, tone: mark(k).tone }));
  const bot: Cell[] = lps.map((v, k) => ({ key: `l${k}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : mark(k).bottom, tone: mark(k).tone }));
  return { kind: 'grid' as const, variant: 'table' as const, rows: [top, bot], rowHeads: ['pattern', 'lps'], colHeads: idx(pat.length) };
}

interface LpsCtx {
  rec: Rec;
  pat: string;
  /** index of the first line of the lps block inside the Java / Python listing */
  jo: number;
  po: number;
  algo: number;
  vars: (i: number, len: number) => Record<string, string | number>;
  aux?: () => import('../engine/types.ts').Aux[];
}

/** Build the failure table step by step; every comparison is one step. Returns the final lps array. */
function lpsPhase(c: LpsCtx): number[] {
  const { rec, pat, jo, po, algo } = c;
  const m = pat.length;
  const lps: Lps = Array(m).fill(undefined);
  lps[0] = 0;
  const J = (...k: number[]) => k.map((x) => x + jo);
  const Pp = (...k: number[]) => k.map((x) => x + po);
  rec.push({ t: 'Start: lps[0] = 0', d: `lps[i] = longest proper prefix of pat[0..i] that is also its suffix. A single letter has none, so lps[0] = 0. i scans the pattern, len is the current border length.`, scene: lpsGrid(pat, lps, (k) => ({ top: k === 0 ? 'compare' : undefined })), aux: c.aux?.(), v: c.vars(1, 0), why: 'The failure table tells the matcher how much of the pattern is still valid after a mismatch, so the text pointer never has to go back.', j: J(0, 1), p: Pp(0, 1), a: algo, tag: 'BUILD LPS —', note: 'lps[0] = 0; i = 1, len = 0' });
  let i = 1;
  let len = 0;
  while (i < m) {
    const border = (l: number, upto: number) => (k: number) => (k < l || (k >= upto - l + 1 && k <= upto) ? { tone: 'purple' as Tone } : {});
    if (pat[i] === pat[len]) {
      len++;
      lps[i] = len;
      rec.push({ t: `i=${i}: '${pat[i]}' extends the border to ${len}`, d: `pat[${i}] = pat[${len - 1}] = '${pat[i]}', so the border grows: lps[${i}] = ${len}.`, scene: lpsGrid(pat, lps, (k) => ({ ...border(len, i)(k), top: k === i || k === len - 1 ? 'found' : undefined, bottom: k === i ? 'found' : undefined })), aux: c.aux?.(), v: c.vars(i, len), why: 'A border of length len that is followed by the same character on both sides becomes a border of length len + 1.', tone: 'success', j: J(2, 3), p: Pp(3, 4, 5, 6), a: algo, tag: `EXTEND i=${i} —`, note: `pat[${i}] == pat[${len - 1}] → lps[${i}] = len = ${len}` });
      i++;
    } else if (len > 0) {
      const to = lps[len - 1]!;
      rec.push({ t: `i=${i}: mismatch, fall back len ${len} → ${to}`, d: `pat[${i}] = '${pat[i]}' but pat[${len}] = '${pat[len]}'. The old border of length ${len} cannot be extended; the next-best border of it has length lps[${len - 1}] = ${to}.`, scene: lpsGrid(pat, lps, (k) => ({ ...border(len, i - 1)(k), top: k === i || k === len ? 'error' : undefined })), aux: c.aux?.(), v: c.vars(i, len), why: 'Any border of the current border is also a border of the whole prefix, so we retry with the next shorter one instead of restarting from 0.', tone: 'warn', j: J(4, 5), p: Pp(7, 8), a: algo, tag: `FALL BACK i=${i} —`, note: `'${pat[i]}' ≠ '${pat[len]}' → len = lps[${len - 1}] = ${to}`, alert: `Mismatch '${pat[i]}' ≠ '${pat[len]}': fall back along the failure link, len ${len} → ${to} (i stays ${i}).` });
      len = to;
    } else {
      lps[i] = 0;
      rec.push({ t: `i=${i}: no border, lps[${i}] = 0`, d: `pat[${i}] = '${pat[i]}' differs from pat[0] = '${pat[0]}' and len is already 0, so no prefix matches here.`, scene: lpsGrid(pat, lps, (k) => ({ top: k === i || k === 0 ? 'error' : undefined, bottom: k === i ? 'found' : undefined })), aux: c.aux?.(), v: c.vars(i, len), why: 'With len = 0 there is nothing shorter to fall back to.', j: J(6, 7), p: Pp(9, 10, 11), a: algo, tag: `NO BORDER i=${i} —`, note: `len = 0 → lps[${i}] = 0, i = ${i + 1}`, alert: `'${pat[i]}' ≠ '${pat[0]}' and there is no shorter border: lps[${i}] = 0.` });
      i++;
    }
  }
  return lps as number[];
}

/* ----------------------------------------------------------------------- #28 strStr (KMP) */
interface SIn { text: string; pat: string }

function parse28(raw: string): SIn {
  const [t, p] = parts(raw, 2, 'text ; pattern, e.g. aabaabaaf ; aabaaf');
  return { text: word(t, { max: 14, what: 'text' }), pat: word(p, { max: 7, what: 'pattern' }) };
}

function build28({ text, pat }: SIn): Step[] {
  const rec = new Rec();
  const n = text.length;
  const m = pat.length;
  let phase = 'lps';
  let jj: number | string = '—';
  const vars = (i: number | string, len: number | string) => ({ phase, i, len, j: jj });
  const lps = lpsPhase({ rec, pat, jo: 2, po: 2, algo: 0, vars: (i, len) => vars(i, len) });
  phase = 'search';
  const lpsAux = () => [{ title: 'lps table', kind: 'list' as const, items: [...pat].map((ch, k) => `${ch}: ${lps[k]}`) }];
  const view = (i: number, j: number, miss = false, hit = false) => {
    const s = i - j;
    const tCells: Cell[] = [...text].map((ch, k) => ({ key: `t${k}`, value: ch, state: hit && k >= s && k < s + m ? 'found' : k === i && !hit ? (miss ? 'error' : 'compare') : k >= s && k < i ? 'found' : k < s ? 'dim' : undefined }));
    const pCells: Cell[] = Array.from({ length: n }, (_, c) => {
      const k = c - s;
      if (k < 0 || k >= m) return blank(`b${c}`);
      return { key: `q${c}`, value: pat[k], state: hit ? 'found' : k < j ? 'found' : k === j ? (miss ? 'error' : 'compare') : undefined };
    });
    return { kind: 'grid' as const, variant: 'table' as const, rows: [tCells, pCells], rowHeads: ['text', 'pattern'], colHeads: idx(n) };
  };
  rec.push({ t: 'Table ready: scan the text', d: `Now slide through the text. i walks the text, j counts how many pattern characters currently match. The text pointer i never moves backwards.`, scene: view(0, 0), aux: lpsAux(), v: vars(0, '—'), why: 'After a mismatch only j changes (via the lps table), so the scan is linear.', j: [12], p: [14, 15], a: 1, tag: 'SCAN TEXT —', note: `lps = [${lps.join(', ')}]; i = 0, j = 0` });
  let i = 0;
  let j = 0;
  let found = -1;
  while (i < n) {
    jj = j;
    if (text[i] === pat[j]) {
      const iBefore = i;
      i++;
      j++;
      if (j === m) {
        found = i - m;
        jj = j;
        rec.push({ t: `Full match at index ${found}`, d: `All ${m} pattern characters matched: the pattern starts at index ${found}.`, scene: view(i - 1, j - 1, false, true), aux: lpsAux(), v: vars(i, '—'), why: 'j reached the pattern length, so text[i-m .. i-1] equals the pattern. This is the first occurrence because every earlier start was ruled out.', tone: 'success', j: [13, 14, 15], p: [16, 17, 18, 19, 20], a: 3, tag: '✅ Done!', note: `j == m → return i - m = ${i} - ${m} = ${found}` });
        break;
      }
      jj = j;
      rec.push({ t: `text[${iBefore}] = pat[${j - 1}] = '${pat[j - 1]}': advance`, d: `'${text[iBefore]}' matches pat[${j - 1}] → i = ${i}, j = ${j} (${j} of ${m} matched).`, scene: view(i - 1, j - 1), aux: lpsAux(), v: vars(i, '—'), why: 'Matching characters extend the current partial match by one.', j: [13, 14], p: [16, 17, 18], a: 1, tag: 'MATCH —', note: `i++; j++ → i = ${i}, j = ${j}` });
    } else if (j > 0) {
      const to = lps[j - 1];
      rec.push({ t: `Mismatch at text[${i}]: j ${j} → ${to}`, d: `'${text[i]}' ≠ '${pat[j]}'. The matched part pat[0..${j - 1}] already ends with a border of length ${to}, so the pattern shifts right by ${j - to} and only j changes.`, scene: view(i, j, true), aux: lpsAux(), v: vars(i, '—'), why: 'The border says: the last lps[j-1] text characters already match the start of the pattern, so we keep them and do not recompare.', tone: 'warn', j: [16, 17], p: [21, 22], a: 2, tag: 'MISMATCH —', note: `j = lps[${j - 1}] = ${to} (i stays ${i})`, alert: `Mismatch '${text[i]}' ≠ '${pat[j]}': fall back along the failure link, j ${j} → ${to}. The text pointer stays at ${i}.` });
      j = to;
      jj = j;
    } else {
      rec.push({ t: `Mismatch at text[${i}] with j = 0: skip`, d: `'${text[i]}' ≠ '${pat[0]}' and nothing is matched, so move to the next text character.`, scene: view(i, 0, true), aux: lpsAux(), v: vars(i, '—'), why: 'With no partial match there is nothing to reuse.', tone: 'warn', j: [18, 19], p: [23, 24], a: 2, tag: 'MISMATCH —', note: `j = 0 → i++ = ${i + 1}`, alert: `'${text[i]}' ≠ '${pat[0]}' with j = 0: nothing to reuse, move on to the next text character.` });
      i++;
    }
  }
  if (found < 0) {
    rec.push({ t: 'Text exhausted: not found', d: `The text ended before the pattern fully matched.`, scene: view(n, j, false), aux: lpsAux(), v: vars(n, '—'), why: 'i only moves forward and every start position was either matched or ruled out through the lps table.', tone: 'warn', j: [22], p: [25], a: 3, tag: '✅ Done!', note: 'return -1', result: { title: '-1', text: 'The pattern does not occur in the text' } });
  } else {
    rec.steps[rec.steps.length - 1].result = { title: String(found), text: `First occurrence starts at index ${found}` };
  }
  return rec.steps;
}

export const strStr: ProblemDef<SIn> = {
  slug: '28-find-the-index-of-the-first-occurrence-in-a-string', id: '28', title: 'Find the Index of the First Occurrence in a String', difficulty: 'Easy', category: 'Strings', tag: 'KMP failure table',
  statement: 'Given a text and a pattern, return the index of the first occurrence of the pattern in the text, or -1 if it does not occur. KMP does this in linear time by precomputing, for every prefix of the pattern, its longest proper border (the lps table).',
  constraints: '1 ≤ text.length, pattern.length ≤ 10⁴, lowercase letters (animation input: text ≤ 14, pattern ≤ 7)',
  examples: [
    { label: 'aabaabaaf ; aabaaf', input: { text: 'aabaabaaf', pat: 'aabaaf' }, output: '3' },
    { label: 'sadbutsad ; sad', input: { text: 'sadbutsad', pat: 'sad' }, output: '0' },
    { label: 'leetcode ; leeto', input: { text: 'leetcode', pat: 'leeto' }, output: '-1' },
  ],
  inputPlaceholder: 'text ; pattern   e.g. aabaabaaf ; aabaaf', parseInput: parse28, buildSteps: build28, viz: 'cells', vizTitle: 'Failure table, then text scan',
  legend: [{ label: 'Characters being compared', state: 'compare' }, { label: 'Matched / extended', state: 'found' }, { label: 'Mismatch', state: 'error' }, { label: 'Already passed / not computed', state: 'dim' }],
  varLabels: ['phase', 'i', 'len', 'j'],
  emphasis: ['first occurrence', 'linear time', 'lps table', 'longest proper border'],
  phases: [
    { icon: '🔨', label: 'Phase 1: Build lps table', tone: 'blue' },
    { icon: '🔎', label: 'Phase 2: Scan the text', tone: 'cyan' },
    { icon: '↩', label: 'Phase 3: Fall back j = lps[j−1]', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Never move the text pointer back', text: 'First build lps: for each prefix of the pattern, the length of its longest proper prefix that is also a suffix. Then scan the text: on a match advance both pointers, on a mismatch keep i and drop j to lps[j-1], which is exactly the amount of the pattern that is still known to match.' },
  java: [
    'public int strStr(String text, String pat) {',
    '    int n = text.length(), m = pat.length();',
    ...ind(lpsJava('pat'), '    '),
    '    for (int i = 0, j = 0; i < n; ) {',
    '        if (text.charAt(i) == pat.charAt(j)) {',
    '            i++; j++;',
    '            if (j == m) return i - m;',
    '        } else if (j > 0) {',
    '            j = lps[j - 1];',
    '        } else {',
    '            i++;',
    '        }',
    '    }',
    '    return -1;',
    '}',
  ],
  python: [
    'def str_str(text, pat):',
    '    n, m = len(text), len(pat)',
    ...ind(lpsPy('pat'), '    '),
    '    i = j = 0',
    '    while i < n:',
    '        if text[i] == pat[j]:',
    '            i += 1',
    '            j += 1',
    '            if j == m:',
    '                return i - m',
    '        elif j > 0:',
    '            j = lps[j - 1]',
    '        else:',
    '            i += 1',
    '    return -1',
  ],
  algorithm: ['Build lps: the longest proper border of every pattern prefix', 'Scan the text; when text[i] = pat[j] advance both i and j', 'On a mismatch keep i and fall back j = lps[j − 1] (or advance i when j = 0)', 'When j reaches the pattern length, report i − m'],
  complexity: [{ label: 'Time', value: 'O(n + m)' }, { label: 'Space', value: 'O(m)' }],
  why: 'Potential argument: in the scan, i + (i − j) never decreases, and each iteration either increases i or increases the shift i − j, so at most 2n iterations happen. The same argument applied to the pattern against itself bounds the lps construction by 2m. Correctness: if text[i−j..i−1] = pat[0..j−1] and the next character mismatches, every start position between i−j and i−lps[j−1]−1 would have to match a border longer than lps[j−1], which does not exist, so they are safely skipped.',
};

/* --------------------------------------------------------------- #1392 Longest Happy Prefix */
interface WIn { s: string }

function buildHappy({ s }: WIn): Step[] {
  const rec = new Rec();
  const m = s.length;
  const lps = lpsPhase({ rec, pat: s, jo: 2, po: 2, algo: 0, vars: (i, len) => ({ i, len, 'lps[m-1]': '—' }) });
  const L = lps[m - 1];
  const prefix = s.slice(0, L);
  rec.push({ t: `lps[${m - 1}] = ${L}`, d: L ? `The last entry is the longest proper prefix that is also a suffix: "${prefix}".` : 'The last entry is 0: no proper prefix is also a suffix.', scene: lpsGrid(s, lps, (k) => ({ top: k < L ? 'found' : k >= m - L ? 'found' : undefined, tone: k < L ? 'blue' : k >= m - L ? 'orange' : undefined, bottom: k === m - 1 ? 'found' : undefined })), v: { i: m, len: L, 'lps[m-1]': L }, why: 'lps[i] is by definition the longest border of the prefix ending at i, and the whole string is the prefix ending at m − 1.', tone: 'success', j: [12], p: [14], a: 1, tag: 'READ LPS —', note: `lps[m - 1] = lps[${m - 1}] = ${L}` });
  rec.push({ t: `Answer: ${quote(prefix)}`, d: L ? `Take the first ${L} character${L > 1 ? 's' : ''}: ${quote(prefix)} (blue = prefix, orange = the same text as the suffix).` : 'Nothing qualifies, so the answer is the empty string.', scene: lpsGrid(s, lps, (k) => ({ top: k < L ? 'found' : k >= m - L ? 'found' : undefined, tone: k < L ? 'blue' : k >= m - L ? 'orange' : undefined })), v: { i: m, len: L, 'lps[m-1]': L }, why: 'A "happy prefix" is exactly a border of s, and the failure table already gives the longest one.', tone: 'success', j: [12], p: [14], a: 2, tag: '✅ Done!', note: `return s.substring(0, ${L}) = ${quote(prefix)}`, result: { title: quote(prefix), text: prefix ? `Longest happy prefix: ${quote(prefix)}` : 'No happy prefix (empty string)' } });
  return rec.steps;
}

export const longestHappyPrefix: ProblemDef<WIn> = {
  slug: '1392-longest-happy-prefix', id: '1392', title: 'Longest Happy Prefix', difficulty: 'Hard', category: 'Strings', tag: 'KMP lps = longest border',
  statement: 'A happy prefix is a non-empty proper prefix of s that is also a suffix of s. Return the longest happy prefix of s, or the empty string if there is none.',
  constraints: '1 ≤ s.length ≤ 10⁵, lowercase letters (animation input: 1–12 letters)',
  examples: [
    { label: 'level', input: { s: 'level' }, output: '"l"' },
    { label: 'ababab', input: { s: 'ababab' }, output: '"abab"' },
    { label: 'abcd', input: { s: 'abcd' }, output: '""' },
  ],
  inputPlaceholder: 'e.g. ababab', parseInput: (raw) => ({ s: word(raw, { max: 12, what: 'string' }) }), buildSteps: buildHappy, viz: 'cells', vizTitle: 'Failure table (lps)',
  legend: [{ label: 'Border prefix and matching suffix', state: 'found' }, { label: 'Mismatch while building', state: 'error' }, { label: 'Not computed yet', state: 'dim' }],
  varLabels: ['i', 'len', 'lps[m-1]'],
  emphasis: ['happy prefix', 'proper prefix', 'longest'],
  phases: [
    { icon: '🔨', label: 'Phase 1: Build lps table', tone: 'blue' },
    { icon: '📖', label: 'Phase 2: Read lps[m−1]', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'The failure table is the answer', text: 'The KMP failure value of the last position is, by definition, the length of the longest proper prefix of s that is also a suffix. Build the table with the usual fallback rule and slice that many characters off the front.' },
  java: [
    'public String longestPrefix(String s) {',
    '    int m = s.length();',
    ...ind(lpsJava('s'), '    '),
    '    return s.substring(0, lps[m - 1]);',
    '}',
  ],
  python: [
    'def longest_prefix(s):',
    '    m = len(s)',
    ...ind(lpsPy('s'), '    '),
    '    return s[:lps[m - 1]]',
  ],
  algorithm: ['Build the lps (failure) table of s', 'Read lps[m − 1]: the length L of the longest border', 'Return the first L characters of s'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'lps[i] is the longest proper prefix of s[0..i] that is also its suffix. For i = m − 1 that is exactly a happy prefix of s, and it is the longest by definition. The construction is linear because len only rises by one per iteration of i and every fallback strictly lowers it.',
};

/* ------------------------------------------------------------ #459 Repeated Substring Pattern */
function buildRepeated({ s }: WIn): Step[] {
  const rec = new Rec();
  const m = s.length;
  const lps = lpsPhase({ rec, pat: s, jo: 2, po: 2, algo: 0, vars: (i, len) => ({ i, len, period: '—' }) });
  const L = lps[m - 1];
  const period = m - L;
  const ok = L > 0 && m % period === 0;
  const tones: Tone[] = ['blue', 'orange'];
  rec.push({ t: `Candidate period = ${m} − lps[${m - 1}] = ${m} − ${L} = ${period}`, d: `If s is made of repeated copies of a block, the block length is the length of the string minus its longest border. Here that is ${period}.`, scene: lpsGrid(s, lps, (k) => ({ top: k < period ? 'compare' : undefined, bottom: k === m - 1 ? 'found' : undefined })), v: { i: m, len: L, period }, why: 'Shifting the string by `period` positions lines it up with itself on the border, which is what a repeating block means.', j: [12], p: [14], a: 1, tag: 'PERIOD —', note: `period = ${m} - ${L} = ${period}` });
  rec.push({ t: ok ? `Does ${period} divide ${m}? Yes: ${m / period} copies` : L === 0 ? 'No border: cannot repeat' : `${m} mod ${period} = ${m % period} ≠ 0: not a whole number of blocks`, d: ok ? `${quote(s.slice(0, period))} repeated ${m / period} times builds the string.` : L === 0 ? 'The string has no proper border at all, so it is not a repetition.' : `A border exists but the blocks would not tile the string exactly (a partial copy is left over).`, scene: lpsGrid(s, lps, (k) => ({ top: ok ? 'found' : undefined, tone: ok ? tones[Math.floor(k / period) % 2] : undefined })), v: { i: m, len: L, period }, why: 'Both conditions are needed: a border (the string overlaps itself) and a period that divides the length (whole copies).', tone: ok ? 'success' : 'warn', j: [13], p: [15], a: 2, tag: '✅ Done!', note: ok ? `${L} > 0 && ${m} % ${period} == 0 → true` : L === 0 ? `lps[${m - 1}] = 0 → false` : `${m} % ${period} = ${m % period} ≠ 0 → false`, alert: ok ? undefined : L === 0 ? 'No border at all: the string cannot be a repetition.' : `${period} does not divide ${m}: a partial block is left over.`, result: { title: String(ok), text: ok ? `Yes: ${quote(s.slice(0, period))} × ${m / period}` : 'No repeated block builds this string' } });
  return rec.steps;
}

export const repeatedSubstringPattern: ProblemDef<WIn> = {
  slug: '459-repeated-substring-pattern', id: '459', title: 'Repeated Substring Pattern', difficulty: 'Easy', category: 'Strings', tag: 'KMP period = n − lps',
  statement: 'Decide whether a string can be constructed by taking a substring of it and appending several copies of that substring together.',
  constraints: '1 ≤ s.length ≤ 10⁴, lowercase letters (animation input: 1–12 letters)',
  examples: [
    { label: 'abcabcabc', input: { s: 'abcabcabc' }, output: 'true' },
    { label: 'abcabcab', input: { s: 'abcabcab' }, output: 'false' },
    { label: 'abab', input: { s: 'abab' }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. abcabcabc', parseInput: (raw) => ({ s: word(raw, { max: 12, what: 'string' }) }), buildSteps: buildRepeated, viz: 'cells', vizTitle: 'Failure table (lps)',
  legend: [{ label: 'Candidate block', state: 'compare' }, { label: 'Tiled by whole blocks', state: 'found' }, { label: 'Mismatch while building', state: 'error' }, { label: 'Not computed yet', state: 'dim' }],
  varLabels: ['i', 'len', 'period'],
  emphasis: ['constructed', 'appending several copies'],
  phases: [
    { icon: '🔨', label: 'Phase 1: Build lps table', tone: 'blue' },
    { icon: '📏', label: 'Phase 2: period = n − lps[n−1]', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Period from the longest border', text: 'Build the KMP table. If the longest border has length L, the string has period p = n − L. The string is a whole number of repeats exactly when L > 0 and p divides n.' },
  java: [
    'public boolean repeatedSubstringPattern(String s) {',
    '    int m = s.length();',
    ...ind(lpsJava('s'), '    '),
    '    int period = m - lps[m - 1];',
    '    return lps[m - 1] > 0 && m % period == 0;',
    '}',
  ],
  python: [
    'def repeated_substring_pattern(s):',
    '    m = len(s)',
    ...ind(lpsPy('s'), '    '),
    '    period = m - lps[m - 1]',
    '    return lps[m - 1] > 0 and m % period == 0',
  ],
  algorithm: ['Build the lps table of s', 'period = n − lps[n − 1]', 'Repeated iff lps[n − 1] > 0 and period divides n'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'A border of length L means s[i] = s[i + n − L] for all valid i, i.e. s has period p = n − L. If s is k ≥ 2 copies of a block of length b, then L ≥ n − b, so n − L ≤ b and the smallest period divides n. Conversely a smallest period p that divides n gives n/p ≥ 2 identical blocks.',
};
