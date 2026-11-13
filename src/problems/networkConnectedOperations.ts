import type { Aux, ProblemDef, Step } from '../engine/types';
import { Dsu, mstScene } from './mstKit.ts';
import type { EdgeMark } from './mstKit.ts';
import { parseEdges } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** n computers 0..n-1 and cables u-v; each move re-plugs one cable. */
interface In { n: number; cables: EdgeIn[] }

function parse(raw: string): In {
  const m = /^\s*(\d+)\s+([\s\S]*)$/.exec(raw);
  if (!m) throw new Error('Write n, then cables like 4 0-1 0-2 1-2');
  const n = Number(m[1]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 computers');
  const cables = parseEdges(m[2], { lo: 0, hi: n - 1, max: 12, example: '0-1 0-2 1-2' });
  if (cables.some((c) => c.u === c.v)) throw new Error('A cable cannot connect a computer to itself');
  const key = (c: EdgeIn) => `${Math.min(c.u, c.v)}-${Math.max(c.u, c.v)}`;
  if (new Set(cables.map(key)).size !== cables.length) throw new Error('Each pair of computers may have only one cable');
  return { n, cables };
}

function build({ n, cables }: In): Step[] {
  const edges = cables.map((c) => ({ u: c.u, v: c.v, w: 0 }));
  const dsu = new Dsu(n);
  const marks: EdgeMark[] = cables.map(() => 'todo');
  const steps: Step[] = [];
  let cur = -1;
  let spare = 0;
  let comps = n;
  let answer: number | string = '—';
  let hot: number[] = [];
  let hotState: 'active' | 'error' = 'active';

  const aux = (): Aux[] => [
    { title: 'cables', kind: 'queue', items: cables.map((c, i) => `${c.u}-${c.v}${marks[i] === 'take' ? ' merges' : marks[i] === 'bad' ? ' spare' : ''}`), highlight: cur >= 0 ? cur : undefined, bad: marks.flatMap((m, i) => (m === 'bad' ? [i] : [])) },
    { title: 'parent[ ]', kind: 'list', items: Array.from({ length: n }, (_, i) => `${i}→${dsu.parent[i]}`) },
  ];
  const scene = () => mstScene({ n, base: 0, edges, marks, dsu, hot, hotState, weightText: () => '' });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) =>
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { cable: cur >= 0 ? `${cables[cur].u}-${cables[cur].v}` : '—', spare, components: comps, answer } });

  const need = n - 1;
  push({
    title: 'Count the cables', desc: `${n} computers need at least ${need} cables to be connected at all; there are ${cables.length}.`,
    logic: 'A move only re-plugs an existing cable, so with fewer than n − 1 cables no sequence of moves can ever connect everyone.', logicTone: cables.length < need ? 'warn' : 'info',
    tag: 'COUNT', note: `${cables.length} cables ${cables.length < need ? '<' : '≥'} n − 1 = ${need}`,
    alert: cables.length < need ? `Only ${cables.length} cables for ${n} computers: at least ${need} are needed.` : undefined,
    javaLines: [1], pyLines: [1, 2], algoStep: 0,
  });
  if (cables.length < need) {
    answer = -1;
    steps.push({
      title: 'Not enough cables', desc: `${cables.length} < ${need}, so the answer is −1.`,
      scene: scene(), aux: aux(), vars: { cable: '—', spare, components: comps, answer },
      logic: 'Connected graphs on n nodes need at least n − 1 edges.', logicTone: 'warn',
      tag: '✅ Done!', note: `return -1`,
      javaLines: [1], pyLines: [1, 2], algoStep: 3,
      result: { title: '-1', text: 'Too few cables to connect all computers' },
    });
    return steps;
  }

  for (let i = 0; i < cables.length; i++) {
    const { u, v } = cables[i];
    cur = i; hot = [u, v]; hotState = 'active';
    const a = dsu.find(u);
    const b = dsu.find(v);
    if (a === b) {
      spare++;
      marks[i] = 'bad'; hotState = 'error';
      push({
        title: `Cable ${u}-${v} is spare`, desc: `${u} and ${v} already share leader ${a}, so this cable connects nothing new. It is a spare we can move: spare cables = ${spare}.`,
        logic: 'An edge whose ends are already connected sits on a cycle; unplugging it cannot disconnect anyone.', logicTone: 'warn',
        tag: 'SPARE', alert: `Cable ${u}-${v} is redundant: ${u} and ${v} are already connected.`, note: `find(${u}) = find(${v}) = ${a} → spare = ${spare}`,
        javaLines: [5, 6, 7, 10], pyLines: [5, 6, 7, 10], algoStep: 2,
      });
    } else {
      dsu.parent[a] = b;
      comps--;
      marks[i] = 'take';
      push({
        title: `Cable ${u}-${v} merges two groups`, desc: `Leaders ${a} and ${b} differ, so the cable joins two groups. Separate groups left: ${comps}.`,
        logic: 'Each useful cable reduces the number of connected groups by exactly one.', logicTone: 'success',
        tag: 'MERGE', note: `parent[${a}] = ${b}, components = ${comps}`,
        javaLines: [5, 6, 7, 8, 9], pyLines: [5, 6, 7, 8, 9], algoStep: 1,
      });
    }
  }

  cur = -1; hot = [];
  answer = comps - 1;
  steps.push({
    title: `Groups: ${comps}, answer ${answer}`, desc: `${comps} separate group${comps === 1 ? '' : 's'} remain, so ${answer} extra link${answer === 1 ? ' is' : 's are'} needed. There are ${spare} spare cables, enough because ${cables.length} ≥ ${need}.`,
    scene: scene(), aux: aux(), vars: { cable: '—', spare, components: comps, answer },
    logic: 'Joining c groups needs c − 1 links and we have at least that many spare cables, so each link costs exactly one move.', logicTone: 'success',
    tag: '✅ Done!', note: `components − 1 = ${comps} − 1 = ${answer}`,
    javaLines: [12], pyLines: [11], algoStep: 3,
    result: { title: String(answer), text: 'Minimum number of cable moves' },
  });
  return steps;
}

