import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { TrieModel } from '../trieKit.ts';
import { recorder } from '../stepKit.ts';

type Op = { op: 'add' | 'search'; word: string };
interface In { ops: Op[] }

function parse(raw: string): In {
  const toks = raw.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) throw new Error('Write operations as add:word or search:pattern, e.g. add:bad add:dad search:.ad');
  if (toks.length > 9) throw new Error('Use at most 9 operations');
  const ops = toks.map((t): Op => {
    const m = /^(add|search):([a-z.]+)$/i.exec(t);
    if (!m) throw new Error(`"${t}" is not valid. Use add:word (lowercase letters) or search:pattern (letters and . wildcards)`);
    const op = m[1].toLowerCase() as Op['op'];
    if (op === 'add' && m[2].includes('.')) throw new Error('Words you add cannot contain "." — only search patterns can');
    if (m[2].length > 5) throw new Error('Keep each word or pattern to 5 characters or fewer');
    return { op, word: m[2] };
  });
  if (new Set(ops.filter((o) => o.op === 'add').map((o) => o.word)).size > 5) throw new Error('Add at most 5 different words');
  const input = { ops };
  if (build(input).length > 300) throw new Error('That input needs too many steps. Use fewer wildcards or fewer words.');
  return input;
}

function build({ ops }: In): Step[] {
  const trie = new TrieModel();
  const steps: Step[] = [];
  const stored: string[] = [];
  const out: string[] = [];
  let scene = trie.scene();
  let opLabel = '—';
  let pat = '—';
  let pos = '—';
  const aux = (): Aux[] => [
    { title: 'words stored', kind: 'list', items: [...stored] },
    { title: 'output so far', kind: 'list', items: [...out] },
  ];
  const say = recorder(steps, () => ({ scene, aux: aux(), vars: { op: opLabel, pattern: pat, 'pattern index': pos, output: `[${out.join(', ')}]` } }));

  say({ title: 'Start', desc: 'An empty trie. addWord inserts plain letters; search may contain "." which matches any single letter, so it explores every child there.', logic: 'Exact letters follow one edge, a dot fans out to all edges: a depth-first search over the trie.', java: [0, 1, 2], py: [0, 1, 2], algo: 0, tag: 'START —', note: 'dictionary = { root }, 0 words stored' });

  for (const { op, word } of ops) {
    opLabel = `${op}("${word}")`;
    pat = word;
    pos = '—';
    if (op === 'add') {
      let id = 0;
      const path = [0];
      scene = trie.scene(path, { 0: 'active' });
      say({ title: opLabel, desc: `Insert "${word}" letter by letter, creating missing nodes.`, logic: 'Insertion is the plain trie walk: one node per letter.', java: [4, 5], py: [4, 5], algo: 1, tag: 'ADD —', note: `addWord("${word}"): ${word.length} letters, node = root` });
      for (let k = 0; k < word.length; k++) {
        const [nid, created] = trie.ensure(id, word[k]);
        id = nid;
        path.push(id);
        pos = String(k + 1);
        scene = trie.scene(path, { [id]: created ? 'found' : 'active' });
        say({ title: created ? `Create '${word[k]}'` : `Reuse '${word[k]}'`, desc: created ? `No child '${word[k]}' here yet, so add one.` : `Child '${word[k]}' already exists, so the prefix is shared.`, logic: created ? 'New letters extend the trie by one node.' : 'Shared prefixes cost nothing extra.', tone: 'info', java: [6, 7, 8], py: [6, 7], algo: 1, tag: created ? 'CREATE —' : 'SHARE —', note: created ? `ch='${word[k]}': next['${word[k]}'] == null → new node, at "${word.slice(0, k + 1)}"` : `ch='${word[k]}': next['${word[k]}'] exists → reuse, at "${word.slice(0, k + 1)}"` });
      }
      trie.nodes[id].end = true;
      if (!stored.includes(word)) stored.push(word);
      out.push('null');
      scene = trie.scene(path, { [id]: 'found' });
      say({ title: `Mark "${word}" as a word`, desc: 'Set the end-of-word flag on the last node.', logic: 'Without the flag a stored word could not be told from a prefix of a longer one.', tone: 'info', java: [10], py: [8], algo: 1, tag: 'FLAG —', note: `node("${word}").end = true (${stored.length} word${stored.length === 1 ? '' : 's'} stored)` });
      continue;
    }

    scene = trie.scene([0], { 0: 'active' });
    say({ title: opLabel, desc: `Search for the pattern "${word}" starting at the root. A letter follows one edge; a "." tries every edge.`, logic: 'The search is a recursive DFS: dfs(position in pattern, node).', java: [13], py: [10, 18], algo: 2, tag: 'SEARCH —', note: `search("${word}") → dfs(0, root), ${[...word].filter((c) => c === '.').length} wildcard${[...word].filter((c) => c === '.').length === 1 ? '' : 's'}` });

    const dfs = (i: number, id: number, path: number[]): boolean => {
      pos = String(i);
      if (i === word.length) {
        const ok = !!trie.nodes[id].end;
        const st: CellState = ok ? 'found' : 'compare';
        scene = trie.scene(path, { [id]: st });
        say({ title: ok ? 'Pattern used up on a word end' : 'Pattern used up, but not a word', desc: ok ? 'Every character matched and this node carries the end flag: success.' : 'Every character matched, but this node is only a prefix of longer words (no end flag).', logic: 'A match needs the whole pattern consumed AND an end-of-word node.', tone: ok ? 'success' : 'warn', java: [16], py: [12, 13], algo: 4, tag: ok ? 'MATCH —' : 'PREFIX ONLY —', alert: ok ? undefined : `Pattern "${word}" is fully consumed but this node has no end flag`, note: `i == ${word.length} → return node.end = ${ok}` });
        return ok;
      }
      const ch = word[i];
      if (ch !== '.') {
        const nid = trie.child(id, ch);
        if (nid === null) {
          scene = trie.scene(path, { [id]: 'error' });
          say({ title: `No child '${ch}': dead end`, desc: `This node has no '${ch}' edge, so this branch cannot match.`, logic: 'A missing edge kills the branch, and the search backs up to try another one.', tone: 'warn', java: [19, 20], py: [16], algo: 3, tag: 'DEAD END —', alert: `No '${ch}' edge here: this branch cannot match, back up`, note: `child = node.next['${ch}'] == null → return false` });
          return false;
        }
        scene = trie.scene([...path, nid], { [nid]: 'active' });
        say({ title: `Follow '${ch}'`, desc: `Pattern character ${i + 1} is the letter '${ch}'; follow its edge.`, logic: 'A fixed letter has exactly one possible edge.', java: [17, 19, 20], py: [14, 16], algo: 3, tag: 'FOLLOW —', note: `i=${i}: ch='${ch}' ≠ '.', child exists → dfs(${i + 1}, node '${ch}')` });
        return dfs(i + 1, nid, [...path, nid]);
      }
      const kids = trie.nodes[id].children;
      scene = trie.scene(path, { [id]: 'compare' });
      say({ title: `"." fans out to ${kids.length} child${kids.length === 1 ? '' : 'ren'}`, desc: kids.length ? `A dot matches any letter, so try each child in turn (${kids.map((c) => trie.nodes[c].char).join(', ')}).` : 'A dot needs a child to consume, but this node is a leaf: dead end.', logic: 'The wildcard multiplies the work: one branch per child.', tone: kids.length ? 'info' : 'warn', java: [22, 23], py: [17], algo: 3, tag: 'WILDCARD —', alert: kids.length ? undefined : 'Wildcard at a leaf: nothing left to consume', note: `i=${i}: ch='.' → try ${kids.length} child${kids.length === 1 ? '' : 'ren'}${kids.length ? ` [${kids.map((c) => trie.nodes[c].char).join(', ')}]` : ''}` });
      for (const c of kids) {
        scene = trie.scene([...path, c], { [c]: 'active' });
        say({ title: `Try '${trie.nodes[c].char}'`, desc: `Let the dot be '${trie.nodes[c].char}' and continue with the rest of the pattern.`, logic: 'Stop at the first child that leads to a full match.', java: [23], py: [17], algo: 3, tag: 'TRY —', note: `dot := '${trie.nodes[c].char}' → dfs(${i + 1}, child '${trie.nodes[c].char}')` });
        if (dfs(i + 1, c, [...path, c])) return true;
      }
      return false;
    };

    const ok = dfs(0, 0, [0]);
    out.push(String(ok));
    pos = '—';
    scene = trie.scene([0], {});
    say({ title: `Return ${ok}`, desc: ok ? `A branch matched "${word}".` : `Every branch failed, so nothing stored matches "${word}".`, logic: ok ? 'One successful path is enough.' : 'Only after all branches fail can search answer false.', tone: ok ? 'success' : 'warn', java: [13, 25], py: [18], algo: 4, tag: 'RETURN —', alert: ok ? undefined : `Every branch of "${word}" failed`, note: `search("${word}") = ${ok}` });
  }
  opLabel = '—';
  pat = '—';
  pos = '—';
  scene = trie.scene();
  say({ title: 'Done', desc: `All ${ops.length} operations processed. Outputs in order: [${out.join(', ')}].`, logic: 'Only dots branch; plain letters follow a single edge, so most searches cost O(L).', tone: 'success', java: [25], py: [18], algo: 5, tag: '✅ Done!', note: `${stored.length} word${stored.length === 1 ? '' : 's'} stored` });
  steps[steps.length - 1].result = { title: `[${out.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

const P = (s: string): In => ({ ops: s.split(' ').map((t) => { const [a, b] = t.split(':'); return { op: a as Op['op'], word: b }; }) });

export const designAddAndSearchWords: ProblemDef<In> = {
  slug: '211-design-add-and-search-words-data-structure',
  id: '211', title: 'Design Add and Search Words Data Structure', difficulty: 'Medium', category: 'Trie', tag: 'trie + wildcard DFS',
  statement: 'Design a dictionary with addWord(word) and search(pattern). A pattern may contain "." which stands for any single letter; search returns true when some stored word matches the whole pattern.',
  constraints: 'Lowercase words; "." only in searches (animation input: up to 9 operations, words and patterns of at most 5 characters, at most 5 different added words; write operations as add:word / search:pattern)',
  examples: [
    { label: 'add:bad add:dad add:mad search:pad search:bad search:.ad search:b..', input: P('add:bad add:dad add:mad search:pad search:bad search:.ad search:b..'), output: '[null, null, null, false, true, true, true]' },
    { label: 'add:at add:and add:an search:a. search:.n search:.t', input: P('add:at add:and add:an search:a. search:.n search:.t'), output: '[null, null, null, true, true, true]' },
    { label: 'add:cab add:cat search:c.. search:.a. search:ca search:..z', input: P('add:cab add:cat search:c.. search:.a. search:ca search:..z'), output: '[null, null, true, true, false, false]' },
  ],
  inputPlaceholder: 'e.g. add:bad add:dad search:.ad search:b..',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Branch being explored', state: 'active' }, { label: 'Match / created', state: 'found' }, { label: 'Wildcard fan-out / prefix only', state: 'compare' }, { label: 'Dead end', state: 'error' }],
  emphasis: ['addWord', 'search', 'pattern', '"."', 'any single letter'],
  varLabels: ['op', 'pattern', 'pattern index', 'output'],
  phases: [
    { icon: '🌱', label: 'Phase 1: Empty trie', tone: 'blue' },
    { icon: '➕', label: 'ADD: build the word', tone: 'green' },
    { icon: '🔍', label: 'SEARCH: start dfs', tone: 'cyan' },
    { icon: '🌿', label: 'DFS: follow / fan out', tone: 'orange' },
    { icon: '🎯', label: 'MATCH: check end flag', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  vizTitle: 'Trie',
  approach: {
    title: 'A plain trie plus a DFS for the dots',
    text: 'addWord is the usual trie insert. search recurses on (position in the pattern, node): a letter follows its single edge, a dot loops over every child, and the base case checks the end-of-word flag once the pattern is used up. The first branch that returns true wins.',
  },
  java: [
    'class WordDictionary {',
    '    private final WordDictionary[] next = new WordDictionary[26];',
    '    private boolean end;',
    '',
    '    public void addWord(String word) {',
    '        WordDictionary node = this;',
    '        for (char ch : word.toCharArray()) {',
    '            if (node.next[ch - \'a\'] == null) node.next[ch - \'a\'] = new WordDictionary();',
    '            node = node.next[ch - \'a\'];',
    '        }',
    '        node.end = true;',
    '    }',
    '',
    '    public boolean search(String word) { return dfs(word, 0, this); }',
    '',
    '    private boolean dfs(String w, int i, WordDictionary node) {',
    '        if (i == w.length()) return node.end;',
    '        char ch = w.charAt(i);',
    '        if (ch != \'.\') {',
    '            WordDictionary child = node.next[ch - \'a\'];',
    '            return child != null && dfs(w, i + 1, child);',
    '        }',
    '        for (WordDictionary child : node.next) {          // "." tries every child',
    '            if (child != null && dfs(w, i + 1, child)) return true;',
    '        }',
    '        return false;',
    '    }',
    '}',
  ],
  python: [
    'class WordDictionary:',
    '    def __init__(self):',
    '        self.root = {}',
    '',
    '    def addWord(self, word):',
    '        node = self.root',
    '        for ch in word:',
    '            node = node.setdefault(ch, {})',
    '        node["$"] = True',
    '',
    '    def search(self, word):',
    '        def dfs(i, node):',
    '            if i == len(word):',
    '                return "$" in node',
    '            ch = word[i]',
    '            if ch != ".":',
    '                return ch in node and dfs(i + 1, node[ch])',
    '            return any(dfs(i + 1, child) for k, child in node.items() if k != "$")',
    '        return dfs(0, self.root)',
  ],
  algorithm: [
    'Start with an empty trie (nodes with children and an end flag)',
    'addWord: walk the letters, creating nodes, then set the end flag',
    'search: start dfs(0, root) on the pattern',
    'A letter follows one edge; a "." tries every child; a missing edge is a dead end',
    'Pattern used up: the answer is that node’s end flag',
    'Done: every operation answered',
  ],
  complexity: [{ label: 'addWord', value: 'O(L)' }, { label: 'search', value: 'O(26^dots · L) worst case' }],
  why: 'Each trie node stands for one prefix, so matching a pattern means finding a node reachable by letters that agree with the pattern at every position. A fixed letter allows exactly one edge, so only dots create choices; trying every child covers every possible letter for the dot, so no match can be missed. Reaching the end of the pattern on a node with the end flag is exactly "some stored word equals the spelled prefix".',
};
