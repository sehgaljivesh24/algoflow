import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { words: string[] }

function parse(raw: string): In {
  const words = raw.split(/[\s,]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (!words.length) throw new Error('Enter words separated by spaces, e.g. flower flow flight');
  if (words.some((w) => !/^[a-z]+$/.test(w))) throw new Error('Use lowercase letters a-z only');
  if (words.length > 6) throw new Error('Use 6 words or fewer');
  if (words.some((w) => w.length > 9)) throw new Error('Keep each word to 9 letters or fewer');
  return { words };
}

function build({ words }: In): Step[] {
  const steps: Step[] = [];
  const w = Math.max(...words.map((x) => x.length));
  const first = words[0];
  let plen = 0; // length of the confirmed prefix

  // state per cell: columns < plen are confirmed, `col` is under test, `bad` is the mismatching word
  const scene = (col: number, bad = -1, upto = words.length) => ({
    kind: 'grid' as const,
    rows: words.map((word, r): Cell[] =>
      Array.from({ length: w }, (_, c) => {
        const value = c < word.length ? word[c] : '';
        let state: CellState | undefined;
        if (c < plen) state = 'found';
        else if (c === col) state = r === bad ? 'error' : r < upto ? 'active' : 'compare';
        else if (c > col && col >= 0) state = 'dim';
        else if (!value) state = 'dim';
        return { key: `${r}-${c}`, value, state };
      }),
    ),
    rowHeads: words.map((_, r) => `w${r}`),
    colHeads: Array.from({ length: w }, (_, c) => String(c)),
  });
  const aux = () => [{ title: 'common prefix so far', kind: 'list' as const, items: [...first.slice(0, plen)] }];
  const vars = (c: number | string, ch: string) => ({ col: c, char: ch, prefix: `"${first.slice(0, plen)}"` });
  const finish = (reason: string, title: string, col: number, bad: number) => {
    const prefix = first.slice(0, plen);
    steps.push({
      title, desc: reason, scene: scene(col, bad), aux: aux(), vars: vars(col, col < first.length ? first[col] : '—'),
      logic: 'Everything to the left of this column agreed in every word, and this column does not, so the prefix cannot grow any more.', logicTone: 'warn',
      javaLines: [4, 5], pyLines: [3, 4], algoStep: 3,
      result: { title: JSON.stringify(prefix), text: prefix ? `Common prefix: "${prefix}"` : 'No common prefix' },
    });
  };

  steps.push({
    title: 'Start', desc: `Find the longest prefix shared by all ${words.length} word${words.length > 1 ? 's' : ''}.`,
    scene: scene(-1), aux: aux(), vars: vars('—', '—'),
    logic: 'Scan column by column using the first word as the reference. The first column where any word disagrees (or runs out) ends the prefix.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  for (let c = 0; c < first.length; c++) {
    const ch = first[c];
    let broke = false;
    for (let r = 1; r < words.length; r++) {
      if (c >= words[r].length || words[r][c] !== ch) {
        finish(c >= words[r].length ? `"${words[r]}" has no letter at column ${c}, so the prefix stops at length ${plen}.` : `Column ${c}: "${words[r]}" has '${words[r][c]}' but "${first}" has '${ch}'. The prefix stops at length ${plen}.`, 'Mismatch found', c, r);
        broke = true;
        break;
      }
    }
    if (broke) return steps;
    steps.push({
      title: `Column ${c}: all words have '${ch}'`, desc: `Every word has '${ch}' at column ${c}, so the prefix grows to "${first.slice(0, c + 1)}".`,
      scene: scene(c), aux: aux(), vars: vars(c, ch),
      logic: 'Agreement in this column extends the prefix by one letter.', logicTone: 'success', javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3], algoStep: 2,
    });
    plen = c + 1;
  }

  steps.push({
    title: 'First word exhausted', desc: `Every letter of "${first}" matched in every other word, so the whole first word is the prefix.`,
    scene: scene(-1), aux: aux(), vars: vars('—', '—'),
    logic: 'The common prefix can never be longer than the first word.', logicTone: 'success', javaLines: [8], pyLines: [5], algoStep: 3,
    result: { title: JSON.stringify(first), text: `Common prefix: "${first}"` },
  });
  return steps;
}

export const longestCommonPrefix: ProblemDef<In> = {
  slug: '14-longest-common-prefix',
  id: '14', title: 'Longest Common Prefix', difficulty: 'Easy', category: 'Strings', tag: 'string',
  statement: 'Given a list of strings, return the longest string that is a prefix of every one of them, or an empty string if there is none.',
  constraints: '1 ≤ words ≤ 200, 0 ≤ length ≤ 200, lowercase letters (animation: up to 6 words of up to 9 letters)',
  examples: [
    { label: 'flower flow flight', input: { words: ['flower', 'flow', 'flight'] }, output: '"fl"' },
    { label: 'dog racecar car', input: { words: ['dog', 'racecar', 'car'] }, output: '""' },
    { label: 'interview internet interval', input: { words: ['interview', 'internet', 'interval'] }, output: '"inter"' },
  ],
  inputPlaceholder: 'e.g. flower flow flight',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Column being tested', state: 'active' }, { label: 'Confirmed prefix', state: 'found' }, { label: 'Mismatch / word ended', state: 'error' }, { label: 'Not reached', state: 'dim' }],
  varLabels: ['col', 'char', 'prefix'],
  approach: {
    title: 'Vertical scan',
    text: 'Take the letter in column c of the first word and compare it with column c of every other word. Stop at the first disagreement or at the end of any word.',
  },
  java: [
    'public String longestCommonPrefix(String[] strs) {',
    '    for (int c = 0; c < strs[0].length(); c++) {',
    '        char ch = strs[0].charAt(c);',
    '        for (int r = 1; r < strs.length; r++) {',
    '            if (c == strs[r].length() || strs[r].charAt(c) != ch)',
    '                return strs[0].substring(0, c);',
    '        }',
    '    }',
    '    return strs[0];',
    '}',
  ],
  python: [
    'def longest_common_prefix(strs):',
    '    for c, ch in enumerate(strs[0]):',
    '        for s in strs[1:]:',
    '            if c == len(s) or s[c] != ch:',
    '                return strs[0][:c]',
    '    return strs[0]',
  ],
  algorithm: [
    'Use the first word as the reference',
    'For column c, read the letter of the first word',
    'Check the same column in every other word',
    'On a mismatch or a too-short word return the prefix up to c; otherwise move to the next column',
  ],
  complexity: [{ label: 'Time', value: 'O(S) — total characters' }, { label: 'Space', value: 'O(1)' }],
  why: 'A common prefix of length L exists exactly when all words agree on columns 0..L−1. Scanning columns left to right and stopping at the first column that fails gives the largest such L. Each character is inspected at most once, so the work is bounded by the total number of characters.',
};
