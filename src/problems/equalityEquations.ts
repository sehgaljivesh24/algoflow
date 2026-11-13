import type { Aux, ProblemDef, Step } from '../engine/types';
import { Dsu, mstScene, tokens } from './mstKit.ts';
import type { EdgeMark } from './mstKit.ts';

/** Equations like a==b or a!=c over lowercase letters. */
interface Eq { a: string; b: string; eq: boolean }
interface In { eqs: Eq[] }

function parse(raw: string): In {
  const t = tokens(raw);
  if (!t.length) throw new Error('Write equations like a==b b!=c');
  if (t.length > 10) throw new Error('Use at most 10 equations');
  const eqs = t.map((x) => {
    const m = /^([a-z])(==|!=)([a-z])$/.exec(x);
    if (!m) throw new Error(`"${x}" is not an equation. Write two lowercase letters joined by == or !=, like a==b`);
    if (m[1] === m[3]) throw new Error(`"${x}" uses the same letter twice; use two different letters`);
    return { a: m[1], b: m[3], eq: m[2] === '==' };
  });
  if (new Set(eqs.flatMap((e) => [e.a, e.b])).size > 8) throw new Error('Use at most 8 different letters');
  return { eqs };
}

function build({ eqs }: In): Step[] {
  const letters = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
  const n = letters.length;
  const id = (c: string) => letters.indexOf(c);
  const dsu = new Dsu(n);
  const marks: EdgeMark[] = eqs.map(() => 'todo');
  const edges = eqs.map((e) => ({ u: id(e.a), v: id(e.b), w: 0 }));
  const steps: Step[] = [];
  let cur = -1;
  let ra = '—';
  let rb = '—';
  let verdict = '—';
  let hot: number[] = [];
  let hotState: 'active' | 'error' = 'active';
  const L = (i: number) => letters[i];

  const eqText = (e: Eq) => `${e.a}${e.eq ? '==' : '!='}${e.b}`;
  const aux = (): Aux[] => [
    { title: 'equations (pass 1 uses ==, pass 2 uses !=)', kind: 'queue', items: eqs.map((e, i) => `${eqText(e)}${marks[i] === 'take' ? ' ✓ merged' : marks[i] === 'skip' ? ' ✓' : marks[i] === 'bad' ? ' ✗' : ''}`), highlight: cur >= 0 ? cur : undefined, bad: marks.flatMap((m, i) => (m === 'bad' ? [i] : [])) },
    { title: 'parent[ ]', kind: 'list', items: letters.map((c, i) => `${c}→${L(dsu.parent[i])}`) },
  ];
  const scene = () => mstScene({
    n, base: 0, edges, marks, dsu, hot, hotState, labels: letters,
    tags: letters.map((_, i) => (dsu.parent[i] !== i ? `→${L(dsu.parent[i])}` : undefined)),
    weightText: (_e, i) => (eqs[i].eq ? '=' : '≠'),
  });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) =>
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { equation: cur >= 0 ? eqText(eqs[cur]) : '—', 'root(a)': ra, 'root(b)': rb, verdict } });

  push({
    title: 'Letters are nodes', desc: `${n} letters, ${eqs.length} equations. Every letter starts alone. Pass 1 merges letters joined by ==; pass 2 checks that no != pair ended up in one group.`,
    logic: '"Equal to" is transitive, so the == equations partition the letters into groups that must all hold the same value.', logicTone: 'info',
    tag: 'INIT —', note: `${n} letters, each its own group; ${eqs.filter((e) => e.eq).length} == and ${eqs.filter((e) => !e.eq).length} != equations`,
    javaLines: [1, 2], pyLines: [1], algoStep: 0,
  });

  for (let i = 0; i < eqs.length; i++) {
    if (!eqs[i].eq) continue;
    const { a, b } = eqs[i];
    cur = i; hot = [id(a), id(b)]; hotState = 'active'; ra = '—'; rb = '—';
    const x = dsu.find(id(a));
    const y = dsu.find(id(b));
    ra = L(x); rb = L(y);
    if (x === y) {
      marks[i] = 'skip';
      push({
        title: `${eqText(eqs[i])}: already in one group`, desc: `${a} and ${b} already share leader ${L(x)}, so this equation adds nothing new.`,
        logic: 'A redundant equality is harmless here; we only care about which letters are forced together.', logicTone: 'info',
        tag: 'PASS 1', note: `find(${a}) = find(${b}) = ${L(x)} → nothing to merge`,
        javaLines: [3, 4, 5], pyLines: [2, 3, 4], algoStep: 1,
      });
    } else {
      dsu.parent[x] = y;
      marks[i] = 'take';
      push({
        title: `${eqText(eqs[i])}: merge groups`, desc: `Leaders ${L(x)} and ${L(y)} differ, so set parent[${L(x)}] = ${L(y)}. ${a} and ${b} (and everything tied to them) must now be equal.`,
        logic: 'Union only the equal pairs first: a != equation can only be judged once all equalities are known.', logicTone: 'success',
        tag: 'PASS 1', note: `parent[${L(x)}] = ${L(y)}, groups = ${dsu.components()}`,
        javaLines: [3, 4, 5], pyLines: [2, 3, 4], algoStep: 1,
      });
    }
  }

  let bad = false;
  for (let i = 0; i < eqs.length && !bad; i++) {
    if (eqs[i].eq) continue;
    const { a, b } = eqs[i];
    cur = i; hot = [id(a), id(b)]; hotState = 'active';
    marks[i] = 'cur';
    const x = dsu.find(id(a));
    const y = dsu.find(id(b));
    ra = L(x); rb = L(y);
    if (x === y) {
      bad = true; marks[i] = 'bad'; hotState = 'error'; verdict = 'false';
      push({
        title: `${eqText(eqs[i])} contradicts the equalities`, desc: `${a} and ${b} have the same leader ${L(x)}, so the == equations force them to be equal, but this equation says they differ. No assignment works.`,
        logic: 'One broken inequality is enough: the whole system is unsatisfiable.', logicTone: 'warn',
        tag: 'PASS 2', alert: `${eqText(eqs[i])} is violated: ${a} and ${b} are forced equal by the == equations.`, note: `find(${a}) = find(${b}) = ${L(x)} → return false`,
        javaLines: [8, 9, 10, 11], pyLines: [5, 6, 7], algoStep: 3,
      });
    } else {
      marks[i] = 'skip';
      push({
        title: `${eqText(eqs[i])} holds`, desc: `Leaders ${L(x)} and ${L(y)} differ, so ${a} and ${b} are in different groups and may take different values.`,
        logic: 'Different groups can always be given different numbers, so this inequality is safe.', logicTone: 'success',
        tag: 'PASS 2', note: `find(${a}) = ${L(x)} ≠ find(${b}) = ${L(y)} → holds`,
        javaLines: [8, 9, 10], pyLines: [5, 6], algoStep: 2,
      });
    }
  }

  cur = -1; hot = [];
  if (!bad) verdict = 'true';
  steps.push({
    title: bad ? 'Not satisfiable' : 'Satisfiable', desc: bad ? 'Some != pair is forced equal, so the answer is false.' : 'Every != pair lies in different groups; give each group its own number and all equations hold.',
    scene: scene(), aux: aux(),
    vars: { equation: '—', 'root(a)': ra, 'root(b)': rb, verdict },
    logic: bad ? 'Contradiction found in pass 2.' : 'No != equation connects two letters of the same group.', logicTone: bad ? 'warn' : 'success',
    tag: '✅ Done!', note: `return ${!bad}`,
    javaLines: bad ? [11] : [14], pyLines: bad ? [7] : [8], algoStep: 4,
    result: { title: String(!bad), text: bad ? 'The equations cannot all be satisfied' : 'The equations can all be satisfied' },
  });
  return steps;
}

