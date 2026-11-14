import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';

interface Eq { a: string; b: string; v: number }
interface In { eqs: Eq[]; queries: [string, string][] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Write equations, a "|", then queries, e.g. a/b=2 b/c=3 | a/c c/a a/e');
  const eqToks = parts[0].split(/[\s,;]+/).filter(Boolean);
  const qToks = parts[1].split(/[\s,;]+/).filter(Boolean);
  if (!eqToks.length || eqToks.length > 6) throw new Error('Give 1 to 6 equations like a/b=2');
  if (!qToks.length || qToks.length > 3) throw new Error('Give 1 to 3 queries like a/c');
  const eqs = eqToks.map((t) => {
    const m = /^([a-z])\/([a-z])=(\d+(?:\.\d+)?)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not an equation. Write it like a/b=2 (single lowercase letters, positive value)`);
    const v = Number(m[3]);
    if (!(v > 0) || v > 99) throw new Error('Equation values must be between 0 and 99');
    if (m[1] === m[2]) throw new Error('Use two different variables in each equation');
    return { a: m[1], b: m[2], v };
  });
  const names = new Set(eqs.flatMap((e) => [e.a, e.b]));
  if (names.size > 7) throw new Error('Use at most 7 different variables');
  if (new Set(eqs.map((e) => [e.a, e.b].sort().join(''))).size !== eqs.length) throw new Error('Each pair of variables may appear in only one equation');
  const queries = qToks.map((t) => {
    const m = /^([a-z])\/([a-z])$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a query. Write it like a/c`);
    return [m[1], m[2]] as [string, string];
  });
  // equations must agree with each other (otherwise the answer would depend on the path taken)
  const val = new Map<string, number>();
  const adj = new Map<string, [string, number][]>();
  for (const e of eqs) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), [e.b, 1 / e.v]]); // a = v*b  => b = a / v
    adj.set(e.b, [...(adj.get(e.b) ?? []), [e.a, e.v]]);
  }
  for (const root of [...names].sort()) {
    if (val.has(root)) continue;
    val.set(root, 1);
    const q = [root];
    for (let h = 0; h < q.length; h++) for (const [nx, f] of adj.get(q[h])!) if (!val.has(nx)) { val.set(nx, val.get(q[h])! * f); q.push(nx); }
  }
  for (const e of eqs) {
    if (Math.abs(val.get(e.a)! / val.get(e.b)! - e.v) > 1e-9 * Math.max(1, e.v)) throw new Error('These equations contradict each other (the cycle does not multiply out consistently)');
  }
  return { eqs, queries };
}

const fmtVal = (x: number) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(4)));
const fmtAns = (x: number) => x.toFixed(5);

