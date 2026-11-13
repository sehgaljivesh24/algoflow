import type { Aux, ProblemDef, Step } from '../engine/types';
import { tokens } from './graphKit.ts';
import { TrieModel } from './trieKit.ts';

type Op = { op: 'insert' | 'search' | 'startsWith'; word: string };
interface In { ops: Op[] }

const NAMES: Record<string, Op['op']> = { insert: 'insert', search: 'search', startswith: 'startsWith' };

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length) throw new Error('Write operations as op:word, e.g. insert:apple search:apple search:app startsWith:app');
  if (toks.length > 8) throw new Error('Use at most 8 operations');
  const ops = toks.map((t) => {
    const m = /^([A-Za-z]+):([a-z]+)$/.exec(t);
    const op = m && NAMES[m[1].toLowerCase()];
    if (!m || !op) throw new Error(`"${t}" is not valid. Use insert:word, search:word or startsWith:word with lowercase letters`);
    if (m[2].length > 6) throw new Error('Keep each word to 6 letters or fewer');
    return { op, word: m[2] };
  });
  if (new Set(ops.filter((o) => o.op === 'insert').map((o) => o.word)).size > 5) throw new Error('Insert at most 5 different words');
  return { ops };
}

function build({ ops }: In): Step[] {
  const trie = new TrieModel();
  const stored: string[] = [];
  const out: string[] = [];
  const steps: Step[] = [];
  let opLabel = '—';
  let word = '—';
  let at = 'root';

  const aux = (): Aux[] => [
    { title: 'words stored', kind: 'list', items: [...stored] },
    { title: 'output so far', kind: 'list', items: [...out] },
  ];
  const vars = () => ({ op: opLabel, word, at, output: `[${out.join(', ')}]` });
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...s, aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: 'An empty trie: just the root. Each edge will carry one letter; a double ring marks the end of a stored word.',
    scene: trie.scene(), logic: 'A trie shares common prefixes, so words like "app" and "apple" use the same first three nodes.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2, 3], algoStep: 0,
    tag: 'START —', note: 'trie = { root }, 0 words stored',
  });

  for (const { op, word: w } of ops) {
    opLabel = `${op}("${w}")`;
    word = w;
    at = 'root';
    let id = 0;
    const path = [0];
    push({
      title: opLabel, desc: op === 'insert' ? `Walk down from the root, creating any missing nodes for "${w}".` : op === 'search' ? `Walk down the letters of "${w}"; the word counts only if the last node is an end-of-word.` : `Walk down the letters of "${w}"; the prefix counts if every letter has a node.`,
      scene: trie.scene(path, { 0: 'active' }), logic: 'Every operation starts at the root and consumes one letter per step.', logicTone: 'info',
      javaLines: op === 'insert' ? [4, 5] : op === 'search' ? [14, 15, 24] : [19, 20, 24], pyLines: op === 'insert' ? [5, 6] : op === 'search' ? [13, 14, 21] : [17, 18, 21], algoStep: op === 'insert' ? 1 : 3,
      tag: op === 'insert' ? 'INSERT —' : op === 'search' ? 'SEARCH —' : 'PREFIX —',
      note: `${op}("${w}"): ${w.length} letters to consume, start at root`,
    });

    let failed = false;
    for (let k = 0; k < w.length && !failed; k++) {
      const ch = w[k];
      if (op === 'insert') {
        const [nid, created] = trie.ensure(id, ch);
        id = nid;
        path.push(id);
        at = `"${w.slice(0, k + 1)}"`;
        push({
          title: created ? `Create node for '${ch}'` : `Follow existing '${ch}'`, desc: created ? `No child '${ch}' under "${w.slice(0, k)}", so add one.` : `Child '${ch}' already exists, so the prefix "${w.slice(0, k + 1)}" is shared.`,
          scene: trie.scene(path, { [id]: created ? 'found' : 'active' }), logic: created ? 'New letters extend the trie by one node.' : 'Existing nodes are reused, which is how a trie saves space.', logicTone: created ? 'success' : 'info',
          javaLines: created ? [6, 7, 8, 9] : [6, 7, 9], pyLines: created ? [7, 8, 9, 10] : [7, 8, 10], algoStep: 1,
          tag: created ? 'CREATE —' : 'SHARE —',
          note: created ? `ch='${ch}', next[${ch.charCodeAt(0) - 97}] == null → new node, now at "${w.slice(0, k + 1)}"` : `ch='${ch}', next[${ch.charCodeAt(0) - 97}] exists → reuse, now at "${w.slice(0, k + 1)}"`,
        });
      } else {
        const nid = trie.child(id, ch);
        if (nid === null) {
          failed = true;
          push({
            title: `No child '${ch}': stop`, desc: `"${w.slice(0, k)}" has no '${ch}' edge, so "${w.slice(0, k + 1)}" is not in the trie.`,
            scene: trie.scene(path, { [id]: 'error' }), logic: 'A missing edge proves that nothing stored starts with this prefix.', logicTone: 'warn',
            javaLines: [26, 27], pyLines: [22, 23, 24], algoStep: 3,
            tag: 'DEAD END —', alert: `No '${ch}' edge below "${w.slice(0, k)}": nothing stored starts with "${w.slice(0, k + 1)}"`,
            note: `node = next['${ch}'] = null → return null`,
          });
        } else {
          id = nid;
          path.push(id);
          at = `"${w.slice(0, k + 1)}"`;
          push({
            title: `Follow '${ch}'`, desc: `Child '${ch}' exists; now at "${w.slice(0, k + 1)}".`,
            scene: trie.scene(path, { [id]: 'active' }), logic: 'Keep consuming letters while edges exist.', logicTone: 'info',
            javaLines: [25, 26], pyLines: [22, 25], algoStep: 3,
            tag: 'WALK —', note: `ch='${ch}' (${k + 1}/${w.length}): node = next['${ch}'] ≠ null, now at "${w.slice(0, k + 1)}"`,
          });
        }
      }
    }

    if (op === 'insert') {
      trie.nodes[id].end = true;
      if (!stored.includes(w)) stored.push(w);
      out.push('null');
      push({
        title: `Mark "${w}" as a word`, desc: 'Set the end-of-word flag on the last node (double ring). insert returns nothing.',
        scene: trie.scene(path, { [id]: 'found' }), logic: 'Without the flag, "app" would be indistinguishable from the prefix of "apple".', logicTone: 'success',
        javaLines: [11], pyLines: [11], algoStep: 2,
        tag: 'FLAG —', note: `node("${w}").end = true · stored: ${stored.length} word${stored.length === 1 ? '' : 's'}`,
      });
    } else if (failed) {
      out.push('false');
      push({
        title: 'Return false', desc: op === 'search' ? `"${w}" is not stored.` : `No stored word starts with "${w}".`,
        scene: trie.scene(path, { [id]: 'error' }), logic: 'Failure at any letter settles both search and startsWith.', logicTone: 'warn',
        javaLines: op === 'search' ? [16] : [20], pyLines: op === 'search' ? [15] : [18], algoStep: 4,
        tag: 'RETURN —', alert: op === 'search' ? `"${w}" is not in the trie` : `no stored word starts with "${w}"`,
        note: op === 'search' ? 'node == null → false' : 'find(prefix) == null → false',
      });
    } else {
      const ok = op === 'startsWith' ? true : trie.nodes[id].end;
      out.push(String(ok));
      push({
        title: `Return ${ok}`,
        desc: op === 'startsWith' ? `Every letter of "${w}" had a node, so it is a prefix of a stored word.` : ok ? `"${w}" ends on an end-of-word node: stored.` : `"${w}" is only a prefix of longer words — its last node is not an end-of-word.`,
        scene: trie.scene(path, { [id]: ok ? 'found' : 'compare' }), logic: op === 'startsWith' ? 'startsWith only needs the path to exist.' : 'search needs the path AND the end-of-word flag.', logicTone: ok ? 'success' : 'warn',
        javaLines: op === 'search' ? [16] : [20], pyLines: op === 'search' ? [15] : [18], algoStep: 4,
        tag: 'RETURN —',
        alert: op === 'search' && !ok ? `Path "${w}" exists but its last node has no end flag: only a prefix` : undefined,
        note: op === 'search' ? `node != null && node.end = ${ok}` : 'find(prefix) != null → true',
      });
    }
  }

  opLabel = '—'; word = '—'; at = 'root';
  push({
    title: 'Done', desc: `All ${ops.length} operations processed. Outputs in order: [${out.join(', ')}].`,
    scene: trie.scene(), logic: 'Each operation walked at most one node per letter, so the cost never depended on how many words are stored.', logicTone: 'success',
    javaLines: [0], pyLines: [0], algoStep: 5, tag: '✅ Done!', note: `${stored.length} distinct word${stored.length === 1 ? '' : 's'} stored`,
  });
  steps[steps.length - 1].result = { title: `[${out.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

const P = (s: string): In => ({
  ops: s.split(' ').map((t) => { const [a, b] = t.split(':'); return { op: NAMES[a.toLowerCase()], word: b }; }),
});

export const implementTrie: ProblemDef<In> = {
  slug: '208-implement-trie',
  id: '208', title: 'Implement Trie', difficulty: 'Medium', category: 'Trie', tag: 'trie design',
  statement: 'Implement a trie (prefix tree) with insert(word), search(word) which tells whether the exact word was inserted, and startsWith(prefix) which tells whether any inserted word begins with the prefix.',
  constraints: 'Words use lowercase letters (animation input: up to 8 operations, words of at most 6 letters, at most 5 distinct inserted words; write operations as op:word)',
  examples: [
    { label: 'insert:apple search:apple search:app startsWith:app insert:app search:app', input: P('insert:apple search:apple search:app startsWith:app insert:app search:app'), output: '[null, true, false, true, null, true]' },
    { label: 'insert:cat insert:car insert:dog startsWith:ca search:cab', input: P('insert:cat insert:car insert:dog startsWith:ca search:cab'), output: '[null, null, null, true, false]' },
    { label: 'insert:to insert:tea insert:ted search:te startsWith:te', input: P('insert:to insert:tea insert:ted search:te startsWith:te'), output: '[null, null, null, false, true]' },
  ],
  inputPlaceholder: 'e.g. insert:apple search:apple search:app startsWith:app',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Created / found', state: 'found' }, { label: 'Prefix only', state: 'compare' }, { label: 'Missing letter', state: 'error' }],
  emphasis: ['trie', 'prefix tree', 'insert', 'search', 'startsWith'],
  varLabels: ['op', 'word', 'at', 'output'],
  phases: [
    { icon: '🌱', label: 'Phase 1: Empty root', tone: 'blue' },
    { icon: '➕', label: 'INSERT: follow or create', tone: 'green' },
    { icon: '🔔', label: 'INSERT: set end flag', tone: 'gold' },
    { icon: '🔍', label: 'WALK: follow letters', tone: 'cyan' },
    { icon: '↩️', label: 'RETURN: flag or path', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'One node per letter, one flag per word',
    text: 'Each node maps letters to child nodes and carries an end-of-word flag. insert walks the word, creating missing nodes, then sets the flag. search and startsWith walk the same way; a missing child means false. search additionally needs the flag on the last node.',
  },
  java: [
    'class Trie {',
    '    private final Trie[] next = new Trie[26];',
    '    private boolean end;',
    '',
    '    public void insert(String word) {',
    '        Trie node = this;',
    '        for (char ch : word.toCharArray()) {',
    '            int i = ch - \'a\';',
    '            if (node.next[i] == null) node.next[i] = new Trie();',
    '            node = node.next[i];',
    '        }',
    '        node.end = true;',
    '    }',
    '',
    '    public boolean search(String word) {',
    '        Trie node = find(word);',
    '        return node != null && node.end;',
    '    }',
    '',
    '    public boolean startsWith(String prefix) {',
    '        return find(prefix) != null;',
    '    }',
    '',
    '    private Trie find(String s) {',
    '        Trie node = this;',
    '        for (char ch : s.toCharArray()) {',
    '            node = node.next[ch - \'a\'];',
    '            if (node == null) return null;',
    '        }',
    '        return node;',
    '    }',
    '}',
  ],
  python: [
    'class Trie:',
    '    def __init__(self):',
    '        self.next = {}',
    '        self.end = False',
    '',
    '    def insert(self, word):',
    '        node = self',
    '        for ch in word:',
    '            if ch not in node.next:',
    '                node.next[ch] = Trie()',
    '            node = node.next[ch]',
    '        node.end = True',
    '',
    '    def search(self, word):',
    '        node = self._find(word)',
    '        return node is not None and node.end',
    '',
    '    def startsWith(self, prefix):',
    '        return self._find(prefix) is not None',
    '',
    '    def _find(self, s):',
    '        node = self',
    '        for ch in s:',
    '            if ch not in node.next:',
    '                return None',
    '            node = node.next[ch]',
    '        return node',
  ],
  algorithm: [
    'Create a root node with no children',
    'insert: for each letter, follow the child or create it',
    'insert: set the end-of-word flag on the last node',
    'search / startsWith: follow the letters; a missing child means false',
    'search returns the last node’s end flag; startsWith returns true if the path exists',
    'Done: every operation answered in O(L)',
  ],
  complexity: [{ label: 'Time', value: 'O(L) per operation' }, { label: 'Space', value: 'O(total letters)' }],
  why: 'A node stands for exactly one prefix: the letters on the path from the root. A word was inserted precisely when its path exists and the last node carries the end flag, and a prefix is present precisely when its path exists. Every operation touches at most one node per letter, so it costs O(L) regardless of how many words are stored.',
};
