import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step, Tone } from '../engine/types';
import { adjacency, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** People 1..n and "dislikes" pairs a-b. Can everyone be put in one of two groups with no disliking pair together? */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 1, minN: 1, maxN: 9, maxE: 14, example: '4 1-2 1-3 2-4' });
}

const GROUP_TONE: Record<number, Tone> = { 1: 'blue', 2: 'orange' };

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 1);
  const group = new Array<number>(n + 1).fill(0);
  const eState: EdgeState[] = edges.map(() => 'default');
  const calls: string[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let bad: number[] = [];
  let verdict = '—';

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, k) => {
      const id = k + 1;
      const state: CellState | undefined = bad.includes(id) ? 'error' : id === cur ? 'active' : undefined;
      return { id, state, tone: group[id] ? GROUP_TONE[group[id]] : undefined, tag: group[id] ? `group ${group[id]}` : '–' };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'p', index: cur - 1, tone: 'purple' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'recursion stack: assign(person, group)', kind: 'stack', items: [...calls] },
    { title: 'group[ ]  (1 = blue, 2 = orange)', kind: 'list', items: Array.from({ length: n }, (_, k) => `${k + 1}: ${group[k + 1] || '·'}`) },
  ];
  const vars = () => ({ person: cur ?? '—', group: cur === null ? '—' : group[cur], 'stack depth': calls.length, possible: verdict });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} people, ${edges.length} dislike pair${edges.length === 1 ? '' : 's'}. Put everyone in group 1 (blue) or group 2 (orange) so no pair that dislikes each other shares a group.`,
    logic: 'Dislike is symmetric, so this is the same as 2-colouring the "dislike graph". We will assign groups with a depth-first search.', logicTone: 'info',
    tag: 'INIT —', note: `group[1..${n}] = 0 (unassigned), ${edges.length} dislike pairs`,
    javaLines: [1, 2], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  // returns false on conflict
  const assign = (p: number, g: number): boolean => {
    group[p] = g;
    cur = p;
    calls.push(`assign(${p}, ${g})`);
    push({
      title: `Put person ${p} in group ${g}`, desc: `${p} goes to group ${g}. Everyone ${p} dislikes (${adj[p - 1].map((x) => x.to).join(', ') || 'nobody'}) must go to group ${3 - g}.`,
      logic: 'Placing a person fixes the group of everyone they dislike.', logicTone: 'info',
      tag: 'PLACE', note: `group[${p}] = ${g}, stack depth ${calls.length}`,
      javaLines: [9, 10], pyLines: [6, 7], algoStep: 1,
    });
    for (const { to: q, ei } of adj[p - 1]) {
      cur = p;
      eState[ei] = 'active';
      if (group[q] === g) {
        eState[ei] = 'error';
        bad = [p, q];
        verdict = 'false';
        push({
          title: `Conflict: ${p} dislikes ${q}, both in group ${g}`, desc: `${q} is already in group ${g}, the same group as ${p}, yet they dislike each other. Moving either one only pushes the contradiction elsewhere along the chain.`,
          logic: 'Every earlier placement was forced, so no other assignment can avoid this clash. The answer is false.', logicTone: 'warn',
          tag: 'CONFLICT', alert: `${p} dislikes ${q}, but both are in group ${g}: the dislikes contain an odd cycle.`, note: `group[${q}] == g == ${g} → return false`,
          javaLines: [11], pyLines: [8, 9], algoStep: 3,
        });
        return false;
      }
      if (group[q] === 0) {
        push({
          title: `${p} dislikes ${q}: recurse with group ${3 - g}`, desc: `${q} is not placed yet, so it must go to group ${3 - g}. Descend into ${q}.`,
          logic: 'DFS follows the forced chain of placements as deep as it goes before returning.', logicTone: 'info',
          tag: 'RECURSE', note: `group[${q}] == 0 → assign(${q}, ${3 - g})`,
          javaLines: [12], pyLines: [10], algoStep: 2,
        });
        if (!assign(q, 3 - g)) return false;
        cur = p;
        eState[ei] = 'visited';
        push({
          title: `Back at ${p}`, desc: `${q} and everything reachable from it was placed without trouble. Continue with ${p}'s other dislikes.`,
          logic: 'Returning true means that whole branch is consistent.', logicTone: 'success',
          tag: 'RETURN', note: `assign(${q}, ${3 - g}) returned true → back in ${p}`,
          javaLines: [10], pyLines: [7], algoStep: 2,
        });
      } else {
        push({
          title: `${p} dislikes ${q}: ${q} is in group ${group[q]}, fine`, desc: `${q} is already in group ${group[q]}, the other group, so this pair is satisfied.`,
          logic: 'A previously placed person only matters if they landed in the same group.', logicTone: 'success',
          tag: 'CHECK', note: `group[${q}] = ${group[q]} ≠ g = ${g} → fine`,
          javaLines: [11], pyLines: [8], algoStep: 3,
        });
        eState[ei] = 'visited';
      }
    }
    calls.pop();
    cur = calls.length ? Number(/\((\d+),/.exec(calls[calls.length - 1])![1]) : null;
    return true;
  };

  for (let p = 1; p <= n; p++) {
    if (group[p] !== 0) continue;
    if (p > 1) {
      cur = null;
      push({
        title: `Person ${p} is not placed yet`, desc: `${p} is not linked to anyone placed so far, so they start a new cluster. Put ${p} in group 1.`,
        logic: 'Separate clusters of dislikes do not constrain each other; each can start with group 1.', logicTone: 'info',
        tag: 'NEW CLUSTER', note: `group[${p}] == 0 → assign(${p}, 1)`,
        javaLines: [3, 4], pyLines: [13], algoStep: 4,
      });
    }
    if (!assign(p, 1)) {
      cur = null;
      steps.push({
        title: 'No valid split', desc: `The clash between ${bad[0]} and ${bad[1]} cannot be avoided, so the people cannot be divided into two groups.`,
        scene: scene(), aux: aux(), vars: vars(),
        logic: 'The chain of dislikes between them has odd length, i.e. an odd cycle, which is exactly what 2-colouring cannot handle.', logicTone: 'warn',
        tag: '⚠ No split!', note: 'assign(...) returned false → return false',
        alert: `${bad[0]} and ${bad[1]} would have to share a group, so the people cannot be divided in two.`,
        javaLines: [4], pyLines: [13], algoStep: 5,
        result: { title: 'false', text: `${bad[0]} and ${bad[1]} would have to share a group` },
      });
      return steps;
    }
  }
  verdict = 'true';
  cur = null;
  const g1 = group.map((g, i) => (g === 1 ? i : -1)).filter((i) => i > 0);
  const g2 = group.map((g, i) => (g === 2 ? i : -1)).filter((i) => i > 0);
  push({
    title: 'Everyone placed', desc: `Group 1: {${g1.join(', ')}}, group 2: {${g2.join(', ')}}. No dislike pair is inside a group.`,
    logic: 'Every dislike edge was checked from both ends, and none joins two people of the same group.', logicTone: 'success',
    tag: '✅ Done!', note: `all placed → return true; groups of size ${g1.length} and ${g2.length}`,
    javaLines: [5], pyLines: [13], algoStep: 5,
    result: { title: 'true', text: `Group 1 = {${g1.join(', ')}}, group 2 = {${g2.join(', ')}}` },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const possibleBipartition: ProblemDef<GIn> = {
  slug: '886-possible-bipartition',
  id: '886', title: 'Possible Bipartition', difficulty: 'Medium', category: 'Graph', tag: 'DFS 2-colouring',
  statement: 'n people are numbered 1 to n, and some pairs dislike each other. Decide whether everyone can be divided into two groups so that no two people in the same group dislike each other.',
  constraints: '1 ≤ n ≤ 2000, pairs are distinct (animation input: 1–9 people, ≤ 14 pairs; write "n" then pairs like 1-2 1-3)',
  examples: [
    { label: '4 | 1-2 1-3 2-4', input: mk(4, '1-2 1-3 2-4'), output: 'true' },
    { label: '3 | 1-2 1-3 2-3', input: mk(3, '1-2 1-3 2-3'), output: 'false' },
    { label: '6 | 1-2 2-3 3-4 4-5 5-1 5-6', input: mk(6, '1-2 2-3 3-4 4-5 5-1 5-6'), output: 'false' },
  ],
  inputPlaceholder: 'e.g. 4 1-2 1-3 2-4   (n people, then dislike pairs)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Person being placed', state: 'active' }, { label: 'Conflicting pair', state: 'error' }],
  varLabels: ['person', 'group', 'stack depth', 'possible'],
  approach: {
    title: 'DFS group assignment',
    text: 'Treat each dislike as an edge. Put the first unplaced person in group 1 and recurse: everyone they dislike must go to the other group. If you reach someone already placed in the same group as the person you are looking from, the split is impossible. Otherwise keep going; start a new DFS from every person still unplaced so separate clusters are handled.',
  },
  java: [
    'public boolean possibleBipartition(int n, int[][] dislikes) {',
    '    List<Integer>[] adj = buildGraph(n, dislikes);',
    '    int[] group = new int[n + 1];                 // 0 = unassigned, 1 or 2',
    '    for (int p = 1; p <= n; p++)',
    '        if (group[p] == 0 && !assign(p, 1, adj, group)) return false;',
    '    return true;',
    '}',
    '',
    'private boolean assign(int p, int g, List<Integer>[] adj, int[] group) {',
    '    group[p] = g;',
    '    for (int q : adj[p]) {',
    '        if (group[q] == g) return false;           // dislikes someone in the same group',
    '        if (group[q] == 0 && !assign(q, 3 - g, adj, group)) return false;',
    '    }',
    '    return true;',
    '}',
    '',
    'private List<Integer>[] buildGraph(int n, int[][] dislikes) {',
    '    List<Integer>[] adj = new List[n + 1];',
    '    for (int i = 0; i <= n; i++) adj[i] = new ArrayList<>();',
    '    for (int[] d : dislikes) { adj[d[0]].add(d[1]); adj[d[1]].add(d[0]); }',
    '    return adj;',
    '}',
  ],
  python: [
    'def possible_bipartition(n, dislikes):',
    '    adj = [[] for _ in range(n + 1)]',
    '    for a, b in dislikes:',
    '        adj[a].append(b); adj[b].append(a)',
    '    group = [0] * (n + 1)                          # 0 = unassigned, 1 or 2',
    '    def assign(p, g):',
    '        group[p] = g',
    '        for q in adj[p]:',
    '            if group[q] == g:',
    '                return False                       # dislikes someone in the same group',
    '            if group[q] == 0 and not assign(q, 3 - g):',
    '                return False',
    '        return True',
    '    return all(group[p] != 0 or assign(p, 1) for p in range(1, n + 1))',
  ],
  algorithm: [
    'Build the dislike graph; mark everyone unassigned (0)',
    'Place an unassigned person in group g and look at everyone they dislike',
    'An unassigned dislike goes to the other group (3 - g): recurse',
    'A dislike already in the same group g is a conflict: return false; one in the other group is fine',
    'Start a new DFS from any person still unassigned after a DFS returns',
    'Return the verdict: true if every cluster is placed without conflict, false after the first conflict',
  ],
  phases: [
    { icon: '🧮', label: 'Init: all unassigned', tone: 'blue' },
    { icon: '👤', label: 'Place a person', tone: 'cyan' },
    { icon: '🔁', label: 'Recurse on a dislike', tone: 'green' },
    { icon: '⚖', label: 'Check same group', tone: 'orange' },
    { icon: '🆕', label: 'New cluster', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['dislike', 'two groups', 'divided'],
  complexity: [{ label: 'Time', value: 'O(n + E)' }, { label: 'Space', value: 'O(n + E)' }],
  why: 'Inside one cluster of people linked by dislikes, a single person\'s group decides everyone else\'s: each dislike flips the group, so the group of a person is the parity of the path length from the cluster\'s first person. A clash means two people joined by a dislike have the same parity, i.e. the dislikes contain an odd cycle, and flipping the choice for the first person only swaps the groups wholesale, so no alternative exists. Without a clash the assignment satisfies every pair directly.',
};
