import type { ProblemDef, Step } from '../engine/types.ts';
import { at, inList, recorder, tableRows } from './stepKit.ts';

interface In { a: string; b: string }

export function parseTwoStrings(raw: string, maxA: number, maxB: number, allowEmpty = false): In {
  const parts = raw.split(';').map((p) => p.trim());
  if (parts.length !== 2) throw new Error('Format: first ; second — e.g. abcde ; ace');
  const [a, b] = parts;
  if (!allowEmpty && (!a || !b)) throw new Error('Both strings must be non-empty');
  if (/[^A-Za-z0-9]/.test(a + b)) throw new Error('Use letters and digits only (no spaces inside a string)');
  if (a.length > maxA || b.length > maxB) throw new Error(`Use at most ${maxA} characters in the first string and ${maxB} in the second`);
  return { a, b };
}

function parse(raw: string): In {
  return parseTwoStrings(raw, 7, 8);
}

function build({ a, b }: In): Step[] {
  const m = a.length;
  const n = b.length;
  const dp: (number | null)[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let path = new Map<string, 'found' | 'sorted'>();
  let built: string[] = [];
  let up: number | string = '—';
  let left: number | string = '—';
  let diag: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: tableRows(dp, (r, c) => (path.has(`${r},${c}`) ? path.get(`${r},${c}`) : at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : undefined)),
      rowHeads: ['∅', ...a], colHeads: ['∅', ...b],
    },
    aux: [{ title: 'subsequence (read backwards)', kind: 'list' as const, items: [...built] }],
    vars: { i: cur ? cur[0] : '—', j: cur ? cur[1] : '—', up, left, diag },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i][j] = LCS length of the first i letters of "${a}" and the first j letters of "${b}".`,
    logic: 'Rows follow the first string, columns the second. The extra ∅ row and column stand for the empty prefix.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp is ${m + 1}×${n + 1}, answer = dp[${m}][${n}]`,
  });

  for (let i = 0; i <= m; i++) dp[i][0] = 0;
  for (let j = 0; j <= n; j++) dp[0][j] = 0;
  say({
    title: 'Base cases: row 0 and column 0 are 0', tag: 'BASE CASE —', desc: 'Matching anything against an empty prefix gives an LCS of length 0, so row 0 and column 0 are all 0.',
    logic: 'No letters on one side means nothing can match.', tone: 'success', java: [2], py: [2], algo: 1, note: 'dp[i][0] = dp[0][j] = 0',
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cur = [i, j];
      done = false;
      if (a[i - 1] === b[j - 1]) {
        src = [[i - 1, j - 1]];
        diag = dp[i - 1][j - 1]!;
        up = '—';
        left = '—';
        dp[i][j] = diag + 1;
        done = true;
        say({
          title: `'${a[i - 1]}' = '${b[j - 1]}': dp[${i}][${j}] = ${dp[i][j]}`, tag: 'MATCH —', desc: `a[${i - 1}] = '${a[i - 1]}' equals b[${j - 1}] = '${b[j - 1]}', so extend the diagonal: dp[${i}][${j}] = ${diag} + 1 = ${dp[i][j]}.`,
          logic: 'A matching pair can be appended to the best subsequence of both shorter prefixes.', tone: 'success', java: [5, 6], py: [5, 6], algo: 2,
          note: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${diag} + 1 = ${dp[i][j]}`,
        });
      } else {
        src = [[i - 1, j], [i, j - 1]];
        up = dp[i - 1][j]!;
        left = dp[i][j - 1]!;
        diag = '—';
        dp[i][j] = Math.max(up, left);
        done = true;
        say({
          title: `'${a[i - 1]}' ≠ '${b[j - 1]}': dp[${i}][${j}] = ${dp[i][j]}`, tag: 'NO MATCH —', desc: `'${a[i - 1]}' ≠ '${b[j - 1]}', so drop one letter: max(above ${up}, left ${left}) = ${dp[i][j]}.`,
          logic: 'Either the last letter of a or the last letter of b is not used, so take the better of the two.', java: [8, 7], py: [8, 7], algo: 3,
          note: `dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = max(${up}, ${left}) = ${dp[i][j]}`,
        });
      }
    }
  }

  // Walk back to read off one actual subsequence (extra, not needed for the length).
  let i = m;
  let j = n;
  cur = [i, j];
  src = [];
  up = left = diag = '—';
  done = true;
  path = new Map([[`${i},${j}`, 'sorted']]);
  say({
    title: `Length = dp[${m}][${n}] = ${dp[m][n]}`, tag: 'ANSWER —', desc: `The corner holds the LCS length dp[${m}][${n}] = ${dp[m][n]}. Now walk back from it to read off one actual subsequence.`,
    logic: 'Reconstruction is optional extra work: follow the choices that produced each value.', tone: 'success', java: [11], py: [9], algo: 4,
    note: `return dp[${m}][${n}] = ${dp[m][n]}`,
  });
  const letters: string[] = [];
  const mark = (r: number, c: number, kind: 'found' | 'sorted') => {
    const k = `${r},${c}`;
    if (kind === 'found' || !path.has(k)) path.set(k, kind);
  };
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      letters.push(a[i - 1]);
      built = [...letters];
      mark(i, j, 'found');
      cur = [i, j];
      say({
        title: `Take '${a[i - 1]}' at (${i}, ${j})`, tag: 'WALK BACK —', desc: `Cell (${i}, ${j}) came from a match: take '${a[i - 1]}' into the subsequence and move diagonally.`,
        logic: 'Diagonal moves are the matches.', tone: 'success', java: [11], py: [9], algo: 4,
        note: `a[${i - 1}] = b[${j - 1}] = '${a[i - 1]}' → built so far "${[...letters].reverse().join('')}"`,
      });
      i--;
      j--;
      mark(i, j, 'sorted');
    } else if (dp[i - 1][j]! >= dp[i][j - 1]!) {
      i--;
      mark(i, j, 'sorted');
      cur = [i, j];
      say({
        title: 'Move up', tag: 'WALK BACK —', desc: `No match at this cell; the value came from above (${dp[i][j]}), which is at least as large as the left cell.`,
        logic: 'Follow the neighbour that produced this value.', java: [11], py: [9], algo: 4,
        note: `up ${dp[i][j]} ≥ left ${dp[i + 1][j - 1]} → i = ${i}`,
      });
    } else {
      j--;
      mark(i, j, 'sorted');
      cur = [i, j];
      say({
        title: 'Move left', tag: 'WALK BACK —', desc: `No match at this cell; the value came from the left (${dp[i][j]}), which is larger than the cell above.`,
        logic: 'Follow the neighbour that produced this value.', java: [11], py: [9], algo: 4,
        note: `left ${dp[i][j]} > up ${dp[i - 1][j + 1]} → j = ${j}`,
      });
    }
  }
  const sub = letters.reverse().join('');
  cur = [m, n];
  say({
    title: 'Done', tag: '✅ Done!', desc: `One longest common subsequence is "${sub}" (length ${dp[m][n]}).`,
    logic: 'Green cells on the path are the matched letters.', tone: 'success', java: [11], py: [9], algo: 4, note: `LCS = "${sub}", length ${dp[m][n]}`,
    result: { title: String(dp[m][n]), text: `LCS = "${sub}"` },
  });
  return steps;
}

export const longestCommonSubsequence: ProblemDef<In> = {
  slug: '1143-longest-common-subsequence',
  id: '1143', title: 'Longest Common Subsequence', difficulty: 'Medium', category: 'Dynamic Programming', tag: '2D DP',
  statement: 'Given two strings, return the length of their longest common subsequence: the longest sequence of characters that appears in both, in the same relative order but not necessarily contiguously.',
  constraints: '1 ≤ length ≤ 1000 (animation input: first string ≤ 7 characters, second ≤ 8)',
  examples: [
    { label: 'abcde / ace', input: { a: 'abcde', b: 'ace' }, output: '3' },
    { label: 'abc / abc', input: { a: 'abc', b: 'abc' }, output: '3' },
    { label: 'abc / def', input: { a: 'abc', b: 'def' }, output: '0' },
    { label: 'AGGTAB / GXTXAYB', input: { a: 'AGGTAB', b: 'GXTXAYB' }, output: '4' },
  ],
  inputPlaceholder: 'first ; second, e.g. abcde ; ace',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Cells it depends on', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Path (match = green)', state: 'sorted' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'up', 'left', 'diag'],
  emphasis: ['longest common subsequence', 'same relative order', 'not necessarily contiguously'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][j]', tone: 'blue' },
    { icon: '🌱', label: 'Base: row 0 & col 0', tone: 'blue' },
    { icon: '🎯', label: 'Match → diagonal + 1', tone: 'green' },
    { icon: '✂️', label: 'No match → max(up, left)', tone: 'orange' },
    { icon: '✅', label: 'Answer & walk back', tone: 'green' },
  ],
  approach: {
    title: 'A 2-D table over prefix pairs',
    text: 'dp[i][j] is the LCS length of a[0..i) and b[0..j). If the last letters match, dp[i][j] = dp[i−1][j−1] + 1; otherwise dp[i][j] = max(dp[i−1][j], dp[i][j−1]). The corner dp[m][n] is the answer.',
  },
  java: [
    'public int longestCommonSubsequence(String a, String b) {',
    '    int m = a.length(), n = b.length();',
    '    int[][] dp = new int[m + 1][n + 1];          // row 0 and column 0 stay 0',
    '    for (int i = 1; i <= m; i++) {',
    '        for (int j = 1; j <= n; j++) {',
    '            if (a.charAt(i - 1) == b.charAt(j - 1))',
    '                dp[i][j] = dp[i - 1][j - 1] + 1;',
    '            else',
    '                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);',
    '        }',
    '    }',
    '    return dp[m][n];',
    '}',
  ],
  python: [
    'def longest_common_subsequence(a, b):',
    '    m, n = len(a), len(b)',
    '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
    '    for i in range(1, m + 1):',
    '        for j in range(1, n + 1):',
    '            if a[i - 1] == b[j - 1]:',
    '                dp[i][j] = dp[i - 1][j - 1] + 1',
    '            else:',
    '                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])',
    '    return dp[m][n]',
  ],
  algorithm: [
    'dp[i][j] = LCS length of the first i letters of a and first j letters of b',
    'Base cases: row 0 and column 0 are all 0',
    'If a[i−1] == b[j−1]: dp[i][j] = dp[i−1][j−1] + 1',
    'Otherwise: dp[i][j] = max(dp[i−1][j], dp[i][j−1])',
    'Return dp[m][n] (optionally walk back to read the subsequence)',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n)' }, { label: 'Space', value: 'O(m · n), or O(min(m, n)) for the length only' }],
  why: 'Look at the last letters of the two prefixes. If they match, some optimal subsequence can end with that letter, leaving an LCS of the shorter prefixes. If not, at least one of the two last letters is unused, so the answer equals the best of dropping either. These cases are exhaustive, and every needed sub-answer sits above, to the left or on the diagonal, already filled.',
};
