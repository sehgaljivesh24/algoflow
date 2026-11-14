import type { Aux, Cell, ProblemDef, Scene, Step } from '../../engine/types.ts';
import { Aho, parseWordsAndText } from './kitD.ts';

interface In { words: string[]; text: string }

const parse = (raw: string): In => parseWordsAndText(raw, { maxWords: 6, maxWordLen: 5, maxText: 12, example: 'he she his hers | ushers' });

/** Every occurrence as "word@start", ordered by end position (longest word first when several end together). */
export function findAll(words: string[], text: string): string[] {
  const out: string[] = [];
  for (let e = 0; e < text.length; e++) {
    const hit = words.filter((w) => e - w.length + 1 >= 0 && text.slice(e - w.length + 1, e + 1) === w).sort((x, y) => y.length - x.length);
    for (const w of hit) out.push(`${w}@${e - w.length + 1}`);
  }
  return out;
}

function build({ words, text }: In): Step[] {
  const a = new Aho();
  words.forEach((w) => a.insert(w));
  a.buildAll();
  const all = a.order();
  const labels: Record<number, string> = {};
  for (const v of all) {
    const o = a.outputs(v);
    if (o.length) labels[v] = o.join(',');
  }
  const steps: Step[] = [];
  const hits: string[] = [];
  let state = 0;
  let idx = -1;
  let falls = 0;
  let matchSpan: [number, number] | null = null;

  const textScene = (): Scene => ({
    kind: 'array',
    cells: [...text].map((ch, i): Cell => ({ key: i, value: ch, state: matchSpan && i >= matchSpan[0] && i <= matchSpan[1] ? 'found' : i === idx ? 'active' : undefined })),
    pointers: idx >= 0 ? [{ id: 'i', label: 'i', index: idx, tone: 'blue' }] : [],
  });
  const scene = (trie: ReturnType<Aho['scene']>): Scene => ({ kind: 'split', stack: true, parts: [trie, textScene()] });
  const aux = (): Aux[] => [{ title: 'matches found (word@start)', kind: 'list', items: [...hits] }];
  const push = (x: Omit<Step, 'vars' | 'aux'>) =>
    steps.push({ ...x, aux: aux(), vars: { char: idx >= 0 ? `'${text[idx]}'` : '—', state: state === 0 ? 'root (0)' : `${state} "${a.str(state)}"`, fallbacks: falls, matches: hits.length } });

  push({
    title: 'The automaton', desc: `Trie of ${words.join(', ')} with failure links (dashed; links into the root are not drawn). Chips list the words that end at each state, including shorter ones reached through failure links. Now we read "${text}" one letter at a time.`,
    scene: scene(a.scene({ done: all, labels, states: { 0: 'active' } })), logic: 'We keep exactly one current state: the longest suffix of the text read so far that is a prefix of some word.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
    tag: 'START —', note: `ac = AhoCorasick(${words.length} words) → ${a.trie.nodes.length} states, state = 0, text length ${text.length}`,
  });

  for (let i = 0; i < text.length; i++) {
    idx = i;
    matchSpan = null;
    falls = 0;
    const ch = text[i];
    const { hops, next } = a.step(state, ch);
    let cur = state;
    let first = true;
    for (const t of hops) {
      falls++;
      push({
        title: `'${ch}': no edge from ${cur === 0 ? 'root' : `state ${cur}`}, follow fail`,
        desc: `State ${cur} ("${a.str(cur)}") has no '${ch}' edge${first ? ` (reading text[${i}])` : ''}. Its failure link leads to ${t === 0 ? 'the root' : `state ${t} ("${a.str(t)}")`}, the longest shorter suffix that is still a prefix of a word.`,
        scene: scene(a.scene({ done: all, labels, hot: { from: cur, to: t, state: 'active' }, states: { [cur]: 'compare', [t]: 'active' } })),
        logic: 'A failed extension never restarts the scan: it drops the leading letters of the current suffix as little as needed.', logicTone: 'warn',
        javaLines: [6, 4, 5], pyLines: [4, 3, 5], algoStep: 1,
        tag: 'FALL BACK —', alert: `No '${ch}' edge from state ${cur}: follow its failure link instead of restarting`,
        note: `i=${i}, c='${ch}': next[${cur}]['${ch}'] == 0 → state = fail[${cur}] = ${t} (fallback #${falls})`,
      });
      first = false;
      cur = t;
    }
    state = next;
    const outs = a.outputs(state);
    if (outs.length) {
      const ends = outs.map((w) => `${w}@${i - w.length + 1}`);
      hits.push(...ends);
      matchSpan = [i - outs[0].length + 1, i];
      push({
        title: `Match: ${outs.map((w) => `"${w}"`).join(', ')}`,
        desc: `'${ch}' moves us to state ${state} ("${a.str(state)}"). Walking its failure chain reports ${outs.length} word${outs.length === 1 ? '' : 's'}: ${ends.join(', ')}.`,
        scene: scene(a.scene({ done: all, labels, states: { [state]: 'found' } })),
        logic: 'Every word that ends at this position is a suffix of the current state\'s string, so it sits on its failure chain.', logicTone: 'success',
        javaLines: [7, 8, 9, 10, 11], pyLines: [6, 7, 8, 9, 10, 11, 12], algoStep: 3,
        tag: 'MATCH —', note: `i=${i}: state = ${state} "${a.str(state)}", chain reports ${ends.join(', ')} (${hits.length} match${hits.length === 1 ? '' : 'es'} so far)`,
      });
    } else {
      push({
        title: next === 0 ? `'${ch}': stay at the root` : `'${ch}': go to state ${state} "${a.str(state)}"`,
        desc: next === 0 ? `Not even the root has a '${ch}' edge, so no word can be in progress after this letter.` : `Take the '${ch}' edge to state ${state}. No word ends here or on its failure chain.`,
        scene: scene(a.scene({ done: all, labels, states: { [state]: 'active' } })),
        logic: 'The state is always the longest suffix of the text so far that is a word prefix.', logicTone: 'info',
        javaLines: [7], pyLines: [6], algoStep: 2,
        tag: next === 0 ? 'ROOT —' : 'ADVANCE —',
        note: next === 0 ? `i=${i}, c='${ch}': no edge at root → state stays 0${falls ? ` after ${falls} fallback${falls === 1 ? '' : 's'}` : ''}` : `i=${i}, c='${ch}': state = next[…]['${ch}'] = ${state} "${a.str(state)}", no word ends here`,
      });
    }
  }

  idx = -1;
  matchSpan = null;
  push({
    title: 'Text finished', desc: hits.length ? `${hits.length} occurrence${hits.length === 1 ? '' : 's'}: ${hits.join(', ')}.` : 'No keyword occurs in the text.',
    scene: scene(a.scene({ done: all, labels })), logic: 'One left-to-right pass found every occurrence of every word.', logicTone: 'success',
    javaLines: [15], pyLines: [13], algoStep: 4,
    tag: '✅ Done!', note: `return hits = [${hits.join(', ')}]`,
    result: { title: `${hits.length} match${hits.length === 1 ? '' : 'es'}`, text: `[${hits.join(', ')}]` },
  });
  return steps;
}

