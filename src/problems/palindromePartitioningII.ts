import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, heads, recorder } from './stepKit.ts';
import { parsePalString, type PalIn } from './palIntervalKit.ts';
import { rowCells } from './dpCoreKit.ts';

function parse(raw: string): PalIn {
  return capSteps(build, parsePalString(raw, 8));
}

function build({ s }: PalIn): Step[] {
  const n = s.length;
  const pal: (boolean | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const cuts: (number | null)[] = Array(n).fill(null);
  const prev: number[] = Array(n).fill(0);
  const steps: Step[] = [];
  let j = -1;
  let i = -1;
  let src: [number, number] | null = null;
  let cutSrc = -1;
  let verdict: string = '—';
  let cand: number | string = '—';
  let pieces: string[] = [];
  let done = false;

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'grid' as const,
          variant: 'table' as const,
          rows: pal.map((row, r) => row.map((v, c): Cell => {
            if (c < r) return { key: `${r},${c}`, value: '·', state: 'dim' };
            const here = r === i && c === j;
            return {
              key: `${r},${c}`, value: v === null ? '?' : v ? 'T' : 'F', tone: v ? 'green' : undefined,
              state: here ? 'active' : src && src[0] === r && src[1] === c ? 'compare' : v === null ? 'dim' : undefined,
            };
          })),
          rowHeads: [...s].map((ch, k) => `i=${k} ${ch}`),
          colHeads: heads(n, (k) => `${s[k]}${k}`),
        },
        {
          kind: 'array' as const,
          cells: rowCells('k', cuts, (k) => (k === j ? (done ? 'found' : 'active') : k === cutSrc ? 'compare' : undefined)),
          pointers: [
            ...(j >= 0 ? [{ id: 'j', label: 'cuts[j]', index: j, tone: 'blue' as const }] : []),
            ...(cutSrc >= 0 ? [{ id: 'c', label: 'cuts[i−1]', index: cutSrc, tone: 'orange' as const }] : []),
          ],
        },
      ],
    },
    aux: [{ title: 'palindrome pieces', kind: 'list' as const, items: pieces }],
    vars: { j: j < 0 ? '—' : j, i: i < 0 ? '—' : i, 'pal[i][j]': verdict, cand },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Two tables', desc: `pal[i][j] tells whether s[i..j] is a palindrome; cuts[j] = fewest cuts to split the first j+1 letters of "${s}" into palindromes. They are filled together, one end position j at a time.`,
    logic: 'A cut position only matters if the piece after it is a palindrome, so we need quick palindrome checks and the best cut count before that piece.', java: [0, 1, 2, 3], py: [0, 1, 2, 3], algo: 0,
    tag: 'TWO TABLES —', note: `pal[${n}×${n}] and cuts[0..${n - 1}] for s = "${s}"`,
  });

  for (let e = 0; e < n; e++) {
    j = e;
    cuts[e] = e;
    prev[e] = e;
    i = -1;
    src = null;
    cutSrc = -1;
    verdict = '—';
    cand = '—';
    done = false;
    say({
      title: `End at j = ${e}: start with ${e} cuts`, desc: `Worst case, "${s.slice(0, e + 1)}" is cut between every pair of letters: ${e} cuts. Now look for a last palindrome piece s[i..${e}] that does better.`,
      logic: 'The last piece ends at j; its start i decides how many cuts came before it.', java: [4, 5], py: [4, 5], algo: 1,
      tag: `END j = ${e} —`, note: `cuts[${e}] = ${e} (cut between every pair)`,
    });
    for (let b = 0; b <= e; b++) {
      i = b;
      const inner = e - b < 2 ? null : pal[b + 1][e - 1];
      src = e - b < 2 ? null : [b + 1, e - 1];
      const isPal = s[b] === s[e] && (e - b < 2 || inner === true);
      pal[b][e] = isPal;
      verdict = isPal ? 'T' : 'F';
      cutSrc = isPal && b > 0 ? b - 1 : -1;
      cand = isPal ? (b === 0 ? 0 : cuts[b - 1]! + 1) : '—';
      let note: string;
      if (isPal) {
        const c = cand as number;
        if (c < cuts[e]!) {
          cuts[e] = c;
          prev[e] = b;
          note = `Cut count ${c} beats the old value, so cuts[${e}] = ${c}.`;
        } else {
          note = `Cut count ${c} is not better than ${cuts[e]}.`;
        }
      } else {
        note = 'Not a palindrome, so this piece cannot be used.';
      }
      say({
        title: `"${s.slice(b, e + 1)}" ${isPal ? 'is' : 'is not'} a palindrome`,
        desc: `${s[b] === s[e] ? `Ends match (${s[b]})${e - b < 2 ? ' and the piece is at most 2 letters long' : `, and the inside "${s.slice(b + 1, e)}" is ${inner ? '' : 'not '}a palindrome`}.` : `Ends differ: '${s[b]}' ≠ '${s[e]}'.`} ${isPal ? `Cuts before it: ${b === 0 ? 0 : `cuts[${b - 1}] + 1 = ${cand}`}. ${note}` : note}`,
        logic: 'pal[i][j] reuses pal[i+1][j−1] from the previous column, so each palindrome test is O(1).', tone: isPal ? 'success' : 'info',
        java: isPal ? [6, 7, 8, 9] : [6, 7], py: isPal ? [6, 7, 8, 9] : [6, 7], algo: 2,
        tag: isPal ? (typeof cand === 'number' && cuts[e] === cand && prev[e] === b ? 'BETTER CUT —' : 'PALINDROME —') : 'NOT A PALINDROME —',
        note: isPal ? `pal[${b}][${e}] = T → cuts[${e}] = min(…, ${b === 0 ? '0' : `cuts[${b - 1}] + 1`} = ${cand}) = ${cuts[e]}` : `s[${b}] = '${s[b]}' ${s[b] === s[e] ? '= ' : '≠ '}s[${e}] = '${s[e]}'${s[b] === s[e] ? `, inside not a palindrome → pal[${b}][${e}] = F` : ` → pal[${b}][${e}] = F`}`,
        ...(isPal ? {} : { alert: `"${s.slice(b, e + 1)}" is not a palindrome, so it cannot be the last piece.` }),
      });
    }
    i = -1;
    src = null;
    cutSrc = -1;
    verdict = '—';
    cand = '—';
    done = true;
    say({
      title: `cuts[${e}] = ${cuts[e]}`, desc: `The prefix "${s.slice(0, e + 1)}" needs ${cuts[e]} cut${cuts[e] === 1 ? '' : 's'}.`,
      logic: 'Stored for longer prefixes to build on.', tone: 'success', java: [9], py: [9], algo: 2,
      tag: 'STORE —', note: `cuts[${e}] = ${cuts[e]}`,
    });
  }

  // rebuild one optimal partition
  const parts: string[] = [];
  let end = n - 1;
  while (end >= 0) {
    parts.unshift(s.slice(prev[end], end + 1));
    end = prev[end] - 1;
  }
  pieces = parts;
  j = n - 1;
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', note: `return cuts[${n - 1}] = ${cuts[n - 1]}`, desc: `${cuts[n - 1]} cut${cuts[n - 1] === 1 ? '' : 's'}: ${parts.join(' | ')}.`,
    logic: 'cuts[n−1] is the answer for the whole string; the stored best start of each last piece recovers the pieces.', tone: 'success', java: [13], py: [10], algo: 3,
    result: { title: String(cuts[n - 1]), text: parts.join(' | ') },
  });
  return steps;
}

