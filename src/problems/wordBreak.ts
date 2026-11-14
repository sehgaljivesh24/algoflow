import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';

interface In { s: string; words: string[] }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: string ; word1 word2 … — e.g. leetcode ; leet code');
  const s = left.trim();
  const words = right.split(/[\s,]+/).filter(Boolean);
  if (!/^[a-z]+$/.test(s)) throw new Error('The string must be lowercase letters a-z');
  if (s.length > 12) throw new Error('Use a string of 12 letters or fewer');
  if (!words.length || words.length > 5 || words.some((w) => !/^[a-z]+$/.test(w))) throw new Error('Give 1 to 5 lowercase dictionary words');
  return { s, words: [...new Set(words)] };
}

function build({ s, words }: In): Step[] {
  const n = s.length;
  const dp: (boolean | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let at = -1;
  let word = '—';
  let from = -1;
  let done = false;
  let hit: boolean | null = null;

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        [{ key: 'c0', value: '·', state: 'dim' } as Cell].concat([...s].map((ch, k): Cell => ({
          key: `c${k + 1}`, value: ch,
          state: from >= 0 && k >= from && k < at ? (hit === false ? 'error' : 'compare') : undefined,
        }))),
        dp.map((v, i): Cell => ({
          key: `d${i}`, value: v === null ? '?' : v ? 'T' : 'F',
          state: i === at ? (done ? 'found' : 'active') : i === from ? 'compare' : v === null ? 'dim' : undefined,
          tone: v ? 'green' : undefined,
        })),
      ],
      rowHeads: ['char', 'dp'], colHeads: Array.from({ length: n + 1 }, (_, i) => String(i)),
    },
    aux: [{ title: 'dictionary', kind: 'list' as const, items: [...words] }],
    vars: { i: at < 0 ? '—' : at, word, 'dp[i-len]': from < 0 ? '—' : dp[from] ? 'T' : 'F' },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `dp[i] = can the first i letters of "${s}" be split into dictionary words? T means yes.`,
    logic: 'A prefix is breakable if some word ends exactly at i and everything before that word is already breakable.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, tag: 'DEFINE', note: `dp = boolean[${n + 1}], dictionary = [${words.join(', ')}]`,
  });

  dp[0] = true;
  at = 0;
  done = true;
  say({
    title: 'Base case dp[0] = T', desc: 'dp[0] = T: the empty prefix is trivially breakable, so a word starting at position 0 can be accepted',
    logic: 'A word that starts at position 0 needs this to be true.', tone: 'success', java: [3], py: [3], algo: 1, tag: 'BASE', note: 'dp[0] = true',
  });

  for (let i = 1; i <= n; i++) {
    at = i;
    done = false;
    dp[i] = null;
    let ok = false;
    for (const w of words) {
      const len = w.length;
      word = w;
      if (len > i) {
        from = -1;
        hit = null;
        continue;
      }
      from = i - len;
      const prefixOk = dp[from] === true;
      const match = s.startsWith(w, from);
      hit = prefixOk && match;
      if (hit) {
        ok = true;
        dp[i] = true;
        done = true;
      }
      say({
        title: `i = ${i}: does "${w}" end here?`,
        desc: hit
          ? `"${w}" matches s[${from}..${i}) and dp[${from}] is T, so dp[${i}] = T`
          : !match ? `s[${from}..${i}) is "${s.slice(from, i)}", not "${w}", so this word does not end here` : `"${w}" matches s[${from}..${i}), but dp[${from}] is F: the part before it cannot be split`,
        logic: 'Both conditions must hold: the word fits the text AND the text before it is breakable.',
        tone: hit ? 'success' : 'info', java: [5, 6, 7, 8, 9], py: [5, 6, 7, 8, 9], algo: 2,
        tag: hit ? 'MATCH' : 'TRY WORD',
        note: hit ? `dp[${from}] && startsWith("${w}", ${from}) → dp[${i}] = true` : !match ? `startsWith("${w}", ${from}) is false` : `dp[${from}] is false`,
        alert: hit ? undefined : !match ? `"${w}" does not fit: s[${from}..${i}) is "${s.slice(from, i)}".` : `"${w}" fits, but dp[${from}] is F, so the text before it is not breakable.`,
      });
      if (hit) break;
    }
    if (!ok) {
      dp[i] = false;
      from = -1;
      hit = null;
      word = '—';
      done = true;
      say({
        title: `dp[${i}] = F`, desc: `no dictionary word ends at position ${i} with a breakable prefix before it, so dp[${i}] = F`,
        logic: 'Nothing works, so this prefix cannot be split.', tone: 'warn', java: [11], py: [5], algo: 3,
        tag: 'NO WORD FITS', note: `dp[${i}] stays false`, alert: `Every word failed at position ${i}: the prefix "${s.slice(0, i)}" cannot be split.`,
      });
    }
  }

  at = n;
  from = -1;
  word = '—';
  hit = null;
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: dp[n] ? `dp[${n}] = T, so "${s}" can be segmented into dictionary words` : `dp[${n}] = F, so "${s}" cannot be segmented`,
    logic: 'dp[n] answers for the whole string.', tone: dp[n] ? 'success' : 'warn', java: [13], py: [10], note: `return dp[${n}] = ${!!dp[n]}`,
    algo: 4, result: { title: String(!!dp[n]), text: dp[n] ? 'Segmentation exists' : 'No segmentation' },
  });
  return steps;
}

