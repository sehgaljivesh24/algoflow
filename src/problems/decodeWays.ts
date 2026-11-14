import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { recorder } from './stepKit.ts';

interface In { s: string }

function parse(raw: string): In {
  const s = raw.replace(/\s+/g, '');
  if (!/^[0-9]+$/.test(s)) throw new Error('Enter digits only, e.g. 226');
  if (s.length > 12) throw new Error('Use 12 digits or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const n = s.length;
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let at = -1;
  let done = false;
  let one: number | string = '—';
  let two: number | string = '—';
  let src: number[] = [];

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        [{ key: 'c0', value: '·', state: 'dim' } as Cell].concat([...s].map((ch, k): Cell => ({
          key: `c${k + 1}`, value: ch,
          state: at >= 1 && (k + 1 === at || k + 1 === at - 1) ? 'compare' : undefined,
        }))),
        dp.map((v, i): Cell => ({
          key: `d${i}`, value: v === null ? '?' : v,
          state: i === at ? (done ? 'found' : 'active') : src.includes(i) ? 'compare' : v === null ? 'dim' : undefined,
        })),
      ],
      rowHeads: ['digit', 'dp'], colHeads: Array.from({ length: n + 1 }, (_, i) => String(i)),
    },
    vars: { i: at < 0 ? '—' : at, 'one digit': one, 'two digits': two },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i] = number of ways to decode the first i digits of "${s}". Digits 1-26 map to letters A-Z.`,
    logic: 'The last letter of a decoding uses either the last 1 digit (1-9) or the last 2 digits (10-26).',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp[0..${n}] allocated for "${s}"`,
  });

  dp[0] = 1;
  at = 0;
  done = true;
  say({
    title: 'Base case dp[0] = 1', tag: 'BASE CASE —', desc: 'There is exactly one way to decode an empty prefix: decode nothing, so dp[0] = 1.',
    logic: 'This seed makes the later additions work, e.g. "12" can be decoded as one 2-digit letter via dp[0].', tone: 'success', java: [3], py: [3], algo: 1,
    note: 'dp[0] = 1',
  });

  for (let i = 1; i <= n; i++) {
    at = i;
    done = false;
    src = [];
    const d1 = s[i - 1] !== '0';
    const w = d1 ? dp[i - 1]! : 0;
    const pair = i >= 2 ? Number(s.slice(i - 2, i)) : -1;
    const d2 = i >= 2 && pair >= 10 && pair <= 26;
    const w2 = d2 ? dp[i - 2]! : 0;
    if (d1) src.push(i - 1);
    if (d2) src.push(i - 2);
    one = w;
    two = w2;
    dp[i] = w + w2;
    done = true;
    const why1 = d1 ? `"${s[i - 1]}" is a valid letter, so add dp[${i - 1}] = ${dp[i - 1]}` : `"0" cannot stand alone, so +0`;
    const why2 = i < 2 ? 'no second digit yet, so +0' : d2 ? `"${s.slice(i - 2, i)}" is within 10-26, so add dp[${i - 2}] = ${dp[i - 2]}` : `"${s.slice(i - 2, i)}" is not within 10-26, so +0`;
    say({
      title: `dp[${i}] = ${w} + ${w2} = ${dp[i]}`, tag: dp[i] === 0 ? 'DEAD END —' : 'EXTEND —', desc: `Prefix of ${i}. One digit: ${why1}. Two digits: ${why2}. So dp[${i}] = ${dp[i]}.`,
      logic: dp[i] === 0 ? 'No decoding works for this prefix, and every longer prefix depending on it also gets 0.' : 'Add the decodings that end with a 1-digit letter and those that end with a 2-digit letter.',
      tone: dp[i] === 0 ? 'warn' : 'info', java: [4, 5, 6, 7, 8], py: [4, 5, 6, 7, 8], algo: 2,
      note: `dp[${i}] = ${w} (1 digit) + ${w2} (2 digits) = ${dp[i]}`,
      ...(dp[i] === 0 ? { alert: `No valid split for the first ${plural(i, 'digit')}: dp[${i}] = 0, and anything built on it stays 0.` } : {}),
    });
    src = [];
  }

  at = n;
  one = '—';
  two = '—';
  say({
    title: 'Done', tag: '✅ Done!', desc: `"${s}" can be decoded in ${dp[n]} way${dp[n] === 1 ? '' : 's'}: the answer is dp[${n}] = ${dp[n]}.`,
    logic: 'dp[n] covers the whole string.', tone: 'success', java: [11], py: [9], note: `return dp[${n}] = ${dp[n]}`,
    algo: 3, result: { title: String(dp[n]), text: `Number of ways to decode "${s}"` },
  });
  return steps;
}

export const decodeWays: ProblemDef<In> = {
  slug: '91-decode-ways',
  id: '91', title: 'Decode Ways', difficulty: 'Medium', category: 'Dynamic Programming', tag: '1D DP',
  statement: 'The letters A-Z are encoded as 1-26. Given a string of digits, count the ways to split it into valid codes. A code cannot start with 0 (so "06" is invalid).',
  constraints: '1 ≤ s.length ≤ 100 (animation input is limited to 12 digits)',
  examples: [
    { label: '"12"', input: { s: '12' }, output: '2' },
    { label: '"226"', input: { s: '226' }, output: '3' },
    { label: '"2101"', input: { s: '2101' }, output: '1' },
    { label: '"06"', input: { s: '06' }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 226',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Sources / digits used', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'one digit', 'two digits'],
  emphasis: ['count the ways', 'valid codes', 'cannot start with 0'],
  phases: [
    { icon: '🧱', label: 'Define dp[i]', tone: 'blue' },
    { icon: '🌱', label: 'Base dp[0] = 1', tone: 'blue' },
    { icon: '🔡', label: 'One digit + two digits', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Last letter uses one digit or two',
    text: 'dp[i] = (s[i−1] ≠ "0" ? dp[i−1] : 0) + (10 ≤ int(s[i−2..i]) ≤ 26 ? dp[i−2] : 0), with dp[0] = 1. The answer is dp[n].',
  },
  java: [
    'public int numDecodings(String s) {',
    '    int n = s.length();',
    '    int[] dp = new int[n + 1];',
    '    dp[0] = 1;',
    '    for (int i = 1; i <= n; i++) {',
    "        if (s.charAt(i - 1) != '0') dp[i] += dp[i - 1];",
    '        if (i >= 2) {',
    '            int two = Integer.parseInt(s.substring(i - 2, i));',
    '            if (two >= 10 && two <= 26) dp[i] += dp[i - 2];',
    '        }',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def num_decodings(s):',
    '    n = len(s)',
    '    dp = [0] * (n + 1)',
    '    dp[0] = 1',
    '    for i in range(1, n + 1):',
    '        if s[i - 1] != "0":',
    '            dp[i] += dp[i - 1]',
    '        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:',
    '            dp[i] += dp[i - 2]',
    '    return dp[n]',
  ],
  algorithm: [
    'dp[i] = ways to decode the first i digits',
    'Base case: dp[0] = 1',
    'Add dp[i−1] if the last digit is 1-9; add dp[i−2] if the last two digits are 10-26',
    'Return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n), or O(1) with two variables' }],
  why: 'Every decoding of the first i digits ends with a single-digit code or a two-digit code, never both, so the two groups are disjoint. Each group is in one-to-one correspondence with the decodings of a shorter prefix, which is already stored. Zero handling falls out naturally: a lone "0" or an out-of-range pair contributes nothing.',
};
