import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { tokens } from './graphKit.ts';

interface In { begin: string; end: string; words: string[] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Write "begin end | word list", e.g. hit cog | hot dot dog lot log cog');
  const be = tokens(parts[0]);
  const words = tokens(parts[1]);
  if (be.length !== 2) throw new Error('Before the "|" give exactly two words: the begin word and the end word');
  const all = [...be, ...words];
  if (all.some((w) => !/^[a-z]{2,4}$/.test(w))) throw new Error('Words must be 2 to 4 lowercase letters');
  if (all.some((w) => w.length !== be[0].length)) throw new Error('All words must have the same length');
  if (be[0] === be[1]) throw new Error('The begin and end words must be different');
  if (!words.length || words.length > 8) throw new Error('Give 1 to 8 words in the word list');
  if (new Set(words).size !== words.length) throw new Error('Do not repeat a word in the list');
  return { begin: be[0], end: be[1], words };
}

const oneApart = (a: string, b: string) => {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d === 1;
};

function build({ begin, end, words }: In): Step[] {
  const nodes = [begin, ...words.filter((w) => w !== begin)];
  const idx = new Map(nodes.map((w, i) => [w, i]));
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (oneApart(nodes[i], nodes[j])) edges.push([i, j]);
  const adj: number[][] = nodes.map(() => []);
  edges.forEach(([a, b], ei) => { adj[a].push(ei); adj[b].push(ei); });
  const other = (ei: number, u: number) => (edges[ei][0] === u ? edges[ei][1] : edges[ei][0]);
  const endId = words.includes(end) ? idx.get(end)! : -1;

  const depth = new Map<number, number>();
  const parentEdge = new Map<number, number>();
  const done = new Set<number>();
  const queue: number[] = [];
  const eState: EdgeState[] = edges.map(() => 'default');
  const steps: Step[] = [];
  let cur: number | null = null;
  let pathNodes: number[] = [];
  let result = '—';

  const scene = () => {
    const ns = nodes.map((w, i) => {
      const state: CellState | undefined = pathNodes.includes(i) ? 'found' : i === cur ? 'active' : queue.includes(i) ? 'compare' : done.has(i) ? 'swap' : undefined;
      return { id: i, label: w, state, tag: depth.has(i) ? `len ${depth.get(i)}` : undefined };
    });
    const ge = edges.map(([a, b], i): GraphEdgeVM => ({ from: a, to: b, state: eState[i] }));
    const pointers: Pointer[] = [{ id: 'begin', label: 'begin', index: 0, tone: 'green' }];
    if (endId >= 0) pointers.push({ id: 'end', label: 'end', index: endId, tone: 'purple' });
    return { kind: 'graph' as const, layout: 'layered' as const, nodes: ns, edges: ge, pointers };
  };
  const aux = (): Aux[] => [
    { title: 'queue (word, sequence length)', kind: 'queue', items: queue.map((i) => `${nodes[i]} (${depth.get(i)})`) },
    { title: 'words not reached yet', kind: 'list', items: nodes.filter((_, i) => i !== 0 && !depth.has(i)) },
  ];
  const vars = () => ({ word: cur === null ? '—' : nodes[cur], length: cur === null ? '—' : depth.get(cur) ?? '—', visited: depth.size, 'queue size': queue.length, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', tag: '🔍 CHECK —',
    desc: `Change "${begin}" into "${end}" one letter at a time; every intermediate word must be in the list. Words one letter apart are joined by an edge.`,
    note: `dict = ${words.length} words, ${edges.length} one-letter links`,
    logic: 'This is a shortest-path question on an unweighted graph, so BFS gives the minimum number of words.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0,
  });

  if (endId < 0) {
    result = '0';
    steps.push({
      title: `"${end}" is not in the list`, tag: '🚫 REJECT —', desc: `The end word "${end}" is not in the word list, so no sequence can finish there. Answer is 0 without searching.`,
      note: `dict.contains("${end}") = false → return 0`,
      alert: `"${end}" is missing from the word list: no transformation is possible.`,
      scene: scene(), aux: aux(), vars: vars(),
      logic: 'Check this first; it avoids a pointless search.', logicTone: 'warn',
      javaLines: [2], pyLines: [2, 3], algoStep: 4,
      result: { title: '0', text: 'No transformation sequence exists' },
    });
    return steps;
  }

  depth.set(0, 1);
  queue.push(0);
  push({
    title: `Queue "${begin}" (length 1)`, tag: '📥 ENQUEUE —', desc: `The sequence so far is just "${begin}", which counts as length 1. Queue = [${begin}].`,
    note: `queue.add("${begin}"); steps = 1`,
    logic: 'BFS explores by sequence length: all 2-word sequences before any 3-word one.', logicTone: 'info',
    javaLines: [4], pyLines: [4], algoStep: 1,
  });

  let found = false;
  while (queue.length) {
    const u = queue.shift()!;
    cur = u;
    done.add(u);
    if (u === endId) {
      found = true;
      let n = u;
      pathNodes = [n];
      while (parentEdge.has(n)) { const pe = parentEdge.get(n)!; eState[pe] = 'chosen'; n = other(pe, n); pathNodes.push(n); }
      result = String(depth.get(u));
      push({
        title: `Pop "${nodes[u]}": the end word`, tag: '🎯 FOUND —',
        desc: `"${nodes[u]}" is the end word. Shortest sequence: ${[...pathNodes].reverse().map((p) => nodes[p]).join(' → ')} (${depth.get(u)} words).`,
        note: `word.equals("${end}") → return ${depth.get(u)}`,
        logic: 'BFS reaches the end word first along a shortest route.', logicTone: 'success',
        javaLines: [9], pyLines: [7, 8], algoStep: 2,
      });
      break;
    }
    push({
      title: `Pop "${nodes[u]}" (length ${depth.get(u)})`, tag: '⚙️ POP —',
      desc: `Take "${nodes[u]}" (sequence length ${depth.get(u)}) from the front. It is not "${end}", so look for words one letter away.`,
      note: `word = "${nodes[u]}", steps = ${depth.get(u)}`,
      logic: 'The front of the queue is the shortest unexplored sequence.', logicTone: 'info',
      javaLines: [8], pyLines: [6], algoStep: 2,
    });
    const fresh: number[] = [];
    const seen: number[] = [];
    for (const ei of adj[u]) {
      const v = other(ei, u);
      if (depth.has(v)) { seen.push(v); continue; }
      depth.set(v, depth.get(u)! + 1);
      parentEdge.set(v, ei);
      eState[ei] = 'visited';
      queue.push(v);
      fresh.push(v);
    }
    const qText = `[${queue.map((i) => nodes[i]).join(', ')}]`;
    push({
      title: `Expand "${nodes[u]}"`, tag: '🔤 EXPAND —',
      desc: fresh.length
        ? `New words one letter away: ${fresh.map((v) => nodes[v]).join(', ')}. Each gets length ${depth.get(u)! + 1}; queue = ${qText}.`
        : `No unreached word is one letter from "${nodes[u]}", so nothing is queued. Queue = ${qText}.`,
      note: fresh.length ? `dict.remove + queue.add: ${fresh.map((v) => `"${nodes[v]}"`).join(', ')} → length ${depth.get(u)! + 1}` : `no dict.remove(next) succeeded → q.size = ${queue.length}`,
      alert: seen.length ? `Skipped ${seen.map((v) => `"${nodes[v]}"`).join(', ')}: already reached by an equal or shorter route.` : undefined,
      logic: 'A word is removed from the dictionary the moment it is queued, so it is never queued twice.', logicTone: fresh.length ? 'success' : 'info',
      javaLines: [16], pyLines: [12, 13, 14], algoStep: 3,
    });
    cur = null;
  }

  cur = found ? endId : null;
  if (!found) result = '0';
  steps.push({
    title: found ? `Shortest sequence has ${result} words` : 'No sequence found', tag: found ? '✅ Done!' : '🚫 No path —',
    desc: found ? `The end word "${end}" was reached after ${Number(result) - 1} letter change${Number(result) === 2 ? '' : 's'}, so the answer is ${result} words.` : `The queue emptied without reaching "${end}": the words in the list cannot connect them. Answer 0.`,
    note: found ? `return steps → ${result}` : 'queue is empty → return 0',
    alert: found ? undefined : `Queue exhausted: "${end}" is not reachable from "${begin}".`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: found ? 'The answer counts words, not changes: changes + 1.' : 'BFS explored every word reachable from the begin word.', logicTone: found ? 'success' : 'warn',
    javaLines: found ? [9] : [23], pyLines: found ? [8] : [15], algoStep: 4,
    result: { title: result, text: found ? 'Words in the shortest transformation sequence' : 'No transformation sequence exists' },
  });
  return steps;
}

