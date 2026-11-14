import type { Aux, ProblemDef, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { TrieModel } from '../trieKit.ts';
import { bruteLcp, parseWord, suffixesSorted } from './kitD.ts';

interface In { s: string }

const parse = (raw: string): In => ({ s: parseWord(raw, { min: 2, max: 7, what: 'the string', example: 'banana' }) });

export function countDistinct(s: string): number {
  const set = new Set<string>();
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) set.add(s.slice(i, j));
  return set.size;
}

function build({ s }: In): Step[] {
  const n = s.length;
  const trie = new TrieModel();
  const steps: Step[] = [];
  const seen: string[] = [];
  let nodes = 0;
  let cur = '—';
  let suffix = '—';

  const aux = (): Aux[] => [{ title: 'suffixes inserted', kind: 'list', items: [...seen] }];
  const push = (x: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...x, aux: aux(), vars: { suffix, 'letter path': cur, 'new nodes': nodes } });

  push({
    title: 'An empty suffix trie', desc: `We will insert all ${n} suffixes of "${s}" into one trie. A node is created only when a letter path has never been seen, so each created node is a brand-new substring.`,
    scene: trie.scene(), logic: 'Every substring is a prefix of a suffix, and a trie stores each distinct prefix exactly once.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
    tag: 'EMPTY TRIE —', note: `n = ${n} suffixes to insert, nodes = 1 (root only)`,
  });

  for (let i = 0; i < n; i++) {
    suffix = `"${s.slice(i)}"`;
    seen.push(s.slice(i));
    let id = 0;
    const path = [0];
    cur = '(root)';
    push({
      title: `Insert suffix ${i}: "${s.slice(i)}"`, desc: `Start at the root and walk the letters of "${s.slice(i)}".`,
      scene: trie.scene(path, { 0: 'active' }), logic: 'Each suffix is inserted from the root, so shared beginnings reuse existing nodes.', logicTone: 'info',
      javaLines: [4, 5], pyLines: [3, 4], algoStep: 1,
      tag: 'INSERT SUFFIX —', note: `i = ${i}, cur = 0 (root), suffix "${s.slice(i)}" has ${n - i} letter${n - i === 1 ? '' : 's'}`,
    });
    for (let j = i; j < n; j++) {
      const [nid, created] = trie.ensure(id, s[j]);
      id = nid;
      path.push(id);
      cur = s.slice(i, j + 1);
      if (created) nodes++;
      if (j === n - 1) trie.nodes[id].end = true;
      push({
        title: created ? `New substring "${s.slice(i, j + 1)}"` : `"${s.slice(i, j + 1)}" already exists`,
        desc: created ? `No '${s[j]}' edge below "${s.slice(i, j)}", so a node is created. That is distinct substring number ${nodes}.` : `The edge '${s[j]}' is already there, so "${s.slice(i, j + 1)}" was counted before.`,
        scene: trie.scene(path, { [id]: created ? 'found' : 'active' }),
        logic: created ? 'A new node means a new distinct substring.' : 'Reusing a node means a repeated substring: it adds nothing to the count.', logicTone: created ? 'success' : 'info',
        javaLines: created ? [6, 7, 8, 9] : [6, 7, 9], pyLines: created ? [5, 6, 7, 8, 9] : [5, 6, 9], algoStep: 2,
        tag: created ? 'NEW NODE:' : 'REUSE EDGE:',
        note: created ? `next[cur]['${s[j]}'] = nodes++ → nodes = ${nodes}` : `edge '${s[j]}' exists, nodes stays ${nodes}`,
      });
    }
  }

  const sa = suffixesSorted(s);
  const lcpSum = bruteLcp(s, sa).reduce((a, b) => a + b, 0);
  cur = '—';
  suffix = '—';
  push({
    title: 'Cross-check with the suffix array', desc: `Total letters in all suffixes = ${(n * (n + 1)) / 2}. Sorted neighbours share ${plural(lcpSum, 'letter')} in total (sum of LCP). ${(n * (n + 1)) / 2} − ${lcpSum} = ${(n * (n + 1)) / 2 - lcpSum}, the same count.`,
    scene: trie.scene([], {}), logic: 'Each suffix adds (its length − LCP with its sorted predecessor) new substrings, so the suffix array gives the answer without building a trie.', logicTone: 'info',
    javaLines: [12], pyLines: [10], algoStep: 3,
    tag: 'CROSS-CHECK —', note: `${(n * (n + 1)) / 2} − ${lcpSum} = ${(n * (n + 1)) / 2 - lcpSum} = ${nodes} nodes`,
  });
  push({
    title: 'Done', desc: `The trie has ${nodes} non-root nodes, so "${s}" has ${nodes} distinct non-empty substrings.`,
    scene: trie.scene(), logic: 'Every non-root node is exactly one distinct substring.', logicTone: 'success',
    javaLines: [12], pyLines: [10], algoStep: 4,
    tag: '✅ Done!', note: `return nodes − 1 = ${nodes} distinct substrings`,
    result: { title: String(nodes), text: 'Distinct non-empty substrings' },
  });
  return steps;
}

