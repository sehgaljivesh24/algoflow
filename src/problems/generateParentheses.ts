import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error('Enter a whole number from 1 to 4');
  return capSteps(build, { n });
}

function run({ n }: In, tree: RecTree): Step[] {
  const len = 2 * n;
  const steps: Step[] = [];
  const path: string[] = [];
  const results: string[] = [];
  let open = 0;
  let close = 0;
  let justDone = false;
  let rejected = '';
  let hot: number | undefined;

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(hot),
      Array.from({ length: len }, (_, i): Cell => {
        if (i === path.length && rejected) return { key: i, value: rejected, state: 'error' };
        return {
          key: i, value: i < path.length ? path[i] : '·',
          state: i < path.length ? (justDone ? 'found' : i === path.length - 1 ? 'active' : 'sorted') : 'dim',
        };
      }),
      path.length < len ? [{ id: 'p', label: 'next', index: path.length, tone: rejected ? ('red' as const) : ('blue' as const) }] : [],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: 'path', kind: 'stack' as const, items: [...path] },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { open, close, path: path.join('') || '""', results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Build every balanced string with ${n} pair${n === 1 ? '' : 's'} (${len} characters). Slots are filled left to right; open = close = 0.`,
    note: `backtrack(n=${n}, open=0, close=0, "")`,
    logic: 'Two rules keep the string valid at every moment: never use more than n "(", and never let ")" outnumber "(".',
    java: [2], py: [14], algo: 0,
  });

  const reject = (ch: string, why: string, guard: string, java: number, py: number) => {
    rejected = ch;
    hot = tree.leaf(`${path.join('')}${ch}`, 'pruned', { edge: ch });
    say({
      title: `Reject "${ch}"`, tag: 'PRUNED ✂️',
      alert: `Rejected "${ch}": ${why}. This branch is never built.`,
      desc: `Guard ${guard} fails at "${path.join('') || '(empty)'}", so no string starting with "${path.join('')}${ch}" is ever explored.`,
      note: `${guard} is false → skip`,
      logic: 'The guards cut off every prefix that could never become balanced, so no work is wasted on them.', tone: 'warn',
      java: [java], py: [py], algo: 3,
    });
    rejected = '';
    hot = undefined;
  };

  const bt = () => {
    tree.enter(path.join('') || '·', { edge: path.length ? path[path.length - 1] : undefined, call: `bt(open=${open}, close=${close}) "${path.join('')}"` });
    if (path.length === len) {
      results.push(path.join(''));
      justDone = true;
      tree.found(tree.top);
      say({
        title: `Record "${path.join('')}"`, tag: 'FOUND!',
        desc: `All ${len} slots are filled and the string is balanced: "${path.join('')}" is result #${results.length}.`,
        note: `length == ${len} → res.add("${path.join('')}")`,
        logic: 'Because the rules were enforced while building, a full-length path needs no extra validity check.', tone: 'success',
        java: [6, 7], py: [3, 4, 5], algo: 1,
      });
      justDone = false;
      tree.leave();
      return;
    }
    if (open < n) {
      path.push('(');
      open++;
      say({
        title: 'Choose "("', tag: 'CHOOSE',
        desc: `open (${open - 1}) < n (${n}), so another "(" is allowed. Path becomes "${path.join('')}"; explore.`,
        note: `open ${open - 1} < ${n} → append "(", open = ${open}`,
        logic: 'An opener is allowed while we still have some left.', java: [9, 10], py: [6, 7, 8], algo: 2,
      });
      bt();
      path.pop();
      open--;
      say({
        title: 'Un-choose "("', tag: 'BACKTRACK',
        desc: `Remove the "(": path is "${path.join('')}" and open = ${open} again. Next, try ")" here.`,
        note: `deleteCharAt(last) → "${path.join('')}", open = ${open}`,
        logic: 'Undo before trying the other symbol at this slot.', tone: 'warn', java: [11], py: [9], algo: 4,
      });
    } else {
      reject('(', `all ${n} openers are already used (open = ${open})`, `open < n (${open} < ${n})`, 9, 6);
    }
    if (close < open) {
      path.push(')');
      close++;
      say({
        title: 'Choose ")"', tag: 'CHOOSE',
        desc: `close (${close - 1}) < open (${open}), so a ")" still has an opener to match. Path becomes "${path.join('')}"; explore.`,
        note: `close ${close - 1} < open ${open} → append ")", close = ${close}`,
        logic: 'A closer is allowed only if some opener is still unmatched.', java: [13, 14], py: [10, 11, 12], algo: 2,
      });
      bt();
      path.pop();
      close--;
      say({
        title: 'Un-choose ")"', tag: 'BACKTRACK',
        desc: `Remove the ")": path is "${path.join('')}" and close = ${close} again. This call is finished.`,
        note: `deleteCharAt(last) → "${path.join('')}", close = ${close}`,
        logic: 'Backtrack to the previous slot.', tone: 'warn', java: [15], py: [13], algo: 4,
      });
    } else {
      reject(')', `close = ${close} equals open = ${open}, a ")" would have no "(" to match`, `close < open (${close} < ${open})`, 13, 10);
    }
    tree.leave();
  };
  bt();

  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} well-formed strings (Catalan number C${n}); every rejected branch was cut before it was built.`,
    note: `return res → ${results.length} strings`,
    logic: 'The counts follow 1, 2, 5, 14, … for n = 1, 2, 3, 4.', tone: 'success', java: [3], py: [15], algo: 5,
    result: { title: `${results.length} strings`, text: results.join(' ') },
  });
  return steps;
}

function build(input: In): Step[] {
  return twoPass((t) => run(input, t));
}

export const generateParentheses: ProblemDef<In> = {
  slug: '22-generate-parentheses',
  id: '22', title: 'Generate Parentheses', difficulty: 'Medium', category: 'Backtracking', tag: 'backtracking',
  statement: 'Given n pairs of parentheses, generate every combination of well-formed (balanced) parentheses.',
  emphasis: ['n pairs', 'well-formed', 'balanced'],
  constraints: '1 ≤ n ≤ 8 (animation input is limited to n ≤ 4)',
  examples: [
    { label: 'n = 3', input: { n: 3 }, output: '5 strings', answer: '5 strings: ((())) (()()) (())() ()(()) ()()()' },
    { label: 'n = 1', input: { n: 1 }, output: '1 string' },
    { label: 'n = 4', input: { n: 4 }, output: '14 strings' },
  ],
  inputPlaceholder: 'e.g. 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '➕', label: 'Choose', tone: 'green' },
    { icon: '✂️', label: 'Pruned', tone: 'orange' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Latest character / current call', state: 'active' },
    { label: 'Fixed prefix', state: 'sorted' },
    { label: 'Finished string', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Rejected by a guard', state: 'error' },
    { label: 'Empty slot / not visited', state: 'dim' },
  ],
  varLabels: ['open', 'close', 'path', 'results'],
  approach: {
    title: 'Only add what keeps the string valid',
    text: 'Track how many "(" and ")" are used. Add "(" while open < n. Add ")" while close < open. When the path has 2n characters it is balanced, so record it.',
  },
  java: [
    'public List<String> generateParenthesis(int n) {',
    '    List<String> res = new ArrayList<>();',
    '    backtrack(n, 0, 0, new StringBuilder(), res);',
    '    return res;',
    '}',
    'void backtrack(int n, int open, int close, StringBuilder path, List<String> res) {',
    '    if (path.length() == 2 * n) {',
    '        res.add(path.toString()); return;',
    '    }',
    '    if (open < n) {',
    '        path.append(\'(\'); backtrack(n, open + 1, close, path, res);',
    '        path.deleteCharAt(path.length() - 1);',
    '    }',
    '    if (close < open) {',
    '        path.append(\')\'); backtrack(n, open, close + 1, path, res);',
    '        path.deleteCharAt(path.length() - 1);',
    '    }',
    '}',
  ],
  python: [
    'def generate_parenthesis(n):',
    '    res, path = [], []',
    '    def backtrack(open_, close):',
    '        if len(path) == 2 * n:',
    '            res.append("".join(path))',
    '            return',
    '        if open_ < n:',
    '            path.append("(")  # choose',
    '            backtrack(open_ + 1, close)  # explore',
    '            path.pop()  # un-choose',
    '        if close < open_:',
    '            path.append(")")  # choose',
    '            backtrack(open_, close + 1)  # explore',
    '            path.pop()  # un-choose',
    '    backtrack(0, 0)',
    '    return res',
  ],
  algorithm: [
    'Start with an empty path and open = close = 0',
    'If the path has 2n characters, record it',
    'Choose "(" while open < n, or ")" while close < open, and recurse',
    'When a guard fails, that symbol is rejected and its branch is never built',
    'Un-choose each symbol after its recursion returns',
    'Return all recorded strings',
  ],
  complexity: [{ label: 'Time', value: 'O(4ⁿ / √n) (Catalan growth)' }, { label: 'Space', value: 'O(n) recursion plus output' }],
  why: 'A string is balanced exactly when no prefix has more ")" than "(" and the totals are equal. The two guards keep every prefix inside that region, and reaching length 2n with open ≤ n and close ≤ open forces both counts to be n. Different decision sequences give different strings, so there are no duplicates.',
};
