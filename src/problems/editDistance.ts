import type { ProblemDef, Step } from '../engine/types.ts';
import { at, inList, recorder, tableRows } from './stepKit.ts';
import { parseTwoStrings } from './longestCommonSubsequence.ts';

interface In { a: string; b: string }

function parse(raw: string): In {
  return parseTwoStrings(raw, 7, 8, true);
}

function build({ a, b }: In): Step[] {
  const m = a.length;
  const n = b.length;
  const dp: (number | null)[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let rep: number | string = '—';
  let del: number | string = '—';
  let ins: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: tableRows(dp, (r, c) => (at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : undefined)),
      rowHeads: ['∅', ...a], colHeads: ['∅', ...b],
    },
    vars: { i: cur ? cur[0] : '—', j: cur ? cur[1] : '—', replace: rep, delete: del, insert: ins },
  });
  const say = recorder(steps, snap);
  const q = (s: string) => `"${s}"`;

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i][j] = fewest edits (insert, delete, replace) to turn the first i letters of ${q(a)} into the first j letters of ${q(b)}.`,
    logic: 'Rows follow the source string a, columns the target b. The ∅ row/column are the empty prefixes.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp is ${m + 1}×${n + 1}, answer = dp[${m}][${n}]`,
  });

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  say({
    title: 'Base cases', tag: 'BASE CASE —', desc: 'Turning a prefix into the empty string takes i deletions; building a prefix from nothing takes j insertions.',
    logic: 'First column = delete everything, first row = insert everything.', tone: 'success', java: [3, 4], py: [3, 4], algo: 1,
    note: `dp[i][0] = i (0..${m}), dp[0][j] = j (0..${n})`,
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cur = [i, j];
      done = false;
      if (a[i - 1] === b[j - 1]) {
        src = [[i - 1, j - 1]];
        rep = del = ins = '—';
        dp[i][j] = dp[i - 1][j - 1]!;
        done = true;
        say({
          title: `'${a[i - 1]}' = '${b[j - 1]}': dp[${i}][${j}] = ${dp[i][j]}`, tag: 'MATCH —', desc: `a[${i - 1}] = b[${j - 1}] = '${a[i - 1]}': no edit needed, copy the diagonal value dp[${i}][${j}] = ${dp[i][j]}.`,
          logic: 'Matching letters cost nothing; the answer equals that of the shorter prefixes.', tone: 'success', java: [7, 8], py: [7, 8], algo: 2,
          note: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[i][j]}`,
        });
      } else {
        src = [[i - 1, j - 1], [i - 1, j], [i, j - 1]];
        rep = dp[i - 1][j - 1]!;
        del = dp[i - 1][j]!;
        ins = dp[i][j - 1]!;
        dp[i][j] = 1 + Math.min(rep, del, ins);
        done = true;
        say({
          title: `'${a[i - 1]}' ≠ '${b[j - 1]}': dp[${i}][${j}] = ${dp[i][j]}`, tag: 'MISMATCH —',
          desc: `'${a[i - 1]}' ≠ '${b[j - 1]}': 1 + min(replace ${rep}, delete ${del}, insert ${ins}) = ${dp[i][j]}, best op = ${Math.min(rep, del, ins) === rep ? 'replace' : Math.min(rep, del, ins) === del ? 'delete' : 'insert'}.`,
          logic: 'Replace uses the diagonal, delete a[i−1] uses the cell above, insert b[j−1] uses the cell to the left.', java: [9, 10], py: [9, 10], algo: 3,
          note: `dp[${i}][${j}] = 1 + min(${rep}, ${del}, ${ins}) = ${dp[i][j]}`,
        });
      }
    }
  }

  cur = [m, n];
  src = [];
  rep = del = ins = '—';
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: `Turning ${q(a)} into ${q(b)} takes ${dp[m][n]} edit${dp[m][n] === 1 ? '' : 's'}: dp[${m}][${n}] = ${dp[m][n]}.`,
    logic: 'The bottom-right cell covers both whole strings.', tone: 'success', java: [14], py: [11], note: `return dp[${m}][${n}] = ${dp[m][n]}`,
    algo: 4, result: { title: String(dp[m][n]), text: `Minimum edits: ${q(a)} → ${q(b)}` },
  });
  return steps;
}

export const editDistance: ProblemDef<In> = {
  slug: '72-edit-distance',
  id: '72', title: 'Edit Distance', difficulty: 'Hard', category: 'Dynamic Programming', tag: '2D DP',
  statement: 'Given two strings word1 and word2, return the minimum number of operations to convert word1 into word2. An operation is inserting a character, deleting a character, or replacing a character.',
  constraints: '0 ≤ length ≤ 500 (animation input: first string ≤ 7 characters, second ≤ 8; either may be empty)',
  examples: [
    { label: 'horse / ros', input: { a: 'horse', b: 'ros' }, output: '3' },
    { label: 'cat / cut', input: { a: 'cat', b: 'cut' }, output: '1' },
    { label: 'kitten / sitting', input: { a: 'kitten', b: 'sitting' }, output: '3' },
  ],
  inputPlaceholder: 'from ; to, e.g. horse ; ros',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Cells it depends on', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'replace', 'delete', 'insert'],
  emphasis: ['minimum number of operations', 'inserting', 'deleting', 'replacing'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][j]', tone: 'blue' },
    { icon: '🌱', label: 'Base: delete / insert all', tone: 'blue' },
    { icon: '🎯', label: 'Match → free', tone: 'green' },
    { icon: '✏️', label: 'Mismatch → 1 + min(3)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Cheapest way to turn each prefix into each prefix',
    text: 'dp[i][j] = edits to turn a[0..i) into b[0..j). Base: dp[i][0] = i, dp[0][j] = j. If the last letters match copy dp[i−1][j−1]; otherwise 1 + min(replace dp[i−1][j−1], delete dp[i−1][j], insert dp[i][j−1]).',
  },
  java: [
    'public int minDistance(String a, String b) {',
    '    int m = a.length(), n = b.length();',
    '    int[][] dp = new int[m + 1][n + 1];',
    '    for (int i = 0; i <= m; i++) dp[i][0] = i;     // delete everything',
    '    for (int j = 0; j <= n; j++) dp[0][j] = j;     // insert everything',
    '    for (int i = 1; i <= m; i++) {',
    '        for (int j = 1; j <= n; j++) {',
    '            if (a.charAt(i - 1) == b.charAt(j - 1)) {',
    '                dp[i][j] = dp[i - 1][j - 1];',
    '            } else {',
    '                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));',
    '            }',
    '        }',
    '    }',
    '    return dp[m][n];',
    '}',
  ],
  python: [
    'def min_distance(a, b):',
    '    m, n = len(a), len(b)',
    '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
    '    for i in range(m + 1): dp[i][0] = i',
    '    for j in range(n + 1): dp[0][j] = j',
    '    for i in range(1, m + 1):',
    '        for j in range(1, n + 1):',
    '            if a[i - 1] == b[j - 1]:',
    '                dp[i][j] = dp[i - 1][j - 1]',
    '            else:',
    '                dp[i][j] = 1 + min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])',
    '    return dp[m][n]',
  ],
  algorithm: [
    'dp[i][j] = fewest edits from the first i letters of a to the first j letters of b',
    'Base cases: dp[i][0] = i and dp[0][j] = j',
    'If a[i−1] == b[j−1]: dp[i][j] = dp[i−1][j−1]',
    'Else: dp[i][j] = 1 + min(replace, delete, insert) from the three neighbours',
    'Return dp[m][n]',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n)' }, { label: 'Space', value: 'O(m · n), or O(n) with two rows' }],
  why: 'Consider the last letters. If equal, aligning them costs nothing. Otherwise the final operation must be a replace (use the diagonal), a delete of a[i−1] (use the cell above) or an insert of b[j−1] (use the cell to the left), plus one edit. The minimum over those three exhaustive options is optimal, and all three sub-answers are earlier in the fill order.',
};