export const countDistinctSubstrings: ProblemDef<In> = {
  slug: 'cp-count-distinct-substrings-suffix-trie',
  id: 'CP', title: 'Count Distinct Substrings (Suffix Trie)', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'suffix trie',
  statement: 'Count the distinct non-empty substrings of a string. Insert every suffix into one trie: every substring is a prefix of some suffix, so the number of non-root nodes is the answer.',
  constraints: 'Lowercase letters (animation input: 2 to 7 letters)',
  examples: [
    { label: 'abab', input: { s: 'abab' }, output: '7' },
    { label: 'aaaa', input: { s: 'aaaa' }, output: '4' },
    { label: 'banana', input: { s: 'banana' }, output: '15' },
  ],
  inputPlaceholder: 'e.g. banana',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Suffix trie',
  legend: [{ label: 'Walking node', state: 'active' }, { label: 'New substring (node created)', state: 'found' }],
  emphasis: ['distinct non-empty substrings', 'suffix', 'trie'],
  phases: [
    { icon: '🌱', label: 'Empty trie', tone: 'blue' },
    { icon: '📥', label: 'Insert a suffix', tone: 'cyan' },
    { icon: '🔤', label: 'Follow or create nodes', tone: 'green' },
    { icon: '🧮', label: 'Cross-check with LCP', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['suffix', 'letter path', 'new nodes'],
  approach: {
    title: 'A trie of all suffixes counts each substring once',
    text: 'Insert suffix 0, suffix 1, … into a trie. A path from the root spells a substring, and shared prefixes share nodes. The number of nodes (excluding the root) is the number of distinct substrings. The same number equals n(n+1)/2 minus the sum of the LCP array.',
  },
  java: [
    'static int countDistinct(String s) {',
    '    int n = s.length();',
    '    int[][] next = new int[n * (n + 1) / 2 + 1][26];',
    '    int nodes = 1;                         // the root',
    '    for (int i = 0; i < n; i++) {          // insert suffix i',
    '        int cur = 0;',
    '        for (int j = i; j < n; j++) {',
    '            int c = s.charAt(j) - \'a\';',
    '            if (next[cur][c] == 0) next[cur][c] = nodes++;   // a new substring',
    '            cur = next[cur][c];',
    '        }',
    '    }',
    '    return nodes - 1;                      // every non-root node = one substring',
    '}',
  ],
  python: [
    'def count_distinct(s):',
    '    root = {}',
    '    nodes = 0',
    '    for i in range(len(s)):',
    '        cur = root',
    '        for ch in s[i:]:',
    '            if ch not in cur:',
    '                cur[ch] = {}',
    '                nodes += 1',
    '            cur = cur[ch]',
    '    return nodes',
  ],
  algorithm: [
    'Start with an empty trie (just the root)',
    'For every suffix, walk from the root along its letters',
    'Follow an existing edge, or create the node: a created node is a new distinct substring',
    'Cross-check: n(n+1)/2 minus the LCP sum of the sorted suffixes gives the same count',
    'Return the number of non-root nodes',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n²) nodes' }],
  why: 'A substring s[i..j] is a prefix of the suffix starting at i, so it appears as a path from the root once suffix i is inserted. Two equal substrings follow the same path and therefore the same node, so nodes are in one-to-one correspondence with distinct substrings. The trie can have quadratically many nodes, which is why the suffix array with its LCP sum (or a suffix automaton) is preferred for long strings.',
};