export const wordBreak: ProblemDef<In> = {
  slug: '139-word-break',
  id: '139', title: 'Word Break', difficulty: 'Medium', category: 'Dynamic Programming', tag: '1D DP on prefixes',
  statement: 'Given a string s and a dictionary of words, decide whether s can be split into a sequence of one or more dictionary words (words may be reused).',
  constraints: '1 ≤ s.length ≤ 300 (animation input: ≤ 12 lowercase letters and ≤ 5 words)',
  examples: [
    { label: 'leetcode / leet code', input: { s: 'leetcode', words: ['leet', 'code'] }, output: 'true' },
    { label: 'applepen / apple pen', input: { s: 'applepen', words: ['apple', 'pen'] }, output: 'true' },
    { label: 'catsandog / cats dog sand and cat', input: { s: 'catsandog', words: ['cats', 'dog', 'sand', 'and', 'cat'] }, output: 'false' },
  ],
  inputPlaceholder: 'string ; words, e.g. leetcode ; leet code',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Prefix being decided', state: 'active' }, { label: 'Word window / dp[i−len]', state: 'compare' }, { label: 'Word does not fit', state: 'error' }, { label: 'Decided', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'word', 'dp[i-len]'],
  emphasis: ['dictionary', 'words may be reused'],
  phases: [
    { icon: '📋', label: 'DEFINE dp', tone: 'blue' },
    { icon: '🌱', label: 'BASE dp[0] = T', tone: 'cyan' },
    { icon: '🔍', label: 'TRY each word', tone: 'gold' },
    { icon: '🚫', label: 'NO WORD FITS', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Which prefixes can be split?',
    text: 'dp[0] = true. For each i, try every word w: if w ends at i (s[i−len..i) == w) and dp[i−len] is true, set dp[i] = true. The answer is dp[n].',
  },
  java: [
    'public boolean wordBreak(String s, List<String> dict) {',
    '    int n = s.length();',
    '    boolean[] dp = new boolean[n + 1];',
    '    dp[0] = true;                               // empty prefix',
    '    for (int i = 1; i <= n; i++) {',
    '        for (String w : dict) {',
    '            int len = w.length();',
    '            if (len <= i && dp[i - len] && s.startsWith(w, i - len)) {',
    '                dp[i] = true;',
    '                break;',
    '            }',
    '        }',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def word_break(s, words):',
    '    n = len(s)',
    '    dp = [False] * (n + 1)',
    '    dp[0] = True  # empty prefix',
    '    for i in range(1, n + 1):',
    '        for w in words:',
    '            k = len(w)',
    '            if k <= i and dp[i - k] and s.startswith(w, i - k):',
    '                dp[i] = True',
    '                break',
    '    return dp[n]',
  ],
  algorithm: [
    'dp[i] = true if the first i letters can be split into words',
    'Base case: dp[0] = true',
    'For each i and each word w: if w ends at i and dp[i − len(w)] is true, dp[i] = true',
    'If no word works, dp[i] stays false',
    'Return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n · W · L), W words of length ≤ L' }, { label: 'Space', value: 'O(n)' }],
  why: 'Any valid split of the first i letters has a last word w ending at i; the letters before it form a valid split of a shorter prefix. So dp[i] is true exactly when some word fits at the end and the prefix before it is already true. Since the prefix is shorter, left-to-right filling always has it ready.',
};
