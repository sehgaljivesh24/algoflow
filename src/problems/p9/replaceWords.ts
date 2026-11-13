import type { Aux, ProblemDef, Step } from '../../engine/types.ts';
import { TrieModel } from '../trieKit.ts';
import { recorder } from '../stepKit.ts';

interface In { roots: string[]; words: string[] }

const WORD = /^[a-z]+$/;

function parse(raw: string): In {
  const [a, b, ...rest] = raw.split('|');
  if (b === undefined || rest.length) throw new Error('Write the roots, a bar, then the sentence: cat bat rat | the cattle was rattled by the battery');
  const roots = a.split(/[\s,]+/).filter(Boolean);
  const words = b.split(/[\s,]+/).filter(Boolean);
  if (!roots.length || !words.length) throw new Error('Give at least one root and one sentence word, separated by a bar |');
  if (roots.length > 5) throw new Error('Use at most 5 roots');
  if (words.length > 6) throw new Error('Use at most 6 words in the sentence');
  for (const w of [...roots, ...words]) {
    if (!WORD.test(w)) throw new Error(`"${w}" is not valid: use lowercase letters only`);
    if (w.length > 8) throw new Error(`"${w}" is too long: keep every word to 8 letters or fewer`);
  }
  return { roots: [...new Set(roots)], words };
}