const mk = (s: string): In => ({ eqs: s.split(' ').map((x) => ({ a: x[0], b: x[3], eq: x[1] === '=' })) });

export const equalityEquations: ProblemDef<In> = {
  slug: '990-satisfiability-of-equality-equations',
  id: '990', title: 'Satisfiability of Equality Equations', difficulty: 'Medium', category: 'Graph', tag: 'union-find on letters',
  statement: 'Each equation relates two variables (lowercase letters) as either "x==y" or "x!=y". Return true if integers can be assigned to the variables so that every equation holds, otherwise false.',
  constraints: '1 ≤ equations ≤ 500 (animation input: ≤ 10 equations, ≤ 8 letters, two different letters per equation, written like a==b b!=c)',
  examples: [
    { label: 'a==b b!=a', input: mk('a==b b!=a'), output: 'false' },
    { label: 'a==b b==c a!=d', input: mk('a==b b==c a!=d'), output: 'true' },
    { label: 'a==b b==c c==d a!=d', input: mk('a==b b==c c==d a!=d'), output: 'false' },
  ],
  inputPlaceholder: 'e.g. a==b b==c a!=d   (equations x==y or x!=y)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Equation being checked', state: 'active' }, { label: 'Contradiction', state: 'error' }],
  varLabels: ['equation', 'root(a)', 'root(b)', 'verdict'],
  approach: {
    title: 'Union all equalities first, then test every inequality',
    text: 'Treat each letter as a node. First pass: for every "==" equation, union the two letters. Second pass: for every "!=" equation, find the leaders of both letters; if they are the same, the equalities force the two letters to be equal and the system is impossible. If no inequality is violated, the answer is true.',
  },
  java: [
    'public boolean equationsPossible(String[] equations) {',
    '    int[] parent = new int[26];',
    '    for (int i = 0; i < 26; i++) parent[i] = i;',
    '    for (String e : equations) {                       // pass 1: unite equal letters',
    "        if (e.charAt(1) == '=') {",
    "            parent[find(parent, e.charAt(0) - 'a')] = find(parent, e.charAt(3) - 'a');",
    '        }',
    '    }',
    '    for (String e : equations) {                       // pass 2: check the != ones',
    "        if (e.charAt(1) == '!' &&",
    "            find(parent, e.charAt(0) - 'a') == find(parent, e.charAt(3) - 'a')) {",
    '            return false;                              // forced equal but required different',
    '        }',
    '    }',
    '    return true;',
    '}',
    '',
    'private int find(int[] parent, int x) {',
    '    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }',
    '    return x;',
    '}',
  ],
  python: [
    'def equations_possible(equations):',
    '    parent = list(range(26))',
    '    for e in equations:                      # pass 1: unite equal letters',
    "        if e[1] == '=':",
    '            parent[find(parent, ord(e[0]) - 97)] = find(parent, ord(e[3]) - 97)',
    '    for e in equations:                      # pass 2: check the != ones',
    "        if e[1] == '!' and find(parent, ord(e[0]) - 97) == find(parent, ord(e[3]) - 97):",
    '            return False                     # forced equal but required different',
    '    return True',
    '',
    'def find(parent, x):',
    '    while parent[x] != x:',
    '        parent[x] = parent[parent[x]]',
    '        x = parent[x]',
    '    return x',
  ],
  phases: [
    { icon: '🔤', label: 'Letters are nodes', tone: 'blue' },
    { icon: '🔗', label: 'Pass 1: unite ==', tone: 'green' },
    { icon: '🔍', label: 'Pass 2: check !=', tone: 'cyan' },
    { icon: '⚠', label: 'Contradiction', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['integers', 'every equation holds', 'x==y', 'x!=y'],
  algorithm: [
    'Make every letter its own group',
    'Pass 1: for each "x==y" union the groups of x and y',
    'Pass 2: for each "x!=y" compare the group leaders of x and y',
    'If the leaders are equal for some inequality, return false',
    'Otherwise every inequality separates two groups: return true',
  ],
  complexity: [{ label: 'Time', value: 'O(E · α(26)) ≈ O(E)' }, { label: 'Space', value: 'O(26)' }],
  why: 'Equality is an equivalence relation, so the "==" equations force exactly the letters in one union-find group to share a value, and nothing more. If every "!=" pair lies across groups, give each group a distinct integer and all equations hold. If some "!=" pair lies inside a group, that pair is forced equal, so no assignment works. Doing all unions before any check matters because a later equality can still merge two groups.',
};
