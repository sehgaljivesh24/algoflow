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
  const finish = (reason: string, col: number, bad: number) => {
    const prefix = first.slice(0, plen);
    steps.push({
      title: 'Done', tag: '✅ Done!', desc: reason, scene: scene(col, bad), aux: aux(), vars: vars(col, col < first.length ? first[col] : '—'),
      logic: 'Everything to the left of this column agreed in every word, and this column does not, so the prefix cannot grow any more.', logicTone: 'warn',
      javaLines: [5], pyLines: [4], algoStep: 5, note: `return strs[0].substring(0, ${plen}) = "${prefix}"`,
      result: { title: JSON.stringify(prefix), text: prefix ? `Common prefix: "${prefix}"` : 'No common prefix' },
    });
  };

  steps.push({
    title: 'Start', tag: 'READY —', desc: `Find the longest prefix shared by all ${words.length} word${words.length > 1 ? 's' : ''}, using "${first}" as the reference.`,
    scene: scene(-1), aux: aux(), vars: vars('—', '—'),
    logic: 'Scan column by column using the first word as the reference. The first column where any word disagrees (or runs out) ends the prefix.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0, note: `strs[0] = "${first}", prefix length 0`,
  });

  for (let c = 0; c < first.length; c++) {
    const ch = first[c];
    steps.push({
      title: `Column ${c}: reference letter '${ch}'`, tag: 'READ',
      desc: `column ${c}: the reference word "${first}" has '${ch}' here, so every other word must have '${ch}' too`,
      scene: scene(c, -1, 1), aux: aux(), vars: vars(c, ch),
      logic: 'The first word fixes which letter each other word has to show in this column.', logicTone: 'info',
      javaLines: [1, 2], pyLines: [1], algoStep: 1, note: `ch = strs[0].charAt(${c}) = '${ch}'`,
    });
    for (let r = 1; r < words.length; r++) {
      const short = c >= words[r].length;
      if (short || words[r][c] !== ch) {
        const reason = short
          ? `"${words[r]}" has no letter at column ${c}, so the prefix stops at length ${plen}`
          : `column ${c}: "${words[r]}" has '${words[r][c]}' but "${first}" has '${ch}', so the prefix stops at length ${plen}`;
        steps.push({
          title: 'Mismatch found', tag: 'MISMATCH', desc: reason, scene: scene(c, r, r + 1), aux: aux(), vars: vars(c, ch),
          alert: short ? `"${words[r]}" is too short: column ${c} does not exist in it.` : `'${words[r][c]}' ≠ '${ch}': the prefix cannot grow past length ${plen}.`,
          logic: 'Everything to the left of this column agreed in every word, and this column does not, so the prefix cannot grow any more.', logicTone: 'warn',
          javaLines: [3, 4], pyLines: [2, 3], algoStep: 4,
          note: short ? `c == strs[${r}].length() = ${words[r].length}` : `strs[${r}].charAt(${c}) = '${words[r][c]}' != '${ch}'`,
        });
        finish(`the longest common prefix is ${plen ? `"${first.slice(0, plen)}"` : 'empty'} (length ${plen}) because column ${c} breaks at "${words[r]}"`, c, r);
        return steps;
      }
      steps.push({
        title: `Column ${c}: "${words[r]}" has '${ch}'`, tag: 'COMPARE', desc: `"${words[r]}" has '${words[r][c]}' at column ${c}, which equals the reference '${ch}'`,
        scene: scene(c, -1, r + 1), aux: aux(), vars: vars(c, ch),
        logic: 'This word agrees in the column; check the next word.', logicTone: 'info',
        javaLines: [3, 4], pyLines: [2, 3], algoStep: 2, note: `strs[${r}].charAt(${c}) = '${words[r][c]}' == '${ch}'`,
      });
    }
    steps.push({
      title: `Column ${c}: all words have '${ch}'`, tag: 'EXTEND', desc: `every word has '${ch}' at column ${c}, so the prefix grows to "${first.slice(0, c + 1)}"`,
      scene: scene(c), aux: aux(), vars: vars(c, ch),
      logic: 'Agreement in this column extends the prefix by one letter.', logicTone: 'success', javaLines: [6, 7], pyLines: [2], algoStep: 3,
      note: `prefix length ${c} → ${c + 1}`,
    });
    plen = c + 1;
  }

  steps.push({
    title: 'First word exhausted', tag: '✅ Done!', desc: `every letter of "${first}" matched in every other word, so the whole first word is the prefix`,
    scene: scene(-1), aux: aux(), vars: vars('—', '—'),
    logic: 'The common prefix can never be longer than the first word.', logicTone: 'success', javaLines: [8], pyLines: [5], algoStep: 5,
    note: `return strs[0] = "${first}"`,
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
  emphasis: ['longest string', 'prefix of every one'],
  phases: [
    { icon: '🎯', label: 'REFERENCE word', tone: 'blue' },
    { icon: '🔤', label: 'READ column letter', tone: 'cyan' },
    { icon: '🔍', label: 'COMPARE other words', tone: 'gold' },
    { icon: '➕', label: 'EXTEND prefix', tone: 'green' },
    { icon: '❌', label: 'MISMATCH → stop', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
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
    'Compare the same column in every other word',
    'All words agree: the prefix grows by one letter, go to the next column',
    'A mismatch or a too-short word ends the prefix at column c',
    'Return the prefix',
  ],
  complexity: [{ label: 'Time', value: 'O(S) — total characters' }, { label: 'Space', value: 'O(1)' }],
  why: 'A common prefix of length L exists exactly when all words agree on columns 0..L−1. Scanning columns left to right and stopping at the first column that fails gives the largest such L. Each character is inspected at most once, so the work is bounded by the total number of characters.',
};
