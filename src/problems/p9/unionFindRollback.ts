import type { Aux, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../../engine/types.ts';
import { recorder } from '../stepKit.ts';
import { TONES, forestLayout } from './kitA.ts';

type Op = { op: 'u' | 'q'; a: number; b: number } | { op: 'undo' };
interface In { n: number; ops: Op[] }

function parse(raw: string): In {
  const [head, tail, ...rest] = raw.split('|');
  const ex = '6 | u:0-1 u:1-2 q:0-2 undo q:0-2';
  if (tail === undefined || rest.length) throw new Error(`Write the node count, a bar, then the operations, e.g. ${ex}`);
  const n = Number(head.trim());
  if (!Number.isInteger(n) || n < 2 || n > 7) throw new Error('The number of nodes must be a whole number from 2 to 7');
  const toks = tail.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) throw new Error(`Give some operations: u:a-b (union), q:a-b (connected?) and undo, e.g. ${ex}`);
  if (toks.length > 12) throw new Error('Use at most 12 operations');
  const ops: Op[] = [];
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = Array.from({ length: n }, () => 1);
  const stack: [number, number][] = [];
  const find = (x: number): number => (parent[x] === x ? x : find(parent[x]));
  for (const t of toks) {
    if (/^undo$/i.test(t)) {
      const top = stack.pop();
      if (!top) throw new Error('"undo" needs an earlier union that changed something to roll back');
      parent[top[0]] = top[0];
      size[top[1]] -= size[top[0]];
      ops.push({ op: 'undo' });
      continue;
    }
    const m = /^([uq]):(\d+)-(\d+)$/i.exec(t);
    if (!m) throw new Error(`"${t}" is not an operation. Use u:0-1, q:0-2 or undo`);
    const a = Number(m[2]);
    const b = Number(m[3]);
    if (a >= n || b >= n) throw new Error(`Nodes are numbered 0 to ${n - 1} (saw "${t}")`);
    ops.push({ op: m[1].toLowerCase() as 'u' | 'q', a, b });
    if (m[1].toLowerCase() === 'u') {
      let c = find(a);
      let p = find(b);
      if (c !== p) {
        if (size[c] > size[p]) [c, p] = [p, c];
        parent[c] = p;
        size[p] += size[c];
        stack.push([c, p]);
      }
    }
  }
  if (!ops.some((o) => o.op === 'q')) throw new Error('Add at least one query like q:0-2');
  return { n, ops };
}

