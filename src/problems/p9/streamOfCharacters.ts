import type { Aux, Cell, ProblemDef, Scene, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { Aho, parseWordsAndText } from './kitD.ts';

interface In { words: string[]; text: string }

const parse = (raw: string): In =>
  parseWordsAndText(raw, { maxWords: 5, maxWordLen: 4, maxText: 12, example: 'cd f kl | abcdefghijkl', textName: 'stream of letters' });

/** query(letter) results: does some suffix of the stream so far equal a word? */
export function streamAnswers(words: string[], stream: string): boolean[] {
  return [...stream].map((_, i) => words.some((w) => w.length <= i + 1 && stream.slice(i + 1 - w.length, i + 1) === w));
}

function build({ words, text }: In): Step[] {
  const a = new Aho();
  const steps: Step[] = [];
  const answers: string[] = ['null'];
  let state = 0;
  let idx = -1;
  let falls = 0;
  let hitNow: string | boolean = '—';
  let all: number[] = [];
  let labels: Record<number, string> = {};

  const textScene = (): Scene => ({
    kind: 'array',
    cells: [...text].map((ch, i): Cell => ({ key: i, value: ch, state: i === idx ? 'active' : i > idx ? 'dim' : undefined })),
    pointers: idx >= 0 ? [{ id: 'q', label: 'query', index: idx, tone: 'blue' }] : [],
  });
  const scene = (trie: ReturnType<Aho['scene']>): Scene => ({ kind: 'split', stack: true, parts: [trie, textScene()] });
  const aux = (): Aux[] => [{ title: 'returned so far', kind: 'list', items: [...answers] }];
  const push = (x: Omit<Step, 'vars' | 'aux'>) =>
    steps.push({ ...x, aux: aux(), vars: { letter: idx >= 0 ? `'${text[idx]}'` : '—', state: state === 0 ? 'root (0)' : `${state} "${a.str(state)}"`, fallbacks: falls, 'hit[state]': String(hitNow) } });

  for (const w of words) a.insert(w);
  push({
    title: 'Constructor: insert the words', desc: `Insert ${words.join(', ')} into a trie. The last state of every word gets a double ring.`,
    scene: scene(a.scene()), logic: 'The checker must say, after every new letter, whether some word is a suffix of the stream so far.', logicTone: 'info',
    javaLines: [6, 7], pyLines: [4, 5], algoStep: 0,
    tag: 'CONSTRUCT —', note: `StreamChecker([${words.join(', ')}]): ${a.trie.nodes.length} states, state = 0`,
  });

  a.buildAll();
  all = a.order();
  labels = {};
  for (const v of all) if (a.outputs(v).length) labels[v] = '✓';
  push({
    title: 'Add failure links and hit flags', desc: 'BFS fills in the failure links (dashed). A state is a hit if a word ends there or on its failure chain: hit[v] = ends(v) or hit[fail[v]], marked ✓.',
    scene: scene(a.scene({ done: all, labels })), logic: 'Inheriting the flag along failure links turns "some suffix is a word" into a single lookup per query.', logicTone: 'info',
    javaLines: [8], pyLines: [6], algoStep: 1,
    tag: 'LINKS —', note: `build(): ${a.trie.nodes.length} states linked, ${Object.keys(labels).length} state${Object.keys(labels).length === 1 ? '' : 's'} marked hit ✓`,
  });

  for (let i = 0; i < text.length; i++) {
    idx = i;
    falls = 0;
    hitNow = '—';
    const ch = text[i];
    const { hops, next } = a.step(state, ch);
    let cur = state;
    for (const t of hops) {
      falls++;
      push({
        title: `query('${ch}'): no edge, follow fail`,
        desc: `State ${cur} ("${a.str(cur)}") has no '${ch}' edge, so move along its failure link to ${t === 0 ? 'the root' : `state ${t} ("${a.str(t)}")`}.`,
        scene: scene(a.scene({ done: all, labels, hot: { from: cur, to: t, state: 'active' }, states: { [cur]: 'compare', [t]: 'active' } })),
        logic: 'The longest suffix that still fits is found by shortening the current one, never by rereading the stream.', logicTone: 'warn',
        javaLines: [11, 12, 13], pyLines: [8, 9, 10], algoStep: 2,
        tag: 'FALL BACK —', alert: `No '${ch}' edge from state ${cur}: shorten the suffix via its failure link`,
        note: `query('${ch}'): next[${cur}]['${ch}'] == 0 → state = fail[${cur}] = ${t} (fallback #${falls})`,
      });
      cur = t;
    }
    state = next;
    const ok = a.outputs(state).length > 0;
    hitNow = ok;
    answers.push(String(ok));
    push({
      title: `query('${ch}') returns ${ok}`,
      desc: next === 0 ? `No edge for '${ch}' even at the root: the state is the root, which is never a hit, so false.` : `Take the '${ch}' edge to state ${state} ("${a.str(state)}"). ${ok ? `It is marked ✓: ${a.outputs(state).map((w) => `"${w}"`).join(', ')} ends the stream here.` : 'No word ends here or on its failure chain.'}`,
      scene: scene(a.scene({ done: all, labels, states: { [state]: ok ? 'found' : 'active' } })),
      logic: ok ? 'A hit flag means some word is a suffix of everything read so far.' : 'No flag, so no suffix of the stream is a word.', logicTone: ok ? 'success' : 'info',
      javaLines: [14, 15], pyLines: [11, 12], algoStep: 3,
      tag: ok ? 'HIT —' : 'QUERY —',
      note: `query('${ch}'): state = ${state} "${a.str(state)}", return hit[${state}] = ${ok}`,
    });
  }

  idx = -1;
  hitNow = '—';
  push({
    title: 'Stream finished', desc: `The queries returned [${answers.join(', ')}].`,
    scene: scene(a.scene({ done: all, labels })), logic: 'Each query cost O(1) amortised: fallbacks are paid for by earlier forward moves.', logicTone: 'success',
    javaLines: [15], pyLines: [12], algoStep: 4,
    tag: '✅ Done!', note: `${plural(text.length, 'query', 'queries')} answered, ${answers.filter((x) => x === 'true').length} true`,
    result: { title: `[${answers.join(', ')}]`, text: 'Return values of the constructor and the queries' },
  });
  return steps;
}

export const streamOfCharacters: ProblemDef<In> = {
  slug: '1032-stream-of-characters',
  id: '1032', title: 'Stream of Characters', difficulty: 'Hard', category: 'Trie', tag: 'Aho-Corasick automaton',
  statement: 'Design StreamChecker(words) and query(letter). Each query appends a letter to a stream and returns true if some suffix of the stream so far equals one of the words. The animation feeds the letters of one stream in order and shows the value returned by each call.',
  constraints: 'Lowercase letters (animation input: up to 5 different words of up to 4 letters, stream up to 12 letters; write "words | stream")',
  examples: [
    { label: 'cd f kl | abcdefghijkl', input: { words: ['cd', 'f', 'kl'], text: 'abcdefghijkl' }, output: '[null, false, false, false, true, false, true, false, false, false, false, false, true]' },
    { label: 'ab abc | xabcab', input: { words: ['ab', 'abc'], text: 'xabcab' }, output: '[null, false, false, true, true, false, true]' },
    { label: 'aab b | aaabab', input: { words: ['aab', 'b'], text: 'aaabab' }, output: '[null, false, false, false, true, false, true]' },
  ],
  inputPlaceholder: 'e.g. cd f kl | abcdefghijkl',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Automaton and stream',
  legend: [{ label: 'Current state / letter', state: 'active' }, { label: 'State before falling back', state: 'compare' }, { label: 'Hit: a word ends here', state: 'found' }],
  emphasis: ['StreamChecker', 'query(letter)', 'some suffix', 'stream'],
  varLabels: ['letter', 'state', 'fallbacks', 'hit[state]'],
  phases: [
    { icon: '🌳', label: 'Phase 1: Insert words', tone: 'blue' },
    { icon: '🔗', label: 'Phase 2: Links + hit flags', tone: 'green' },
    { icon: '↩️', label: 'FALL BACK on a mismatch', tone: 'orange' },
    { icon: '🎯', label: 'ANSWER: read hit[state]', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Aho-Corasick: one state, one flag lookup per letter',
    text: 'The usual shortcut is a trie of the reversed words checked against the last few letters. Here we use the forward Aho-Corasick automaton instead: build a trie, add failure links, and mark every state whose string has a word as a suffix (a word ends there or on its failure chain). The checker then stores one current state; query moves it, falling back along failure links when needed, and returns the flag of the new state.',
  },
  java: [
    'class StreamChecker {',
    '    private final int[][] next = new int[64][26];',
    '    private final int[] fail = new int[64];',
    '    private final boolean[] hit = new boolean[64];     // some word is a suffix of this state\'s text',
    '    private int states = 1, state = 0;',
    '',
    '    public StreamChecker(String[] words) {',
    '        for (String w : words) insert(w);      // trie, marks the last state of each word',
    '        build();                               // BFS failure links; hit[v] |= hit[fail[v]]',
    '    }',
    '',
    '    public boolean query(char letter) {',
    '        int c = letter - \'a\';',
    '        while (state != 0 && next[state][c] == 0) state = fail[state];',
    '        if (next[state][c] != 0) state = next[state][c];',
    '        return hit[state];',
    '    }',
    '',
    '    private void insert(String w) {',
    '        int v = 0;',
    '        for (char ch : w.toCharArray()) {',
    '            int c = ch - \'a\';',
    '            if (next[v][c] == 0) next[v][c] = states++;',
    '            v = next[v][c];',
    '        }',
    '        hit[v] = true;',
    '    }',
    '',
    '    private void build() {',
    '        Deque<Integer> queue = new ArrayDeque<>();',
    '        for (int c = 0; c < 26; c++) if (next[0][c] != 0) queue.add(next[0][c]);',
    '        while (!queue.isEmpty()) {',
    '            int u = queue.poll();',
    '            hit[u] |= hit[fail[u]];',
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
    'class StreamChecker:',
    '    def __init__(self, words):',
    '        self.next, self.fail, self.hit = [{}], [0], [False]',
    '        self.state = 0',
    '        for w in words:',
    '            self._insert(w)            # marks hit on the last state of each word',
    '        self._build()                  # BFS links; hit[v] |= hit[fail[v]]',
    '',
    '    def query(self, letter):',
    '        while self.state and letter not in self.next[self.state]:',
    '            self.state = self.fail[self.state]',
    '        self.state = self.next[self.state].get(letter, 0)',
    '        return self.hit[self.state]',
    '',
    '    def _insert(self, w):',
    '        v = 0',
    '        for ch in w:',
    '            if ch not in self.next[v]:',
    '                self.next.append({})',
    '                self.fail.append(0)',
    '                self.hit.append(False)',
    '                self.next[v][ch] = len(self.next) - 1',
    '            v = self.next[v][ch]',
    '        self.hit[v] = True',
    '',
    '    def _build(self):',
    '        queue = deque(self.next[0].values())',
    '        while queue:',
    '            u = queue.popleft()',
    '            self.hit[u] |= self.hit[self.fail[u]]',
    '            for ch, v in self.next[u].items():',
    '                f = self.fail[u]',
    '                while f and ch not in self.next[f]:',
    '                    f = self.fail[f]',
    '                self.fail[v] = self.next[f].get(ch, 0)',
    '                queue.append(v)',
  ],
  algorithm: [
    'Insert every word into a trie',
    'Add failure links by BFS and propagate the hit flag: hit[v] |= hit[fail[v]]',
    'On query(letter): while the state has no edge for it, jump to its failure link',
    'Take the edge if it exists, then return hit[state]',
    'Keep the state between calls: the stream is never reread',
  ],
  complexity: [{ label: 'Time', value: 'O(total letters) build, O(1) amortised per query' }, { label: 'Space', value: 'O(total letters)' }],
  why: 'The current state is always the longest suffix of the stream that is a prefix of some word. A word is a suffix of the stream exactly when it is a suffix of that string, i.e. it lies on the state\'s failure chain (or ends at the state itself), which is what the inherited hit flag records. So one flag read answers the question, and a query never needs to look at older letters again.',
};
