import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { words: string[] }

function parse(raw: string): In {
  const words = raw.split(/[\s,]+/).filter(Boolean);
  if (!words.length) throw new Error('Enter words separated by spaces, e.g. hello world');
  if (words.length > 4) throw new Error('Use 4 words or fewer');
  if (words.some((w) => w.length > 6)) throw new Error('Keep each word to 6 characters or fewer');
  const enc = words.map((w) => `${w.length}#${w}`).join('');
  if (enc.length > 24) throw new Error('The encoded text would be too long to draw — use shorter words');
  return { words };
}

function build({ words }: In): Step[] {
  const steps: Step[] = [];
  const enc = words.map((w) => `${w.length}#${w}`).join('');
  const out: string[] = [];
  const quote = (a: string[]) => a.map((w) => `"${w}"`);

  const cells = (len: number, tones: Record<number, CellState> = {}): Cell[] =>
    [...enc.slice(0, len)].map((c, i) => ({ key: i, value: c, state: tones[i] }));
  const vars = (i: number | string, len: number | string) => ({ i, len, words: out.length });

  steps.push({
    title: 'Start', tag: 'START —', note: `${words.length} word${words.length > 1 ? 's' : ''}, encoded length ${enc.length}`,
    desc: `turn ${words.length} word${words.length > 1 ? 's' : ''} (${quote(words).join(', ')}) into one string of ${enc.length} characters, then recover them exactly.`,
    cells: words.map((w, i) => ({ key: 'w' + i, value: w, state: 'active' as CellState })), pointers: [], aux: [{ title: 'input words', kind: 'list', items: quote(words) }], vars: vars('—', '—'),
    logic: 'A plain separator breaks when a word contains it. Writing each word\'s length first removes the ambiguity: we always know exactly how many characters to read.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  let pos = 0;
  for (const w of words) {
    const piece = `${w.length}#${w}`;
    const tones: Record<number, CellState> = {};
    for (let k = 0; k < piece.length; k++) tones[pos + k] = k < 2 ? 'compare' : 'active';
    pos += piece.length;
    steps.push({
      title: `Encode "${w}"`, tag: 'ENCODE:', note: `sb += ${w.length} + '#' + "${w}" → ${piece}`,
      desc: `append the length ${w.length}, a '#', then the word "${w}" itself, which adds ${piece} and makes the encoded string ${pos} characters long.`,
      cells: cells(pos, tones), pointers: [], aux: [{ title: 'input words', kind: 'list', items: quote(words), highlight: words.indexOf(w) }], vars: vars('—', w.length),
      logic: 'The length prefix and the # delimiter are metadata; the word is copied untouched, even if it contains # itself.', logicTone: 'info',
      javaLines: [2, 3], pyLines: [1], algoStep: 0,
    });
  }

  steps.push({
    title: 'Encoded string ready', tag: 'JOIN:', note: `encode(...) = "${enc}"`, desc: `the pieces are joined into "${enc}", the only thing that gets sent; now decode it starting at i = 0.`,
    cells: cells(enc.length), pointers: [], aux: [{ title: 'decoded so far', kind: 'list', items: [] }], vars: vars(0, '—'),
    logic: 'The decoder knows nothing about the original words, only this string.', logicTone: 'success', javaLines: [4, 6, 7, 8], pyLines: [3, 4], algoStep: 1,
  });

  let i = 0;
  while (i < enc.length) {
    const j = enc.indexOf('#', i);
    const len = Number(enc.slice(i, j));
    const tones: Record<number, CellState> = {};
    for (let k = 0; k < i; k++) tones[k] = 'sorted';
    for (let k = i; k < j; k++) tones[k] = 'active';
    tones[j] = 'compare';
    steps.push({
      title: `Read length ${len}`, tag: 'READ:', note: `j = indexOf('#', ${i}) = ${j}, len = ${len}`,
      desc: `from index ${i}, the digits before the first '#' (index ${j}) say the next word has ${len} character${len === 1 ? '' : 's'}.`,
      cells: cells(enc.length, tones), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }, { id: 'j', label: '#', index: j, tone: 'orange' }],
      aux: [{ title: 'decoded so far', kind: 'list', items: quote(out) }], vars: vars(i, len),
      logic: 'Look only for the first # after i. Digits never contain #, so even a # inside a word cannot confuse this.', logicTone: 'info',
      javaLines: [9, 10, 11], pyLines: [5, 6, 7], algoStep: 2,
    });
    const word = enc.slice(j + 1, j + 1 + len);
    out.push(word);
    const t2: Record<number, CellState> = {};
    for (let k = 0; k < j + 1; k++) t2[k] = 'sorted';
    for (let k = j + 1; k < j + 1 + len; k++) t2[k] = 'found';
    steps.push({
      title: `Take ${len} character${len === 1 ? '' : 's'}: "${word}"`, tag: 'TAKE:', note: `out += "${word}", i = ${j} + 1 + ${len} = ${j + 1 + len}`,
      desc: `copy exactly ${len} character${len === 1 ? '' : 's'} after the '#', giving "${word}", then jump i to ${j + 1 + len}${j + 1 + len >= enc.length ? ', the end of the string' : ''}.`,
      cells: cells(enc.length, t2), pointers: [{ id: 'i', label: 'i', index: Math.min(j + 1, enc.length - 1), tone: 'green' }],
      aux: [{ title: 'decoded so far', kind: 'list', items: quote(out), highlight: out.length - 1 }], vars: vars(j + 1 + len, len),
      logic: 'Count-based reading means the word\'s content is never interpreted.', logicTone: 'success',
      javaLines: [12, 13], pyLines: [8, 9], algoStep: 3,
    });
    i = j + 1 + len;
  }

  steps.push({
    title: 'Decoded', tag: '✅ Done!', note: `return [${quote(out).join(', ')}]`, desc: `i reached the end, so decode returns ${quote(out).join(', ')}, exactly the original words in order.`,
    cells: cells(enc.length, Object.fromEntries([...enc].map((_, k) => [k, 'sorted' as CellState]))), pointers: [], aux: [{ title: 'decoded words', kind: 'list', items: quote(out) }], vars: vars('—', '—'),
    logic: 'The decoded list matches the original, in order.', logicTone: 'success', javaLines: [15], pyLines: [10], algoStep: 4,
    result: { title: JSON.stringify(out), text: 'Decoded list equals the original input' },
  });
  return steps;
}