function build({ roots, words }: In): Step[] {
  const trie = new TrieModel();
  const steps: Step[] = [];
  const out: string[] = [];
  const stored: string[] = [];
  let scene = trie.scene();
  let word = '—';
  let at = 'root';
  const aux = (): Aux[] => [
    { title: 'roots stored', kind: 'list', items: [...stored] },
    { title: 'sentence out', kind: 'list', items: [...out] },
  ];
  const say = recorder(steps, () => ({ scene, aux: aux(), vars: { word, at, 'sentence out': out.join(' ') || '—' } }));

  say({ title: 'Start', desc: `An empty trie. First every root goes in (${roots.join(', ')}); then each sentence word walks down looking for the shortest root that is a prefix of it.`, logic: 'Roots share prefixes in a trie, so one walk per word replaces a scan over every root.', java: [6], py: [1], algo: 0, tag: 'START —', note: `root = new Trie(); ${roots.length} roots, ${words.length} words to rewrite` });

  for (const r of roots) {
    trie.insert(r);
    stored.push(r);
    let id = 0;
    const path = [0];
    for (const ch of r) { id = trie.child(id, ch)!; path.push(id); }
    word = r;
    at = `"${r}"`;
    scene = trie.scene(path, { [id]: 'found' });
    say({ title: `Insert root "${r}"`, desc: 'Walk down creating letters as needed; the last node gets the double ring, which means "a root ends here".', logic: 'The end-of-word ring is what lets a lookup stop early, at the shortest root.', tone: 'info', java: [7, 8, 9, 10, 11, 13], py: [2, 3, 4, 5, 6], algo: 1, tag: 'INSERT ROOT —', note: `r = "${r}": ${r.length} node${r.length === 1 ? '' : 's'} on its path, t.end = true (${stored.length} root${stored.length === 1 ? '' : 's'} stored)` });
  }

  for (const w of words) {
    word = w;
    at = 'root';
    scene = trie.scene([0], { 0: 'active' });
    say({ title: `Look up "${w}"`, desc: `Follow the letters of "${w}" from the root. Stop at the first node that ends a root, or when a letter has no child.`, logic: 'The first end-of-word on the way down is the shortest root, so nothing deeper can beat it.', java: [16, 17, 18], py: [8, 9], algo: 2, tag: 'LOOKUP —', note: `w = "${w}", keep = "${w}", t = root` });
    let id = 0;
    const path = [0];
    let kept = w;
    let finished = true;
    for (let k = 0; k < w.length; k++) {
      const nid = trie.child(id, w[k]);
      if (nid === null) {
        scene = trie.scene(path, { [id]: 'error' });
        say({ title: `No '${w[k]}' edge: keep "${w}"`, desc: `"${w.slice(0, k)}" has no child '${w[k]}', so no root is a prefix of "${w}". The word stays as it is.`, logic: 'A missing edge proves that no stored root starts with this prefix.', tone: 'warn', java: [20, 21], py: [11, 12], algo: 3, tag: 'NO ROOT —', alert: `No '${w[k]}' edge after "${w.slice(0, k)}": no root is a prefix of "${w}"`, note: `t = t.next['${w[k]}'] == null → break, keep = "${w}"` });
        finished = false;
        break;
      }
      id = nid;
      path.push(id);
      at = `"${w.slice(0, k + 1)}"`;
      if (trie.nodes[id].end) {
        kept = w.slice(0, k + 1);
        scene = trie.scene(path, { [id]: 'found' });
        say({ title: `Root "${kept}" found`, desc: `Node "${kept}" ends a root, so "${w}" is replaced by "${kept}" right away.`, logic: 'Stopping at the first ring guarantees the shortest root.', tone: 'success', java: [20, 22], py: [13, 14, 15, 16], algo: 3, tag: 'ROOT FOUND —', note: `t.end at i=${k} → keep = "${w}".substring(0, ${k + 1}) = "${kept}"` });
        finished = false;
        break;
      }
      scene = trie.scene(path, { [id]: 'active' });
      say({ title: `Follow '${w[k]}'`, desc: `Child '${w[k]}' exists, but "${w.slice(0, k + 1)}" is not a complete root. Keep going.`, logic: 'Only a double-ringed node can end the search.', java: [19, 20], py: [10, 13], algo: 2, tag: 'WALK —', note: `i=${k}: '${w[k]}' exists, t.end = false → keep walking (at "${w.slice(0, k + 1)}")` });
    }
    if (finished) {
      scene = trie.scene(path, { [id]: 'compare' });
      say({ title: `Letters used up: keep "${w}"`, desc: `"${w}" ended before any ringed node, so no root is a prefix of it and it stays unchanged.`, logic: 'A root has to be a prefix, so it cannot reach past the end of the word.', tone: 'warn', java: [23], py: [17], algo: 3, tag: 'NO ROOT —', alert: `"${w}" ended without a ringed node: it stays unchanged`, note: `loop over i ends (i = ${w.length}), keep = "${w}"` });
    }
    out.push(kept);
    scene = trie.scene(path, kept !== w ? { [id]: 'found' } : {});
    say({ title: `Output "${kept}"`, desc: kept !== w ? `"${w}" becomes "${kept}".` : `"${w}" is copied unchanged.`, logic: 'Each word is handled independently, in order.', java: [24, 25], py: [17], algo: 4, tag: 'OUTPUT —', note: `out.append("${kept}") → sentence = "${out.join(' ')}"` });
  }
  word = '—';
  at = 'root';
  scene = trie.scene();
  say({ title: 'Done', desc: `All ${words.length} words rewritten: "${out.join(' ')}".`, logic: 'One walk per word, bounded by its length, replaced a scan over every root.', tone: 'success', java: [26], py: [18], algo: 5, tag: '✅ Done!', note: `return "${out.join(' ')}"` });
  steps[steps.length - 1].result = { title: `"${out.join(' ')}"`, text: 'The rewritten sentence' };
  return steps;
}

