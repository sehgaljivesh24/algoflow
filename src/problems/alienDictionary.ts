import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { tokens } from './graphKit.ts';

/** Words of an alien dictionary, already sorted by the alien alphabet. */
interface In { words: string[] }

function parse(raw: string): In {
  const words = tokens(raw);
  if (words.length < 1) throw new Error('Enter the sorted words separated by spaces, e.g. wrt wrf er ett rftt');
  if (words.length > 7) throw new Error('Use at most 7 words');
  if (words.some((w) => !/^[a-z]+$/.test(w))) throw new Error('Words may contain lowercase letters a-z only');
  if (words.some((w) => w.length > 6)) throw new Error('Keep each word to 6 letters or fewer');
  if (new Set(words.join('')).size > 9) throw new Error('Use at most 9 different letters');
  return { words };
}

function build({ words }: In): Step[] {
  const letters: string[] = [];
  for (const w of words) for (const c of w) if (!letters.includes(c)) letters.push(c);
  const n = letters.length;
  const id = (c: string) => letters.indexOf(c);
  const edges: { u: number; v: number }[] = [];
  const eState: EdgeState[] = [];
  const indeg = new Array<number>(n).fill(0);
  const state: (CellState | undefined)[] = new Array(n).fill(undefined);
  const queue: number[] = [];
  const order: number[] = [];
  const steps: Step[] = [];
  let pair = -1; // index of the first word of the pair being compared
  let cur: number | null = null;
  let phase: 'edges' | 'kahn' = 'edges';

  const scene = () => ({
    kind: 'graph' as const, layout: 'layered' as const,
    nodes: letters.map((c, i) => ({ id: i, label: c, state: state[i], tag: state[i] === 'found' ? undefined : `in=${indeg[i]}` })),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, directed: true, state: eState[i] })),
  });
  const aux = (): Aux[] => {
    const a: Aux[] = [{ title: pair >= 0 && phase === 'edges' ? `words (comparing ${pair} and ${pair + 1})` : 'words', kind: 'list', items: words.map((w, i) => `${i}: ${w}`), highlight: pair >= 0 && phase === 'edges' ? pair : undefined }];
    if (phase === 'kahn') {
      a.push({ title: 'queue (in-degree 0)', kind: 'queue', items: queue.map((q) => letters[q]) });
      a.push({ title: 'alphabet so far', kind: 'list', items: order.map((q) => letters[q]) });
    }
    return a;
  };
  const vars = () => ({ 'pair': pair >= 0 && phase === 'edges' ? `${words[pair]} / ${words[pair + 1]}` : '—', letter: cur === null ? '—' : letters[cur], edges: edges.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${words.length} words sorted in an unknown alphabet use ${n} different letters (${letters.join(', ')}). Each letter becomes a node.`,
    logic: 'The word order hides facts of the form "letter x comes before letter y". We will dig those out, then order the letters.', logicTone: 'info',
    tag: 'INIT —', note: `${n} letters: ${letters.join(' ')}, all in-degree 0`,
    javaLines: [1, 2, 3, 4, 5, 6, 7], pyLines: [1, 2], algoStep: 0,
  });

  const fail = (title: string, desc: string, logic: string) => {
    phase = 'edges';
    steps.push({
      title, desc, scene: scene(), aux: aux(), vars: vars(), logic, logicTone: 'warn',
      tag: '⚠ Invalid!', alert: 'A word is listed before its own prefix, so no alphabet can sort this list.', note: 'a.startsWith(b) && a.length() > b.length() → return ""',
      javaLines: [10], pyLines: [5], algoStep: 4,
      result: { title: '""', text: 'No valid alien alphabet exists' },
    });
    return steps;
  };

  for (let p = 0; p + 1 < words.length; p++) {
    const a = words[p];
    const b = words[p + 1];
    pair = p;
    cur = null;
    if (a.length > b.length && a.startsWith(b)) {
      for (let k = 0; k < n; k++) state[k] = undefined;
      return fail(`"${a}" before its own prefix "${b}"`, `"${b}" is a prefix of "${a}", yet "${a}" is listed first. In any alphabet a shorter prefix must come first, so the dictionary is invalid.`, 'No ordering of letters can place a word before its own prefix, so we stop right here and return the empty string.');
    }
    let j = 0;
    while (j < Math.min(a.length, b.length) && a[j] === b[j]) j++;
    if (j === Math.min(a.length, b.length)) {
      push({
        title: `${a} / ${b}: no information`, desc: `${j === a.length && j === b.length ? 'The words are identical' : `"${a}" is a prefix of "${b}"`}, so the order of these two words says nothing about letters.`,
        logic: 'Only the first position where two neighbouring words differ gives an ordering fact.', logicTone: 'info',
        tag: 'COMPARE', note: `"${a}" vs "${b}": no differing letter → skip`,
        javaLines: [8, 9, 10, 11], pyLines: [3, 6], algoStep: 1,
      });
      continue;
    }
    const u = id(a[j]);
    const v = id(b[j]);
    const known = edges.some((e) => e.u === u && e.v === v);
    if (known) {
      push({
        title: `${a} / ${b}: ${a[j]} < ${b[j]} (known)`, desc: `The first difference is at position ${j}: ${a[j]} vs ${b[j]}. The edge ${a[j]} → ${b[j]} is already recorded, so nothing changes.`,
        logic: 'A repeated fact must not be counted twice, or the in-degree would never drop to zero.', logicTone: 'info',
        tag: 'COMPARE', note: `edge ${a[j]} → ${b[j]} exists already, in-degree stays ${indeg[v]}`,
        javaLines: [12, 13], pyLines: [6, 7, 8], algoStep: 1,
      });
      continue;
    }
    edges.push({ u, v });
    eState.push('active');
    indeg[v]++;
    push({
      title: `${a} / ${b}: ${a[j]} comes before ${b[j]}`, desc: `The words first differ at position ${j}: ${a[j]} vs ${b[j]}. So ${a[j]} precedes ${b[j]} in the alien alphabet: add edge ${a[j]} → ${b[j]} and raise in-degree of ${b[j]} to ${indeg[v]}.`,
      logic: 'Letters after the first difference tell us nothing, because the words are already ordered by that earlier letter.', logicTone: 'success',
      tag: 'EDGE', note: `"${a}" vs "${b}": '${a[j]}' ≠ '${b[j]}' at index ${j} → ${a[j]} → ${b[j]}, indeg[${b[j]}] = ${indeg[v]}`,
      javaLines: [12, 13, 14, 15], pyLines: [6, 7, 8, 9, 10], algoStep: 1,
    });
    eState[eState.length - 1] = 'default';
  }

  pair = -1;
  phase = 'kahn';
  for (let i = 0; i < n; i++) if (indeg[i] === 0) { queue.push(i); state[i] = 'compare'; }
  push({
    title: queue.length ? `Queue the letters with in-degree 0: ${queue.map((q) => letters[q]).join(', ')}` : 'No letter has in-degree 0',
    desc: queue.length ? 'These letters have nothing forced before them, so they can come first.' : 'Every letter must come after another one, which is only possible with a cycle.',
    logic: 'Now the task is exactly a topological sort of the letter graph.', logicTone: queue.length ? 'info' : 'warn',
    tag: 'SEED', note: `queue = [${queue.map((q) => letters[q]).join(', ')}] from ${edges.length} edges`,
    alert: queue.length ? undefined : 'No letter has in-degree 0: the constraints loop, so no alphabet exists.',
    javaLines: [19, 20, 21], pyLines: [12, 13], algoStep: 2,
  });
  while (queue.length) {
    const u = queue.shift()!;
    cur = u;
    state[u] = 'active';
    order.push(u);
    push({
      title: `Take ${letters[u]}`, desc: `Pop ${letters[u]} and append it to the alphabet: ${order.map((q) => letters[q]).join('')}.`,
      logic: 'All letters that must precede it are already in the answer.', logicTone: 'success',
      tag: 'TAKE', note: `c = '${letters[u]}', out = "${order.map((q) => letters[q]).join('')}"`,
      javaLines: [23, 24, 25], pyLines: [14, 15, 16], algoStep: 3,
    });
    state[u] = 'found';
    edges.forEach((e, ei) => {
      if (e.u !== u) return;
      indeg[e.v]--;
      eState[ei] = 'visited';
      const free = indeg[e.v] === 0;
      if (free) { queue.push(e.v); state[e.v] = 'compare'; }
      push({
        title: `Release ${letters[u]} → ${letters[e.v]}: in-degree ${indeg[e.v] + 1} → ${indeg[e.v]}`,
        desc: free ? `${letters[e.v]} no longer waits for anything, so it joins the queue.` : `${letters[e.v]} still waits for ${indeg[e.v]} other letter${indeg[e.v] === 1 ? '' : 's'}.`,
        logic: 'Placing a letter satisfies one constraint for each letter that had to follow it.', logicTone: free ? 'success' : 'info',
        tag: 'RELEASE', note: free ? `indeg['${letters[e.v]}'] = 0 → queue.add('${letters[e.v]}')` : `indeg['${letters[e.v]}'] = ${indeg[e.v]}`,
        javaLines: [26, 27], pyLines: [17, 18, 19, 20], algoStep: 3,
      });
    });
    cur = null;
  }

  const ok = order.length === n;
  const str = order.map((q) => letters[q]).join('');
  if (!ok) for (let k = 0; k < n; k++) if (state[k] === undefined) state[k] = 'error';
  steps.push({
    title: ok ? `Alphabet: ${str}` : 'Cycle among the letters',
    desc: ok ? `Every letter was placed, giving the order "${str}".` : `Only ${order.length} of ${n} letters could be placed. The red letters wait on each other, so the word order contradicts itself.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: ok ? 'Placing all letters proves the constraints are consistent; any topological order is acceptable.' : 'A cycle never reaches in-degree 0, so no consistent alphabet exists.', logicTone: ok ? 'success' : 'warn',
    tag: ok ? '✅ Done!' : '⚠ Stuck!', note: ok ? `out.length() = ${n} → return "${str}"` : `out.length() = ${order.length} < ${n} → return ""`,
    alert: ok ? undefined : 'The red letters wait on each other: the word order contradicts itself.',
    javaLines: [29], pyLines: [21], algoStep: 4,
    result: ok ? { title: `"${str}"`, text: 'A valid alien letter order' } : { title: '""', text: 'The constraints contain a cycle' },
  });
  return steps;
}

