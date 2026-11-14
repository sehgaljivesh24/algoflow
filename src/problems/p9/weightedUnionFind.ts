import type { Aux, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../../engine/types.ts';
import { recorder } from '../stepKit.ts';
import { TONES, dec, forestLayout, fdiv, fmul, fnum, frac, fstr } from './kitA.ts';
import type { Frac } from './kitA.ts';

interface Eq { a: string; b: string; k: number }
interface Q { a: string; b: string }
interface In { eqs: Eq[]; queries: Q[] }

function parse(raw: string): In {
  const [left, right, ...rest] = raw.split('|');
  const ex = 'a/b=2 b/c=3 | a/c c/a a/z';
  if (right === undefined || rest.length) throw new Error(`Write the equations, a bar, then the queries, e.g. ${ex}`);
  const eqToks = left.split(/[\s,;]+/).filter(Boolean);
  const qToks = right.split(/[\s,;]+/).filter(Boolean);
  if (!eqToks.length || !qToks.length) throw new Error(`Give at least one equation and one query, e.g. ${ex}`);
  if (eqToks.length > 6) throw new Error('Use at most 6 equations');
  if (qToks.length > 5) throw new Error('Use at most 5 queries');
  const eqs = eqToks.map((t): Eq => {
    const m = /^([a-z])\/([a-z])=([1-9])$/.exec(t);
    if (!m) throw new Error(`"${t}" is not an equation. Write a/b=3 with single lowercase letters and a whole ratio from 1 to 9`);
    if (m[1] === m[2]) throw new Error(`"${t}" divides a letter by itself; leave it out`);
    return { a: m[1], b: m[2], k: Number(m[3]) };
  });
  const queries = qToks.map((t): Q => {
    const m = /^([a-z])\/([a-z])$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a query. Write a/c with single lowercase letters`);
    return { a: m[1], b: m[2] };
  });
  const vars = [...new Set(eqs.flatMap((e) => [e.a, e.b]))];
  if (vars.length > 7) throw new Error('Use at most 7 different letters in the equations');
  // reject contradictory equations (assign exact values by BFS, then check every equation)
  const val = new Map<string, Frac>();
  for (const s of vars) {
    if (val.has(s)) continue;
    val.set(s, frac(1));
    const queue = [s];
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h];
      for (const e of eqs) {
        if (e.a === u && !val.has(e.b)) { val.set(e.b, fdiv(val.get(u)!, frac(e.k))); queue.push(e.b); }
        else if (e.b === u && !val.has(e.a)) { val.set(e.a, fmul(val.get(u)!, frac(e.k))); queue.push(e.a); }
      }
    }
  }
  for (const e of eqs) {
    const r = fdiv(val.get(e.a)!, val.get(e.b)!);
    if (r.n !== e.k || r.d !== 1) throw new Error(`The equations contradict each other (${e.a}/${e.b}=${e.k} clashes with the earlier ones)`);
  }
  return { eqs, queries };
}

function build({ eqs, queries }: In): Step[] {
  const names = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
  const id = (s: string) => names.indexOf(s);
  const n = names.length;
  const parent = names.map((_, i) => i);
  const w: Frac[] = names.map(() => frac(1));
  const answers: string[] = [];
  const steps: Step[] = [];
  let hot: number[] = [];       // nodes highlighted
  let hotEdges: number[] = [];  // child ends of highlighted edges
  let hotState: 'active' | 'found' | 'error' = 'active';
  let what = '—';
  let ra: string | number = '—';
  let rb: string | number = '—';
  let changed = -1;

  const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const scene = () => {
    const lay = forestLayout(parent);
    const nodes: GraphNodeVM[] = names.map((s, i) => {
      const r = rootOf(i);
      const members = names.filter((_, j) => rootOf(j) === r).length;
      return { id: i, label: s, tone: members > 1 ? TONES[r % TONES.length] : undefined, state: hot.includes(i) ? hotState : undefined, tag: parent[i] === i ? 'root' : undefined, x: lay[i].x, y: lay[i].y };
    });
    const edges: GraphEdgeVM[] = names.flatMap((_, i) => (parent[i] === i ? [] : [{ from: i, to: parent[i], directed: true, weight: fstr(w[i]), state: hotEdges.includes(i) ? 'active' as const : 'chosen' as const }]));
    return { kind: 'graph' as const, nodes, edges };
  };
  const aux = (): Aux[] => [
    { title: 'parent[x] and w[x] = value(x) / value(parent[x])', kind: 'list', items: names.map((s, i) => (parent[i] === i ? `${s}: root` : `${s}: ${names[parent[i]]}  ×${fstr(w[i])}`)), highlight: changed >= 0 ? changed : undefined },
    { title: 'answers', kind: 'list', items: [...answers] },
  ];
  const say = recorder(steps, () => ({ scene: scene(), aux: aux(), vars: { step: what, 'root(a)': ra, 'root(b)': rb, answers: `[${answers.join(', ')}]` } }));

  /** find with path compression, narrated; returns the root. `slot` says which root variable to fill. */
  const find = (x: number, slot: 'a' | 'b', forQuery: boolean): number => {
    const chain = [x];
    while (parent[chain[chain.length - 1]] !== chain[chain.length - 1]) chain.push(parent[chain[chain.length - 1]]);
    const root = chain[chain.length - 1];
    hot = chain;
    hotEdges = chain.slice(0, -1);
    hotState = 'active';
    changed = -1;
    if (slot === 'a') ra = names[root]; else rb = names[root];
    const deep = chain.length > 2;
    say({ title: `find(${names[x]}) climbs to ${names[root]}`, desc: chain.length === 1 ? `${names[x]} is its own root.` : `Follow parents: ${chain.map((c) => names[c]).join(' → ')}. The root is ${names[root]}.`, logic: deep ? 'A long chain: every node on it can be pointed straight at the root, multiplying the weights along the way.' : 'The chain is already as short as it can be.', java: [4, 5, 6, 7, 13], py: [5, 6, 7, 8, 13], algo: forQuery ? 3 : 1, tag: 'FIND', note: `find(${names[x]}) = ${names[root]}, chain ${chain.map((c) => names[c]).join('→')}` });
    if (deep) {
      // walk from the node just under the root down to x
      for (let i = chain.length - 3; i >= 0; i--) {
        w[chain[i]] = fmul(w[chain[i]], w[chain[i + 1]]);
        parent[chain[i]] = root;
      }
      hot = chain;
      hotEdges = chain.slice(0, -2);
      hotState = 'found';
      changed = x;
      say({ title: `Path compression under ${names[root]}`, desc: `Every node on the chain now points directly at ${names[root]}; each weight is the product of the weights it skipped (${names[x]}: ×${fstr(w[x])}).`, logic: 'value(x)/value(root) = (x/parent) × (parent/root), so the shortcut keeps the ratio exact.', tone: 'success', java: [8, 9, 10, 11], py: [9, 10, 11, 12], algo: forQuery ? 3 : 1, tag: 'COMPRESS', note: `w[${names[x]}] = product of skipped weights = ${fstr(w[x])}, parent[${names[x]}] = ${names[root]}` });
    }
    return root;
  };

  hot = []; hotEdges = [];
  say({ title: 'Start', desc: `${n} variables (${names.join(', ')}), each its own group with weight 1. An arrow x → p labelled r means value(x) = r × value(p).`, logic: 'The weight on a link is a ratio, so any two variables in one group are related by multiplying the weights on their paths to the root.', java: [1, 2], py: [2, 3], algo: 0, tag: 'INIT —', note: `parent[x] = x, w[x] = 1 for ${names.join(', ')}` });

  for (const e of eqs) {
    what = `${e.a}/${e.b}=${e.k}`;
    ra = '—'; rb = '—'; changed = -1;
    hot = [id(e.a), id(e.b)]; hotEdges = []; hotState = 'active';
    say({ title: `Equation ${e.a} / ${e.b} = ${e.k}`, desc: `We learn value(${e.a}) = ${e.k} × value(${e.b}). Find the group leader of each side first.`, logic: 'Two variables are already related exactly when they share a leader.', java: [16, 17], py: [15, 16], algo: 1, tag: 'EQUATION', note: `union(${e.a}, ${e.b}, ${e.k}): ${e.a} / ${e.b} = ${e.k}` });
    const A = find(id(e.a), 'a', false);
    const B = find(id(e.b), 'b', false);
    if (A === B) {
      hot = [id(e.a), id(e.b)]; hotEdges = []; hotState = 'found';
      say({ title: 'Same group: nothing to add', desc: `${e.a} and ${e.b} already share the leader ${names[A]}, so their ratio is already known (and consistent).`, logic: 'A second equation inside a group carries no new information.', java: [18], py: [17, 18], algo: 2, tag: 'SAME GROUP', alert: `${e.a} and ${e.b} already share leader ${names[A]}: nothing to link.`, note: `ra == rb == ${names[A]} → return` });
      continue;
    }
    const wa = w[id(e.a)];
    const wb = w[id(e.b)];
    const nw = fdiv(fmul(frac(e.k), wb), wa);
    parent[A] = B;
    w[A] = nw;
    hot = [A, B]; hotEdges = [A]; hotState = 'found'; changed = A;
    say({ title: `Link ${names[A]} under ${names[B]}`, desc: `w[${names[A]}] = ${e.k} × w[${e.b}] / w[${e.a}] = ${e.k} × ${fstr(wb)} / ${fstr(wa)} = ${fstr(nw)}. The two groups are now one.`, logic: `value(${names[A]}) = ${fstr(nw)} × value(${names[B]}) makes ${e.a} = ${e.k} × ${e.b} true for every member.`, tone: 'success', java: [19, 20], py: [19, 20], algo: 2, tag: 'LINK', note: `parent[${names[A]}] = ${names[B]}, w[${names[A]}] = ${fstr(nw)}` });
  }

  for (const q of queries) {
    what = `${q.a}/${q.b}?`;
    ra = '—'; rb = '—'; changed = -1; hotEdges = [];
    const known = names.includes(q.a) && names.includes(q.b);
    if (!known) {
      answers.push('-1');
      hot = []; hotState = 'error';
      say({ title: `Query ${q.a} / ${q.b}: unknown letter`, desc: `${names.includes(q.a) ? q.b : q.a} never appeared in an equation, so nothing relates it to anything. Answer -1.`, logic: 'A variable outside every group has no known ratio.', tone: 'warn', java: [23, 24], py: [22, 23, 24], algo: 4, tag: 'ANSWER', alert: `${q.a}/${q.b}: a letter never appeared in an equation, so the answer is -1.`, note: `!parent.containsKey(...) → -1` });
      continue;
    }
    hot = [id(q.a), id(q.b)]; hotState = 'active';
    say({ title: `Query ${q.a} / ${q.b}`, desc: `Are ${q.a} and ${q.b} in the same group? If so the answer is w[${q.a}] / w[${q.b}].`, logic: 'Both weights are measured against the same leader, so the leader cancels out of the quotient.', java: [23, 24], py: [22, 23, 24], algo: 3, tag: 'QUERY', note: `query(${q.a}, ${q.b}): compare find(${q.a}) with find(${q.b})` });
    const A = find(id(q.a), 'a', true);
    const B = find(id(q.b), 'b', true);
    if (A !== B) {
      answers.push('-1');
      hot = [id(q.a), id(q.b)]; hotState = 'error';
      say({ title: 'Different groups: -1', desc: `${q.a} lives under ${names[A]} and ${q.b} under ${names[B]}; no chain of equations connects them.`, logic: 'Without a shared leader there is no ratio to compute.', tone: 'warn', java: [25], py: [25, 26], algo: 4, tag: 'ANSWER', alert: `${q.a} and ${q.b} have different leaders (${names[A]}, ${names[B]}): the answer is -1.`, note: `find(${q.a}) = ${names[A]} ≠ find(${q.b}) = ${names[B]} → -1` });
      continue;
    }
    const val = fdiv(w[id(q.a)], w[id(q.b)]);
    answers.push(dec(fnum(val)));
    hot = [id(q.a), id(q.b)]; hotState = 'found';
    say({ title: `${q.a} / ${q.b} = ${fstr(w[id(q.a)])} / ${fstr(w[id(q.b)])} = ${fstr(val)}`, desc: `w[${q.a}] = ${fstr(w[id(q.a)])} and w[${q.b}] = ${fstr(w[id(q.b)])} (both relative to ${names[A]}). Their quotient is ${fstr(val)}.`, logic: 'value(a)/value(b) = (w[a]·v) / (w[b]·v) = w[a] / w[b].', tone: 'success', java: [26], py: [27], algo: 4, tag: 'ANSWER', note: `w[${q.a}] / w[${q.b}] = ${fstr(w[id(q.a)])} / ${fstr(w[id(q.b)])} = ${fstr(val)}` });
  }
  hot = []; hotEdges = []; changed = -1; what = '—'; ra = '—'; rb = '—';
  say({
    title: 'All queries answered', desc: `Answers in order: [${answers.join(', ')}] (-1 means the ratio cannot be determined).`,
    logic: 'Every query was resolved by one find per side; compression made later finds cheaper.', tone: 'success', java: [26], py: [27], algo: 5,
    tag: '✅ Done!', note: `return [${answers.join(', ')}]`,
    result: { title: `[${answers.join(', ')}]`, text: 'Answers to the queries in order (-1 = unknown)' },
  });
  return steps;
}

const P = (s: string): In => {
  const [l, r] = s.split(' | ');
  return {
    eqs: l.split(' ').map((t) => ({ a: t[0], b: t[2], k: Number(t[4]) })),
    queries: r.split(' ').map((t) => ({ a: t[0], b: t[2] })),
  };
};

export const weightedUnionFind: ProblemDef<In> = {
  slug: 'cp-weighted-union-find-ratios',
  id: 'CP', title: 'Weighted Union-Find Ratios', difficulty: 'Medium', category: 'Graph', tag: 'weighted union-find',
  statement: 'You are given equations a / b = k between variables and some queries x / y. Answer every query with the ratio implied by the equations, or -1 if it cannot be determined. Solve it with a union-find that stores, on every link, the ratio between a variable and its parent.',
  constraints: 'Consistent equations (animation input: up to 6 equations like a/b=2 with ratios 1 to 9, up to 7 letters, up to 5 queries)',
  examples: [
    { label: 'a/b=2 b/c=3 | a/c c/a a/z', input: P('a/b=2 b/c=3 | a/c c/a a/z'), output: '[6, 0.16667, -1]' },
    { label: 'a/b=2 c/d=4 b/c=3 | a/d d/a b/d', input: P('a/b=2 c/d=4 b/c=3 | a/d d/a b/d'), output: '[24, 0.04167, 12]' },
    { label: 'a/b=3 c/b=2 d/e=5 | a/c e/d a/e', input: P('a/b=3 c/b=2 d/e=5 | a/c e/d a/e'), output: '[1.5, 0.2, -1]' },
  ],
  inputPlaceholder: 'e.g. a/b=2 b/c=3 | a/c c/a a/z',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Union-find forest (arrow = parent, label = ratio)',
  legend: [{ label: 'Nodes / links being used', state: 'active' }, { label: 'Merged / answer found', state: 'found' }, { label: 'Unknown (-1)', state: 'error' }],
  varLabels: ['step', 'root(a)', 'root(b)', 'answers'],
  approach: {
    title: 'Union-find where every link remembers a ratio',
    text: 'Store parent[x] and w[x] = value(x) / value(parent[x]). find follows parents to the leader and, while compressing the path, multiplies the weights it skips. To add a/b = k, make the leader of a a child of the leader of b with the weight that keeps the new equation true. A query a/b is w[a] / w[b] when both share a leader, otherwise -1.',
  },
  java: [
    'class RatioUnionFind {',
    '    private final Map<String, String> parent = new HashMap<>();',
    '    private final Map<String, Double> w = new HashMap<>();   // w[x] = value(x) / value(parent[x])',
    '',
    '    String find(String x) {',
    '        parent.putIfAbsent(x, x);',
    '        w.putIfAbsent(x, 1.0);',
    '        if (!parent.get(x).equals(x)) {',
    '            String p = parent.get(x);',
    '            String root = find(p);',
    '            w.put(x, w.get(x) * w.get(p));      // x/root = (x/p) * (p/root)',
    '            parent.put(x, root);                // path compression',
    '        }',
    '        return parent.get(x);',
    '    }',
    '',
    '    void union(String a, String b, double k) {  // a / b = k',
    '        String ra = find(a), rb = find(b);',
    '        if (ra.equals(rb)) return;',
    '        parent.put(ra, rb);',
    '        w.put(ra, k * w.get(b) / w.get(a));',
    '    }',
    '',
    '    double query(String a, String b) {',
    '        if (!parent.containsKey(a) || !parent.containsKey(b)) return -1;',
    '        if (!find(a).equals(find(b))) return -1;',
    '        return w.get(a) / w.get(b);',
    '    }',
    '}',
  ],
  python: [
    'class RatioUnionFind:',
    '    def __init__(self):',
    '        self.parent = {}',
    '        self.w = {}                        # w[x] = value(x) / value(parent[x])',
    '',
    '    def find(self, x):',
    '        self.parent.setdefault(x, x)',
    '        self.w.setdefault(x, 1.0)',
    '        if self.parent[x] != x:',
    '            p = self.parent[x]',
    '            root = self.find(p)',
    '            self.w[x] *= self.w[p]         # x/root = (x/p) * (p/root)',
    '            self.parent[x] = root          # path compression',
    '        return self.parent[x]',
    '',
    '    def union(self, a, b, k):              # a / b = k',
    '        ra, rb = self.find(a), self.find(b)',
    '        if ra == rb:',
    '            return',
    '        self.parent[ra] = rb',
    '        self.w[ra] = k * self.w[b] / self.w[a]',
    '',
    '    def query(self, a, b):',
    '        if a not in self.parent or b not in self.parent:',
    '            return -1',
    '        if self.find(a) != self.find(b):',
    '            return -1',
    '        return self.w[a] / self.w[b]',
  ],
  algorithm: [
    'Every variable starts as its own leader with weight 1',
    'For an equation a/b = k, find both leaders (compressing paths and multiplying skipped weights)',
    'Different leaders: attach leader(a) under leader(b) with w = k · w[b] / w[a]; same leader: nothing to do',
    'For a query a/b, find both leaders',
    'Same leader: answer w[a] / w[b]; different leaders or an unknown letter: -1',
    'Return the answers in query order',
  ],
  phases: [
    { icon: '🌱', label: 'Init: w = 1', tone: 'blue' },
    { icon: '🔍', label: 'Find leaders (compress)', tone: 'cyan' },
    { icon: '🔗', label: 'Link with a ratio', tone: 'green' },
    { icon: '❓', label: 'Query: find leaders', tone: 'gold' },
    { icon: '🧮', label: 'Answer w[a] / w[b]', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['ratio', 'queries', '-1'],
  complexity: [{ label: 'Time', value: 'O((E + Q) · α(V))' }, { label: 'Space', value: 'O(V)' }],
  why: 'Define value(x) = w[x] · value(parent[x]); unrolling this to the leader gives value(x) = (product of weights on the path) · value(leader). Compressing a path multiplies the skipped weights, so this relation is preserved. When a and b share a leader, value(a)/value(b) is the quotient of their path products, since the leader\'s value cancels. When they do not, the equations never relate the two groups, so -1 is the only honest answer.',
};
