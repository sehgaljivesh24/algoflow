import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { digits: string }

const KEYS: Record<string, string> = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };

function parse(raw: string): In {
  const digits = raw.replace(/[\s,]+/g, '');
  if (!digits || /[^2-9]/.test(digits)) throw new Error('Use digits 2-9 only, e.g. 23');
  if (digits.length > 4) throw new Error('Use 4 digits or fewer');
  return capSteps(build, { digits });
}

function run({ digits }: In, tree: RecTree): Step[] {
  const n = digits.length;
  const steps: Step[] = [];
  const path: string[] = [];
  const results: string[] = [];
  let depth = 0;
  let cur = '';
  const word = () => (path.length ? path.join('') : '·');

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(),
      [...digits].map((value, i): Cell => ({ key: i, value, state: i < depth ? 'sorted' : i === depth && depth < n ? 'active' : undefined })),
      depth < n ? [{ id: 'd', label: 'idx', index: depth, tone: 'blue' as const }] : [],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: 'path (letters so far)', kind: 'stack' as const, items: [...path] },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
      { title: 'keypad', kind: 'map' as const, items: [...new Set(digits)].map((d) => `${d} → ${KEYS[d]}`) },
    ],
    vars: { idx: depth, letter: cur || '—', path: path.join('') || '""', results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Digits "${digits}" map to ${[...digits].map((d) => `${d}→${KEYS[d]}`).join(', ')}. Pick one letter per digit: ${[...digits].reduce((p, d) => p * KEYS[d].length, 1)} leaves expected.`,
    note: `res = [], backtrack(digits, 0, "")`,
    logic: 'The recursion depth equals the digit index, and each level loops over that digit\'s letters.',
    java: [3], py: [3], algo: 0,
  });

  const bt = (idx: number, via?: string) => {
    depth = idx;
    cur = '';
    const id = tree.enter(word(), { edge: via, call: `bt(idx=${idx}) "${path.join('')}"` });
    if (idx === n) {
      results.push(path.join(''));
      tree.found(id);
      say({
        title: `Record "${path.join('')}"`, tag: 'FOUND!',
        desc: `idx = ${idx} = digits.length, so every digit has a letter: "${path.join('')}" is combination #${results.length}.`,
        note: `idx == ${n} → res.add("${path.join('')}") → #${results.length}`,
        logic: 'Reaching depth n means one letter was chosen for each digit.', tone: 'success', java: [8], py: [6], algo: 1,
      });
      tree.leave();
      return;
    }
    for (const ch of KEYS[digits[idx]]) {
      depth = idx;
      cur = ch;
      path.push(ch);
      say({
        title: `Choose '${ch}' for digit ${digits[idx]}`, tag: 'CHOOSE',
        desc: `Digit ${digits[idx]} at idx ${idx} offers ${KEYS[digits[idx]]}: append '${ch}' → "${path.join('')}" and explore idx ${idx + 1}.`,
        note: `path.append('${ch}'); backtrack(d, ${idx + 1}) → "${path.join('')}"`,
        logic: 'Choose a letter, explore the remaining digits, then undo.', java: [11, 12], py: [8, 9], algo: 2,
      });
      bt(idx + 1, ch);
      depth = idx;
      cur = ch;
      path.pop();
      const more = KEYS[digits[idx]].indexOf(ch) < KEYS[digits[idx]].length - 1;
      say({
        title: `Un-choose '${ch}'`, tag: 'BACKTRACK',
        desc: `Back at idx ${idx}: remove '${ch}' → "${path.join('')}"${more ? `; try the next letter of ${digits[idx]}.` : `; every letter of ${digits[idx]} has been tried, so bt(idx=${idx}) returns.`}`,
        note: `path.deleteCharAt(last) → "${path.join('')}"`,
        logic: 'Undo so every letter starts from the same prefix.', tone: 'warn', java: [13], py: [10], algo: 3,
      });
    }
    tree.leave();
  };
  bt(0);

  depth = n;
  cur = '';
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} combinations = ${[...digits].map((d) => KEYS[d].length).join(' × ')}, the product of the letters on each key.`,
    note: `return res → ${results.length} strings`,
    logic: 'The count is the product of the number of letters on each pressed key.', tone: 'success', java: [4], py: [12], algo: 4,
    result: { title: `${results.length} combinations`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const letterCombinations: ProblemDef<In> = {
  slug: '17-letter-combinations-of-a-phone-number',
  id: '17', title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', category: 'Backtracking', tag: 'backtracking',
  statement: 'Given a string of digits from 2 to 9, return every letter combination the digits could represent on a classic phone keypad (2 = abc, 3 = def, … 9 = wxyz). Digit 1 maps to no letters.',
  emphasis: ['every letter combination', 'phone keypad'],
  constraints: '1 ≤ digits.length ≤ 4 (digits 2–9)',
  examples: [
    { label: '"23"', input: { digits: '23' }, output: '9 combinations', answer: '9 combinations: ad, ae, af, bd, be, bf, cd, ce, cf' },
    { label: '"7"', input: { digits: '7' }, output: '4 combinations' },
    { label: '"234"', input: { digits: '234' }, output: '27 combinations' },
  ],
  inputPlaceholder: 'e.g. 23',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '➕', label: 'Choose letter', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Digit being expanded', state: 'active' },
    { label: 'Digit already chosen', state: 'sorted' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Full word (leaf)', state: 'found' },
    { label: 'Not visited yet', state: 'dim' },
  ],
  varLabels: ['idx', 'letter', 'path', 'results'],
  approach: {
    title: 'One level per digit',
    text: 'Recurse over digit positions. At position idx loop through that digit\'s letters: append a letter, recurse to idx + 1, remove the letter. When idx reaches the end, record the path.',
  },
  java: [
    'static final String[] KEYS = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};',
    'public List<String> letterCombinations(String digits) {',
    '    List<String> res = new ArrayList<>();',
    '    backtrack(digits, 0, new StringBuilder(), res);',
    '    return res;',
    '}',
    'void backtrack(String d, int idx, StringBuilder path, List<String> res) {',
    '    if (idx == d.length()) {',
    '        res.add(path.toString()); return;',
    '    }',
    '    for (char ch : KEYS[d.charAt(idx) - \'0\'].toCharArray()) {',
    '        path.append(ch);                         // choose',
    '        backtrack(d, idx + 1, path, res);        // explore',
    '        path.deleteCharAt(path.length() - 1);    // un-choose',
    '    }',
    '}',
  ],
  python: [
    'KEYS = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",',
    '        "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}',
    'def letter_combinations(digits):',
    '    res, path = [], []',
    '    def backtrack(idx):',
    '        if idx == len(digits):',
    '            res.append("".join(path)); return',
    '        for ch in KEYS[digits[idx]]:',
    '            path.append(ch)  # choose',
    '            backtrack(idx + 1)  # explore',
    '            path.pop()  # un-choose',
    '    backtrack(0)',
    '    return res',
  ],
  algorithm: [
    'Map each digit to its keypad letters',
    'When idx equals the number of digits, record the path',
    'Choose: for each letter of digits[idx], append it and recurse on idx + 1',
    'Un-choose: remove the letter and try the next one',
    'Return all recorded strings',
  ],
  complexity: [{ label: 'Time', value: 'O(4ⁿ · n)' }, { label: 'Space', value: 'O(n) recursion plus output' }],
  why: 'Each depth fixes the letter for exactly one digit, so every path of full length is one valid word and different paths differ in at least one position. Because the loop covers every letter of every digit, no combination is missed.',
};