const mk = (n: number, s: string): In => ({ n, cables: s.split(' ').map((t) => { const [u, v] = t.split('-').map(Number); return { u, v }; }) });

export const networkConnectedOperations: ProblemDef<In> = {
  slug: '1319-number-of-operations-to-make-network-connected',
  id: '1319', title: 'Number of Operations to Make Network Connected', difficulty: 'Medium', category: 'Graph', tag: 'union-find, spare cables',
  statement: 'There are n computers numbered 0 to n-1 joined by some cables. In one operation you may unplug a cable between two directly connected computers and plug it between any two others. Return the minimum number of operations needed to make all computers connected, or -1 if it is impossible.',
  constraints: '1 ≤ n ≤ 10⁵, no repeated cables (animation input: 2–8 computers, ≤ 12 cables, written "n u-v ...")',
  examples: [
    { label: '4 | 0-1 0-2 1-2', input: mk(4, '0-1 0-2 1-2'), output: '1' },
    { label: '6 | 0-1 0-2 0-3 1-2 1-3', input: mk(6, '0-1 0-2 0-3 1-2 1-3'), output: '2' },
    { label: '6 | 0-1 0-2 0-3 1-2', input: mk(6, '0-1 0-2 0-3 1-2'), output: '-1' },
  ],
  inputPlaceholder: 'e.g. 4 0-1 0-2 1-2   (n, then cables u-v)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cable being checked', state: 'active' }, { label: 'Cable merges two groups', state: 'found' }, { label: 'Spare cable', state: 'error' }],
  varLabels: ['cable', 'spare', 'components', 'answer'],
  approach: {
    title: 'Count the groups; spare cables are free to move',
    text: 'If there are fewer than n − 1 cables the answer is −1. Otherwise union the ends of every cable. A cable whose ends already share a leader is a spare. After all cables, c groups remain; connecting them needs c − 1 links, and there are always enough spares to supply them, so the answer is c − 1.',
  },
  java: [
    'public int makeConnected(int n, int[][] connections) {',
    '    if (connections.length < n - 1) return -1;       // not enough cables',
    '    int[] parent = new int[n];',
    '    for (int i = 0; i < n; i++) parent[i] = i;',
    '    int components = n;',
    '    for (int[] c : connections) {',
    '        int a = find(parent, c[0]), b = find(parent, c[1]);',
    '        if (a != b) {',
    '            parent[a] = b;                           // this cable merges two groups',
    '            components--;',
    '        }                                            // else: a spare cable',
    '    }',
    '    return components - 1;                           // one move per missing link',
    '}',
  ],
  python: [
    'def make_connected(n, connections):',
    '    if len(connections) < n - 1:',
    '        return -1                            # not enough cables',
    '    parent = list(range(n))',
    '    components = n',
    '    for u, v in connections:',
    '        a, b = find(parent, u), find(parent, v)',
    '        if a != b:',
    '            parent[a] = b                    # this cable merges two groups',
    '            components -= 1',
    '        # else: a spare cable',
    '    return components - 1                    # one move per missing link',
  ],
  phases: [
    { icon: '📋', label: 'Count the cables', tone: 'blue' },
    { icon: '🔗', label: 'Merge two groups', tone: 'green' },
    { icon: '♻', label: 'Spare cable', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum number of operations', 'unplug', '-1'],
  algorithm: [
    'If there are fewer than n − 1 cables return −1',
    'Union the two ends of each cable; a successful union reduces the group count',
    'A cable whose ends already share a leader is spare',
    'Count the remaining groups c; return c − 1',
  ],
  complexity: [{ label: 'Time', value: 'O(n + E · α(n))' }, { label: 'Space', value: 'O(n)' }],
  why: 'Merging c groups into one needs c − 1 new links. A graph with E ≥ n − 1 edges and c components has E − (n − c) spare edges (edges beyond a spanning forest), and E − n + c ≥ c − 1 exactly when E ≥ n − 1. So whenever there are enough cables overall, there are enough spares, each spare move can join two groups, and fewer moves are impossible because each move adds at most one link between groups.',
};
