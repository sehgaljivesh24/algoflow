import type { Cell, CellState, Pointer, ProblemDef, Step, Tone } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { find } from './treeKit.ts';
import { ptr } from './ssbShared.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { s: string }

const java = [
  'public List<List<String>> partition(String s) {',
  '    List<List<String>> res = new ArrayList<>();',
  '    dfs(s, 0, new ArrayList<>(), res);',
  '    return res;',
  '}',
  'private void dfs(String s, int start, List<String> path, List<List<String>> res) {',
  '    if (start == s.length()) {                          // the whole string is cut into pieces',
  '        res.add(new ArrayList<>(path));',
  '        return;',
  '    }',
  '    for (int end = start; end < s.length(); end++) {',
  '        if (!isPalindrome(s, start, end)) continue;     // prune: only palindromic pieces may be chosen',
  '        path.add(s.substring(start, end + 1));          // choose the piece',
  '        dfs(s, end + 1, path, res);                     // explore the rest',
  '        path.remove(path.size() - 1);                   // un-choose',
  '    }',
  '}',
];
const python = [
  'def partition(s):',
  '    res = []',
  '    def dfs(start, path):',
  '        if start == len(s):                              # the whole string is cut into pieces',
  '            res.append(path[:])',
  '            return',
  '        for end in range(start, len(s)):',
  '            piece = s[start:end + 1]',
  '            if piece != piece[::-1]:                     # prune: only palindromic pieces',
  '                continue',
  '            path.append(piece)                           # choose',
  '            dfs(end + 1, path)                           # explore',
  '            path.pop()                                   # un-choose',
  '    dfs(0, [])',
  '    return res',
];
const J = {
  start: find(java, 'dfs(s, 0, new'),
  full: find(java, 'if (start == s.length())', 'res.add(new ArrayList'),
  loop: find(java, 'for (int end = start'),
  prune: find(java, 'if (!isPalindrome'),
  choose: find(java, 'path.add(s.substring'),
  explore: find(java, 'dfs(s, end + 1'),
  unchoose: find(java, 'path.remove'),
  ret: find(java, 'return res;'),
};
const P = {
  start: find(python, 'dfs(0, [])'),
  full: find(python, 'if start == len(s)', 'res.append(path[:])'),
  loop: find(python, 'for end in range', 'piece = s[start'),
  prune: find(python, 'if piece != piece', 'continue'),
  choose: find(python, 'path.append(piece)'),
  explore: find(python, 'dfs(end + 1, path)'),
  unchoose: find(python, 'path.pop()'),
  ret: find(python, 'return res'),
};
const TONES: Tone[] = ['blue', 'green', 'purple', 'orange'];
const isPal = (s: string) => s === [...s].reverse().join('');