export const replaceWords: ProblemDef<In> = {
  slug: '648-replace-words',
  id: '648', title: 'Replace Words', difficulty: 'Medium', category: 'Trie', tag: 'trie prefix lookup',
  statement: 'You are given a dictionary of root words and a sentence. Replace every word of the sentence that has a root as a prefix with that root; if several roots fit, use the shortest. Return the new sentence.',
  constraints: 'Lowercase letters only (animation input: at most 5 roots and 6 sentence words, each up to 8 letters, written as roots | sentence)',
  examples: [
    { label: 'cat bat rat | the cattle was rattled by the battery', input: { roots: ['cat', 'bat', 'rat'], words: 'the cattle was rattled by the battery'.split(' ') }, output: '"the cat was rat by the bat"' },
    { label: 'a b c | aadsfasf absbs bbab cadsfafs', input: { roots: ['a', 'b', 'c'], words: ['aadsfasf', 'absbs', 'bbab', 'cadsfafs'] }, output: '"a a b c"' },
    { label: 'ca cat | cattle car dog', input: { roots: ['ca', 'cat'], words: ['cattle', 'car', 'dog'] }, output: '"ca ca dog"' },
  ],
  inputPlaceholder: 'e.g. cat bat rat | the cattle was rattled by the battery',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node being followed', state: 'active' }, { label: 'Root found / inserted', state: 'found' }, { label: 'Whole word, no root', state: 'compare' }, { label: 'Missing letter', state: 'error' }],
  emphasis: ['root', 'shortest', 'prefix', 'sentence'],
  varLabels: ['word', 'at', 'sentence out'],
  phases: [
    { icon: '🌱', label: 'Phase 1: Empty trie', tone: 'blue' },
    { icon: '➕', label: 'Phase 2: Insert roots', tone: 'green' },
    { icon: '🔍', label: 'Phase 3: Walk a word', tone: 'cyan' },
    { icon: '🛑', label: 'Phase 4: Stop (ring / dead end)', tone: 'gold' },
    { icon: '📝', label: 'Phase 5: Append output', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Insert the roots, stop at the first ring',
    text: 'Put every root into a trie and mark where each ends. For each sentence word, walk its letters from the root: the first end-of-word node you hit spells the shortest root, so replace the word by that prefix. A missing child means no root fits and the word stays.',
  },
  vizTitle: 'Trie of roots',
  java: [
    'class Trie {',
    '    Trie[] next = new Trie[26];',
    '    boolean end;',
    '}',
    '',
    'static String replaceWords(List<String> dict, String sentence) {',
    '    Trie root = new Trie();',
    '    for (String r : dict) {                       // insert every root',
    '        Trie t = root;',
    '        for (char c : r.toCharArray()) {',
    '            if (t.next[c - \'a\'] == null) t.next[c - \'a\'] = new Trie();',
    '            t = t.next[c - \'a\'];',
    '        }',
    '        t.end = true;',
    '    }',
    '    StringBuilder out = new StringBuilder();',
    '    for (String w : sentence.split(" ")) {',
    '        Trie t = root;',
    '        String keep = w;',
    '        for (int i = 0; i < w.length(); i++) {',
    '            t = t.next[w.charAt(i) - \'a\'];',
    '            if (t == null) break;                 // no root fits',
    '            if (t.end) { keep = w.substring(0, i + 1); break; }',
    '        }',
    '        if (out.length() > 0) out.append(\' \');',
    '        out.append(keep);',
    '    }',
    '    return out.toString();',
    '}',
  ],
  python: [
    'def replace_words(dictionary, sentence):',
    '    root = {}',
    '    for r in dictionary:                      # insert every root',
    '        node = root',
    '        for ch in r:',
    '            node = node.setdefault(ch, {})',
    '        node["$"] = True                      # a root ends here',
    '    out = []',
    '    for w in sentence.split():',
    '        node, keep = root, w',
    '        for i, ch in enumerate(w):',
    '            if ch not in node:',
    '                break                         # no root fits',
    '            node = node[ch]',
    '            if "$" in node:',
    '                keep = w[:i + 1]',
    '                break',
    '        out.append(keep)',
    '    return " ".join(out)',
  ],
  algorithm: [
    'Start with an empty trie',
    'Insert every root, marking the node where it ends',
    'For each word walk its letters down from the root',
    'Stop at the first end-of-word (use that prefix) or at a missing child (keep the word)',
    'Append the result and move to the next word',
    'Done: join the words into the new sentence',
  ],
  complexity: [{ label: 'Time', value: 'O(total letters)' }, { label: 'Space', value: 'O(letters in roots)' }],
  why: 'Along a root-to-node path the nodes are exactly the prefixes of the word, listed from shortest to longest. The first double-ringed node on that path is therefore the shortest prefix that is a root, and no later node can be shorter. If the path breaks or finishes without a ring, no root is a prefix. Every word is scanned once, so the cost is linear in the input length.',
};