function build({ n, ops }: In): Step[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = Array.from({ length: n }, () => 1);
  const history: [number, number][] = [];
  const answers: string[] = [];
  const steps: Step[] = [];
  let hot: number[] = [];
  let hotEdges: number[] = [];
  let hotState: 'active' | 'found' | 'error' = 'active';
  let what = '—';
  let ra: string | number = '—';
  let rb: string | number = '—';

  const root = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const scene = () => {
    const lay = forestLayout(parent);
    const nodes: GraphNodeVM[] = parent.map((_p, i) => {
      const r = root(i);
      return { id: i, tone: size[r] > 1 ? TONES[r % TONES.length] : undefined, state: hot.includes(i) ? hotState : undefined, x: lay[i].x, y: lay[i].y };
    });
    const edges: GraphEdgeVM[] = parent.flatMap((p, i) => (p === i ? [] : [{ from: i, to: p, directed: true, state: hotEdges.includes(i) ? 'active' as const : 'chosen' as const }]));
    return { kind: 'graph' as const, nodes, edges };
  };
  const aux = (): Aux[] => [
    { title: 'undo stack (child root → parent root), top on the right', kind: 'stack', items: history.map(([a, b]) => `${a}→${b}`) },
    { title: 'size[ ] (trees only)', kind: 'list', items: parent.flatMap((p, i) => (p === i ? [`${i}: ${size[i]}`] : [])) },
    { title: 'answers', kind: 'list', items: [...answers] },
  ];
  const say = recorder(steps, () => ({ scene: scene(), aux: aux(), vars: { op: what, 'root(a)': ra, 'root(b)': rb, answers: `[${answers.join(', ')}]` } }));

  say({ title: 'Start', desc: `${n} separate nodes, each a tree of size 1. This union-find never compresses paths (that could not be undone); it hangs the smaller tree under the bigger one and logs every merge on a stack so the latest merge can be rolled back.`, logic: 'Union by size keeps trees shallow (depth at most log n) without touching any pointer except the single one it sets, which is what makes undo trivial.', java: [4, 5, 6], py: [1, 2, 3, 4], algo: 0, tag: 'INIT —', note: `parent[i] = i, size[i] = 1 for i = 0..${n - 1}, history = []` });

  for (const o of ops) {
    ra = '—'; rb = '—'; hotEdges = [];
    if (o.op === 'undo') {
      what = 'undo';
      const [a, b] = history[history.length - 1];
      hot = [a, b]; hotState = 'error';
      hotEdges = [a];
      say({ title: `Rollback: undo ${a} → ${b}`, desc: `Pop the top of the stack: root ${a} was hung under ${b}. Make ${a} its own root again and take its size back out of ${b}.`, logic: 'Undo is only the exact reverse of the last union, so the forest returns to precisely the earlier state.', tone: 'warn', java: [24, 25], py: [22, 23], algo: 3, tag: 'ROLLBACK', alert: `Undoing the latest union: ${a} leaves ${b}.`, note: `h = history.pop() = (${a}, ${b})` });
      history.pop();
      parent[a] = a;
      size[b] -= size[a];
      hot = [a, b]; hotState = 'found'; hotEdges = [];
      say({ title: `${a} is a root again`, desc: `parent[${a}] = ${a}; size[${b}] is back to ${size[b]}. The two trees are separate again.`, logic: 'Both trees are intact below their roots, so nothing else needs repair.', java: [26, 27], py: [24, 25], algo: 3, tag: 'ROLLBACK', note: `parent[${a}] = ${a}, size[${b}] −= size[${a}] → ${size[b]}` });
      continue;
    }
    what = `${o.op === 'u' ? 'union' : 'connected'}(${o.a},${o.b})`;
    hot = [o.a, o.b]; hotState = 'active';
    say({ title: o.op === 'u' ? `union(${o.a}, ${o.b})` : `connected(${o.a}, ${o.b})?`, desc: `Climb from ${o.a} and from ${o.b} to their roots (no compression, just follow parent pointers).`, logic: o.op === 'u' ? 'Only roots can be linked.' : 'Two nodes are connected exactly when they have the same root.', java: o.op === 'u' ? [14, 15] : [30], py: o.op === 'u' ? [11, 12] : [27, 28], algo: 1, tag: o.op === 'u' ? 'UNION' : 'QUERY', note: `${o.op === 'u' ? 'union' : 'connected'}(${o.a}, ${o.b}): follow parent pointers up` });
    const A = root(o.a);
    const B = root(o.b);
    ra = A; rb = B;
    if (o.op === 'q') {
      const ok = A === B;
      answers.push(String(ok));
      hot = [o.a, o.b]; hotState = ok ? 'found' : 'error';
      say({ title: `${ok ? 'Same' : 'Different'} root: ${ok}`, desc: ok ? `Both climb to root ${A}: connected.` : `Roots ${A} and ${B} differ: not connected.`, logic: 'The answer reflects only the unions that have not been rolled back.', tone: ok ? 'success' : 'warn', java: [30], py: [27, 28], algo: 2, tag: 'QUERY', note: `find(${o.a}) = ${A}, find(${o.b}) = ${B} → ${ok}` });
      continue;
    }
    if (A === B) {
      hot = [o.a, o.b]; hotState = 'found';
      say({ title: 'Already together: no change', desc: `Both share root ${A}, so the union does nothing and nothing is pushed on the undo stack.`, logic: 'A union that changes nothing has nothing to undo, so it is not recorded.', java: [16], py: [13, 14], algo: 1, tag: 'UNION', alert: `Nodes ${o.a} and ${o.b} already share root ${A}: nothing is merged or pushed.`, note: `a == b == ${A} → return false` });
      continue;
    }
    let child = A;
    let par = B;
    if (size[child] > size[par]) { child = B; par = A; }
    parent[child] = par;
    size[par] += size[child];
    history.push([child, par]);
    hot = [child, par]; hotState = 'found'; hotEdges = [child];
    say({ title: `Hang ${child} under ${par}, push (${child}→${par})`, desc: `Sizes were ${size[child]} and ${size[par] - size[child]}; the smaller tree goes under the larger. size[${par}] becomes ${size[par]} and the merge is recorded on the stack.`, logic: 'Recording (child, parent) is all that is needed to reverse this union later.', tone: 'success', java: [17, 18, 19, 20, 21], py: [15, 16, 17, 18, 19, 20], algo: 2, tag: 'HANG', note: `parent[${child}] = ${par}, size[${par}] = ${size[par]}, push (${child}, ${par})` });
  }
  hot = []; hotEdges = []; what = '—'; ra = '—'; rb = '—';
  say({
    title: 'All operations processed', desc: `Connectivity answers in order: [${answers.join(', ')}].`,
    logic: 'Each union changed one pointer and each rollback restored exactly that pointer, so every answer matched the live state.', tone: 'success', java: [30], py: [27, 28], algo: 4,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]`,
    result: { title: `[${answers.join(', ')}]`, text: 'Answers of the connectivity queries in order' },
  });
  return steps;
}

const P = (n: number, s: string): In => ({
  n,
  ops: s.split(' ').map((t): Op => {
    if (t === 'undo') return { op: 'undo' };
    const m = /^([uq]):(\d+)-(\d+)$/.exec(t)!;
    return { op: m[1] as 'u' | 'q', a: Number(m[2]), b: Number(m[3]) };
  }),
});

export const unionFindRollback: ProblemDef<In> = {
  slug: 'cp-union-find-with-rollback',
  id: 'CP', title: 'Union-Find with Rollback', difficulty: 'Hard', category: 'Graph', tag: 'DSU rollback',
  statement: 'Maintain a union-find that supports union(a, b), connected(a, b) and rollback(), which undoes the most recent union that actually merged two groups. Process the operations in order and report every connectivity answer. Rollback is the key ingredient of offline dynamic-connectivity and divide-and-conquer-over-time solutions.',
  constraints: 'Animation input: 2 to 7 nodes, up to 12 operations written as u:a-b, q:a-b and undo (at least one query; undo needs an earlier effective union)',
  examples: [
    { label: '6 | u:0-1 u:1-2 q:0-2 undo q:0-2 q:0-1', input: P(6, 'u:0-1 u:1-2 q:0-2 undo q:0-2 q:0-1'), output: '[true, false, true]' },
    { label: '5 | u:0-1 u:2-3 u:1-3 q:0-2 undo q:0-2 u:0-4 q:4-1', input: P(5, 'u:0-1 u:2-3 u:1-3 q:0-2 undo q:0-2 u:0-4 q:4-1'), output: '[true, false, true]' },
    { label: '4 | u:0-1 u:0-1 undo q:0-1 q:2-3', input: P(4, 'u:0-1 u:0-1 undo q:0-1 q:2-3'), output: '[false, false]' },
  ],
  inputPlaceholder: 'e.g. 6 | u:0-1 u:1-2 q:0-2 undo q:0-2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Union-find forest (arrow = parent)',
  legend: [{ label: 'Nodes being looked at', state: 'active' }, { label: 'Merged / connected', state: 'found' }, { label: 'Rolled back / not connected', state: 'error' }],
  varLabels: ['op', 'root(a)', 'root(b)', 'answers'],
  approach: {
    title: 'Union by size, no compression, and a history stack',
    text: 'find just walks parent pointers. union links the smaller root under the larger one and pushes (child, parent) on a stack; if both roots are equal nothing is pushed. rollback pops the stack and restores parent[child] = child and size[parent] -= size[child]. Skipping path compression keeps every change to a single pointer, which is why the operation can be reversed exactly.',
  },
  java: [
    'class RollbackDSU {',
    '    int[] parent, size;',
    '    Deque<int[]> history = new ArrayDeque<>();   // (child root, parent root)',
    '',
    '    RollbackDSU(int n) {',
    '        parent = new int[n]; size = new int[n];',
    '        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }',
    '    }',
    '',
    '    int find(int x) {                            // no path compression: it could not be undone',
    '        while (parent[x] != x) x = parent[x];',
    '        return x;',
    '    }',
    '',
    '    boolean union(int a, int b) {',
    '        a = find(a); b = find(b);',
    '        if (a == b) return false;',
    '        if (size[a] > size[b]) { int t = a; a = b; b = t; }   // hang the smaller tree',
    '        parent[a] = b;',
    '        size[b] += size[a];',
    '        history.push(new int[]{a, b});',
    '        return true;',
    '    }',
    '',
    '    void rollback() {                            // undo the latest effective union',
    '        int[] h = history.pop();',
    '        parent[h[0]] = h[0];',
    '        size[h[1]] -= size[h[0]];',
    '    }',
    '',
    '    boolean connected(int a, int b) { return find(a) == find(b); }',
    '}',
  ],
  python: [
    'class RollbackDSU:',
    '    def __init__(self, n):',
    '        self.parent = list(range(n))',
    '        self.size = [1] * n',
    '        self.history = []                    # (child root, parent root)',
    '',
    '    def find(self, x):                       # no path compression: it could not be undone',
    '        while self.parent[x] != x:',
    '            x = self.parent[x]',
    '        return x',
    '',
    '    def union(self, a, b):',
    '        a, b = self.find(a), self.find(b)',
    '        if a == b:',
    '            return False',
    '        if self.size[a] > self.size[b]:',
    '            a, b = b, a                      # hang the smaller tree',
    '        self.parent[a] = b',
    '        self.size[b] += self.size[a]',
    '        self.history.append((a, b))',
    '        return True',
    '',
    '    def rollback(self):                      # undo the latest effective union',
    '        a, b = self.history.pop()',
    '        self.parent[a] = a',
    '        self.size[b] -= self.size[a]',
    '',
    '    def connected(self, a, b):',
    '        return self.find(a) == self.find(b)',
  ],
  algorithm: [
    'Every node is its own root with size 1; the history stack is empty',
    'union / connected: find both roots by following parent pointers (no compression)',
    'Different roots: hang the smaller tree under the larger and push (child, parent); equal roots: do nothing',
    'rollback: pop (child, parent), reset parent[child] = child and size[parent] -= size[child]',
    'Report the connectivity answers in query order',
  ],
  phases: [
    { icon: '🌱', label: 'Init: singletons', tone: 'blue' },
    { icon: '🔍', label: 'Find roots (no compression)', tone: 'cyan' },
    { icon: '🔗', label: 'Hang smaller / answer', tone: 'green' },
    { icon: '↩', label: 'Rollback', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['rollback', 'union', 'connected'],
  complexity: [{ label: 'union / find', value: 'O(log n)' }, { label: 'rollback', value: 'O(1)' }],
  why: 'Union by size makes every tree at most log n deep, so find is cheap even without path compression. Because a union changes exactly one parent pointer and one size, the stack entry (child, parent) contains everything needed to reverse it, and popping in last-in-first-out order restores the structure to exactly the state before that union. Unions that merged nothing changed nothing and are never pushed.',
};