export const wordLadder: ProblemDef<In> = {
  slug: '127-word-ladder',
  id: '127', title: 'Word Ladder', difficulty: 'Hard', category: 'Graph', tag: 'BFS shortest path',
  statement: 'Turn beginWord into endWord by changing one letter at a time, where every intermediate word must be in the word list. Return the number of words in the shortest such sequence (counting both ends), or 0 if none exists.',
  constraints: 'Words have equal length 1 to 10, list up to 5000 words (animation input: 2–4 letter words, ≤ 8 list words; write "begin end | list")',
  examples: [
    { label: 'hit cog | hot dot dog lot log cog', input: { begin: 'hit', end: 'cog', words: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'] }, output: '5', answer: '5 words (hit → … → cog, four letter changes)' },
    { label: 'hit cog | hot dot cog', input: { begin: 'hit', end: 'cog', words: ['hot', 'dot', 'cog'] }, output: '0' },
    { label: 'cat dog | cot cog dot dog cut', input: { begin: 'cat', end: 'dog', words: ['cot', 'cog', 'dot', 'dog', 'cut'] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. hit cog | hot dot dog lot log cog',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current word', state: 'active' }, { label: 'In queue', state: 'compare' }, { label: 'Processed', state: 'swap' }, { label: 'Shortest path', state: 'found' }],
  varLabels: ['word', 'length', 'visited', 'queue size', 'answer'],
  emphasis: ['one letter at a time', 'shortest such sequence'],
  phases: [
    { icon: '🔍', label: 'Check dictionary', tone: 'blue' },
    { icon: '📥', label: 'Enqueue begin', tone: 'blue' },
    { icon: '⚙️', label: 'Pop word', tone: 'cyan' },
    { icon: '🔤', label: 'Expand neighbours', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS over words one letter apart',
    text: 'Treat words as nodes, joined when they differ by one letter. BFS from the begin word, tracking the sequence length. For each popped word try every one-letter change; any change that is still in the dictionary is removed and queued with length + 1. The first time the end word is popped, its length is the answer.',
  },
  java: [
    'public int ladderLength(String begin, String end, List<String> wordList) {',
    '    Set<String> dict = new HashSet<>(wordList);',
    '    if (!dict.contains(end)) return 0;',
    '    Deque<String> queue = new ArrayDeque<>();',
    '    queue.add(begin);',
    '    int steps = 1;',
    '    while (!queue.isEmpty()) {',
    '        for (int size = queue.size(); size > 0; size--) {',
    '            String word = queue.poll();',
    '            if (word.equals(end)) return steps;',
    '            char[] cs = word.toCharArray();',
    '            for (int i = 0; i < cs.length; i++) {',
    '                char old = cs[i];',
    "                for (char ch = 'a'; ch <= 'z'; ch++) {",
    '                    cs[i] = ch;',
    '                    String next = new String(cs);',
    '                    if (dict.remove(next)) queue.add(next);',
    '                }',
    '                cs[i] = old;',
    '            }',
    '        }',
    '        steps++;',
    '    }',
    '    return 0;',
    '}',
  ],
  python: [
    'def ladder_length(begin, end, word_list):',
    '    words = set(word_list)',
    '    if end not in words:',
    '        return 0',
    '    queue = deque([(begin, 1)])',
    '    while queue:',
    '        word, steps = queue.popleft()',
    '        if word == end:',
    '            return steps',
    '        for i in range(len(word)):',
    '            for ch in "abcdefghijklmnopqrstuvwxyz":',
    '                nxt = word[:i] + ch + word[i + 1:]',
    '                if nxt in words:',
    '                    words.remove(nxt)',
    '                    queue.append((nxt, steps + 1))',
    '    return 0',
  ],
  algorithm: [
    'Put the word list in a set; if the end word is missing, return 0',
    'Queue the begin word with sequence length 1',
    'Pop a word; if it is the end word, return its length',
    'Try changing each letter; every unseen word found in the set is removed and queued with length + 1',
    'Return the length when the end word is popped, or 0 when the queue empties',
  ],
  complexity: [{ label: 'Time', value: 'O(N · L · 26)' }, { label: 'Space', value: 'O(N · L)' }],
  why: 'BFS visits words in increasing order of sequence length, so the first time the end word is dequeued its length is minimal. Removing a word from the dictionary when it is queued is safe because the first time we reach a word is by a shortest route; later routes can only be as long or longer. Each word is queued once and tries 26·L neighbours.',
};
