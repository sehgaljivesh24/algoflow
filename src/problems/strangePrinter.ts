import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arr, find, gc, ptr, recorder } from './dpAdvKit.ts';

interface In { s: string }

const java = [
  'public int strangePrinter(String str) {',
  '    String s = compress(str);                       // collapse runs: "aaabbb" -> "ab"',
  '    int n = s.length();',
  '    int[][] dp = new int[n][n];                     // dp[i][j]: fewest print turns for s[i..j]',
  '    for (int i = 0; i < n; i++) dp[i][i] = 1;',
  '    for (int len = 2; len <= n; len++) {            // substring length, shortest first',
  '        for (int i = 0; i + len - 1 < n; i++) {',
  '            int j = i + len - 1;',
  '            dp[i][j] = dp[i + 1][j] + 1;            // option A: print s[i] on its own turn',
  '            for (int k = i + 1; k <= j; k++) {',
  '                if (s.charAt(k) == s.charAt(i)) {   // option B: one stroke covers s[i] and s[k]',
  '                    int inside = (k - 1 >= i + 1) ? dp[i + 1][k - 1] : 0;',
  '                    dp[i][j] = Math.min(dp[i][j], inside + dp[k][j]);',
  '                }',
  '            }',
  '        }',
  '    }',
  '    return dp[0][n - 1];',
  '}',
];
const python = [
  'def strange_printer(text):',
  '    s = "".join(c for i, c in enumerate(text) if i == 0 or c != text[i - 1])   # collapse runs',
  '    n = len(s)',
  '    dp = [[0] * n for _ in range(n)]                # dp[i][j]: fewest print turns for s[i..j]',
  '    for i in range(n):',
  '        dp[i][i] = 1',
  '    for length in range(2, n + 1):                  # substring length, shortest first',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1',
  '            dp[i][j] = dp[i + 1][j] + 1             # option A: print s[i] on its own turn',
  '            for k in range(i + 1, j + 1):',
  '                if s[k] == s[i]:                    # option B: one stroke covers s[i] and s[k]',
  '                    inside = dp[i + 1][k - 1] if k - 1 >= i + 1 else 0',
  '                    dp[i][j] = min(dp[i][j], inside + dp[k][j])',
  '    return dp[0][n - 1]',
];
const J = { comp: find(java, 'String s = compress', 'int n = s.length()'), def: find(java, 'int[][] dp'), base: find(java, 'dp[i][i] = 1'), len: find(java, 'for (int len', 'int j = i + len'), a: find(java, 'dp[i][j] = dp[i + 1][j] + 1'), b: find(java, 'for (int k', 'if (s.charAt(k)', 'int inside', 'dp[i][j] = Math.min'), ret: find(java, 'return dp[0][n - 1]') };
const P = { comp: find(python, 's = "".join', 'n = len(s)'), def: find(python, 'dp = [[0]'), base: find(python, 'dp[i][i] = 1'), len: find(python, 'for length', 'j = i + length'), a: find(python, 'dp[i][j] = dp[i + 1][j] + 1'), b: find(python, 'for k in', 'if s[k] == s[i]', 'inside =', 'dp[i][j] = min'), ret: find(python, 'return dp[0][n - 1]') };

const compress = (t: string) => t.split('').filter((c, i) => i === 0 || c !== t[i - 1]).join('');

