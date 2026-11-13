import type { Aux, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { Aho, fmtArr, parseWords } from './kitD.ts';

interface In { words: string[] }

const parse = (raw: string): In => ({ words: parseWords(raw, { maxWords: 6, maxWordLen: 5, example: 'he she his hers' }) });

/** The failure links of the automaton as a list indexed by state (the animation's final answer). */
export function failureTable(words: string[]): number[] {
  const a = new Aho();
  words.forEach((w) => a.insert(w));
  a.buildAll();
  return a.fail.slice();
}

function build({ words }: In): Step[] {
  const a = new Aho();
  const steps: Step[] = [];
  const done: number[] = [];
  let stateV = '—';
  let tried = '—';
  let link = '—';
  let queueItems: string[] = [];
  const labels: Record<number, string> = {};

  const refreshLabels = () => {
    for (const v of done) {
      const o = a.outputs(v);
      if (o.length) labels[v] = o.join(',');
    }
  };
  const aux = (): Aux[] => [
    { title: 'fail[ ] known so far  (state:string → fail state)', kind: 'list', items: done.map((v) => `${v}:${a.str(v)}→${a.fail[v]}`) },
    ...(queueItems.length ? [{ title: 'states still to process (BFS order)', kind: 'queue' as const, items: queueItems }] : []),
  ];
  const push = (x: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...x, aux: aux(), vars: { state: stateV, tried, 'fail link': link, 'links set': done.length } });

  push({
    title: 'Start with an empty trie', desc: `We will build a trie of ${words.length} word${words.length === 1 ? '' : 's'} (${words.join(', ')}), then add a failure link to every state. Each state gets a number; double rings mark where a word ends.`,
    scene: a.scene(), logic: 'The automaton is a trie plus one extra pointer per state: "if the next letter does not fit here, continue from the longest shorter suffix that is still a prefix of some word".', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [2, 3], algoStep: 0,
    tag: 'START —', note: `states = 1 (root only), words = [${words.join(', ')}]`,
  });

  for (const w of words) {
    const { ids, created } = a.insert(w);
    const states: Record<number, CellState> = {};
    ids.slice(1).forEach((id, k) => { states[id] = created[k] ? 'found' : 'active'; });
    stateV = `"${w}"`;
    push({
      title: `Insert "${w}"`, desc: `Walk from the root along "${w}", creating the missing states (${created.filter(Boolean).length} new). The last state is marked as the end of a word.`,
      scene: a.scene({ states, path: ids }), logic: 'Words that share a beginning share states, exactly as in an ordinary trie.', logicTone: 'info',
      javaLines: [5, 6, 7, 8, 9, 10, 11], pyLines: [8, 9, 10, 11, 12, 13, 14, 15], algoStep: 0,
      tag: 'INSERT —', note: `insert("${w}"): ${created.filter(Boolean).length} new state${created.filter(Boolean).length === 1 ? '' : 's'}, ${a.trie.nodes.length} states in total`,
    });
  }

  const order = a.order();
  const depth1 = order.filter((v) => a.depth[v] === 1);
  for (const v of depth1) a.fail[v] = 0;
  done.push(...depth1);
  refreshLabels();
  queueItems = order.filter((v) => a.depth[v] > 1).map((v) => `${v}:${a.str(v)}`);
  stateV = '—';
  push({
    title: 'Depth-1 states fail to the root', desc: `A one-letter state has no shorter proper suffix except the empty one, so fail = 0 (the root) for states ${depth1.join(', ')}. Links that lead to the root are not drawn, to keep the picture readable.`,
    scene: a.scene({ done, states: Object.fromEntries(depth1.map((v) => [v, 'found' as CellState])) , labels }), logic: 'These states also seed the BFS queue. Processing in breadth-first order guarantees that every shorter state already has its link when it is needed.', logicTone: 'info',
    javaLines: [15, 16, 17], pyLines: [18], algoStep: 1,
    tag: 'SEED —', note: `queue = [${depth1.join(', ')}], fail = 0 for each; ${queueItems.length} deeper state${queueItems.length === 1 ? '' : 's'} to link`,
  });

  for (const v of order) {
    if (a.depth[v] === 1) continue;
    const u = a.parent[v];
    const c = a.trie.nodes[v].char;
    const { chain, target } = a.failOf(u, c);
    queueItems = order.slice(order.indexOf(v) + 1).filter((x) => a.depth[x] > 1).map((x) => `${x}:${a.str(x)}`);
    stateV = `${v} "${a.str(v)}"`;
    tried = chain.map((f) => (f === 0 ? 'root' : `${f} "${a.str(f)}"`)).join(' → ');
    link = '?';
    const chainStates: Record<number, CellState> = {};
    for (const f of chain) chainStates[f] = 'compare';
    chainStates[v] = 'active';
    push({
      title: `Find fail of state ${v} "${a.str(v)}"`,
      desc: `State ${v} is reached from state ${u} ("${a.str(u)}") by '${c}'. Start at fail[${u}] = ${a.fail[u]} and climb the failure chain until some state has a '${c}' edge: tried ${tried}.`,
      scene: a.scene({ done, states: chainStates, labels, path: [...pathTo(a, v)] }),
      logic: 'Any proper suffix of "' + a.str(v) + '" is "' + c + '" appended to a proper suffix of "' + a.str(u) + '", and those suffixes are exactly the states on the failure chain of ' + u + '.', logicTone: 'info',
      javaLines: [18, 19, 20, 21, 22, 23, 24], pyLines: [19, 20, 21, 22, 23, 24], algoStep: 2,
      tag: 'CLIMB —', note: `u = ${u}, c = '${c}', f starts at fail[${u}] = ${a.fail[u]}; chain ${tried}`,
    });
    a.fail[v] = target;
    done.push(v);
    refreshLabels();
    link = target === 0 ? 'root' : `${target} "${a.str(target)}"`;
    push({
      title: `fail[${v}] = ${target === 0 ? 'root' : target}`,
      desc: target === 0 ? `No state on the chain has a '${c}' edge, so the longest usable suffix is empty: fail = root (link not drawn).` : `State ${target} ("${a.str(target)}") has a '${c}' edge, so the link goes to it: "${a.str(v)}" ends with "${a.str(target)}".`,
      scene: a.scene({ done, hot: target === 0 ? undefined : { from: v, to: target, state: 'found' }, states: { [v]: 'found', ...(target ? { [target]: 'compare' } : {}) }, labels }),
      logic: target === 0 ? 'Falling back to the root is always legal: the empty string is a suffix of everything.' : 'The link points at the longest proper suffix that is also a prefix of some word.', logicTone: 'success',
      javaLines: [25, 26], pyLines: [25, 26, 27], algoStep: 3,
      tag: 'LINK —', note: target === 0 ? `no '${c}' edge on the chain → fail[${v}] = 0 (${done.length} links set)` : `'${c}' edge found → fail[${v}] = ${target} ("${a.str(target)}"), ${done.length} links set`,
    });
  }

  stateV = '—';
  tried = '—';
  link = '—';
  queueItems = [];
  const table = a.fail.slice();
  push({
    title: 'Automaton complete', desc: `All ${a.trie.nodes.length} states have a failure link: fail = ${fmtArr(table)} (indexed by state number). Chips beside states list every word that ends there, including shorter ones inherited through links.`,
    scene: a.scene({ done, labels }), logic: 'During a search, a mismatch at a state costs a few hops along these links instead of restarting from the root.', logicTone: 'success',
    javaLines: [28], pyLines: [27], algoStep: 4,
    tag: '✅ Done!', note: `queue empty, fail = ${fmtArr(table)}`,
    result: { title: `${table.length} states`, text: `fail = ${fmtArr(table)}` },
  });
  return steps;
}