export const alienDictionary: ProblemDef<In> = {
  slug: '269-alien-dictionary',
  id: '269', title: 'Alien Dictionary', difficulty: 'Hard', category: 'Graph', tag: 'derive edges + topo sort',
  statement: 'A list of words is sorted according to the rules of an unknown alien alphabet. Work out the order of the letters and return it as a string. If the list is inconsistent (a cycle of constraints, or a word placed before its own prefix) return an empty string. Any valid order is accepted.',
  constraints: '1 ≤ words ≤ 100, lowercase letters (animation input: up to 7 words of ≤ 6 letters, ≤ 9 distinct letters)',
  examples: [
    { label: 'wrt wrf er ett rftt', input: { words: ['wrt', 'wrf', 'er', 'ett', 'rftt'] }, output: '"wertf"' },
    { label: 'z x z', input: { words: ['z', 'x', 'z'] }, output: '""' },
    { label: 'abc ab', input: { words: ['abc', 'ab'] }, output: '""' },
  ],
  inputPlaceholder: 'e.g. wrt wrf er ett rftt   (words, already sorted)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being placed', state: 'active' }, { label: 'In queue', state: 'compare' }, { label: 'In the alphabet', state: 'found' }, { label: 'Stuck in a cycle', state: 'error' }],
  varLabels: ['pair', 'letter', 'edges'],
  phases: [
    { icon: '🔤', label: 'Letters are nodes', tone: 'blue' },
    { icon: '🧩', label: 'Derive edges from word pairs', tone: 'cyan' },
    { icon: '🌱', label: 'Seed the queue', tone: 'cyan' },
    { icon: '📤', label: 'Take a letter', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['sorted', 'unknown', 'order of the letters', 'empty string'],
  vizTitle: 'Letter precedence graph',
  approach: {
    title: 'Words give edges, then topological sort',
    text: 'Compare each pair of neighbouring words and look at the first position where they differ: that gives one fact "x before y", an edge x → y. A longer word followed by its own prefix is an immediate contradiction. After all edges are collected, run Kahn’s algorithm over the letters; if every letter gets placed the order is the answer, otherwise there is a cycle and the answer is empty.',
  },
  java: [
    'public String alienOrder(String[] words) {',
    '    Map<Character, Set<Character>> adj = new LinkedHashMap<>();',
    '    Map<Character, Integer> indeg = new LinkedHashMap<>();',
    '    for (String w : words)',
    '        for (char c : w.toCharArray()) {',
    '            adj.putIfAbsent(c, new HashSet<>());',
    '            indeg.putIfAbsent(c, 0);',
    '        }',
    '    for (int i = 0; i + 1 < words.length; i++) {',
    '        String a = words[i], b = words[i + 1];',
    '        if (a.length() > b.length() && a.startsWith(b)) return "";   // invalid',
    '        for (int j = 0; j < Math.min(a.length(), b.length()); j++) {',
    '            if (a.charAt(j) != b.charAt(j)) {',
    '                if (adj.get(a.charAt(j)).add(b.charAt(j)))            // new edge',
    '                    indeg.merge(b.charAt(j), 1, Integer::sum);',
    '                break;',
    '            }',
    '        }',
    '    }',
    '    Deque<Character> queue = new ArrayDeque<>();',
    '    for (char c : indeg.keySet())',
    '        if (indeg.get(c) == 0) queue.add(c);',
    '    StringBuilder out = new StringBuilder();',
    '    while (!queue.isEmpty()) {',
    '        char c = queue.poll();',
    '        out.append(c);',
    '        for (char d : adj.get(c))',
    '            if (indeg.merge(d, -1, Integer::sum) == 0) queue.add(d);',
    '    }',
    '    return out.length() == indeg.size() ? out.toString() : "";',
    '}',
  ],
  python: [
    'def alien_order(words):',
    '    adj = {c: set() for w in words for c in w}',
    '    indeg = {c: 0 for c in adj}',
    '    for a, b in zip(words, words[1:]):',
    '        if len(a) > len(b) and a.startswith(b):',
    '            return ""                            # invalid prefix order',
    '        for x, y in zip(a, b):',
    '            if x != y:',
    '                if y not in adj[x]:              # new edge x -> y',
    '                    adj[x].add(y)',
    '                    indeg[y] += 1',
    '                break',
    '    queue = deque(c for c in indeg if indeg[c] == 0)',
    '    out = []',
    '    while queue:',
    '        c = queue.popleft()',
    '        out.append(c)',
    '        for d in adj[c]:',
    '            indeg[d] -= 1',
    '            if indeg[d] == 0:',
    '                queue.append(d)',
    '    return "".join(out) if len(out) == len(indeg) else ""',
  ],
  algorithm: [
    'Create a node for every letter that appears and start every in-degree at 0',
    'For each pair of neighbouring words find the first differing letters x, y and add edge x → y (return "" for a word before its own prefix)',
    'Queue every letter whose in-degree is 0',
    'Pop a letter, append it to the answer and decrement the in-degree of its successors, queueing those that reach 0',
    'If all letters were placed return the string, otherwise return "" (cycle)',
  ],
  complexity: [{ label: 'Time', value: 'O(total letters + V + E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'In a sorted list the first differing position of two neighbours is the only place that reveals an order, and neighbouring pairs capture every ordering fact the list contains (sortedness is transitive). Any alphabet that respects all these edges sorts the list correctly, and a topological order of the letter graph is exactly such an alphabet. If a cycle exists, no alphabet can respect all facts, which is why Kahn’s algorithm stalling means "impossible".',
};