function build({ eqs, queries }: In): Step[] {
  const names = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
  const id = new Map(names.map((nm, i) => [nm, i]));
  // adjacency: [neighbour id, factor, edge index]
  const adj: [number, number, number][][] = names.map(() => []);
  eqs.forEach((e, i) => {
    adj[id.get(e.a)!].push([id.get(e.b)!, e.v, i]);
    adj[id.get(e.b)!].push([id.get(e.a)!, 1 / e.v, i]);
  });
  const answers: number[] = [];
  const steps: Step[] = [];
  let qi = -1;
  let src = -1;
  let dst = -1;
  let cur: number | null = null;
  const prod = new Map<number, number>();
  const parentEdge = new Map<number, number>();
  const eState: EdgeState[] = eqs.map(() => 'default');
  const queue: number[] = [];
  let pathNodes: number[] = [];

  const scene = () => {
    const nodes = names.map((nm, i) => {
      const state: CellState | undefined = pathNodes.includes(i) ? 'found' : i === cur ? 'active' : queue.includes(i) ? 'compare' : prod.has(i) ? 'swap' : undefined;
      return { id: i, label: nm, state, tag: prod.has(i) ? `×${fmtVal(prod.get(i)!)}` : undefined };
    });
    const edges = eqs.map((e, i): GraphEdgeVM => ({ from: id.get(e.a)!, to: id.get(e.b)!, weight: fmtVal(e.v), directed: true, state: eState[i] }));
    const pointers: Pointer[] = src >= 0 ? [{ id: 'from', label: 'from', index: src, tone: 'green' }, ...(dst !== src ? [{ id: 'to', label: 'to', index: dst, tone: 'purple' as const }] : [])] : [];
    return { kind: 'graph' as const, nodes, edges, pointers };
  };
  const aux = (): Aux[] => [
    { title: 'queue (node, product so far)', kind: 'queue', items: queue.map((n) => `${names[n]}: ${fmtVal(prod.get(n)!)}`) },
    { title: 'answers so far', kind: 'list', items: answers.map(fmtAns) },
  ];
  const vars = () => ({ query: qi >= 0 ? `${queries[qi][0]}/${queries[qi][1]}` : '—', node: cur === null ? '—' : names[cur], product: cur === null ? '—' : fmtVal(prod.get(cur) ?? 1), answers: `[${answers.map(fmtAns).join(', ')}]` });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', tag: 'BUILD —', desc: `each equation a/b = k becomes an arrow a → b weighted k plus the reverse b → a weighted 1/k, giving ${names.length} nodes and ${eqs.length * 2} arrows.`,
    logic: 'Divisions chain: (a/b) × (b/c) = a/c. So a query is a path product in a weighted graph.', logicTone: 'info',
    javaLines: [1, 2, 3, 4, 5, 6], pyLines: [1, 2, 3, 4], algoStep: 0, note: `${eqs.length} equations → ${eqs.length * 2} weighted arrows`,
  });

  queries.forEach(([x, y], k) => {
    qi = k;
    prod.clear();
    parentEdge.clear();
    queue.length = 0;
    eState.fill('default');
    pathNodes = [];
    cur = null;
    src = id.get(x) ?? -1;
    dst = id.get(y) ?? -1;
    if (src < 0 || dst < 0) {
      answers.push(-1);
      const unknown = id.has(x) ? y : x;
      src = -1;
      push({
        title: `Query ${x}/${y}: unknown variable`, tag: 'UNKNOWN:', desc: `query ${k + 1} asks ${x}/${y}, but ${unknown} never appears in an equation, so the answer is −1.`,
        alert: `Variable ${unknown} is not in any equation: ${x}/${y} cannot be determined (−1).`,
        logic: 'A variable without any equation cannot be related to anything.', logicTone: 'warn',
        javaLines: [14], pyLines: [6, 7], algoStep: 1, note: `${unknown} not in graph → −1`,
      });
      return;
    }
    prod.set(src, 1);
    queue.push(src);
    push({
      title: `Query ${x}/${y}: BFS from ${x}`, tag: 'QUERY:', desc: `query ${k + 1} asks ${x}/${y}: start BFS at ${x} with product 1 and search for ${y}.`,
      logic: 'The product at the start is 1 (x/x = 1). Each step multiplies by the edge weight.', logicTone: 'info',
      javaLines: [8, 9, 15, 16, 17], pyLines: [18, 8], algoStep: 1, note: `queue = [${x}:1], looking for ${y}`,
    });
    let found = false;
    while (queue.length) {
      const u = queue.shift()!;
      cur = u;
      if (u === dst) {
        found = true;
        answers.push(prod.get(u)!);
        // highlight the path back to the source
        let n = u;
        pathNodes = [n];
        while (parentEdge.has(n)) {
          const pe = parentEdge.get(n)!;
          eState[pe] = 'chosen';
          const e = eqs[pe];
          n = id.get(e.a)! === n ? id.get(e.b)! : id.get(e.a)!;
          pathNodes.push(n);
        }
        push({
          title: `Reached ${y}: ${x}/${y} = ${fmtVal(prod.get(u)!)}`, tag: 'ANSWER:', desc: `pop ${y}: the path ${[...pathNodes].reverse().map((p) => names[p]).join(' → ')} multiplies out to ${x}/${y} = ${fmtVal(prod.get(u)!)}.`,
          logic: 'The product of the weights on the path is the quotient.', logicTone: 'success',
          javaLines: [19, 20, 21], pyLines: [10, 11, 12], algoStep: 3, note: `${x}/${y} = ${fmtVal(prod.get(u)!)}`,
        });
        break;
      }
      push({
        title: `Pop ${names[u]} (product ${fmtVal(prod.get(u)!)})`, tag: 'POP:', desc: `pop ${names[u]} with product ${fmtVal(prod.get(u)!)}; it is not ${y}, so look at the equations that mention ${names[u]}.`,
        logic: 'Each neighbour’s product = this product × the edge factor.', logicTone: 'info',
        javaLines: [19, 20, 22], pyLines: [10, 13], algoStep: 2, note: `${names[u]}:${fmtVal(prod.get(u)!)} ≠ ${y}`,
      });
      for (const [v, f, ei] of adj[u]) {
        if (prod.has(v)) continue;
        prod.set(v, prod.get(u)! * f);
        parentEdge.set(v, ei);
        queue.push(v);
        eState[ei] = 'visited';
        push({
          title: `Discover ${names[v]}: ${fmtVal(prod.get(u)!)} × ${fmtVal(f)} = ${fmtVal(prod.get(v)!)}`, tag: 'PUSH:',
          desc: `${eqs[ei].a}/${eqs[ei].b} = ${fmtVal(eqs[ei].v)}, so ${x}/${names[v]} = ${fmtVal(prod.get(u)!)} × ${fmtVal(f)} = ${fmtVal(prod.get(v)!)}; queue ${names[v]}.`,
          logic: f === eqs[ei].v ? 'Walking along the arrow multiplies by its weight.' : 'Walking against the arrow multiplies by the reciprocal 1/k.', logicTone: 'success',
          javaLines: [22, 23, 24], pyLines: [13, 14, 15, 16], algoStep: 2, note: `${names[v]}: ${fmtVal(prod.get(u)!)} × ${fmtVal(f)} = ${fmtVal(prod.get(v)!)}`,
        });
      }
      cur = null;
    }
    if (!found) {
      answers.push(-1);
      cur = null;
      push({
        title: `${y} not reachable: ${x}/${y} = −1`, tag: 'ANSWER:', desc: `the queue emptied without reaching ${y}: no chain of equations relates ${x} and ${y}, so ${x}/${y} = −1.`,
        alert: `${x} and ${y} are in different components: no path, answer −1.`,
        logic: 'Variables in different components cannot be compared.', logicTone: 'warn',
        javaLines: [27], pyLines: [17], algoStep: 3, note: `queue empty → ${x}/${y} = −1`,
      });
    }
  });

  cur = null;
  pathNodes = [];
  prod.clear();
  queue.length = 0;
  eState.fill('default');
  src = -1;
  qi = -1;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `all ${queries.length} quer${queries.length === 1 ? 'y is' : 'ies are'} answered, in order: [${answers.map(fmtAns).join(', ')}].`,
    scene: scene(), aux: aux(), vars: vars(), note: `return [${answers.map(fmtAns).join(', ')}]`,
    logic: 'One BFS per query; the graph is built once.', logicTone: 'success',
    javaLines: [10], pyLines: [18], algoStep: 4,
    result: { title: `[${answers.map(fmtAns).join(', ')}]`, text: 'Results of the queries, in order' },
  });
  return steps;
}

