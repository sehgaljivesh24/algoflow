import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow, parseParts } from './ssbShared.ts';

interface In { s: string; t: string }

const W = 7;
const blank = (): Cell[] => Array.from({ length: W }, (_, c) => ({ key: c, value: '·', state: 'dim' as const }));

function parse(raw: string): In {
  const [s, t] = parseParts(raw, 2, 'string s ; string t — e.g. abcd ; abcde').map((x) => x.toLowerCase().replace(/\s+/g, ''));
  if (!/^[a-z]*$/.test(s) || !/^[a-z]+$/.test(t)) throw new Error('Use lowercase letters a–z only (t cannot be empty)');
  if (s.length > 7) throw new Error('Use at most 7 letters in s so the animation stays readable');
  if (t.length !== s.length + 1) throw new Error('t must be exactly one letter longer than s');
  const cnt = new Map<string, number>();
  for (const c of t) cnt.set(c, (cnt.get(c) ?? 0) + 1);
  for (const c of s) cnt.set(c, (cnt.get(c) ?? 0) - 1);
  const extra = [...cnt.values()];
  if (extra.some((v) => v < 0) || extra.filter((v) => v === 1).length !== 1) throw new Error('t must be s shuffled plus exactly one extra letter');
  return { s, t };
}

function build({ s, t }: In): Step[] {
  const steps: Step[] = [];
  const seq = [...s.split('').map((c) => ({ c, from: 's' })), ...t.split('').map((c) => ({ c, from: 't' }))];
  let acc = 0;
  const vars = (c: string, from: string) => ({ char: c, acc, from });
  const aux = (cur: number) => [{ title: 'Letters in order (s then t)', kind: 'list' as const, items: seq.map((x) => `${x.c}`), highlight: cur }];
  const grid = (rows: Cell[][], heads: string[]) => ({ kind: 'grid' as const, rows, rowHeads: heads, colHeads: bitHeads(W) });

  steps.push({
    title: 'Start', desc: `t is s shuffled with one extra letter. XOR the ASCII codes of every letter of s and t: letters appearing twice cancel.`,
    scene: grid([bitRow(0, W), blank(), blank()], ['acc = 0', 'letter', 'acc ^ letter']), vars: vars('—', '—'), aux: aux(-1),
    logic: 'Each letter of s also appears in t, so it gets XORed in twice and disappears. Only the extra letter is XORed an odd number of times.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  seq.forEach(({ c, from }, k) => {
    const code = c.charCodeAt(0);
    const before = acc;
    acc ^= code;
    steps.push({
      title: `XOR with '${c}' (${code}) from ${from}`, desc: `${before} ^ ${code} = ${acc}. Purple bits flipped in the accumulator.`,
      scene: grid([bitRow(before, W), bitRow(code, W, 'compare'), bitRow(acc, W, undefined, (col) => (((before ^ acc) >> (W - 1 - col)) & 1 ? 'swap' : undefined))], [`acc = ${before}`, `'${c}' = ${code}`, `acc ^ '${c}' = ${acc}`]),
      vars: vars(c, from), aux: aux(k),
      logic: seq.slice(0, k).some((x) => x.c === c) ? `A '${c}' was XORed before, so this one cancels it.` : `First '${c}' seen so far; its bits go into the accumulator.`, logicTone: 'info',
      javaLines: from === 's' ? [2] : [3], pyLines: [2, 3], algoStep: from === 's' ? 1 : 2,
    });
  });

  const ch = String.fromCharCode(acc);
  steps.push({
    title: `Answer = '${ch}'`, desc: `The accumulator is ${acc} = ASCII '${ch}': the letter that t has and s lacks.`,
    scene: grid([bitRow(acc, W, 'found'), blank(), blank()], [`acc = ${acc}`, 'letter', 'acc ^ letter']), vars: vars('—', '—'), aux: aux(-1),
    logic: 'Converting the leftover code back to a character gives the added letter.', logicTone: 'success', javaLines: [4], pyLines: [4], algoStep: 3,
    result: { title: ch, text: `'${ch}' was added to t` },
  });
  return steps;
}

export const findTheDifference: ProblemDef<In> = {
  slug: '389-find-the-difference', id: '389', title: 'Find the Difference', difficulty: 'Easy', category: 'Bit Manipulation', tag: 'XOR',
  statement: 'String t is made by shuffling string s and inserting one extra lowercase letter at a random position. Return the letter that was added.',
  constraints: '0 ≤ s.length ≤ 1000 · t.length = s.length + 1 · lowercase letters (animation input: s up to 7 letters)',
  examples: [
    { label: 's = "abcd", t = "abcde"', input: { s: 'abcd', t: 'abcde' }, output: 'e' },
    { label: 's = "", t = "y"', input: { s: '', t: 'y' }, output: 'y' },
    { label: 's = "hello", t = "lolheh"', input: { s: 'hello', t: 'lolheh' }, output: 'h' },
  ],
  inputPlaceholder: 'e.g. abcd ; abcde',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Letter being XORed', state: 'compare' }, { label: 'Bit just flipped', state: 'swap' }, { label: 'Answer', state: 'found' }],
  varLabels: ['char', 'acc', 'from'],
  approach: {
    title: 'XOR all characters of both strings',
    text: 'Every letter of s occurs once in s and once in t, so XOR-ing all character codes of both strings cancels them in pairs. The code that is left is the added letter.',
  },
  java: [
    'public char findTheDifference(String s, String t) {',
    '    int xor = 0;',
    '    for (char c : s.toCharArray()) xor ^= c;',
    '    for (char c : t.toCharArray()) xor ^= c;',
    '    return (char) xor;',
    '}',
  ],
  python: [
    'def find_the_difference(s, t):',
    '    xor = 0',
    '    for c in s + t:',
    '        xor ^= ord(c)',
    '    return chr(xor)',
  ],
  algorithm: [
    'Start with xor = 0',
    'XOR in the code of every letter of s',
    'XOR in the code of every letter of t',
    'Convert the leftover value back to a letter',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'x ^ x = 0 and XOR is order-independent. A letter occurring k times in s occurs k times in t as well (plus one more for the added letter), so its codes appear an even number of times and vanish; the added letter appears an odd number of times and remains.',
};
