import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string }

const VAL: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const VALID = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function parse(raw: string): In {
  const s = raw.trim().toUpperCase();
  if (!s) throw new Error('Enter a Roman numeral such as MCMXCIV');
  if (!/^[IVXLCDM]+$/.test(s)) throw new Error('Use only the letters I V X L C D M');
  if (!VALID.test(s)) throw new Error('That is not a valid Roman numeral between 1 and 3999');
  if (s.length > 12) throw new Error('Use 12 symbols or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const terms: string[] = [];
  let total = 0;
  const cells = (cur: number, nxt = -1): Cell[] =>
    [...s].map((c, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i === nxt) state = 'compare';
      else if (i < cur) state = 'sorted';
      return { key: i, value: c, state };
    });
  const aux = (hl?: number) => [
    { title: 'symbol values', kind: 'map' as const, items: Object.entries(VAL).map(([k, v]) => `${k} → ${v}`), highlight: hl },
    { title: 'terms added', kind: 'list' as const, items: [...terms] },
  ];
  const vars = (i: number | string, cur: number | string, next: number | string) => ({ i, cur, next, total });
  const keys = Object.keys(VAL);

  steps.push({
    title: 'Start', desc: `Convert "${s}" to a number.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Roman numerals normally add left to right, except when a smaller symbol sits before a larger one (IV, IX, XL…): then it is subtracted.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0, tag: 'READY —', note: 'v = symbol table, total = 0',
  });

  for (let i = 0; i < n; i++) {
    const cur = VAL[s[i]];
    const nxt = i + 1 < n ? VAL[s[i + 1]] : 0;
    const sub = i + 1 < n && cur < nxt;
    const before = total;
    steps.push({
      title: i + 1 < n ? `Compare ${s[i]} (${cur}) with ${s[i + 1]} (${nxt})` : `Last symbol ${s[i]} (${cur})`, tag: 'COMPARE',
      desc: i + 1 < n ? `s[${i}]='${s[i]}' is ${cur}, next s[${i + 1}]='${s[i + 1]}' is ${nxt}: is ${cur} < ${nxt}? ${sub ? 'Yes' : 'No'}` : `s[${i}]='${s[i]}' is ${cur} and no symbol follows, so it will be added`,
      cells: cells(i, i + 1 < n ? i + 1 : -1), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(keys.indexOf(s[i])),
      vars: vars(i, cur, i + 1 < n ? nxt : '—'),
      logic: 'The value of the next symbol decides whether this one is added or subtracted.',
      logicTone: 'info', javaLines: [4, 5], pyLines: [4, 5], algoStep: 1,
      note: i + 1 < n ? `cur < v.get(next) → ${cur} < ${nxt} is ${sub}` : `i + 1 < s.length() is false → add`,
    });
    total += sub ? -cur : cur;
    terms.push(`${sub ? '−' : '+'}${cur}`);
    steps.push({
      title: sub ? `${s[i]} (${cur}) < ${s[i + 1]} (${nxt}): subtract` : `${s[i]} (${cur}): add`, tag: sub ? 'SUBTRACT' : 'ADD',
      desc: sub ? `'${s[i]}' sits before the larger '${s[i + 1]}', so subtract ${cur}: total ${before} − ${cur} = ${total}` : `add ${cur}: total ${before} + ${cur} = ${total}`,
      cells: cells(i, sub ? i + 1 : -1), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(keys.indexOf(s[i])),
      vars: vars(i, cur, i + 1 < n ? nxt : '—'),
      logic: sub ? 'A smaller value in front of a bigger one is part of a subtractive pair like IV = 5 − 1.' : 'Same or larger value than what follows: it contributes positively.',
      logicTone: sub ? 'warn' : 'info', javaLines: sub ? [6] : [8], pyLines: sub ? [6] : [8], algoStep: sub ? 2 : 3,
      note: sub ? `total -= ${cur} → ${before} − ${cur} = ${total}` : `total += ${cur} → ${before} + ${cur} = ${total}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `${terms.join(' ')} = ${total}, so "${s}" is ${total}`,
    cells: cells(n), pointers: [], aux: aux(), vars: vars('—', '—', '—'),
    logic: 'All symbols consumed; the running total is the value.', logicTone: 'success', javaLines: [10], pyLines: [9], algoStep: 4, note: `return ${total}`,
    result: { title: String(total), text: `${s} = ${total}` },
  });
  return steps;
}

export const romanToInteger: ProblemDef<In> = {
  slug: '13-roman-to-integer',
  id: '13', title: 'Roman to Integer', difficulty: 'Easy', category: 'Strings', tag: 'string parsing',
  statement: 'Convert a Roman numeral (symbols I, V, X, L, C, D, M) to an integer. A symbol written before a larger one is subtracted, otherwise it is added. The input is a valid numeral from 1 to 3999.',
  constraints: '1 ≤ length ≤ 15, valid numeral in [1, 3999] (animation input: up to 12 symbols)',
  examples: [
    { label: '"III"', input: { s: 'III' }, output: '3' },
    { label: '"LVIII"', input: { s: 'LVIII' }, output: '58' },
    { label: '"MCMXCIV"', input: { s: 'MCMXCIV' }, output: '1994' },
  ],
  inputPlaceholder: 'e.g. MCMXCIV',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current symbol', state: 'active' }, { label: 'Next symbol (compared)', state: 'compare' }, { label: 'Already converted', state: 'sorted' }],
  varLabels: ['i', 'cur', 'next', 'total'],
  emphasis: ['Roman numeral', 'subtracted', 'added'],
  phases: [
    { icon: '📋', label: 'SETUP table', tone: 'blue' },
    { icon: '🔍', label: 'COMPARE with next', tone: 'cyan' },
    { icon: '➖', label: 'SUBTRACT (cur < next)', tone: 'orange' },
    { icon: '➕', label: 'ADD', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Add, unless a bigger symbol follows',
    text: 'Look up each symbol\'s value. If it is smaller than the value of the next symbol, subtract it from the total; otherwise add it. One left-to-right pass is enough.',
  },
  java: [
    'public int romanToInt(String s) {',
    '    Map<Character, Integer> v = Map.of(\'I\', 1, \'V\', 5, \'X\', 10, \'L\', 50, \'C\', 100, \'D\', 500, \'M\', 1000);',
    '    int total = 0;',
    '    for (int i = 0; i < s.length(); i++) {',
    '        int cur = v.get(s.charAt(i));',
    '        if (i + 1 < s.length() && cur < v.get(s.charAt(i + 1)))',
    '            total -= cur;',
    '        else',
    '            total += cur;',
    '    }',
    '    return total;',
    '}',
  ],
  python: [
    'def roman_to_int(s):',
    "    v = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}",
    '    total = 0',
    '    for i, ch in enumerate(s):',
    '        cur = v[ch]',
    '        if i + 1 < len(s) and cur < v[s[i + 1]]:',
    '            total -= cur',
    '        else:',
    '            total += cur',
    '    return total',
  ],
  algorithm: [
    'Prepare a table of symbol values and a total of 0',
    'For each symbol, compare its value with the value of the next symbol',
    'If the value is smaller than the next one, subtract it from the total',
    'Otherwise add it to the total',
    'Return the total',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Every subtractive pair (IV, IX, XL, XC, CD, CM) is a small symbol directly before a larger one, and its value is larger − smaller. Subtracting the small symbol when we see it, then adding the larger one next, produces exactly that. Every other symbol is simply added.',
};
