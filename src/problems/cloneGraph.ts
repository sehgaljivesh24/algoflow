import type { Aux, CellState, EdgeState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../engine/types';
import { plural, verb } from './text.ts';
import { fixedCoords } from '../components/graphLayout.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Connected undirected graph on nodes 1..n (like LeetCode's adjacency list), written "n edges". */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Write n, then edges, e.g. 4 1-2 2-3 3-4 4-1');
  const n = Number(toks[0]);
  if (n < 1 || n > 7) throw new Error('Use between 1 and 7 nodes');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 1, hi: n, max: 12, example: '1-2 2-3 3-4 4-1', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of nodes may appear only once');
  const p = Array.from({ length: n + 1 }, (_, i) => i);
  const find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])));
  edges.forEach((e) => { p[find(e.u)] = find(e.v); });
  if (new Set(Array.from({ length: n }, (_, i) => find(i + 1))).size !== 1) throw new Error('The graph must be connected (every node reachable from node 1)');
  return { n, edges };
}

const adjOf = (n: number, edges: EdgeIn[]): number[][] => {
  const adj: number[][] = Array.from({ length: n + 1 }, () => []);
  edges.forEach((e) => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
  adj.forEach((l) => l.sort((a, b) => a - b));
  return adj;
};

function build({ n, edges }: In): Step[] {
  const adj = adjOf(n, edges);
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const coords = fixedCoords(ids.map((id) => ({ id })), edges.map((e) => ({ from: e.u, to: e.v })));
  const copy = new Array<boolean>(n + 1).fill(false);
  const cloneAdj: number[][] = Array.from({ length: n + 1 }, () => []);
  const stack: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let probe: [number, number] | null = null;
  let flash: number | null = null; // clone node just created

  const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const scene = () => {
    const left: GraphNodeVM[] = ids.map((id) => ({ id, label: id, x: coords.get(id)!.x, y: coords.get(id)!.y, state: id === cur ? 'active' : copy[id] ? 'found' : undefined }));
    const lEdges: GraphEdgeVM[] = edges.map((e): GraphEdgeVM => ({ from: e.u, to: e.v, state: probe && edgeKey(probe[0], probe[1]) === edgeKey(e.u, e.v) ? 'active' : 'default' }));
    const right: GraphNodeVM[] = ids.map((id) => {
      const state: CellState | undefined = id === flash ? 'active' : copy[id] ? 'found' : 'dim';
      return { id, label: `${id}'`, x: coords.get(id)!.x, y: coords.get(id)!.y, state };
    });
    const linked = new Set<string>();
    cloneAdj.forEach((l, u) => l.forEach((v) => linked.add(edgeKey(u, v))));
    const rEdges: GraphEdgeVM[] = edges.filter((e) => linked.has(edgeKey(e.u, e.v))).map((e): GraphEdgeVM => {
      const st: EdgeState = probe && edgeKey(probe[0], probe[1]) === edgeKey(e.u, e.v) ? 'active' : 'chosen';
      return { from: e.u, to: e.v, state: st };
    });
    return {
      kind: 'split' as const,
      parts: [
        { kind: 'graph' as const, nodes: left, edges: lEdges },
        { kind: 'graph' as const, nodes: right, edges: rEdges },
      ],
    };
  };
  const aux = (): Aux[] => [
    { title: 'copies map: original → clone', kind: 'map', items: ids.filter((id) => copy[id]).map((id) => `${id} → ${id}'`) },
    { title: 'recursion stack', kind: 'stack', items: stack.map((id) => `clone(${id})`) },
  ];
  const vars = () => ({ node: cur ?? '—', copies: copy.filter(Boolean).length, 'links made': cloneAdj.reduce((s, l) => s + l.length, 0) });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Original graph on the left (${n} node${n === 1 ? '' : 's'}, ${edges.length} edge${edges.length === 1 ? '' : 's'}). The copy on the right starts with no nodes (faded).`,
    logic: 'A deep copy needs a brand-new node for every original node. A map from original to copy stops us from cloning a node twice (or looping forever on cycles).', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, tag: 'READY —', note: `copies = {}, cloneGraph(1) is called`,
  });

  const dfs = (u: number) => {
    stack.push(u);
    cur = u;
    copy[u] = true;
    flash = u;
    push({
      title: `clone(${u}): no copy yet, create ${u}'`, tag: 'CLONE',
      desc: `clone(${u}): node ${u} is not in the map, so create ${u}' and record ${u} → ${u}' before visiting neighbours`,
      logic: 'Recording the copy BEFORE recursing is what makes cycles safe: a neighbour that loops back finds the copy already waiting.', logicTone: 'success',
      javaLines: [3, 4, 5], pyLines: [3, 5, 6], algoStep: 1, note: `copies.put(${u}, ${u}'), map size ${copy.filter(Boolean).length}`,
    });
    flash = null;
    for (const v of adj[u]) {
      cur = u;
      probe = [u, v];
      if (!copy[v]) {
        push({
          title: `${u}' needs neighbour ${v}: recurse`, tag: 'RECURSE', desc: `neighbour ${v} of ${u} has not been cloned yet, so call clone(${v})`,
          logic: 'Depth-first: finish cloning the new neighbour (and everything behind it) first.', logicTone: 'info',
          javaLines: [6, 7], pyLines: [7, 8], algoStep: 2, note: `cloneGraph(${v}), stack depth ${stack.length + 1}`,
        });
        dfs(v);
        cur = u;
        probe = [u, v];
        cloneAdj[u].push(v);
        push({
          title: `Link ${u}' → ${v}'`, tag: 'LINK', desc: `clone(${v}) returned ${v}', so add ${v}' to the neighbours of ${u}'`,
          logic: 'The returned copy is appended to the current copy’s neighbour list.', logicTone: 'success',
          javaLines: [7], pyLines: [8], algoStep: 3, note: `${u}'.neighbors.add(${v}'), now ${cloneAdj[u].length} link${cloneAdj[u].length === 1 ? '' : 's'}`,
        });
      } else {
        cloneAdj[u].push(v);
        push({
          title: `${v} already has a copy: link ${u}' → ${v}'`, tag: 'CACHE HIT',
          desc: `the map already holds ${v} → ${v}', so clone(${v}) returns it at once and ${u}' just links to ${v}'`,
          alert: `${v} is already copied: the recursion stops here, which is what makes cycles safe.`,
          logic: 'This is the cache hit that stops the recursion on cycles and on shared neighbours.', logicTone: 'warn',
          javaLines: [3, 7], pyLines: [3, 4, 8], algoStep: 1, note: `copies.containsKey(${v}) → return ${v}'; ${u}'.neighbors.add(${v}')`,
        });
      }
      probe = null;
    }
    stack.pop();
    cur = stack.length ? stack[stack.length - 1] : null;
  };
  dfs(1);

  cur = null;
  probe = null;
  const result = `[${cloneAdj.slice(1).map((l) => `[${l.join(', ')}]`).join(', ')}]`;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `all ${plural(n, 'node')} ${verb(n, 'is', 'are')} copied and all ${plural(edges.length, 'edge')} ${verb(edges.length, 'is', 'are')} linked from both sides, so the right graph is an independent deep copy`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'Every original node has exactly one copy, and each copy’s neighbours are copies, never originals.', logicTone: 'success',
    javaLines: [9], pyLines: [9, 10], algoStep: 4, note: `return the copy of node 1, ${plural(n, 'copy', 'copies')} in the map`,
    result: { title: result, text: 'Adjacency list of the cloned graph' },
  });
  return steps;
}

