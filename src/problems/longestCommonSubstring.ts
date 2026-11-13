import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { at, heads, inList, recorder } from './stepKit.ts';
import { parseTwoStrings } from './longestCommonSubsequence.ts';

interface In { a: string; b: string }

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
  let best = 0;
  let bestEnd: [number, number] | null = null;
  let showBest = false;
  let diag: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: dp.map((row, r) => row.map((v, c): Cell => {
        const key = `${r},${c}`;
        const value = v === null ? '?' : v;
        if (showBest && bestEnd && best > 0 && c === bestEnd[1] - (bestEnd[0] - r) && r > bestEnd[0] - best && r <= bestEnd[0]) return { key, value, state: 'found' };
        if (at(cur, r, c)) return { key, value, state: done ? (v === 0 ? undefined : 'found') : 'active' };
        if (inList(src, r, c)) return { key, value, state: 'compare' };
        if (bestEnd && !showBest && r === bestEnd[0] && c === bestEnd[1]) return { key, value, tone: 'purple' };
        return { key, value, state: v === null ? 'dim' : undefined };
      })),
      rowHeads: ['∅', ...a], colHeads: heads(n + 1, (j) => (j === 0 ? '∅' : b[j - 1])),
    },
    vars: { i: cur ? cur[0] : '—', j: cur ? cur[1] : '—', diag, best },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i][j] = length of the common substring that ENDS at a[i−1] and b[j−1]. We track the largest value seen.`,
    logic: 'Unlike a subsequence, a substring must be contiguous, so a mismatch resets the run to 0 instead of carrying a value forward.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp is ${m + 1}×${n + 1}, best = 0`,
  });

  for (let i = 0; i <= m; i++) dp[i][0] = 0;
  for (let j = 0; j <= n; j++) dp[0][j] = 0;
  say({
    title: 'Row 0 and column 0 are 0', tag: 'BASE CASE —', desc: 'An empty prefix has no common substring with anything, so row 0 and column 0 are 0.',
    logic: 'Base cases for the diagonal look-back.', tone: 'success', java: [2], py: [2], algo: 1, note: 'dp[i][0] = dp[0][j] = 0',
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cur = [i, j];
      done = false;
      if (a[i - 1] === b[j - 1]) {
        src = [[i - 1, j - 1]];
        diag = dp[i - 1][j - 1]!;
        dp[i][j] = diag + 1;
        const improved = dp[i][j]! > best;
        if (improved) {
          best = dp[i][j]!;
          bestEnd = [i, j];
        }
        done = true;
        say({
          title: `'${a[i - 1]}' = '${b[j - 1]}': dp[${i}][${j}] = ${dp[i][j]}`, tag: improved ? 'NEW BEST —' : 'MATCH —',
          desc: `a[${i - 1}] = b[${j - 1}] = '${a[i - 1]}': the run ending here is one longer than the diagonal, ${diag} + 1 = ${dp[i][j]}.${improved ? ` New best length ${best}.` : ''}`,
          logic: 'A common run just grew by one letter along the diagonal.', tone: improved ? 'success' : 'info', java: [5, 6, 7], py: [5, 6, 7], algo: 2,
          note: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}${improved ? ` → best = ${best}` : ` · best stays ${best}`}`,
        });
      } else {
        const broken = dp[i - 1][j - 1]!;
        src = [];
        diag = '—';
        dp[i][j] = 0;
        done = true;
        say({
          title: `'${a[i - 1]}' ≠ '${b[j - 1]}': dp[${i}][${j}] = 0`, tag: 'RESET —', desc: `'${a[i - 1]}' ≠ '${b[j - 1]}', so no common substring can end here: dp[${i}][${j}] resets to 0.`,
          logic: 'Breaking contiguity ends the run. This reset is the only difference from the subsequence table.', tone: 'warn', java: [8, 9], py: [8, 9], algo: 3,
          note: `a[${i - 1}] ≠ b[${j - 1}] → dp[${i}][${j}] = 0`,
          ...(broken > 0 ? { alert: `Mismatch breaks the run of length ${broken} on the diagonal: contiguity is lost, so the cell resets to 0.` } : {}),
        });
      }
    }
  }

  cur = null;
  src = [];
  diag = '—';
  showBest = true;
  const sub = bestEnd ? a.slice(bestEnd[0] - best, bestEnd[0]) : '';
  say({
    title: 'Done', tag: '✅ Done!', desc: best ? `The longest common substring is "${sub}" with length ${best}: the maximum entry of the table.` : 'The strings share no common letter, so the length is 0.',
    logic: 'The answer is the maximum entry of the whole table (not the corner). Green marks the diagonal run.', tone: 'success', java: [13], py: [10], note: `return best = ${best}`,
    algo: 4, result: { title: String(best), text: `Longest common substring "${sub}"` },
  });
  return steps;
}

export const longestCommonSubstring: ProblemDef<In> = {
  slug: 'gfg-longest-common-substring',
  id: 'GFG', title: 'Longest Common Substring', difficulty: 'Medium', category: 'Dynamic Programming', tag: '2D DP',
  statement: 'Given two strings, find the length of the longest substring (a contiguous run of characters) that appears in both of them.',
  constraints: '1 ≤ length ≤ 1000 (animation input: first string ≤ 7 characters, second ≤ 8)',
  examples: [
    { label: 'abcdxyz / xyzabcd', input: { a: 'abcdxyz', b: 'xyzabcd' }, output: '4' },
    { label: 'zxabcd / yzabcde', input: { a: 'zxabcd', b: 'yzabcde' }, output: '4' },
    { label: 'abc / xyz', input: { a: 'abc', b: 'xyz' }, output: '0' },
  ],
  inputPlaceholder: 'first ; second, e.g. abcdxyz ; xyzabcd',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Diagonal source', state: 'compare' }, { label: 'Run just extended / best run', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'diag', 'best'],
  emphasis: ['longest substring', 'contiguous run'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][j]', tone: 'blue' },
    { icon: '🌱', label: 'Base: row 0 & col 0', tone: 'blue' },
    { icon: '📏', label: 'Match → extend run', tone: 'green' },
    { icon: '🔁', label: 'Mismatch → reset to 0', tone: 'orange' },
    { icon: '✅', label: 'Max entry = answer', tone: 'green' },
  ],
  approach: {
    title: 'Runs along diagonals, reset on mismatch',
    text: 'dp[i][j] = dp[i−1][j−1] + 1 when a[i−1] == b[j−1], else 0. Track the largest value over the entire table; it is the answer.',
  },
  java: [
    'static int longestCommonSubstring(String a, String b) {',
    '    int m = a.length(), n = b.length(), best = 0;',
    '    int[][] dp = new int[m + 1][n + 1];',
    '    for (int i = 1; i <= m; i++) {',
    '        for (int j = 1; j <= n; j++) {',
    '            if (a.charAt(i - 1) == b.charAt(j - 1)) {',
    '                dp[i][j] = dp[i - 1][j - 1] + 1;',
    '                best = Math.max(best, dp[i][j]);',
    '            } else {',
    '                dp[i][j] = 0;            // contiguity broken: reset',
    '            }',
    '        }',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def longest_common_substring(a, b):',
    '    m, n, best = len(a), len(b), 0',
    '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
    '    for i in range(1, m + 1):',
    '        for j in range(1, n + 1):',
    '            if a[i - 1] == b[j - 1]:',
    '                dp[i][j] = dp[i - 1][j - 1] + 1',
    '                best = max(best, dp[i][j])',
    '            else:',
    '                dp[i][j] = 0  # contiguity broken: reset',
    '    return best',
  ],
  algorithm: [
    'dp[i][j] = length of the common run ending at a[i−1] and b[j−1]',
    'Base cases: row 0 and column 0 are 0',
    'If the letters match: dp[i][j] = dp[i−1][j−1] + 1, and update best',
    'If they differ: dp[i][j] = 0',
    'Return the maximum value seen (best)',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n)' }, { label: 'Space', value: 'O(m · n), or O(n) with one rolling row' }],
  why: 'A common substring ending at (i, j) must end with equal letters and be preceded by a common substring ending at (i−1, j−1), so each value only depends on the diagonal neighbour. A mismatch makes every substring ending there impossible, hence 0. Every common substring ends at some cell, so the global maximum is the answer.',
};
