import type { Aux, CellState, ProblemDef, Step, TreeNodeVM } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, listAux, parseTree, stackAux, toLevelOrder, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public String serialize(TreeNode root) {',
  '    StringBuilder sb = new StringBuilder();',
  '    write(root, sb);',
  '    return sb.toString();',
  '}',
  'private void write(TreeNode n, StringBuilder sb) {',
  '    if (n == null) { sb.append("#,"); return; }',
  '    sb.append(n.val).append(",");',
  '    write(n.left, sb);',
  '    write(n.right, sb);',
  '}',
  'public TreeNode deserialize(String data) {',
  '    Queue<String> q = new LinkedList<>(Arrays.asList(data.split(",")));',
  '    return read(q);',
  '}',
  'private TreeNode read(Queue<String> q) {',
  '    String t = q.poll();',
  '    if (t.equals("#")) return null;',
  '    TreeNode n = new TreeNode(Integer.parseInt(t));',
  '    n.left = read(q);',
  '    n.right = read(q);',
  '    return n;',
  '}',
];
const python = [
  'def serialize(root):',
  '    out = []',
  '    def write(n):',
  '        if not n:',
  '            out.append("#")',
  '            return',
  '        out.append(str(n.val))',
  '        write(n.left)',
  '        write(n.right)',
  '    write(root)',
  '    return ",".join(out)',
  '',
  'def deserialize(data):',
  '    it = iter(data.split(","))',
  '    def read():',
  '        t = next(it)',
  '        if t == "#":',
  '            return None',
  '        n = TreeNode(int(t))',
  '        n.left = read()',
  '        n.right = read()',
  '        return n',
  '    return read()',
];
const J = {
  s0: find(java, 'write(root, sb);'), sNull: find(java, 'if (n == null) { sb.append'), sVal: find(java, 'sb.append(n.val)'), sKids: find(java, ['write(n.left, sb)', 1], ['write(n.right, sb)', 1]), sRet: find(java, 'return sb.toString()'),
  d0: find(java, 'Queue<String> q', 'return read(q)'), dTok: find(java, 'String t = q.poll()'), dNull: find(java, 'if (t.equals("#"))'), dNode: find(java, 'new TreeNode(Integer'), dKids: find(java, 'n.left = read(q)', 'n.right = read(q)'), dRet: find(java, 'return n;'),
};
const P = {
  s0: find(python, 'write(root)'), sNull: find(python, 'if not n', 'out.append("#")'), sVal: find(python, 'out.append(str(n.val))'), sKids: find(python, 'write(n.left)', 'write(n.right)'), sRet: find(python, 'return ",".join'),
  d0: find(python, 'it = iter', 'return read()'), dTok: find(python, 't = next(it)'), dNull: find(python, 'if t == "#"', 'return None'), dNode: find(python, 'n = TreeNode(int(t))'), dKids: find(python, 'n.left = read()', 'n.right = read()'), dRet: find(python, 'return n'),
};

