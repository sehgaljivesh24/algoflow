import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { find } from './treeKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { expr: string }

const java = [
  'public List<Integer> diffWaysToCompute(String expr) {',
  '    List<Integer> res = new ArrayList<>();',
  '    for (int i = 0; i < expr.length(); i++) {',
  '        char c = expr.charAt(i);',
  "        if (c == '+' || c == '-' || c == '*') {            // try this operator as the LAST one applied",
  '            List<Integer> left = diffWaysToCompute(expr.substring(0, i));',
  '            List<Integer> right = diffWaysToCompute(expr.substring(i + 1));',
  '            for (int a : left) {',
  '                for (int b : right) {',
  "                    res.add(c == '+' ? a + b : c == '-' ? a - b : a * b);",
  '                }',
  '            }',
  '        }',
  '    }',
  '    if (res.isEmpty()) res.add(Integer.parseInt(expr));    // no operator: just a number',
  '    return res;',
  '}',
];
const python = [
  'def diff_ways_to_compute(expr):',
  '    res = []',
  '    for i, c in enumerate(expr):',
  "        if c in '+-*':                                   # try this operator as the LAST one applied",
  '            left = diff_ways_to_compute(expr[:i])',
  '            right = diff_ways_to_compute(expr[i + 1:])',
  '            for a in left:',
  '                for b in right:',
  "                    res.append(a + b if c == '+' else a - b if c == '-' else a * b)",
  '    if not res:',
  '        res.append(int(expr))                            # no operator: just a number',
  '    return res',
];
const J = {
  enter: find(java, 'public List<Integer> diffWays', 'List<Integer> res'),
  loop: find(java, 'for (int i = 0', 'char c =', "if (c == '+'"),
  left: find(java, 'List<Integer> left'),
  right: find(java, 'List<Integer> right'),
  combine: find(java, 'for (int a : left)', 'for (int b : right)', 'res.add(c =='),
  base: find(java, 'if (res.isEmpty())'),
  ret: find(java, 'return res;'),
};
const P = {
  enter: find(python, 'def diff_ways', 'res = []'),
  loop: find(python, 'for i, c in', "if c in '+-*'"),
  left: find(python, 'left = diff'),
  right: find(python, 'right = diff'),
  combine: find(python, 'for a in left', 'for b in right', 'res.append(a + b'),
  base: find(python, 'if not res', 'res.append(int(expr))'),
  ret: find(python, 'return res'),
};

const apply = (op: string, a: number, b: number) => (op === '+' ? a + b : op === '-' ? a - b : a * b);

function tokenize(raw: string): string[] {
  const s = raw.replace(/\s+/g, '');
  if (!/^\d{1,2}([+\-*]\d{1,2})*$/.test(s)) throw new Error('Write numbers (up to 2 digits) joined by + - * , e.g. 2*3-4*5');
  const toks = s.match(/\d+|[+\-*]/g)!;
  if ((toks.length + 1) / 2 > 5) throw new Error('Use at most 5 numbers (4 operators) so the animation stays readable');
  return toks;
}

