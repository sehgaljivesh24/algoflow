import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { tokens } from './graphKit.ts';
import { TrieModel } from './trieKit.ts';

interface In { board: string[]; words: string[] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Write the board rows, a "|", then the words, e.g. oaan etae ihkr iflv | oath pea eat rain');
  const board = tokens(parts[0]);
  const words = tokens(parts[1]);
  if (!board.length || board.some((r) => /[^a-z]/.test(r))) throw new Error('Board rows use lowercase letters, separated by spaces, e.g. oaan etae ihkr iflv');
  if (board.some((r) => r.length !== board[0].length)) throw new Error('Every board row must have the same length');
  if (board.length > 4 || board[0].length > 4) throw new Error('Use a board of at most 4 × 4');
  if (!words.length || words.some((w) => /[^a-z]/.test(w))) throw new Error('Give 1 to 4 lowercase words after the "|"');
  if (words.length > 4) throw new Error('Use at most 4 words');
  if (words.some((w) => w.length > 6)) throw new Error('Keep each word to 6 letters or fewer');
  if (new Set(words).size !== words.length) throw new Error('Each word may appear only once');
  const input = { board, words };
  if (build(input).length > 380) throw new Error('This board explores too many paths to animate. Use fewer repeated letters or shorter words.');
  return input;
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function build({ board, words }: In): Step[] {
  const R = board.length;
  const C = board[0].length;
  const trie = new TrieModel();
  words.forEach((w) => trie.insert(w));
  const wordAt = new Map<number, string>();
  words.forEach((w) => { let id = 0; for (const ch of w) id = trie.child(id, ch)!; wordAt.set(id, w); });

  const found: string[] = [];
  const foundNode = new Set<number>();
  const used = new Set<string>();
  const steps: Step[] = [];
  let path: [number, number][] = [];
  let nodePath: number[] = [0];
  let start = '—';
  let flash = false; // cells of the path just completed a word

  const scene = (extraState?: Record<number, CellState>) => {
    const rows: Cell[][] = board.map((row, r) =>
      [...row].map((ch, c) => {
        const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
        const last = idx === path.length - 1;
        const state: CellState | undefined = idx < 0 ? undefined : flash ? 'found' : last ? 'active' : 'compare';
        return { key: `${r},${c}`, value: ch, state };
      }),
    );
    const states: Record<number, CellState> = { ...extraState };
    foundNode.forEach((id) => { states[id] = 'found'; });
    if (nodePath.length) states[nodePath[nodePath.length - 1]] = flash ? 'found' : 'active';
    const labels: Record<number, string> = {};
    foundNode.forEach((id) => { labels[id] = wordAt.get(id)!; });
    return {
      kind: 'split' as const,
      parts: [
        { kind: 'grid' as const, rows, rowHeads: board.map((_, r) => String(r)), colHeads: [...board[0]].map((_, c) => String(c)) },
        trie.scene(nodePath, states, labels),
      ],
    };
  };
  const prefix = () => path.map(([r, c]) => board[r][c]).join('');
  const aux = (): Aux[] => [{ title: 'words found', kind: 'list', items: [...found] }];
  const vars = () => ({ start: start, prefix: prefix() || '—', found: found.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Board ${R}×${C}, ${words.length} word${words.length === 1 ? '' : 's'}. First all words go into a trie (right). The DFS walks the board and the trie together.`,
    logic: 'The trie lets one DFS search for every word at once, and stop a path as soon as no word starts with its letters.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0,
    tag: 'START —', note: `root = buildTrie(words): ${plural(trie.nodes.length - 1, 'node')} for ${plural(words.length, 'word')}`,
  });

  const dfs = (r: number, c: number, node: number) => {
    if (r < 0 || c < 0 || r >= R || c >= C || used.has(`${r},${c}`)) return;
    const next = trie.child(node, board[r][c]);
    if (next === null) return;
    used.add(`${r},${c}`);
    path.push([r, c]);
    nodePath.push(next);
    push({
      title: `Enter (${r}, ${c}) '${board[r][c]}'`, desc: `The trie has a '${board[r][c]}' edge after "${prefix().slice(0, -1)}", so the path "${prefix()}" can still become a word.`,
      logic: 'Only letters that continue a stored prefix are explored; every other branch is pruned.', logicTone: 'info',
      javaLines: [10, 11, 12, 13, 18], pyLines: [5, 7, 8, 10, 14], algoStep: 2,
      tag: 'ENTER —', note: `dfs(${r}, ${c}): ch = '${board[r][c]}', node.next['${board[r][c]}'] exists, path = "${prefix()}" (${path.length} cell${path.length === 1 ? '' : 's'} used)`,
    });
    const w = wordAt.get(next);
    if (w !== undefined && !foundNode.has(next)) {
      foundNode.add(next);
      found.push(w);
      flash = true;
      push({
        title: `Found "${w}"`, desc: `This trie node ends the word "${w}". Record it once; the search continues because longer words may share this path.`,
        logic: 'Marking the word as found (word = null) prevents duplicates when the same word is reachable by another path.', logicTone: 'success',
        javaLines: [14, 15, 16], pyLines: [11, 12, 13], algoStep: 3,
        tag: 'FOUND —', note: `node.word = "${w}" → found.add("${w}"), node.word = null (${found.length} found)`,
      });
      flash = false;
    }
    for (const [dr, dc] of DIRS) dfs(r + dr, c + dc, next);
    used.delete(`${r},${c}`);
    path.pop();
    nodePath.pop();
  };

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      start = `(${r}, ${c})`;
      if (trie.child(0, board[r][c]) === null) {
        path = [[r, c]];
        nodePath = [0];
        push({
          title: `Skip (${r}, ${c}) '${board[r][c]}'`, desc: `No word starts with '${board[r][c]}', so no search begins here.`,
          logic: 'The root has no such child: a one-letter check replaces a whole DFS.', logicTone: 'warn',
          javaLines: [3, 4, 5, 12], pyLines: [18, 19, 20, 8], algoStep: 1,
          tag: 'SKIP —', alert: `No word starts with '${board[r][c]}': cell (${r}, ${c}) cannot begin a path`,
          note: `r=${r}, c=${c}: root.next['${board[r][c]}'] == null → return`,
        });
        path = [];
        nodePath = [0];
        continue;
      }
      dfs(r, c, 0);
    }
  }
  path = [];
  nodePath = [0];
  start = '—';
  steps.push({
    title: 'Done', desc: found.length ? `Found ${found.length} word${found.length === 1 ? '' : 's'}: ${found.join(', ')}.` : 'None of the words can be traced on the board.',
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'Every cell was tried as a start; each path was extended only while it matched a trie prefix.', logicTone: 'success',
    javaLines: [6], pyLines: [21], algoStep: 4,
    tag: '✅ Done!', note: `return found = [${found.join(', ')}]`,
    result: { title: `[${found.join(', ')}]`, text: found.length ? 'Words found on the board (discovery order)' : 'No word can be formed' },
  });
  return steps;
}

export const wordSearchII: ProblemDef<In> = {
  slug: '212-word-search-ii',
  id: '212', title: 'Word Search II', difficulty: 'Hard', category: 'Trie', tag: 'trie + backtrack',
  statement: 'Given a grid of letters and a list of words, return every word that can be traced on the grid by moving between horizontally or vertically adjacent cells, using each cell at most once per word.',
  constraints: 'board up to 12 × 12, up to 3·10⁴ words (animation input: board ≤ 4 × 4 with lowercase letters, ≤ 4 words of ≤ 6 letters; write "rows | words")',
  examples: [
    { label: 'oaan etae ihkr iflv | oath pea eat rain', input: { board: ['oaan', 'etae', 'ihkr', 'iflv'], words: ['oath', 'pea', 'eat', 'rain'] }, output: '[oath, eat]' },
    { label: 'ab cd | abcb', input: { board: ['ab', 'cd'], words: ['abcb'] }, output: '[]' },
    { label: 'abc def | abe bad fed', input: { board: ['abc', 'def'], words: ['abe', 'bad', 'fed'] }, output: '[abe, bad, fed]' },
  ],
  inputPlaceholder: 'e.g. oaan etae ihkr iflv | oath pea eat rain',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current cell / trie node', state: 'active' }, { label: 'Path so far', state: 'compare' }, { label: 'Word completed', state: 'found' }],
  emphasis: ['every word', 'traced', 'adjacent', 'at most once'],
  varLabels: ['start', 'prefix', 'found'],
  phases: [
    { icon: '🌳', label: 'Phase 1: Build trie', tone: 'blue' },
    { icon: '🔦', label: 'Phase 2: Try start cell', tone: 'cyan' },
    { icon: '🧭', label: 'Phase 3: DFS along trie', tone: 'green' },
    { icon: '🏆', label: 'Phase 4: Word found', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Trie of words + DFS with backtracking',
    text: 'Insert all words into a trie. Run a DFS from every cell, moving along the trie as you move across the board. If the current letter has no child in the trie, stop: no word has that prefix. When a node ends a word, record it. Mark cells as used during a path and restore them when backtracking.',
  },
  java: [
    'public List<String> findWords(char[][] board, String[] words) {',
    '    TrieNode root = buildTrie(words);          // node.word set at word ends',
    '    List<String> found = new ArrayList<>();',
    '    for (int r = 0; r < board.length; r++)',
    '        for (int c = 0; c < board[0].length; c++)',
    '            dfs(board, r, c, root, found);',
    '    return found;',
    '}',
    '',
    'private void dfs(char[][] b, int r, int c, TrieNode node, List<String> found) {',
    '    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length) return;',
    '    char ch = b[r][c];',
    "    if (ch == '#' || node.next[ch - 'a'] == null) return;   // used or no prefix",
    "    node = node.next[ch - 'a'];",
    '    if (node.word != null) {',
    '        found.add(node.word);',
    '        node.word = null;                      // avoid duplicates',
    '    }',
    "    b[r][c] = '#';",
    '    dfs(b, r + 1, c, node, found);',
    '    dfs(b, r - 1, c, node, found);',
    '    dfs(b, r, c + 1, node, found);',
    '    dfs(b, r, c - 1, node, found);',
    '    b[r][c] = ch;                              // backtrack',
    '}',
    '',
    'static class TrieNode {',
    '    TrieNode[] next = new TrieNode[26];',
    '    String word;                               // set where a word ends',
    '}',
    '',
    'private TrieNode buildTrie(String[] words) {',
    '    TrieNode root = new TrieNode();',
    '    for (String w : words) {',
    '        TrieNode node = root;',
    '        for (char ch : w.toCharArray()) {',
    "            if (node.next[ch - 'a'] == null) node.next[ch - 'a'] = new TrieNode();",
    "            node = node.next[ch - 'a'];",
    '        }',
    '        node.word = w;',
    '    }',
    '    return root;',
    '}',
  ],
  python: [
    'def find_words(board, words):',
    '    root = build_trie(words)                   # node.word set at word ends',
    '    found = []',
    '    R, C = len(board), len(board[0])',
    '    def dfs(r, c, node):',
    '        if not (0 <= r < R and 0 <= c < C):',
    '            return',
    '        ch = board[r][c]',
    "        if ch == '#' or ch not in node.next:   # used or no prefix",
    '            return',
    '        node = node.next[ch]',
    '        if node.word:',
    '            found.append(node.word)',
    '            node.word = None                   # avoid duplicates',
    "        board[r][c] = '#'",
    '        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
    '            dfs(r + dr, c + dc, node)',
    '        board[r][c] = ch                       # backtrack',
    '    for r in range(R):',
    '        for c in range(C):',
    '            dfs(r, c, root)',
    '    return found',
    '',
    'class TrieNode:',
    '    def __init__(self):',
    '        self.next = {}',
    '        self.word = None                       # set where a word ends',
    '',
    'def build_trie(words):',
    '    root = TrieNode()',
    '    for w in words:',
    '        node = root',
    '        for ch in w:',
    '            node = node.next.setdefault(ch, TrieNode())',
    '        node.word = w',
    '    return root',
  ],
  algorithm: [
    'Build a trie from all the words (store the word at its last node)',
    'Try every cell as a starting point; skip it if no word starts with its letter',
    'DFS: step to an unused neighbour only if the trie has a matching child',
    'When the current trie node holds a word, add it to the answer (once)',
    'Mark cells used while exploring and un-mark them on the way back; return the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(R·C·3^L)' }, { label: 'Space', value: 'O(total word letters)' }],
  why: 'Searching each word separately repeats the same board walks. The trie merges all words so one DFS tests every word that shares a prefix at once, and the "no child" test cuts off any path that cannot lead to a word. Restoring each cell after exploring it ensures that different paths can reuse cells, while a single path never does.',
};