const mk = (e: string, q: string): In => ({
  eqs: e.split(' ').map((t) => { const m = /^(\w)\/(\w)=(.+)$/.exec(t)!; return { a: m[1], b: m[2], v: Number(m[3]) }; }),
  queries: q.split(' ').map((t) => t.split('/') as [string, string]),
});

export const evaluateDivision: ProblemDef<In> = {
  slug: '399-evaluate-division',
  id: '399', title: 'Evaluate Division', difficulty: 'Medium', category: 'Graph', tag: 'weighted BFS',
  statement: 'You are given equations like a / b = 2.0 and queries like a / c. Use the equations to answer each query, or -1.0 if the answer cannot be determined.',
  constraints: 'Variables are strings, values are positive and consistent (animation input: single-letter variables, ≤ 6 equations, ≤ 3 queries; write "a/b=2 b/c=3 | a/c c/a a/e")',
  examples: [
    { label: 'a/b=2 b/c=3 | a/c b/a a/e a/a x/x', input: mk('a/b=2 b/c=3', 'a/c b/a a/e a/a x/x'), output: '[6.00000, 0.50000, -1.00000, 1.00000, -1.00000]' },
    { label: 'a/b=1.5 b/c=2.5 b/e=5 | a/c c/b b/e', input: mk('a/b=1.5 b/c=2.5 b/e=5', 'a/c c/b b/e'), output: '[3.75000, 0.40000, 5.00000]' },
    { label: 'a/b=0.5 c/d=4 | a/d', input: mk('a/b=0.5 c/d=4', 'a/d'), output: '[-1.00000]' },
  ],
  inputPlaceholder: 'e.g. a/b=2 b/c=3 | a/c c/a a/e   (equations | queries)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'In queue', state: 'compare' }, { label: 'Reached (product known)', state: 'swap' }, { label: 'On the answer path', state: 'found' }],
  varLabels: ['query', 'node', 'product', 'answers'],
  approach: {
    title: 'Graph of ratios, BFS per query',
    text: 'Treat each variable as a node. The equation a/b = k adds a→b with weight k and b→a with weight 1/k. To answer x/y, run a BFS from x, multiplying the weights along the way. When y is reached, the running product is the answer. Unknown variables or disconnected pairs give −1.',
  },
  java: [
    'public double[] calcEquation(List<List<String>> eq, double[] vals, List<List<String>> queries) {',
    '    Map<String, Map<String, Double>> g = new HashMap<>();',
    '    for (int i = 0; i < eq.size(); i++) {',
    '        String a = eq.get(i).get(0), b = eq.get(i).get(1);',
    '        g.computeIfAbsent(a, k -> new HashMap<>()).put(b, vals[i]);',
    '        g.computeIfAbsent(b, k -> new HashMap<>()).put(a, 1.0 / vals[i]);',
    '    }',
    '    double[] ans = new double[queries.size()];',
    '    for (int i = 0; i < ans.length; i++)',
    '        ans[i] = bfs(g, queries.get(i).get(0), queries.get(i).get(1));',
    '    return ans;',
    '}',
    '',
    'private double bfs(Map<String, Map<String, Double>> g, String src, String dst) {',
    '    if (!g.containsKey(src) || !g.containsKey(dst)) return -1.0;',
    '    Deque<Object[]> q = new ArrayDeque<>();',
    '    Set<String> seen = new HashSet<>(Set.of(src));',
    '    q.add(new Object[]{src, 1.0});',
    '    while (!q.isEmpty()) {',
    '        Object[] cur = q.poll();',
    '        String node = (String) cur[0]; double prod = (double) cur[1];',
    '        if (node.equals(dst)) return prod;',
    '        for (var e : g.get(node).entrySet()) {',
    '            if (seen.add(e.getKey()))',
    '                q.add(new Object[]{e.getKey(), prod * e.getValue()});',
    '        }',
    '    }',
    '    return -1.0;',
    '}',
  ],
  python: [
    'def calc_equation(equations, values, queries):',
    '    g = defaultdict(dict)',
    '    for (a, b), v in zip(equations, values):',
    '        g[a][b] = v',
    '        g[b][a] = 1 / v',
    '    def bfs(src, dst):',
    '        if src not in g or dst not in g:',
    '            return -1.0',
    '        q, seen = deque([(src, 1.0)]), {src}',
    '        while q:',
    '            node, prod = q.popleft()',
    '            if node == dst:',
    '                return prod',
    '            for nxt, w in g[node].items():',
    '                if nxt not in seen:',
    '                    seen.add(nxt)',
    '                    q.append((nxt, prod * w))',
    '        return -1.0',
    '    return [bfs(a, b) for a, b in queries]',
  ],
  phases: [
    { icon: '🔨', label: 'Build graph', tone: 'blue' },
    { icon: '❓', label: 'Start query', tone: 'cyan' },
    { icon: '🌊', label: 'BFS: pop / push', tone: 'green' },
    { icon: '🏆', label: 'Answer or −1', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['a / b = 2.0', 'a / c', '-1.0'],
  algorithm: [
    'Build a graph: a/b = k gives a→b weight k and b→a weight 1/k',
    'For each query x/y: if either variable is unknown, answer −1; otherwise start BFS at x',
    'BFS from x carrying the product of weights along the path',
    'When y is popped return its product; if the queue empties return −1',
    'Done: return the answers of all queries',
  ],
  complexity: [{ label: 'Time', value: 'O(Q · (V + E))' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'If a/b = k then walking from a to b multiplies a quotient by k, and walking back multiplies by 1/k. Because the equations are consistent, every path between two variables gives the same product, so any path (BFS finds one) gives x/y. Variables with no connecting chain of equations are genuinely unrelated, hence −1.',
};