const mk = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => { const [u, v] = t.split('-').map(Number); return { u, v }; }) : [] });

export const cloneGraph: ProblemDef<In> = {
  slug: '133-clone-graph',
  id: '133', title: 'Clone Graph', difficulty: 'Medium', category: 'Graph', tag: 'DFS + hash map',
  statement: 'Given a reference to a node of a connected undirected graph, return a deep copy of the whole graph: new nodes with the same values, wired to each other the same way.',
  constraints: '0 ≤ nodes ≤ 100, values 1 to n, no repeated edges or self-loops (animation input: 1–7 nodes, ≤ 12 edges; write "n" then edges like 1-2 2-3)',
  examples: [
    { label: '4 | 1-2 2-3 3-4 4-1', input: mk(4, '1-2 2-3 3-4 4-1'), output: '[[2, 4], [1, 3], [2, 4], [1, 3]]' },
    { label: '1 |', input: mk(1, ''), output: '[[]]' },
    { label: '5 | 1-2 1-3 2-4 3-4 4-5', input: mk(5, '1-2 1-3 2-4 3-4 4-5'), output: '[[2, 3], [1, 4], [1, 4], [2, 3, 5], [4]]' },
  ],
  inputPlaceholder: 'e.g. 4 1-2 2-3 3-4 4-1   (n, then edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node being cloned', state: 'active' }, { label: 'Has a copy', state: 'found' }, { label: 'Not copied yet', state: 'dim' }],
  varLabels: ['node', 'copies', 'links made'],
  emphasis: ['deep copy', 'connected undirected graph'],
  phases: [
    { icon: '🗺', label: 'EMPTY MAP', tone: 'blue' },
    { icon: '🧬', label: 'CHECK MAP / CLONE node', tone: 'cyan' },
    { icon: '↘', label: 'RECURSE into neighbour', tone: 'green' },
    { icon: '🔗', label: 'LINK copies', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'DFS with a map from original to copy',
    text: 'Call clone(node). If the node already has a copy in the map, return it. Otherwise create the copy, store it in the map right away, then clone every neighbour recursively and add the returned copies to the new node’s neighbour list.',
  },
  java: [
    'private Map<Node, Node> copies = new HashMap<>();',
    'public Node cloneGraph(Node node) {',
    '    if (node == null) return null;',
    '    if (copies.containsKey(node)) return copies.get(node);',
    '    Node copy = new Node(node.val);',
    '    copies.put(node, copy);              // store BEFORE recursing',
    '    for (Node nb : node.neighbors) {',
    '        copy.neighbors.add(cloneGraph(nb));',
    '    }',
    '    return copy;',
    '}',
  ],
  python: [
    'def clone_graph(node):',
    '    copies = {}',
    '    def dfs(cur):',
    '        if cur in copies:',
    '            return copies[cur]',
    '        copy = Node(cur.val)',
    '        copies[cur] = copy              # store BEFORE recursing',
    '        for nb in cur.neighbors:',
    '            copy.neighbors.append(dfs(nb))',
    '        return copy',
    '    return dfs(node) if node else None',
  ],
  algorithm: [
    'Start with an empty map of original → copy',
    'If the node is in the map return its copy; else create the copy and store it',
    'For each neighbour call clone recursively',
    'Add each returned copy to the new node’s neighbours',
    'Return the copy of the starting node',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'The map guarantees one copy per original node: the copy is stored before any neighbour is visited, so a cycle or shared neighbour hits the map instead of recursing again. Because every neighbour link is built from the returned copies, the new graph never points back into the old one, and each node and edge is processed once.',
};