function run({ expr }: In, tree: RecTree): Step[] {
  const toks = tokenize(expr);
  const steps: Step[] = [];
  const stack: string[] = [];
  let lo0 = 0;
  let hi0 = toks.length - 1;
  let marks: Record<number, CellState> = {};
  let aux2: { title: string; items: string[] }[] = [];
  let calls = 0;
  const v: Record<string, string | number> = { range: `0..${toks.length - 1}`, op: '—', left: '—', right: '—', calls: 0 };

  const say = recorder(steps, () => ({
    scene: treeOverArray(
      tree.scene(),
      toks.map((value, i) => ({ key: i, value, state: marks[i] ?? (i < lo0 || i > hi0 ? ('dim' as const) : undefined) })),
      [],
    ),
    aux: [
      { title: 'call stack: sub-expressions', kind: 'stack' as const, items: [...stack] },
      ...aux2.map((a) => ({ title: a.title, kind: 'list' as const, items: [...a.items] })),
    ],
    vars: { ...v, calls },
  }));
  const text = (a: number, b: number) => toks.slice(a, b + 1).join('');
  const show = (xs: number[]) => (xs.length > 8 ? `${xs.slice(0, 8).join(', ')}, … (${xs.length})` : xs.join(', '));

  say({
    title: 'Start', desc: `List every value of ${toks.join(' ')} over all ways to place parentheses.`,
    logic: 'Choose which operator is applied LAST. Everything left of it and everything right of it are smaller expressions, each solved the same way.',
    java: J.enter, py: P.enter, algo: 0,
    tag: 'INIT', note: `diffWaysToCompute("${toks.join('')}"): ${(toks.length + 1) / 2} numbers`,
  });

  const ways = (a: number, b: number): number[] => {
    calls++;
    lo0 = a; hi0 = b; marks = {};
    v.range = `${a}..${b}`; v.op = '—'; v.left = '—'; v.right = '—';
    stack.push(text(a, b));
    const node = tree.enter(text(a, b), { call: `ways("${text(a, b)}")` });
    aux2 = [];
    if (a === b) {
      marks = { [a]: 'found' };
      aux2 = [{ title: 'returns', items: [toks[a]] }];
      say({
        title: `"${toks[a]}" is just a number`, desc: `No operator in "${toks[a]}", so there is exactly one way: ${toks[a]}.`,
        logic: 'The base case: an expression without operators evaluates to itself.', tone: 'success',
        java: J.base, py: P.base, algo: 3,
        tag: 'BASE CASE', note: `no operator: res.add(${toks[a]})`,
      });
      stack.pop();
      tree.leave();
      return [Number(toks[a])];
    }
    say({
      title: `Solve "${text(a, b)}"`, desc: `Try each operator in "${text(a, b)}" as the last one applied.`,
      logic: 'Different choices of the last operator produce different groupings, so together they cover every parenthesisation.',
      java: J.loop, py: P.loop, algo: 0,
      tag: 'SOLVE', note: `try each operator of "${text(a, b)}" as the last one`,
    });
    const res: number[] = [];
    for (let k = a + 1; k < b; k += 2) {
      lo0 = a; hi0 = b;
      marks = {};
      for (let q = a; q < k; q++) marks[q] = 'active';
      marks[k] = 'swap';
      for (let q = k + 1; q <= b; q++) marks[q] = 'compare';
      v.range = `${a}..${b}`; v.op = toks[k]; v.left = '—'; v.right = '—';
      aux2 = [{ title: `results of "${text(a, b)}" so far`, items: [show(res)] }];
      say({
        title: `Split at "${toks[k]}": ( ${text(a, k - 1)} ) ${toks[k]} ( ${text(k + 1, b)} )`,
        desc: `Treat ${toks[k]} as the last operation: solve the left part "${text(a, k - 1)}" (blue) and the right part "${text(k + 1, b)}" (purple) first.`,
        logic: 'Parentheses around both sides force this operator to run last.',
        java: [...J.left, ...J.right], py: [...P.left, ...P.right], algo: 1,
        tag: `SPLIT AT ${toks[k]}`, note: `left = "${text(a, k - 1)}", right = "${text(k + 1, b)}", op = '${toks[k]}'`,
      });
      const L = ways(a, k - 1);
      const R = ways(k + 1, b);
      lo0 = a; hi0 = b;
      marks = {};
      for (let q = a; q < k; q++) marks[q] = 'active';
      marks[k] = 'swap';
      for (let q = k + 1; q <= b; q++) marks[q] = 'compare';
      const made = L.flatMap((x) => R.map((y) => apply(toks[k], x, y)));
      res.push(...made);
      v.range = `${a}..${b}`; v.op = toks[k]; v.left = `{${show(L)}}`; v.right = `{${show(R)}}`;
      aux2 = [{ title: `left × right → "${toks[k]}"`, items: [`left {${show(L)}}`, `right {${show(R)}}`, `combined {${show(made)}}`] }, { title: `results of "${text(a, b)}" so far`, items: [show(res)] }];
      say({
        title: `Combine around "${toks[k]}": ${made.length} value${made.length === 1 ? '' : 's'}`,
        desc: `Every left value ${toks[k]} every right value gives ${made.length} result${made.length === 1 ? '' : 's'}: ${show(made)}.`,
        logic: 'This is the "combine" half of divide and conquer: a Cartesian product of the two sub-answers.',
        tone: 'success', java: J.combine, py: P.combine, algo: 2,
        tag: 'COMBINE', note: `${L.length} left × ${R.length} right = ${made.length}: ${show(made)}`,
      });
    }
    aux2 = [{ title: 'returns', items: [show(res)] }];
    marks = Object.fromEntries(Array.from({ length: b - a + 1 }, (_, q) => [a + q, 'found' as const]));
    v.op = '—'; v.left = '—'; v.right = '—';
    tree.relabel(node, { sub: `→ ${res.length}` });
    say({
      title: `"${text(a, b)}" has ${res.length} value${res.length === 1 ? '' : 's'}`, desc: `All operators tried; the answers are ${show(res)}.`,
      logic: 'The caller will multiply this list with its sibling list.', tone: 'success', java: J.ret, py: P.ret, algo: 3,
      tag: 'RETURN', note: `return res (${res.length}): ${show(res)}`,
    });
    stack.pop();
    tree.leave();
    return res;
  };

  const all = ways(0, toks.length - 1);
  const sorted = [...all].sort((x, y) => x - y);
  lo0 = 0; hi0 = toks.length - 1; marks = {}; aux2 = [{ title: 'all results (sorted)', items: [show(sorted)] }];
  v.range = `0..${toks.length - 1}`;
  const out = `[${sorted.join(',')}]`;
  say({
    title: 'Done', desc: `${sorted.length} results (${new Set(sorted).size} distinct): ${out}.`,
    logic: 'The number of groupings is a Catalan number, so the output grows quickly: 1, 1, 2, 5, 14 for 1 to 5 numbers.', tone: 'success',
    java: J.ret, py: P.ret, algo: 4, result: { title: out, text: 'All possible results (sorted)' },
    tag: '✅ Done!', note: `return ${out}`,
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

const parse = (raw: string): In => capSteps(build, { expr: tokenize(raw).join('') });

export const differentWaysToAddParentheses: ProblemDef<In> = {
  slug: '241-different-ways-to-add-parentheses',
  id: '241', title: 'Different Ways to Add Parentheses', difficulty: 'Medium', category: 'Divide and Conquer', tag: 'split at each operator',
  statement: 'Given an expression of numbers and the operators + - *, return the results of every possible way to group the numbers and operators with parentheses. The order of the results does not matter.',
  constraints: '1 ≤ expression length ≤ 20; numbers are 0 to 99 (animation input is limited to 5 numbers).',
  examples: [
    { label: '2-1-1', input: { expr: '2-1-1' }, output: '[0,2]', answer: '[0,2] ((2-1)-1 = 0 and 2-(1-1) = 2)' },
    { label: '2*3-4*5', input: { expr: '2*3-4*5' }, output: '[-34,-14,-10,-10,10]' },
    { label: '1+2*3', input: { expr: '1+2*3' }, output: '[7,9]' },
  ],
  inputPlaceholder: 'e.g. 2*3-4*5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Left part', state: 'active' }, { label: 'Operator applied last', state: 'swap' }, { label: 'Right part', state: 'compare' }, { label: 'Solved', state: 'found' }, { label: 'Outside the current sub-expression', state: 'dim' }],
  emphasis: ['every possible way', 'group the numbers and operators with parentheses'],
  phases: [
    { icon: '🔍', label: 'Try each operator', tone: 'blue' },
    { icon: '↙️', label: 'Solve both sides', tone: 'cyan' },
    { icon: '✖️', label: 'Combine pairs', tone: 'gold' },
    { icon: '↩', label: 'Return list / base', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['range', 'op', 'left', 'right', 'calls'],
  approach: {
    title: 'Pick the last operator',
    text: 'Any full parenthesisation has one operator that is applied last. Try every operator in turn as that last one: recursively get all values of the expression to its left and to its right, then combine every left value with every right value. An expression with no operator is just its number.',
  },
  java, python,
  algorithm: [
    'Scan the expression; each operator is a candidate for "the last operation"',
    'Recursively compute all values of the left part and of the right part',
    'Combine every left value with every right value using that operator',
    'With no operator left, return the number itself; otherwise return the collected list',
    'The top-level list holds every result: sort it and report',
  ],
  complexity: [{ label: 'Time', value: 'O(Catalan(n) · n)' }, { label: 'Space', value: 'O(Catalan(n)) results' }],
  why: 'In any complete parenthesisation exactly one operator is evaluated last, and it splits the expression into a left and a right sub-expression whose groupings are independent. So the set of results is the union, over every operator, of the products of the two sub-results. Distinct choices of the last operator (or of the sub-groupings) give distinct parenthesisations, which is why the count is a Catalan number and why this recursion is both complete and non-overlapping.',
};
