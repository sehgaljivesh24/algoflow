import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { ratings: number[] }

function parse(raw: string): In {
  const ratings = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!ratings.length || ratings.some((n) => !Number.isInteger(n) || n < 0 || n > 99)) throw new Error('Enter whole numbers from 0 to 99, e.g. 1 0 2');
  if (ratings.length > 12) throw new Error('Use 12 ratings or fewer');
  return { ratings };
}

function build({ ratings: r }: In): Step[] {
  const n = r.length;
  const c: number[] = Array(n).fill(1);
  const steps: Step[] = [];
  let pass = 'init';

  // hi: indexes highlighted as 'active'; other: neighbour 'compare'; changed: just updated 'found'
  const scene = (hi: number, other: number, changed: number) => {
    const row = (vals: number[], isCandy: boolean): Cell[] =>
      vals.map((value, i) => {
        let state: Cell['state'];
        if (isCandy && i === changed) state = 'found';
        else if (i === hi) state = 'active';
        else if (i === other) state = 'compare';
        return { key: `${isCandy ? 'c' : 'r'}${i}`, value, state, tone: isCandy ? 'green' : undefined };
      });
    return { kind: 'grid' as const, rows: [row(r, false), row(c, true)], rowHeads: ['rating', 'candies'], colHeads: r.map((_, i) => String(i)) };
  };
  const total = () => c.reduce((a, b) => a + b, 0);
  const vars = (i: number | string) => ({ pass, i, 'candies so far': total() });
  const add = (title: string, desc: string, logic: string, tone: LogicTone, hi: number, other: number, changed: number, j: number[], p: number[], a: number, extra: { tag: string; note: string; alert?: string }, result?: Step['result']) =>
    steps.push({ title, desc, scene: scene(hi, other, changed), vars: vars(hi >= 0 ? hi : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...extra });

  add('Start', `${plural(n, 'child', 'children')} in a line with ratings [${r.join(', ')}]. Everyone gets at least 1 candy; a child with a higher rating than a neighbour must get more than that neighbour.`,
    'Two kinds of constraints (left neighbour, right neighbour) are easier one at a time: one pass for each direction.', 'info', -1, -1, -1, [1], [1], 0,
    { tag: 'READY —', note: `n = ${n}, ratings = [${r.join(', ')}]` });
  add('Everyone starts with 1 candy', `every child gets 1 candy first, so candies = [${c.join(', ')}] and the total is ${n}`,
    'One candy each is the minimum the rules allow; the two passes only ever raise a count.', 'info', -1, -1, -1, [2, 3], [2], 0,
    { tag: 'INIT', note: `Arrays.fill(c, 1) → [${c.join(', ')}]` });

  pass = 'left → right';
  for (let i = 1; i < n; i++) {
    if (r[i] > r[i - 1]) {
      c[i] = c[i - 1] + 1;
      add(`Left pass, child ${i}: ${r[i]} > ${r[i - 1]}`, `rating ${r[i]} > ${r[i - 1]} (left neighbour), so candies[${i}] = candies[${i - 1}] + 1 = ${c[i]}`,
        'Walking right, this pass satisfies every "higher than my left neighbour" rule.', 'success', i, i - 1, i, [4, 5], [3, 4, 5], 1,
        { tag: 'LEFT PASS', note: `c[${i}] = c[${i - 1}] + 1 = ${c[i]}` });
    } else {
      add(`Left pass, child ${i}: ${r[i]} ≤ ${r[i - 1]}`, `rating ${r[i]} ≤ ${r[i - 1]} (left neighbour), so candies[${i}] stays ${c[i]}`,
        'No left-side constraint here.', 'info', i, i - 1, -1, [4, 5], [3, 4], 1,
        { tag: 'LEFT PASS', note: `r[${i}] > r[${i - 1}] is false: c[${i}] = ${c[i]}` });
    }
  }

  pass = 'right → left';
  for (let i = n - 2; i >= 0; i--) {
    if (r[i] > r[i + 1]) {
      const old = c[i];
      c[i] = Math.max(c[i], c[i + 1] + 1);
      add(`Right pass, child ${i}: ${r[i]} > ${r[i + 1]}`,
        `rating ${r[i]} > ${r[i + 1]} (right neighbour), so candies[${i}] = max(${old}, ${c[i + 1]} + 1) = ${c[i]}${c[i] === old ? ', the left pass already gave enough' : ''}`,
        'Taking the max keeps the left-pass requirement while also satisfying the right-hand one.', 'success', i, i + 1, c[i] !== old ? i : -1, [6, 7], [6, 7, 8], 2,
        { tag: 'RIGHT PASS', note: `c[${i}] = max(${old}, ${c[i + 1]} + 1) = ${c[i]}` });
    } else {
      add(`Right pass, child ${i}: ${r[i]} ≤ ${r[i + 1]}`, `rating ${r[i]} ≤ ${r[i + 1]} (right neighbour), so candies[${i}] stays ${c[i]}`,
        'No right-side constraint here.', 'info', i, i + 1, -1, [6, 7], [6, 7], 2,
        { tag: 'RIGHT PASS', note: `r[${i}] > r[${i + 1}] is false: c[${i}] = ${c[i]}` });
    }
  }

  pass = 'sum';
  const sum = total();
  add('Sum the candies', `add up candies = [${c.join(', ')}] → ${c.join(' + ')} = ${sum}`,
    'Both passes together satisfy both neighbour rules using the minimum possible candies.', 'info', -1, -1, -1, [8, 9], [9], 3,
    { tag: 'SUM', note: `total = ${c.join(' + ')} = ${sum}` });
  pass = 'done';
  add('Done', `the minimum total is ${sum} candies, given as [${c.join(', ')}]`, 'Both passes together satisfy both neighbour rules using the minimum possible candies.', 'success', -1, -1, -1, [10], [9], 4,
    { tag: '✅ Done!', note: `return ${sum}` }, { title: String(sum), text: 'Minimum total candies' });
  return steps;
}

export const candy: ProblemDef<In> = {
  slug: '135-candy',
  id: '135', title: 'Candy', difficulty: 'Hard', category: 'Greedy', tag: 'two-pass greedy',
  statement: 'Children stand in a line, each with a rating. Give each child at least one candy, and give a child strictly more candies than a neighbour who has a lower rating. Return the minimum total number of candies.',
  constraints: '1 ≤ n ≤ 2·10⁴, 0 ≤ rating ≤ 2·10⁴ (animation input: at most 12 ratings, each 0-99)',
  examples: [
    { label: '1 0 2', input: { ratings: [1, 0, 2] }, output: '5' },
    { label: '1 2 2', input: { ratings: [1, 2, 2] }, output: '4' },
    { label: '1 3 4 5 2', input: { ratings: [1, 3, 4, 5, 2] }, output: '11' },
  ],
  inputPlaceholder: 'ratings, e.g. 1 0 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Child being updated', state: 'active' }, { label: 'Neighbour compared', state: 'compare' }, { label: 'Candy count changed', state: 'found' }],
  varLabels: ['pass', 'i', 'candies so far'],
  emphasis: ['at least one candy', 'strictly more candies', 'minimum total'],
  phases: [
    { icon: '🍬', label: 'INIT (1 each)', tone: 'blue' },
    { icon: '➡', label: 'LEFT PASS (vs left)', tone: 'cyan' },
    { icon: '⬅', label: 'RIGHT PASS (vs right)', tone: 'orange' },
    { icon: '➕', label: 'SUM candies', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Satisfy left neighbours, then right neighbours',
    text: 'Give everyone one candy. Sweep left to right, giving a child one more than the left neighbour whenever the rating is higher. Then sweep right to left, raising a child to max(current, right neighbour + 1) whenever the rating is higher than the right neighbour. The sum is the answer.',
  },
  java: [
    'public int candy(int[] r) {',
    '    int n = r.length;',
    '    int[] c = new int[n];',
    '    Arrays.fill(c, 1);',
    '    for (int i = 1; i < n; i++)',
    '        if (r[i] > r[i - 1]) c[i] = c[i - 1] + 1;',
    '    for (int i = n - 2; i >= 0; i--)',
    '        if (r[i] > r[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);',
    '    int total = 0;',
    '    for (int x : c) total += x;',
    '    return total;',
    '}',
  ],
  python: [
    'def candy(r):',
    '    n = len(r)',
    '    c = [1] * n',
    '    for i in range(1, n):',
    '        if r[i] > r[i - 1]:',
    '            c[i] = c[i - 1] + 1',
    '    for i in range(n - 2, -1, -1):',
    '        if r[i] > r[i + 1]:',
    '            c[i] = max(c[i], c[i + 1] + 1)',
    '    return sum(c)',
  ],
  algorithm: [
    'Give every child 1 candy',
    'Left to right: if rating[i] > rating[i−1] set candies[i] = candies[i−1] + 1',
    'Right to left: if rating[i] > rating[i+1] set candies[i] = max(candies[i], candies[i+1] + 1)',
    'Add up the candies',
    'Return the total',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'After the left pass, every child satisfies the rule against the left neighbour with the smallest possible value; after the right pass, each child additionally satisfies the right rule. Taking the maximum in the second pass can only raise a count to what the right rule needs, so the left rule stays satisfied. Both values are lower bounds forced by the ratings, so nothing can be smaller.',
};