function run({ s }: In, tree: RecTree): Step[] {
  const n = s.length;
  const steps: Step[] = [];
  const path: [number, number][] = [];
  const results: string[] = [];
  let start = 0;
  let end = -1;
  let verdict: 'try' | 'bad' | 'ok' = 'try';
  let hot: number | undefined;
  const piece = () => (end >= start ? s.slice(start, end + 1) : '—');
  const fmtPath = () => `[${path.map(([a, b]) => s.slice(a, b + 1)).join(', ')}]`;

  const say = recorder(steps, () => {
    const cells: Cell[] = [...s].map((ch, i) => {
      let state: CellState | undefined;
      let tone: Tone | undefined;
      path.forEach(([a, b], k) => { if (i >= a && i <= b) { tone = TONES[k % TONES.length]; state = 'found'; } });
      if (end >= start && i >= start && i <= end && !(path.length && i < start)) state = verdict === 'bad' ? 'error' : 'active';
      return { key: i, value: ch, state, tone: state === 'found' ? tone : undefined };
    });
    const pointers: Pointer[] = end >= start ? [ptr('s', 'start', start, 'green'), ptr('e', 'end', end, 'blue')] : start < n ? [ptr('s', 'start', start, 'green')] : [];
    return {
      scene: treeOverArray(tree.scene(hot), cells, pointers),
      aux: [
        { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
        { title: 'path (pieces chosen)', kind: 'stack' as const, items: path.map(([a, b]) => s.slice(a, b + 1)) },
        { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
      ],
      vars: { start, end: end < start ? '—' : end, piece: piece(), path: fmtPath(), results: results.length },
    };
  });

  say({
    title: 'Start', tag: 'INIT', desc: `Cut "${s}" into pieces so that every piece is a palindrome. start = 0, path is empty.`,
    note: `dfs(s, 0, [ ]) → ${n} letters`,
    logic: 'At each position we choose how long the next piece is. A piece that is not a palindrome can never be part of an answer, so that branch is cut immediately.',
    java: J.start, py: P.start, algo: 0,
  });

  const dfs = (st: number) => {
    start = st;
    end = -1;
    verdict = 'try';
    tree.enter(s.slice(st) || '∅', {
      edge: path.length ? s.slice(path[path.length - 1][0], path[path.length - 1][1] + 1) : undefined,
      call: `dfs(start=${st}) ${fmtPath()}`,
    });
    if (st === n) {
      results.push(fmtPath());
      tree.found(tree.top);
      say({
        title: `Record ${fmtPath()}`, tag: 'FOUND!',
        desc: `start reached ${n}: the string is fully cut and every piece is a palindrome. Store ${fmtPath()} as partition #${results.length}.`,
        note: `start == ${n} → res.add(${fmtPath()})`,
        logic: 'Because every chosen piece was checked, any complete path is a valid answer.', tone: 'success',
        java: J.full, py: P.full, algo: 4,
      });
      tree.leave();
      return;
    }
    for (let e = st; e < n; e++) {
      start = st;
      end = e;
      const p = s.slice(st, e + 1);
      if (!isPal(p)) {
        verdict = 'bad';
        hot = tree.leaf(`"${p}" ✗`, 'pruned', { edge: p });
        say({
          title: `"${p}" is not a palindrome: prune`, tag: 'PRUNED ✂️',
          alert: `"${p}" reads "${[...p].reverse().join('')}" backwards, so it is not a palindrome. The whole branch of partitions starting with it is cut.`,
          desc: `s[${st}..${e}] = "${p}" is not a palindrome, so no answer can start with this piece. Skip it without recursing.`,
          note: `isPalindrome(s, ${st}, ${e}) = false for "${p}" → continue`,
          logic: 'Pruning here removes the whole subtree of partitions of the rest, not just one candidate.', tone: 'warn',
          java: J.prune, py: P.prune, algo: 1,
        });
        hot = undefined;
        continue;
      }
      verdict = 'ok';
      path.push([st, e]);
      say({
        title: `Choose "${p}"`, tag: 'CHOOSE',
        desc: `"${p}" is a palindrome. Add it → path ${fmtPath()} and partition the rest starting at index ${e + 1}.`,
        note: `isPalindrome("${p}") = true → path.add("${p}"); dfs(${e + 1})`,
        logic: 'A valid piece is committed; the rest of the string is the same problem on a shorter suffix.',
        java: [...J.choose, ...J.explore], py: [...P.choose, ...P.explore], algo: 2,
      });
      dfs(e + 1);
      start = st;
      end = e;
      verdict = 'ok';
      path.pop();
      say({
        title: `Un-choose "${p}"`, tag: 'BACKTRACK',
        desc: `Back from the recursion: remove "${p}" so the path is ${fmtPath()} again and try a longer piece.`,
        note: `path.remove(last) → ${fmtPath()}`,
        logic: 'Undoing the choice restores the exact state the loop needs for the next end index.', tone: 'warn',
        java: J.unchoose, py: P.unchoose, algo: 3,
      });
    }
    start = st;
    end = -1;
    tree.leave();
  };
  dfs(0);

  start = n;
  end = -1;
  say({
    title: 'Done', tag: '✅ Done!', desc: `${results.length} palindrome partition${results.length === 1 ? '' : 's'} found: ${results.join(' ')}. Non-palindromic prefixes were never expanded.`,
    note: `return res → ${results.length} partition${results.length === 1 ? '' : 's'}`,
    logic: 'All branches were explored; non-palindromic prefixes were never expanded.', tone: 'success',
    java: J.ret, py: P.ret, algo: 5, result: { title: `${results.length} partition${results.length === 1 ? '' : 's'}`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

function parse(raw: string): In {
  const s = raw.trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!/^[a-z]{1,6}$/.test(s)) throw new Error('Enter 1 to 6 lowercase letters, e.g. aab');
  return capSteps(build, { s });
}

export const palindromePartitioning: ProblemDef<In> = {
  slug: '131-palindrome-partitioning',
  id: '131', title: 'Palindrome Partitioning', difficulty: 'Medium', category: 'Backtracking', tag: 'prune non-palindromic pieces',
  statement: 'Partition a string into substrings so that every substring is a palindrome, and return all such partitions.',
  constraints: '1 ≤ s.length ≤ 16, lowercase letters (animation input is limited to 6 letters).',
  examples: [
    { label: 'aab', input: { s: 'aab' }, output: '[[a,a,b],[aa,b]]' },
    { label: 'aaa', input: { s: 'aaa' }, output: '4 partitions' },
    { label: 'abcba', input: { s: 'abcba' }, output: '[[a,b,c,b,a],[a,bcb,a],[abcba]]' },
  ],
  inputPlaceholder: 'e.g. aab',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['every substring is a palindrome', 'all such partitions'],
  phases: [
    { icon: '🔍', label: 'Init', tone: 'blue' },
    { icon: '✂️', label: 'Prune non-palindrome', tone: 'orange' },
    { icon: '➕', label: 'Choose piece', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Piece being tried / current call', state: 'active' },
    { label: 'Chosen pieces (one colour each)', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Rejected piece (not a palindrome)', state: 'error' },
  ],
  varLabels: ['start', 'end', 'piece', 'path', 'results'],
  approach: {
    title: 'Choose a palindromic prefix of the rest',
    text: 'At index start, try every end. If s[start..end] is not a palindrome, skip it (prune). Otherwise add it to the path, recurse from end + 1, and remove it again. When start reaches the end of the string the path is one complete partition.',
  },
  java, python,
  algorithm: [
    'Begin with start = 0 and an empty path',
    'For each end from start, test whether s[start..end] is a palindrome; if not, prune',
    'Choose the piece and recurse from end + 1',
    'Un-choose the piece on the way back and try a longer one',
    'When start equals the string length, record a copy of the path',
    'Return every recorded partition',
  ],
  complexity: [{ label: 'Time', value: 'O(n · 2ⁿ)' }, { label: 'Space', value: 'O(n) recursion, plus the output' }],
  why: 'Every partition corresponds to exactly one sequence of cut positions, and the recursion enumerates cut positions left to right, so nothing is missed or repeated. Testing the piece before recursing is a sound prune: a non-palindromic first piece makes every partition containing it invalid, so skipping it discards only invalid partitions. In the worst case (a string of one repeated letter) all 2ⁿ⁻¹ partitions are valid, which is why the bound is exponential.',
};