export const encodeAndDecodeStrings: ProblemDef<In> = {
  slug: '271-encode-and-decode-strings',
  id: '271', title: 'Encode and Decode Strings', difficulty: 'Medium', category: 'Strings', tag: 'delimiter encoding',
  statement: 'Design encode(list of strings) -> string and decode(string) -> list of strings so that decode(encode(x)) always gives back x, for any characters inside the strings.',
  constraints: '0 ≤ words ≤ 200, any ASCII characters (animation: up to 4 words of up to 6 characters, no spaces)',
  examples: [
    { label: 'hello world', input: { words: ['hello', 'world'] }, output: '["hello","world"]' },
    { label: 'a#b 12 xyz', input: { words: ['a#b', '12', 'xyz'] }, output: '["a#b","12","xyz"]' },
    { label: 'code', input: { words: ['code'] }, output: '["code"]' },
  ],
  inputPlaceholder: 'e.g. hello world',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Length digits', state: 'active' }, { label: 'Delimiter #', state: 'compare' }, { label: 'Word characters', state: 'found' }, { label: 'Already decoded', state: 'sorted' }],
  varLabels: ['i', 'len', 'words'],
  approach: {
    title: 'Length-prefix every word',
    text: 'Encode each word as length + "#" + word and concatenate. To decode, read digits up to the first "#", then take exactly that many characters as the next word and repeat.',
  },
  java: [
    'public String encode(List<String> strs) {',
    '    StringBuilder sb = new StringBuilder();',
    '    for (String s : strs)',
    '        sb.append(s.length()).append(\'#\').append(s);',
    '    return sb.toString();',
    '}',
    'public List<String> decode(String s) {',
    '    List<String> out = new ArrayList<>();',
    '    int i = 0;',
    '    while (i < s.length()) {',
    '        int j = s.indexOf(\'#\', i);',
    '        int len = Integer.parseInt(s.substring(i, j));',
    '        out.add(s.substring(j + 1, j + 1 + len));',
    '        i = j + 1 + len;',
    '    }',
    '    return out;',
    '}',
  ],
  python: [
    'def encode(strs):',
    "    return ''.join(f'{len(s)}#{s}' for s in strs)",
    '',
    'def decode(s):',
    '    out, i = [], 0',
    '    while i < len(s):',
    "        j = s.index('#', i)",
    '        length = int(s[i:j])',
    '        out.append(s[j + 1:j + 1 + length])',
    '        i = j + 1 + length',
    '    return out',
  ],
  phases: [
    { icon: '✍️', label: 'Encode: length # word', tone: 'blue' },
    { icon: '🔗', label: 'Join into one string', tone: 'cyan' },
    { icon: '🔍', label: 'Decode: read length', tone: 'gold' },
    { icon: '✂️', label: 'Take that many chars', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['decode(encode(x))', 'any characters'],
  algorithm: [
    'Encode: for every word write its length, then "#", then the word',
    'Join all pieces into a single string',
    'Decode: from index i, read the number before the next "#"',
    'Take that many characters as a word, jump past them and repeat until the string ends',
    'Done: the decoded list equals the original words',
  ],
  complexity: [{ label: 'Time', value: 'O(total characters)' }, { label: 'Space', value: 'O(total characters)' }],
  why: 'At every step the decoder sits at the start of a "length#word" block. The first # after that position must be the delimiter, because the length is made of digits only. Reading exactly length characters then lands precisely on the next block, so no character in a word — not even # — is ever misread as structure.',
};