export const multiKeywordSearch: ProblemDef<In> = {
  slug: 'cp-multi-keyword-search-aho-corasick',
  id: 'CP', title: 'Multi-Keyword Search (Aho-Corasick)', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'Aho-Corasick search',
  statement: 'Given a list of keywords and a text, find every occurrence of every keyword (overlaps included) in a single pass. Report each match as word@start, in order of where it ends.',
  constraints: 'Lowercase letters (animation input: up to 6 different words of up to 5 letters, text up to 12 letters; write "words | text")',
  examples: [
    { label: 'he she his hers | ushers', input: { words: ['he', 'she', 'his', 'hers'], text: 'ushers' }, output: '3 matches: [she@1, he@2, hers@2]' },
    { label: 'a ab bc | abcab', input: { words: ['a', 'ab', 'bc'], text: 'abcab' }, output: '5 matches: [a@0, ab@0, bc@1, a@3, ab@3]' },
    { label: 'aa aaa | aaaa', input: { words: ['aa', 'aaa'], text: 'aaaa' }, output: '5 matches: [aa@0, aaa@0, aa@1, aaa@1, aa@2]' },
  ],
  inputPlaceholder: 'e.g. he she his hers | ushers',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Automaton and text',
  legend: [{ label: 'Current state / letter', state: 'active' }, { label: 'State before falling back', state: 'compare' }, { label: 'Match', state: 'found' }],
  emphasis: ['every occurrence', 'overlaps', 'single pass', 'word@start'],
  varLabels: ['char', 'state', 'fallbacks', 'matches'],
  phases: [
    { icon: '🏗️', label: 'Phase 1: Build automaton', tone: 'blue' },
    { icon: '↩️', label: 'FALL BACK along fail', tone: 'orange' },
    { icon: '➡️', label: 'ADVANCE on the letter', tone: 'cyan' },
    { icon: '🎯', label: 'MATCH: report chain', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Walk the automaton; fall back along failure links',
    text: 'Build the trie with failure links once. Then read the text left to right while keeping one state. For each letter, follow failure links until a state has an edge for it (or you are at the root), step along that edge, and report every word found on the current state\'s failure chain. The text is read once; the automaton does the backtracking for you.',
  },
  java: [
    'static List<String> findAll(String[] words, String text) {',
    '    AhoCorasick ac = new AhoCorasick(words);          // trie + failure links',
    '    List<String> hits = new ArrayList<>();',
    '    int state = 0;',
    '    for (int i = 0; i < text.length(); i++) {',
    '        int c = text.charAt(i) - \'a\';',
    '        while (state != 0 && ac.next[state][c] == 0) state = ac.fail[state];   // fall back',
    '        if (ac.next[state][c] != 0) state = ac.next[state][c];',
    '        for (int s = state; s != 0; s = ac.fail[s]) {          // own word, then shorter ones',
    '            if (ac.wordLen[s] > 0) {',
    '                int start = i - ac.wordLen[s] + 1;',
    '                hits.add(text.substring(start, i + 1) + "@" + start);',
    '            }',
    '        }',
    '    }',
    '    return hits;',
    '}',
    '',
    'static class AhoCorasick {                              // trie + failure links (see Aho-Corasick: build failure links)',
    '    final int[][] next = new int[64][26];',
    '    final int[] fail = new int[64], wordLen = new int[64];',
    '    int states = 1;',
    '',
    '    AhoCorasick(String[] words) {',
    '        for (String w : words) {',
    '            int cur = 0;',
    '            for (char ch : w.toCharArray()) {',
    '                int c = ch - \'a\';',
    '                if (next[cur][c] == 0) next[cur][c] = states++;',
    '                cur = next[cur][c];',
    '            }',
    '            wordLen[cur] = w.length();',
    '        }',
    '        Deque<Integer> queue = new ArrayDeque<>();',
    '        for (int c = 0; c < 26; c++) if (next[0][c] != 0) queue.add(next[0][c]);',
    '        while (!queue.isEmpty()) {',
    '            int u = queue.poll();',
    '            for (int c = 0; c < 26; c++) {',
    '                int v = next[u][c];',
    '                if (v == 0) continue;',
    '                int f = fail[u];',
    '                while (f != 0 && next[f][c] == 0) f = fail[f];',
    '                fail[v] = next[f][c];',
    '                queue.add(v);',
    '            }',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def find_all(words, text):',
    '    ac = AhoCorasick(words)               # trie + failure links',
    '    hits, state = [], 0',
    '    for i, ch in enumerate(text):',
    '        while state and ch not in ac.next[state]:',
    '            state = ac.fail[state]        # fall back',
    '        state = ac.next[state].get(ch, 0)',
    '        s = state',
    '        while s:                          # own word, then shorter ones',
    '            if ac.word_len[s]:',
    '                start = i - ac.word_len[s] + 1',
    '                hits.append(text[start:i + 1] + "@" + str(start))',
    '            s = ac.fail[s]',
    '    return hits',
    '',
    'class AhoCorasick:                        # trie + failure links (see Aho-Corasick: build failure links)',
    '    def __init__(self, words):',
    '        self.next, self.fail, self.word_len = [{}], [0], [0]',
    '        for w in words:',
    '            cur = 0',
    '            for ch in w:',
    '                if ch not in self.next[cur]:',
    '                    self.next.append({})',
    '                    self.fail.append(0)',
    '                    self.word_len.append(0)',
    '                    self.next[cur][ch] = len(self.next) - 1',
    '                cur = self.next[cur][ch]',
    '            self.word_len[cur] = len(w)',
    '        queue = deque(self.next[0].values())  # depth 1: fail = root',
    '        while queue:',
    '            u = queue.popleft()',
    '            for ch, v in self.next[u].items():',
    '                f = self.fail[u]',
    '                while f and ch not in self.next[f]:',
    '                    f = self.fail[f]          # climb the chain',
    '                self.fail[v] = self.next[f].get(ch, 0)',
    '                queue.append(v)',
  ],
  algorithm: [
    'Build the automaton (trie + failure links) for all keywords',
    'Read the next text letter; while the current state has no edge for it, jump to its failure link',
    'Take the edge if there is one (otherwise stay at the root)',
    'Walk the failure chain of the new state and report every word that ends here',
    'Done: after the last letter every occurrence has been reported',
  ],
  complexity: [{ label: 'Time', value: 'O(text + matches) after the build' }, { label: 'Space', value: 'O(total keyword letters)' }],
  why: 'The invariant is that the state names the longest suffix of the text read so far that is a prefix of some keyword. Any keyword ending at the current position is a suffix of that string, and the failure chain of a state lists exactly its suffixes that are keyword prefixes, from longest to shortest, so walking the chain reports all matches. Falling back never loses a candidate because a shorter suffix is tried before giving up, and total fallbacks are bounded by the total number of forward moves (each move raises the depth by one, each fallback lowers it).',
};