function build({ s: raw }: In): Step[] {
  const s = compress(raw);
  const n = s.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const steps: Step[] = [];
  let ci = -1;
  let cj = -1;
  let ck = -1;
  let done = false;
  let cand: number | string = '—';
  let cur: number | string = '—';
  let tries: string[] = [];
  const at = (i: number, j: number) => (i > j ? 0 : dp[i][j]!);

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'array' as const, cells: arr(s.split(''), (x) => (ci >= 0 && x >= ci && x <= cj ? (x === ci || x === ck ? 'swap' : 'active') : undefined), undefined, 'c'),
          pointers: ci >= 0 ? [ptr('i', 'i', ci, 'blue'), ...(ck >= 0 ? [ptr('k', 'k', ck, 'orange')] : []), ...(cj !== ci && cj !== ck ? [ptr('j', 'j', cj, 'green')] : [])] : [],
        },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: dp.map((row, i) => row.map((v, j) => {
            if (j < i) return gc(`${i},${j}`, '·', 'dim');
            let st: CellState | undefined;
            if (i === ci && j === cj) st = done ? 'found' : 'active';
            else if (ci >= 0 && ((i === ci + 1 && j === cj) || (ck >= 0 && ((i === ci + 1 && j === ck - 1) || (i === ck && j === cj))))) st = 'compare';
            else if (v === null) st = 'dim';
            return gc(`${i},${j}`, v === null ? '?' : v, st);
          })),
          rowHeads: s.split('').map((c, i) => `i=${i} '${c}'`), colHeads: s.split('').map((_c, j) => `j=${j}`),
        },
      ],
    },
    aux: [{ title: ci >= 0 ? `options for s[${ci}..${cj}]` : 'options', kind: 'list' as const, items: [...tries] }],
    vars: { i: ci < 0 ? '—' : ci, j: cj < 0 ? '—' : cj, k: ck < 0 ? '—' : ck, cand, 'dp[i][j]': cur },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Squash repeated letters', desc: raw === s ? `"${raw}" has no neighbouring duplicates, so nothing to squash.` : `"${raw}" → "${s}": a run of equal letters is printed in one stroke anyway, so neighbours that are equal can be merged first.`,
    logic: 'This keeps the table small and guarantees s[i] ≠ s[i+1] in the recurrence.', java: J.comp, py: P.comp, algo: 0,
    tag: 'SQUASH —', note: `"${raw}" → "${s}" (${n} letter${n === 1 ? '' : 's'})`,
  });
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  say({
    title: 'Base: one letter = one turn', desc: `dp[i][j] = fewest turns to print s[i..j] (each turn paints one stretch with one letter, overwriting what is below). A single letter needs 1 turn: the diagonal.`,
    logic: 'Later turns may overwrite earlier ones, which is what makes shared strokes possible.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: 'dp[i][i] = 1 for every single letter',
  });

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      ci = i;
      cj = j;
      ck = -1;
      done = false;
      tries = [];
      dp[i][j] = dp[i + 1][j]! + 1;
      cand = dp[i][j]!;
      cur = dp[i][j]!;
      tries.push(`alone: dp[${i + 1}][${j}] + 1 = ${dp[i][j]}`);
      if (len === 2 || ![...s.slice(i + 1, j + 1)].includes(s[i])) done = true;
      say({
        title: `s[${i}..${j}] = "${s.slice(i, j + 1)}": print '${s[i]}' alone`, desc: `Give '${s[i]}' its own turn, then print the rest s[${i + 1}..${j}]: ${dp[i + 1][j]} + 1 = ${dp[i][j]}.${done ? ' No later letter equals it, so this is the only option.' : ''}`,
        logic: 'The safe upper bound: one extra turn for the first letter, then the shorter substring.', java: J.a, py: P.a, algo: 2,
        tag: 'PRINT ALONE —', note: `dp[${i}][${j}] = dp[${i + 1}][${j}] + 1 = ${dp[i + 1][j]} + 1 = ${dp[i][j]}`,
      });
      const matches: number[] = [];
      for (let k = i + 1; k <= j; k++) if (s[k] === s[i]) matches.push(k);
      matches.forEach((k, idx) => {
        ck = k;
        const inside = at(i + 1, k - 1);
        const c = inside + dp[k][j]!;
        const better = c < dp[i][j]!;
        if (better) dp[i][j] = c;
        cand = c;
        cur = dp[i][j]!;
        tries.push(`share with k=${k}: dp[${i + 1}][${k - 1}] + dp[${k}][${j}] = ${inside} + ${dp[k][j]} = ${c}`);
        if (idx === matches.length - 1) done = true;
        say({
          title: `s[${i}] = s[${k}] = '${s[i]}': share one stroke`, desc: `One stroke of '${s[i]}' can cover position ${i} and position ${k}; the letters between (${i + 1}..${k - 1}) are printed over it: ${inside}. Then ${k}..${j} costs ${dp[k][j]} (the stroke is already paid for). Total ${c}. ${better ? `Improves dp[${i}][${j}] to ${c}.` : `Not better than ${dp[i][j]}.`}`,
          logic: 'Painting a long stretch first and overwriting the middle is free sharing: s[i] rides along with the stroke that prints s[k].', tone: better ? 'success' : 'info', java: J.b, py: P.b, algo: 3,
          tag: better ? 'SHARE STROKE · BEST —' : 'SHARE STROKE —', note: `dp[${i}][${j}] = min(…, dp[${i + 1}][${k - 1}] + dp[${k}][${j}] = ${inside} + ${dp[k][j]} = ${c}) = ${dp[i][j]}`,
        });
      });
    }
  }

  ci = 0;
  cj = n - 1;
  ck = -1;
  done = true;
  cur = dp[0][n - 1]!;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[0][${n - 1}] = ${dp[0][n - 1]}`, desc: `The printer needs ${dp[0][n - 1]} turn${dp[0][n - 1] === 1 ? '' : 's'} for "${raw}".`,
    logic: 'dp over the full string is the answer.', tone: 'success', java: J.ret, py: P.ret, algo: 4,
    result: { title: String(dp[0][n - 1]), text: 'Minimum turns' },
  });
  return steps;
}

export const strangePrinter: ProblemDef<In> = {
  slug: '664-strange-printer',
  id: '664', title: 'Strange Printer', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'interval DP · equal ends',
  statement: 'A printer prints a run of the same character in one turn, and each turn may start and end anywhere, overwriting whatever was printed there. Given a string, return the minimum number of turns needed to print it.',
  constraints: '1 ≤ s.length ≤ 100, lowercase letters (animation input: ≤ 8 lowercase letters)',
  examples: [
    { label: 'abcabc', input: { s: 'abcabc' }, output: '5' },
    { label: 'aba', input: { s: 'aba' }, output: '2' },
    { label: 'aaabbb', input: { s: 'aaabbb' }, output: '2' },
  ],
  inputPlaceholder: 'lowercase string, e.g. aba',
  parseInput: (raw) => {
    const s = raw.trim();
    if (!/^[a-z]{1,8}$/.test(s)) throw new Error('Enter 1 to 8 lowercase letters, e.g. abcab');
    return { s };
  },
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Substring being solved', state: 'active' }, { label: 'Sub-problems it reuses', state: 'compare' }, { label: 'Finished', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'k', 'cand', 'dp[i][j]'],
  emphasis: ['same character in one turn', 'overwriting', 'minimum number of turns'],
  phases: [
    { icon: '🗜️', label: 'Squash repeated letters', tone: 'blue' },
    { icon: '🌱', label: 'Base: one letter = 1 turn', tone: 'blue' },
    { icon: '🖨️', label: 'Option A: print s[i] alone', tone: 'cyan' },
    { icon: '🔗', label: 'Option B: share a stroke', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'The first letter either prints alone or shares a stroke',
    text: 'After merging equal neighbours, take s[i..j]. Option A prints s[i] alone: dp[i+1][j] + 1. Option B pairs s[i] with a later equal letter s[k]: one stroke covers both, the part between is printed over it, so the cost is dp[i+1][k−1] + dp[k][j]. Fill by increasing length and take the minimum.',
  },
  java, python,
  algorithm: [
    'Merge equal neighbouring letters',
    'dp[i][i] = 1; dp[i][j] = fewest turns for s[i..j]',
    'Start with dp[i][j] = dp[i+1][j] + 1 (print s[i] alone)',
    'For each k with s[k] = s[i]: try dp[i+1][k−1] + dp[k][j]',
    'Fill by length; answer dp[0][n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n³)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'In an optimal plan the first letter s[i] is painted by some stroke. Either that stroke covers only s[i] (option A), or it extends over the next occurrence s[k] of the same letter and may as well be the same stroke as s[k]’s, since nothing is lost by painting the whole stretch and overwriting inside it (option B). Both options reduce to strictly shorter substrings, so filling by length is safe, and minimising over the choices gives the optimum.',
};