export const palindromePartitioningII: ProblemDef<PalIn> = {
  slug: '132-palindrome-partitioning-ii',
  id: '132', title: 'Palindrome Partitioning II', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'palindrome table + cut DP',
  statement: 'Cut a string into pieces so that every piece is a palindrome. Return the minimum number of cuts needed.',
  constraints: '1 ≤ s.length ≤ 2000 (animation input: 1–8 lowercase letters)',
  examples: [
    { label: 'aab', input: { s: 'aab' }, output: '1' },
    { label: 'abacdc', input: { s: 'abacdc' }, output: '2' },
    { label: 'aaaaaa', input: { s: 'aaaaaa' }, output: '0' },
  ],
  inputPlaceholder: 'lowercase letters, e.g. aab',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'pal[i][j] (left) and cuts[j] (right) — column j is filled before j+1',
  legend: [{ label: 'Piece being tested / cuts[j]', state: 'active' }, { label: 'Value it reads', state: 'compare' }, { label: 'Final cuts[j]', state: 'found' }, { label: 'Not yet / unused', state: 'dim' }],
  varLabels: ['j', 'i', 'pal[i][j]', 'cand'],
  emphasis: ['palindrome', 'minimum number of cuts'],
  phases: [
    { icon: '🗂️', label: 'Two tables: pal[][] + cuts[]', tone: 'blue' },
    { icon: '🔪', label: 'Start cuts[j] = j', tone: 'blue' },
    { icon: '🪞', label: 'Test piece s[i..j]', tone: 'cyan' },
    { icon: '✅', label: 'Done: rebuild pieces', tone: 'green' },
  ],
  approach: {
    title: 'Palindrome table plus a cuts array',
    text: 'For each end j, set cuts[j] = j. For every start i ≤ j with s[i..j] a palindrome (s[i] == s[j] and the inside is a palindrome), cuts[j] = min(cuts[j], i == 0 ? 0 : cuts[i−1] + 1). Return cuts[n−1].',
  },
  java: [
    'public int minCut(String s) {',
    '    int n = s.length();',
    '    boolean[][] pal = new boolean[n][n];           // pal[i][j]: is s[i..j] a palindrome?',
    '    int[] cuts = new int[n];                       // cuts[j]: fewest cuts for s[0..j]',
    '    for (int j = 0; j < n; j++) {',
    '        cuts[j] = j;                               // worst case: cut between every letter',
    '        for (int i = 0; i <= j; i++) {',
    '            if (s.charAt(i) == s.charAt(j) && (j - i < 2 || pal[i + 1][j - 1])) {',
    '                pal[i][j] = true;',
    '                cuts[j] = Math.min(cuts[j], i == 0 ? 0 : cuts[i - 1] + 1);',
    '            }',
    '        }',
    '    }',
    '    return cuts[n - 1];',
    '}',
  ],
  python: [
    'def min_cut(s):',
    '    n = len(s)',
    '    pal = [[False] * n for _ in range(n)]          # pal[i][j]: is s[i..j] a palindrome?',
    '    cuts = [0] * n                                 # cuts[j]: fewest cuts for s[0..j]',
    '    for j in range(n):',
    '        cuts[j] = j                                # worst case: cut between every letter',
    '        for i in range(j + 1):',
    '            if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):',
    '                pal[i][j] = True',
    '                cuts[j] = min(cuts[j], 0 if i == 0 else cuts[i - 1] + 1)',
    '    return cuts[n - 1]',
  ],
  algorithm: [
    'pal[i][j] = s[i..j] is a palindrome; cuts[j] = fewest cuts for the prefix ending at j',
    'For each end j start with cuts[j] = j (cut everywhere)',
    'For each start i: if s[i..j] is a palindrome, cuts[j] = min(cuts[j], cuts[i−1] + 1)',
    'Return cuts[n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'The last piece of any valid partition of s[0..j] is a palindrome s[i..j]; the pieces before it form a valid partition of s[0..i−1], and using the fewest cuts there is always at least as good. So cuts[j] is the minimum over palindromic last pieces of cuts[i−1] + 1 (or 0 when the piece is the whole prefix). Computing pal column by column makes each palindrome test O(1) via pal[i+1][j−1], so the whole thing is quadratic instead of cubic.',
};