function pathTo(a: Aho, v: number): number[] {
  const p: number[] = [];
  for (let x = v; x !== -1; x = a.parent[x]) p.unshift(x);
  return p;
}

export const ahoCorasickBuild: ProblemDef<In> = {
  slug: 'cp-aho-corasick-build-failure-links',
  id: 'CP', title: 'Aho-Corasick: Build Failure Links', difficulty: 'Hard', category: 'Advanced Data Structures', tag: 'trie + failure links (BFS)',
  statement: 'Build the Aho-Corasick automaton for a set of words: first a trie of all words, then, for every state, a failure link to the state of the longest proper suffix of its string that is also a prefix of some word. Report the failure link of every state.',
  constraints: 'Lowercase words (animation input: up to 6 different words of up to 5 letters)',
  examples: [
    { label: 'he she his hers', input: { words: ['he', 'she', 'his', 'hers'] }, output: '10 states, fail = [0, 0, 0, 0, 1, 2, 0, 3, 0, 3]' },
    { label: 'a ab bc bca c', input: { words: ['a', 'ab', 'bc', 'bca', 'c'] }, output: '7 states, fail = [0, 0, 3, 0, 6, 1, 0]' },
    { label: 'abc bc c', input: { words: ['abc', 'bc', 'c'] }, output: '7 states, fail = [0, 0, 4, 5, 0, 6, 0]' },
  ],
  inputPlaceholder: 'e.g. he she his hers',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Trie with failure links',
  legend: [{ label: 'State being linked', state: 'active' }, { label: 'Failure chain tried / link target', state: 'compare' }, { label: 'Link just set', state: 'found' }],
  emphasis: ['failure link', 'trie', 'longest proper suffix', 'prefix of some word'],
  varLabels: ['state', 'tried', 'fail link', 'links set'],
  phases: [
    { icon: '🌳', label: 'Phase 1: Build trie', tone: 'blue' },
    { icon: '🌱', label: 'Phase 2: Seed depth 1', tone: 'green' },
    { icon: '🧗', label: 'Phase 3: Climb the chain', tone: 'orange' },
    { icon: '🔗', label: 'Phase 4: Set fail link', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A trie, plus a BFS that fills in the fallback pointers',
    text: 'Insert all words into a trie. Then process states in breadth-first order. For a state v reached from u by letter c, begin at fail[u] and climb the failure chain until you find a state with a c-edge; fail[v] is that edge\'s target (or the root). Because shorter states are processed first, every link you need already exists.',
  },
  java: [
    'class AhoCorasick {',
    '    private final int[][] next = new int[64][26];   // trie edges (0 = none)',
    '    private final int[] fail = new int[64];',
    '    private int states = 1;',
    '',
    '    void insert(String word) {',
    '        int cur = 0;',
    '        for (char ch : word.toCharArray()) {',
    '            int c = ch - \'a\';',
    '            if (next[cur][c] == 0) next[cur][c] = states++;',
    '            cur = next[cur][c];',
    '        }',
    '    }',
    '',
    '    void buildFailureLinks() {',
    '        Deque<Integer> queue = new ArrayDeque<>();',
    '        for (int c = 0; c < 26; c++)',
    '            if (next[0][c] != 0) queue.add(next[0][c]);   // depth 1: fail = root',
    '        while (!queue.isEmpty()) {',
    '            int u = queue.poll();',
    '            for (int c = 0; c < 26; c++) {',
    '                int v = next[u][c];',
    '                if (v == 0) continue;',
    '                int f = fail[u];',
    '                while (f != 0 && next[f][c] == 0) f = fail[f];   // climb the chain',
    '                if (next[f][c] != 0) fail[v] = next[f][c];',
    '                queue.add(v);',
    '            }',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'class AhoCorasick:',
    '    def __init__(self, words):',
    '        self.next = [{}]',
    '        self.fail = [0]',
    '        for w in words:',
    '            self._insert(w)',
    '        self._build()',
    '',
    '    def _insert(self, word):',
    '        cur = 0',
    '        for ch in word:',
    '            if ch not in self.next[cur]:',
    '                self.next.append({})',
    '                self.fail.append(0)',
    '                self.next[cur][ch] = len(self.next) - 1',
    '            cur = self.next[cur][ch]',
    '',
    '    def _build(self):',
    '        queue = deque(self.next[0].values())      # depth 1: fail = root',
    '        while queue:',
    '            u = queue.popleft()',
    '            for ch, v in self.next[u].items():',
    '                f = self.fail[u]',
    '                while f and ch not in self.next[f]:',
    '                    f = self.fail[f]',
    '                if ch in self.next[f]:',
    '                    self.fail[v] = self.next[f][ch]',
    '                queue.append(v)',
  ],
  algorithm: [
    'Insert every word into a trie (states = trie nodes)',
    'Depth-1 states get fail = root and start the BFS queue',
    'Pop a state u; for each child v reached by letter c, start at fail[u]',
    'Climb the failure chain until a state has a c-edge: fail[v] is that child, or the root',
    'Push v and repeat; when the queue is empty every state has its link',
  ],
  complexity: [{ label: 'Time', value: 'O(total letters · alphabet)' }, { label: 'Space', value: 'O(total letters)' }],
  why: 'fail[v] must be the deepest state whose string is a proper suffix of v\'s string. Such a suffix is a shorter suffix of the parent\'s string plus the last letter, so scanning the parent\'s failure chain from longest to shortest and taking the first state with that letter edge finds it. BFS order guarantees that every state on that chain is shallower than v and already linked. Each pointer climb is paid for by an earlier decrease of the depth of the failure chain, which gives linear total work per word.',
};