function build({ tokens }: TreeIn): Step[] {
  const orig = buildTree(tokens);
  let cur: TreeNodeVM[] = orig;
  let curRoot: number | null = 0;
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const written: string[] = [];
  let phase = 'serialize';
  let readPtr = 0;
  const val = (id: number) => Number(orig[id].value);
  const { steps, add } = emitter(() => treeScene(cur, states, labels, curRoot));
  const aux = (): Aux[] =>
    phase === 'serialize'
      ? [listAux('serialized tokens so far', written), stackAux('call stack: write(node)', stack)]
      : [listAux('tokens to read (highlight = next)', written, readPtr < written.length ? readPtr : undefined), stackAux('call stack: read()', stack)];
  const vars = (token: string | number) => ({ phase, token, tokens: phase === 'serialize' ? written.length : readPtr });

  add({
    title: 'Start: serialize', desc: 'Turn the tree into a string. Walk it in preorder, writing each value, and write "#" for every missing child.',
    logic: 'Writing the nulls is what makes the string unambiguous: preorder alone cannot tell where a subtree ends, but "#" markers can.',
    j: J.s0, p: P.s0, a: 0, vars: vars('—'), aux: aux(),
  });

  const write = (id: number | null) => {
    if (id === null) {
      written.push('#');
      add({
        title: 'Write #', desc: 'Missing child: append "#" to the string.', logic: 'Every null child gets a marker so the structure can be rebuilt exactly.',
        tone: 'warn', j: J.sNull, p: P.sNull, a: 1, vars: vars('#'), aux: aux(),
      });
      return;
    }
    stack.push(`write(${val(id)})`);
    written.push(String(val(id)));
    states[id] = 'active';
    add({
      title: `Write ${val(id)}`, desc: `Append ${val(id)}, then serialize its left subtree, then its right subtree.`,
      logic: 'Node first, then left, then right — preorder.', j: [...J.sVal, ...J.sKids], p: [...P.sVal, ...P.sKids], a: 1, vars: vars(val(id)), aux: aux(),
    });
    write(orig[id].left);
    write(orig[id].right);
    states[id] = 'found';
    stack.pop();
  };
  write(0);

  const text = written.join(',');
  add({
    title: 'Serialized', desc: `The string is "${text}" (${written.length} tokens = ${orig.length} values + ${orig.length + 1} markers).`,
    logic: 'Now rebuild a fresh tree from this string alone.', tone: 'success', j: J.sRet, p: P.sRet, a: 2, vars: vars('—'), aux: aux(),
  });

  // ---- phase 2: deserialize into a brand-new tree
  phase = 'deserialize';
  cur = [];
  curRoot = null;
  for (const k of Object.keys(states)) delete states[+k];
  stack.length = 0;
  add({
    title: 'Start: deserialize', desc: 'Read the tokens from left to right with one shared pointer, creating nodes in the same preorder.',
    logic: 'Each call to read() consumes one token: "#" means null, a number means a node followed by its left and right subtree tokens.',
    j: J.d0, p: P.d0, a: 3, vars: vars('—'), aux: aux(),
  });

  const read = (parent: number | null, side: 'left' | 'right') => {
    const t = written[readPtr++];
    if (t === '#') {
      add({
        title: 'Read # → null', desc: `Token "${t}" means this child is empty; return null.`, logic: 'Nothing is created and no further tokens are consumed for this child.', tone: 'warn',
        j: [...J.dTok, ...J.dNull], p: [...P.dTok, ...P.dNull], a: 3, vars: vars('#'), aux: aux(),
      });
      return;
    }
    const id = cur.length;
    cur = [...cur, { id, value: Number(t), left: null, right: null }];
    if (curRoot === null) curRoot = 0;
    if (parent !== null) cur[parent] = { ...cur[parent], [side]: id };
    stack.push(`read() → ${t}`);
    states[id] = 'active';
    add({
      title: `Read ${t} → new node`, desc: `Create a node ${t}${parent === null ? ' as the root' : ` as the ${side} child of ${cur[parent].value}`}, then read its left subtree, then its right.`,
      logic: 'Left subtree tokens come first in the string, so the left recursion runs before the right.', tone: 'success',
      j: [...J.dTok, ...J.dNode, ...J.dKids], p: [...P.dTok, ...P.dNode, ...P.dKids], a: 3, vars: vars(t), aux: aux(),
    });
    states[id] = 'compare';
    read(id, 'left');
    read(id, 'right');
    states[id] = 'found';
    stack.pop();
  };
  read(null, 'left');

  const rebuilt = toLevelOrder(cur, 0);
  add({
    title: 'Done', desc: `All ${written.length} tokens consumed. The rebuilt tree (level order ${rebuilt}) matches the original ${toLevelOrder(orig, 0)}.`,
    logic: 'Serialization and deserialization visit nodes in the same preorder, so they are exact inverses.', tone: 'success',
    j: J.dRet, p: P.dRet, a: 3, vars: vars('—'), aux: aux(), result: { title: text, text: 'Serialized string (deserializes back to the same tree)' },
  });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: /^Start: serialize/, tag: 'INIT —', note: 'sb = [] ; serialize(root)', algoStep: 0 },
    { on: /^Write #/, tag: '∅ WRITE # —', note: () => 'node == null → append "#"', algoStep: 0 },
    { on: /^Write (-?\d+)/, tag: 'WRITE —', note: (m, s) => `append ${m[1]} → ${s.vars.tokens} tokens; then left, then right`, algoStep: 0 },
    { on: /^Serialized/, tag: 'JOIN —', note: () => 'String.join(",", tokens)', algoStep: 1 },
    { on: /^Start: deserialize/, tag: 'READ —', note: () => 'idx = 0; read tokens in the same preorder', algoStep: 2 },
    { on: /^Read # → null/, tag: '∅ READ # —', note: () => 'token "#" → return null', algoStep: 3 },
    { on: /^Read (-?\d+) → new node/, tag: '🌱 READ —', note: (m) => `node = new TreeNode(${m[1]}); left = read(); right = read()`, algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `all tokens consumed → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const serializeDeserializeTree: ProblemDef<TreeIn> = {
  slug: '297-serialize-and-deserialize-binary-tree',
  id: '297', title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'Tree', tag: 'BFS / DFS encode',
  statement: 'Design an encoding that turns a binary tree into a string and a decoder that rebuilds the identical tree from that string. This animation uses preorder with "#" markers for null children.',
  constraints: '0 ≤ nodes ≤ 10⁴ (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 2 3 null null 4 5', input: { tokens: [1, 2, 3, null, null, 4, 5] }, output: '1,2,#,#,3,4,#,#,5,#,#' },
    { label: '1 null 2', input: { tokens: [1, null, 2] }, output: '1,#,2,#,#' },
    { label: '5', input: { tokens: [5] }, output: '5,#,#' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 null null 4 5',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Being written / created', state: 'active' }, { label: 'Waiting on its subtrees', state: 'compare' }, { label: 'Done', state: 'found' }],
  varLabels: ['phase', 'token', 'tokens'],
  emphasis: ['serialize', 'deserialize', 'string'],
  phases: [
    { icon: '📤', label: 'Serialize: preorder walk', tone: 'blue' },
    { icon: '🔗', label: 'Join the tokens', tone: 'cyan' },
    { icon: '📥', label: 'Deserialize: shared pointer', tone: 'gold' },
    { icon: '🌱', label: '# → null, number → node', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Preorder with null markers',
    text: 'Serialize with a preorder walk, writing "#" for each null child. Deserialize by reading tokens in order: a "#" returns null, a number creates a node whose left and right subtrees are read next, recursively.',
  },
  java, python,
  algorithm: [
    'Serialize: preorder walk; write the value, or "#" for null',
    'Join the tokens with commas to get the string',
    'Deserialize: read tokens with one shared pointer',
    '"#" → null; a number → create node, read its left subtree, then its right subtree',
    'The rebuilt tree equals the original, so the string describes the tree exactly',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'With null markers every node writes exactly two child slots, so the token stream describes a full binary structure: whenever read() sees "#" a subtree ends. Because both directions use the same preorder (node, left, right), the left recursion in read() consumes precisely the tokens that write() produced for the left subtree, leaving the pointer at the right subtree’s first token.',
};
